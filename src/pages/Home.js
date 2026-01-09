// HomePage shows the hero section and the historical scores table
// You can pick a date and it loads games + model predictions for that day

import React, { useState, useEffect } from "react";
import Loader from "../components/layout/Loader";
import {
  fetchHistoricalGames,
  fetchPredictionHistory,
} from "../api/oddsApi";

// turn "YYYY-MM-DD" into "MMM DD, YYYY" (nice readable date)
function prettyDate(dstr) {
  const parts = dstr.split("-");
  if (parts.length !== 3) return dstr;
  const d = new Date(`${parts[0]}-${parts[1]}-${parts[2]}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function HomePage() {
  const todayStr = new Date().toISOString().slice(0, 10);

  // which date is selected in the calendar
  const [selectedDate, setSelectedDate] = useState("");
  // list of games for that date
  const [histGames, setHistGames] = useState([]);
  // quick lookup map from date + home team => prediction
  const [predictionsMap, setPredictionsMap] = useState({});
  // loading + error state for the whole page
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // helper to move selectedDate by +1 / -1 day
  const shiftDate = (days) => {
    const base = selectedDate || todayStr;
    const dateObj = new Date(base);
    dateObj.setDate(dateObj.getDate() + days);
    return dateObj.toISOString().slice(0, 10);
  };

  // grab games + prediction history whenever the date changes
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    Promise.all([fetchHistoricalGames(selectedDate), fetchPredictionHistory()])
      .then(([gamesData, historyData]) => {
        if (gamesData.error) throw new Error(gamesData.error);
        setHistGames(gamesData || []);

        // build an easy map for predictions so we can look them up per row
        const map = {};
        if (historyData && historyData.games) {
          historyData.games.forEach((p) => {
            const key = `${p.date}_${p.home_team}`;
            map[key] = p;
          });
        }
        setPredictionsMap(map);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Could not load data.");
        setIsLoading(false);
      });
  }, [selectedDate]);

  // render the historical scores + prediction table
  const renderHistoricalTable = () => {
    if (isLoading) return <Loader />;
    if (error)
      return (
        <p className="text-center text-sm font-medium text-red-400">
          Error: {error}
        </p>
      );
    if (!histGames.length)
      return (
        <div className="pb-8 text-center text-sm text-slate-400">
          No games found for that date.
        </div>
      );

    return (
      <div className="mt-6 flex justify-center">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-0 overflow-hidden rounded-xl bg-slate-900 text-slate-100 shadow-md">
            <thead>
              <tr className="bg-sky-950 text-sky-300">
                <th className="px-4 py-3 text-center text-sm font-semibold uppercase tracking-wide">
                  Date
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold uppercase tracking-wide">
                  Home
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold uppercase tracking-wide">
                  Away
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold uppercase tracking-wide">
                  Model Prediction
                </th>
              </tr>
            </thead>
            <tbody>
              {histGames.map((game) => {
                const key = `${game.game_date}_${game.team_name_home}`;
                const pred = predictionsMap[key];

                // real winner from scores
                let actualWinner = null;
                if (
                  typeof game.pts_home === "number" &&
                  typeof game.pts_away === "number"
                ) {
                  if (game.pts_home > game.pts_away) {
                    actualWinner = game.team_name_home;
                  } else if (game.pts_away > game.pts_home) {
                    actualWinner = game.team_name_away;
                  }
                }

                const modelWinner = pred?.predicted_winner || null;
                const gotItRight =
                  actualWinner && modelWinner
                    ? actualWinner === modelWinner
                    : null;

                return (
                  <tr
                    key={key}
                    className="border-b border-slate-800 text-center text-sm last:border-b-0 hover:bg-slate-800/60"
                  >
                    {/* big date pill */}
                    <td className="px-4 py-5 text-slate-200">
                      <span className="inline-flex items-center rounded-full bg-slate-800 px-4 py-2 text-sm font-bold uppercase tracking-wide text-slate-100">
                        {prettyDate(game.game_date)}
                      </span>
                    </td>

                    {/* home team + score stacked */}
                    <td className="px-4 py-5">
                      <div
                        className={`inline-flex flex-col items-center rounded-2xl px-5 py-3 ${
                          actualWinner === game.team_name_home
                            ? "bg-emerald-500/15 ring-2 ring-emerald-500/80 shadow-[0_0_18px_rgba(16,185,129,0.35)]"
                            : "bg-slate-800/90"
                        }`}
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="text-[14px] font-semibold uppercase tracking-wide text-cyan-300">
                            {game.team_name_home}
                          </span>
                          <span className="text-lg font-extrabold text-slate-50">
                            {game.pts_home}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-400">
                          <span>Home</span>
                          {actualWinner === game.team_name_home && (
                            <span className="rounded-full bg-emerald-500/90 px-2 py-[2px] text-[10px] font-bold text-slate-950">
                              Winner
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* away team + score stacked */}
                    <td className="px-4 py-5">
                      <div
                        className={`inline-flex flex-col items-center rounded-2xl px-5 py-3 ${
                          actualWinner === game.team_name_away
                            ? "bg-emerald-500/15 ring-2 ring-emerald-500/80 shadow-[0_0_18px_rgba(16,185,129,0.35)]"
                            : "bg-slate-800/90"
                        }`}
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="text-[14px] font-semibold uppercase tracking-wide text-amber-200">
                            {game.team_name_away}
                          </span>
                          <span className="text-lg font-extrabold text-slate-50">
                            {game.pts_away}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-400">
                          <span>Away</span>
                          {actualWinner === game.team_name_away && (
                            <span className="rounded-full bg-emerald-500/90 px-2 py-[2px] text-[10px] font-bold text-slate-950">
                              Winner
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* prediction column with right/wrong badge */}
                    <td className="px-4 py-5">
                      {pred ? (
                        <div className="flex flex-col items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                              gotItRight === null
                                ? "bg-slate-800 text-slate-300"
                                : gotItRight
                                ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/60"
                                : "bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/60"
                            }`}
                          >
                            {gotItRight === null
                              ? "Model Prediction"
                              : gotItRight
                              ? "Model: Correct"
                              : "Model: Wrong"}
                          </span>
                          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-300">
                            {pred.predicted_winner}
                          </span>
                          <span className="text-[12px] text-slate-300">
                            {Math.round(pred.predicted_away_score)} -{" "}
                            {Math.round(pred.predicted_home_score)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500">
                          No prediction
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const effectiveDate = selectedDate || todayStr;
  const nextDisabled = effectiveDate >= todayStr;

  return (
    <div className="flex flex-col items-center px-4 py-10">
      <section className="flex w-full max-w-5xl flex-col items-center justify-center py-6">
        {/* main card */}
        <div className="mx-auto w-full max-w-xl rounded-2xl bg-slate-900/90 p-8 text-center shadow-xl ring-1 ring-slate-800">
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-sky-300">
            Welcome to OpenBet!
          </h1>
          <h2 className="mb-4 text-xl font-bold tracking-tight text-sky-200">
            Historical Basketball Scores
          </h2>
          <p className="mb-6 text-sm text-slate-200">
            Discover basketball odds and compare lines. Pick a date below to see
            past games and how the model called them.
          </p>

          {/* date picker + arrows (nicer bar) */}
          <div className="mb-8 mt-4 flex items-center justify-center gap-4 rounded-full bg-slate-950/90 px-4 py-3 ring-1 ring-slate-800 shadow-md">
            {/* previous day button */}
            <button
              type="button"
              aria-label="Previous day"
              onClick={() => setSelectedDate(shiftDate(-1))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-900 text-lg text-sky-300 transition hover:bg-sky-800 hover:text-sky-100"
            >
              &larr;
            </button>

            {/* date input */}
            <input
              type="date"
              value={selectedDate}
              max={todayStr}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full max-w-md rounded-xl border border-sky-500/80 bg-slate-950 px-4 py-2.5 text-center text-base font-semibold text-slate-50 shadow-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/60"
            />

            {/* next day button */}
            <button
              type="button"
              aria-label="Next day"
              onClick={() => setSelectedDate(shiftDate(1))}
              disabled={nextDisabled}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-lg transition
                ${
                  nextDisabled
                    ? "cursor-not-allowed bg-slate-800 text-slate-500 opacity-60"
                    : "bg-sky-900 text-sky-300 hover:bg-sky-800 hover:text-sky-100"
                }`}
            >
              &rarr;
            </button>
          </div>

          {/* link to live odds for the same date */}
          <div className="mt-6">
            <a
              href={`/liveodds?date=${effectiveDate}`}
              className="inline-flex w-full max-w-xs items-center justify-center rounded-full bg-sky-500 px-6 py-2 text-sm font-semibold text-slate-950 shadow-md transition hover:bg-sky-400"
            >
              View Live Odds
            </a>
          </div>
        </div>

        {/* historical table */}
        <div className="mt-10 w-full">{renderHistoricalTable()}</div>
      </section>
    </div>
  );
}

export default HomePage;
