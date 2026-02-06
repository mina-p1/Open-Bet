import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from '@react-oauth/google'; 

import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import Home from "./pages/Home";
import About from "./pages/About";
import LiveOdds from "./pages/LiveOdds";
import Arbitrage from "./pages/Arbitrage";
import PlayerProps from "./pages/PlayerProps";
import Profile from "./pages/Profile"; 
import Discussions from "./pages/Discussions"; 

const CLIENT_ID = "67516129655-7dvqsh49bolnse50d2ibumtrsaj1gfkj.apps.googleusercontent.com";

function App() {
  const [user, setUser] = useState(null);

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <Router>
        <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-800">
          
          <Header user={user} setUser={setUser} />
          
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/liveodds" element={<LiveOdds />} />
              <Route path="/arbitrage" element={<Arbitrage />} />
              <Route path="/player-props" element={<PlayerProps />} />
              <Route path="/profile" element={<Profile user={user} setUser={setUser} />} />
              <Route path="/discussions" element={<Discussions user={user} />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;