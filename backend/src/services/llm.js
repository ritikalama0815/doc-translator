/**
 * @fileoverview LLM helpers for structuring OCR, explaining a slip, and symptom chat.
 * Anthropic is preferred when both keys exist; with no key the heuristic parser
 * and {@link ruleBasedSymptomReply} run instead.
 * @module services/llm
 */

import { envOrConfig } from "../db.js";
import { parsePrescriptionText, canonicalizeMedications, buildPlainLanguage } from "./parser.js";

const SYSTEM_STRUCT = `You are app's prescription reader. You turn messy OCR from handwritten prescriptions into structured JSON.

Rules:
- Never diagnose or invent medicines that are not reasonably present in the OCR.
- Correct obvious OCR misspellings to the real generic or brand name when it is clearly the same drug (ibpofen → ibuprofen, orprelol → oxprenolol). Put the messy OCR spelling in rawLine.
- If the name is too garbled to be sure, keep the raw guess and set confidence low.
- Prefer generic names when obvious.
- Interpret common notations: BID/BD = twice daily, TID/TDS = 3x, QID = 4x, HS = bedtime, PRN = as needed, and 1-0-1 / 1-1-1 (morning-afternoon-night).
- times must be HH:MM 24h suggestions for reminders.
- plainLanguage should be warm, simple, 2-6 sentences a non-clinician can follow.
- warnings should flag unclear doses, missing duration, or "confirm with pharmacist".
- Return JSON only.`;

const SYSTEM_EXPLAIN = `You explain an already-structured prescription in plain language for a patient.
Do not diagnose. Do not tell them to skip or change a prescribed dose.
Keep a friendly, calm tone. Mention they should confirm with a pharmacist.`;

const SYSTEM_CHAT = `You are a cautious symptom-guidance assistant inside a desktop app called MediScan.
You are NOT a doctor and you MUST NOT diagnose, prescribe, or give dosing instructions for prescription drugs.

Always:
- Start from general, conservative self-care information.
- Include a short reminder that this is not a diagnosis.
- If symptoms could be serious, say clearly to seek in-person or emergency care.
- Ask at most one clarifying question if needed.
- Never provide controlled-substance advice.

If the user describes emergency red flags (chest pain, trouble breathing, stroke signs, severe allergic reaction, suicidal thoughts, uncontrolled bleeding, pregnancy danger signs, infant under 3 months with fever), tell them to get emergency care now.`;

/** @returns {{anthropic: string, openai: string, model: string}} */
function keys() {
  return {
    anthropic: envOrConfig("ANTHROPIC_API_KEY", "anthropicKey"),
    openai: envOrConfig("OPENAI_API_KEY", "openaiKey"),
    model: envOrConfig("LLM_MODEL", "llmModel"),
  };
}

/**
 * Whether an LLM provider is configured (used by `/api/health` and `/api/config`).
 * @returns {{available: boolean, provider: "anthropic"|"openai"|null}}
 */
export function llmStatus() {
  const { anthropic, openai } = keys();
  return {
    available: Boolean(anthropic || openai),
    provider: anthropic ? "anthropic" : openai ? "openai" : null,
  };
}

/**
 * @param {string} system System prompt.
 * @param {string} user User message.
 * @param {string} [model]
 * @returns {Promise<string>} Concatenated text blocks.
 */
async function callAnthropic(system, user, model) {
  const { anthropic } = keys();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": anthropic,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model || "claude-sonnet-4-20250514",
      max_tokens: 1400,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 240)}`);
  const json = await res.json();
  return json.content?.map((p) => p.text).join("\n") || "";
}

/**
 * @param {string} system
 * @param {string} user
 * @param {string} [model]
 * @returns {Promise<string>}
 */
async function callOpenAI(system, user, model) {
  const { openai } = keys();
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${openai}`,
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 240)}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content || "";
}

/**
 * Call the configured provider, or `null` when no API key is set.
 * @param {string} system
 * @param {string} user
 * @param {{json?: boolean}} [opts]
 * @returns {Promise<string|null>}
 */
async function complete(system, user, { json = true } = {}) {
  const { anthropic, openai, model } = keys();
  if (!anthropic && !openai) return null;
  let text;
  if (anthropic) text = await callAnthropic(system, user, model);
  else text = await callOpenAI(json ? `${system}\nReturn a JSON object.` : system, user, model);
  return text;
}

/**
 * Parse the first `{...}` object out of model output, ignoring leading prose.
 * @param {string|null|undefined} text
 * @returns {object|null}
 */
