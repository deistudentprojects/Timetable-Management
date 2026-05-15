/**
 * WebSocket message handler
 *
 * Messages FROM client:
 *   open_timetable  { timetableId, meta, days, timeSlots }
 *   cell_focus      { row, col }   — compute suggestion for THIS cell only
 *   check_cell      { row, col, batchIndex, day, time, teacherId, roomId }
 *   close_timetable {}
 *
 * Messages TO client:
 *   connected       {}
 *   cell_suggestion { row, col, lab, conflict }  — on-demand per cell
 *   conflict_result { row, col, batchIndex, conflicts[] }
 *   error           { message }
 */

import { watchSchedulesByTimetableId, watchAllOtherSchedules } from '../services/scheduleService.js';
import { getAllCourses } from '../services/courseService.js';
import { getAllTeachers } from '../services/teacherService.js';
import { getAllRooms } from '../services/roomService.js';
import { getAllCurriculums, findCurriculumForMeta } from '../services/curriculumService.js';
import { computeCellSuggestion } from '../engine/computeEngine.js';
import { checkCellConflicts } from '../engine/conflictEngine.js';
import { upsertConflicts, resolveConflictsForCell, loadConflictsForTimetable } from '../services/conflictService.js';
import Setting from '../models/Setting.js';
import Timetable from '../models/Timetable.js';

/**
 * Resolve which timetable IDs belong to active semesters.
 * Returns null if no setting exists OR no timetables match (= no filtering).
 */
async function getActiveTimetableIds() {
  try {
    const setting = await Setting.findOne({ _docId: 'activeSemesters' }).lean();
    if (!setting?.list?.active || setting.list.active.length === 0) return null;

    const activeSems = setting.list.active.map(String);
    const timetables = await Timetable.find({ semester: { $in: activeSems } }, { unid: 1 }).lean();
    const ids = timetables.map(t => t.unid).filter(Boolean);
    console.log(`[semester-filter] active semesters: [${activeSems}] → ${ids.length} timetable(s)`);
    // If no timetables found for active semesters, fall back to no filtering
    return ids.length > 0 ? ids : null;
  } catch (err) {
    console.warn('[semester-filter] error loading active semesters:', err.message);
    return null;
  }
}

function createClientState() {
  return {
    timetableId: null,
    meta: null,
    cursorRow: null,
    cursorCol: null,
    stopCurrent: null,
    stopOthers: null,
    currentSchedules: [],
    otherSchedules: [],
    allCourses: [],
    allTeachers: [],
    allRooms: [],
    curriculum: null,
    activeTimetableIds: null,
    days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
    timeSlots: [],
  };
}

function send(ws, data) {
  if (ws.readyState === 1) ws.send(JSON.stringify(data));
}

function cleanup(state) {
  if (state.stopCurrent) { state.stopCurrent(); state.stopCurrent = null; }
  if (state.stopOthers)  { state.stopOthers();  state.stopOthers  = null; }
}

async function handleOpenTimetable(ws, state, payload) {
  const { timetableId, meta, days, timeSlots } = payload;
  if (!timetableId || !meta) {
    send(ws, { type: 'error', message: 'open_timetable requires timetableId and meta' });
    return;
  }

  cleanup(state);

  state.timetableId = timetableId;
  state.meta        = meta;
  state.cursorRow   = null;
  state.cursorCol   = null;

  state.days      = days      || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  state.timeSlots = timeSlots || [];

  try {
    // Fetch all static data + active semester config in parallel
    const [courses, teachers, rooms, curriculums, activeTtIds] = await Promise.all([
      getAllCourses(),
      getAllTeachers(),
      getAllRooms(),
      getAllCurriculums(),
      getActiveTimetableIds(),
    ]);

    state.activeTimetableIds = activeTtIds;

    state.allCourses  = courses;
    state.allTeachers = teachers;
    state.allRooms    = rooms;
    state.curriculum  = findCurriculumForMeta(curriculums, meta);

    console.log(`[ws] data loaded — courses:${courses.length} teachers:${teachers.length} rooms:${rooms.length} curriculums:${curriculums.length}`);
    console.log(`[ws] curriculum found: ${!!state.curriculum} for`, JSON.stringify(meta));
    if (state.curriculum) {
      console.log(`[ws] curriculum courses: ${state.curriculum.courses?.length ?? 0}`);
    }

    if (!state.curriculum) {
      console.warn(`[ws] No curriculum for ${JSON.stringify(meta)}`);
      send(ws, {
        type: 'warning',
        message: `No curriculum for ${meta.class} ${meta.branch} sem ${meta.semester} (${meta.type}) — suggestions limited`,
      });
    }

    // Start polling current timetable schedules (data cache only, no auto-compute)
    state.stopCurrent = watchSchedulesByTimetableId(
      timetableId,
      (schedules) => {
        state.currentSchedules = schedules;
        if (state.timeSlots.length === 0 && schedules.length > 0) {
          const times = [...new Set(schedules.map(s => String(s.time || '').trim().toLowerCase()))].filter(Boolean).sort();
          state.timeSlots = times;
        }
      },
      (err) => send(ws, { type: 'error', message: err.message })
    );

    // Start polling other timetable schedules (data cache only)
    state.stopOthers = watchAllOtherSchedules(
      timetableId,
      (schedules) => { state.otherSchedules = schedules; },
      (err) => send(ws, { type: 'error', message: err.message }),
      state.activeTimetableIds
    );

    send(ws, { type: 'open_timetable_ack', timetableId });

    // Push stored conflicts for this timetable (persisted from previous sessions)
    try {
      const storedConflicts = await loadConflictsForTimetable(timetableId);
      if (storedConflicts.length) {
        send(ws, { type: 'stored_conflicts', timetableId, conflicts: storedConflicts });
      }
    } catch (e) {
      console.warn('[ws] could not load stored conflicts:', e.message);
    }
  } catch (err) {
    console.error('[ws] open_timetable error:', err);
    send(ws, { type: 'error', message: err.message });
    // Still send ack so frontend overlay doesn't get stuck
    send(ws, { type: 'open_timetable_ack', timetableId });
  }
}

