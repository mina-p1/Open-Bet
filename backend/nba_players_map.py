# nba_players_map.py

import os
import json
from datetime import datetime, timedelta

from nba_api.stats.static import teams
from nba_api.stats.endpoints import commonteamroster  # <-- new

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
CACHE_FILE = os.path.join(DATA_DIR, "nba_player_team_map.json")

CACHE_TTL_DAYS = 1  # refresh daily


def normalize_player_name(name: str) -> str:
    if not name:
        return ""
    s = name.strip().lower()
    for ch in [".", ",", "'", "`"]:
        s = s.replace(ch, "")
    parts = s.split()
    return " ".join(parts)


def normalize_team_name(name: str) -> str:
    if not name:
        return ""
    s = name.strip().lower()
    if s.startswith("the "):
        s = s[4:]
    for ch in [".", ",", "'", "`"]:
        s = s.replace(ch, "")
    s = " ".join(s.split())
    return s


def _load_cache():
    if not os.path.exists(CACHE_FILE):
        return None
    try:
        with open(CACHE_FILE, "r") as f:
            payload = json.load(f)
        ts = payload.get("last_updated")
        if not ts:
            return None
        last_updated = datetime.fromisoformat(ts)
        if datetime.utcnow() - last_updated > timedelta(days=CACHE_TTL_DAYS):
            return None
        return payload.get("map", {})
    except Exception as e:
        print("Failed to read player-team cache:", e)
        return None


def _save_cache(map_dict):
    os.makedirs(DATA_DIR, exist_ok=True)
    payload = {
        "last_updated": datetime.utcnow().isoformat(),
        "map": map_dict,
    }
    with open(CACHE_FILE, "w") as f:
        json.dump(payload, f, indent=2)
    print(f"Saved player-team map with {len(map_dict)} players to {CACHE_FILE}")


def build_player_team_map():
    """
    Returns dict: normalized_player_name -> normalized_team_name
    using current rosters from commonteamroster.
    """
    cached = _load_cache()
    if cached is not None:
        return cached

    print("Building player-team map via commonteamroster...")

    all_teams = teams.get_teams()
    mapping = {}

    for t in all_teams:
        team_id = t.get("id")
        full_name = t.get("full_name")
        if not team_id or not full_name:
            continue

        team_norm = normalize_team_name(full_name)

        try:
            roster = commonteamroster.CommonTeamRoster(team_id=team_id)
            df = roster.common_team_roster.get_data_frame()
        except Exception as e:
            print("Roster error for team_id", team_id, ":", e)
            continue

        for _, row in df.iterrows():
            player_name = row.get("PLAYER")
            if not player_name:
                continue
            key = normalize_player_name(player_name)
            mapping[key] = team_norm

    _save_cache(mapping)
    return mapping
