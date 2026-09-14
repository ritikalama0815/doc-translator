/**
 * @fileoverview CRUD for reminder times, plus `GET /due` which the desktop app polls.
 * A due reminder is marked fired in the same request so the same minute does not notify twice.
 * @module routes/reminders
 */

import { Router } from "express";
import { v4 as uuid } from "uuid";
import { listReminders, saveReminders, dueReminders, markFired, markTaken } from "../services/scheduler.js";

const router = Router();

router.get("/due", (_req, res) => {
  // Mark fired so the same minute does not notify twice.
  const now = new Date();
  const due = dueReminders(now);
  if (due.length) {
    markFired(
      due.map((d) => d.id),
      now.toISOString().slice(0, 10),
    );
  }
  res.json(due);
});

router.get("/", (_req, res) => {
  res.json(listReminders());
});

router.post("/", (req, res) => {
  const items = listReminders();
  const item = {
    id: uuid(),
    medicationName: req.body.medicationName || "Medicine",
    strength: req.body.strength || null,
    time: req.body.time || "08:00",
    frequency: req.body.frequency || "once daily",
    enabled: true,
    takenOn: {},
    prescriptionId: req.body.prescriptionId || null,
  };
  saveReminders([item, ...items]);
  res.json(item);
});

router.patch("/:id", (req, res) => {
  const next = listReminders().map((item) =>
    item.id === req.params.id ? { ...item, ...req.body, id: item.id } : item,
  );
  saveReminders(next);
  res.json(next.find((i) => i.id === req.params.id));
});

router.post("/:id/taken", (req, res) => {
  res.json(markTaken(req.params.id, Boolean(req.body.taken)));
});

router.delete("/:id", (req, res) => {
  saveReminders(listReminders().filter((i) => i.id !== req.params.id));
  res.json({ ok: true });
});

/** Express router mounted at `/api/reminders`. */
export default router;
