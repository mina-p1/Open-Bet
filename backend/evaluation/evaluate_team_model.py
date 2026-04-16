#python3 -m backend.evaluation.evaluate_team_model


from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


BACKEND_DIR  = Path(__file__).resolve().parent.parent
ARCHIVE_DIR  = BACKEND_DIR / "archive" / "box_scores"
DATA_DIR     = BACKEND_DIR / "data" / "box_scores"
HISTORY_PATH = BACKEND_DIR / "data" / "prediction_history.json"
RESULTS_DIR  = Path(__file__).resolve().parent / "results"
RESULTS_DIR.mkdir(exist_ok=True)


def _pick_data_dir() -> Path:
    #prefers the large archive, fall back to the smaller data snapshot
    for d in [ARCHIVE_DIR, DATA_DIR]:
        if (d / "TeamStatistics.csv").exists():
            return d
    raise FileNotFoundError(
    )


def _clean_id(x) -> str:
    try:
        if pd.isna(x):
            return ""
        s = str(x).strip()
        if s.endswith(".0"):
            return str(int(float(s)))
        return s
    except Exception:
        return str(x).strip()


def _add_short_window_features(df: pd.DataFrame) -> pd.DataFrame:
    # Adds L3/L5 rolling features per team without losing the teamId column
    df = df.copy()
    df["net_margin"] = df["teamScore"].astype(float) - df["opponentScore"].astype(float)
    for tid in df["teamId"].unique():
        mask = df["teamId"] == tid
        sub  = df.loc[mask].sort_values("gameDateTimeEst")
        idx  = sub.index
        df.loc[idx, "L3_teamScore"]  = sub["teamScore"].shift(1).rolling(3,  min_periods=1).mean().values
        df.loc[idx, "L3_oppScore"]   = sub["opponentScore"].shift(1).rolling(3,  min_periods=1).mean().values
        df.loc[idx, "L5_teamScore"]  = sub["teamScore"].shift(1).rolling(5,  min_periods=1).mean().values
        df.loc[idx, "L5_oppScore"]   = sub["opponentScore"].shift(1).rolling(5,  min_periods=1).mean().values
        df.loc[idx, "L5_net_margin"] = sub["net_margin"].shift(1).rolling(5,  min_periods=1).mean().values
    return df


