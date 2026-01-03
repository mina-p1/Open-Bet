import React from "react";
import { Link, useLocation } from "react-router-dom";

function Header() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header style={{ background: "#050816", borderBottom: "1px solid #1f2937" }}>
      <nav
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >

        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "#e5e7eb",
              letterSpacing: "0.03em",
            }}
          >
            OpenBet
          </span>
        </Link>

        {/* Right: Nav links */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {[
            { to: "/", label: "Home" },
            { to: "/liveodds", label: "Live Odds" },
            { to: "/player-props", label: "Player Props" },
            { to: "/arbitrage", label: "Arbitrage" },
            { to: "/about", label: "About" },
          ].map((item) => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  padding: "7px 14px",
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: "none",
                  color: active ? "#0b1120" : "#d1d5db",
                  backgroundColor: active ? "#38bdf8" : "transparent",
                  border: active ? "1px solid #38bdf8" : "1px solid #374151",
                  boxShadow: active ? "0 0 12px rgba(56,189,248,0.7)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}

export default Header;
