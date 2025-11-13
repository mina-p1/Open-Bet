
//  fetch  LIVE data from  backend .

import React, { useState, useEffect } from 'react';
import OddsTable from '../components/OddsTable';
import Loader from '../components/Loader';     

function LiveOddsPage() {
    const [games, setGames] = useState([]); // Holds  game data from  API
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Fetch data from our Python backend
        fetch('http://127.0.0.1:5050/api/live-nba-odds')
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    setError(data.error);
                } else {
                    setGames(data); 
                }
                setIsLoading(false); 
            })
            .catch(error => {
                console.error("Error fetching games:", error);
                setError(error.message);
                setIsLoading(false); 
            });
    }, []); 

    const renderContent = () => {
        if (isLoading) {
            return <Loader />;
        }
        if (error) {
            return <p style={{ color: 'red' }}>Error: {error}</p>;
        }
        if (games.length === 0) {
            return <p>No live NBA games found.</p>;
        }
        return <OddsTable gamesData={games} />;
    }

    return (
        <div className="live-odds-container">
            <h2>Today's Live Odds (from FanDuel)</h2>
            <p>This page proves the React-to-Backend connection for real, live data.</p>
            {renderContent()}
        </div>
    );
}

export default LiveOddsPage;