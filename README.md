# Daily Update 
Run his every morning to get today's games and update the site

cd Open-Bet/backend
python3 daily_update.py
*NEW* 
python3 update_history.py

UPDATE OddsTable Message
git add Open-Bet/backend/todays_data.json
git commit -m "Daily odds update"
git push

# Deploy latest commit on render (Render should do this automaitclly)

# Updated Python Code or Data:
git push

# Updated React app:
cd Open-Bet
npm run build
firebase deploy

-------------------------

# First-Time Start
Run this once to generate the Model and the initial json data file

cd src/backend
python3 model_train.py    *Creates nba_model.pkl
python3 daily_update.py  *Creates todays_data.json

# To run on local
Run these in two separate terminals

# Terminal 1 (Backend Server)
cd Open-Bet/backend
python3 app.py

# Terminal 2 (React Frontend)
cd src/frontend
npm start


# Terminal 3 (Tailwind CSS)
cd Open-Bet
npm run build:css