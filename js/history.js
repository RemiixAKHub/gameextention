// history.js — Generic undo/redo History Manager (snapshot/command pattern)
//
// Reusable across any game module. A game keeps its own state and knows how
// to snapshot/restore it; this module only manages the undo/redo stacks and
// bookkeeping (max size, redo invalidation on new actions, etc).
//
// Usage:
//   const history = HistoryManager.create({ maxSize: 200 });
//   history.push(beforeSnapshot, 'Move label');     // record a completed move
//   const prev = history.undo(currentSnapshot);     // returns snapshot to restore, or null
//   const next = history.redo(currentSnapshot);     // returns snapshot to restore, or null
//   history.canUndo() / history.canRedo()
//   history.clear()
//   history.peekUndoLabel() / history.peekRedoLabel() — for UI tooltips

const HistoryManager = (() => {
  function create(options = {}) {
    const maxSize = options.maxSize ?? 100;
    let undoStack = [];
    let redoStack = [];

    function push(beforeSnapshot, label) {
      undoStack.push({ snapshot: beforeSnapshot, label, timestamp: Date.now() });
      if (undoStack.length > maxSize) undoStack.shift();
      // Any new action invalidates the redo branch.
      redoStack = [];
    }

    function undo(currentSnapshot) {
      if (!undoStack.length) return null;
      const entry = undoStack.pop();
      redoStack.push({ snapshot: currentSnapshot, label: entry.label, timestamp: Date.now() });
      return entry.snapshot;
    }

    function redo(currentSnapshot) {
      if (!redoStack.length) return null;
      const entry = redoStack.pop();
      undoStack.push({ snapshot: currentSnapshot, label: entry.label, timestamp: Date.now() });
      return entry.snapshot;
    }

    function canUndo() { return undoStack.length > 0; }
    function canRedo() { return redoStack.length > 0; }
    function peekUndoLabel() { return undoStack.length ? undoStack.at(-1).label : null; }
    function peekRedoLabel() { return redoStack.length ? redoStack.at(-1).label : null; }
    function clear() { undoStack = []; redoStack = []; }
    function size() { return { undo: undoStack.length, redo: redoStack.length }; }

    return { push, undo, redo, canUndo, canRedo, peekUndoLabel, peekRedoLabel, clear, size };
  }

  return { create };
})();
