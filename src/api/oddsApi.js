// Historical games from Kaggle SQLite/Flask
export async function fetchHistoricalGames() {
  const resp = await fetch("http://localhost:5050/api/historical-data");
  if (!resp.ok) throw new Error("Could not fetch historical data");
  return resp.json();
}

// Live NBA odds from The Odds API via your Flask backend:
export async function fetchLiveNBAOdds() {
  const resp = await fetch("http://localhost:5050/api/live-nba-odds");
  if (!resp.ok) throw new Error("Could not fetch live NBA odds");
  return resp.json();
}
