import DisclaimerBanner from "../components/DisclaimerBanner.jsx";

// Saved slips: each card lists medicines and RxNorm check status.
export default function Prescriptions({ items, onOpenReminders, onDelete }) {
  return (
    <div className="page">
      <DisclaimerBanner />
      <h2 className="page-title">prescription database</h2>
      {items.length === 0 ? (
        <div className="empty card">
          <img className="mascot-img" src="/images/mascot.png" alt="Pepema the medicine bottle mascot" width="110" height="110" />
          <p>the database is empty currently.</p>
        </div>
      ) : (
        <div className="stack">
          {items.map((rx) => (
            <div className="card" key={rx.id}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <b style={{ fontFamily: "Fraunces, serif", fontSize: 22 }}>{rx.title}</b>
                  <div className="tiny">{new Date(rx.createdAt).toLocaleString()}</div>
                </div>
                <div className="row">
                  <button className="ghost" onClick={() => onOpenReminders(rx.id)}>
                    Reminders
                  </button>
                  <button className="ghost" onClick={() => onDelete(rx.id)}>
                    Remove
                  </button>
                </div>
              </div>
              <div className="med-grid" style={{ marginTop: 12 }}>
                {(rx.medications || []).map((med, i) => (
                  <div className="med" key={`${rx.id}-${i}`}>
                    <div>
                      <b style={{ textTransform: "capitalize" }}>{med.name}</b>
                      <div className="tiny">
                        {med.dosage} · {med.frequency}
                      </div>
                    </div>
                    <span className={`pill ${med.validation?.matched ? "ok" : "warn"}`}>
                      {med.validation?.matched ? "checked" : "unverified"}
                    </span>
                  </div>
                ))}
              </div>
              {rx.plainLanguage && <p style={{ marginBottom: 0 }}>{rx.plainLanguage}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
