/**
 * @fileoverview Shared medical disclaimer and keyword red-flag detection for symptom chat.
 * These checks are conservative string matches — they do not diagnose.
 * @module services/safety
 */

/** Shown on health, chat, and the desktop UI so the app is never mistaken for a clinician. */
export const DISCLAIMER =
  "this app is a reading and reminder helper, not a doctor. It does not diagnose, prescribe, or replace a clinician or pharmacist.";

/**
 * Scan free-text symptoms for emergency-style phrases.
 * @param {string|null|undefined} text User message.
 * @returns {string[]} Human-readable flag labels (may be empty).
 */
export function detectRedFlags(text) {
  const t = (text || "").toLowerCase();
  const hits = [];
  const rules = [
    { test: /chest pain|pressure in (my|the) chest/, label: "chest pain" },
    { test: /can't breathe|cannot breathe|short(ness)? of breath|wheezing badly/, label: "breathing trouble" },
    { test: /face droop|arm weakness|slurred speech|stroke/, label: "stroke warning signs" },
    { test: /suicid|kill myself|want to die|self[- ]harm/, label: "crisis / self-harm" },
    { test: /throat swell|lips swell|anaphylaxis|epipen/, label: "severe allergic reaction" },
    { test: /cough(ing)? blood|vomit(ing)? blood/, label: "bleeding" },
    { test: /pregnant.*(bleed|severe pain)|vaginal bleeding.*pregnant/, label: "pregnancy warning signs" },
    { test: /baby|infant|newborn|3 months/, label: "young infant — clinician should assess" },
  ];
  for (const rule of rules) {
    if (rule.test.test(t)) hits.push(rule.label);
  }
  return hits;
}

/**
 * Whether any detected flag should force chat urgency to `"urgent"`.
 * Infant and pregnancy labels are left as `"see-doctor"` unless another crisis flag is present.
 *
 * @param {string[]} flags Labels from {@link detectRedFlags}.
 * @returns {boolean}
 */
export function isCrisis(flags) {
  return flags.some((f) =>
    /chest pain|breathing|stroke|crisis|allergic|bleeding/.test(f),
  );
}