function parseJsonLoose(text) {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/**
 * Turn OCR text into a structured prescription. Uses the LLM when a key exists;
 * otherwise (or if JSON parse fails) returns the heuristic parser result with `source: "heuristic"`.
 *
 * @param {string} ocrText
 * @returns {Promise<object>} Structured slip plus `source` (`"llm"` | `"heuristic"`).
 */
export async function structurePrescription(ocrText) {
  const fallback = parsePrescriptionText(ocrText);
  const raw = await complete(
    SYSTEM_STRUCT,
    `OCR text from a prescription photo:\n"""${ocrText.slice(0, 6000)}"""\n\nReturn JSON with keys: patientName, doctorName, date, medications (array of {name, strength, form, dosage, frequency, times, duration, instructions, confidence}), notes, plainLanguage, warnings.`,
  );
  const parsed = parseJsonLoose(raw);
  if (!parsed) return { ...fallback, source: "heuristic" };

  const medications = canonicalizeMedications(
    (Array.isArray(parsed.medications) ? parsed.medications : fallback.medications).map((med) => ({
      name: med.name || "Unknown",
      ocrName: med.ocrName || med.name,
      rawLine: med.rawLine || med.name,
      strength: med.strength || null,
      form: med.form || null,
      dosage: med.dosage || "as written",
      frequency: med.frequency || "as directed",
      times: Array.isArray(med.times) ? med.times : [],
      duration: med.duration || null,
      instructions: med.instructions || null,
      confidence: med.confidence ?? null,
    })),
  );
  return {
    patientName: parsed.patientName || null,
    doctorName: parsed.doctorName || null,
    date: parsed.date || null,
    medications,
    notes: parsed.notes || "",
    plainLanguage: medications.some((m) => m.nameCorrected)
      ? buildPlainLanguage(medications)
      : parsed.plainLanguage || buildPlainLanguage(medications),
    warnings: parsed.warnings?.length ? parsed.warnings : fallback.warnings,
    source: "llm",
  };
}

/**
 * Patient-facing explanation of an already-structured slip.
 * Falls back to `plainLanguage` + per-med how-to-take lines when no model is available.
 *
 * @param {object} structured Output of {@link structurePrescription} or the heuristic parser.
 * @returns {Promise<{explanation: string, howToTake: string[], seeADoctorIf: string[]}>}
 */
export async function explainPrescription(structured) {
  const raw = await complete(
    SYSTEM_EXPLAIN,
    `Explain this structured prescription:\n${JSON.stringify(structured, null, 2)}\nReturn JSON { "explanation": "...", "howToTake": ["..."], "seeADoctorIf": ["..."] }`,
  );
  const parsed = parseJsonLoose(raw);
  if (parsed?.explanation) return parsed;
  return {
    explanation: structured.plainLanguage,
    howToTake: (structured.medications || []).map(
      (m) => `${m.name}: ${m.dosage}, ${m.frequency}${m.instructions ? ` (${m.instructions})` : ""}`,
    ),
    seeADoctorIf: [
      "You get a rash, swelling, or trouble breathing after a new medicine.",
      "Symptoms get worse instead of better.",
      "You cannot read the dose and nobody can confirm it.",
    ],
  };
}

/**
 * Reply to a symptom-chat transcript. Uses the LLM when configured; otherwise
 * {@link ruleBasedSymptomReply} on the last user message.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<{reply: string, urgency: string, seeADoctorIf: string[], selfCare: string[], source: string}>}
 */
export async function symptomReply(messages) {
  const status = llmStatus();
  const transcript = messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  if (!status.available) {
    return ruleBasedSymptomReply(messages.at(-1)?.content || "");
  }

  const raw = await complete(
    SYSTEM_CHAT,
    `${transcript}\n\nReturn JSON { "reply": string, "urgency": "self-care" | "see-doctor" | "urgent", "seeADoctorIf": string[], "selfCare": string[] }`,
  );
  const parsed = parseJsonLoose(raw);
  if (parsed?.reply) {
    return {
      reply: parsed.reply,
      urgency: parsed.urgency || "see-doctor",
      seeADoctorIf: parsed.seeADoctorIf || [],
      selfCare: parsed.selfCare || [],
      source: "llm",
    };
  }
  return ruleBasedSymptomReply(messages.at(-1)?.content || "");
}

/**
 * Whole-word mention of `key` in `haystack`, ignoring negated forms like "no cough".
 * @param {string} haystack
 * @param {string} key
 * @returns {boolean}
 */
function mentions(haystack, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!new RegExp(`\\b${escaped}\\b`, "i").test(haystack)) return false;
  return !new RegExp(`\\b(?:no|without|not a)\\s+${escaped}\\b`, "i").test(haystack);
}

/**
 * Offline symptom guidance: urgent needles first, then cold/fever/headache/stomach/rash topics.
 * Always reminds the user this is not a diagnosis.
 *
 * @param {string} text Latest user message.
 * @returns {{reply: string, urgency: "urgent"|"see-doctor"|"self-care", seeADoctorIf: string[], selfCare: string[], source: "rules"}}
 */
