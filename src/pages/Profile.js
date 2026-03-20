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
        setMessage("✅ saved!");
        // update app state so header fixes itself instantly
        setUser(data.user);
      } else {
        setMessage("❌ error saving.. try again");
      }
    } catch (error) {
      console.log(error); 
      setMessage("⚠️ network err. is backend running?");
    }
    
    setIsSaving(false); 
  };

  // if not logged in just show msg
  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px', color: '#94a3b8' }}>
        <h2>Log in to see profile</h2>
      </div>
    );
  }

  // --- Reusable Input Style ---
  const inputStyle = {
    padding: '12px',
    width: '100%',
    borderRadius: '8px',
    border: '1px solid #334155',
    background: '#0f172a', // deep navy
    color: '#fff',         // white text
    fontSize: '15px',
    marginTop: '8px',
    outline: 'none',
    boxSizing: 'border-box'
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '500px', 
        background: '#1e293b', 
        borderRadius: '16px', 
        padding: '32px', 
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
        border: '1px solid #334155',
        color: 'white' 
      }}>
        <h1 style={{ textAlign: 'center', fontSize: '24px', marginBottom: '24px', color: '#fff' }}>My Profile</h1>
        
        {/* the user card thing */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px',
          marginBottom: '24px', 
          borderBottom: '1px solid #334155', 
          paddingBottom: '24px' 
        }}>
          <img 
            src={user.picture} 
            alt="pfp" 
            style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid #3b82f6' }} 
          />
          <div>
            <strong style={{ fontSize: '18px' }}>{user.name}</strong> <br/>
            <small style={{ color: '#94a3b8', fontSize: '14px' }}>{user.email}</small>
          </div>
        </div>

        {/* actual form inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div>
            <label style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>Display Name</label> <br/>
            <input 
              type="text" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>Favorite Team</label> <br/>
            <select 
              value={favoriteTeam}
              onChange={(e) => setFavoriteTeam(e.target.value)}
              style={inputStyle}
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
              padding: '14px', 
              backgroundColor: isSaving ? '#475569' : '#3b82f6', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              fontWeight: '700',
              fontSize: '16px',
              marginTop: '10px',
              transition: 'background 0.2s'
            }}
          >
            {isSaving ? "Saving..." : "Save Profile"}
          </button>

          {/* success/fail msg */}
          {message && (
            <p style={{ 
              textAlign: 'center', 
              color: message.includes('✅') ? '#4ade80' : '#f87171', 
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {message}
            </p>
          )}

        </div>
      </div>
    </div>
  );
};

export default Profile;