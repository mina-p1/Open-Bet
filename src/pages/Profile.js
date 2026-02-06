import React, { useState, useEffect } from 'react';

// big list of teams for the dropdown
const NBA_TEAMS = [
  "Atlanta Hawks", "Boston Celtics", "Brooklyn Nets", "Charlotte Hornets", "Chicago Bulls",
  "Cleveland Cavaliers", "Dallas Mavericks", "Denver Nuggets", "Detroit Pistons", 
  "Golden State Warriors", "Houston Rockets", "Indiana Pacers", "LA Clippers", "Los Angeles Lakers",
  "Memphis Grizzlies", "Miami Heat", "Milwaukee Bucks", "Minnesota Timberwolves", 
  "New Orleans Pelicans", "New York Knicks", "Oklahoma City Thunder", "Orlando Magic", 
  "Philadelphia 76ers", "Phoenix Suns", "Portland Trail Blazers", "Sacramento Kings", 
  "San Antonio Spurs", "Toronto Raptors", "Utah Jazz", "Washington Wizards"
];

const Profile = ({ user, setUser }) => {
  // state stuff for the inputs
  const [favoriteTeam, setFavoriteTeam] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  // fill in the form when page loads so its not empty
  useEffect(() => {
    if (user) {
      setFavoriteTeam(user.favoriteTeam || "");
      // if no custom name, just use the google name
      setDisplayName(user.displayName || user.name || "");
    }
  }, [user]);

  // send changes to python backend
  const handleSave = async () => {
    if (!user) return; 
    
    setIsSaving(true);
    setMessage(""); 

    try {
      // make sure port is 5050 to match app.py!!
      const response = await fetch('https://open-bet-capstone.onrender.com/api/user/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          favoriteTeam: favoriteTeam,
          displayName: displayName
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("saved!");
        // update app state so header fixes itself instantly
        setUser(data.user);
      } else {
        setMessage("error saving.. try again");
      }
    } catch (error) {
      console.log(error); 
      setMessage("network err. is backend running?");
    }
    
    setIsSaving(false); 
  };

  // if not logged in just show msg
  if (!user) {
    return <div style={{ padding: '20px', color: 'white' }}>Log in to see profile</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', color: 'white' }}>
      <h1>My Profile</h1>
      
      {/* the user card thing */}
      <div style={{ marginBottom: '20px', border: '1px solid #333', padding: '10px', background: '#1e293b' }}>
        <img 
          src={user.picture} 
          alt="pfp" 
          style={{ width: '50px', borderRadius: '50%', marginRight: '10px' }} 
        />
        <strong>{user.name}</strong> <br/>
        <small style={{ color: '#aaa' }}>{user.email}</small>
      </div>

      {/* actual form inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        <div>
          <label>Display Name:</label> <br/>
          <input 
            type="text" 
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={{ padding: '5px', width: '100%', color: 'black' }}
          />
        </div>

        <div>
          <label>Favorite Team:</label> <br/>
          <select 
            value={favoriteTeam}
            onChange={(e) => setFavoriteTeam(e.target.value)}
            style={{ padding: '5px', width: '100%', color: 'black' }}
          >
            <option value="">-- pick a team --</option>
            {NBA_TEAMS.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>

        <button 
          onClick={handleSave} 
          disabled={isSaving}
          style={{ 
            padding: '10px', 
            backgroundColor: isSaving ? 'grey' : 'blue', 
            color: 'white', 
            border: 'none', 
            cursor: 'pointer' 
          }}
        >
          {isSaving ? "Saving..." : "Save Profile"}
        </button>

        {/* success/fail msg */}
        {message && <p>{message}</p>}

      </div>
    </div>
  );
};

export default Profile;