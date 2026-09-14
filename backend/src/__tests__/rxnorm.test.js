import { jest } from "@jest/globals";

const { validateDrug, validateMedications } = await import("../services/rxnorm.js");

describe("validateDrug", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("rejects a blank or unreadable name without calling the network", async () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch");
    await expect(validateDrug("")).resolves.toMatchObject({
      matched: false,
      rxcui: null,
      message: "No name to check.",
    });
    await expect(validateDrug("Could not read a clear drug name")).resolves.toMatchObject({
      matched: false,
      message: "No name to check.",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("returns a RxNorm match and OpenFDA snippet when the APIs respond", async () => {
    jest.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const href = String(url);
      if (href.includes("approximateTerm")) {
        return {
          ok: true,
          json: async () => ({
            approximateGroup: {
              candidate: [{ rxcui: "723", name: "amoxicillin", tty: "IN", score: "90" }],
            },
          }),
        };
      }
      if (href.includes("/rxcui/723/properties")) {
        return {
          ok: true,
          json: async () => ({ properties: { name: "Amoxicillin", tty: "IN" } }),
        };
      }
      if (href.includes("api.fda.gov")) {
        return {
          ok: true,
          json: async () => ({
            results: [
              {
                openfda: { brand_name: ["Amoxil"], generic_name: ["amoxicillin"] },
                purpose: ["antibiotic"],
              },
            ],
          }),
        };
      }
      throw new Error(`unexpected fetch: ${href}`);
    });

    await expect(validateDrug("amoxicillin")).resolves.toMatchObject({
      query: "amoxicillin",
      matched: true,
      rxcui: "723",
      displayName: "Amoxicillin",
      message: expect.stringMatching(/Matched RxNorm/i),
      openFda: {
        brand: "Amoxil",
        generic: "amoxicillin",
        purpose: "antibiotic",
      },
    });
  });

  test("explains when lookup is offline", async () => {
    jest.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    await expect(validateDrug("ibuprofen")).resolves.toMatchObject({
      matched: false,
      rxcui: null,
      message: expect.stringMatching(/offline.*network down/i),
    });
  });

  test("reports no close match when RxNorm has no candidate", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    await expect(validateDrug("notadrugxyz")).resolves.toMatchObject({
      matched: false,
      message: expect.stringMatching(/No close match in RxNorm/i),
    });
  });
});

describe("validateMedications", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("attaches a validation object to each medication", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });
    const out = await validateMedications([{ name: "metformin" }, { name: "atorvastatin" }]);
    expect(out).toHaveLength(2);
    expect(out[0].name).toBe("metformin");
    expect(out[0].validation).toMatchObject({ query: "metformin" });
    expect(out[1].validation.query).toBe("atorvastatin");
  });
});
