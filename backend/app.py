from flask import Flask, jsonify, request
from flask_cors import CORS

import pandas as pd
import os
import requests
import json
import math

# --- NEW IMPORTS FOR AUTH ---
import firebase_admin
from firebase_admin import credentials, firestore
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

app = Flask(__name__)
CORS(app)

# --- FIREBASE SETUP 
if not firebase_admin._apps:
    # Check if we are on Render Secret File
    if os.path.exists("/etc/secrets/serviceAccountKey.json"):
        cred = credentials.Certificate("/etc/secrets/serviceAccountKey.json")
    else:
        # Local fallback
        cred = credentials.Certificate("serviceAccountKey.json") 
        
    firebase_admin.initialize_app(cred)

db = firestore.client()
GOOGLE_CLIENT_ID = "67516129655-7dvqsh49bolnse50d2ibumtrsaj1gfkj.apps.googleusercontent.com"

# ---------- AUTH ROUTE (NEW) ----------
@app.route('/api/auth/google', methods=['POST'])
def google_auth():
    token = request.json.get('token')

    try:
        # verify token with google
        id_info = id_token.verify_oauth2_token(
            token, 
            google_requests.Request(), 
            GOOGLE_CLIENT_ID
        )

        # grab user info
        uid = id_info['sub']
        email = id_info['email']
        name = id_info.get('name', 'User')
        picture = id_info.get('picture', '')

        # check if user exists in firestore
        user_ref = db.collection('users').document(uid)
        doc = user_ref.get()

        if not doc.exists:
            user_data = {
                "uid": uid,
                "email": email,
                "name": name,
                "picture": picture,
                "role": "user",
                "favorites": [],
                "created_at": firestore.SERVER_TIMESTAMP 
            }
            # save new user
            user_ref.set(user_data)
            
            # HAD TO FIX THIS:
            # server timestamp crashes json so converting to string manually
            user_data["created_at"] = str(firestore.SERVER_TIMESTAMP) 

        else:
            user_data = doc.to_dict()

        return jsonify({"message": "Success", "user": user_data}), 200

    except ValueError:
        return jsonify({"error": "Invalid token"}), 401
    

@app.route('/api/user/update', methods=['PUT'])
def update_user_profile():
    # updates display name or fav team
    data = request.json
    uid = data.get('uid')
    
    if not uid:
        return jsonify({"error": "User ID required"}), 400

    try:
        user_ref = db.collection('users').document(uid)
        
        updates = {}
        if 'favoriteTeam' in data:
            updates['favoriteTeam'] = data['favoriteTeam']
        if 'displayName' in data:
            updates['displayName'] = data['displayName']
            
        if updates:
            user_ref.update(updates)
            
        # send back fresh data
        updated_doc = user_ref.get()
        return jsonify({"message": "Profile updated", "user": updated_doc.to_dict()}), 200

    except Exception as e:
        print("Update error:", e)
        return jsonify({"error": str(e)}), 500


#              DISCUSSION BOARD                    #
####################################################

@app.route('/api/discussions', methods=['GET'])
def get_discussions():
    # grab msgs for a specific date e.g. ?date=2026-02-06
    date_str = request.args.get('date') 
    
    if not date_str:
        return jsonify({"error": "Date required"}), 400

    try:
        # looking inside 'threads' -> date -> 'messages'
        messages_ref = db.collection('threads').document(date_str).collection('messages')
        
        # newest first
        docs = messages_ref.order_by('created_at', direction=firestore.Query.DESCENDING).stream()
        
        messages = []
        for doc in docs:
            msg = doc.to_dict()
            msg['id'] = doc.id
            # fix timestamp for json again
            if 'created_at' in msg and msg['created_at']:
                msg['created_at'] = str(msg['created_at'])
            messages.append(msg)
            
        return jsonify(messages), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/discussions', methods=['POST'])
