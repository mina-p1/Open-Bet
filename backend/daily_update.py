import os
import requests
import joblib
import json
import pandas as pd
from datetime import datetime
from config_odds import ODDS_API_KEY

# ---------- CONFIG & PATHS ----------
API_KEY = ODDS_API_KEY
ODDS_API_URL = "https://api.the-odds-api.com/v4/sports/basketball_nba/odds"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Loading both models now!
TEAM_MODEL_PATH = os.path.join(BASE_DIR, "data", "nba_model.pkl")
PLAYER_MODEL_PATH = os.path.join(BASE_DIR, "data", "player_prop_models.pkl")

# Two separate outputs for your site
TEAM_OUTPUT = os.path.join(BASE_DIR,  "todays_data.json")
PLAYER_OUTPUT = os.path.join(BASE_DIR,  "todays_player_projections.json")

TEAM_MAP = {
    "Atlanta Hawks": "1610612737", "Boston Celtics": "1610612738", "Brooklyn Nets": "1610612751",
    "Charlotte Hornets": "1610612766", "Chicago Bulls": "1610612741", "Cleveland Cavaliers": "1610612739",
    "Dallas Mavericks": "1610612742", "Denver Nuggets": "1610612743", "Detroit Pistons": "1610612765",
    "Golden State Warriors": "1610612744", "Houston Rockets": "1610612745", "Indiana Pacers": "1610612754",
    "Los Angeles Clippers": "1610612746", "LA Clippers": "1610612746", "Los Angeles Lakers": "1610612747",
    "Memphis Grizzlies": "1610612763", "Miami Heat": "1610612748", "Milwaukee Bucks": "1610612749",
    "Minnesota Timberwolves": "1610612750", "New Orleans Pelicans": "1610612740", "New York Knicks": "1610612752",
    "Oklahoma City Thunder": "1610612760", "Orlando Magic": "1610612753", "Philadelphia 76ers": "1610612755",
    "Phoenix Suns": "1610612756", "Portland Trail Blazers": "1610612757", "Sacramento Kings": "1610612758",
    "San Antonio Spurs": "1610612759", "Toronto Raptors": "1610612761", "Utah Jazz": "1610612762",
    "Washington Wizards": "1610612764",
}

def main():
    # 1. LOAD BOTH MODELS
    # ---------------------------------------------------------
    if not os.path.exists(TEAM_MODEL_PATH) or not os.path.exists(PLAYER_MODEL_PATH):
        print("ERROR: One of the models missing. Run  training scripts.")
        return

    print("Loading Team and Player brains...")
    team_art = joblib.load(TEAM_MODEL_PATH)
    play_art = joblib.load(PLAYER_MODEL_PATH)

    # 2. FETCH LIVE ODDS
    # ---------------------------------------------------------
    print("Fetching live matchups...")
    params = {"regions": "us", "markets": "h2h,spreads", "oddsFormat": "american", "apiKey": API_KEY}
    resp = requests.get(ODDS_API_URL, params=params)
    
    try:
        games = resp.json()
    except:
        print("Odds API failed.")
        return

    # 3. TEAM PREDICTIONS (Win/Loss)
    
    print(f"Generating winners for {len(games)} games...")
    t_model = team_art["model"]
    t_latest = team_art["latest_stats"]

    for game in games:
        h_name, a_name = game.get("home_team"), game.get("away_team")
        h_id, a_id = TEAM_MAP.get(h_name), TEAM_MAP.get(a_name)

        if h_id and a_id and h_id in t_latest and a_id in t_latest:
            h_stats, a_stats = t_latest[h_id], t_latest[a_id]
            
            feat = pd.DataFrame([{
                "home": 1, "fatigue_index": 0,
                "home_strength_rating": h_stats.get("home_strength_rating", 0),
                "rolling_teamScore": h_stats.get("rolling_teamScore", 0),
                "rolling_possessions": h_stats.get("rolling_possessions", 0),
                "rolling_fieldGoalsPercentage": h_stats.get("rolling_fieldGoalsPercentage", 0),
                "opp_rolling_teamScore": a_stats.get("rolling_teamScore", 0),
                "opp_rolling_possessions": a_stats.get("rolling_possessions", 0),
                "opp_rolling_opponentScore": a_stats.get("rolling_opponentScore", 0),
                "opp_fatigue_index": 0, "opp_home_strength_rating": a_stats.get("home_strength_rating", 0)
            }])
            
            pred_home = t_model.predict(feat)[0]
            game["openbet_prediction"] = {"predicted_home_score": round(pred_home, 1)}

    # 4. PLAYER PROP PROJECTIONS (Pts, Reb, Ast, 3PM)
    print("Generating Player Projections...")
    p_models = play_art["models"]
    p_latest = play_art["latest_stats"] # dict of personId -> last stats
    p_features = play_art["feature_cols"]

    player_projections = []
    for p_id, stats in p_latest.items():
        today_feat = pd.DataFrame([stats])[p_features].fillna(0)
        
        p_entry = {"player_id": str(p_id), "name": stats.get('playerName', 'NBA Player')}
        for target, model in p_models.items():
            p_entry[target] = round(float(model.predict(today_feat)[0]), 2)
        
        player_projections.append(p_entry)

    # 5. SAVE BOTH JSON FILES
    with open(TEAM_OUTPUT, "w") as f:
        json.dump({"games": games, "last_updated": str(datetime.now())}, f, indent=2)

    with open(PLAYER_OUTPUT, "w") as f:
        json.dump({"date": str(datetime.now().date()), "projections": player_projections}, f, indent=2)

    print(f" SUCCESS! Both {TEAM_OUTPUT} and {PLAYER_OUTPUT} are ready.")

if __name__ == "__main__":
    main()