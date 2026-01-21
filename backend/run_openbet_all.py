import os
import subprocess
import sys
import shutil
import zipfile
from pathlib import Path

# Kaggle dataset id
DATASET = "eoinamoore/historical-nba-data-and-player-box-scores"

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "archive" / "box_scores_tmp"   # temp download dir
FINAL_DIR = BASE_DIR / "archive" / "box_scores"      # where your code expects CSVs

def run_cmd(cmd_list, cwd=None):
    print(f"\n=== Running: {' '.join(cmd_list)} ===")
    result = subprocess.run(cmd_list, cwd=cwd)
    if result.returncode != 0:
        print(f"Command failed: {' '.join(cmd_list)}")
        sys.exit(result.returncode)

def download_kaggle_csvs():
    # clean temp dir
    if DATA_DIR.exists():
        shutil.rmtree(DATA_DIR)
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    print("\n=== Downloading Kaggle CSVs ===")
    # download three CSVs individually (each comes as a small zip)
    for filename in ["Games.csv", "TeamStatistics.csv", "LeagueSchedule25_26.csv"]:
        run_cmd([
            "kaggle", "datasets", "download",
            "-d", DATASET,
            "-p", str(DATA_DIR),
            "-f", filename,
        ])

    # extract each zip and move CSVs into FINAL_DIR
    FINAL_DIR.mkdir(parents=True, exist_ok=True)

    for zip_file in DATA_DIR.glob("*.zip"):
        print(f"Extracting {zip_file.name}...")
        with zipfile.ZipFile(zip_file, "r") as z:
            z.extractall(DATA_DIR)
        zip_file.unlink()

    for name in ["Games.csv", "TeamStatistics.csv", "LeagueSchedule25_26.csv"]:
        src = DATA_DIR / name
        if not src.exists():
            print(f"ERROR: {name} not found after extract.")
            sys.exit(1)
        dst = FINAL_DIR / name
        if dst.exists():
            dst.unlink()
        shutil.move(str(src), str(dst))
        print(f"Placed {name} at {dst}")

    # clean temp dir
    shutil.rmtree(DATA_DIR)

def main():
    # 1) Get fresh Kaggle CSVs into archive/box_scores/
    download_kaggle_csvs()

    # 2) Train model
    run_cmd([sys.executable, "model_train.py"])

    # 3) Build historical prediction history
    run_cmd([sys.executable, "update_history.py"])

    # 4) Generate today's odds + predictions
    run_cmd([sys.executable, "daily_update.py"])

    print("\n✅ OpenBet pipeline complete.")

if __name__ == "__main__":
    main()
