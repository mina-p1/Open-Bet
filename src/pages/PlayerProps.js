import React, { useEffect, useState } from "react";
import Loader from "../components/Loader";

const marketLabels = {
  player_points: "Points",
  player_rebounds: "Rebounds",
  player_assists: "Assists",
  player_threes: "3-Pointers",
  player_points_rebounds_assists: "P + R + A",
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
  const [selectedMarket, setSelectedMarket] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setIsLoading(true);
    fetch("http://127.0.0.1:5050/api/player-props")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
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

  const filtered = propsData.filter((p) => {
    if (selectedMarket !== "all" && p.market !== selectedMarket) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        (p.player || "").toLowerCase().includes(s) ||
        (p.home_team || "").toLowerCase().includes(s) ||
        (p.away_team || "").toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div className="container mx-auto py-10 px-4">
      <section className="flex flex-col items-center justify-center mb-10">
        <div
          className="w-full max-w-4xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/80 p-8"
          style={{ boxShadow: "0 18px 40px rgba(0,0,0,0.6)" }}
        >
          <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-2 text-sky-300 tracking-tight">
            NBA Player Props Radar
          </h1>
          <p className="text-center text-slate-300 mb-6">
            Live player lines across books. Filter by market and name to spot edges.
          </p>

          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            <div className="flex gap-2 flex-wrap">
              <button
                className={`px-3 py-1.5 rounded-full text-sm border ${
                  selectedMarket === "all"
                    ? "bg-sky-500 text-white border-sky-400"
                    : "bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700"
                }`}
                onClick={() => setSelectedMarket("all")}
              >
                All Markets
              </button>
              {Object.entries(marketLabels).map(([key, label]) => (
                <button
                  key={key}
                  className={`px-3 py-1.5 rounded-full text-sm border ${
                    selectedMarket === key
                      ? "bg-sky-500 text-white border-sky-400"
                      : "bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700"
                  }`}
                  onClick={() => setSelectedMarket(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Search player or team..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input input-bordered w-full md:w-64 bg-slate-900 border-slate-600 text-slate-100"
            />
          </div>
        </div>
      </section>

      {isLoading && <Loader />}
      {error && (
        <p className="text-center text-red-400 font-medium">Error: {error}</p>
      )}

      {!isLoading && !error && (
        <section className="max-w-6xl mx-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-slate-400">
              No player props available right now. Try again closer to tip-off.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p, idx) => (
                <div
                  key={`${p.game_id}-${p.player}-${p.market}-${idx}`}
                  className="rounded-2xl bg-slate-900/90 border border-slate-700 shadow-lg p-4 flex flex-col justify-between hover:border-sky-400/80 hover:-translate-y-0.5 transition-all duration-150"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs uppercase tracking-wide text-slate-400">
                      {p.bookmaker}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatCommence(p.commence_time)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mb-1">
                    {p.away_team} @ {p.home_team}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-1">
                    {p.player}
                  </h3>
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-slate-800 text-sky-300 border border-sky-500/40">
                      {marketLabels[p.market] || p.market}
                    </span>
                    <span className="text-sm font-semibold text-emerald-300">
                      Line: {p.line ?? "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      Odds:{" "}
                      <span className="font-semibold text-slate-100">
                        {p.price > 0 ? `+${p.price}` : p.price}
                      </span>
                    </span>
                    {/* Placeholder badge for model result later */}
                    {p.openbet_flag && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-900/60 text-rose-200 border border-rose-500/50">
                        {p.openbet_flag}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default PlayerProps;