def create_discussion():
    # posting to a specific date thread
    data = request.json
    date_str = data.get('date') 
    
    if not data.get('text') or not date_str:
        return jsonify({"error": "Missing data"}), 400

    try:
        new_msg = {
            "uid": data['uid'],
            "name": data.get('name', 'Anonymous'),
            "text": data['text'],
            "created_at": firestore.SERVER_TIMESTAMP,
        }
        
        # save it to the subcollection
        db.collection('threads').document(date_str).collection('messages').add(new_msg)
        
        return jsonify({"message": "Posted!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------- BASE DATA DIR (SMALL FILES ONLY) ----------

BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, "data")
BOX_DIR = os.path.join(DATA_DIR, "box_scores")

CSV_PATH = os.path.join(BOX_DIR, "Games.csv")


# ---------- HISTORICAL SCORES ----------

@app.route("/api/historical-data")
def get_historical_data():
    game_date = request.args.get("date")
    try:
        df = pd.read_csv(
            CSV_PATH,
            usecols=[
                "gameDateTimeEst",
                "hometeamName",
                "awayteamName",
                "homeScore",
                "awayScore",
            ],
        )
        df = df.rename(columns={"gameDateTimeEst": "gameDate"})
        df["gameDateOnly"] = df["gameDate"].astype(str).str.split(" ").str[0]

        if game_date:
            filtered = df[df["gameDateOnly"] == game_date]
        else:
            filtered = df

        filtered = filtered.sort_values("gameDate", ascending=False)

        games_list = []
        for _, row in filtered.iterrows():
            games_list.append(
                {
                    "game_date": row["gameDateOnly"],
                    "team_name_home": row["hometeamName"],
                    "team_name_away": row["awayteamName"],
                    "pts_home": row["homeScore"],
                    "pts_away": row["awayScore"],
                }
            )

        return jsonify(games_list if game_date else games_list[:20])
    except Exception as e:
        print("Data error:", e)
        return jsonify({"error": str(e)}), 500


# ---------- TODAY'S ODDS + PREDICTIONS ----------

@app.route("/api/live-nba-odds")
def get_live_nba_odds():
    try:
        json_path = os.path.join(DATA_DIR, "todays_data.json")
        with open(json_path, "r") as f:
            data = json.load(f)
        return jsonify(data["games"])
    except FileNotFoundError:
        return jsonify({"error": "No daily data found. Run run_openbet_all.py first."}), 404
    except Exception as e:
        print("Error serving batch data:", e)
        return jsonify({"error": str(e)}), 500


# ---------- HISTORICAL PREDICTION HISTORY ----------

@app.route("/api/prediction-history")
def get_prediction_history():
    try:
        json_path = os.path.join(DATA_DIR, "prediction_history.json")
        with open(json_path, "r") as f:
            data = json.load(f)
        return jsonify(data)
    except FileNotFoundError:
        return jsonify({"ERROR": "No history file. Did you run run_openbet_all.py?"}), 404
    except Exception as e:
        print("History error:", e)
        return jsonify({"error": str(e)}), 500


# ---------- PLAYER PROPS (SERVE SNAPSHOT) ----------


@app.route("/api/player-props")
def get_player_props():
    try:
        json_path = os.path.join(DATA_DIR, "player_props.json")
        with open(json_path, "r") as f:
            data = json.load(f)
        return jsonify(data.get("props", []))
    except FileNotFoundError:
        return (
            jsonify(
                {
                    "error": "No player props snapshot found. Run run_openbet_all.py (daily_player_props.py)."
                }
            ),
            404,
        )
    except Exception as e:
        print("Player props error:", e)
        return jsonify({"error": str(e)}), 500





# ---------- ARBITRAGE ENDPOINT (UNCHANGED) ----------

def american_to_prob(odds):
    if odds is None:
        return None
    try:
        o = float(odds)
    except (TypeError, ValueError):
        return None
    if o > 0:
        return 100.0 / (o + 100.0)
    else:
        return -o / (-o + 100.0)


@app.route("/api/arbitrage")
def get_arbitrage():
    API_KEY = "39fc4ed3a7caf51b49d87d08ec90658a"
    ODDS_URL = "https://api.the-odds-api.com/v4/sports/basketball_nba/odds"

    params = {
        "apiKey": API_KEY,
        "regions": "us",
        "markets": "h2h",
        "oddsFormat": "american",
    }

    try:
        resp = requests.get(ODDS_URL, params=params, timeout=10)
        resp.raise_for_status()
        events = resp.json()
    except requests.HTTPError as e:
        body = resp.text if "resp" in locals() else ""
        print("Arb odds HTTP error:", e, body)
        return (
            jsonify({"error": str(e), "body": body}),
            resp.status_code if "resp" in locals() else 500,
        )
    except requests.RequestException as e:
        print("Arb odds API error:", e)
        return jsonify({"error": str(e)}), 500

    opportunities = []
    BANKROLL = 100.0

    for ev in events:
        game_id = ev.get("id")
        home_team = ev.get("home_team")
        away_team = ev.get("away_team")
        commence_time = ev.get("commence_time")

        best_home = None
        best_away = None

        for book in ev.get("bookmakers", []):
            book_name = book.get("title") or book.get("key")
            for market in book.get("markets", []):
                if market.get("key") != "h2h":
                    continue
                for outcome in market.get("outcomes", []):
                    name = outcome.get("name")
                    price = outcome.get("price")
                    if name == home_team:
                        if (best_home is None) or (price > best_home[0]):
                            best_home = (price, book_name)
                    elif name == away_team:
                        if (best_away is None) or (price > best_away[0]):
                            best_away = (price, book_name)

        if not best_home or not best_away:
            continue

        home_price, home_book = best_home
        away_price, away_book = best_away

        p_home = american_to_prob(home_price)
        p_away = american_to_prob(away_price)
        if p_home is None or p_away is None:
            continue

        total_prob = p_home + p_away
        edge = 1.0 - total_prob
        if edge <= 0:
            continue

        stake_home = BANKROLL * (p_away / total_prob)
        stake_away = BANKROLL * (p_home / total_prob)

        if home_price > 0:
            ret_home = stake_home * (home_price / 100.0) + stake_home
        else:
            ret_home = stake_home * (100.0 / -home_price) + stake_home

        if away_price > 0:
            ret_away = stake_away * (away_price / 100.0) + stake_away
        else:
            ret_away = stake_away * (100.0 / -away_price) + stake_away

        guaranteed_return = min(ret_home, ret_away)
        profit = guaranteed_return - BANKROLL
        profit_pct = profit / BANKROLL * 100.0

        opportunities.append(
            {
                "game_id": game_id,
                "home_team": home_team,
                "away_team": away_team,
                "commence_time": commence_time,
                "home_book": home_book,
                "home_price": home_price,
                "away_book": away_book,
                "away_price": away_price,
                "total_implied_prob": round(total_prob * 100.0, 2),
                "edge_percent": round(edge * 100.0, 2),
                "bankroll": BANKROLL,
                "stake_home": round(stake_home, 2),
                "stake_away": round(stake_away, 2),
                "guaranteed_profit": round(profit, 2),
                "guaranteed_profit_pct": round(profit_pct, 2),
            }
        )

    return jsonify(opportunities)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=True)
