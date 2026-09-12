import { Router } from "express";
import { v4 as uuid } from "uuid";
import { extractText, publicImageUrl } from "../services/ocr.js";
import { structurePrescription, explainPrescription } from "../services/llm.js";
import { validateMedications } from "../services/rxnorm.js";
import { getConfig } from "../db.js";

const SAMPLE = {
  patientName: null,
  doctorName: "Dr. A. Kapoor",
  date: "2026-09-10",
  notes: "Sample slip for trying the desk without a photo.",
  medications: [
    {
      name: "amoxicillin",
      rawLine: "Amoxicillin 500 mg 1-0-1 x 5 days after meals",
      strength: "500 mg",
      form: "capsule",
      dosage: "1 capsule",
      frequency: "twice daily",
      times: ["08:00", "20:00"],
      duration: "5 days",
      instructions: "after meals",
    },
    {
      name: "ibuprofen",
      rawLine: "Ibuprofen 400 mg BID prn pain",
      strength: "400 mg",
      form: "tablet",
      dosage: "1 tablet",
      frequency: "twice daily",
      times: ["08:00", "20:00"],
      duration: "3 days",
      instructions: "with food",
    },
  ],
  warnings: [
    "This is a reading aid, not medical advice. Confirm with your pharmacist or clinician before taking anything.",
  ],
};

export function scanRouter(upload) {
  const router = Router();

  router.post("/demo", async (_req, res) => {
    try {
      const medications = await validateMedications(SAMPLE.medications);
      const structured = { ...SAMPLE, medications, plainLanguage: "Take amoxicillin 500 mg morning and night for 5 days after meals. Ibuprofen 400 mg twice daily with food if you have pain, for up to 3 days." };
      const explanation = await explainPrescription(structured);
      res.json({
        id: uuid(),
        createdAt: new Date().toISOString(),
        imageUrl: null,
        ocr: { engine: "demo", text: "Amoxicillin 500 mg 1-0-1 x 5 days after meals\nIbuprofen 400 mg BID prn pain with food x 3 days", confidence: 100 },
        ...structured,
        explanation,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Please drop a photo of the prescription slip." });
        return;
      }
      const engine = req.body.engine || getConfig().ocrEngine || "auto";
      const ocr = await extractText(req.file.path, engine);
      const structured = await structurePrescription(ocr.text || "");
      const medications = await validateMedications(structured.medications || []);
      const explanation = await explainPrescription({ ...structured, medications });

      res.json({
        id: uuid(),
        createdAt: new Date().toISOString(),
        imageUrl: publicImageUrl(req.file.filename),
        ocr,
        ...structured,
        medications,
        explanation,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || "Scan failed." });
    }
  });

  return router;
}
