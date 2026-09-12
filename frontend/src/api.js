const desktop = window.desktop;
export const API = desktop?.apiBase && !import.meta.env.DEV ? desktop.apiBase : "";

async function parse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wobbly. Try again?");
  return data;
}

export function assetUrl(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API}${url}`;
}

export const api = {
  health: () => fetch(`${API}/api/health`).then(parse),
  config: () => fetch(`${API}/api/config`).then(parse),
  saveConfig: (body) =>
    fetch(`${API}/api/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(parse),
  scan: async (file, engine = "auto") => {
    const form = new FormData();
    form.append("image", file);
    form.append("engine", engine);
    return parse(await fetch(`${API}/api/scan`, { method: "POST", body: form }));
  },
  scanDemo: () => fetch(`${API}/api/scan/demo`, { method: "POST" }).then(parse),
  prescriptions: () => fetch(`${API}/api/prescriptions`).then(parse),
  savePrescription: (body) =>
    fetch(`${API}/api/prescriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(parse),
  deletePrescription: (id) => fetch(`${API}/api/prescriptions/${id}`, { method: "DELETE" }).then(parse),
  scheduleFromRx: (id) =>
    fetch(`${API}/api/prescriptions/${id}/reminders`, { method: "POST" }).then(parse),
  reminders: () => fetch(`${API}/api/reminders`).then(parse),
  addReminder: (body) =>
    fetch(`${API}/api/reminders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(parse),
  patchReminder: (id, body) =>
    fetch(`${API}/api/reminders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(parse),
  markTaken: (id, taken) =>
    fetch(`${API}/api/reminders/${id}/taken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taken }),
    }).then(parse),
  deleteReminder: (id) => fetch(`${API}/api/reminders/${id}`, { method: "DELETE" }).then(parse),
  due: () => fetch(`${API}/api/reminders/due`).then(parse),
  chat: (sessionId, message) =>
    fetch(`${API}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, message }),
    }).then(parse),
};
