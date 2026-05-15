/**
 * SuggestionPanel — Shows suggestion for the currently focused cell ONLY.
 * No bulk list. No toggle. Clean and stable.
 *
 * Props:
 *   cellSuggestion  { row, col, lab, conflict } | null
 *   wsReady         boolean
 *   onCellClick     (row, col) => void
 */

import React, { memo } from "react";
import { Sparkles, FlaskConical, AlertCircle, MapPin, ArrowRight, Replace } from "lucide-react";

const LabSection = memo(function LabSection({ lab, onCellClick }) {
  if (!lab) return null;
  const hasExtend = !!lab.extendTo;
  const hasRelocate = lab.relocatePairs?.length > 0;

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold text-gray-600 flex items-center gap-1.5">
        <FlaskConical size={12} className="text-purple-500" />
        Lab — needs 2 consecutive periods
      </p>

      {hasExtend && (
        <button
          onClick={() => onCellClick?.(lab.extendTo.row, lab.extendTo.col)}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs bg-purple-50 text-purple-700 rounded-lg border border-purple-100 hover:bg-purple-100 transition-colors cursor-pointer"
        >
          <ArrowRight size={12} className="shrink-0" />
          <span>Extend to <b>{lab.extendTo.day} {lab.extendTo.time}</b></span>
          <span className="ml-auto text-purple-400 text-[10px]">[{lab.extendTo.row},{lab.extendTo.col}]</span>
        </button>
      )}

      {!hasExtend && hasRelocate && (
        <div className="space-y-1">
          <p className="text-[10px] text-gray-400">Adjacent slot unavailable. Move to:</p>
          {lab.relocatePairs.map((p, i) => (
            <button
              key={i}
              onClick={() => onCellClick?.(p.row1, p.col)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] bg-gray-50 text-gray-700 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <MapPin size={10} className="text-gray-400 shrink-0" />
              <span>{p.day} {p.time1} – {p.time2}</span>
            </button>
          ))}
        </div>
      )}

      {!hasExtend && !hasRelocate && (
        <p className="text-[10px] text-gray-400 px-1">No consecutive slots available</p>
      )}
    </div>
  );
});

const ConflictSection = memo(function ConflictSection({ conflict, onCellClick }) {
  if (!conflict) return null;
  const hasAltCells = conflict.alternativeCells?.length > 0;
  const hasAltRooms = conflict.alternativeRooms?.length > 0;

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold text-gray-600 flex items-center gap-1.5">
        <AlertCircle size={12} className="text-red-400" />
        {conflict.conflictTypes.join(' & ')} conflict
      </p>

      {hasAltCells && (
        <div className="space-y-1">
          <p className="text-[10px] text-gray-500 font-medium">Move to a free slot</p>
          {conflict.alternativeCells.slice(0, 4).map((a, i) => (
            <button
              key={i}
              onClick={() => onCellClick?.(a.row, a.col)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] bg-purple-50 text-purple-700 rounded-lg border border-purple-100 hover:bg-purple-100 transition-colors cursor-pointer"
            >
              <MapPin size={10} className="shrink-0" />
              <span>{a.day} {a.time}</span>
              <span className="ml-auto text-purple-400 text-[10px]">[{a.row},{a.col}]</span>
            </button>
          ))}
        </div>
      )}

      {hasAltRooms && (
        <div className="space-y-1">
          <p className="text-[10px] text-gray-500 font-medium flex items-center gap-1"><Replace size={10} /> Swap room</p>
          {conflict.alternativeRooms.map((rm, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-[11px] bg-gray-50 text-gray-700 rounded-lg border border-gray-100">
              <span className="font-medium">{rm.roomName}</span>
              {rm.capacity > 0 && <span className="text-gray-400 text-[10px]">({rm.capacity} seats)</span>}
            </div>
          ))}
        </div>
      )}

      {!hasAltCells && !hasAltRooms && (
        <p className="text-[10px] text-gray-400 px-1">No alternatives found</p>
      )}
    </div>
  );
});

export default function SuggestionPanel({ cellSuggestion, wsReady, onCellClick }) {
  const hasLab = !!cellSuggestion?.lab;
  const hasConflict = !!cellSuggestion?.conflict;
  const hasContent = hasLab || hasConflict;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-100">
        <Sparkles size={14} className={hasContent ? 'text-purple-500' : 'text-gray-300'} />
        <span className="text-sm font-semibold text-gray-900">Suggestions</span>
        {cellSuggestion && (
          <span className="ml-auto text-[10px] text-gray-400">
            [{cellSuggestion.row},{cellSuggestion.col}]
          </span>
        )}
      </div>

      {/* Body — fixed min-height to prevent layout shift */}
      <div className="px-4 py-3" style={{ minHeight: 80 }}>
        {!wsReady ? (
          <p className="text-xs text-gray-400 text-center py-4">Open a timetable first</p>
        ) : !cellSuggestion ? (
          <p className="text-xs text-gray-400 text-center py-4">Click a cell to see suggestions</p>
        ) : !hasContent ? (
          <div className="flex items-center gap-2 py-4 justify-center">
            <Sparkles size={14} className="text-green-400" />
            <span className="text-xs text-gray-500">No issues for this cell</span>
          </div>
        ) : (
          <div className="space-y-4">
            {hasConflict && <ConflictSection conflict={cellSuggestion.conflict} onCellClick={onCellClick} />}
            {hasLab && <LabSection lab={cellSuggestion.lab} onCellClick={onCellClick} />}
          </div>
        )}
      </div>
    </div>
  );
}
