#pytest backend/tests/test_api_routes.py -v

import json
import sys
import os
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


from app import app

@pytest.fixture()
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


# test historical data
#api/historical-data
class TestHistoricalData:
    def test_returns_list_without_date(self, client):
        resp = client.get("/api/historical-data")
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, list), "Expected a JSON array"
        # ≤20 games in the default view
        assert len(data) <= 20

    def test_each_game_has_required_fields(self, client):
        resp = client.get("/api/historical-data")
        assert resp.status_code == 200
        games = resp.get_json()
        required = {"game_date", "team_name_home", "team_name_away", "pts_home", "pts_away"}
        for game in games:
            assert required.issubset(game.keys()), (
                f"Game object missing fields: {required - game.keys()}"
            )

    def test_date_filter_returns_only_matching_games(self, client):
        resp = client.get("/api/historical-data?date=2026-04-10")
        assert resp.status_code == 200
        games = resp.get_json()
        if games:
            for g in games:
                assert g["game_date"] == "2026-04-10", (
                    f"Game with unexpected date: {g['game_date']}"
                )

    def test_unknown_date_returns_empty_list(self, client):
        resp = client.get("/api/historical-data?date=2099-01-01")
        assert resp.status_code == 200
        assert resp.get_json() == []



# test live nba odds data
#/api/live-nba-odds
class TestLiveNBAOdds:
    def test_returns_list_of_games(self, client):
        resp = client.get("/api/live-nba-odds")
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, list)

    def test_game_objects_have_expected_keys(self, client):
        resp = client.get("/api/live-nba-odds")
        assert resp.status_code == 200
        games = resp.get_json()
        if not games:
            pytest.skip("No live games in snapshot – skipping field check")
        first = games[0]
        # At minimum a game object needs team identification
        assert any(k in first for k in ["home_team", "homeTeam", "home"]), (
            f"No team field found in game object: {list(first.keys())}"
        )

    def test_missing_file_returns_404(self, client):
        import builtins
        original_open = builtins.open

        def _raise_fnf(*args, **kwargs):
            if "todays_data.json" in str(args[0]):
                raise FileNotFoundError("mocked missing file")
            return original_open(*args, **kwargs)

        with patch("builtins.open", side_effect=_raise_fnf):
            resp = client.get("/api/live-nba-odds")
        assert resp.status_code == 404
        assert "error" in resp.get_json()


# api/prediction-history
#test presiction history
class TestPredictionHistory:
    def test_returns_dict_with_games_key(self, client):
        resp = client.get("/api/prediction-history")
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, dict)
        assert "games" in data, f"Expected 'games' key, got: {list(data.keys())}"

    def test_games_list_is_non_empty(self, client):
        resp = client.get("/api/prediction-history")
        games = resp.get_json().get("games", [])
        assert len(games) > 0, "games list should not be empty"

    def test_prediction_record_has_required_fields(self, client):
        resp   = client.get("/api/prediction-history")
        record = resp.get_json()["games"][0]
        required = {
            "date", "home_team", "away_team",
            "predicted_winner", "actual_winner", "is_correct",
            "predicted_home_score", "predicted_away_score",
        }
        assert required.issubset(record.keys()), (
            f"Missing fields: {required - record.keys()}"
        )

    def test_is_correct_is_boolean(self, client):
        resp   = client.get("/api/prediction-history")
        record = resp.get_json()["games"][0]
        assert isinstance(record["is_correct"], bool)


#/api/player-props
#tests player props
class TestPlayerProps:
    def test_returns_list(self, client):
        resp = client.get("/api/player-props")
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, list), "Expected a JSON array of player props"

    def test_prop_objects_have_player_field(self, client):
        resp  = client.get("/api/player-props")
        props = resp.get_json()
        if not props:
            pytest.skip("No props in snapshot")
        assert "player" in props[0], f"Missing 'player' key: {list(props[0].keys())}"

    def test_prop_objects_have_market_field(self, client):
        resp  = client.get("/api/player-props")
        props = resp.get_json()
        if not props:
            pytest.skip("No props in snapshot")
        assert "market" in props[0]


    def test_edge_vs_line_is_numeric_when_present(self, client):
        resp  = client.get("/api/player-props")
        props = resp.get_json()
        for p in props:
            if "edge_vs_line" in p:
                assert isinstance(p["edge_vs_line"], (int, float)), (
                    f"edge_vs_line should be numeric, got: {type(p['edge_vs_line'])}"
                )
                break


#test arbitrage
class TestArbitrage:
    @patch("app.requests.get")
    def test_returns_list_when_arb_found(self, mock_get, client):
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = [
            {
                "id":             "game_001",
                "home_team":      "Lakers",
                "away_team":      "Celtics",
                "commence_time":  "2026-04-15T00:00:00Z",
                "bookmakers": [
                    {
                        "title": "FanDuel",
                        "markets": [{
                            "key": "h2h",
                            "outcomes": [
                                {"name": "Lakers",  "price": 200},
                                {"name": "Celtics", "price": 250},
                            ],
                        }],
                    },
                    {
                        "title": "DraftKings",
                        "markets": [{
                            "key": "h2h",
                            "outcomes": [
                                {"name": "Lakers",  "price": 300},
                                {"name": "Celtics", "price": 200},
                            ],
                        }],
                    },
                ],
            }
        ]
        mock_get.return_value = mock_response

        resp = client.get("/api/arbitrage")
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, list)

    @patch("app.requests.get")
    def test_arb_result_fields(self, mock_get, client):
        """Arbitrage objects must expose the fields the ArbitrageTable component uses."""
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = [
            {
                "id": "arb_game",
                "home_team": "Lakers", "away_team": "Celtics",
                "commence_time": "2026-04-15T00:00:00Z",
                "bookmakers": [
                    {"title": "BookA", "markets": [{"key": "h2h", "outcomes": [
                        {"name": "Lakers",  "price": 350},
                        {"name": "Celtics", "price": -500},
                    ]}]},
                    {"title": "BookB", "markets": [{"key": "h2h", "outcomes": [
                        {"name": "Lakers",  "price": -500},
                        {"name": "Celtics", "price": 350},
                    ]}]},
                ],
            }
        ]
        mock_get.return_value = mock_response

        resp = client.get("/api/arbitrage")
        data = resp.get_json()
        if data:
            expected_keys = {
                "home_team", "away_team", "home_book", "away_book",
                "home_price", "away_price", "guaranteed_profit",
                "guaranteed_profit_pct", "edge_percent",
            }
            assert expected_keys.issubset(data[0].keys()), (
                f"Missing arb keys: {expected_keys - data[0].keys()}"
            )




#test google autth
class TestGoogleAuth:
    def test_missing_token_returns_error(self, client):
        with patch("app.id_token.verify_oauth2_token", side_effect=ValueError("bad token")):
            resp = client.post(
                "/api/auth/google",
                json={"token": "invalid_token_xyz"},
                content_type="application/json",
            )
        assert resp.status_code == 401
        assert resp.get_json().get("error") == "Invalid token"

    def test_missing_body_returns_error(self, client):
        with patch("app.id_token.verify_oauth2_token", side_effect=ValueError("no token")):
            resp = client.post("/api/auth/google", json={}, content_type="application/json")
        assert resp.status_code == 401


#test api/user/update
class TestUserUpdate:
    def test_missing_uid_returns_400(self, client):
        resp = client.put(
            "/api/user/update",
            json={"displayName": "Test User"},
            content_type="application/json",
        )
        assert resp.status_code == 400
        assert "error" in resp.get_json()
