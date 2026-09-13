import { useEffect, useState } from "react";
import TitleBar from "./components/TitleBar.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Home from "./pages/Home.jsx";
import Scan from "./pages/Scan.jsx";
import Prescriptions from "./pages/Prescriptions.jsx";
import Symptoms from "./pages/Symptoms.jsx";
import Reminders from "./pages/Reminders.jsx";
import Settings from "./pages/Settings.jsx";
import { api } from "./api.js";

// Root shell: which page is open, backend health, and reminder pings.
export default function App() {
  const [view, setView] = useState("home");
  const [connected, setConnected] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [config, setConfig] = useState(null);

  async function refresh() {
    try {
      const [rx, rem, cfg, health] = await Promise.all([
        api.prescriptions(),
        api.reminders(),
        api.config(),
        api.health(),
      ]);
      setPrescriptions(rx);
      setReminders(rem);
      setConfig(cfg);
      setConnected(Boolean(health.ok));
    } catch {
      setConnected(false);
    }
  }

  useEffect(() => {
    refresh();
    // Check due reminders every 20s and fire a desktop/browser notification.
    const timer = setInterval(async () => {
      try {
        const due = await api.due();
        for (const item of due) {
          const body = `Time for ${item.medicationName}${item.strength ? ` (${item.strength})` : ""}.`;
          if (window.desktop?.notify) {
            window.desktop.notify({ title: "MediScan reminder", body });
          } else if (Notification?.permission === "granted") {
            new Notification("MediScan reminder", { body });
          }
        }
      } catch {
        /* backend may be down */
      }
    }, 20000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="shell">
      <TitleBar />
      <div className="app">
        <Sidebar view={view} onChange={setView} connected={connected} />
        <main className="stage">
          {view === "home" && <Home reminders={reminders} onScan={() => setView("scan")} />}
          {view === "scan" && (
            <Scan
              onSaved={async () => {
                await refresh();
                setView("reminders");
              }}
            />
          )}
          {view === "rx" && (
            <Prescriptions
              items={prescriptions}
              onOpenReminders={async (id) => {
                await api.scheduleFromRx(id);
                await refresh();
                setView("reminders");
              }}
              onDelete={async (id) => {
                await api.deletePrescription(id);
                refresh();
              }}
            />
          )}
          {view === "chat" && <Symptoms />}
          {view === "reminders" && (
            <Reminders
              items={reminders}
              onToggle={async (item) => {
                await api.patchReminder(item.id, { enabled: !item.enabled });
                refresh();
              }}
              onTaken={async (id, taken) => {
                await api.markTaken(id, taken);
                refresh();
              }}
              onAdd={async (body) => {
                await api.addReminder(body);
                refresh();
              }}
              onDelete={async (id) => {
                await api.deleteReminder(id);
                refresh();
              }}
            />
          )}
          {view === "settings" && (
            <Settings
              config={config}
              onSave={async (body) => {
                await api.saveConfig(body);
                refresh();
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
