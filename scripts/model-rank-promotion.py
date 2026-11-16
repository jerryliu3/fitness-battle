"""Compare promotion time under benchmark interpretations and display scales.

Run: python3 scripts/model-rank-promotion.py
This is a design simulation, not application scoring.
"""

import csv
import json
import math
from pathlib import Path
from runpy import run_path


ROOT = Path(__file__).resolve().parents[1]
MODEL = run_path(str(ROOT / "scripts" / "model-effort-score.py"))
VOLUMES = MODEL["CURVES"]
REFERENCES = MODEL["REFERENCE"]
NAMES = MODEL["RANK_NAMES"]
SCALES = {
    "even": [1250 * index for index in range(9)],
    "widening": [0, 750, 1750, 2750, 4000, 5250, 6750, 8250, 10000],
}
OUT = ROOT / "docs" / "scoring-model"


def position(volume, sport, anchors=None):
    anchors = VOLUMES[sport] if anchors is None else anchors
    for index in range(1, len(anchors)):
        if volume <= anchors[index]:
            break
    return index - 1 + (volume - anchors[index - 1]) / (anchors[index] - anchors[index - 1])


def display_score(rank_position, scale):
    thresholds = SCALES[scale]
    index = min(max(0, math.floor(rank_position)), len(thresholds) - 2)
    raw = thresholds[index] + (rank_position - index) * (thresholds[index + 1] - thresholds[index])
    return max(0, math.floor(raw + 0.5))


def run(sport, target_kind, scale="even", mature=False, sequential=True, history_units=0,
        include_history=True, estimator="ema", anchors=None, representatives=None):
    anchors = VOLUMES[sport] if anchors is None else anchors
    baseline, accumulated, observations = 0, history_units, 6 if mature else 0
    total_weeks = 0
    window = [0] * (13 if mature else 1)
    rows = []
    for current in range(8):
        if not sequential:
            baseline, accumulated, observations = anchors[current], history_units, 6 if mature else 0
            window = [anchors[current]] * (13 if mature else 1)
        target_rank = current + 1
        target = anchors[target_rank]
        if target_kind == "midpoint":
            target = (anchors[target_rank] + anchors[target_rank + 1]) / 2
        if representatives is not None:
            target = representatives[current]
            assert anchors[target_rank] < target < anchors[target_rank + 1]
        elapsed = 0
        while elapsed < 520:
            elapsed += 1
            observations += 1
            if estimator == "rolling13":
                window = (window + [target])[-13:]
                baseline = sum(window) / len(window)
            else:
                baseline += (target - baseline) / min(7, observations + 1)
            accumulated += target / REFERENCES[sport]
            bonus = 0.02 * math.sqrt(accumulated) if include_history else 0
            value = position(baseline, sport, anchors) + bonus
            if display_score(value, scale) >= SCALES[scale][target_rank]:
                break
        else:
            elapsed = None
        total_weeks += elapsed or 520
        rows.append({"sport": sport, "target_kind": target_kind, "scale": scale, "estimator": estimator,
                     "start": NAMES[current], "next_rank": NAMES[target_rank],
                     "target_weekly_volume": target, "weeks_to_promote": elapsed,
                     "cumulative_weeks": total_weeks if elapsed else None,
                     "score_at_promotion": display_score(value, scale) if elapsed else None,
                     "baseline_at_promotion": round(baseline, 6) if elapsed else None,
                     "history_rank_intervals": round(bonus, 6)})
        if elapsed is None and sequential:
            break
    return rows


