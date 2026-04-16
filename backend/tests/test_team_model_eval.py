#pytest backend/tests/test_team_model_eval.py -v

import sys
from pathlib import Path

import pytest

# import backend
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from evaluation.evaluate_team_model import (
    run_team_evaluation,
    compute_confusion_matrix_from_history,
    RESULTS_DIR,
)

#shared fixture 
@pytest.fixture(scope="module")
def eval_results():
    return run_team_evaluation(verbose=False)


# refression metrics
class TestTeamModelRegressionMetrics:
    def test_mae_within_reasonable_nba_range(self, eval_results):
        mae = eval_results["MAE"]
        assert mae > 0, "MAE must be positive"
        assert mae < 20, (
            f"MAE={mae:.3f} exceeds 20-point threshold – model may be broken"
        )

    def test_rmse_within_reasonable_range(self, eval_results):
        rmse = eval_results["RMSE"]
        assert rmse > 0, "RMSE must be positive"
        assert rmse < 25, f"RMSE={rmse:.3f} is suspiciously high"

    def test_r2_is_positive(self, eval_results):
        r2 = eval_results["R2"]
        assert r2 > 0, (
            f"R²={r2:.4f} ≤ 0 – model is no better than predicting the mean"
        )

    def test_r2_does_not_overfit(self, eval_results):
        assert eval_results["R2"] < 1.0

    def test_test_set_is_large_enough(self, eval_results):
        assert eval_results["n_test"] >= 100, (
            f"Test set only has {eval_results['n_test']} rows – check data path"
        )


# confusion matrix 

class TestTeamModelConfusionMatrix:
    def test_confusion_matrix_counts_sum_to_n(self, eval_results):
        n  = eval_results["n_games"]
        cm = eval_results["TP"] + eval_results["FP"] + eval_results["TN"] + eval_results["FN"]
        assert cm == n, (
            f"Confusion matrix sum {cm} ≠ n_games {n}"
        )

    def test_fpr_is_valid_probability(self, eval_results):
        fpr = eval_results["FPR"]
        assert 0.0 <= fpr <= 1.0, f"FPR={fpr} is not a valid probability"

    def test_fpr_definition_fp_over_fp_plus_tn(self, eval_results):
        FP, TN, FPR = eval_results["FP"], eval_results["TN"], eval_results["FPR"]
        if (FP + TN) == 0:
            pytest.skip("No negative ground-truth labels")
        expected = round(FP / (FP + TN), 4)
        assert abs(FPR - expected) < 1e-4, (
            f"FPR mismatch: stored={FPR}, computed={expected}"
        )

    def test_precision_is_valid(self, eval_results):
        prec = eval_results["precision"]
        assert 0.0 <= prec <= 1.0

    def test_recall_is_valid(self, eval_results):
        recall = eval_results["recall"]
        assert 0.0 <= recall <= 1.0

    def test_accuracy_matches_is_correct_column(self, eval_results):
        import json
        from pathlib import Path
        hist_path = Path(__file__).resolve().parent.parent / "data" / "prediction_history.json"
        with open(hist_path) as fh:
            raw = json.load(fh)
        games = raw.get("games", raw) if isinstance(raw, dict) else raw
        import pandas as pd
        df = pd.DataFrame(games)
        expected_acc = df["is_correct"].mean()
        actual_acc   = eval_results["accuracy"]
        assert abs(actual_acc - expected_acc) < 0.02, (
            f"accuracy={actual_acc:.4f} differs from is_correct mean {expected_acc:.4f}"
        )

    def test_n_games_matches_prediction_history(self, eval_results):
        """Sanity: n_games in results should match len(prediction_history)."""
        import json
        from pathlib import Path
        hist_path = Path(__file__).resolve().parent.parent / "data" / "prediction_history.json"
        with open(hist_path) as fh:
            raw = json.load(fh)
        games = raw.get("games", raw) if isinstance(raw, dict) else raw
        assert eval_results["n_games"] == len(games)


#test team model artifacts 
class TestTeamModelArtifacts:
    def test_predictions_csv_is_written(self, eval_results):
        csv_path = RESULTS_DIR / "team_predictions_vs_actuals.csv"
        assert csv_path.exists(), f"Predictions CSV not found at {csv_path}"

    def test_predictions_csv_has_required_columns(self, eval_results):
        import pandas as pd
        csv_path = RESULTS_DIR / "team_predictions_vs_actuals.csv"
        if not csv_path.exists():
            pytest.skip("CSV not yet written")
        df = pd.read_csv(csv_path)
        required = {"gameDateTimeEst", "teamId", "teamScore", "predicted_score", "residual"}
        assert required.issubset(df.columns), (
            f"Missing CSV columns: {required - set(df.columns)}"
        )

    def test_predictions_csv_has_rows(self, eval_results):
        import pandas as pd
        csv_path = RESULTS_DIR / "team_predictions_vs_actuals.csv"
        if not csv_path.exists():
            pytest.skip("CSV not yet written")
        df = pd.read_csv(csv_path)
        assert len(df) > 0, "Predictions CSV is empty"

# Test Confusion Matrix Helper
class TestConfusionMatrixHelper:

    def test_helper_returns_all_expected_keys(self):
        cm = compute_confusion_matrix_from_history()
        expected = {"n_games", "TP", "FP", "TN", "FN", "FPR", "precision", "recall", "accuracy"}
        assert expected.issubset(cm.keys())

    def test_helper_counts_are_non_negative(self):
        cm = compute_confusion_matrix_from_history()
        for key in ("TP", "FP", "TN", "FN"):
            assert cm[key] >= 0, f"{key}={cm[key]} should be ≥ 0"

    def test_helper_fpr_matches_formula(self):
        cm = compute_confusion_matrix_from_history()
        FP, TN, FPR = cm["FP"], cm["TN"], cm["FPR"]
        if (FP + TN) == 0:
            pytest.skip("No true negatives")
        assert abs(FPR - FP / (FP + TN)) < 1e-4
