from flask import Flask, jsonify
from flask_cors import CORS
import sqlite3
import requests

app = Flask(__name__)
CORS(app)


# Helper for querying local SQLite (Kaggle dataset)
def query_db(query, args=(), one=False):
    db_path = 'nba.sqlite'     # This should be the path to your downloaded Kaggle dataset
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(query, args)
    rv = cur.fetchall()
    conn.close()
    return (rv[0] if rv else None) if one else rv

# --- HISTORICAL DATA (Kaggle, local SQLite) ---
@app.route('/api/historical-data')
def get_historical_data():
    query = """
    SELECT 
        game_id, 
        game_date,
        team_name_home, 
        team_name_away, 
        pts_home, 
        pts_away,
        season_id
    FROM game 
    ORDER BY game_date DESC
    LIMIT 20
    """
    try:
        games_from_db = query_db(query)
        games_list = [dict(game) for game in games_from_db]
        return jsonify(games_list)
    except sqlite3.Error as e:
        print("Database error:", e)
        return jsonify({"error": "Database query failed"}), 500

# --- LIVE NBA ODDS (The Odds API) ---
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
