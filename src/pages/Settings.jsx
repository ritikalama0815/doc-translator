import { useState } from "react";
import DisclaimerBanner from "../components/DisclaimerBanner.jsx";

export default function Settings({ config, onSave }) {
  const [form, setForm] = useState({
    googleVisionKey: "",
    anthropicKey: "",
    openaiKey: "",
    ocrEngine: config?.ocrEngine || "auto",
  });
  const [saved, setSaved] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="page">
      <DisclaimerBanner />
      <h2 className="page-title">settings</h2>
      <div className="card stack">
        <div className="tiny">
          Vision {config?.googleVision ? "on" : "off"} · LLM {config?.llm?.available ? config.llm.provider : "heuristic fallback"}
        </div>
        <div className="form-grid">
          <label className="field">
            <span>OCR engine</span>
            <select value={form.ocrEngine} onChange={(e) => set("ocrEngine", e.target.value)}>
              <option value="auto">Auto (Vision if keyed, else Tesseract)</option>
              <option value="tesseract">Tesseract only</option>
              <option value="google">Google Vision</option>
            </select>
          </label>
          <label className="field">
            <span>Google Vision API key</span>
            <input
              type="password"
              placeholder={config?.googleVision ? "already saved" : "optional"}
              value={form.googleVisionKey}
              onChange={(e) => set("googleVisionKey", e.target.value)}
            />
          </label>
          <label className="field">
            <span>Anthropic key</span>
            <input
              type="password"
              placeholder={config?.anthropic ? "already saved" : "optional"}
              value={form.anthropicKey}
              onChange={(e) => set("anthropicKey", e.target.value)}
            />
          </label>
          <label className="field">
            <span>OpenAI key</span>
            <input
              type="password"
              placeholder={config?.openai ? "already saved" : "optional"}
              value={form.openaiKey}
              onChange={(e) => set("openaiKey", e.target.value)}
            />
          </label>
        </div>
        <div>
          <button
            className="big-action"
            onClick={async () => {
              await onSave(form);
              setSaved(true);
            }}
          >
            save keys on this computer
          </button>
          {saved && <span className="tiny" style={{ marginLeft: 10 }}>saved locally.</span>}
        </div>
      </div>
    </div>
  );
}
