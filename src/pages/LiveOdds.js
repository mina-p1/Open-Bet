// src/pages/LiveOdds.js
import React, { useState } from "react";
import OddsTable from "../components/OddsTable";
import { Link } from "react-router-dom";

// All odds live here for now; eventually will move to API call/useEffect
const initialOdds = [
  {
    event: "Lakers vs Raptors",
    market: "Spread",
    teams: ["Lakers", "Raptors"],
    // Each sportsbook lists both teams' spreads
    sportsbooks: {
      FanDuel: { Lakers: "-2.5", Raptors: "+2.5" },
      DraftKings: { Lakers: "-3.0", Raptors: "+3.0" },
      Caesars: { Lakers: "-2.0", Raptors: "+2.0" },
      Bet365: { Lakers: "-2.5", Raptors: "+2.5" },
    },
    lastUpdated: "1m ago",
    arbitrage: true, // for testing arbitrage highlighting
    arbBooks: { // sportsbook: team you should bet
      DraftKings: "Lakers",
      Caesars: "Raptors"
    }
  },
  {
    event: "Celtics vs Bulls",
    market: "Spread",
    teams: ["Celtics", "Bulls"],
    sportsbooks: {
      FanDuel: { Celtics: "-4.5", Bulls: "+4.5" },
      DraftKings: { Celtics: "-4.0", Bulls: "+4.0" },
      Caesars: { Celtics: "-5.0", Bulls: "+5.0" },
      Bet365: { Celtics: "-4.5", Bulls: "+4.5" }
    },
    lastUpdated: "7m ago",
    arbitrage: false,
    arbBooks: {}
  },
  // ... add more as needed ...
];

export default function LiveOdds() {
  const [odds, setOdds] = useState(initialOdds);

  return (
    <div className="container mx-auto py-10">
      <h2 className="text-3xl font-bold text-blue-600 mb-8 text-center">All Basketball Games & Lines</h2>
      <OddsTable odds={odds} />
      <div className="flex justify-center mt-8">
        <Link to="/about" className="btn btn-secondary btn-wide">
          Learn About Odds & Arbitrage
        </Link>
      </div>
    </div>
  );
}
