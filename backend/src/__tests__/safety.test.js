import { DISCLAIMER, detectRedFlags, isCrisis } from "../services/safety.js";

describe("DISCLAIMER", () => {
  test("states this is not a doctor or diagnosis", () => {
    expect(DISCLAIMER).toMatch(/not a doctor/i);
    expect(DISCLAIMER).toMatch(/does not diagnose/i);
  });
});

describe("detectRedFlags", () => {
  test("returns an empty list for blank or everyday text", () => {
    expect(detectRedFlags("")).toEqual([]);
    expect(detectRedFlags(null)).toEqual([]);
    expect(detectRedFlags("I have a mild cough for two days")).toEqual([]);
  });

  test("flags chest pain and breathing trouble", () => {
    expect(detectRedFlags("I have chest pain")).toContain("chest pain");
    expect(detectRedFlags("pressure in my chest")).toContain("chest pain");
    expect(detectRedFlags("I cannot breathe")).toContain("breathing trouble");
    expect(detectRedFlags("shortness of breath")).toContain("breathing trouble");
  });

  test("flags stroke warning signs", () => {
    expect(detectRedFlags("face droop and slurred speech")).toEqual(
      expect.arrayContaining(["stroke warning signs"]),
    );
  });

  test("flags crisis / self-harm language", () => {
    expect(detectRedFlags("I want to die")).toContain("crisis / self-harm");
    expect(detectRedFlags("thoughts of self-harm")).toContain("crisis / self-harm");
  });

  test("flags severe allergy, bleeding, pregnancy, and infant clues", () => {
    expect(detectRedFlags("lips swell after a pill")).toContain("severe allergic reaction");
    expect(detectRedFlags("coughing blood")).toContain("bleeding");
    expect(detectRedFlags("pregnant with severe pain")).toContain("pregnancy warning signs");
    expect(detectRedFlags("my newborn has a fever")).toContain("young infant — clinician should assess");
  });

  test("can return several flags from one message", () => {
    const flags = detectRedFlags("chest pain and I can't breathe");
    expect(flags).toEqual(expect.arrayContaining(["chest pain", "breathing trouble"]));
    expect(flags.length).toBeGreaterThanOrEqual(2);
  });
});

describe("isCrisis", () => {
  test("treats chest pain, breathing, stroke, crisis, allergy, and bleeding as crisis", () => {
    expect(isCrisis(["chest pain"])).toBe(true);
    expect(isCrisis(["breathing trouble"])).toBe(true);
    expect(isCrisis(["stroke warning signs"])).toBe(true);
    expect(isCrisis(["crisis / self-harm"])).toBe(true);
    expect(isCrisis(["severe allergic reaction"])).toBe(true);
    expect(isCrisis(["bleeding"])).toBe(true);
  });

  test("does not treat infant or pregnancy labels as crisis by themselves", () => {
    expect(isCrisis(["young infant — clinician should assess"])).toBe(false);
    expect(isCrisis(["pregnancy warning signs"])).toBe(false);
    expect(isCrisis([])).toBe(false);
  });
});
