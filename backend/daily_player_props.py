import os
import json
import requests
from datetime import datetime

import numpy as np
import joblib

from config_odds import ODDS_API_KEY
from nba_players_map import (
    build_player_team_map,
    normalize_player_name,
    normalize_team_name,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
OUTPUT_FILE = os.path.join(DATA_DIR, "player_props.json")

API_KEY = ODDS_API_KEY
BASE_URL = "https://api.the-odds-api.com/v4/sports/basketball_nba"

MARKETS = [
    "player_points",
    "player_rebounds",
    "player_assists",
    "player_threes",
    "player_points_rebounds_assists",
]

# ---------- LOAD PLAYER PROP MODEL (POINTS / REB / AST) ----------

PLAYER_MODEL_PATH = os.path.join(BASE_DIR, "data", "player_prop_model.pkl")

try:
    player_artifact = joblib.load(PLAYER_MODEL_PATH)
    pts_model = player_artifact["points_model"]
    reb_model = player_artifact["rebounds_model"]
    ast_model = player_artifact["assists_model"]
    player_feature_cols = player_artifact["feature_cols"]
    latest_player_stats = player_artifact["latest_player_stats"]
    print(f"Loaded player prop model from {PLAYER_MODEL_PATH}")
except Exception as e:
    print("WARNING: Could not load player prop model:", e)
    pts_model = reb_model = ast_model = None
    player_feature_cols = []
    latest_player_stats = {}


def map_player_to_side(player_name, home_team, away_team, player_team_map):
    """
    Decide whether this player belongs to the home or away team.

    Uses:
    - player_team_map (from nba_api) to get normalized team name.
    - normalized home/away team names from Odds API.

    Returns "HOME", "AWAY", or None (if we are not confident).
    """
    if not player_name:
        return None

    norm_name = normalize_player_name(player_name)
    player_team_norm = player_team_map.get(norm_name)
    if not player_team_norm:
        return None

    home_norm = normalize_team_name(home_team)
    away_norm = normalize_team_name(away_team)

    # exact match
    if player_team_norm == home_norm:
        return "HOME"
    if player_team_norm == away_norm:
        return "AWAY"

    # loose contains match, e.g., "los angeles lakers" vs "lakers"
    if player_team_norm in home_norm or home_norm in player_team_norm:
        return "HOME"
    if player_team_norm in away_norm or away_norm in player_team_norm:
        return "AWAY"

    return None


def predict_player_stat(
    player_name,
    market_key,
    latest_player_stats,
    player_feature_cols,
    pts_model,
    reb_model,
    ast_model,
):
    """
    Returns a dict with prediction info for the given player and market, or None.

    expected_value: projected stat (points / rebounds / assists)
    label: name of stat
    """
    # Bail out if the model isn’t available
    if (
        not latest_player_stats
        or not player_feature_cols
        or pts_model is None
        or reb_model is None
        or ast_model is None
    ):
        return None

    feat_row = latest_player_stats.get(player_name)
    if not feat_row:
        return None

    try:
        X = np.array(
            [feat_row.get(c, 0.0) for c in player_feature_cols], dtype=float
        ).reshape(1, -1)
    except Exception:
        return None

    if market_key == "player_points":
        model = pts_model
        label = "points"
    elif market_key == "player_rebounds":
        model = reb_model
        label = "rebounds"
    elif market_key == "player_assists":
        model = ast_model
        label = "assists"
    else:
        # We only support these three right now
        return None

    try:
        pred = float(model.predict(X)[0])
    except Exception:
        return None

    return {
        "expected_value": round(pred, 1),
        "label": label,
        "model": "rf_player_prop",
    }


def fetch_player_props():
    try:
        events_resp = requests.get(
            f"{BASE_URL}/events", params={"apiKey": API_KEY}, timeout=10
        )
        events_resp.raise_for_status()
        events = events_resp.json()
    except requests.RequestException as e:
        print("Events API error:", e)
        return []

    player_team_map = build_player_team_map()
    all_props = []

    for ev in events:
        event_id = ev.get("id")
        home_team = ev.get("home_team")
        away_team = ev.get("away_team")
        commence_time = ev.get("commence_time")

        if not event_id:
            continue

        try:
            odds_resp = requests.get(
                f"{BASE_URL}/events/{event_id}/odds",
                params={
                    "apiKey": API_KEY,
                    "regions": "us",
                    "markets": ",".join(MARKETS),
                    "oddsFormat": "american",
                },
                timeout=15,
            )
            if odds_resp.status_code == 204 or not odds_resp.text.strip():
                continue

            if odds_resp.status_code == 429:
                print(
                    "Rate limited for event",
                    event_id,
                    "- skipping props for this game",
                )
                continue

            odds_resp.raise_for_status()
            odds_data = odds_resp.json()
        except requests.HTTPError as e:
            if odds_resp.status_code == 422:
                continue
            print("Event odds HTTP error:", e, odds_resp.text)
            continue
        except requests.RequestException as e:
            print("Event odds API error:", e)
            continue

        for bookmaker in odds_data.get("bookmakers", []):
            book_key = bookmaker.get("key")
            book_title = bookmaker.get("title")

            for market in bookmaker.get("markets", []):
                market_key = market.get("key")
                if market_key not in MARKETS:
                    continue

                for outcome in market.get("outcomes", []):
                    player_name = outcome.get("description") or outcome.get("name")
                    line = outcome.get("point")
                    price = outcome.get("price")
                    over_under = outcome.get("name")  # "Over" / "Under"

                    team_side = map_player_to_side(
                        player_name, home_team, away_team, player_team_map
                    )
                    if team_side not in ("HOME", "AWAY"):
                        team_side = "UNKNOWN"

                    # ---------- NEW: model prediction for points / reb / ast ----------
                    prediction = predict_player_stat(
                        player_name,
                        market_key,
                        latest_player_stats,
                        player_feature_cols,
                        pts_model,
                        reb_model,
                        ast_model,
                    )

                    edge_vs_line = None
                    if prediction is not None and line is not None:
                        try:
                            edge_vs_line = round(
                                prediction["expected_value"] - float(line), 1
                            )
                        except Exception:
                            edge_vs_line = None

                    all_props.append(
                        {
                            "game_id": event_id,
                            "home_team": home_team,
                            "away_team": away_team,
                            "commence_time": commence_time,
                            "team_side": team_side,
                            "bookmaker": book_title or book_key,
                            "market": market_key,
                            "player": player_name,
                            "line": line,
                            "price": price,
                            "over_under": over_under,
                            "prop_prediction": prediction,
                            "edge_vs_line": edge_vs_line,
                        }
                    )

    return all_props


def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    props = fetch_player_props()
    payload = {
        "last_updated": datetime.utcnow().isoformat() + "Z",
        "props": props,
    }
    with open(OUTPUT_FILE, "w") as f:
        json.dump(payload, f, indent=2)
    print(f"Saved {len(props)} player props to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
