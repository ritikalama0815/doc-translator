import DisclaimerBanner from "../components/DisclaimerBanner.jsx";

// Landing page: scan CTA plus today's enabled reminders.
export default function Home({ onScan, reminders }) {
  const today = new Date().toISOString().slice(0, 10);
  // Soonest three reminders that are still on, for a quick glance.
  const upcoming = (reminders || [])
    .filter((r) => r.enabled)
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 3);

  return (
    <div className="page">
      <DisclaimerBanner />
      <h2 className="page-title">i am pepemaster!</h2>
      <p className="lede">
        drop a handwritten prescription on the desk. i will read it and explain it in plain words.
      </p>
      <div className="hero">
        <div className="card mint">
          <img className="mascot-img mascot-lg" src="/images/mascot.png" alt="Pepema the medicine bottle mascot" width="140" height="140" />
          <h3 className="prescription-title">got an unreadable prescription slip?</h3>
          <p className="muted">take a picture of it and send it to me!</p>
          <button className="big-action" onClick={onScan} style={{ marginTop: 12 }}>
            scan a prescription
          </button>
        </div>
        <div className="card butter">
          <div className="tiny">your today's medicine</div>
          {upcoming.length === 0 ? (
            <p>no reminders yet. scan a slip and i'll schedule them for you.</p>
          ) : (
            <div className="stack" style={{ marginTop: 10 }}>
              {upcoming.map((r) => (
                <div key={r.id}>
                  <b>{r.time}</b> · {r.medicationName}
                  {r.takenOn?.[today] ? " · taken" : ""}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
