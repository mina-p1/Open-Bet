#python3 -m backend.evaluation.evaluate_player_props

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

BACKEND_DIR   = Path(__file__).resolve().parent.parent
REPO_ROOT     = BACKEND_DIR.parent
TEST_STATS    = REPO_ROOT / "test_playerstats.csv"
RESULTS_DIR   = Path(__file__).resolve().parent / "results"
RESULTS_DIR.mkdir(exist_ok=True)

TARGETS      = ["points", "reboundsTotal", "assists", "threePointersMade"]
FEATURE_COLS = ["home_flag", "numMinutes"]


def _load_and_prepare() -> pd.DataFrame:
    if not TEST_STATS.exists():
        raise FileNotFoundError(f"test_playerstats.csv not found at {TEST_STATS}")

    df = pd.read_csv(TEST_STATS)

    #build playerName
    df["playerName"] = (
        df.get("firstName", pd.Series([""] * len(df))).fillna("")
        + " "
        + df.get("lastName",  pd.Series([""] * len(df))).fillna("")
    ).str.strip()

    df["home_flag"] = df["home"].fillna(0).astype(int)

    #ensure all target columns exist
    for t in TARGETS:
        if t not in df.columns:
            df[t] = np.nan

    #drop rows where we can't measure anything useful
    df = df.dropna(subset=["points", "numMinutes"])
    df = df.reset_index(drop=True)
    return df


def _eval_one_stat(df: pd.DataFrame, target: str) -> dict:
    """Train and evaluate a single RF model for one stat category."""
    sub = df.dropna(subset=[target]).copy()
    if len(sub) < 20:
        return {"target": target, "error": f"insufficient rows ({len(sub)})"}

    X = sub[FEATURE_COLS].fillna(0.0)
    y = sub[target].astype(float)

    #80/20 split
    split = int(len(X) * 0.8)
    X_train, X_test = X.iloc[:split], X.iloc[split:]
    y_train, y_test = y.iloc[:split], y.iloc[split:]

    model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)
    preds = model.predict(X_test)

    mae  = float(mean_absolute_error(y_test, preds))
    rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
    r2   = float(r2_score(y_test, preds))

    #binary signal - model pred > median(y_train) - "over" bet
    #mirrors real usage where the sportsbook line = the players historical median
    threshold = float(y_train.median())
    pred_over   = preds         > threshold
    actual_over = y_test.values > threshold

    TP = int(( pred_over  &  actual_over).sum())
    FP = int(( pred_over  & ~actual_over).sum())
    TN = int((~pred_over  & ~actual_over).sum())
    FN = int((~pred_over  &  actual_over).sum())

    fpr       = FP / (FP + TN) if (FP + TN) > 0 else 0.0
    precision = TP / (TP + FP) if (TP + FP) > 0 else 0.0
    recall    = TP / (TP + FN) if (TP + FN) > 0 else 0.0

    return {
        "target":    target,
        "n_test":    len(y_test),
        "threshold": round(threshold, 2),
        "MAE":       round(mae,  3),
        "RMSE":      round(rmse, 3),
        "R2":        round(r2,   4),
        "TP": TP, "FP": FP, "TN": TN, "FN": FN,
        "FPR":       round(fpr,       4),
        "precision": round(precision, 4),
        "recall":    round(recall,    4),
    }


def run_player_prop_evaluation(verbose: bool = True) -> dict[str, dict]:
    """
    Runs evaluation for every stat category.
    Returns a dict keyed by target name.
    """
    if verbose:
        print("\n=== OpenBet Player Prop Model Evaluation ===")
        print(f"Loading {TEST_STATS.name}…")

    df = _load_and_prepare()

    if verbose:
        print(f"Rows loaded: {len(df)}  |  Players: {df['playerName'].nunique()}")

    all_results: dict[str, dict] = {}
    all_preds_rows: list[dict]   = []

    for target in TARGETS:
        res = _eval_one_stat(df, target)
        all_results[target] = res

        if verbose:
            if "error" in res:
                print(f"\n  {target}: SKIPPED – {res['error']}")
            else:
                print(f"\n  ── {target} ──")
                print(f"    MAE={res['MAE']:.3f}  RMSE={res['RMSE']:.3f}  R²={res['R2']:.4f}")
                print(f"    Binary rule: pred > median ({res['threshold']}) = OVER signal")
                print(f"    TP={res['TP']}  FP={res['FP']}  TN={res['TN']}  FN={res['FN']}")
                print(f"    FPR={res['FPR']:.4f}  Precision={res['precision']:.4f}  Recall={res['recall']:.4f}")

    #save combined predictions into results CSV
    sub = df.dropna(subset=["points"]).copy()
    if len(sub) >= 20:
        split = int(len(sub) * 0.8)
        for target in TARGETS:
            sub2 = df.dropna(subset=[target]).copy()
            if len(sub2) < 20:
                continue
            X = sub2[FEATURE_COLS].fillna(0.0)
            y = sub2[target].astype(float)
            sp = int(len(X) * 0.8)
            m = RandomForestRegressor(n_estimators=100, random_state=42)
            m.fit(X.iloc[:sp], y.iloc[:sp])
            preds = m.predict(X.iloc[sp:])
            rows = sub2.iloc[sp:][["playerName", "gameDateTimeEst", target]].copy()
            rows[f"pred_{target}"] = preds
            rows[f"residual_{target}"] = y.iloc[sp:].values - preds
            all_preds_rows.append(rows.reset_index(drop=True))

    if all_preds_rows:
        combined = all_preds_rows[0]
        for extra in all_preds_rows[1:]:
            new_cols = [c for c in extra.columns if c not in combined.columns]
            combined = pd.concat([combined, extra[new_cols]], axis=1)
        csv_path = RESULTS_DIR / "player_props_predictions.csv"
        combined.to_csv(csv_path, index=False)
        if verbose:
            print(f"\nPredictions saved → {csv_path}")

    return all_results


if __name__ == "__main__":
    run_player_prop_evaluation(verbose=True)
