import React from 'react';

// Helper function for format 
function formatTimestamp(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function OddsTable({ gamesData }) {

    if (!gamesData || gamesData.length === 0) {
        return <p>No games available.</p>;
    }

    // Helper to get outcome by team name or "Over"/"Under"
    const getOutcome = (outcomes, name) => {
        if (!outcomes || !Array.isArray(outcomes)) return { price: 'N/A', point: '' };
        const outcome = outcomes.find(o => o.name === name);
        return {
            price: outcome ? outcome.price : 'N/A',
            point: outcome ? outcome.point : ''
        };
    };
    
    
    // To format euro odds to American ** dosent work yet
    const formatNum = (num) => {
        if (typeof num === 'number' && num > 0) {
            return `+${num}`;
        }
        return num;
    };


    return (
        <table className="odds-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#1d232aff' }}>
                <tr>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Game</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Time</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Moneyline</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Spread</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Total (O/U)</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#1d232a' }}>Model Predction Value Identifier</th>
                </tr>
            </thead>
            <tbody>
                {gamesData.map(game => {
                    //Moneyline 
                    const homeMoneyline = getOutcome(game.moneyline, game.home_team);
                    const awayMoneyline = getOutcome(game.moneyline, game.away_team);

                    // Spread 
                    const homeSpread = getOutcome(game.spread, game.home_team);
                    const awaySpread = getOutcome(game.spread, game.away_team);

                    //Total 
                    const overTotal = getOutcome(game.total, 'Over');
                    const underTotal = getOutcome(game.total, 'Under');

                    // Value Calculation Logic
                    
                    // Home Team 
                    const homeSpreadPoint = parseFloat(homeSpread.point);
                    const modelHomeSpread = parseFloat(game.model_spread.home_point);
                    let homeValue = 'N/A';
                    let homeValueColor = '#555'; 
                    
                    if (!isNaN(homeSpreadPoint) && !isNaN(modelHomeSpread)) {
                        homeValue = modelHomeSpread - homeSpreadPoint;
                        if (homeValue <= -1.0) homeValueColor = 'green';
                        else if (homeValue >= 1.0) homeValueColor = 'red';
                    }

                    // Away Team 
                    const awaySpreadPoint = parseFloat(awaySpread.point);
                    const modelAwaySpread = parseFloat(game.model_spread.away_point);
                    let awayValue = 'N/A';
                    let awayValueColor = '#555';
                    
                    if (!isNaN(awaySpreadPoint) && !isNaN(modelAwaySpread)) {
                        awayValue = modelAwaySpread - awaySpreadPoint;
                        if (awayValue <= -1.0) awayValueColor = 'green';
                        else if (awayValue >= 1.0) awayValueColor = 'red';
                    }
                    
                  

                    return (
                        <tr key={game.id} style={{ borderBottom: '1px solid #ddd' }}>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                <strong>{game.away_team}</strong> @ <strong>{game.home_team}</strong>
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: '8px', fontSize: '0.9em' }}>
                                {formatTimestamp(game.start_time)}
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                <div>{game.away_team}: {formatNum(awayMoneyline.price)}</div>
                                <div>{game.home_team}: {formatNum(homeMoneyline.price)}</div>
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                <div>{game.away_team}: {formatNum(awaySpread.point)} ({formatNum(awaySpread.price)})</div>
                                <div>{game.home_team}: {formatNum(homeSpread.point)} ({formatNum(homeSpread.price)})</div>
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                <div>Over: {formatNum(overTotal.point)} ({formatNum(overTotal.price)})</div>
                                <div>Under: {formatNum(underTotal.point)} ({formatNum(underTotal.price)})</div>
D"
                            </td>
                            
                            {}
                            <td style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#1d232a', fontSize: '0.9em' }}>
                                
                                {}
                                <div>
                                    {game.away_team}: 
                                    <span style={{ fontWeight: 'bold' }}> Model: {formatNum(modelAwaySpread)}</span>
                                </div>
                                <div>
                                    <span style={{ color: awayValueColor, fontWeight: 'bold' }}>
                                        Val: {awayValue !== 'N/A' ? awayValue.toFixed(1) : 'N/A'}
                                    </span>
                                </div>
                                
                                {}
                                <div style={{marginTop: '8px'}}>
                                    {game.home_team}: 
                                    <span style={{ fontWeight: 'bold' }}> Model: {formatNum(modelHomeSpread)}</span>
                                </div>
                                <div>
                                    <span style={{ color: homeValueColor, fontWeight: 'bold' }}>
                                        Val: {homeValue !== 'N/A' ? homeValue.toFixed(1) : 'N/A'}
                                    </span>
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

export default OddsTable;