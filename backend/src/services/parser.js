import { closestDrug, FREQUENCY_MAP, timesFromIndianSchedule } from "../data/drugs-common.js";

const DOSE_RE = /(\d+(?:\.\d+)?)\s?(mg|mcg|mcg|µg|g|ml|ml|iu|units?|%|tablet|tab|cap|capsule|drop|puff)s?\b/i;
const DURATION_RE = /(?:for\s+)?(\d+)\s*(day|days|week|weeks|month|months)\b/i;

function linesOf(text) {
  return String(text)
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function detectFrequency(text) {
  const lower = text.toLowerCase();
  const indian = timesFromIndianSchedule(text) || timesFromIndianSchedule(lower.match(/\b[01]\s*[-/]\s*[01]\s*[-/]\s*[01]\b/)?.[0] || "");
  if (indian) return indian;
  for (const [key, value] of Object.entries(FREQUENCY_MAP)) {
    if (lower.includes(key)) return { ...value, notation: key };
  }
  return { label: "as directed", times: ["08:00"], notation: null };
}

function extractDose(text) {
  const m = text.match(DOSE_RE);
  if (!m) return { strength: null, form: null };
  const unit = m[2].toLowerCase();
  const form = ["tab", "tablet", "cap", "capsule"].includes(unit) ? unit : null;
  return { strength: `${m[1]} ${unit}`, form };
}

function guessName(line) {
  const cleaned = line
    .replace(DOSE_RE, " ")
    .replace(/\b(tab|tabs|tablet|caps?|syrup|susp|injection|mg|ml)\b/gi, " ")
    .replace(/\b[01]\s*[-/]\s*[01]\s*[-/]\s*[01]\b/g, " ")
    .replace(/[^a-zA-Z0-9 +.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;
  const guess = closestDrug(cleaned);
  return {
    raw: cleaned,
    name: guess?.name || cleaned.split(" ").slice(0, 3).join(" "),
  };
}

export function parsePrescriptionText(ocrText) {
  const lines = linesOf(ocrText);
  const medications = [];
  const seen = new Set();

  for (const line of lines) {
    const freq = detectFrequency(line);
    const dose = extractDose(line);
    const named = guessName(line);
    const looksLikeMed =
      dose.strength ||
      freq.notation ||
      timesFromIndianSchedule(line) ||
      closestDrug(line);

    if (!named || !looksLikeMed) continue;
    const key = named.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const duration = line.match(DURATION_RE);

    medications.push({
      name: named.name,
      rawLine: line,
      strength: dose.strength,
      form: dose.form,
      dosage: dose.strength ? `Take ${dose.strength}` : "as written",
      frequency: freq.label,
      times: freq.times,
      duration: duration ? `${duration[1]} ${duration[2]}` : null,
      instructions: /after meal/i.test(line)
        ? "after meals"
        : /before meal/i.test(line)
          ? "before meals"
          : /with food|with meal/i.test(line)
            ? "with food"
            : null,
    });
  }

  if (medications.length === 0 && ocrText.trim()) {
    medications.push({
      name: "Could not read a clear drug name",
      rawLine: lines[0] || ocrText.slice(0, 120),
      strength: null,
      form: null,
      dosage: "unknown",
      frequency: "as directed",
      times: [],
      duration: null,
      instructions: "Please type the name in if the slip is too faint.",
    });
  }

  return {
    patientName: null,
    doctorName: null,
    date: null,
    medications,
    notes: "",
    plainLanguage: buildPlainLanguage(medications),
    warnings: [
      "This is a reading aid, not medical advice. Confirm with your pharmacist or clinician before taking anything.",
    ],
  };
}

export function buildPlainLanguage(medications) {
  if (!medications.length) {
    return "I could not pick out medicines from that slip. A brighter photo or typing the names in will help.";
  }
  return medications
    .map((med) => {
      const bits = [`${title(med.name)}`];
      if (med.strength) bits.push(med.strength);
      bits.push(`— ${med.dosage}, ${med.frequency}`);
      if (med.times?.length) bits.push(`around ${med.times.join(", ")}`);
      if (med.duration) bits.push(`for ${med.duration}`);
      if (med.instructions) bits.push(`(${med.instructions})`);
      return bits.join(" ");
    })
    .join(" ");
}

function title(s) {
  return String(s).replace(/\b\w/g, (c) => c.toUpperCase());
}

export function scheduleFromMedication(med) {
  const times = Array.isArray(med.times) && med.times.length ? med.times : ["08:00"];
  return times.map((time) => ({
    medicationName: med.name,
    strength: med.strength,
    time,
    frequency: med.frequency,
    enabled: true,
  }));
}
