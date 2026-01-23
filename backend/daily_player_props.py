import os
import json
import requests
from datetime import datetime

from config_odds import ODDS_API_KEY  # single source of Odds API key

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
OUTPUT_FILE = os.path.join(DATA_DIR, "player_props.json")

API_KEY = ODDS_API_KEY
BASE_URL = "https://api.the-odds-api.com/v4/sports/basketball_nba"

# markets we care about
MARKETS = [
    "player_points",
    "player_rebounds",
    "player_assists",
    "player_threes",
    "player_points_rebounds_assists",
]


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

        # Odds API does not explicitly say which team each player is on.
        # The best we can do without a full mapping is:
        # - Treat *all* props in this game as belonging to BOTH sides contextually.
        # - For UI split, we will group by team_side = "HOME" or "AWAY", but the
        #   same player row will appear in both tables. Later, you can wire in a
        #   real player->team map and set team_side properly.
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
                    over_under = outcome.get("name")  # "Over" or "Under"

                    # Duplicate once for HOME and once for AWAY so the frontend
                    # can render two tables, one under each team name.
                    for team_side in ("HOME", "AWAY"):
                        all_props.append(
                            {
                                "game_id": event_id,
                                "home_team": home_team,
                                "away_team": away_team,
                                "commence_time": commence_time,
                                "team_side": team_side,  # "HOME" or "AWAY"
                                "bookmaker": book_title or book_key,
                                "market": market_key,
                                "player": player_name,
                                "line": line,
                                "price": price,
                                "over_under": over_under,
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
    print(f"Saved {len(props)} player props (with HOME/AWAY duplicates) to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
