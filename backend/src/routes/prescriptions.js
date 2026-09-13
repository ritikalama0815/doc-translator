// Saved prescriptions plus "make reminders from this slip".
import { Router } from "express";
import { v4 as uuid } from "uuid";
import { readJson, writeJson } from "../db.js";
import { scheduleFromMedication } from "../services/parser.js";
import { listReminders, saveReminders } from "../services/scheduler.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(readJson("prescriptions", []));
});

router.post("/", (req, res) => {
  const items = readJson("prescriptions", []);
  const item = {
    id: req.body.id || uuid(),
    createdAt: req.body.createdAt || new Date().toISOString(),
    title: req.body.title || req.body.medications?.[0]?.name || "Prescription",
    ...req.body,
  };
  writeJson("prescriptions", [item, ...items.filter((p) => p.id !== item.id)]);
  res.json(item);
});

router.delete("/:id", (req, res) => {
  const items = readJson("prescriptions", []).filter((p) => p.id !== req.params.id);
  writeJson("prescriptions", items);
  const reminders = listReminders().filter((r) => r.prescriptionId !== req.params.id);
  saveReminders(reminders);
  res.json({ ok: true });
});

router.post("/:id/reminders", (req, res) => {
  const rx = readJson("prescriptions", []).find((p) => p.id === req.params.id);
  if (!rx) {
    res.status(404).json({ error: "Prescription not found." });
    return;
  }
  const existing = listReminders().filter((r) => r.prescriptionId !== rx.id);
  const created = (rx.medications || []).flatMap((med) =>
    scheduleFromMedication(med).map((slot) => ({
      id: uuid(),
      prescriptionId: rx.id,
      medicationName: slot.medicationName,
      strength: slot.strength,
      time: slot.time,
      frequency: slot.frequency,
      enabled: true,
      takenOn: {},
    })),
  );
  const next = [...created, ...existing];
  saveReminders(next);
  res.json(created);
});

export default router;
