import React from "react";
import { Link } from "react-router-dom";

function Header() {
  return (
    <header className="bg-white border-b shadow dark:bg-gray-900">
      <nav className="navbar bg-base-100 shadow mb-6">
        <div className="flex-1">
          <Link
            className="btn btn-ghost text-2xl text-primary normal-case"
            to="/"
          >
            OpenBet
          </Link>
        </div>
        <div className="flex-none space-x-2">
          <Link className="btn btn-ghost" to="/">
            Home
          </Link>
          <Link className="btn btn-ghost" to="/about">
            About
          </Link>
          <Link className="btn btn-ghost" to="/liveodds">
            Live Odds
          </Link>
          <Link className="btn btn-ghost" to="/Arbitrage">
            Arbitrage Bets
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default Header;
