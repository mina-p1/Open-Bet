import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
import joblib

#  CONFIG
COL_HOME_ID = 'hometeamId'
COL_AWAY_ID = 'awayteamId'
COL_HOME_PTS = 'homeScore'
COL_AWAY_PTS = 'awayScore'


print("1. Loading data from 'box_scores/Games.csv'...")
try:
    # Read the CSV
    df = pd.read_csv('archive/box_scores/Games.csv')
    print(f"   Found {len(df)} games.")
except FileNotFoundError:
    print("Error: Could not find 'box_scores/Games.csv'.")
    exit()

print("2. Preparing Data...")
try:
    # 1. Create the Target Margin
   
    df['margin'] = df[COL_HOME_PTS] - df[COL_AWAY_PTS]

    #  drop games where scores are missing
    df = df.dropna(subset=[COL_HOME_ID, COL_AWAY_ID, 'margin'])

    X = df[[COL_HOME_ID, COL_AWAY_ID]]
    y = df['margin']

    print(f"   Training on {len(df)} completed games.")

    # 3. Train the Model
    print("3. Training Model...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # 4. Evaluate
    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    print(f"   Model Accuracy: On average, prediction is off by {mae:.2f} points.")

    # 5. Save
    print("4. Saving 'nba_model.pkl'...")
    joblib.dump(model, 'nba_model.pkl')
    print("SUCCESS! 'nba_model.pkl' created.")

except KeyError as e:
    print(f"\nERROR: The script couldn't find a column name: {e}")
    print("Check if your CSV headers match ")