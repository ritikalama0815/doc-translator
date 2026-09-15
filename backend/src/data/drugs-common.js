/**
 * @fileoverview Local drug vocabulary, dosing-frequency map, and fuzzy name matching
 * used when OCR text is too messy to send straight to RxNorm.
 * @module data/drugs-common
 */

/**
 * Generic and common brand names (including names often seen on South Asian slips)
 * that {@link closestDrug} can snap a noisy OCR guess onto.
 * @type {string[]}
 */
export const COMMON_DRUGS = [
  "acetaminophen",
  "paracetamol",
  "ibuprofen",
  "aspirin",
  "amoxicillin",
  "azithromycin",
  "ciprofloxacin",
  "metformin",
  "atorvastatin",
  "lisinopril",
  "amlodipine",
  "losartan",
  "omeprazole",
  "pantoprazole",
  "levothyroxine",
  "metoprolol",
  "oxprenolol",
  "propranolol",
  "atenolol",
  "carvedilol",
  "bisoprolol",
  "nebivolol",
  "sotalol",
  "labetalol",
  "pindolol",
  "albuterol",
  "salbutamol",
  "prednisone",
  "prednisolone",
  "cetirizine",
  "loratadine",
  "montelukast",
  "sertraline",
  "escitalopram",
  "fluoxetine",
  "gabapentin",
  "tramadol",
  "hydrocodone",
  "oxycodone",
  "insulin",
  "glipizide",
  "warfarin",
  "clopidogrel",
  "furosemide",
  "hydrochlorothiazide",
  "doxycycline",
  "cephalexin",
  "amoxicillin-clavulanate",
  "augmentin",
  "metronidazole",
  "fluconazole",
  "oseltamivir",
  "tamiflu",
  "ondansetron",
  "loperamide",
  "diphenhydramine",
  "ranitidine",
  "famotidine",
  "simvastatin",
  "rosuvastatin",
  "naproxen",
  "diclofenac",
  "meloxicam",
  "cyclobenzaprine",
  "tamsulosin",
  "finasteride",
  "sildenafil",
  "vitamin d",
  "ferrous sulfate",
  "folic acid",
  "calcium carbonate",
  "amoxicillin trihydrate",
  "azithral",
  "crocin",
  "dolo",
  "combiflam",
  "pan 40",
  "rantac",
  "zincovit",
  "becosules",
  "augmentin 625",
  "azithro",
  "calpol",
  "brufen",
  "disprin",
  "ecosprin",
  "telmisartan",
  "glimepiride",
  "vildagliptin",
  "sitagliptin",
  "thyronorm",
  "thyroxine",
];

/**
 * Latin / English frequency phrases mapped to a label and suggested 24h reminder times.
 * @type {Object<string, {label: string, times: string[]}>}
 */
export const FREQUENCY_MAP = {
  qd: { label: "once daily", times: ["08:00"] },
  od: { label: "once daily", times: ["08:00"] },
  "once daily": { label: "once daily", times: ["08:00"] },
  "once a day": { label: "once daily", times: ["08:00"] },
  bid: { label: "twice daily", times: ["08:00", "20:00"] },
  bd: { label: "twice daily", times: ["08:00", "20:00"] },
  "twice daily": { label: "twice daily", times: ["08:00", "20:00"] },
  "twice a day": { label: "twice daily", times: ["08:00", "20:00"] },
  tid: { label: "three times daily", times: ["08:00", "14:00", "20:00"] },
  tds: { label: "three times daily", times: ["08:00", "14:00", "20:00"] },
  "three times daily": { label: "three times daily", times: ["08:00", "14:00", "20:00"] },
  qid: { label: "four times daily", times: ["08:00", "12:00", "16:00", "20:00"] },
  qds: { label: "four times daily", times: ["08:00", "12:00", "16:00", "20:00"] },
  qhs: { label: "at bedtime", times: ["22:00"] },
  hs: { label: "at bedtime", times: ["22:00"] },
  bedtime: { label: "at bedtime", times: ["22:00"] },
  "at night": { label: "at bedtime", times: ["22:00"] },
  prn: { label: "as needed", times: [] },
  "as needed": { label: "as needed", times: [] },
  "with meals": { label: "with meals", times: ["08:00", "13:00", "19:00"] },
  "after meals": { label: "after meals", times: ["08:30", "13:30", "19:30"] },
  "before meals": { label: "before meals", times: ["07:30", "12:30", "18:30"] },
  "every 4 hours": { label: "every 4 hours", times: ["08:00", "12:00", "16:00", "20:00", "00:00"] },
  "every 6 hours": { label: "every 6 hours", times: ["06:00", "12:00", "18:00", "00:00"] },
  "every 8 hours": { label: "every 8 hours", times: ["08:00", "16:00", "00:00"] },
  "every 12 hours": { label: "every 12 hours", times: ["08:00", "20:00"] },
};