def main():
    OUT.mkdir(exist_ok=True)
    all_rows = []
    for estimator in ["ema", "rolling13"]:
        for sport in VOLUMES:
            for kind in ["minimum", "midpoint"]:
                even = run(sport, kind, estimator=estimator)
                widening = run(sport, kind, "widening", estimator=estimator)
                assert [r["weeks_to_promote"] for r in even] == [r["weeks_to_promote"] for r in widening]
                all_rows.extend(even + widening)
    for scale in SCALES:
        assert [display_score(index, scale) for index in range(9)] == SCALES[scale]
    isolated = run("running", "midpoint", mature=True, sequential=False, include_history=False)
    rolling_isolated = run("running", "midpoint", mature=True, sequential=False,
                           include_history=False, estimator="rolling13")
    rolling_minimum = run("running", "minimum", mature=True, sequential=False,
                          include_history=False, estimator="rolling13")
    assert all(r["weeks_to_promote"] == 13 for r in rolling_minimum)
    assert all(r["weeks_to_promote"] <= 13 for r in all_rows if r["estimator"] == "rolling13")
    candidate_anchors = [0, 2, 5, 10, 18, 28, 42, 60, 80, 100]
    candidate_representatives = [3.5, 9.5, 16, 27, 34, 50, 65, 85]
    candidate = run("running", "configured", anchors=candidate_anchors,
                    representatives=candidate_representatives)
    assert [r["weeks_to_promote"] for r in candidate] == [2, 2, 4, 4, 6, 6, 8, 8]
    candidate_widening = run("running", "configured", scale="widening", anchors=candidate_anchors,
                             representatives=candidate_representatives)
    assert [r["weeks_to_promote"] for r in candidate] == [r["weeks_to_promote"] for r in candidate_widening]
    # Exact boundary convergence: without the history term, a mature estimator
    # remains strictly below the target volume for every finite number of updates.
    for current in range(8):
        gap_after_13 = (VOLUMES["running"][current + 1] - VOLUMES["running"][current]) * (6 / 7) ** 13
        assert gap_after_13 > 0
    payload = {"checks": "passed", "sequential_from_declared_zero": all_rows,
               "isolated_mature_midpoint_without_history": isolated,
               "isolated_mature_midpoint_rolling13_without_history": rolling_isolated,
               "target_schedule_example": {"entry_anchors_mi_per_week": candidate_anchors,
                                           "representatives_mi_per_week": candidate_representatives,
                                           "rows": candidate,
                                           "note": "Constructed to match timing; not measured population averages or training advice"},
               "assumptions": ["No competition adjustment", "Complete observed weeks",
                               "Declared-zero initialization is one pseudo-week",
                               "Sequential targets increase only after promotion",
                               "Midpoints are arithmetic volume midpoints, not measured cohort means",
                               "Rank-domain history coefficient 0.02; display scales differ only in presentation"]}
    with (OUT / "promotion-times.csv").open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=all_rows[0].keys())
        writer.writeheader()
        writer.writerows(all_rows)
    with (OUT / "target-promotion-example.csv").open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=candidate[0].keys())
        writer.writeheader()
        writer.writerows(candidate)
    (OUT / "promotion-times.json").write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps({"checks": "passed",
                      "running_sequential_ema": [{"next_rank": r["next_rank"],
                                                   "representative_mi_per_week": r["target_weekly_volume"],
                                                   "weeks": r["weeks_to_promote"]}
                                                  for r in all_rows if r["sport"] == "running" and r["scale"] == "even" and r["estimator"] == "ema" and r["target_kind"] == "midpoint"],
                      "mature_midpoint_weeks_without_history": [r["weeks_to_promote"] for r in isolated],
                      "target_schedule_example": [{"next_rank": r["next_rank"], "mi_per_week": r["target_weekly_volume"],
                                                   "weeks": r["weeks_to_promote"]} for r in candidate],
                      "mature_midpoint_weeks_rolling13_without_history": [r["weeks_to_promote"] for r in rolling_isolated],
                      "other_sports_midpoint_weeks": {s: [r["weeks_to_promote"] for r in all_rows if r["sport"] == s and r["target_kind"] == "midpoint" and r["scale"] == "even" and r["estimator"] == "ema"] for s in ["cycling", "walking", "strength"]}}, indent=2))


if __name__ == "__main__":
    main()
