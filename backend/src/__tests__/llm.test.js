/**
 * @fileoverview Jest tests for {@link module:services/llm} with API keys stubbed off.
 *
 * What this file does:
 * - Mocks `envOrConfig` so no Anthropic/OpenAI key is visible; nothing hits a real model.
 * - Asserts `llmStatus` is `{ available: false, provider: null }`.
 * - Walks `ruleBasedSymptomReply` through urgent phrases (chest pain, breathing, stroke, 988),
 *   topic buckets (cold, fever, headache, stomach, rash), negated "no cough", and generic hello.
 * - Asserts `structurePrescription` / `explainPrescription` / `symptomReply` use the
 *   heuristic parser and rule-based chat when no LLM is configured.
 */
import { jest } from "@jest/globals";

jest.unstable_mockModule("../db.js", () => ({
  envOrConfig: jest.fn(() => ""),
}));

const {
  explainPrescription,
  llmStatus,
  ruleBasedSymptomReply,
  structurePrescription,
  symptomReply,
} = await import("../services/llm.js");

describe("llmStatus", () => {
  test("reports unavailable when no API keys are configured", () => {
    expect(llmStatus()).toEqual({ available: false, provider: null });
  });
});

describe("ruleBasedSymptomReply", () => {
  test("marks chest pain as urgent", () => {
    const result = ruleBasedSymptomReply("I woke up with chest pain");
    expect(result.urgency).toBe("urgent");
    expect(result.source).toBe("rules");
    expect(result.reply).toMatch(/emergency/i);
  });

  test("marks breathing trouble and stroke signs as urgent", () => {
    expect(ruleBasedSymptomReply("shortness of breath").urgency).toBe("urgent");
    expect(ruleBasedSymptomReply("slurred speech this morning").urgency).toBe("urgent");
  });

  test("points people in crisis to 988", () => {
    const result = ruleBasedSymptomReply("I feel suicidal");
    expect(result.urgency).toBe("urgent");
    expect(result.reply).toMatch(/988/);
  });

  test("gives self-care guidance for a cold", () => {
    const result = ruleBasedSymptomReply("sore throat and a runny nose");
    expect(result.urgency).toBe("self-care");
    expect(result.selfCare.length).toBeGreaterThan(0);
    expect(result.reply).toMatch(/not a diagnosis|general/i);
  });

  test("treats fever and headache as see-doctor", () => {
    expect(ruleBasedSymptomReply("I have a fever of 101").urgency).toBe("see-doctor");
    expect(ruleBasedSymptomReply("bad headache since yesterday").urgency).toBe("see-doctor");
  });

  test("covers stomach and rash topics", () => {
    expect(ruleBasedSymptomReply("nausea and diarrhea").urgency).toBe("see-doctor");
    const rash = ruleBasedSymptomReply("itchy rash on my arms");
    expect(rash.urgency).toBe("see-doctor");
    expect(rash.seeADoctorIf.some((line) => /breathing/i.test(line))).toBe(true);
  });

  test("does not treat 'no cough' as a cough topic", () => {
    const result = ruleBasedSymptomReply("I have no cough, just tired");
    expect(result.reply).toMatch(/main symptom/i);
    expect(result.urgency).toBe("see-doctor");
  });

  test("falls back to a generic prompt for unrelated text", () => {
    const result = ruleBasedSymptomReply("hello");
    expect(result.source).toBe("rules");
    expect(result.reply).toMatch(/not a diagnosis|general/i);
  });
});

describe("structurePrescription without an LLM", () => {
  test("falls back to the heuristic parser", async () => {
    const result = await structurePrescription("Amoxicillin 500 mg 1-0-1 x 5 days after meals");
    expect(result.source).toBe("heuristic");
    expect(result.medications[0].name).toBe("amoxicillin");
    expect(result.plainLanguage).toMatch(/Amoxicillin/i);
  });

  test("corrects OCR typos in the heuristic fallback", async () => {
    const result = await structurePrescription("Ibpofen 400 mg BID");
    expect(result.medications[0].name).toBe("ibuprofen");
  });
});

describe("explainPrescription without an LLM", () => {
  test("uses the structured plain-language fallback", async () => {
    const structured = {
      plainLanguage: "Take the tablet in the morning.",
      medications: [{ name: "ibuprofen", dosage: "Take 400 mg", frequency: "twice daily", instructions: "with food" }],
    };
    const result = await explainPrescription(structured);
    expect(result.explanation).toBe("Take the tablet in the morning.");
    expect(result.howToTake[0]).toMatch(/ibuprofen/i);
    expect(result.seeADoctorIf.length).toBeGreaterThan(0);
  });
});

describe("symptomReply without an LLM", () => {
  test("uses the rule-based helper", async () => {
    const result = await symptomReply([{ role: "user", content: "chest pain" }]);
    expect(result.source).toBe("rules");
    expect(result.urgency).toBe("urgent");
  });
});
