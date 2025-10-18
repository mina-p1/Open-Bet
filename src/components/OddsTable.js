import React from "react";

export default function OddsTable({ odds }) {
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
                    {row.arbitrage && (
                      <span className="badge badge-success badge-xs ml-2">Arb</span>
                    )}
                  </td>
                )}
                <td>{team}</td>
                {/* Highlight spread if this sportsbook matches arbitrage plan */}
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
