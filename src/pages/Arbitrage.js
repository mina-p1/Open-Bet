import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Loader from '../components/layout/Loader';


function formatTimestamp(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
  });
}

// LOGIC IS NOT RIGHT, WORK ON IT!!!!

function formatOdds(num) {
  if (num === undefined || num === null || num === "-") return "-";
  const n = Number(num);
  if (isNaN(n)) return num;
  return n > 0 ? `+${n}` : `${n}`;
}

// helper to compute $10 payout for a single line
function payout10(odds) {
  const n = Number(odds);
  if (isNaN(n)) return null;
  let win;
  if (n > 0) {
    win = (10 * n) / 100;
  } else {
    win = (10 * 100) / Math.abs(n);
  }
  return 10 + win; // stake + win
}

function ArbCard({ arb }) {
  const awayOdds = formatOdds(arb.away_price);
  const homeOdds = formatOdds(arb.home_price);

  // Backend stakes/profit are based on a 100‑unit bankroll (total risk = 100).
  // For the UI example, scale that down so risk is $20 ($10 on each side).
  const totalRiskBackend = arb.bankroll; // should be 100
  const targetRisk = 20; // $10 + $10
  const scale = targetRisk / totalRiskBackend;

  const profitExample = arb.guaranteed_profit * scale;
  const payoutExample = targetRisk + profitExample;

  const awayPayout10 = payout10(arb.away_price);
  const homePayout10 = payout10(arb.home_price);

  return (
    <div
      style={{
        background: "#23293a",
        borderRadius: 18,
        color: "#fff",
        padding: "1.3em 1.2em 1.45em 1.2em",
        minWidth: 450,
        maxWidth: 450,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 2px 16px #1d23366c",
        border: "2px solid #22c55e88",
      }}
    >
      {/* Matchup header */}
      <div
        style={{
          fontWeight: 800,
          fontSize: "1.16em",
          marginBottom: 6,
          color: "#7EC6F7",
          textAlign: "left",
        }}
      >
        {arb.away_team} @ {arb.home_team}
      </div>
      <div
        style={{
          marginBottom: 11,
          color: "#bbc8d3",
          fontSize: "1em",
        }}
      >
        Tip-off: {formatTimestamp(arb.commence_time)}
      </div>

      {/* Away row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.7fr 1fr 1fr",
          alignItems: "center",
          gap: 12,
          marginBottom: 9,
          minHeight: 67,
        }}
      >
        <span
          style={{
            fontWeight: 700,
            color: "#60c0fc",
            fontSize: "1.16em",
            textAlign: "left",
            paddingLeft: 7,
          }}
        >
          {arb.away_team}
        </span>
        <div />
        <div
          style={{
            width: 98,
            height: 80,
            background: "#070a0fff",
            border: "2px solid #234283",
            borderRadius: 11,
            textAlign: "center",
            boxSizing: "border-box",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontWeight: 650,
              color: "#60c0fd",
              fontSize: 15,
              marginBottom: 1,
              lineHeight: 1.1,
            }}
          >
            Moneyline
          </span>
          <span
            style={{
              fontWeight: 900,
              fontSize: 24,
              color: "#fff",
              lineHeight: 1.13,
            }}
          >
            {awayOdds}
          </span>
          <span
            style={{
              fontWeight: 900,
              fontSize: 13,
              color: "#3CB4FF",
              marginTop: 3,
              lineHeight: 1,
            }}
          >
            {arb.away_book}
          </span>
        </div>
      </div>

      {/* Home row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.7fr 1fr 1fr",
          alignItems: "center",
          gap: 12,
          marginBottom: 9,
          minHeight: 67,
        }}
      >
        <span
          style={{
            fontWeight: 700,
            color: "#FF8B64",
            fontSize: "1.16em",
            textAlign: "left",
            paddingLeft: 7,
          }}
        >
          {arb.home_team}
        </span>
        <div />
        <div
          style={{
            width: 98,
            height: 80,
            background: "#070a0fff",
            border: "2px solid #234283",
            borderRadius: 11,
            textAlign: "center",
            boxSizing: "border-box",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontWeight: 650,
              color: "#60c0fd",
              fontSize: 15,
              marginBottom: 1,
              lineHeight: 1.1,
            }}
          >
            Moneyline
          </span>
          <span
            style={{
              fontWeight: 900,
              fontSize: 24,
              color: "#fff",
              lineHeight: 1.13,
            }}
          >
            {homeOdds}
          </span>
          <span
            style={{
              fontWeight: 900,
              fontSize: 13,
              color: "#3CB4FF",
              marginTop: 3,
              lineHeight: 1,
            }}
          >
            {arb.home_book}
          </span>
        </div>
      </div>

      {/* Bottom summary bar */}
      <div
        style={{
          marginTop: 8,
          padding: "10px 12px",
          background: "#151e34",
          borderRadius: 11,
          border: "1px solid #22c55e88",
          fontSize: 13,
          color: "#e5e7eb",
        }}
      >
        
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 4,
          }}
        >
          <span>Edge</span>
          <span style={{ color: "#4ade80", fontWeight: 700 }}>
            +{arb.guaranteed_profit_pct.toFixed(2)}%
          </span>
        </div>
        

        {/* $10 on each team explanation */}
        <div
          style={{
            marginTop: 6,
            paddingTop: 6,
            borderTop: "1px solid #1f2937",
            fontSize: 12,
            color: "#9ca3af",
          }}
        >
          If you bet <strong>$10 on {arb.away_team}</strong> at this line, you
          would get back{" "}
          {awayPayout10 ? (
            <span style={{ color: "#e5e7eb", fontWeight: 600 }}>
              ${awayPayout10.toFixed(2)}
            </span>
          ) : (
            "—"
          )}{" "}
          if they win.
          <br />
          If you bet <strong>$10 on {arb.home_team}</strong> at this line, you
          would get back{" "}
          {homePayout10 ? (
            <span style={{ color: "#e5e7eb", fontWeight: 600 }}>
              ${homePayout10.toFixed(2)}
            </span>
          ) : (
            "—"
          )}{" "}
          if they win.
          <br />
          The green numbers above show how to size both bets together so, when
          you place them at the same time, you lock in profit no matter who
          wins.
        </div>
      </div>
    </div>
  );
}

