import React, { useState } from "react";

function Home() {
  // State to hold the selected date, defaulting to today.
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  return (
    <section className="flex flex-col items-center justify-center py-16">
      <div className="card w-full max-w-xl bg-base-100 shadow-xl">
        <div className="card-body items-center text-center">
          <h1 className="card-title text-4xl text-primary mb-4">Welcome to OpenBet!</h1>
          <p className="mb-6">
            Discover basketball odds and compare lines. Select a date below to view the games and line values.
          </p>

          {/* Datepicker input */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input input-bordered w-full max-w-xs mb-4"
          />
          
          {/* This link now points to the LiveOdds page with the selected date as a query parameter. */}
          <a
            href={`/liveodds?date=${selectedDate}`}
            className="btn btn-primary btn-wide"
          >
            View Odds
          </a>
        </div>
      </div>
    </section>
  );
}

export default Home;
