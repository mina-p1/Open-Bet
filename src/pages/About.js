import React from "react";

export default function About() {
  return (
    <div className="container mx-auto py-12">
      <h2 className="text-3xl font-semibold mb-6 text-blue-500">About OpenBet</h2>
      <p className="mb-8 text-gray-700">OpenBet aggregates Ontario sportsbook basketball data and guides you to exploit odds shifts and arbitrage. Our mission: empower every bettor with transparent, actionable data!</p>
      <div className="w-full max-w-xl mx-auto">
        <div className="collapse collapse-arrow bg-base-200 mb-4">
          <input type="checkbox" className="peer" />
          <div className="collapse-title text-xl font-medium">What are Live Odds?</div>
          <div className="collapse-content">
            <p>
              Live odds change in real-time as sportsbooks update prices based on bets, news, or in-game events. Finding the best line can boost your returns—so always compare!
            </p>
          </div>
        </div>
        <div className="collapse collapse-arrow bg-base-200 mb-4">
          <input type="checkbox" className="peer" />
          <div className="collapse-title text-xl font-medium">What is an Arbitrage Bet?</div>
          <div className="collapse-content">
            <p>
              Arbitrage occurs when you can bet both sides of a market (at different books) and lock in a profit—no matter who wins. True arbitrage is rare, but OpenBet highlights every opportunity that fits!
            </p>
          </div>
        </div>
        <div className="collapse collapse-arrow bg-base-200 mb-4">
          <input type="checkbox" className="peer" />
          <div className="collapse-title text-xl font-medium">How Do I Use OpenBet?</div>
          <div className="collapse-content">
            <p>
              Browse all odds, watch for "arbitrage" badges, hit Live Odds or Arbitrage, and always bet responsibly!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
