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

export function closestDrug(name) {
  const q = (name || "").toLowerCase().replace(/[^a-z0-9 +.-]/g, " ").trim();
  if (!q) return null;
  let best = null;
  let bestScore = Infinity;
  for (const drug of COMMON_DRUGS) {
    if (q.includes(drug) || drug.includes(q)) {
      return { name: drug, score: 0 };
    }
    const score = levenshtein(q, drug);
    if (score < bestScore) {
      bestScore = score;
      best = drug;
    }
  }
  const threshold = Math.max(2, Math.floor(q.length * 0.4));
  if (best && bestScore <= threshold) return { name: best, score: bestScore };
  return null;
}
