// Frameless window chrome. macOS uses native traffic lights; Windows/Linux get fake ones.
export default function TitleBar() {
  const platform = window.desktop?.platform || "darwin";
  const isWin = platform === "win32" || platform === "linux";
  return (
    <header className={`titlebar ${isWin ? "win" : ""}`}>
      <div className="brand">pepemaster(people's prescription master)</div>
      {isWin && (
        <div className="win-controls">
          <button className="min" onClick={() => window.desktop?.windowControl("min")} />
          <button className="max" onClick={() => window.desktop?.windowControl("max")} />
          <button className="cls" onClick={() => window.desktop?.windowControl("close")} />
        </div>
      )}
    </header>
  );
}
