import React, { useState } from "react";
// Assuming react-router-dom is used, but replacing Link with <a> to avoid context errors in isolation.
// import { Link } from "react-router-dom"; 

function OddsTable({ odds }) {

  // Helper function to find the best available odds for a team in a given game.
  const findBestOddsForGame = (game) => {
    const teams = game.teams;
    const modelPrediction = game.modelPrediction;
    const sportsbooksData = game.sportsbooks;

    const bestOddsResult = {};

    teams.forEach(team => {
        let bestOdd = -Infinity;
        let bestBook = null;

        // Iterate through all sportsbooks to find the most favorable line for the team.
        // For spreads, a higher number is always better (e.g., -2.5 > -3.5, and +3.5 > +2.5).
        for (const book in sportsbooksData) {
            const currentOdd = parseFloat(sportsbooksData[book][team]);
            if (currentOdd > bestOdd) {
                bestOdd = currentOdd;
                bestBook = book;
            }
        }

        const modelOdd = modelPrediction[team];
        const value = Math.abs(modelOdd - bestOdd);
        const isGoodValue = value >= 1.0;

        bestOddsResult[team] = {
            bestOdd: bestOdd,
            bestBook: bestBook,
            value: value,
            isGoodValue: isGoodValue
        };
    });

    return bestOddsResult;
  };

  return (
    <>
    <style>{`
      .has-tooltip:hover .tooltip {
        display: inline;
      }
      .tooltip {
        display: none;
        position: absolute;
        z-index: 10;
        white-space: nowrap;
      }
    `}</style>
    <div className="overflow-x-auto rounded-lg shadow-lg">
      <table className="table w-full text-center">
        {/* Table Head */}
        <thead className="bg-base-200">
          <tr>
            <th className="text-left">Game / Teams</th>
            <th className="text-red-500 font-bold">Our Model</th>
            <th>Line Values</th>
          </tr>
        </thead>
        <tbody>
          {odds.map((game, index) => {
            const bestOddsData = findBestOddsForGame(game);
            return (
              <tr key={index} className="hover">
                {/* Event and Teams */}
                <td className="text-left">
                  <div className="font-bold">{game.event}</div>
                  <div className="text-sm opacity-60">{game.market}</div>
                </td>
                
                {/* Our Model Predictions */}
                <td>
                  <div>{game.teams[0]}: <strong>{game.modelPrediction[game.teams[0]].toFixed(1)}</strong></div>
                  <div>{game.teams[1]}: <strong>{game.modelPrediction[game.teams[1]].toFixed(1)}</strong></div>
                </td>

                {/* Line Values Column */}
                <td>
                  <div>
                    {game.teams[0]}: <strong>{bestOddsData[game.teams[0]].bestOdd.toFixed(1)}</strong> ({bestOddsData[game.teams[0]].bestBook})
                    <br />
                    <span className={`text-sm font-semibold ${bestOddsData[game.teams[0]].isGoodValue ? 'text-green-500' : 'text-red-500'}`}>
                      {bestOddsData[game.teams[0]].isGoodValue ? 'Good Value' : 'Bad Value'}: {bestOddsData[game.teams[0]].value.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-2">
                    {game.teams[1]}: <strong>{bestOddsData[game.teams[1]].bestOdd.toFixed(1)}</strong> ({bestOddsData[game.teams[1]].bestBook})
                    <br />
                    <span className={`text-sm font-semibold ${bestOddsData[game.teams[1]].isGoodValue ? 'text-green-500' : 'text-red-500'}`}>
                      {bestOddsData[game.teams[1]].isGoodValue ? 'Good Value' : 'Bad Value'}: {bestOddsData[game.teams[1]].value.toFixed(1)}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </>
  );
}

// Sample data adjusted to show a mix of good and bad value from a single sportsbook.
const initialOdds = [
  {
    event: "Los Angeles Lakers vs Toronto Raptors",
    market: "Spread",
    teams: ["Lakers", "Raptors"],
    modelPrediction: { Lakers: -2.1, Raptors: +6.0 }, 
    sportsbooks: {
      DraftKings: { Lakers: -3.0, Raptors: +3.0 },
    },
    lastUpdated: "1m ago",
  },
  {
    event: "Boston Celtics vs Chicago Bulls",
    market: "Spread",
    teams: ["Celtics", "Bulls"],
    modelPrediction: { Celtics: -6.5, Bulls: +4.8 },
    sportsbooks: {
      DraftKings: { Celtics: -4.0, Bulls: +4.0 },
    },
    lastUpdated: "7m ago",
  },
  {
    event: "Golden State Warriors vs Denver Nuggets",
    market: "Spread",
    teams: ["Warriors", "Nuggets"],
    modelPrediction: { Warriors: +4.5, Nuggets: -1.0 },
    sportsbooks: {
        DraftKings: { Warriors: +2.0, Nuggets: -2.0 },
    },
    lastUpdated: "12m ago",
  },
];

export default function LiveOdds() {
  const [odds, setOdds] = useState(initialOdds);

  return (
    <div className="container mx-auto py-10 px-4">
      <h2 className="text-3xl font-bold text-primary mb-2 text-center">Our Model vs. Sportsbook Lines</h2>
      <p className="text-center text-gray-500 mb-8">Live odds comparison to identify betting value.</p>
      <OddsTable odds={odds} />
      <div className="flex justify-center mt-8">
        <a href="/about" className="btn btn-secondary btn-wide">
          About Our Model
        </a>
      </div>
    </div>
  );
}