function Arbitrage() {
  const [arbs, setArbs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const url = "https://open-bet-capstone.onrender.com/api/arbitrage";
    // For Render: const url = "https://open-bet-capstone.onrender.com/api/arbitrage";

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
      {/* Centered big title */}
      <div
        style={{
          maxWidth: 1340,
          margin: "0 auto 24px",
          color: "#fff",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: "1.9rem",
            marginBottom: 6,
          }}
        >
          NBA Arbitrage Scanner
        </div>
        <div
          style={{
            color: "#9ca3af",
            fontSize: 14,
            maxWidth: 620,
            margin: "0 auto",
          }}
        >
          Arbitrage means you split your money between both teams at different
          sportsbooks so you can&apos;t lose overall. We show where the math
          works in your favor.
        </div>
      </div>

      {isLoading && <Loader />}
      {error && (
        <div
          style={{
            color: "#f87171",
            textAlign: "center",
            marginTop: 20,
            fontWeight: 600,
          }}
        >
          Error: {error}
        </div>
      )}

      {!isLoading && !error && (
        <>
          {arbs.length === 0 ? (
            <div
              style={{
                color: "#99aacc",
                textAlign: "center",
                margin: "36px 0",
                fontSize: "1.1em",
              }}
            >
              No arbitrage opportunities right now.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "32px 38px",
                margin: "36px auto",
                maxWidth: 1340,
                width: "100%",
                justifyItems: "center",
                padding: "0 1vw",
              }}
            >
              {arbs.map((arb, idx) => (
                <ArbCard key={arb.game_id || idx} arb={arb} />
              ))}
            </div>
          )}

          {/* Simple explanation link */}
          <div
            style={{
              maxWidth: 1340,
              margin: "32px auto 0",
              textAlign: "center",
              fontSize: 13,
              color: "#9ca3af",
            }}
          >
            Want all the terms in everyday language (moneyline, edge,
            arbitrage)?{" "}
            <Link
              to="/about"
              style={{ color: "#38bdf8", textDecoration: "underline" }}
            >
              Open the About page for an explanation on Arbitrage
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default Arbitrage;