def build_feature_matrix() -> tuple[pd.DataFrame, list[str]]:
    #Reproduce the exact feature engineering from model_train.py
    data_dir = _pick_data_dir()
    df_games = pd.read_csv(data_dir / "Games.csv",         low_memory=False)
    df_stats = pd.read_csv(data_dir / "TeamStatistics.csv", low_memory=False)

    # clean IDs
    if "gameId" in df_games.columns:
        df_games["gameId"] = df_games["gameId"].apply(_clean_id)
    for col in ["gameId", "teamId", "opponentTeamId"]:
        if col in df_stats.columns:
            df_stats[col] = df_stats[col].apply(_clean_id)

    # sort by days
    df_stats["gameDateTimeEst"] = pd.to_datetime(
        df_stats["gameDateTimeEst"], utc=True, errors="coerce"
    )
    df_stats = df_stats.sort_values(["teamId", "gameDateTimeEst"]).reset_index(drop=True)

    # filter out non regular season games
    if "gameLabel" in df_games.columns:
        valid_ids = set(
            df_games[~df_games["gameLabel"].isin(["Preseason", "All-Star Game"])]["gameId"]
            .astype(str).unique()
        )
        df_stats = df_stats[df_stats["gameId"].isin(valid_ids)]

    df_stats = df_stats.drop_duplicates(subset=["gameId", "teamId"], keep="first").reset_index(drop=True)
    gc = df_stats["gameId"].value_counts()
    df_stats = df_stats[df_stats["gameId"].isin(gc[gc == 2].index)].reset_index(drop=True)

    # derived features
    for col in ["fieldGoalsAttempted", "freeThrowsAttempted", "reboundsOffensive", "turnovers"]:
        if col not in df_stats.columns:
            df_stats[col] = 0

    df_stats["possessions"] = (
        df_stats["fieldGoalsAttempted"].astype(float)
        + 0.44 * df_stats["freeThrowsAttempted"].astype(float)
        - df_stats["reboundsOffensive"].astype(float)
        + df_stats["turnovers"].astype(float)
    )
    df_stats["prev_game_date"] = df_stats.groupby("teamId")["gameDateTimeEst"].shift(1)
    df_stats["prev_home"]      = df_stats.groupby("teamId")["home"].shift(1)
    df_stats["rest_days"]      = (
        (df_stats["gameDateTimeEst"] - df_stats["prev_game_date"]).dt.days
        .fillna(3).clip(upper=7)
    )

    def _fatigue(row):
        if row["rest_days"] > 1:
            return 0
        ph = row.get("prev_home", np.nan)
        if ph == 1 and row.get("home", 0) == 1:
            return 1
        if ph == 0 and row.get("home", 0) == 0:
            return 3
        return 2

    df_stats["fatigue_index"] = df_stats.apply(_fatigue, axis=1)
    df_stats["point_margin"]  = (
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

    ftr = ["teamScore", "opponentScore", "fieldGoalsPercentage", "possessions", "reboundsTotal", "assists"]
    for f in ftr:
        if f not in df_stats.columns:
            df_stats[f] = 0.0

    rolling_df = (
        df_stats.groupby("teamId")[ftr]
        .apply(lambda x: x.rolling(10, min_periods=1).mean().shift())
        .reset_index(level=0, drop=True)
    )
    rolling_df.columns = [f"rolling_{c}" for c in rolling_df.columns]
    df_model = pd.concat([df_stats.reset_index(drop=True), rolling_df.reset_index(drop=True)], axis=1)

    #short window features
    df_model = _add_short_window_features(df_model)

    # opponent mirror
    cols_needed = [
        "gameId", "teamId", "fatigue_index", "home_strength_rating",
        "rolling_teamScore", "rolling_opponentScore", "rolling_possessions",
        "rolling_fieldGoalsPercentage", "L3_teamScore", "L3_oppScore",
        "L5_teamScore", "L5_oppScore", "L5_net_margin",
    ]
    df_s = df_model[cols_needed].copy()
    opp  = df_s.rename(columns={
        "teamId":                     "opp_teamId",
        "fatigue_index":              "opp_fatigue_index",
        "home_strength_rating":       "opp_home_strength_rating",
        "rolling_teamScore":          "opp_rolling_teamScore",
        "rolling_opponentScore":      "opp_rolling_opponentScore",
        "rolling_possessions":        "opp_rolling_possessions",
        "rolling_fieldGoalsPercentage": "opp_rolling_fieldGoalsPercentage",
        "L3_teamScore":               "opp_L3_teamScore",
        "L3_oppScore":                "opp_L3_oppScore",
        "L5_teamScore":               "opp_L5_teamScore",
        "L5_oppScore":                "opp_L5_oppScore",
        "L5_net_margin":              "opp_L5_net_margin",
    })

    full_data = pd.merge(
        df_model, opp,
        left_on=["gameId", "opponentTeamId"],
        right_on=["gameId", "opp_teamId"],
        how="inner",
        suffixes=("", "_dup"),
    )
    full_data = (
        full_data.dropna(subset=["gameDateTimeEst"])
        .sort_values("gameDateTimeEst")
        .reset_index(drop=True)
    )

    feature_cols = [
        "home", "fatigue_index", "home_strength_rating",
        "rolling_teamScore", "rolling_possessions", "rolling_fieldGoalsPercentage",
        "rolling_opponentScore", "L3_teamScore", "L3_oppScore",
        "L5_teamScore", "L5_oppScore", "L5_net_margin",
        "opp_rolling_teamScore", "opp_rolling_possessions", "opp_rolling_opponentScore",
        "opp_rolling_fieldGoalsPercentage", "opp_L3_teamScore", "opp_L3_oppScore",
        "opp_L5_teamScore", "opp_L5_oppScore", "opp_L5_net_margin",
        "opp_fatigue_index", "opp_home_strength_rating",
    ]
    for c in feature_cols:
        if c not in full_data.columns:
            full_data[c] = 0.0

    return full_data, feature_cols


def compute_confusion_matrix_from_history() -> dict:
    with open(HISTORY_PATH, "r") as fh:
        raw = json.load(fh)

    games = raw.get("games", raw) if isinstance(raw, dict) else raw
    df    = pd.DataFrame(games)

    df["pred_home_win"]   = df["predicted_winner"] == df["home_team"]
    df["actual_home_win"] = df["actual_winner"]     == df["home_team"]

    TP = int(( df["pred_home_win"]  &  df["actual_home_win"]).sum())
    FP = int(( df["pred_home_win"]  & ~df["actual_home_win"]).sum())
    TN = int((~df["pred_home_win"]  & ~df["actual_home_win"]).sum())
    FN = int((~df["pred_home_win"]  &  df["actual_home_win"]).sum())

    fpr       = FP / (FP + TN) if (FP + TN) > 0 else 0.0
    precision = TP / (TP + FP) if (TP + FP) > 0 else 0.0
    recall    = TP / (TP + FN) if (TP + FN) > 0 else 0.0
    accuracy  = (TP + TN) / len(df) if len(df) > 0 else 0.0

    return {
        "n_games":   len(df),
        "TP":        TP,
        "FP":        FP,
        "TN":        TN,
        "FN":        FN,
        "FPR":       round(fpr,       4),
        "precision": round(precision, 4),
        "recall":    round(recall,    4),
        "accuracy":  round(accuracy,  4),
    }


def run_team_evaluation(verbose: bool = True) -> dict:
    if verbose:
        print("\n=== OpenBet Team Model Evaluation ===")

    full_data, feature_cols = build_feature_matrix()

    X = full_data[feature_cols].astype(float).fillna(0.0)
    y = full_data["teamScore"].astype(float)

    split_idx = int(len(full_data) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

    if verbose:
        print(f"Training on {len(X_train):,} rows, testing on {len(X_test):,} rows…")

    model = GradientBoostingRegressor(
        loss="squared_error",
        n_estimators=400,
        learning_rate=0.03,
        max_depth=3,
        subsample=0.7,
        random_state=42,
    )
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    mae  = float(mean_absolute_error(y_test, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    r2   = float(r2_score(y_test, y_pred))

    if verbose:
        print(f"\n── Regression Metrics (held-out 20%) ──")
        print(f"  MAE  : {mae:.3f} points")
        print(f"  RMSE : {rmse:.3f} points")
        print(f"  R²   : {r2:.4f}")

    # save predictions vs actuals CSV
    results_df = full_data.iloc[split_idx:][["gameDateTimeEst", "teamId", "teamScore"]].copy()
    results_df["predicted_score"] = y_pred
    results_df["residual"]        = y_test.values - y_pred
    csv_path = RESULTS_DIR / "team_predictions_vs_actuals.csv"
    results_df.to_csv(csv_path, index=False)
    if verbose:
        print(f"\n  Predictions saved → {csv_path}")

    # confusion matrix from history
    cm = compute_confusion_matrix_from_history()
    if verbose:
        print(f"\n── Confusion Matrix (N={cm['n_games']} predictions from history) ──")
        print(f"  Binary rule : predicted_winner == home_team")
        print(f"  TP={cm['TP']}  FP={cm['FP']}  TN={cm['TN']}  FN={cm['FN']}")
        print(f"  FPR       = {cm['FPR']:.4f}  ({cm['FP']}/{cm['FP']+cm['TN']})")
        print(f"  Precision = {cm['precision']:.4f}")
        print(f"  Recall    = {cm['recall']:.4f}")
        print(f"  Accuracy  = {cm['accuracy']:.4f}")

    return {
        "MAE":  mae,
        "RMSE": rmse,
        "R2":   r2,
        "n_train": len(X_train),
        "n_test":  len(X_test),
        **cm,
    }


if __name__ == "__main__":
    run_team_evaluation(verbose=True)
