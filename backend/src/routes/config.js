// GET/POST local API keys and OCR engine. Never sends key values back to the client.
import { Router } from "express";
import { getConfig, saveConfig } from "../db.js";
import { llmStatus } from "../services/llm.js";

const router = Router();

router.get("/", (_req, res) => {
  const cfg = getConfig();
  res.json({
    ocrEngine: cfg.ocrEngine || "auto",
    notifyEnabled: cfg.notifyEnabled !== false,
    googleVision: Boolean(cfg.googleVisionKey || process.env.GOOGLE_VISION_API_KEY),
    anthropic: Boolean(cfg.anthropicKey || process.env.ANTHROPIC_API_KEY),
    openai: Boolean(cfg.openaiKey || process.env.OPENAI_API_KEY),
    llm: llmStatus(),
  });
});

router.post("/", (req, res) => {
  const patch = {};
  const map = {
    googleVisionKey: "googleVisionKey",
    anthropicKey: "anthropicKey",
    openaiKey: "openaiKey",
    llmModel: "llmModel",
    ocrEngine: "ocrEngine",
    notifyEnabled: "notifyEnabled",
  };
  for (const [from, to] of Object.entries(map)) {
    if (req.body[from] !== undefined && req.body[from] !== "") patch[to] = req.body[from];
  }
  const saved = saveConfig(patch);
  res.json({
    ocrEngine: saved.ocrEngine,
    notifyEnabled: saved.notifyEnabled,
    googleVision: Boolean(saved.googleVisionKey || process.env.GOOGLE_VISION_API_KEY),
    llm: llmStatus(),
  });
});

export default router;
