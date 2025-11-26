import React, { useState, useEffect } from 'react';
import Loader from '../components/Loader';
import { fetchHistoricalGames } from '../api/oddsApi'; 


// format YYYY-MM-DD as MMM DD, YYYY
function prettyDate(dstr) {
  const parts = dstr.split("-");
  if (parts.length !== 3) return dstr;
  // using noon to avoid any timezone weirdness
  const d = new Date(`${parts[0]}-${parts[1]}-${parts[2]}T12:00:00`);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}

function HomePage() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState('');
  const [histGames, setHistGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetchHistoricalGames(selectedDate)
      .then(data => {
        if (data.error) setError(data.error);
        else setHistGames(data);
        setIsLoading(false);
      })
      .catch(error => {
        setError(error.message);
        setIsLoading(false);
      });
  }, [selectedDate]);

  const renderHistoricalTable = () => {
    if (isLoading) return <Loader />;
    if (error) return <p style={{ color: 'red', textAlign: 'center' }}>Error: {error}</p>;
    if (!histGames.length)
      return (
        <div className="text-center text-gray-400 pb-8" style={{ textAlign: "center", color: "#bbb", fontSize: 16 }}>No games found for that date.</div>
      );
    return (
      <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
        <table style={{
          borderCollapse: "collapse", minWidth: 600, background: "#181e2a", color: "#e5e7ef",
          borderRadius: 13, boxShadow: "0 1px 6px #2223"
        }}>
          <thead>
            <tr style={{ backgroundColor: "#21306e", color: "#64befa" }}>
              <th style={{ padding: 10, fontWeight: '700', textAlign: "center" }}>Date</th>
              <th style={{ padding: 10, fontWeight: '700', textAlign: "center" }}>Home</th>
              <th style={{ padding: 10, fontWeight: '700', textAlign: "center" }}>Away</th>
              <th style={{ padding: 10, fontWeight: '700', textAlign: "center" }}>Home Score</th>
              <th style={{ padding: 10, fontWeight: '700', textAlign: "center" }}>Away Score</th>
            </tr>
          </thead>
          <tbody>
            {histGames.map((game, i) => (
              <tr key={game.game_date + game.team_name_home + i} style={{ borderBottom: "1px solid #262f45", textAlign: "center" }}>
                <td style={{ padding: 10 }}>{prettyDate(game.game_date)}</td>
                <td style={{ padding: 10, fontWeight: 600, color: "#8ee7f9" }}>{game.team_name_home}</td>
                <td style={{ padding: 10, fontWeight: 600, color: "#FFC7A1" }}>{game.team_name_away}</td>
                <td style={{ padding: 10, fontWeight: 800 }}>{game.pts_home}</td>
                <td style={{ padding: 10, fontWeight: 800 }}>{game.pts_away}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-10 px-4" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <section className="flex flex-col items-center justify-center py-10" style={{ width: "100%", maxWidth: 960 }}>
        <div className="card w-full max-w-xl bg-base-100 shadow-xl" style={{ margin: "0 auto", textAlign: "center" }}>
          <div className="card-body items-center text-center">
            <h1 className="mt-2 mb-5" style={{
              fontWeight: 900, fontSize: "2rem", color: "#77caff",
            }}>
              Welcome to OpenBet!
            </h1>
            <h2 className="mt-2 mb-5" style={{
              fontWeight: 800, fontSize: "1.55rem", color: "#6ecaff"
            }}>
              Historical Basketball Scores
            </h2>
            <p className="mb-6" style={{ color: "#c5e0f7" }}>
              Discover basketball odds and compare lines. Use the calendar or arrows to view previous days.
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, margin: "16px 0 26px 0" }}>
              <button
                aria-label="Previous day"
                onClick={() => setSelectedDate(selectedDate ? (
                  new Date(new Date(selectedDate).setDate(new Date(selectedDate).getDate() - 1)).toISOString().slice(0, 10)
                ) : todayStr)}
                style={{
                  background: "#21306e", color: "#57bfff", border: "none", fontSize: 32,
                  borderRadius: "50%", width: 42, height: 42, cursor: "pointer"
                }}
              >&larr;</button>
              <input
                type="date"
                value={selectedDate}
                max={todayStr}
                onChange={e => setSelectedDate(e.target.value)}
                className="input input-bordered w-full max-w-xs"
                style={{
                  textAlign: "center", fontSize: 18, borderRadius: 10, border: "1.5px solid #5377bf",
                  background: "#171c2e", color: "#f8faff", boxShadow: "0 0 8px #14235515", padding: "8px 18px"
                }}
              />
              <button
                aria-label="Next day"
                onClick={() => setSelectedDate(selectedDate ? (
                  new Date(new Date(selectedDate).setDate(new Date(selectedDate).getDate() + 1)).toISOString().slice(0, 10)
                ) : todayStr)}
                disabled={selectedDate >= todayStr}
                style={{
                  background: "#21306e", color: "#57bfff", border: "none", fontSize: 32,
                  borderRadius: "50%", width: 42, height: 42, cursor: selectedDate >= todayStr ? "not-allowed" : "pointer",
                  opacity: selectedDate >= todayStr ? 0.5 : 1
                }}
              >&rarr;</button>
            </div>
            <div style={{ textAlign: "center", marginTop: "40px" }}>
              <a href={`/liveodds?date=${selectedDate || todayStr}`} className="btn btn-primary btn-wide" style={{ marginBottom: 20 }}>
                View Live Odds
              </a>
            </div>
          </div>
        </div>
        <div style={{ width: "100%", marginTop: 40 }}>
          {renderHistoricalTable()}
        </div>
      </section>
    </div>
  );
}

export default HomePage;