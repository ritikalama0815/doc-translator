/**
 * @fileoverview Reminder persistence and "is this due right now?" checks.
 * The desktop app polls `/api/reminders/due`; this module decides which rows fire.
 * @module services/scheduler
 */

import { readJson, writeJson } from "../db.js";

/**
 * @typedef {object} Reminder
 * @property {string} id
 * @property {string} medicationName
 * @property {string|null} [strength]
 * @property {string} time `HH:MM` in local time.
 * @property {string} [frequency]
 * @property {boolean} enabled
 * @property {string|null} [lastFiredOn] ISO date (`YYYY-MM-DD`) last notified.
 * @property {Object<string, boolean>} [takenOn] Map of ISO date → taken today.
 * @property {string|null} [prescriptionId]
 */

const EMPTY = [];

/** @returns {Reminder[]} All saved reminders. */
export function listReminders() {
  return readJson("reminders", EMPTY);
}

/**
 * Replace the entire reminder list on disk.
 * @param {Reminder[]} items
 * @returns {Reminder[]} The same `items` array, for chaining.
 */
export function saveReminders(items) {
  writeJson("reminders", items);
  return items;
}

/**
 * Reminders whose clock time matches `now` (local `HH:MM`), that are enabled,
 * and that have not already fired today.
 *
 * @param {Date} [now]
 * @returns {Reminder[]}
 */
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

/**
 * Stamp `lastFiredOn` so the same minute does not notify twice.
 * @param {string[]} ids Reminder ids that just fired.
 * @param {string} day ISO date string (`YYYY-MM-DD`).
 * @returns {Reminder[]} Updated list.
 */
export function markFired(ids, day) {
  const next = listReminders().map((item) =>
    ids.includes(item.id) ? { ...item, lastFiredOn: day } : item,
  );
  saveReminders(next);
  return next;
}

/**
 * Record whether a dose was taken today (`takenOn[YYYY-MM-DD] = taken`).
 * @param {string} id Reminder id.
 * @param {boolean} taken
 * @returns {Reminder[]} Updated list.
 */
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
