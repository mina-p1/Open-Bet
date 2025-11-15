from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import os
import requests

app = Flask(__name__)
CORS(app)

CSV_PATH = os.path.join(os.path.dirname(__file__), "box_scores", "Games.csv")

@app.route('/api/historical-data')
def get_historical_data():
    game_date = request.args.get('date')
    try:
        # load the necessary columns, matching your CSV
        df = pd.read_csv(CSV_PATH, usecols=[
            'gameDate', 'hometeamName', 'awayteamName', 'homeScore', 'awayScore'
        ])

        # Always produce YYYY-MM-DD date string
        df['gameDateOnly'] = df['gameDate'].str.split('T').str[0]

        if game_date:
            filtered = df[df['gameDateOnly'] == game_date]
        else:
            filtered = df

        # Sort recent first
        filtered = filtered.sort_values("gameDate", ascending=False)

        games_list = []
        for idx, row in filtered.iterrows():
            games_list.append({
                "game_date": row['gameDateOnly'],
                "team_name_home": row['hometeamName'],
                "team_name_away": row['awayteamName'],
                "pts_home": row['homeScore'],
                "pts_away": row['awayScore'],
            })

        return jsonify(games_list if game_date else games_list[:20])
    except Exception as e:
        print("Data error:", e)
        return jsonify({"error": str(e)}), 500

# LIVE NBA ODDS (The Odds API)
@app.route('/api/live-nba-odds')
def get_live_nba_odds():
    API_KEY = '39fc4ed3a7caf51b49d87d08ec90658a'
    THE_ODDS_API_URL = "https://api.the-odds-api.com/v4/sports/basketball_nba/odds"
    params = {
        "regions": "us,us2",
        "markets": "h2h,spreads,totals",
        "oddsFormat": "american",
        "apiKey": API_KEY
    }
    try:
        response = requests.get(THE_ODDS_API_URL, params=params)
        print("API Response:", response.status_code)
        response.raise_for_status()
        live_odds_data = response.json()
        return jsonify(live_odds_data)
    except requests.RequestException as e:
        print("API error:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5050)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=True)