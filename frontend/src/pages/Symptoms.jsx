import { useState } from "react";
import DisclaimerBanner from "../components/DisclaimerBanner.jsx";
import { api } from "../api.js";

const STARTER = {
  role: "assistant",
  content:
    "Hi there, I can talk through everyday symptoms in general terms. If something feels severe (chest pain, trouble breathing, fainting, a scary rash), please get real-world care now.",
};

// General symptom chat. Not a diagnosis — red flags show an urgent banner.
export default function Symptoms() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([STARTER]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const last = messages.at(-1);

  async function send(e) {
    e.preventDefault();
    const message = text.trim();
    if (!message || busy) return;
    setText("");
    setMessages((m) => [...m, { role: "user", content: message }]);
    setBusy(true);
    try {
      const res = await api.chat(sessionId, message);
      setSessionId(res.sessionId);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: res.content,
          urgency: res.urgency,
          seeADoctorIf: res.seeADoctorIf,
          selfCare: res.selfCare,
          redFlags: res.redFlags,
        },
      ]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: err.message }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <DisclaimerBanner />
      <h2 className="page-title">general guidance</h2>
      <div className="chat">
        {last?.urgency === "urgent" && (
          <div className="urgent">this sounds like it needs urgent, please call or text an emergency number.</div>
        )}
        <div className="bubbles">
          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role === "user" ? "me" : "bot"}`}>
              {m.content}
              {m.selfCare?.length ? (
                <ul>
                  {m.selfCare.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              ) : null}
              {m.seeADoctorIf?.length ? (
                <div className="tiny" style={{ marginTop: 8 }}>
                  see a doctor if: {m.seeADoctorIf.join(" ")}
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <form className="composer" onSubmit={send}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. sore throat for two days, no fever…"
          />
          <button className="big-action" disabled={busy}>
            {busy ? "thinking…" : "ask"}
          </button>
        </form>
      </div>
    </div>
  );
}
