import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
import os
import json
from datetime import datetime

# Config
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'archive', 'box_scores')
OUTPUT_FILE = os.path.join(BASE_DIR, 'prediction_history.json')

games_path = os.path.join(DATA_DIR, "Games.csv")
stats_path = os.path.join(DATA_DIR, "TeamStatistics.csv")
schedule_path = os.path.join(DATA_DIR, "LeagueSchedule25_26.csv")

print("LOADING DATA")
if not os.path.exists(games_path):
    print(f"Error: Files not found in {DATA_DIR}")
    exit()

df_games = pd.read_csv(games_path, low_memory=False)
df_stats = pd.read_csv(stats_path, low_memory=False)
df_schedule = pd.read_csv(schedule_path, low_memory=False)

#  Cleaning 
print("-CLEANING IDS & DATES -")

def clean_id(x):
    try:
        if pd.isna(x): return ""
        return str(int(float(x)))
    except:
        return str(x).strip()

df_games['gameId'] = df_games['gameId'].apply(clean_id)
for col in ['gameId', 'teamId', 'opponentTeamId']:
    if col in df_stats.columns: df_stats[col] = df_stats[col].apply(clean_id)
for col in ['gameId', 'homeTeamId', 'awayTeamId']:
    if col in df_schedule.columns: df_schedule[col] = df_schedule[col].apply(clean_id)

# Fix Dates 
df_stats['gameDateTimeEst'] = pd.to_datetime(df_stats['gameDateTimeEst'], utc=True, format='mixed', errors='coerce')
df_schedule['gameDateTimeEst'] = pd.to_datetime(df_schedule['gameDateTimeEst'], utc=True, format='mixed', errors='coerce')

# Sort 
df_stats = df_stats.sort_values(by=['teamId', 'gameDateTimeEst']).reset_index(drop=True)

#Filtering and sorting
print("--- FILTERING ---")
# Get valid game IDs excluding Preseason
if 'gameLabel' in df_games.columns:
    valid_ids = df_games[df_games['gameLabel'] != 'Preseason']['gameId'].unique()
    df_stats = df_stats[df_stats['gameId'].isin(valid_ids)]

# Ensure we have 2 rows for game (Home & Away)
df_stats = df_stats.drop_duplicates(subset=['gameId', 'teamId'])
game_counts = df_stats['gameId'].value_counts()
valid_game_ids = game_counts[game_counts == 2].index
df_stats = df_stats[df_stats['gameId'].isin(valid_game_ids)].reset_index(drop=True)

# FEATURE ENGINEERING
print("-ENGINEERING FEATURES")
df_stats = df_stats.fillna(0)

df_stats['possessions'] = (
    df_stats['fieldGoalsAttempted'] + 
    (0.44 * df_stats['freeThrowsAttempted']) - 
    df_stats['reboundsOffensive'] + 
    df_stats['turnovers']
)

# Rest impact
df_stats['prev_date'] = df_stats.groupby('teamId')['gameDateTimeEst'].shift(1)
df_stats['prev_home'] = df_stats.groupby('teamId')['home'].shift(1)
df_stats['rest_days'] = (df_stats['gameDateTimeEst'] - df_stats['prev_date']).dt.days
df_stats['rest_days'] = df_stats['rest_days'].fillna(3).clip(upper=7)

def calculate_fatigue(row):
    if row['rest_days'] > 1: return 0
    if row['prev_home'] == 1 and row['home'] == 1: return 1 
    if row['prev_home'] == 0 and row['home'] == 0: return 3 
    return 2

df_stats['fatigue_index'] = df_stats.apply(calculate_fatigue, axis=1)

# Home court advantage
df_stats['margin'] = df_stats['teamScore'] - df_stats['opponentScore']
df_stats['home_margin'] = np.where(df_stats['home'] == 1, df_stats['margin'], np.nan)
df_stats['home_strength'] = df_stats.groupby('teamId')['home_margin'].expanding().mean().shift().fillna(0).reset_index(0, drop=True)

# Rolling Stats (Last 10 Games)
features_to_roll = ['teamScore', 'opponentScore', 'fieldGoalsPercentage', 'possessions', 'reboundsTotal', 'assists']
rolling = df_stats.groupby('teamId')[features_to_roll].rolling(10, min_periods=1).mean().shift().reset_index(0, drop=True)
rolling.columns = [f'rolling_{col}' for col in rolling.columns]

# Combine
df_model = pd.concat([df_stats.drop(columns=['margin', 'home_margin']), rolling], axis=1)

# Merge Opponent Data
cols_needed = ['gameId', 'teamId', 'fatigue_index', 'home_strength'] + list(rolling.columns)
opponent_stats = df_model[cols_needed].copy()
opponent_stats.columns = ['gameId', 'opp_teamId', 'opp_fatigue', 'opp_strength'] + [f'opp_{c}' for c in rolling.columns]

full_data = pd.merge(df_model, opponent_stats, left_on=['gameId', 'opponentTeamId'], right_on=['gameId', 'opp_teamId'])
full_data = full_data.dropna()

