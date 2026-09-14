import {
  buildPlainLanguage,
  parsePrescriptionText,
  scheduleFromMedication,
} from "../services/parser.js";

describe("parsePrescriptionText", () => {
  test("reads a typical Indian-style amoxicillin line", () => {
    const result = parsePrescriptionText("Amoxicillin 500 mg 1-0-1 x 5 days after meals");
    expect(result.medications).toHaveLength(1);
    const med = result.medications[0];
    expect(med.name).toBe("amoxicillin");
    expect(med.strength).toBe("500 mg");
    expect(med.frequency).toBe("twice daily");
    expect(med.times).toEqual(["08:00", "20:00"]);
    expect(med.duration).toBe("5 days");
    expect(med.instructions).toBe("after meals");
    expect(result.warnings[0]).toMatch(/not medical advice/i);
  });

  test("reads BID frequency", () => {
    const { medications } = parsePrescriptionText("Ibuprofen 400 mg BID");
    expect(medications[0].name).toBe("ibuprofen");
    expect(medications[0].strength).toBe("400 mg");
    expect(medications[0].frequency).toBe("twice daily");
    expect(medications[0].times).toEqual(["08:00", "20:00"]);
  });

  test("reads with-food instructions", () => {
    const { medications } = parsePrescriptionText("Ibuprofen 400 mg twice daily with food");
    expect(medications[0].instructions).toBe("with food");
  });

  test("reads before-meal instructions and bedtime (HS)", () => {
    const before = parsePrescriptionText("Pantoprazole 40 mg before meals OD");
    expect(before.medications[0].name).toBe("pantoprazole");
    expect(before.medications[0].instructions).toBe("before meals");

    const night = parsePrescriptionText("Cetirizine 10 mg HS");
    expect(night.medications[0].frequency).toBe("at bedtime");
    expect(night.medications[0].times).toEqual(["22:00"]);
  });

  test("parses several medicines from a multi-line slip", () => {
    const text = [
      "Metformin 500 mg BD for 30 days",
      "Atorvastatin 10 mg at night",
    ].join("\n");
    const { medications } = parsePrescriptionText(text);
    const names = medications.map((m) => m.name);
    expect(names).toEqual(expect.arrayContaining(["metformin", "atorvastatin"]));
  });

  test("skips duplicate drug names", () => {
    const { medications } = parsePrescriptionText(
      "Amoxicillin 500 mg BID\nAmoxicillin 500 mg BID",
    );
    expect(medications).toHaveLength(1);
  });

  test("returns a fallback medication when OCR is unreadable", () => {
    const result = parsePrescriptionText("??? faint scribble ???");
    expect(result.medications).toHaveLength(1);
    expect(result.medications[0].name).toMatch(/could not read/i);
    expect(result.medications[0].dosage).toBe("unknown");
    expect(result.plainLanguage).toMatch(/could not read/i);
  });

  test("returns no medications for empty text", () => {
    expect(parsePrescriptionText("").medications).toEqual([]);
    expect(parsePrescriptionText("   \n  ").medications).toEqual([]);
  });
});

describe("buildPlainLanguage", () => {
  test("explains an empty list", () => {
    expect(buildPlainLanguage([])).toMatch(/could not pick out medicines/i);
  });

  test("joins name, dose, frequency, times, duration, and instructions", () => {
    const text = buildPlainLanguage([
      {
        name: "amoxicillin",
        strength: "500 mg",
        dosage: "Take 500 mg",
        frequency: "twice daily",
        times: ["08:00", "20:00"],
        duration: "5 days",
        instructions: "after meals",
      },
    ]);
    expect(text).toMatch(/Amoxicillin/);
    expect(text).toMatch(/500 mg/);
    expect(text).toMatch(/twice daily/);
    expect(text).toMatch(/08:00/);
    expect(text).toMatch(/5 days/);
    expect(text).toMatch(/after meals/);
  });
});

describe("scheduleFromMedication", () => {
  test("emits one reminder slot per time", () => {
    const slots = scheduleFromMedication({
      name: "metformin",
      strength: "500 mg",
      times: ["08:00", "20:00"],
      frequency: "twice daily",
    });
    expect(slots).toHaveLength(2);
    expect(slots[0]).toMatchObject({
      medicationName: "metformin",
      strength: "500 mg",
      time: "08:00",
      enabled: true,
    });
    expect(slots[1].time).toBe("20:00");
  });

  test("defaults to 08:00 when times are missing", () => {
    const slots = scheduleFromMedication({ name: "crocin", strength: null, times: [] });
    expect(slots).toEqual([
      expect.objectContaining({ medicationName: "crocin", time: "08:00", enabled: true }),
    ]);
  });
});
