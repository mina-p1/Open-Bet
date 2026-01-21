import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const mainNav = [
  { to: "/", label: "Home" },
  { to: "/liveodds", label: "Live Odds" },
  { to: "/player-props", label: "Player Props" },
  { to: "/arbitrage", label: "Arbitrage" },
  { to: "/my-bets", label: "My Bets" },
  { to: "/profile", label: "Profile" },
  { to: "/discussions", label: "Discussions" },
  { to: "/about", label: "About" },
];


function Header() {
  const location = useLocation();
  const [sportsOpen, setSportsOpen] = useState(false);

  const isActive = (path) => location.pathname === path;


  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#020617]/95 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 text-slate-100">
          <div className="leading-tight">
            <div className="text-lg font-extrabold tracking-[0.18em] uppercase">
              OpenBet
            </div>
            <div className="text-[10px] font-medium uppercase text-slate-400 tracking-[0.22em]">
              The Smart Basketball Betting Tool
            </div>
          </div>
        </Link>

        {/* Nav pills */}
        <div className="flex flex-1 items-center justify-end">
          <div className="inline-flex max-w-full flex-wrap items-center justify-end gap-2 rounded-full bg-slate-900/60 px-2 py-1 shadow-[0_0_40px_rgba(15,23,42,0.9)] ring-1 ring-slate-700/80">
            {/* main nav items (no sports here) */}
            {mainNav.map((item) => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={[
                    "relative inline-flex items-center justify-center whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
                    "border border-slate-700/70 bg-slate-900/60 text-slate-300",
                    "hover:text-slate-50 hover:border-sky-400/70 hover:bg-slate-900/90 hover:shadow-[0_0_18px_rgba(56,189,248,0.45)]",
                    active &&
                      "border-transparent bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300 text-slate-950 shadow-[0_0_25px_rgba(56,189,248,0.9)]",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {active && (
                    <span className="pointer-events-none absolute inset-[-2px] rounded-full bg-sky-400/40 blur-[6px]" />
                  )}
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}

          
            </div>
          </div>
      </nav>
    </header>
  );
}

export default Header;