export function ruleBasedSymptomReply(text) {
  const t = text.toLowerCase();
  const urgent = [
    ["chest pain", "Chest pain can be an emergency."],
    ["can't breathe", "Trouble breathing needs urgent care."],
    ["can't breath", "Trouble breathing needs urgent care."],
    ["shortness of breath", "Trouble breathing needs urgent care."],
    ["face droop", "Stroke-like symptoms need emergency care."],
    ["slurred speech", "Stroke-like symptoms need emergency care."],
    ["suicidal", "Please get urgent help now. In the US you can call or text 988."],
    ["kill myself", "Please get urgent help now. In the US you can call or text 988."],
    ["anaphylaxis", "A severe allergic reaction needs emergency care."],
    ["throat swelling", "Throat swelling needs emergency care."],
    ["coughing blood", "Coughing blood needs urgent medical care."],
    ["stiff neck", "Fever with a stiff neck needs urgent care."],
  ];

  for (const [needle, line] of urgent) {
    if (t.includes(needle)) {
      return {
        reply: `${line} I can't diagnose from chat. Please get emergency or in-person care now rather than waiting on an app.`,
        urgency: "urgent",
        seeADoctorIf: ["Symptoms are sudden, severe, or getting worse quickly."],
        selfCare: [],
        source: "rules",
      };
    }
  }

  const topics = [
    {
      keys: ["cough", "cold", "sore throat", "runny nose", "congestion"],
      reply:
        "Colds are usually viral and settle with rest and fluids. I can't tell strep or flu from a chat, so this is only general orientation.",
      selfCare: ["Warm fluids.", "Rest your voice if your throat is sore.", "Honey is sometimes used for cough in older children and adults — not for infants."],
      seeADoctorIf: ["Trouble breathing.", "Cough lasts more than 10–14 days.", "High fever, rash, or you are immunocompromised."],
      urgency: "self-care",
    },
    {
      keys: ["fever", "temperature"],
      reply:
        "A mild fever is often the body fighting an infection. Rest, fluids, and checking temperature can help. This is general guidance, not a diagnosis.",
      selfCare: ["Sip water regularly.", "Rest.", "Use a thermometer rather than guessing."],
      seeADoctorIf: ["Fever lasts more than 3 days.", "Fever in a baby under 3 months.", "Confusion, stiff neck, or a rash that doesn't fade."],
      urgency: "see-doctor",
    },
    {
      keys: ["headache", "migraine"],
      reply:
        "Many headaches are tension or dehydration related, but sudden 'worst ever' pain is an emergency. I cannot diagnose the cause from chat.",
      selfCare: ["Water, rest, and a dark quiet room.", "Note what makes it better or worse to tell a clinician."],
      seeADoctorIf: ["Sudden worst headache of your life.", "Headache with fever, stiff neck, fainting, or vision loss.", "Headaches that keep getting worse."],
      urgency: "see-doctor",
    },
    {
      keys: ["stomach", "nausea", "vomit", "diarrhea", "food poison"],
      reply:
        "Stomach bugs often improve with small sips of fluid. I can't diagnose food poisoning vs other causes from a message.",
      selfCare: ["Oral rehydration or clear fluids in small sips.", "Avoid heavy, greasy food until it settles."],
      seeADoctorIf: ["Blood in stool or vomit.", "Can't keep fluids down.", "Severe belly pain, dizziness, or symptoms in a young child."],
      urgency: "see-doctor",
    },
    {
      keys: ["rash", "itch", "hives"],
      reply:
        "Rashes have many causes. If it came with swelling of the lips or trouble breathing, that is urgent. Otherwise a clinician should look at it if it spreads or hurts.",
      selfCare: ["Don't scratch until it bleeds.", "Fragrance-free moisturizer for dry itchy skin."],
      seeADoctorIf: ["Swelling of lips/tongue or breathing trouble.", "Fever with a rapidly spreading rash.", "Blisters or skin peeling."],
      urgency: "see-doctor",
    },
  ];

  for (const topic of topics) {
    if (topic.keys.some((k) => mentions(t, k))) {
      return {
        reply: topic.reply,
        urgency: topic.urgency,
        seeADoctorIf: topic.seeADoctorIf,
        selfCare: topic.selfCare,
        source: "rules",
      };
    }
  }

  return {
    reply:
      "Hi, I can offer general, non-diagnostic medical pointers only. Tell me the main symptom, how long it's been going on, and anything scary (breathing trouble, chest pain, fainting, rash with fever). If you feel very unwell, skip the app and talk to a clinician.",
    urgency: "see-doctor",
    seeADoctorIf: ["You feel worse quickly.", "You are unsure and symptoms persist."],
    selfCare: ["Write down when it started and what you've already tried."],
    source: "rules",
  };
}
