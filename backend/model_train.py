import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
import joblib
import os

# ---------- PATHS ----------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data", "box_scores")

games_path = os.path.join(DATA_DIR, "Games.csv")
stats_path = os.path.join(DATA_DIR, "TeamStatistics.csv")
schedule_path = os.path.join(DATA_DIR, "LeagueSchedule25_26.csv")

MODEL_PATH = os.path.join(BASE_DIR, "data", "nba_model.pkl")

print("-- LOADING DATA ---")
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
            except:
                return s
        return s
    except:
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

if "teamId" in df_stats.columns:
    df_stats = df_stats.sort_values(by=["teamId", "gameDateTimeEst"]).reset_index(
        drop=True
    )

print("--- FILTERING ---")

if "gameLabel" in df_games.columns:
    valid_games = df_games[
        ~df_games["gameLabel"].isin(["Preseason", "All-Star Game"])
    ]
    valid_ids = set(valid_games["gameId"].astype(str).unique())
    if "gameId" in df_stats.columns:
        df_stats = df_stats[df_stats["gameId"].isin(valid_ids)]
        df_stats = df_stats.drop_duplicates(
            subset=["gameId", "teamId"], keep="first"
        )

print(f"Stats Rows after cleaning: {len(df_stats)}")

print("---ENGINEERING FEATURES ---")

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

df_stats["point_margin"] = df_stats["teamScore"].astype(float) - df_stats[
    "opponentScore"
].astype(float)

df_stats["home_margin_only"] = df_stats.apply(
    lambda x: x["point_margin"] if x.get("home", 0) == 1 else np.nan, axis=1
)

df_stats["home_strength_rating"] = (
    df_stats.groupby("teamId")["home_margin_only"]
    .apply(lambda x: x.expanding().mean().shift().ffill())
    .reset_index(level=0, drop=True)
    .fillna(0)
)

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

cols_needed = ["gameId", "teamId", "home_strength_rating"] + list(rolling_df.columns)

df_stats_only = df_model[cols_needed].copy()

opponent_stats = df_stats_only.rename(
    columns={
        "teamId": "opp_teamId",
        "home_strength_rating": "opp_home_strength_rating",
        **{col: f"opp_{col}" for col in rolling_df.columns},
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

print("--- TRAINING ---")

full_data["fatigue_index"] = 0
full_data["opp_fatigue_index"] = 0

feature_cols = [
    "home",
    "fatigue_index",
    "home_strength_rating",
    "rolling_teamScore",
    "rolling_possessions",
    "rolling_fieldGoalsPercentage",
    "opp_rolling_teamScore",
    "opp_rolling_possessions",
    "opp_rolling_opponentScore",
    "opp_fatigue_index",
    "opp_home_strength_rating",
]

for c in feature_cols:
    if c not in full_data.columns:
        full_data[c] = 0.0

X = full_data[feature_cols].fillna(0)
y = full_data["teamScore"].astype(float)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

mae = mean_absolute_error(y_test, model.predict(X_test))
print(f"✅ Model Success! MAE: {mae:.2f}")

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
