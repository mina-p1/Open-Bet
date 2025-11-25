const API_BASE_URL = "https://open-bet-capstone.onrender.com";

// historical games from Kaggle SQLite/Flask
export async function fetchHistoricalGames(date = null) {
  let url = `${API_BASE_URL}/api/historical-data`;
  if (date) url += `?date=${date}`;
  
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("Could not fetch historical data");
  return resp.json();
}

// live nba odds from the Odds API using the Flask backend:
export async function fetchLiveNBAOdds() {
  const resp = await fetch(`${API_BASE_URL}/api/live-nba-odds`);
  if (!resp.ok) throw new Error("Could not fetch live NBA odds");
  return resp.json();
}