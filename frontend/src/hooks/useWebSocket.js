/**
 * useWebSocket — Cell-focused, on-demand suggestions.
 *
 * No bulk computation. Sends cell_focus → receives cell_suggestion for that cell.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

const WS_URL = `ws://${window.location.hostname}:3001`;
const RECONNECT_DELAY = 3000;

export default function useWebSocket() {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const pendingOpen = useRef(null);

  const [wsStatus, setWsStatus]     = useState('disconnected');
  const [wsReady,  setWsReady]      = useState(false);
  const [wsConflicts, setWsConflicts] = useState(new Map());

  // Cell-focused suggestion (for the currently focused cell only)
  const [cellSuggestion, setCellSuggestion] = useState(null); // { row, col, lab, conflict }

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState <= 1) return;
    setWsStatus('connecting');
    setWsReady(false);

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('connected');
      if (pendingOpen.current) ws.send(JSON.stringify(pendingOpen.current));
    };

    ws.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }

      switch (msg.type) {
        case 'connected':
          setWsStatus('connected');
          break;

        case 'open_timetable_ack':
          setWsReady(true);
          break;

        case 'cell_suggestion':
          setCellSuggestion({ row: msg.row, col: msg.col, lab: msg.lab || null, conflict: msg.conflict || null });
          break;

        case 'conflict_result':
          setWsConflicts(prev => {
            const next = new Map(prev);
            const key = `${msg.row}-${msg.col}-${msg.batchIndex ?? 0}`;
            if (msg.conflicts?.length) next.set(key, msg.conflicts);
            else next.delete(key);
            return next;
          });
          break;

        case 'stored_conflicts': {
          const grouped = new Map();
          for (const c of (msg.conflicts || [])) {
            const key = `${c.rowIndex}-${c.colIndex}-${c.batchIndex ?? 0}`;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key).push(c);
          }
          setWsConflicts(grouped);
          break;
        }

        case 'warning':
          console.warn('[ws]', msg.message);
          break;

        case 'error':
          console.error('[ws]', msg.message);
          break;

        default: break;
      }
    };

    ws.onerror = () => { setWsStatus('error'); setWsReady(false); };
    ws.onclose = () => {
      setWsStatus('disconnected');
      setWsReady(false);
      wsRef.current = null;
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const sendMsg = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(msg));
  }, []);

  const openTimetable = useCallback((timetableId, meta, days, timeSlots) => {
    setWsConflicts(new Map());
    setWsReady(false);
    setCellSuggestion(null);
    const payload = { type: 'open_timetable', timetableId, meta, days, timeSlots };
    pendingOpen.current = payload;
    sendMsg(payload);
  }, [sendMsg]);

  const closeTimetable = useCallback(() => {
    pendingOpen.current = null;
    sendMsg({ type: 'close_timetable' });
    setWsReady(false);
    setWsConflicts(new Map());
    setCellSuggestion(null);
  }, [sendMsg]);

  const cellFocus = useCallback((row, col, cellData = {}) => {
    sendMsg({ type: 'cell_focus', row, col, ...cellData });
  }, [sendMsg]);

  const cellBlur = useCallback(() => {}, []);

  const checkCell = useCallback((row, col, batchIndex, { day, time, teacherId, roomId }) => {
    sendMsg({ type: 'check_cell', row, col, batchIndex, day, time, teacherId, roomId });
  }, [sendMsg]);

  return {
    wsRef,
    wsStatus,
    wsReady,
    wsConflicts,
    cellSuggestion,
    openTimetable,
    closeTimetable,
    cellFocus,
    cellBlur,
    checkCell,
  };
}