# 
print("Model Training")
feature_cols = [
    'home', 'fatigue_index', 'home_strength',
    'rolling_teamScore', 'rolling_possessions', 'rolling_fieldGoalsPercentage',
    'opp_rolling_teamScore', 'opp_rolling_possessions', 'opp_rolling_opponentScore',
    'opp_fatigue', 'opp_strength'
]

X = full_data[feature_cols]
y = full_data['teamScore']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

mae = mean_absolute_error(y_test, model.predict(X_test))
print(f"Model complete. Test Set MAE: {mae:.2f}")

# HISTORIC PREDICTIONS 
print("\n--- 6. GENERATING HISTORY (Nov 1 to Today) ---")

# Define prediciton Window 
start_date = pd.Timestamp("2024-11-01").tz_localize('UTC') 
today = pd.Timestamp.now(tz='UTC')

# Get past games 
backtest_games = df_schedule[
    (df_schedule['gameDateTimeEst'] >= start_date) & 
    (df_schedule['gameDateTimeEst'] <= today)
].sort_values('gameDateTimeEst')

print(f"Simulating {len(backtest_games)} games...\n")

history_log = []

for index, row in backtest_games.iterrows():
    home_id, away_id = row['homeTeamId'], row['awayTeamId']
    game_date = row['gameDateTimeEst']
    game_id = row['gameId']
    
    # Back tracking logic: Get stats that existed BEFORE this game
    home_history = df_model[(df_model['teamId'] == home_id) & (df_model['gameDateTimeEst'] < game_date)]
    away_history = df_model[(df_model['teamId'] == away_id) & (df_model['gameDateTimeEst'] < game_date)]

    if home_history.empty or away_history.empty:
        continue

    home_stats = home_history.iloc[-1]
    away_stats = away_history.iloc[-1]

    #  Inputs
    home_input = pd.DataFrame([{
        'home': 1, 
        'fatigue_index': 0, 
        'home_strength': home_stats['home_strength'],
        'rolling_teamScore': home_stats['rolling_teamScore'],
        'rolling_possessions': home_stats['rolling_possessions'],
        'rolling_fieldGoalsPercentage': home_stats['rolling_fieldGoalsPercentage'],
        'opp_rolling_teamScore': away_stats['rolling_teamScore'],
        'opp_rolling_possessions': away_stats['rolling_possessions'],
        'opp_rolling_opponentScore': away_stats['rolling_opponentScore'],
        'opp_fatigue': 0, 
        'opp_strength': away_stats['home_strength']
    }])

    away_input = pd.DataFrame([{
        'home': 0, 
        'fatigue_index': 0, 
        'home_strength': away_stats['home_strength'],
        'rolling_teamScore': away_stats['rolling_teamScore'],
        'rolling_possessions': away_stats['rolling_possessions'],
        'rolling_fieldGoalsPercentage': away_stats['rolling_fieldGoalsPercentage'],
        'opp_rolling_teamScore': home_stats['rolling_teamScore'],
        'opp_rolling_possessions': home_stats['rolling_possessions'],
        'opp_rolling_opponentScore': home_stats['rolling_opponentScore'],
        'opp_fatigue': 0, 
        'opp_strength': home_stats['home_strength']
    }])

    # Predict
    pred_home = model.predict(home_input)[0]
    pred_away = model.predict(away_input)[0]
    
    pred_margin = pred_home - pred_away
    predicted_winner = row['homeTeamName'] if pred_margin > 0 else row['awayTeamName']

    # Check ACTUAL winner (from df_games)
    actual_game = df_games[df_games['gameId'] == game_id]
    
    is_correct = False
    actual_winner = "Unknown"

    if not actual_game.empty:
        # Pull scores from  Games.csv
        act_home = actual_game.iloc[0]['homeScore']
        act_away = actual_game.iloc[0]['awayScore']
        
        # Determine actual winner
        if act_home > act_away:
            actual_winner = row['homeTeamName']
            if pred_home > pred_away: is_correct = True
        else:
            actual_winner = row['awayTeamName']
            if pred_away > pred_home: is_correct = True

    # Log
    date_str = game_date.strftime('%Y-%m-%d')
    
    history_log.append({
        'date': date_str,
        'home_team': row['homeTeamName'],
        'away_team': row['awayTeamName'],
        'predicted_winner': predicted_winner,
        'actual_winner': actual_winner,
        'is_correct': is_correct,
        'predicted_home_score': round(pred_home, 1),
        'predicted_away_score': round(pred_away, 1)
    })
    
    # Console debug
    print(f"[{date_str}] {row['awayTeamName']} @ {row['homeTeamName']} | Pred: {predicted_winner}")

# Save to JSON
output_data = {"games": history_log}
with open(OUTPUT_FILE, 'w') as f:
    json.dump(output_data, f, indent=2)

print(f"\n✅ SUCCESS! History saved to {OUTPUT_FILE}")