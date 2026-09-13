import { Icon } from "./Icons.jsx";

// Left-rail destinations. `id` is the App view key.
const NAV = [
  { id: "home", label: "Home", icon: "home" },
  { id: "scan", label: "Scan slip", icon: "scan" },
  { id: "rx", label: "Prescriptions", icon: "rx" },
  { id: "chat", label: "Symptoms", icon: "chat" },
  { id: "reminders", label: "Reminders", icon: "bell" },
  { id: "settings", label: "Settings", icon: "gear" },
];

// Brand column: Pepema, page links, and backend status.
export default function Sidebar({ view, onChange, connected }) {
  return (
    <aside className="sidebar">
      <div className="mascot-wrap">
        <img className="mascot-img" src="/images/mascot.png" alt="Pepema the medicine bottle mascot" width="112" height="112" />
        <div>
          <h1>PEPEMASTER</h1>
          <p>medicinal translator</p>
        </div>
      </div>
      <nav className="nav">
        {NAV.map((item) => (
          <button
            key={item.id}
            className={view === item.id ? "active" : ""}
            onClick={() => onChange(item.id)}
          >
            <Icon name={item.icon} />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="side-foot">
        <span className={`status-dot ${connected ? "" : "off"}`} />{" "}
        {connected ? "awake and ready to help!" : "sleeping zzz"}
        <div style={{ marginTop: 8 }}>always confirm medicines with a pharmacist.</div>
      </div>
    </aside>
  );
}
