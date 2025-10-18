import React from "react";

function Home() {
  return (
    <section className="flex flex-col items-center justify-center py-16">
      <div className="card w-full max-w-xl bg-base-100 shadow-xl">
        <div className="card-body items-center text-center">
          <h1 className="card-title text-4xl text-primary mb-4">Welcome to OpenBet!</h1>
          <p className="mb-6">Discover basketball odds, compare lines, and find arbitrage opportunities using our live data tools.</p>
          <a href="/liveodds" className="btn btn-primary btn-wide">
            View Live Odds
          </a>
        </div>
      </div>
    </section>
  );
}

export default Home;
