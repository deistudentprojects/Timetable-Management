/**
 * Compute Engine — Cell-focused, on-demand suggestions.
 *
 * Called when user focuses a cell. Checks ONLY that cell:
 *   1. LAB — needs 2 consecutive? can extend up/down? else relocate options.
 *   2. CONFLICT — teacher/room clash? suggest alternate cell or room.
 *
 * Break rule: slots separated by >5 min gap are NOT consecutive.
 */

import { buildOccupationMaps, isTeacherFree, isRoomFree } from './conflictChecker.js';

const normalize = (v) => String(v ?? '').trim().replace(/\s+/g, ' ');

function parseSlot(slot) {
  const m = String(slot).trim().match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return { start: +m[1] * 60 + +m[2], end: +m[3] * 60 + +m[4] };
}

function areTrulyConsecutive(timeSlots, rowA, rowB) {
  if (rowA < 0 || rowB < 0 || rowA >= timeSlots.length || rowB >= timeSlots.length) return false;
  const a = parseSlot(timeSlots[Math.min(rowA, rowB)]);
  const b = parseSlot(timeSlots[Math.max(rowA, rowB)]);
  if (!a || !b) return false;
  return (b.start - a.end) <= 5;
}

function findTeacher(allTeachers, id) {
  if (!id) return null;
  const s = String(id);
  return allTeachers.find(t => String(t.unid) === s || String(t.ID) === s) || null;
}

function findRoom(allRooms, id) {
  if (!id) return null;
  const s = String(id);
  return allRooms.find(r => String(r.unid) === s || String(r.ID) === s) || null;
}

const DAY_LABELS = { mon:'Mon', tue:'Tue', wed:'Wed', thu:'Thu', fri:'Fri', sat:'Sat' };

/**
 * Compute suggestion for a single cell.
 * Returns { lab: {...}|null, conflict: {...}|null }
 */
