from flask import Flask, jsonify
from flask_cors import CORS
import sqlite3
import requests 

app = Flask(__name__)
CORS(app)

#  query the database 
def query_db(query, args=(), one=False):
    db_path = 'nba.sqlite' 
    
    conn = sqlite3.connect(db_path) 
    conn.row_factory = sqlite3.Row  # Access columns by name
    cur = conn.cursor()
    cur.execute(query, args)
    rv = cur.fetchall()
    conn.close()
    return (rv[0] if rv else None) if one else rv


@app.route('/api/games')
def get_games():
    """ This MOCK endpoint simulates live games for today. """
    mock_games = [
        {"game_id": 1, "team_home": "Toronto Raptors", "team_away": "Boston Celtics", "home_odds": -150, "away_odds": +130},
        {"game_id": 2, "team_home": "Los Angeles Lakers", "team_away": "Golden State Warriors", "home_odds": -110, "away_odds": -110},
    ]
    return jsonify(mock_games)

@app.route('/api/historical-data')
def get_historical_data():
    """ This REAL endpoint queries the 'game' table. """
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
    WHERE season_id = 42022
    LIMIT 10;
    """
    try:
        games_from_db = query_db(query)
        games_list = [dict(game) for game in games_from_db]
        return jsonify(games_list)
    except sqlite3.Error as e:
        print("Database error:", e)
        return jsonify({"error": "Database query failed. Check terminal and app.py"}), 500

@app.route('/api/live-nba-odds')
def get_live_nba_odds():
    """
    This REAL endpoint fetches live odds AND adds hardcoded model predictions.
    """
   
    API_KEY = 'YOUR_API_KEY_HERE'
    
    THE_ODDS_API_URL = (
        "https://api.the-odds-api.com/v4/sports/basketball_nba/odds/"
        f"?apiKey={API_KEY}"
        "&regions=us"
        "&markets=h2h,spreads,totals"
        "&bookmakers=fanduel"
    )
    
    if API_KEY == 'YOUR_API_KEY_HERE':
        return jsonify({"error": "API Key not set in app.py"}), 500
        
    try:
        response = requests.get(THE_ODDS_API_URL)
        response.raise_for_status()
        
        live_odds_data = response.json()
        
        simplified_games = []
        for game in live_odds_data:
            bookmaker_data = next(
                (book for book in game.get('bookmakers', []) if book.get('key') == 'fanduel'),
                None
            )
            
            if not bookmaker_data:
                continue

            markets = {market['key']: market for market in bookmaker_data.get('markets', [])}
            
            h2h = markets.get('h2h', {})
            spread = markets.get('spreads', {})
            total = markets.get('totals', {})

            simplified_game = {
                "id": game.get('id'),
                "home_team": game.get('home_team'),
                "away_team": game.get('away_team'),
                "start_time": game.get('commence_time'),
                "moneyline": h2h.get('outcomes', [{}, {}]),
                "spread": spread.get('outcomes', [{}, {}]),
                "total": total.get('outcomes', [{}, {}]),
                
                # Hardcoded Model Predictions 
                
                "model_spread": {
                    "home_point": -4.5, # Our model thinks home wins by 4.5
                    "away_point": 4.5
                },
                "model_total": {
                    "point": 221.5 # Our model's total
                }
            }
            simplified_games.append(simplified_game)
        
        return jsonify(simplified_games)

    except requests.exceptions.RequestException as e:
        print(f"Error fetching from The Odds API: {e}")
        return jsonify({"error": f"Failed to fetch live odds: {e}"}), 500
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

# Run app
if __name__ == '__main__':
    app.run(debug=True, port=5000)