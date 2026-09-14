/**
 * @fileoverview Jest tests for {@link module:data/drugs-common}.
 *
 * What this file does:
 * - Checks Levenshtein distance on identical strings, `kitten`/`sitting`, and empty strings.
 * - Checks `closestDrug` for empty input, substring hits (`metformin`), typos (`amoxcillin`),
 *   nonsense that should not match, and brand names like Crocin.
 * - Checks Indian `1-0-1` / `1/1/1` / `1-0-0` / `0-0-0` schedules and rejects invalid tokens.
 * - Spot-checks FREQUENCY_MAP times for BID, TDS, HS, and PRN.
 */
import {
  COMMON_DRUGS,
  FREQUENCY_MAP,
  closestDrug,
  levenshtein,
  timesFromIndianSchedule,
} from "../data/drugs-common.js";

describe("levenshtein", () => {
  test("is zero for the same string, ignoring case", () => {
    expect(levenshtein("Amoxicillin", "amoxicillin")).toBe(0);
  });

  test("counts insertions, deletions, and substitutions", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "")).toBe(3);
  });
});

describe("closestDrug", () => {
  test("returns null for empty input", () => {
    expect(closestDrug("")).toBeNull();
    expect(closestDrug("   ")).toBeNull();
    expect(closestDrug(null)).toBeNull();
  });

  test("matches a known name contained in the query", () => {
    expect(closestDrug("Take metformin 500 mg")).toEqual({ name: "metformin", score: 0 });
  });

  test("matches a close misspelling within the threshold", () => {
    const hit = closestDrug("amoxcillin");
    expect(hit?.name).toBe("amoxicillin");
    expect(hit?.score).toBeGreaterThan(0);
  });

  test("returns null when the guess is too far from any common drug", () => {
    expect(closestDrug("zzzzzzzz")).toBeNull();
  });

  test("includes well-known brand names used on slips", () => {
    expect(COMMON_DRUGS).toEqual(expect.arrayContaining(["crocin", "dolo", "augmentin"]));
    expect(closestDrug("crocin")).toEqual({ name: "crocin", score: 0 });
  });
});

describe("timesFromIndianSchedule", () => {
  test("maps 1-0-1 to morning and night", () => {
    expect(timesFromIndianSchedule("1-0-1")).toEqual({
      label: "twice daily",
      times: ["08:00", "20:00"],
      notation: "1-0-1",
    });
  });

  test("maps 1-1-1 and 1/1/1 the same way", () => {
    expect(timesFromIndianSchedule("1-1-1").label).toBe("three times daily");
    expect(timesFromIndianSchedule("1/1/1").times).toEqual(["08:00", "14:00", "20:00"]);
  });

  test("maps 1-0-0 to once daily and 0-0-0 to as directed", () => {
    expect(timesFromIndianSchedule("1-0-0")).toMatchObject({
      label: "once daily",
      times: ["08:00"],
    });
    expect(timesFromIndianSchedule("0-0-0")).toMatchObject({
      label: "as directed",
      times: [],
    });
  });

  test("returns null for non-schedule text", () => {
    expect(timesFromIndianSchedule("BID")).toBeNull();
    expect(timesFromIndianSchedule("2-2-2")).toBeNull();
  });
});

describe("FREQUENCY_MAP", () => {
  test("has BID/BD, TID/TDS, and HS times", () => {
    expect(FREQUENCY_MAP.bid.times).toEqual(["08:00", "20:00"]);
    expect(FREQUENCY_MAP.bd.label).toBe("twice daily");
    expect(FREQUENCY_MAP.tid.times).toHaveLength(3);
    expect(FREQUENCY_MAP.tds.label).toBe("three times daily");
    expect(FREQUENCY_MAP.hs).toEqual({ label: "at bedtime", times: ["22:00"] });
    expect(FREQUENCY_MAP.prn.times).toEqual([]);
  });
});
