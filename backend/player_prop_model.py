import os
import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data", "box_scores")
MODEL_PATH = os.path.join(BASE_DIR, "data", "player_prop_model.pkl")


def load_data():
    games_path = os.path.join(DATA_DIR, "Games.csv")
    stats_path = os.path.join(DATA_DIR, "TeamStatistics.csv")

    try:
        df_games = pd.read_csv(games_path, low_memory=False)
        df_stats = pd.read_csv(stats_path, low_memory=False)
    except FileNotFoundError as e:
        print(f"Error: {e}")
        print(f"Check Games.csv and TeamStatistics.csv are in: {DATA_DIR}")
        raise

    # We assume player‑level stats are in TeamStatistics.csv with player columns
    # If your dataset uses different names, adjust here.
    # Typical fields: playerName, points, reboundsTotal, assists, minutes, gameDateTimeEst, home.
    return df_games, df_stats


def engineer_player_features(df_stats: pd.DataFrame):
    # Ensure columns exist
    needed_cols = [
        "playerName",
        "teamId",
        "opponentTeamId",
        "gameDateTimeEst",
        "home",
        "points",
        "reboundsTotal",
        "assists",
        "minutes",
    ]
    for col in needed_cols:
        if col not in df_stats.columns:
            df_stats[col] = 0

    # Clean / sort
    df_stats["gameDateTimeEst"] = pd.to_datetime(
        df_stats["gameDateTimeEst"], utc=True, errors="coerce"
    )
    df_stats = df_stats.sort_values(
        by=["playerName", "gameDateTimeEst"]
    ).reset_index(drop=True)

    # Rolling features per player (last 10 games)
    features_to_roll = [
        "points",
        "reboundsTotal",
        "assists",
        "minutes",
    ]

    rolling_df = (
        df_stats.groupby("playerName")[features_to_roll]
        .apply(lambda x: x.rolling(window=10, min_periods=3).mean().shift())
        .reset_index(level=0, drop=True)
    )
    rolling_df.columns = [f"roll10_{c}" for c in rolling_df.columns]

    df_model = pd.concat(
        [df_stats.reset_index(drop=True), rolling_df.reset_index(drop=True)], axis=1
    )

    # Basic context features
    df_model["home_flag"] = df_model["home"].fillna(0).astype(int)

    # Drop rows without enough history
    df_model = df_model.dropna(
        subset=["roll10_points", "roll10_reboundsTotal", "roll10_assists"]
    )

    return df_model


def train_prop_model(df_model: pd.DataFrame, target_col: str):
    feature_cols = [
        "home_flag",
        "roll10_points",
        "roll10_reboundsTotal",
        "roll10_assists",
        "roll10_minutes",
    ]

    for c in feature_cols:
        if c not in df_model.columns:
            df_model[c] = 0.0

    X = df_model[feature_cols].fillna(0.0)
    y = df_model[target_col].astype(float)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = RandomForestRegressor(
        n_estimators=150,
        max_depth=None,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    print(f"{target_col} model MAE: {mae:.2f}")

    return model, feature_cols


def build_latest_player_stats(df_model: pd.DataFrame, feature_cols):
    latest_stats = {}
    players = df_model["playerName"].unique()

    for name in players:
        sub = df_model[df_model["playerName"] == name]
        if sub.empty:
            continue
        latest_stats[name] = sub.iloc[-1][feature_cols].to_dict()

    return latest_stats


def main():
    print("--- LOADING DATA (PLAYER PROPS MODEL) ---")
    df_games, df_stats = load_data()

    print("--- ENGINEERING PLAYER FEATURES ---")
    df_model = engineer_player_features(df_stats)

    # Filter to rows with targets
    df_pts = df_model.dropna(subset=["points"])
    df_reb = df_model.dropna(subset=["reboundsTotal"])
    df_ast = df_model.dropna(subset=["assists"])

    print("--- TRAINING POINTS MODEL ---")
    pts_model, feature_cols = train_prop_model(df_pts, "points")

    print("--- TRAINING REBOUNDS MODEL ---")
    reb_model, _ = train_prop_model(df_reb, "reboundsTotal")

    print("--- TRAINING ASSISTS MODEL ---")
    ast_model, _ = train_prop_model(df_ast, "assists")

    print("--- BUILDING LATEST PLAYER STATS LOOKUP ---")
    latest_stats = build_latest_player_stats(df_model, feature_cols)

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    artifact = {
        "points_model": pts_model,
        "rebounds_model": reb_model,
        "assists_model": ast_model,
        "feature_cols": feature_cols,
        "latest_player_stats": latest_stats,
    }
    joblib.dump(artifact, MODEL_PATH)
    print(f"SUCCESS! '{MODEL_PATH}' created")


if __name__ == "__main__":
    main()
