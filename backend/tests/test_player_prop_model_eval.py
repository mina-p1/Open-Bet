#pytest backend/tests/test_player_prop_model_eval.py -v


import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from evaluation.evaluate_player_props import (
    run_player_prop_evaluation,
    TARGETS,
    RESULTS_DIR,
)


# MAE upper bounds 
_MAE_THRESHOLDS = {
    "points":          12.0,
    "reboundsTotal":    6.0,
    "assists":          5.0,
    "threePointersMade": 3.5,
}



#shared fixture
@pytest.fixture(scope="module")
def prop_results():
    """Run the full player-prop evaluation once and cache the results dict."""
    return run_player_prop_evaluation(verbose=False)

# Player prop piplline test
class TestPlayerPropPipelineRuns:
    def test_returns_dict_with_all_targets(self, prop_results):
        """The evaluation must return a key for every target stat."""
        for t in TARGETS:
            assert t in prop_results, f"Missing result for target: {t}"

    def test_no_unexpected_keys(self, prop_results):
        """No extra unexpected target names should appear."""
        assert set(prop_results.keys()).issubset(set(TARGETS))

#per stat metrics
@pytest.mark.parametrize("target", TARGETS)
class TestPerStatMetrics:
    def test_result_is_not_an_error(self, target, prop_results):
        r = prop_results[target]
        assert "error" not in r, (
            f"{target} evaluation failed: {r.get('error')}"
        )

    def test_mae_is_positive(self, target, prop_results):
        r = prop_results[target]
        if "error" in r:
            pytest.skip(r["error"])
        assert r["MAE"] > 0, f"{target} MAE should be positive"

    def test_mae_within_realistic_range(self, target, prop_results):
        """MAE must be less than the sport-domain upper bound."""
        r = prop_results[target]
        if "error" in r:
            pytest.skip(r["error"])
        threshold = _MAE_THRESHOLDS.get(target, 15.0)
        assert r["MAE"] < threshold, (
            f"{target} MAE={r['MAE']:.3f} exceeds realistic bound of {threshold}"
        )

    def test_rmse_is_positive(self, target, prop_results):
        r = prop_results[target]
        if "error" in r:
            pytest.skip(r["error"])
        assert r["RMSE"] > 0

    def test_r2_is_defined_and_not_nan(self, target, prop_results):
        import math
        r = prop_results[target]
        if "error" in r:
            pytest.skip(r["error"])
        assert not math.isnan(r["R2"]), f"{target} R² is NaN"

    def test_r2_less_than_one(self, target, prop_results):
        """R² = 1.0 would indicate data leakage."""
        r = prop_results[target]
        if "error" in r:
            pytest.skip(r["error"])
        assert r["R2"] < 1.0

    def test_confusion_matrix_sum_equals_n_test(self, target, prop_results):
        """TP + FP + TN + FN must equal the held-out test-set size."""
        r = prop_results[target]
        if "error" in r:
            pytest.skip(r["error"])
        total = r["TP"] + r["FP"] + r["TN"] + r["FN"]
        assert total == r["n_test"], (
            f"{target}: confusion matrix sum {total} ≠ n_test {r['n_test']}"
        )

    def test_fpr_is_valid_probability(self, target, prop_results):
        r = prop_results[target]
        if "error" in r:
            pytest.skip(r["error"])
        assert 0.0 <= r["FPR"] <= 1.0, (
            f"{target} FPR={r['FPR']} is not in [0, 1]"
        )

    def test_fpr_matches_formula(self, target, prop_results):
        """Verify FPR = FP / (FP + TN) explicitly."""
        r = prop_results[target]
        if "error" in r:
            pytest.skip(r["error"])
        FP, TN, FPR = r["FP"], r["TN"], r["FPR"]
        if (FP + TN) == 0:
            pytest.skip("No negative labels in test set")
        expected = round(FP / (FP + TN), 4)
        assert abs(FPR - expected) < 1e-4, (
            f"{target} FPR stored={FPR}, computed={expected}"
        )

    def test_precision_is_valid(self, target, prop_results):
        r = prop_results[target]
        if "error" in r:
            pytest.skip(r["error"])
        assert 0.0 <= r["precision"] <= 1.0

    def test_recall_is_valid(self, target, prop_results):
        r = prop_results[target]
        if "error" in r:
            pytest.skip(r["error"])
        assert 0.0 <= r["recall"] <= 1.0

    def test_n_test_is_positive(self, target, prop_results):
        r = prop_results[target]
        if "error" in r:
            pytest.skip(r["error"])
        assert r["n_test"] > 0




# testing of the player prop artifacts
class TestPlayerPropArtifacts:
    def test_predictions_csv_is_written(self, prop_results):
        csv_path = RESULTS_DIR / "player_props_predictions.csv"
        assert csv_path.exists(), f"Player prop predictions CSV not found at {csv_path}"

    def test_predictions_csv_has_rows(self, prop_results):
        import pandas as pd
        csv_path = RESULTS_DIR / "player_props_predictions.csv"
        if not csv_path.exists():
            pytest.skip("CSV not yet written")
        df = pd.read_csv(csv_path)
        assert len(df) > 0, "Player props predictions CSV is empty"

    def test_predictions_csv_has_player_column(self, prop_results):
        import pandas as pd
        csv_path = RESULTS_DIR / "player_props_predictions.csv"
        if not csv_path.exists():
            pytest.skip("CSV not yet written")
        df = pd.read_csv(csv_path)
        assert "playerName" in df.columns
