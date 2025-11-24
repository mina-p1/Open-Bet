import requests
import joblib
import json
import os
from datetime import datetime

# CONFIG
API_KEY = '39fc4ed3a7caf51b49d87d08ec90658a'
ODDS_API_URL = "https://api.the-odds-api.com/v4/sports/basketball_nba/odds"
MODEL_PATH = 'nba_model.pkl'
OUTPUT_FILE = 'todays_data.json'


TEAM_MAP = {
    "Atlanta Hawks": 1610612737,
    "Boston Celtics": 1610612738,
    "Brooklyn Nets": 1610612751,
    "Charlotte Hornets": 1610612766,
    "Chicago Bulls": 1610612741,
    "Cleveland Cavaliers": 1610612739,
    "Dallas Mavericks": 1610612742,
    "Denver Nuggets": 1610612743,
    "Detroit Pistons": 1610612765,
    "Golden State Warriors": 1610612744,
    "Houston Rockets": 1610612745,
    "Indiana Pacers": 1610612754,
    "Los Angeles Clippers": 1610612746,
    "LA Clippers": 1610612746,
    "Los Angeles Lakers": 1610612747,
    "Memphis Grizzlies": 1610612763,
    "Miami Heat": 1610612748,
    "Milwaukee Bucks": 1610612749,
    "Minnesota Timberwolves": 1610612750,
    "New Orleans Pelicans": 1610612740,
    "New York Knicks": 1610612752,
    "Oklahoma City Thunder": 1610612760,
    "Orlando Magic": 1610612753,
    "Philadelphia 76ers": 1610612755,
    "Phoenix Suns": 1610612756,
    "Portland Trail Blazers": 1610612757,
    "Sacramento Kings": 1610612758,
    "San Antonio Spurs": 1610612759,
    "Toronto Raptors": 1610612761,
    "Utah Jazz": 1610612762,
    "Washington Wizards": 1610612764
}

def main():
    # 1. Load the Model
    if not os.path.exists(MODEL_PATH):
        print("Error: 'nba_model.pkl' not found. Run model_train.py first!")
        return
    
    print(f"Loading {MODEL_PATH}...")
    model = joblib.load(MODEL_PATH)

    # 2. Get Live Schedule
    print("Fetching live odds from API...")
    params = {"regions": "us", "markets": "h2h,spreads,totals", "oddsFormat": "american", "apiKey": API_KEY}
    try:
        resp = requests.get(ODDS_API_URL, params=params)
        if resp.status_code != 200:
            print(f"API Error: {resp.status_code} - {resp.text}")
            return
        games = resp.json()
    except Exception as e:
        print(f"Connection Error: {e}")
        return

    # 3. Predict Winners
    print(f"Found {len(games)} games.")
    for game in games:
        home_name = game['home_team']
        away_name = game['away_team']

        # Convert Name -> ID
        h_id = TEAM_MAP.get(home_name)
        a_id = TEAM_MAP.get(away_name)

        if h_id and a_id:
            # Predict Margin (Home - Away)
            pred_margin = model.predict([[h_id, a_id]])[0]
            
            winner = home_name if pred_margin > 0 else away_name
            
            # Save prediction data
            game['openbet_prediction'] = {
                'predicted_winner': winner,
                'predicted_margin': round(abs(pred_margin), 1),
                'raw_margin': pred_margin,
                'message': f"{winner} by {round(abs(pred_margin), 1)}"
            }
            print(f"   Match: {away_name} @ {home_name} -> Model picks: {winner} by {round(abs(pred_margin), 1)}")
        else:
            print(f"   Skipping: Could not find ID for {away_name} or {home_name}")
            game['openbet_prediction'] = None

    # 4. Save for the Website
    with open(OUTPUT_FILE, 'w') as f:
        json.dump({"games": games, "last_updated": str(datetime.now())}, f, indent=2)
    
    print(f"\nSUCCESS! Predictions saved to '{OUTPUT_FILE}'.")

if __name__ == "__main__":
    main()