import React, { useEffect, useState } from "react";
import Loader from '../components/layout/Loader';

const MARKET_LABELS = {
  player_points: "Points",
  player_rebounds: "Rebounds",
  player_assists: "Assists",
  player_threes: "3-Pointers",
  player_points_rebounds_assists: "Points + Rebounds + Assists",
};

function formatCommence(timeStr) {
  if (!timeStr) return "";
  const d = new Date(timeStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function PlayerProps() {
  const [propsData, setPropsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGameId, setSelectedGameId] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    // If running locally:
    // const url = "http://127.0.0.1:5050/api/player-props";
    // If using Render:
    // const url = "https://open-bet-capstone.onrender.com/api/player-props";
    const url = "https://open-bet-capstone.onrender.com/api/player-props";

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(typeof data.error === "string" ? data.error : JSON.stringify(data));
        } else {
          setPropsData(data);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  // Group all props by game
  const gamesMap = {};
  propsData.forEach((p) => {
    if (!gamesMap[p.game_id]) {
      gamesMap[p.game_id] = {
        game_id: p.game_id,
        home_team: p.home_team,
        away_team: p.away_team,
        commence_time: p.commence_time,
        props: [],
      };
    }
    gamesMap[p.game_id].props.push(p);
  });
  const games = Object.values(gamesMap);

  const selectedGame =
    selectedGameId && gamesMap[selectedGameId] ? gamesMap[selectedGameId] : null;

  // Helper: split props by team and group by market key
  const groupPropsByMarket = (propsArr, teamName, isHome) => {
    const grouped = {};
    propsArr.forEach((p) => {
      const belongs =
        (isHome && p.home_team === teamName) ||
        (!isHome && p.away_team === teamName);
      if (!belongs) return;

      const key = p.market || "other";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(p);
    });
    return grouped;
  };

  const homeGrouped =
    selectedGame &&
    groupPropsByMarket(selectedGame.props, selectedGame.home_team, true);

  const awayGrouped =
    selectedGame &&
    groupPropsByMarket(selectedGame.props, selectedGame.away_team, false);

  return (
    <div className="container mx-auto py-10 px-4">
      <section className="flex flex-col items-center justify-center mb-8">
        <div
          className="w-full max-w-4xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/80 p-8"
          style={{ boxShadow: "0 18px 40px rgba(0,0,0,0.6)" }}
        >
          <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-2 text-sky-300 tracking-tight">
            NBA Player Props Radar
          </h1>
          <p className="text-center text-slate-300 mb-3">
            Click any game to see player points lines for both teams, organized by category.
          </p>
        </div>
      </section>

      {isLoading && <Loader />}
      {error && (
        <p className="text-center text-red-400 font-medium">Error: {error}</p>
      )}

      {!isLoading && !error && (
        <>
          {games.length === 0 ? (
            <p className="text-center text-slate-400">
              No player props available right now. Try again closer to tip-off.
            </p>
          ) : (
            <section className="max-w-5xl mx-auto">
              {/* 2 columns, infinite rows */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {games.map((g) => (
                  <button
                    key={g.game_id}
                    onClick={() => setSelectedGameId(g.game_id)}
                    className="text-left rounded-2xl bg-slate-900/90 border border-slate-700 shadow-lg px-4 py-3 hover:border-sky-400/80 hover:-translate-y-0.5 transition-all duration-150 cursor-pointer"
                  >
                    <div className="text-xs text-slate-400 mb-1">
                      {formatCommence(g.commence_time)}
                    </div>
                    <div className="text-base font-semibold text-slate-100 mb-1">
                      {g.away_team} @ {g.home_team}
                    </div>
                    <div className="text-xs text-slate-500">
                      {g.props.length} player lines available
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Center modal */}
          {selectedGame && (
            <div
              className="fixed inset-0 z-40 flex items-center justify-center bg-black/70"
              onClick={() => setSelectedGameId(null)}
            >
              <div
                className="relative w-full max-w-5xl bg-slate-950 rounded-2xl border border-slate-700 shadow-2xl p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setSelectedGameId(null)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-white text-xl"
                >
                  ×
                </button>

                {/* Modal header: game info */}
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-slate-400">
                    {formatCommence(selectedGame.commence_time)}
                  </div>
                  <div className="text-sm text-slate-400">
                    Player Props by Category
                  </div>
                </div>

                {/* Team names top left / right */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                  <div>
                    <h2 className="text-lg font-bold text-rose-300 mb-2">
                      {selectedGame.away_team}
                    </h2>
                    {/* Away team props grouped by market */}
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {Object.keys(awayGrouped).length === 0 && (
                        <p className="text-xs text-slate-500">
                          No props available for this team.
                        </p>
                      )}
                      {Object.entries(awayGrouped).map(([marketKey, list]) => (
                        <div
                          key={marketKey}
                          className="border border-slate-700 rounded-lg p-2 bg-slate-900/70"
                        >
                          <div className="text-xs font-semibold text-sky-300 mb-1">
                            {MARKET_LABELS[marketKey] || marketKey}
                          </div>
                          {list.map((p, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs text-slate-200 py-0.5 border-b border-slate-800/70 last:border-b-0"
                            >
                              <span className="font-medium">{p.player}</span>
                              <span className="text-emerald-300 font-semibold">
                                {p.line ?? "-"}
                              </span>
                              <span className="text-slate-400">
                                {p.price > 0 ? `+${p.price}` : p.price}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-emerald-300 mb-2">
                      {selectedGame.home_team}
                    </h2>
                    {/* Home team props grouped by market */}
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {Object.keys(homeGrouped).length === 0 && (
                        <p className="text-xs text-slate-500">
                          No props available for this team.
                        </p>
                      )}
                      {Object.entries(homeGrouped).map(([marketKey, list]) => (
                        <div
                          key={marketKey}
                          className="border border-slate-700 rounded-lg p-2 bg-slate-900/70"
                        >
                          <div className="text-xs font-semibold text-sky-300 mb-1">
                            {MARKET_LABELS[marketKey] || marketKey}
                          </div>
                          {list.map((p, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs text-slate-200 py-0.5 border-b border-slate-800/70 last:border-b-0"
                            >
                              <span className="font-medium">{p.player}</span>
                              <span className="text-emerald-300 font-semibold">
                                {p.line ?? "-"}
                              </span>
                              <span className="text-slate-400">
                                {p.price > 0 ? `+${p.price}` : p.price}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PlayerProps;
