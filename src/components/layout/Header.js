import React from "react";
import { Link, useLocation } from "react-router-dom";
import LoginButton from "../LoginButton";

const mainNav = [
  { to: "/", label: "Home" },
  { to: "/liveodds", label: "Live Odds" },
  { to: "/player-props", label: "Player Props" },
  { to: "/arbitrage", label: "Arbitrage" },
  { to: "/profile", label: "Profile" },
  { to: "/discussions", label: "Discussions" },
  { to: "/about", label: "About" },
];

function Header({ user, setUser }) {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#020617]/95 backdrop-blur-xl">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-4 py-3">
        {/* Left: Brand */}
        <div className="flex items-center">
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
        </div>

        {/* Center: nav pills */}
 {/* Center: nav pills */}
<div className="flex-1 flex justify-center overflow-x-hidden">
  <div className="inline-flex flex-nowrap items-center justify-center gap-4 rounded-full bg-slate-900/60 px-4 py-1.5 shadow-[0_0_40px_rgba(15,23,42,0.9)] ring-1 ring-slate-700">
    {mainNav.map((item) => {
      const active = isActive(item.to);

      return (
        <Link
          key={item.to}
          to={item.to}
          className={`relative inline-flex items-center justify-center whitespace-nowrap rounded-full px-6 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200 text-white ${
            active
              ? "bg-sky-500/30 backdrop-blur-md border border-sky-300 shadow-[0_0_24px_rgba(56,189,248,0.9)]"
              : "bg-slate-900/70 border border-slate-700 hover:bg-sky-600 hover:border-sky-400 hover:shadow-[0_0_18px_rgba(56,189,248,0.7)]"
          }`}
        >
          {active && (
            <span className="pointer-events-none absolute inset-[-4px] rounded-full bg-sky-400/35 blur-[12px]" />
          )}
          <span className="relative">{item.label}</span>
        </Link>
      );
    })}
  </div>
</div>

        {/* Right: auth area */}
        <div className="flex items-center justify-end min-w-[180px]">
          {user ? (
            <div className="flex items-center gap-3">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt="Profile"
                  style={{
                    width: "36px",
                    height: "36px",
                    minWidth: "36px",
                    minHeight: "36px",
                  }}
                  className="object-cover rounded-full border-2 border-slate-600 shadow-sm"
                />
              ) : (
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    minWidth: "36px",
                    minHeight: "36px",
                  }}
                  className="flex items-center justify-center bg-sky-600 text-white rounded-full font-bold text-sm border-2 border-slate-600 shadow-sm"
                >
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
              )}
              <button
                onClick={handleLogout}
                className="text-xs font-semibold text-slate-200 hover:text-sky-300 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="scale-90">
              <LoginButton onLogin={setUser} />
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Header;
