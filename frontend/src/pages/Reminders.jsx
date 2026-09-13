import { useState } from "react";
import DisclaimerBanner from "../components/DisclaimerBanner.jsx";

const today = () => new Date().toISOString().slice(0, 10);

// Daily medicine times: add, toggle, mark taken, or delete.
export default function Reminders({ items, onToggle, onTaken, onAdd, onDelete }) {
  const [name, setName] = useState("");
  const [time, setTime] = useState("08:00");
  const day = today();

  return (
    <div className="page">
      <DisclaimerBanner />
      <h2 className="page-title">Reminders</h2>

      <form
        className="card row"
        style={{ marginBottom: 16 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          onAdd({ medicationName: name.trim(), time });
          setName("");
        }}
      >
        <input
          placeholder="Medicine name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 16, padding: "10px 12px" }}
        />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        <button className="big-action">Add reminder</button>
      </form>

      {items.length === 0 ? (
        <div className="empty card">
          <img className="mascot-img" src="/images/mascot.png" alt="Pepema the medicine bottle mascot" width="110" height="110" />
          <p>no reminders set</p>
        </div>
      ) : (
        <div className="reminder-list">
          {items
            .slice()
            .sort((a, b) => a.time.localeCompare(b.time))
            .map((item) => (
              <div className="reminder" key={item.id}>
                <div className="clock">{item.time}</div>
                <div>
                  <b style={{ textTransform: "capitalize" }}>{item.medicationName}</b>
                  <div className="tiny">
                    {item.frequency}
                    {item.strength ? ` · ${item.strength}` : ""}
                    {item.takenOn?.[day] ? " · taken today" : ""}
                  </div>
                </div>
                <div className="reminder-actions">
                  <button className="ghost" onClick={() => onTaken(item.id, !item.takenOn?.[day])}>
                    {item.takenOn?.[day] ? "Undo" : "Taken"}
                  </button>
                  <button className={`toggle ${item.enabled ? "on" : ""}`} onClick={() => onToggle(item)} />
                  <button className="ghost" onClick={() => onDelete(item.id)}>
                    ×
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
