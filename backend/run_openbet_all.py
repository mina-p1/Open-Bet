import os
import subprocess
import sys
import shutil
import zipfile
from pathlib import Path

DATASET = "eoinamoore/historical-nba-data-and-player-box-scores"

BASE_DIR = Path(__file__).resolve().parent
TMP_DIR = BASE_DIR / "tmp_kaggle"
BOX_DIR = BASE_DIR / "data" / "box_scores"


def run_cmd(cmd_list, cwd=None):
    print(f"\n=== Running: {' '.join(cmd_list)} ===")
    result = subprocess.run(cmd_list, cwd=cwd)
    if result.returncode != 0:
        print(f"Command failed: {' '.join(cmd_list)}")
        sys.exit(result.returncode)


def download_kaggle_csvs():
    if TMP_DIR.exists():
        shutil.rmtree(TMP_DIR)
    TMP_DIR.mkdir(parents=True, exist_ok=True)

    print("\n=== Downloading Kaggle CSVs ===")
    for filename in ["Games.csv", "TeamStatistics.csv", "LeagueSchedule25_26.csv"]:
        run_cmd(
            [
                "kaggle",
                "datasets",
                "download",
                "-d",
                DATASET,
                "-p",
                str(TMP_DIR),
                "-f",
                filename,
            ]
        )

    BOX_DIR.mkdir(parents=True, exist_ok=True)

    for zip_file in TMP_DIR.glob("*.zip"):
        print(f"Extracting {zip_file.name}...")
        with zipfile.ZipFile(zip_file, "r") as z:
            z.extractall(TMP_DIR)
        zip_file.unlink()

    for name in ["Games.csv", "TeamStatistics.csv", "LeagueSchedule25_26.csv"]:
        src = TMP_DIR / name
        if not src.exists():
            print(f"ERROR: {name} not found after extract.")
            sys.exit(1)
        dst = BOX_DIR / name
        if dst.exists():
            dst.unlink()
        shutil.move(str(src), str(dst))
        print(f"Placed {name} at {dst}")


def cleanup_temp():
    if TMP_DIR.exists():
        shutil.rmtree(TMP_DIR)
        print("Deleted", TMP_DIR)


def main():
    # 1) Fresh Kaggle data
    download_kaggle_csvs()

    # 2) Train model
    run_cmd([sys.executable, "model_train.py"])

    # 3) Historical prediction history
    run_cmd([sys.executable, "update_history.py"])

    # 4) Today's odds + model predictions
    run_cmd([sys.executable, "daily_update.py"])

    # 5) NEW: Player props snapshot
    run_cmd([sys.executable, "daily_player_props.py"])

    cleanup_temp()
    print("\n✅ OpenBet pipeline complete.")


if __name__ == "__main__":
    main()
