import { useState } from "react";
import DisclaimerBanner from "../components/DisclaimerBanner.jsx";
import { api } from "../api.js";

// Upload or drop a slip photo, then save the read result as reminders.
export default function Scan({ onSaved }) {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState("");

  async function handleFile(file) {
    if (!file) return;
    setError("");
    setBusy(true);
    setPreview(URL.createObjectURL(file));
    try {
      const data = await api.scan(file, "auto");
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Persist the structured slip and jump to the reminder list.
  async function saveAndRemind() {
    if (!result) return;
    setBusy(true);
    try {
      const saved = await api.savePrescription({
        ...result,
        title: (result.medications?.[0]?.name || "Prescription").replace(/\b\w/g, (c) => c.toUpperCase()),
      });
      await api.scheduleFromRx(saved.id);
      onSaved?.(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <DisclaimerBanner />
      <h2 className="page-title">scan a prescription</h2>

      {!result && (
        <div className="stack">
          <label
            className={`drop ${over ? "over" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              handleFile(e.dataTransfer.files?.[0]);
            }}
          >
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <img className="mascot-img mascot-lg" src="/images/mascot.png" alt="Pepema the medicine bottle mascot" width="140" height="140" />
            <h3>{busy ? "Reading the scribbles…" : "drop a prescription picture"}</h3>
            <p className="muted">or click to choose one from your computer</p>
          </label>
          <button
            type="button"
            className="ghost"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const data = await api.scanDemo();
                setResult(data);
              } catch (err) {
                setError(err.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            try a sample
          </button>
        </div>
      )}

      {error && <p className="urgent">{error}</p>}

      {result && (
        <div className="scan-layout">
          <div>
            {preview && <img className="preview" src={preview} alt="Prescription" />}
            <p className="tiny">
              OCR via {result.ocr?.engine}
              {result.ocr?.confidence ? ` · confidence ${Math.round(result.ocr.confidence)}` : ""}
            </p>
            <div className="ocr">{result.ocr?.text || "(no text found)"}</div>
          </div>
          <div className="stack">
            <div className="card lilac">
              <b>in plain words</b>
              <p>{result.explanation?.explanation || result.plainLanguage}</p>
            </div>
            <div className="med-grid">
              {(result.medications || []).map((med, i) => (
                <div className="med" key={`${med.name}-${i}`}>
                  <div>
                    <b style={{ textTransform: "capitalize" }}>{med.name}</b>
                    <div className="tiny">
                      {med.dosage} · {med.frequency}
                      {med.strength ? ` · ${med.strength}` : ""}
                    </div>
                    <div className="row" style={{ marginTop: 8 }}>
                      {(med.times || []).map((t) => (
                        <span className="timechip" key={t}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className={`pill ${med.validation?.matched ? "ok" : "warn"}`}>
                    {med.validation?.matched ? "RxNorm match" : "needs a human look"}
                  </span>
                  {med.validation?.displayName && (
                    <div className="tiny">{med.validation.displayName}</div>
                  )}
                </div>
              ))}
            </div>
            {(result.explanation?.seeADoctorIf || []).length > 0 && (
              <div className="card peach">
                <b>See a doctor if…</b>
                <ul>
                  {result.explanation.seeADoctorIf.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="row">
              <button className="big-action" disabled={busy} onClick={saveAndRemind}>
                save + set reminders
              </button>
              <button
                className="ghost"
                onClick={() => {
                  setResult(null);
                  setPreview("");
                }}
              >
                scan another
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
