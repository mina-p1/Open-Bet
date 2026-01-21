import os
import shutil
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
TMP_DIR = BASE_DIR / "tmp_kaggle"

def main():
    # Delete any temporary Kaggle downloads
    if TMP_DIR.exists():
        shutil.rmtree(TMP_DIR)
        print("Deleted", TMP_DIR)

if __name__ == "__main__":
    main()
