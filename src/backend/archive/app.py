from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import requests

app = Flask(__name__)
CORS(app)

def query_db(query, args=(), one=False):
    db_path = 'nba.sqlite'
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(query, args)
    rv = cur.fetchall()
    conn.close()
    return (rv[0] if rv else None) if one else rv

@app.route('/api/historical-data')
def get_historical_data():
    # Get date param like "2023-06-12", or show most recent 20 games
    game_date = request.args.get('date')
    if game_date:
        query = """
        SELECT game_id, game_date, team_name_home, team_name_away, pts_home, pts_away, season_id
        FROM game
        WHERE DATE(game_date) = DATE(?)
        ORDER BY game_date DESC
        """
        args = (game_date,)
    else:
        query = """
        SELECT game_id, game_date, team_name_home, team_name_away, pts_home, pts_away, season_id
        FROM game
        ORDER BY game_date DESC
        LIMIT 20
        """
        args = ()
    try:
        games_from_db = query_db(query, args)
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
