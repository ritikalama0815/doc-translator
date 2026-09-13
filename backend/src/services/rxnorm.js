const RXNAV = "https://rxnav.nlm.nih.gov/REST";
const OPENFDA = "https://api.fda.gov/drug/label.json";

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) return null;
  return res.json();
}

export async function validateDrug(name) {
  const query = (name || "").trim();
  if (!query || /could not read/i.test(query)) {
    return {
      query,
      matched: false,
      rxcui: null,
      displayName: null,
      synonym: null,
      tty: null,
      openFda: null,
      message: "No name to check.",
    };
  }

  try {
    const approx = await getJson(
      `${RXNAV}/approximateTerm.json?term=${encodeURIComponent(query)}&maxEntries=5`,
    );
    const candidate = approx?.approximateGroup?.candidate?.[0];
    const rxcui = candidate?.rxcui;
    let props = null;
    if (rxcui) {
      const p = await getJson(`${RXNAV}/rxcui/${rxcui}/properties.json`);
      props = p?.properties || null;
    }

    let openFda = null;
    const searchName = props?.name || query;
    try {
      const fda = await getJson(
        `${OPENFDA}?search=openfda.brand_name:"${encodeURIComponent(searchName)}"+openfda.generic_name:"${encodeURIComponent(searchName)}"&limit=1`,
      );
      const hit = fda?.results?.[0];
      if (hit) {
        openFda = {
          brand: hit.openfda?.brand_name?.[0] || null,
          generic: hit.openfda?.generic_name?.[0] || null,
          purpose: hit.purpose?.[0] || hit.indications_and_usage?.[0]?.slice(0, 280) || null,
        };
      }
    } catch {
      openFda = null;
    }

    return {
      query,
      matched: Boolean(rxcui),
      rxcui: rxcui || null,
      displayName: props?.name || candidate?.name || null,
      synonym: candidate?.name || null,
      tty: props?.tty || candidate?.tty || null,
      score: candidate?.score ? Number(candidate.score) : null,
      openFda,
      message: rxcui
        ? `Matched RxNorm ${props?.name || query}`
        : "No close match in RxNorm. Double-check the spelling with a pharmacist.",
    };
  } catch (err) {
    return {
      query,
      matched: false,
      rxcui: null,
      displayName: null,
      synonym: null,
      tty: null,
      openFda: null,
      message: `Drug lookup is offline right now (${err.message}).`,
    };
  }
}

export async function validateMedications(medications) {
  const out = [];
  for (const med of medications) {
    const check = await validateDrug(med.name);
    out.push({ ...med, validation: check });
  }
  return out;
}
