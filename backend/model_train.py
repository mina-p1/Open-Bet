import pandas as pd
import numpy as np
import joblib
import os

from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# ---------- PATHS ----------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data", "box_scores")

games_path = os.path.join(DATA_DIR, "Games.csv")
stats_path = os.path.join(DATA_DIR, "TeamStatistics.csv")

MODEL_PATH = os.path.join(BASE_DIR, "data", "nba_model.pkl")
RANDOM_STATE = 42

print("--- STEP 1: LOADING DATA ---")
try:
    df_games = pd.read_csv(games_path, low_memory=False)
    df_stats = pd.read_csv(stats_path, low_memory=False)
except FileNotFoundError as e:
    print(f"Error: {e}")
    print(f"Check Games.csv and TeamStatistics.csv are in: {DATA_DIR}")
    exit()

print("Cleaning IDs...")

def clean_id(x):
    try:
        if pd.isna(x):
            return ""
        if isinstance(x, float):
            if np.isnan(x):
                return ""
            return str(int(x))
        s = str(x).strip()
        if s.endswith(".0"):
            try:
                return str(int(float(s)))
            except Exception:
                return s
        return s
    except Exception:
        return str(x).strip()

if "gameId" in df_games.columns:
    df_games["gameId"] = df_games["gameId"].apply(clean_id)

for col in ["gameId", "teamId", "opponentTeamId"]:
    if col in df_stats.columns:
        df_stats[col] = df_stats[col].apply(clean_id)

# Fix dates, sort
if "gameDateTimeEst" in df_stats.columns:
    df_stats["gameDateTimeEst"] = pd.to_datetime(
        df_stats["gameDateTimeEst"], utc=True, errors="coerce"
    )

if "teamId" in df_stats.columns and "gameDateTimeEst" in df_stats.columns:
    df_stats = df_stats.sort_values(by=["teamId", "gameDateTimeEst"]).reset_index(drop=True)

print("--- STEP 2: FILTERING ---")

if "gameLabel" in df_games.columns and "gameId" in df_games.columns:
    valid_games = df_games[~df_games["gameLabel"].isin(["Preseason", "All-Star Game"])]
    valid_ids = set(valid_games["gameId"].astype(str).unique())
    print(f"Valid Games found: {len(valid_ids)}")
    if "gameId" in df_stats.columns:
        df_stats = df_stats[df_stats["gameId"].isin(valid_ids)]

df_stats = df_stats.drop_duplicates(subset=["gameId", "teamId"], keep="first").reset_index(drop=True)

if "gameId" in df_stats.columns:
    game_counts   = df_stats["gameId"].value_counts()
    complete_ids  = game_counts[game_counts == 2].index
    df_stats      = df_stats[df_stats["gameId"].isin(complete_ids)].reset_index(drop=True)

print(f"Stats Rows after cleaning: {len(df_stats)}")

print("--- STEP 3: ENGINEERING FEATURES ---")

cols_to_fill = [
    "fieldGoalsAttempted",
    "freeThrowsAttempted",
    "reboundsOffensive",
    "turnovers",
]
for col in cols_to_fill:
    if col not in df_stats.columns:
        df_stats[col] = 0

df_stats["possessions"] = (
    df_stats["fieldGoalsAttempted"].astype(float)
    + (0.44 * df_stats["freeThrowsAttempted"].astype(float))
    - df_stats["reboundsOffensive"].astype(float)
    + df_stats["turnovers"].astype(float)
)

# Fatigue
df_stats["prev_game_date"] = df_stats.groupby("teamId")["gameDateTimeEst"].shift(1)
df_stats["prev_home"]      = df_stats.groupby("teamId")["home"].shift(1)
df_stats["rest_days"]      = (df_stats["gameDateTimeEst"] - df_stats["prev_game_date"]).dt.days
df_stats["rest_days"]      = df_stats["rest_days"].fillna(3).clip(upper=7)

def calculate_fatigue(row):
    if pd.isna(row.get("rest_days", None)):
        return 0
    if row["rest_days"] > 1:
        return 0
    prev_home = row.get("prev_home", np.nan)
    if prev_home == 1 and row.get("home", 0) == 1:
        return 1
    if prev_home == 0 and row.get("home", 0) == 0:
        return 3
    return 2

df_stats["fatigue_index"] = df_stats.apply(calculate_fatigue, axis=1)

# Home strength
df_stats["point_margin"] = (
    df_stats["teamScore"].astype(float) - df_stats["opponentScore"].astype(float)
)
df_stats["home_margin_only"] = df_stats.apply(
    lambda x: x["point_margin"] if x.get("home", 0) == 1 else np.nan, axis=1
)
df_stats["home_strength_rating"] = (
    df_stats.groupby("teamId")["home_margin_only"]
    .apply(lambda x: x.expanding().mean().shift().ffill())
    .reset_index(level=0, drop=True)
    .fillna(0)
)

# Rolling features
features_to_roll = [
    "teamScore",
    "opponentScore",
    "fieldGoalsPercentage",
    "possessions",
    "reboundsTotal",
    "assists",
]

for f in features_to_roll:
    if f not in df_stats.columns:
        df_stats[f] = 0.0

