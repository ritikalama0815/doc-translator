import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { v4 as uuid } from "uuid";
import { UPLOAD_DIR } from "./db.js";
import { scanRouter } from "./routes/scan.js";
import prescriptions from "./routes/prescriptions.js";
import chat from "./routes/chat.js";
import reminders from "./routes/reminders.js";
import drugs from "./routes/drugs.js";
import config from "./routes/config.js";
import { llmStatus } from "./services/llm.js";
import { DISCLAIMER } from "./services/safety.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || ".png") || ".png";
    cb(null, `${uuid()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\//.test(file.mimetype)) {
      cb(new Error("Please upload an image of the prescription."));
      return;
    }
    cb(null, true);
  },
});

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "8mb" }));
app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    name: "mediscan",
    disclaimer: DISCLAIMER,
    llm: llmStatus(),
  });
});

app.use("/api/scan", scanRouter(upload));
app.use("/api/prescriptions", prescriptions);
app.use("/api/chat", chat);
app.use("/api/reminders", reminders);
app.use("/api/drugs", drugs);
app.use("/api/config", config);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(400).json({ error: err.message || "Request failed." });
});

app.listen(PORT, () => {
  console.log(`translator backend OK http://localhost:${PORT}`);
});
