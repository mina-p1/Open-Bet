import requests
import joblib
import json
import os
import pandas as pd
from datetime import datetime

# CONFIG
API_KEY = '39fc4ed3a7caf51b49d87d08ec90658a'
ODDS_API_URL = "https://api.the-odds-api.com/v4/sports/basketball_nba/odds"
MODEL_PATH = 'nba_model.pkl'
OUTPUT_FILE = 'todays_data.json'


TEAM_MAP = {
    "Atlanta Hawks": "1610612737",
    "Boston Celtics": "1610612738",
    "Brooklyn Nets": "1610612751",
    "Charlotte Hornets": "1610612766",
    "Chicago Bulls": "1610612741",
    "Cleveland Cavaliers": "1610612739",
    "Dallas Mavericks": "1610612742",
    "Denver Nuggets": "1610612743",
    "Detroit Pistons": "1610612765",
    "Golden State Warriors": "1610612744",
    "Houston Rockets": "1610612745",
    "Indiana Pacers": "1610612754",
    "Los Angeles Clippers": "1610612746",
    "LA Clippers": "1610612746",
    "Los Angeles Lakers": "1610612747",
    "Memphis Grizzlies": "1610612763",
    "Miami Heat": "1610612748",
    "Milwaukee Bucks": "1610612749",
    "Minnesota Timberwolves": "1610612750",
    "New Orleans Pelicans": "1610612740",
    "New York Knicks": "1610612752",
    "Oklahoma City Thunder": "1610612760",
    "Orlando Magic": "1610612753",
    "Philadelphia 76ers": "1610612755",
    "Phoenix Suns": "1610612756",
    "Portland Trail Blazers": "1610612757",
    "Sacramento Kings": "1610612758",
    "San Antonio Spurs": "1610612759",
    "Toronto Raptors": "1610612761",
    "Utah Jazz": "1610612762",
    "Washington Wizards": "1610612764"
}

def main():
    # 1. Load the Model
    if not os.path.exists(MODEL_PATH):
        print("'nba_model.pkl' not found did you run model_train.py ?")
        return
    
    print(f"Loading {MODEL_PATH}...")
    artifact = joblib.load(MODEL_PATH)
    model = artifact['model']
    latest_stats = artifact['latest_stats'] # Dictionary of team's last known stats
    
    print("Fetching live odds...")
    params = {"regions": "us", "markets": "h2h,spreads,totals", "oddsFormat": "american", "apiKey": API_KEY}
    resp = requests.get(ODDS_API_URL, params=params)
    games = resp.json()

    print(f"Found {len(games)} games.")
    for game in games:
        home_name = game['home_team']
        away_name = game['away_team']

        h_id = TEAM_MAP.get(home_name)
        a_id = TEAM_MAP.get(away_name)

        if h_id and a_id and h_id in latest_stats and a_id in latest_stats:
            # 1. Get stats for both teams
            h_stats = latest_stats[h_id]
            a_stats = latest_stats[a_id]

            # 2. Build Feature Row for HOME Team
            home_features = pd.DataFrame([{
                'home': 1, 
                'fatigue_index': 0,
                'home_strength_rating': h_stats.get('home_strength_rating', 0),
                'rolling_teamScore': h_stats.get('rolling_teamScore', 0),
                'rolling_possessions': h_stats.get('rolling_possessions', 0),
                'rolling_fieldGoalsPercentage': h_stats.get('rolling_fieldGoalsPercentage', 0),
                'opp_rolling_teamScore': a_stats.get('rolling_teamScore', 0),
                'opp_rolling_possessions': a_stats.get('rolling_possessions', 0),
                'opp_rolling_opponentScore': a_stats.get('rolling_opponentScore', 0),
                'opp_fatigue_index': 0, 
                'opp_home_strength_rating': a_stats.get('home_strength_rating', 0)
            }])

            # 3. Build Feature Row for AWAY Team (Inverse)
            away_features = pd.DataFrame([{
                'home': 0, 
                'fatigue_index': 0,
                'home_strength_rating': a_stats.get('home_strength_rating', 0),
                'rolling_teamScore': a_stats.get('rolling_teamScore', 0),
                'rolling_possessions': a_stats.get('rolling_possessions', 0),
                'rolling_fieldGoalsPercentage': a_stats.get('rolling_fieldGoalsPercentage', 0),
                'opp_rolling_teamScore': h_stats.get('rolling_teamScore', 0),
                'opp_rolling_possessions': h_stats.get('rolling_possessions', 0),
                'opp_rolling_opponentScore': h_stats.get('rolling_opponentScore', 0),
                'opp_fatigue_index': 0, 
                'opp_home_strength_rating': h_stats.get('home_strength_rating', 0)
            }])

            # 4. Predict Score for each
            pred_home_score = model.predict(home_features)[0]
            pred_away_score = model.predict(away_features)[0]
            
            # 5. Calculate Margin (Home - Away)
            pred_margin = pred_home_score - pred_away_score
            winner = home_name if pred_margin > 0 else away_name

            game['openbet_prediction'] = {
                'predicted_winner': winner,
                'predicted_margin': round(abs(pred_margin), 1),
                'raw_margin': pred_margin,
                'message': f"{winner} by {round(abs(pred_margin), 1)}",
                'home_score': round(pred_home_score, 1),
                'away_score': round(pred_away_score, 1)
            }
            print(f"   {away_name} @ {home_name} -> Pred: {winner} ({round(pred_home_score)} - {round(pred_away_score)})")
        else:
            print(f"   Skipping {away_name} @ {home_name} (Stats missing)")
            game['openbet_prediction'] = None

    with open(OUTPUT_FILE, 'w') as f:
        json.dump({"games": games, "last_updated": str(datetime.now())}, f, indent=2)
    print(f"Predictions saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()