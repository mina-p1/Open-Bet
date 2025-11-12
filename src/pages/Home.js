

import React, { useState, useEffect } from 'react';
import Loader from '../components/Loader'; 

function HomePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  const [histGames, setHistGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // This useEffect fetches the historical data when the page loads
  useEffect(() => {
   
    fetch('http://127.0.0.1:5000/api/historical-data')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                setError(data.error); // Show error from backend
            } else {
                setHistGames(data); 
            }
            setIsLoading(false);
        })
        .catch(error => {
            console.error("Error fetching historical data:", error);
            setError(error.message);
            setIsLoading(false);
        });
  }, []); 

  // This function renders the  table 
  const renderHistoricalTable = () => {
    if (isLoading) return <Loader />;
    if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
    
    return (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
            <thead>
                <tr>
                    <th style={{ border: '1px solid black', padding: '8px' }}>Game ID</th>
                    <th style={{ border: '1px solid black', padding: '8px' }}>Date</th>
                    <th style={{ border: '1px solid black', padding: '8px' }}>Home Team</th>
                    <th style={{ border: '1px solid black', padding: '8px' }}>Away Team</th>
                    <th style={{ border: '1px solid black', padding: '8px' }}>Home Score</th>
                    <th style={{ border: '1px solid black', padding: '8px' }}>Away Score</th>
                    <th style={{ border: '1px solid black', padding: '8px' }}>Season</th>
                </tr>
            </thead>
            <tbody>
                {histGames.map(game => (
                    
                    <tr key={game.game_id}> 
                        <td style={{ border: '1px solid black', padding: '8px' }}>{game.game_id}</td>
                        <td style={{ border: '1px solid black', padding: '8px' }}>{game.game_date}</td>
                        <td style={{ border: '1px solid black', padding: '8px' }}>{game.team_name_home}</td>
                        <td style={{ border: '1px solid black', padding: '8px' }}>{game.team_name_away}</td>
                        <td style={{ border: '1px solid black', padding: '8px' }}>{game.pts_home}</td>
                        {}
                        <td style={{ border: '1px solid black', padding: '8px' }}>{game.pts_away}</td>
                        <td style={{ border: '1px solid black', padding: '8px' }}>{game.season_id}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
  };

  return (
   
    <div className="container mx-auto py-10 px-4">
      
      {}
      <section className="flex flex-col items-center justify-center py-16">
        <div className="card w-full max-w-xl bg-base-100 shadow-xl">
          <div className="card-body items-center text-center">
            <h1 className="card-title text-4xl text-primary mb-4">Welcome to OpenBet!</h1>
            <p className="mb-6">
              Discover basketball odds and compare lines. Select a date below to view the games and line values.
            </p>
            {}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input input-bordered w-full max-w-xs mb-4"
            />
            
            {}
            <a
              href={`/liveodds?date=${selectedDate}`}
              className="btn btn-primary btn-wide"
            >
              View Odds
            </a>
          </div>
        </div>
      </section>

      {}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-center mb-4">PSPI Proof: Historical Data (2022-23)</h2>
        {}
        {renderHistoricalTable()}
      </section>

    </div>
  );
}

export default HomePage;