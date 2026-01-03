import React from "react";

export default function ArbitrageTable({ odds }) {
  if (!odds.length) {
    return (
      <div className="text-center text-gray-600 p-6">
        No arbitrage opportunities right now.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto shadow rounded-lg mt-6 bg-white">
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th>Event</th>
            <th>Team</th>
            <th>FanDuel</th>
            <th>DraftKings</th>
            <th>Caesars</th>
            <th>Bet365</th>
            <th>Arb Bet @</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {odds.flatMap((row, idx) =>
            row.teams.map((team, teamIdx) => (
              <tr key={`${idx}-${teamIdx}`}>
                {teamIdx === 0 && (
                  <td rowSpan={row.teams.length} className="align-middle">
                    {row.event}
                  </td>
                )}
                <td>{team}</td>
                <td className={row.arbBooks.FanDuel === team ? "bg-green-200 font-bold" : ""}>
                  {row.sportsbooks.FanDuel[team]}
                </td>
                <td className={row.arbBooks.DraftKings === team ? "bg-green-200 font-bold" : ""}>
                  {row.sportsbooks.DraftKings[team]}
                </td>
                <td className={row.arbBooks.Caesars === team ? "bg-green-200 font-bold" : ""}>
                  {row.sportsbooks.Caesars[team]}
                </td>
                <td className={row.arbBooks.Bet365 === team ? "bg-green-200 font-bold" : ""}>
                  {row.sportsbooks.Bet365[team]}
                </td>
                {/* Column to show which book to bet for arbitrage */}
                <td>
                  {Object.keys(row.arbBooks)
                    .filter((book) => row.arbBooks[book] === team)
                    .map((book) => (
                      <span key={book} className="badge badge-accent mr-1">{book}</span>
                    ))}
                </td>
                {teamIdx === 0 && (
                  <td rowSpan={row.teams.length} className="align-middle text-xs text-gray-500">
                    {row.lastUpdated}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
