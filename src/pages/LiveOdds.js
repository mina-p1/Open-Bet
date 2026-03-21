import React, { useState, useEffect } from 'react';
import OddsTable from '../components/betting/OddsTable';
import Loader from '../components/layout/Loader'; 
import { fetchLiveNBAOdds } from '../api/oddsApi';


const styles = {
  container: {
    margin: "0 auto",
    color: "#fff",
    position: "relative",
  },
  header: {
    marginBottom: "20px",
    maxWidth: "800px",
    marginLeft: "auto",
    marginRight: "auto",
    textAlign: "center",
    
  },
  title: {
    fontSize: "28px",
    fontWeight: "bold",
    marginBottom: "8px",
    color: "#ffffff",    
  },
  subtitle: {
    color: "#aaa",
    fontSize: "14px",
    margin: 0,
  },
};



function LiveOddsPage() {
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLiveNBAOdds()
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setGames(data);
        }
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching games:', error);
        setError(error.message);
        setIsLoading(false);
      });
  }, []);

  const renderContent = () => {
    if (isLoading) return <Loader />;
    if (error)
      return <p className="text-red-500 text-center mt-6">Error: {error}</p>;
    if (games.length === 0)
      return <p className="text-center mt-6">No live NBA games found.</p>;
    return <OddsTable gamesData={games} />;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
      <h1 style={styles.title}>Today's Live Odds</h1>
      <p style={styles.subtitle}>
        This page proves the React-to-Backend connection for real, live data.
      </p>
    </div>

      {renderContent()}
    </div>
  );
}

export default LiveOddsPage;
