// storage.js — Central save/load utility using chrome.storage.local
// All writes are debounced to avoid excessive calls on rapid moves.

const Storage = (() => {
  const DEBOUNCE_MS = 300;
  const timers = {};

  function save(key, data) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: data }, resolve);
    });
  }

  function load(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] ?? null);
      });
    });
  }

  function remove(key) {
    return new Promise((resolve) => {
      chrome.storage.local.remove([key], resolve);
    });
  }

  // Debounced save — coalesces rapid writes into one
  function saveLazy(key, data) {
    clearTimeout(timers[key]);
    timers[key] = setTimeout(() => save(key, data), DEBOUNCE_MS);
  }

  // Force flush any pending debounced saves immediately
  function flush(key, data) {
    clearTimeout(timers[key]);
    return save(key, data);
  }

  return { save, load, remove, saveLazy, flush };
})();
