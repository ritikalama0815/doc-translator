/**
 * @fileoverview Symptom chat sessions (held in memory). Red flags from
 * {@link module:services/safety} can raise the reply urgency even if the model
 * answered as self-care.
 * @module routes/chat
 */

import { Router } from "express";
import { v4 as uuid } from "uuid";
import { symptomReply } from "../services/llm.js";
import { DISCLAIMER, detectRedFlags, isCrisis } from "../services/safety.js";

const sessions = new Map();
const router = Router();

router.get("/disclaimer", (_req, res) => {
  res.json({ disclaimer: DISCLAIMER });
});

router.post("/", async (req, res) => {
  try {
    const sessionId = req.body.sessionId || uuid();
    const content = String(req.body.message || "").trim();
    if (!content) {
      res.status(400).json({ error: "Type a symptom to begin." });
      return;
    }

    const history = sessions.get(sessionId) || [
      {
        role: "assistant",
        content:
          "Hi, I'm only a general guide; not a diagnosis. If something feels severe or scary, please see a clinician or emergency care.",
      },
    ];
    history.push({ role: "user", content });

    const flags = detectRedFlags(content);
    const result = await symptomReply(history);

    if (flags.length && result.urgency !== "urgent") {
      result.urgency = isCrisis(flags) ? "urgent" : "see-doctor";
    }

    const reply = {
      role: "assistant",
      content: result.reply,
      urgency: result.urgency,
      seeADoctorIf: result.seeADoctorIf,
      selfCare: result.selfCare,
      redFlags: flags,
      source: result.source,
    };
    history.push({ role: "assistant", content: result.reply });
    sessions.set(sessionId, history.slice(-16));

    res.json({
      sessionId,
      disclaimer: DISCLAIMER,
      redFlags: flags,
      ...reply,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Chat failed." });
  }
});

/** Express router mounted at `/api/chat`. */
export default router;