export function computeCellSuggestion({ row, col, liveCellData, currentSchedules, otherSchedules, allCourses, allTeachers, allRooms, days, timeSlots }) {
  const nDays = days.map(d => normalize(d).toLowerCase());
  const nSlots = timeSlots.map(t => normalize(t).toLowerCase());

  // Use live React state if provided, fall back to DB entry
  const dbEntry = currentSchedules.find(s => s.rowIndex === row && s.colIndex === col);
  const entry = {
    ...(dbEntry || {}),
    rowIndex: row,
    colIndex: col,
  };
  // Override with live frontend data (latest unsaved state)
  if (liveCellData) {
    if (liveCellData.courseId)  entry.courseId  = liveCellData.courseId;
    if (liveCellData.teacherId) entry.teacherId = liveCellData.teacherId;
    if (liveCellData.roomId)   entry.roomId    = liveCellData.roomId;
    if (liveCellData.day)      entry.day       = liveCellData.day;
    if (liveCellData.time)     entry.time      = liveCellData.time;
  }

  if (!entry.courseId) return { lab: null, conflict: null };

  // Lookups
  const courseMap = new Map();
  for (const c of allCourses) {
    if (c.unid != null) courseMap.set(String(c.unid), c);
    if (c.ID) courseMap.set(String(c.ID), c);
    if (c.code) courseMap.set(String(c.code), c);
  }

  const doc = courseMap.get(String(entry.courseId));
  const tDoc = findTeacher(allTeachers, entry.teacherId);
  const rDoc = findRoom(allRooms, entry.roomId);
  // Use entry's own day/time for occupation map lookups (matches keying)
  const day = normalize(entry.day || '').toLowerCase();
  const entryTime = normalize(entry.time || '').toLowerCase();

  const allScheds = [...currentSchedules, ...otherSchedules];
  const { teacherOccupied, roomOccupied } = buildOccupationMaps(allScheds);
  const { teacherOccupied: otherTOcc, roomOccupied: otherROcc } = buildOccupationMaps(otherSchedules);

  // Occupied cells
  const occ = new Set();
  for (const s of currentSchedules) {
    if (s.courseId || s.teacherId || s.roomId) occ.add(`${s.rowIndex}-${s.colIndex}`);
  }

  let lab = null;
  let conflict = null;

  // ── 1. LAB CHECK ──────────────────────────────────────────────────────────
  const isLab = /lab|practical|workshop/i.test(doc?.name || '');
  if (isLab) {
    // Check if already has consecutive pair
    const hasPair = currentSchedules.some(cs =>
      String(cs.courseId) === String(entry.courseId) && cs.colIndex === col &&
      (cs.rowIndex === row - 1 || cs.rowIndex === row + 1) &&
      areTrulyConsecutive(timeSlots, cs.rowIndex, row)
    );

    if (!hasPair) {
      // Try extend below then above
      let extendTo = null;
      for (const dr of [1, -1]) {
        const nr = row + dr;
        if (nr < 0 || nr >= nSlots.length) continue;
        if (!areTrulyConsecutive(timeSlots, row, nr)) continue;
        if (occ.has(`${nr}-${col}`)) continue;
        const nt = nSlots[nr];
        const tf = !entry.teacherId || isTeacherFree(teacherOccupied, day, nt, String(entry.teacherId));
        const rf = !entry.roomId || isRoomFree(roomOccupied, day, nt, String(entry.roomId));
        if (tf && rf) {
          extendTo = { row: nr, col, day: DAY_LABELS[day] || day, time: timeSlots[nr] };
          break;
        }
      }

      // If can't extend, find relocate pairs
      const relocatePairs = [];
      if (!extendTo) {
        outer: for (let c = 0; c < nDays.length; c++) {
          for (let r = 0; r < nSlots.length - 1; r++) {
            if (!areTrulyConsecutive(timeSlots, r, r + 1)) continue;
            if (occ.has(`${r}-${c}`) || occ.has(`${r + 1}-${c}`)) continue;
            const d = nDays[c], t1 = nSlots[r], t2 = nSlots[r + 1];
            const ok = (!entry.teacherId || (isTeacherFree(teacherOccupied, d, t1, String(entry.teacherId)) && isTeacherFree(teacherOccupied, d, t2, String(entry.teacherId)))) &&
                       (!entry.roomId || (isRoomFree(roomOccupied, d, t1, String(entry.roomId)) && isRoomFree(roomOccupied, d, t2, String(entry.roomId))));
            if (ok) {
              relocatePairs.push({ row1: r, row2: r + 1, col: c, day: DAY_LABELS[nDays[c]] || nDays[c], time1: timeSlots[r], time2: timeSlots[r + 1] });
              if (relocatePairs.length >= 3) break outer;
            }
          }
        }
      }

      lab = {
        courseName: doc?.name || entry.courseId,
        courseCode: doc?.code || doc?.ID || entry.courseId,
        teacherName: tDoc?.name || entry.teacherId || '',
        roomName: rDoc?.name || entry.roomId || '',
        extendTo,
        relocatePairs,
      };
    }
  }

  // ── 2. CONFLICT CHECK ─────────────────────────────────────────────────────
  const tConflict = entry.teacherId && !isTeacherFree(otherTOcc, day, entryTime, String(entry.teacherId));
  const rConflict = entry.roomId && !isRoomFree(otherROcc, day, entryTime, String(entry.roomId));

  if (tConflict || rConflict) {
    // (a) Alternate cells
    const altCells = [];
    for (let c = 0; c < nDays.length && altCells.length < 4; c++) {
      for (let r = 0; r < nSlots.length && altCells.length < 4; r++) {
        if (r === row && c === col) continue;
        if (occ.has(`${r}-${c}`)) continue;
        const ad = nDays[c], at = nSlots[r];
        const tf = !entry.teacherId || isTeacherFree(teacherOccupied, ad, at, String(entry.teacherId));
        const rf = !entry.roomId || isRoomFree(roomOccupied, ad, at, String(entry.roomId));
        if (tf && rf) {
          altCells.push({ row: r, col: c, day: DAY_LABELS[ad] || ad, time: timeSlots[r] || at });
        }
      }
    }

    // (b) Alternate rooms
    const altRooms = [];
    if (rConflict) {
      const cap = rDoc?.capacity || 0;
      for (const rm of allRooms) {
        const rid = String(rm.unid || rm.ID || '');
        if (!rid || rid === String(entry.roomId)) continue;
        if (cap && rm.capacity && Math.abs(rm.capacity - cap) > 20) continue;
        if (!isRoomFree(roomOccupied, day, entryTime, rid)) continue;
        altRooms.push({ roomId: rid, roomName: rm.name || rm.ID || rid, capacity: rm.capacity || 0 });
        if (altRooms.length >= 3) break;
      }
    }

    conflict = {
      courseName: doc?.name || entry.courseId,
      courseCode: doc?.code || doc?.ID || entry.courseId,
      teacherName: tDoc?.name || entry.teacherId || '',
      roomName: rDoc?.name || entry.roomId || '',
      conflictTypes: [...(tConflict ? ['teacher'] : []), ...(rConflict ? ['room'] : [])],
      alternativeCells: altCells,
      alternativeRooms: altRooms,
    };
  }

  return { lab, conflict };
}
