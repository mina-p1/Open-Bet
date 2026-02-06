import React, { useState, useEffect } from 'react';

const Discussions = ({ user }) => {
  const [threads, setThreads] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(true);

  /* DATE STUFF 
     need two formats: one for the db ID (2026-02-06)
     and one to make the title look nice
  */
  const today = new Date();
  const dateKey = today.toISOString().split('T')[0];
  const prettyDate = today.toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  // run this once when page loads
  useEffect(() => {
    fetchThreads();
  }, []);

  const fetchThreads = async () => {
    try {
      const res = await fetch(`http://localhost:5050/api/discussions?date=${dateKey}`);
      const data = await res.json();
      
      // safety check to make sure we got a list back
      if (Array.isArray(data)) {
        setThreads(data);
      }
    } catch (err) {
      console.log("cant get threads, is backend on?", err); 
    }
    setLoading(false);
  };

  const handlePost = async () => {
    // dont let them post empty string
    if (!newPost.trim()) return; 

    // check if they have a custom display name set
    const authorName = user.displayName ? user.displayName : user.name;

    try {
      const response = await fetch('http://localhost:5050/api/discussions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          name: authorName,
          text: newPost,
          date: dateKey // <-- sending the date key so it goes in right thread
        })
      });

      if (response.ok) {
        // works! clear box and refresh list
        setNewPost(""); 
        fetchThreads(); 
      } else {
        console.error("server said no.");
      }
      
    } catch (error) {
      console.log("network err, check port 5050", error);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', color: 'white', minHeight: '80vh' }}>
      
      {/* TITLE SECTION */}
      <div style={{ marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '20px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{prettyDate} Daily Thread</h1>
        <p style={{ color: 'grey' }}>
          Daily discussion for NBA picks, props, and bad beats.
        </p>
      </div>

      {/* INPUT section */}
      {user ? (
        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '10px', marginBottom: '30px' }}>
          <strong style={{ color: '#4ade80' }}>
            Posting as: {user.displayName ? user.displayName : user.name}
          </strong>
          
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder={`What are your moves for ${prettyDate}?`}
            style={{ 
              width: '100%', height: '80px', marginTop: '10px', 
              background: '#0f172a', color: 'white', border: '1px solid #334155', padding: '10px' 
            }}
          />
          <button 
            onClick={handlePost}
            style={{ 
              marginTop: '10px', padding: '10px 20px', 
              background: 'blue', color: 'white', border: 'none', cursor: 'pointer' 
            }}
          >
            Post It
          </button>
        </div>
      ) : (
        // SHOW THIS IF LOGGED OUT
        <div style={{ padding: '20px', background: '#333', borderRadius: '10px', marginBottom: '30px', textAlign: 'center' }}>
          🔒 <b>Log in to join the daily thread.</b>
        </div>
      )}

      {/* THE CHAT LIST */}
      {loading ? <p>loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {threads.length === 0 && <p style={{color: 'grey', fontStyle: 'italic'}}>No comments yet</p>}
          
          {threads.map((t) => (
            <div key={t.id || Math.random()} style={{ border: '1px solid #333', padding: '15px', borderRadius: '8px', background: '#0f172a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <strong style={{ color: '#60a5fa' }}>{t.name}</strong>
                <span style={{ fontSize: '0.8em', color: 'grey' }}>{t.created_at}</span>
              </div>
              <p style={{ margin: 0 }}>{t.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Discussions;