function handleCellFocus(ws, state, payload) {
  const { row, col, courseId, teacherId, roomId, day, time } = payload;
  if (typeof row !== 'number' || typeof col !== 'number') return;
  state.cursorRow = row;
  state.cursorCol = col;

  // On-demand: compute suggestion for THIS cell using live frontend data
  try {
    const result = computeCellSuggestion({
      row, col,
      // Live cell data from React state (overrides DB entry)
      liveCellData: { courseId, teacherId, roomId, day, time },
      currentSchedules: state.currentSchedules,
      otherSchedules: state.otherSchedules,
      allCourses: state.allCourses,
      allTeachers: state.allTeachers,
      allRooms: state.allRooms,
      days: state.days,
      timeSlots: state.timeSlots,
    });
    send(ws, { type: 'cell_suggestion', row, col, lab: result.lab, conflict: result.conflict });
  } catch (err) {
    console.error('[ws] cell_focus compute error:', err.message);
  }
}

function handleCloseTimetable(ws, state) {
  cleanup(state);
  state.timetableId       = null;
  state.meta              = null;
  state.currentSchedules  = [];
  state.otherSchedules    = [];
  state.cursorRow         = null;
  state.cursorCol         = null;
}

async function handleCheckCell(ws, state, payload) {
  const { row, col, batchIndex = 0, day, time, teacherId, roomId } = payload;

  if (!state.timetableId) {
    send(ws, { type: 'conflict_result', row, col, batchIndex, conflicts: [] });
    return;
  }
  if (!day || !time) {
    send(ws, { type: 'conflict_result', row, col, batchIndex, conflicts: [] });
    return;
  }

  try {
    const rawConflicts = await checkCellConflicts({
      timetableId: state.timetableId,
      day,
      time,
      rowIndex:   row,
      colIndex:   col,
      batchIndex,
      teacherId:  teacherId || null,
      roomId:     roomId    || null,
      activeTimetableIds: state.activeTimetableIds,
    });

    // Enrich each conflict descriptor with display names
    const Timetable = (await import('../models/Timetable.js')).default;
    const timetableCache = new Map();

    const enriched = await Promise.all(rawConflicts.map(async (c) => {
      // Look up the CONFLICTING timetable's display info (not the caller's)
      const lookupId = c.conflictingTimetableId;
      let tt = timetableCache.get(lookupId);
      if (!tt) {
        tt = await Timetable.findOne({ timetableId: lookupId }).lean() || {};
        timetableCache.set(lookupId, tt);
      }

      // Resolve entity display names from session state
      const teacherDoc = c.type === 'teacher'
        ? state.allTeachers.find(t => String(t.unid) === String(c.conflictingId) || String(t.ID) === String(c.conflictingId))
        : null;
      const roomDoc = c.type === 'room'
        ? state.allRooms.find(r => String(r.unid) === String(c.conflictingId) || String(r.ID) === String(c.conflictingId))
        : null;

      return {
        ...c,
        // Source timetable (the open one being edited)
        sourceTimetableId:   state.timetableId,
        // Conflicting timetable display fields
        displayClass:    tt.class    || lookupId,
        displayBranch:   tt.branch   || '',
        displaySemester: tt.semester || '',
        displayType:     tt.type     || '',
        // Entity display names
        teacherName: teacherDoc?.name || (c.type === 'teacher' ? c.conflictingId : null),
        roomName:    roomDoc?.name    || (c.type === 'room'    ? c.conflictingId : null),
      };
    }));

    send(ws, { type: 'conflict_result', row, col, batchIndex, conflicts: enriched });

    // Persist to Conflict collection
    try {
      if (enriched.length) {
        await upsertConflicts(enriched.map(c => ({
          ...c,
          // Source = the timetable being edited
          sourceTimetableId:  state.timetableId,
          sourceScheduleType: 'temp', // user is editing a temp cell
          rowIndex: row,
          colIndex: col,
          batchIndex,
        })));
      } else {
        // No conflicts → resolve any existing ones for this cell
        await resolveConflictsForCell({
          sourceTimetableId: state.timetableId,
          rowIndex: row,
          colIndex: col,
          batchIndex,
        });
      }
    } catch (e) {
      console.warn('[ws] conflict persist error:', e.message);
    }

  } catch (err) {
    console.error('[ws] check_cell error:', err);
    send(ws, { type: 'conflict_result', row, col, batchIndex, conflicts: [], error: err.message });
  }
}



export function handleConnection(ws) {
  const state = createClientState();

  console.log('[ws] client connected');

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw); }
    catch { send(ws, { type: 'error', message: 'Invalid JSON' }); return; }

    console.log('[ws] ←', msg.type, msg.timetableId || '');

    switch (msg.type) {
      case 'open_timetable':  await handleOpenTimetable(ws, state, msg); break;
      case 'cell_focus':      handleCellFocus(ws, state, msg); break;
      case 'check_cell':      await handleCheckCell(ws, state, msg); break;
      case 'close_timetable': handleCloseTimetable(ws, state); break;
      default: break; // ignore unknown
    }
  });

  ws.on('close', () => { console.log('[ws] client disconnected'); cleanup(state); });
  ws.on('error', (err) => { console.error('[ws] error:', err.message); cleanup(state); });

  send(ws, { type: 'connected', message: 'Planovate compute engine ready' });
}
