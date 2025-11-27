import React from "react";

export default function About() {
  return (
    <div className="container mx-auto py-12 px-4">
      <h2 className="text-3xl font-semibold text-center mb-4 text-blue-500">
        About OpenBet
      </h2>
      <p className="mb-8 text-gray-200 text-center max-w-2xl mx-auto">
        OpenBet compares our <strong>machine learning predictions</strong> against{" "}
        <strong>live sportsbook lines</strong> to highlight spots where the numbers
        may be in your favor. The goal is to make basketball betting easier to
        understand, not to tell you what to bet.
      </p>

      <div className="w-full max-w-3xl mx-auto space-y-4">
        {/* What it does */}
        <div className="collapse collapse-arrow bg-base-200">
          <input type="checkbox" className="peer" />
          <div className="collapse-title text-xl font-medium">
            What OpenBet Does
          </div>
          <div className="collapse-content text-sm md:text-base space-y-2">
            <p>
              Each day, OpenBet pulls game and player data, runs it through our
              trained model, and compares the model’s predictions with sportsbook
              odds. Where our model and the books disagree the most, you may have
              <strong> value</strong> or even an <strong>arbitrage</strong> spot.
            </p>
            <p>
              You still choose what to bet. OpenBet just turns raw odds and stats
              into a cleaner dashboard so you can see lines, model opinions, and
              edge estimates in one place.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="collapse collapse-arrow bg-base-200">
          <input type="checkbox" className="peer" />
          <div className="collapse-title text-xl font-medium">
            How It Works (Short Version)
          </div>
          <div className="collapse-content text-sm md:text-base space-y-1">
            <p>Behind the scenes OpenBet:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Fetches daily NBA schedule, odds, and historical data.</li>
              <li>
                Uses a custom ML model to estimate win chances, scores, and player
                stats.
              </li>
              <li>
                Compares our model to each book’s lines and calculates the{" "}
                <strong>implied probability</strong> from the odds.
              </li>
              <li>
                Flags mismatches and, on the Arbitrage page, shows where betting
                both sides can lock in profit.
              </li>
            </ol>
          </div>
        </div>

        {/* Core betting terms */}
        <div className="collapse collapse-arrow bg-base-200">
          <input type="checkbox" className="peer" />
          <div className="collapse-title text-xl font-medium">
            Core Terms (Moneyline, Spread, Total)
          </div>
          <div className="collapse-content text-sm md:text-base space-y-2">
            <p>
              <strong>Moneyline</strong> – You are only betting who wins the game.
              Odds like <code>+200</code> or <code>-150</code> tell you the payout:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>+200</strong>: Bet $100 to win $200 profit (you get back
                $300 total).
              </li>
              <li>
                <strong>-150</strong>: Bet $150 to win $100 profit (you get back
                $250 total).
              </li>
            </ul>
            <p>
              <strong>Spread</strong> – The book adds points to one team and takes
              them from the other to even things out. If a team is{" "}
              <code>-5.5</code>, they must win by 6+ for a spread bet on them to
              cash. If a team is <code>+5.5</code>, they can lose by 5 or less (or
              win) and your bet still wins.
            </p>
            <p>
              <strong>Total (Over / Under)</strong> – You are betting on the
              combined score of both teams. If the total is <code>231.5</code>,
              then:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Over</strong> hits if the teams score 232 or more.
              </li>
              <li>
                <strong>Under</strong> hits if they score 231 or less.
              </li>
            </ul>
          </div>
        </div>

        {/* Units, bankroll, edge */}
        <div className="collapse collapse-arrow bg-base-200">
          <input type="checkbox" className="peer" />
          <div className="collapse-title text-xl font-medium">
            Edge
          </div>
          <div className="collapse-content text-sm md:text-base space-y-2">
            <p>
              <strong>Edge</strong> – The difference between our model&apos;s win
              chance and the book&apos;s implied chance. If the book is pricing a
              team like it wins 40% of the time, but our model says 45%, the edge
              is roughly +5 percentage points in your favor.
            </p>
          </div>
        </div>

        {/* Arbitrage explanation */}
        <div className="collapse collapse-arrow bg-base-200">
          <input type="checkbox" className="peer" />
          <div className="collapse-title text-xl font-medium">
            What Is Arbitrage Betting?
          </div>
          <div className="collapse-content text-sm md:text-base space-y-2">
            <p>
              <strong>Arbitrage</strong> (or “arb”) is when two or more sportsbooks
              disagree so much on the odds that you can bet{" "}
              <em>both sides of the same game</em> and lock in a profit before the
              game even starts.
            </p>
            <p>
              Example (very simplified):
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Book A: Team A +120 (bet 100 to win 120)</li>
              <li>Book B: Team B +120 (bet 100 to win 120)</li>
            </ul>
            <p>
              If you bet on <strong>both teams</strong> with carefully chosen
              stakes, one of them will definitely win, and the total payout can be
              more than you risked. Our Arbitrage page:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Scans all books and finds the best price for each side.</li>
              <li>
                Calculates the combined implied probability – if it&apos;s under
                100%, there&apos;s an arb.
              </li>
              <li>
                Shows suggested stakes (in units) and edge so you can see the
                structure of the opportunity.
              </li>
            </ul>
            <p className="text-xs text-gray-400">
              Important: Some sportsbooks may limit or ban accounts that chase
              pure arbitrage. This feature is mainly educational.
            </p>
          </div>
        </div>

        {/* How to use each page */}
        <div className="collapse collapse-arrow bg-base-200">
          <input type="checkbox" className="peer" />
          <div className="collapse-title text-xl font-medium">
            How to Use Each Page
          </div>
          <div className="collapse-content text-sm md:text-base space-y-2">
            <p>
              <strong>Live Odds</strong> – Shows today’s games with spreads,
              moneylines, and totals for the selected book, plus our model
              prediction. Use this when you want a “normal” betting view plus a
              quick model opinion.
            </p>
            <p>
              <strong>Player Props</strong> – Lists player‑level markets (like
              points and rebounds) where books offer lines. You can filter by
              market or player to look for soft numbers.
            </p>
            <p>
              <strong>Arbitrage</strong> – Only shows games where combining the{" "}
              best moneylines across books creates a guaranteed profit if you bet
              both sides with the suggested stakes.
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="collapse collapse-arrow bg-base-200">
          <input type="checkbox" className="peer" />
          <div className="collapse-title text-xl font-medium">
            Important Disclaimer
          </div>
          <div className="collapse-content text-sm md:text-base space-y-2">
            <p>
              This is an academic prototype for learning and experimentation. It
              is <strong>not</strong> financial advice or a guaranteed way to make
              money.
            </p>
            <p>
              Always bet responsibly, only with money you can afford to lose, and
              follow the laws and terms of service in your location. If betting
              stops being fun, stop or seek help.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
