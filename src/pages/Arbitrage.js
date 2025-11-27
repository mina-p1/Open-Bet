import React, { useEffect, useState } from "react";
import Loader from "../components/Loader";

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

function Arbitrage() {
  const [arbs, setArbs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    // Local backend:
    // const url = "http://127.0.0.1:5050/api/arbitrage";
    // Render backend:
    // const url = "https://open-bet-capstone.onrender.com/api/arbitrage";
    const url = "http://127.0.0.1:5050/api/arbitrage";

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(typeof data.error === "string" ? data.error : JSON.stringify(data));
        } else {
          setArbs(data);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="container mx-auto py-10 px-4">
      <section className="flex flex-col items-center justify-center mb-8">
        <div
          className="w-full max-w-4xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/80 p-8"
          style={{ boxShadow: "0 18px 40px rgba(0,0,0,0.6)" }}
        >
          <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-2 text-sky-300 tracking-tight">
            NBA Arbitrage Scanner
          </h1>
          <p className="text-center text-slate-300 mb-1">
            Scans live NBA moneylines from multiple bookmakers and flags sure-bet
            opportunities where the implied probabilities add to less than 100%.
          </p>
          <p className="text-center text-xs text-slate-500">
            Stakes shown assume a 100-unit bankroll for illustration only.
          </p>
        </div>
      </section>

      {isLoading && <Loader />}

      {error && (
        <p className="text-center text-red-400 font-medium">Error: {error}</p>
      )}

      {!isLoading && !error && (
        <>
          {arbs.length === 0 ? (
            <p className="text-center text-slate-400">
              No arbitrage opportunities detected right now. Try again closer to
              game time.
            </p>
          ) : (
            <section className="max-w-5xl mx-auto">
              <div className="grid gap-4 md:grid-cols-2">
                {arbs.map((arb, idx) => (
                  <div
                    key={arb.game_id + idx}
                    className="rounded-2xl bg-slate-900/90 border border-emerald-500/60 shadow-lg p-4 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-400">
                        {formatCommence(arb.commence_time)}
                      </span>
                      <span className="text-xs font-semibold text-emerald-300">
                        +{arb.guaranteed_profit_pct.toFixed(2)}% edge
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-slate-100 mb-2">
                      {arb.away_team} @ {arb.home_team}
                    </div>

                    <div className="text-xs text-slate-300 mb-2">
                      Total implied probability:{" "}
                      <span className="font-semibold">
                        {arb.total_implied_prob.toFixed(2)}%
                      </span>
                    </div>

                    <div className="border border-slate-700 rounded-lg p-2 mb-2 text-xs text-slate-200">
                      <div className="flex justify-between mb-1">
                        <span>{arb.away_team}</span>
                        <span>
                          {arb.away_price > 0 ? `+${arb.away_price}` : arb.away_price} @{" "}
                          <span className="font-semibold">{arb.away_book}</span>
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{arb.home_team}</span>
                        <span>
                          {arb.home_price > 0 ? `+${arb.home_price}` : arb.home_price} @{" "}
                          <span className="font-semibold">{arb.home_book}</span>
                        </span>
                      </div>
                    </div>

                    <div className="border border-emerald-600/70 rounded-lg p-2 text-xs text-slate-200 bg-emerald-900/10">
                      <div className="flex justify-between mb-1">
                        <span>Stake on {arb.away_team}</span>
                        <span className="font-semibold text-emerald-300">
                          {arb.stake_away.toFixed(2)} units
                        </span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span>Stake on {arb.home_team}</span>
                        <span className="font-semibold text-emerald-300">
                          {arb.stake_home.toFixed(2)} units
                        </span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>Guaranteed profit (on 100u bankroll)</span>
                        <span className="font-semibold text-emerald-400">
                          {arb.guaranteed_profit.toFixed(2)}u (
                          {arb.guaranteed_profit_pct.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default Arbitrage;
