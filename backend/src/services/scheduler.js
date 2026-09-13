import { readJson, writeJson } from "../db.js";

const EMPTY = [];

export function listReminders() {
  return readJson("reminders", EMPTY);
}

export function saveReminders(items) {
  writeJson("reminders", items);
  return items;
}

export function dueReminders(now = new Date()) {
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const stamp = `${hh}:${mm}`;
  const day = now.toISOString().slice(0, 10);
  return listReminders().filter((item) => {
    if (!item.enabled) return false;
    if (item.time !== stamp) return false;
    if (item.lastFiredOn === day) return false;
    return true;
  });
}

export function markFired(ids, day) {
  const next = listReminders().map((item) =>
    ids.includes(item.id) ? { ...item, lastFiredOn: day } : item,
  );
  saveReminders(next);
  return next;
}

export function markTaken(id, taken) {
  const day = new Date().toISOString().slice(0, 10);
  const next = listReminders().map((item) => {
    if (item.id !== id) return item;
    const takenOn = { ...(item.takenOn || {}) };
    takenOn[day] = taken;
    return { ...item, takenOn };
  });
  saveReminders(next);
  return next;
}
