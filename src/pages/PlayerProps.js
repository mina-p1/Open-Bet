// PlayerProps shows a list of games and a clean modal for props
// Click a game, then switch tabs to see points, rebounds, assists, etc. for both teams

import React, { useEffect, useMemo, useState } from "react";
import Loader from "../components/layout/Loader";

const MARKET_LABELS = {
  player_points: "Points",
  player_rebounds: "Rebounds",
  player_assists: "Assists",
  player_threes: "3-Pointers",
  player_points_rebounds_assists: "PRA",
};

const MARKET_ORDER = [
  "player_points",
  "player_rebounds",
  "player_assists",
  "player_threes",
  "player_points_rebounds_assists",
];

// nice readable game time
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
  const [activeMarket, setActiveMarket] = useState("player_points");

  // load data once on mount
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const url = "https://open-bet-capstone.onrender.com/api/player-props";

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data?.error) {
          setError(
            typeof data.error === "string" ? data.error : JSON.stringify(data)
          );
        } else {
          setPropsData(Array.isArray(data) ? data : []);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load player props.");
        setIsLoading(false);
      });
  }, []);

  // group props by game id
  const gamesMap = useMemo(() => {
    const map = {};
    propsData.forEach((p) => {
      if (!map[p.game_id]) {
        map[p.game_id] = {
          game_id: p.game_id,
          home_team: p.home_team,
          away_team: p.away_team,
          commence_time: p.commence_time,
          props: [],
        };
      }
      map[p.game_id].props.push(p);
    });
    return map;
  }, [propsData]);

  const games = Object.values(gamesMap);

  const selectedGame =
    selectedGameId && gamesMap[selectedGameId]
      ? gamesMap[selectedGameId]
      : null;

  // when a game opens, default to Points tab
  useEffect(() => {
    if (selectedGameId) {
      setActiveMarket("player_points");
    }
  }, [selectedGameId]);

  // build data for the current tab (market) and game
  const currentMarketData = useMemo(() => {
    if (!selectedGame) return { home: [], away: [] };

    const home = [];
    const away = [];

    selectedGame.props.forEach((p) => {
      if ((p.market || "") !== activeMarket) return;

      const base = {
        id: `${p.player}-${p.market}-${p.line}-${p.price}`,
        player: p.player,
        line: p.line,
        price: p.price,
      };

      if (p.home_team === selectedGame.home_team) {
        home.push(base);
      } else if (p.away_team === selectedGame.away_team) {
        away.push(base);
      }
    });

    home.sort((a, b) => a.player.localeCompare(b.player));
    away.sort((a, b) => a.player.localeCompare(b.player));

    return { home, away };
  }, [selectedGame, activeMarket]);

  const hasAnyMarketForGame = (game) => {
    if (!game) return false;
    return game.props.some((p) => MARKET_ORDER.includes(p.market));
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* hero */}
      <section className="mb-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl rounded-2xl border border-slate-700/80 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 shadow-[0_18px_40px_rgba(0,0,0,0.6)]">
          <h1 className="mb-2 text-center text-3xl font-extrabold tracking-tight text-sky-300 md:text-4xl">
            NBA Player Props Radar
          </h1>
          <p className="text-center text-sm text-slate-300">
            Pick a game, then switch tabs to see player points, rebounds,
            assists, and more for both teams.
          </p>
        </div>
      </section>

      {isLoading && <Loader />}

      {error && !isLoading && (
        <p className="text-center text-sm font-medium text-red-400">
          Error: {error}
        </p>
      )}

      {!isLoading && !error && (
        <>
          {games.length === 0 ? (
            <p className="text-center text-sm text-slate-400">
              No player props available right now. Try again closer to tip-off.
            </p>
          ) : (
            <section className="mx-auto max-w-5xl">
              {/* game cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {games.map((g) => (
                  <button
                    key={g.game_id}
                    type="button"
                    onClick={() => setSelectedGameId(g.game_id)}
                    className="flex flex-col gap-2 rounded-2xl border border-slate-700/80 bg-slate-900/95 px-4 py-3 text-left shadow-lg transition-all duration-150 hover:-translate-y-0.5 hover:border-sky-400/80"
                  >
                    {/* time + line count */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium uppercase tracking-wide text-slate-300">
                        {formatCommence(g.commence_time)}
                      </span>
                      <span className="rounded-full bg-slate-800 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                        {g.props.length} lines
                      </span>
                    </div>

                    {/* away / home */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-semibold text-slate-100">
                          {g.away_team}
                        </span>
                        <span className="rounded-full bg-slate-800 px-2 py-[2px] text-[10px] uppercase tracking-wide text-slate-400">
                          Away
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-semibold text-slate-100">
                          {g.home_team}
                        </span>
                        <span className="rounded-full bg-slate-800 px-2 py-[2px] text-[10px] uppercase tracking-wide text-slate-400">
                          Home
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* modal */}
          {selectedGame && (
            <div
              className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-3"
              onClick={() => setSelectedGameId(null)}
            >
              <div
                className="relative w-full max-w-5xl rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.85)]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* close */}
                <button
                  type="button"
                  onClick={() => setSelectedGameId(null)}
                  className="absolute right-4 top-3 text-xl text-slate-400 transition hover:text-slate-100"
                >
                  ×
                </button>

                {/* header */}
                <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      {formatCommence(selectedGame.commence_time)}
                    </div>
                    <div className="text-sm font-semibold text-slate-100">
                      {selectedGame.away_team} @ {selectedGame.home_team}
                    </div>
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Player Props by Category
                  </div>
                </div>

                {/* market tabs */}
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {MARKET_ORDER.map((marketKey) => (
                    <button
                      key={marketKey}
                      type="button"
                      onClick={() => setActiveMarket(marketKey)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                        activeMarket === marketKey
                          ? "bg-sky-500 text-slate-950 shadow-md"
                          : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                      }`}
                    >
                      {MARKET_LABELS[marketKey]}
                    </button>
                  ))}
                </div>

                {!hasAnyMarketForGame(selectedGame) ? (
                  <p className="text-center text-xs text-slate-500">
                    No props for these stat categories in this game.
                  </p>
                ) : currentMarketData.home.length === 0 &&
                  currentMarketData.away.length === 0 ? (
                  <p className="text-center text-xs text-slate-500">
                    No props for {MARKET_LABELS[activeMarket]} in this game.
                  </p>
                ) : (
                  // two columns: away and home for the active category
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* away side */}
                    <div className="rounded-2xl bg-slate-950/70 p-3 ring-1 ring-slate-800/80">
                      <h2 className="mb-2 text-base font-bold uppercase tracking-wide text-rose-300">
                        {selectedGame.away_team}
                      </h2>
                      <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
                        {currentMarketData.away.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between rounded-lg bg-slate-900/90 px-3 py-1.5 text-[11px] text-slate-200"
                          >
                            <span className="mr-2 flex-1 truncate font-medium">
                              {p.player}
                            </span>
                            <span className="mx-2 text-[12px] font-semibold text-emerald-300">
                              {p.line ?? "-"}
                            </span>
                            <span className="w-12 text-right text-slate-400">
                              {p.price > 0 ? `+${p.price}` : p.price}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* home side */}
                    <div className="rounded-2xl bg-slate-950/70 p-3 ring-1 ring-slate-800/80">
                      <h2 className="mb-2 text-base font-bold uppercase tracking-wide text-emerald-300">
                        {selectedGame.home_team}
                      </h2>
                      <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
                        {currentMarketData.home.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between rounded-lg bg-slate-900/90 px-3 py-1.5 text-[11px] text-slate-200"
                          >
                            <span className="mr-2 flex-1 truncate font-medium">
                              {p.player}
                            </span>
                            <span className="mx-2 text-[12px] font-semibold text-emerald-300">
                              {p.line ?? "-"}
                            </span>
                            <span className="w-12 text-right text-slate-400">
                              {p.price > 0 ? `+${p.price}` : p.price}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PlayerProps;