/**
 * Parse an Indian morning-afternoon-night schedule such as `1-0-1` or `1/1/1`.
 * A `1` means a dose at that slot; `0` means skip it.
 *
 * @param {string} token Text that should be only the three-part schedule.
 * @returns {{label: string, times: string[], notation: string}|null} Schedule, or `null` if the token is not `0/1-0/1-0/1`.
 */
export function timesFromIndianSchedule(token) {
  const m = String(token).trim().match(/^([01])\s*[-/]\s*([01])\s*[-/]\s*([01])$/);
  if (!m) return null;
  const times = [];
  if (m[1] === "1") times.push("08:00");
  if (m[2] === "1") times.push("14:00");
  if (m[3] === "1") times.push("20:00");
  const count = times.length;
  const label =
    count === 3 ? "three times daily" : count === 2 ? "twice daily" : count === 1 ? "once daily" : "as directed";
  return { label, times, notation: `${m[1]}-${m[2]}-${m[3]}` };
}

/** Dose / frequency words that should not be fuzzy-matched as drug names. */
const NAME_STOPWORDS = new Set([
  "bid",
  "bd",
  "tid",
  "tds",
  "qid",
  "qds",
  "qd",
  "od",
  "hs",
  "qhs",
  "prn",
  "tab",
  "tabs",
  "tablet",
  "tablets",
  "cap",
  "caps",
  "capsule",
  "capsules",
  "syrup",
  "susp",
  "injection",
  "mg",
  "ml",
  "mcg",
  "iu",
  "units",
  "unit",
  "take",
  "for",
  "and",
  "the",
  "with",
  "food",
  "meal",
  "meals",
  "after",
  "before",
  "daily",
  "once",
  "twice",
  "three",
  "four",
  "times",
  "every",
  "hours",
  "hour",
  "night",
  "bedtime",
  "needed",
  "as",
  "directed",
  "days",
  "day",
  "week",
  "weeks",
  "month",
  "months",
  "morning",
  "afternoon",
  "evening",
  "sig",
  "po",
  "by",
  "mouth",
  "oral",
]);

/**
 * @param {string|null|undefined} name
 * @returns {string}
 */
