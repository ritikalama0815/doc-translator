import { jest } from "@jest/globals";

const store = { reminders: [] };

jest.unstable_mockModule("../db.js", () => ({
  readJson: jest.fn((_name, fallback) => structuredClone(store.reminders.length ? store.reminders : fallback)),
  writeJson: jest.fn((_name, value) => {
    store.reminders = structuredClone(value);
    return value;
  }),
}));

const { dueReminders, listReminders, markFired, markTaken, saveReminders } =
  await import("../services/scheduler.js");

beforeEach(() => {
  store.reminders = [];
});

describe("saveReminders / listReminders", () => {
  test("round-trips reminder items", () => {
    const items = [{ id: "r1", medicationName: "metformin", time: "08:00", enabled: true }];
    expect(saveReminders(items)).toEqual(items);
    expect(listReminders()).toEqual(items);
  });
});

describe("dueReminders", () => {
  const noon = new Date(2026, 8, 13, 12, 0, 0);

  test("returns an enabled reminder whose time matches now and has not fired today", () => {
    store.reminders = [
      { id: "due", medicationName: "crocin", time: "12:00", enabled: true, lastFiredOn: null },
    ];
    expect(dueReminders(noon).map((r) => r.id)).toEqual(["due"]);
  });

  test("skips disabled reminders", () => {
    store.reminders = [{ id: "off", time: "12:00", enabled: false }];
    expect(dueReminders(noon)).toEqual([]);
  });

  test("skips reminders that already fired today", () => {
    const day = noon.toISOString().slice(0, 10);
    store.reminders = [{ id: "done", time: "12:00", enabled: true, lastFiredOn: day }];
    expect(dueReminders(noon)).toEqual([]);
  });

  test("skips reminders scheduled for a different minute", () => {
    store.reminders = [{ id: "later", time: "12:01", enabled: true }];
    expect(dueReminders(noon)).toEqual([]);
  });
});

describe("markFired", () => {
  test("stamps lastFiredOn only on the given ids", () => {
    store.reminders = [
      { id: "a", lastFiredOn: null },
      { id: "b", lastFiredOn: null },
    ];
    const next = markFired(["a"], "2026-09-13");
    expect(next.find((r) => r.id === "a").lastFiredOn).toBe("2026-09-13");
    expect(next.find((r) => r.id === "b").lastFiredOn).toBeNull();
  });
});

describe("markTaken", () => {
  test("records taken / not taken for today without touching other reminders", () => {
    store.reminders = [
      { id: "a", takenOn: {} },
      { id: "b", takenOn: {} },
    ];
    const day = new Date().toISOString().slice(0, 10);
    const next = markTaken("a", true);
    expect(next.find((r) => r.id === "a").takenOn[day]).toBe(true);
    expect(next.find((r) => r.id === "b").takenOn).toEqual({});

    const cleared = markTaken("a", false);
    expect(cleared.find((r) => r.id === "a").takenOn[day]).toBe(false);
  });
});
