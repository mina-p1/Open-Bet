import React from "react";

export default function About() {
  return (
    <div className="container mx-auto py-12 px-4">
      <h2 className="text-3xl font-semibold text-center mb-4 text-blue-500">About OpenBet</h2>
      <p className="mb-8 text-gray-700 text-center max-w-2xl mx-auto">
          OpenBet compares our <strong>machine learning predictions</strong> against <strong>live sportsbook lines</strong> to find potential value in basketball betting markets. Our mission is to empower every bettor with transparent, actionable data.
      </p>

      <div className="w-full max-w-2xl mx-auto">
        <div className="collapse collapse-arrow bg-base-200 mb-4">
          <input type="checkbox" className="peer" />
          <div className="collapse-title text-xl font-medium">What It Does</div>
          <div className="collapse-content">
            <p>
              Each day, OpenBet pulls game and player data, runs it through our trained ML model, and compares the model’s predictions with sportsbook odds. The result shows whether lines are overvalued or undervalued based on our analysis.
            </p>
          </div>
        </div>
        <div className="collapse collapse-arrow bg-base-200 mb-4">
          <input type="checkbox" className="peer" />
          <div className="collapse-title text-xl font-medium">How It Works</div>
          <div className="collapse-content">
            <p>
              Our process is simple: <br />
              1. We fetch daily basketball data from APIs. <br />
              2. We run predictions using a custom ML model. <br />
              3. We display odds and our predictions side-by-side for easy comparison.
            </p>
          </div>
        </div>
        <div className="collapse collapse-arrow bg-base-200 mb-4">
          <input type="checkbox" className="peer" />
          <div className="collapse-title text-xl font-medium">Important Disclaimer</div>
          <div className="collapse-content">
            <p>
              This is an academic prototype. OpenBet is not a betting advisor, and we encourage responsible gambling.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