export function normalizeDrugQuery(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9 +.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Full string plus name-like tokens (dose/frequency words stripped).
 * @param {string} q
 * @returns {string[]}
 */
function queryCandidates(q) {
  const tokens = q
    .split(/[\s/+]+/)
    .map((t) => t.replace(/^-+|-+$/g, ""))
    .filter((t) => t && t.length >= 3 && !NAME_STOPWORDS.has(t) && !/^\d/.test(t));
  const out = [];
  const add = (s) => {
    if (s && !out.includes(s)) out.push(s);
  };
  add(q);
  for (const t of tokens) add(t);
  if (tokens.length > 1) add(tokens.join(" "));
  return out;
}

/**
 * Exact or clearly-contained name (full drug in the line, or a truncated prefix).
 * @param {string} query
 * @param {string} drug
 * @returns {boolean}
 */
function isContainedName(query, drug) {
  if (query === drug) return true;
  if (drug.length >= 4 && query.includes(drug)) return true;
  if (query.length >= 5 && (drug.startsWith(query) || query.startsWith(drug))) return true;
  return false;
}

/**
 * Case-insensitive Levenshtein edit distance between two strings.
 * @param {string} a
 * @param {string} b
 * @returns {number} Number of insertions, deletions, and substitutions needed to turn `a` into `b`.
 */
export function levenshtein(a, b) {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  const dp = Array.from({ length: s.length + 1 }, () => new Array(t.length + 1).fill(0));
  for (let i = 0; i <= s.length; i++) dp[i][0] = i;
  for (let j = 0; j <= t.length; j++) dp[0][j] = j;
  for (let i = 1; i <= s.length; i++) {
    for (let j = 1; j <= t.length; j++) {
      dp[i][j] =
        s[i - 1] === t[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[s.length][t.length];
}

/**
 * Whether two strings are the same drug name allowing typical OCR typos.
 * @param {string|null|undefined} a
 * @param {string|null|undefined} b
 * @returns {boolean}
 */
export function isCloseDrugName(a, b) {
  const x = normalizeDrugQuery(a);
  const y = normalizeDrugQuery(b);
  if (!x || !y) return false;
  if (x === y || isContainedName(x, y) || isContainedName(y, x)) return true;
  const dist = levenshtein(x, y);
  const limit = Math.max(2, Math.ceil(Math.min(x.length, y.length) * 0.45));
  const gap = Math.abs(x.length - y.length);
  return dist <= limit && gap <= Math.max(3, Math.floor(Math.max(x.length, y.length) * 0.4));
}

/**
 * Find the closest {@link COMMON_DRUGS} entry for a noisy OCR name.
 * Matches individual tokens so `"ibpofen 400 mg BID"` still snaps to ibuprofen.
 * Exact/contained hits win; otherwise the best Levenshtein score is kept only if
 * it is within ~45% of the shorter string and the lengths are similar.
 *
 * @param {string|null|undefined} name Raw name or line fragment.
 * @returns {{name: string, score: number}|null} Match (`score` 0 is exact/contained), or `null`.
 */
export function closestDrug(name) {
  const q = normalizeDrugQuery(name);
  if (!q) return null;

  let best = null;
  let bestScore = Infinity;
  let bestQuery = q;

  for (const query of queryCandidates(q)) {
    for (const drug of COMMON_DRUGS) {
      if (isContainedName(query, drug)) {
        return { name: drug, score: 0 };
      }
      const score = levenshtein(query, drug);
      const gap = Math.abs(query.length - drug.length);
      const bestGap = best ? Math.abs(bestQuery.length - best.length) : Infinity;
      if (score < bestScore || (score === bestScore && gap < bestGap)) {
        bestScore = score;
        best = drug;
        bestQuery = query;
      }
    }
  }

  if (!best) return null;
  const limit = Math.max(2, Math.ceil(Math.min(bestQuery.length, best.length) * 0.45));
  const gap = Math.abs(bestQuery.length - best.length);
  if (bestScore <= limit && gap <= Math.max(3, Math.floor(best.length * 0.4))) {
    return { name: best, score: bestScore };
  }
  return null;
}

/**
 * Snap a messy OCR/LLM name onto the local list when it is clearly the same drug.
 * @param {string|null|undefined} name
 * @returns {{name: string, ocrName: string, corrected: boolean, score: number|null}}
 */
export function correctDrugName(name) {
  const original = String(name || "").trim();
  if (!original || /could not read/i.test(original) || /^unknown$/i.test(original)) {
    return { name: original, ocrName: original, corrected: false, score: null };
  }
  const hit = closestDrug(original);
  if (!hit) return { name: original, ocrName: original, corrected: false, score: null };
  const same = hit.name.toLowerCase() === original.toLowerCase();
  return { name: hit.name, ocrName: original, corrected: !same, score: hit.score };
}
