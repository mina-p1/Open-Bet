import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
import joblib
import os

# =========================================================
# 1. PATHS (Keepin it same as the Team Model)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "archive", "box_scores")
# The player-specific files we need
player_stats_path = os.path.join(DATA_DIR, "PlayerStatistics.csv")
games_path = os.path.join(DATA_DIR, "Games.csv")

MODEL_PATH = os.path.join(BASE_DIR, "data", "player_prop_models.pkl")

# --- DATA LOADING ---
print("LOADING")
try:
    df_players = pd.read_csv(player_stats_path, low_memory=False)
    df_games = pd.read_csv(games_path, low_memory=False)
except FileNotFoundError as e:
    print(f"Error: {e}. Check if the csv files r in the right folder.")
    exit()

# CLEANING IDs (matching the team model logic)
def clean_id(x):
    try:
        if pd.isna(x): return ""
        s = str(x).strip()
        if s.endswith(".0"):
            try: return str(int(float(s)))
            except: return s
        return s
    except: return str(x).strip()

print("Cleaning IDs...")
for col in ["gameId", "personId", "playerteamId", "opponentteamId"]:
    if col in df_players.columns:
        df_players[col] = df_players[col].apply(clean_id)

if "gameId" in df_games.columns:
    df_games["gameId"] = df_games["gameId"].apply(clean_id)

# Filter out Preseason/All-Star so the model doesn't get confused
if "gameLabel" in df_games.columns:
    valid_ids = set(df_games[~df_games["gameLabel"].isin(["Preseason", "All-Star Game"])]["gameId"])
    df_players = df_players[df_players["gameId"].isin(valid_ids)]

# FEATURE ENGINEERING 
print("--- ENGINEERING PLAYER FEATURES ---")

# October 2024 
START_DATE = '2024-10-01'
df_players['gameDateTimeEst'] = pd.to_datetime(df_players['gameDateTimeEst'], utc=True)
df_players = df_players[df_players['gameDateTimeEst'] >= START_DATE].sort_values(['personId', 'gameDateTimeEst'])

TARGETS = ['points', 'reboundsTotal', 'assists', 'threePointersMade']
FEATURES_TO_ROLL = TARGETS + ['numMinutes']

# Rolling averages: looking back at the last 10 games
print("Calcrolling averages")
rolling_df = (
    df_players.groupby("personId")[FEATURES_TO_ROLL]
    .apply(lambda x: x.rolling(window=10, min_periods=1).mean().shift())
    .reset_index(level=0, drop=True)
)
rolling_df.columns = [f"rolling_{col}" for col in rolling_df.columns]

# Team Defense context: How much does the opp allow lately?
team_def = df_players.groupby(['playerteamCity', 'gameId'])[TARGETS].sum().reset_index()
team_def_rolling = (
    team_def.groupby('playerteamCity')[TARGETS]
    .apply(lambda x: x.rolling(10, min_periods=3).mean().shift())
    .reset_index(level=0, drop=True)
)
team_def_rolling.columns = [f"Opp_L10_{c}_Allowed" for c in TARGETS]
team_def = pd.concat([team_def[['playerteamCity', 'gameId']], team_def_rolling], axis=1)

# Merge everything back into one big df
df_model = pd.concat([df_players.reset_index(drop=True), rolling_df.reset_index(drop=True)], axis=1)
df_model = pd.merge(df_model, team_def, left_on=['opponentteamCity', 'gameId'], right_on=['playerteamCity', 'gameId'], how='left', suffixes=('', '_team'))

# TRAINING 
print("TRAINING Player Model")
feature_cols = ['home', 'rolling_points', 'rolling_reboundsTotal', 'rolling_assists', 'rolling_numMinutes', 
                'Opp_L10_points_Allowed', 'Opp_L10_reboundsTotal_Allowed']

# Only train on current season so the AI stays fresh
df_train = df_model[df_model['gameDateTimeEst'] >= '2025-10-01'].copy().fillna(0)

trained_models = {}
for target in TARGETS:
    print(f"Training {target} brain...")
    X = df_train[feature_cols]
    y = df_train[target].astype(float)
    
    # 80/20 split for testing
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Random Forest: 50 trees is usually plenty
    model = RandomForestRegressor(n_estimators=50, min_samples_split=10, random_state=42)
    model.fit(X_train, y_train)
    
    mae = mean_absolute_error(y_test, model.predict(X_test))
    print(f"MAE: +/- {mae:.2f} {target}")
    trained_models[target] = model

# --- 5. SAVING ARTIFACTS ---
print(" SAVING ")
latest_player_stats = {}
for pid in df_model["personId"].unique():
    p_data = df_model[df_model["personId"] == pid]
    if not p_data.empty:
        last_row = p_data.iloc[-1].to_dict()
        
        # We grab firstName and lastName from the CSV headers
        first = last_row.get('firstName', '')
        last = last_row.get('lastName', '')
        last_row['playerName'] = f"{first} {last}".strip()
        
        latest_player_stats[pid] = last_row
print(f"Debug, total players: {len(latest_player_stats)} ")
os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
joblib.dump({
    "models": trained_models, 
    "latest_stats": latest_player_stats, 
    "feature_cols": feature_cols
}, MODEL_PATH)

print(f"SUCCESS! Player prop models saved to: {MODEL_PATH}")