rolling_df = (
    df_stats.groupby("teamId")[features_to_roll]
    .apply(lambda x: x.rolling(window=10, min_periods=1).mean().shift())
    .reset_index(level=0, drop=True)
)
rolling_df.columns = [f"rolling_{col}" for col in rolling_df.columns]

df_model = pd.concat(
    [df_stats.reset_index(drop=True), rolling_df.reset_index(drop=True)], axis=1
)

# Extra recent-form features (L3/L5 net rating)
df_model["net_margin"] = df_model["teamScore"].astype(float) - df_model["opponentScore"].astype(float)

def add_short_windows(group):
    group = group.sort_values("gameDateTimeEst")
    group["L3_teamScore"]  = group["teamScore"].shift(1).rolling(3, min_periods=1).mean()
    group["L3_oppScore"]   = group["opponentScore"].shift(1).rolling(3, min_periods=1).mean()
    group["L5_teamScore"]  = group["teamScore"].shift(1).rolling(5, min_periods=1).mean()
    group["L5_oppScore"]   = group["opponentScore"].shift(1).rolling(5, min_periods=1).mean()
    group["L5_net_margin"] = group["net_margin"].shift(1).rolling(5, min_periods=1).mean()
    return group

df_model = df_model.groupby("teamId", group_keys=False).apply(add_short_windows)

# Opponent stats mirror
cols_needed = [
    "gameId", "teamId", "fatigue_index", "home_strength_rating",
    "rolling_teamScore", "rolling_opponentScore",
    "rolling_possessions", "rolling_fieldGoalsPercentage",
    "L3_teamScore", "L3_oppScore", "L5_teamScore", "L5_oppScore", "L5_net_margin"
]

df_stats_only = df_model[cols_needed].copy()

opponent_stats = df_stats_only.rename(
    columns={
        "teamId": "opp_teamId",
        "fatigue_index": "opp_fatigue_index",
        "home_strength_rating": "opp_home_strength_rating",
        "rolling_teamScore": "opp_rolling_teamScore",
        "rolling_opponentScore": "opp_rolling_opponentScore",
        "rolling_possessions": "opp_rolling_possessions",
        "rolling_fieldGoalsPercentage": "opp_rolling_fieldGoalsPercentage",
        "L3_teamScore": "opp_L3_teamScore",
        "L3_oppScore": "opp_L3_oppScore",
        "L5_teamScore": "opp_L5_teamScore",
        "L5_oppScore": "opp_L5_oppScore",
        "L5_net_margin": "opp_L5_net_margin",
    }
)

full_data = pd.merge(
    df_model,
    opponent_stats,
    left_on=["gameId", "opponentTeamId"],
    right_on=["gameId", "opp_teamId"],
    how="inner",
    suffixes=("", "_opp"),
)

print("--- STEP 4: TRAINING (Gradient Boosting) ---")

full_data = full_data.dropna(subset=["gameDateTimeEst"])
full_data = full_data.sort_values("gameDateTimeEst").reset_index(drop=True)

feature_cols = [
    "home",
    "fatigue_index",
    "home_strength_rating",
    "rolling_teamScore",
    "rolling_possessions",
    "rolling_fieldGoalsPercentage",
    "rolling_opponentScore",
    "L3_teamScore",
    "L3_oppScore",
    "L5_teamScore",
    "L5_oppScore",
    "L5_net_margin",
    "opp_rolling_teamScore",
    "opp_rolling_possessions",
    "opp_rolling_opponentScore",
    "opp_rolling_fieldGoalsPercentage",
    "opp_L3_teamScore",
    "opp_L3_oppScore",
    "opp_L5_teamScore",
    "opp_L5_oppScore",
    "opp_L5_net_margin",
    "opp_fatigue_index",
    "opp_home_strength_rating",
]

for c in feature_cols:
    if c not in full_data.columns:
        full_data[c] = 0.0

X = full_data[feature_cols].astype(float)
y = full_data["teamScore"].astype(float)

X = X.fillna(0.0)

# Time-based split (80/20) to prevent data leakage
split_idx = int(len(full_data) * 0.8)
X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

model = GradientBoostingRegressor(
    loss="squared_error",
    n_estimators=400,
    learning_rate=0.03,
    max_depth=3,
    subsample=0.7,
    random_state=RANDOM_STATE,
)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
mae  = mean_absolute_error(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))
r2   = r2_score(y_test, y_pred)

print("===== MODEL PERFORMANCE (GBR) =====")
print(f"MAE  : {mae:.3f}")
print(f"RMSE : {rmse:.3f}")
print(f"R²   : {r2:.3f}")
print("===================================")

print("--- STEP 5: SAVING ARTIFACTS ---")

latest_stats = {}
all_teams = df_model["teamId"].unique()

for team in all_teams:
    team_data = df_model[df_model["teamId"] == team]
    if not team_data.empty:
        latest_stats[team] = team_data.iloc[-1].to_dict()

os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
joblib.dump(
    {"model": model, "latest_stats": latest_stats, "feature_cols": feature_cols},
    MODEL_PATH,
)

print(f"SUCCESS! '{MODEL_PATH}' created")
