"""Reproducible design model; no application or database writes.

Run from repository root: python3 scripts/model-effort-score.py
Outputs arithmetic scenarios, not population estimates or fitness prescriptions.
"""

import csv
import json
import math
from pathlib import Path


OUT = Path(__file__).resolve().parents[1] / "docs" / "scoring-model"
SCORES = [500, 1500, 2500, 3500, 4500, 5500, 6500, 7500, 8500, 10000]
CURVES = {
    "running": [0, 3, 8, 15, 25, 35, 50, 65, 80, 100],
    "cycling": [0, 15, 40, 75, 125, 175, 250, 325, 400, 500],
    "walking": [0, 14000, 28000, 42000, 56000, 70000, 84000, 98000, 112000, 140000],
    "strength": [0, 60, 120, 180, 240, 300, 360, 420, 480, 600],
}
REFERENCE = {"running": 20, "cycling": 100, "walking": 56000, "strength": 180}
K_HISTORY = 20
K_COMPETITION = 120
COMPETITION_MEMORY = 0.5
RANK_NAMES = ["Beginner", "Rookie", "Active", "Challenger", "Athlete", "Elite", "Master", "Olympian", "Champion"]


def curve(volume, sport="running"):
    anchors = CURVES[sport]
    volume = max(0, volume)
    for index in range(1, len(anchors)):
        if volume <= anchors[index]:
            break
    # Extend the final segment above 10,000; there is no score ceiling.
    fraction = (volume - anchors[index - 1]) / (anchors[index] - anchors[index - 1])
    return SCORES[index - 1] + fraction * (SCORES[index] - SCORES[index - 1])


def history_bonus(normalized_volume, kind="sqrt"):
    if kind == "sqrt":
        return K_HISTORY * math.sqrt(normalized_volume)
    # Match square root at 52 reference-volume weeks for a fair shape comparison.
    return K_HISTORY * math.sqrt(52) / math.log1p(52) * math.log1p(normalized_volume)


def expected(own_entry, opponent_entry):
    return 1 / (1 + 10 ** ((opponent_entry - own_entry) / 2000))


def competition(previous, actual_minus_expected=None):
    new_evidence = 0 if actual_minus_expected is None else K_COMPETITION * actual_minus_expected
    return COMPETITION_MEMORY * previous + new_evidence


def nearest(value):
    return math.floor(value + 0.5)


def rank(score):
    return max(index for index, lower in enumerate(SCORES[:9]) if score >= lower)


def simulate(name, initial_volume, weeks, *, prior_history=0, observed=6, prior_competition=0):
    baseline = initial_volume
    total = prior_history
    adjustment = prior_competition
    previous_score = max(500, nearest(curve(baseline) + history_bonus(total) + adjustment))
    badge = rank(previous_score)
    below = 0
    rows = []
    for week, (volume, residual) in enumerate(weeks, start=1):
        observed += 1
        baseline += (volume - baseline) / min(7, observed + 1)
        total += volume / REFERENCE["running"]
        adjustment = competition(adjustment, residual)
        raw = curve(baseline) + history_bonus(total) + adjustment
        score = max(500, nearest(raw))
        candidate = rank(score)
        if candidate >= badge:
            badge, below = candidate, 0
        else:
            below += 1
            if below >= 2:
                badge, below = candidate, 0
        rows.append({
            "scenario": name, "week": week, "volume_mi": volume,
            "baseline_mi": round(baseline, 6), "training_score": round(curve(baseline), 6),
            "normalized_total": round(total, 6), "history_bonus": round(history_bonus(total), 6),
            "competition": round(adjustment, 6), "score": score,
            "delta": score - previous_score, "badge": RANK_NAMES[badge],
        })
        previous_score = score
    return rows


def write_csv(path, rows):
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)


def validate():
    # These checks protect the model's intended properties, not application behavior.
    for sport, volumes in CURVES.items():
        assert [curve(v, sport) for v in volumes] == SCORES
    assert curve(120) > 10000
    assert competition(0, 0.5) == 60
    assert competition(0, -0.5) == -60
    assert competition(120) == 60
    assert expected(5000, 5000) == 0.5
    assert math.isclose(expected(5000, 6000) + expected(6000, 5000), 1)
    assert math.isclose(history_bonus(52), history_bonus(52, "log"))
    bonuses = [history_bonus(n) for n in range(1000)]
    assert all(b > a for a, b in zip(bonuses, bonuses[1:]))
    gains = [b - a for a, b in zip(bonuses, bonuses[1:])]
    assert all(a > b for a, b in zip(gains, gains[1:]))
    gaps = [history_bonus(104 + n) - history_bonus(13 + n) for n in range(1000)]
    assert all(a > b for a, b in zip(gaps, gaps[1:]))
    contribution = history_bonus(2.5)
    contribution = math.sqrt(contribution ** 2 + K_HISTORY ** 2 * 7.5)
    assert math.isclose(contribution, history_bonus(10))
    maintenance = simulate("steady", 20, [(20, None)] * 52, prior_history=13)
    assert all(row["delta"] >= 0 for row in maintenance)
    decline = simulate("stop", 35, [(0, None)] * 13, prior_history=182)
    assert decline[-1]["score"] < decline[0]["score"]
    assert decline[0]["badge"] == "Elite" and decline[1]["badge"] == "Athlete"
    assert all(row["normalized_total"] == 182 for row in decline)
    assert competition(competition(0, 0.5), 0.5) < 120
    for sport, reference in REFERENCE.items():
        assert history_bonus(reference / REFERENCE[sport]) == 20
    steady_competition = 0
    for _ in range(1000):
        steady_competition = competition(steady_competition, 1)
    assert math.isclose(steady_competition, 240)
    target, score = 4000, 4000
    for _ in range(1000):
        score = 1.01 * (score + (target - score) / 7)
    equilibrium = 1.01 * (target / 7) / (1 - 1.01 * 6 / 7)
    assert math.isclose(score, equilibrium)


def main():
    validate()
    OUT.mkdir(parents=True, exist_ok=True)
    growth = []
    for weeks in [0, 1, 13, 26, 52, 104, 260, 520, 1040, 2080]:
        growth.append({
            "reference_volume_weeks": weeks,
            "sqrt_bonus": round(history_bonus(weeks), 2),
            "matched_log_bonus": round(history_bonus(weeks, "log"), 2),
            "next_week_sqrt_gain": round(history_bonus(weeks + 1) - history_bonus(weeks), 3),
        })
    scenarios = []
    scenarios += simulate("steady_20", 20, [(20, None)] * 260, prior_history=13)
    scenarios += simulate("stop_35", 35, [(0, None)] * 52, prior_history=182)
    scenarios += simulate("double_20_to_40", 20, [(40, None)] * 26, prior_history=52)
    scenarios += simulate("halve_40_to_20", 40, [(20, None)] * 26, prior_history=104)
    scenarios += simulate("declare_3_actual_35", 3, [(35, None)] * 26, observed=0)
    scenarios += simulate("declare_50_actual_3", 50, [(3, None)] * 26, observed=0)
    scenarios += simulate("one_win_then_none", 20, [(20, 0.5)] + [(20, None)] * 12, prior_history=52)
    scenarios += simulate("win_every_week", 20, [(20, 0.5)] * 13, prior_history=52)
    scenarios += simulate("lose_every_week", 20, [(20, -0.5)] * 13, prior_history=52)
    scenarios += simulate("alternating_0_40", 20, [(0 if n % 2 == 0 else 40, None) for n in range(52)], prior_history=52)
    write_csv(OUT / "growth.csv", growth)
    sensitivity = [{"coefficient": k,
                    "one_year_bonus": round(k * math.sqrt(52), 2),
                    "ten_year_bonus": round(k * math.sqrt(520), 2),
                    "twenty_year_bonus": round(k * math.sqrt(1040), 2),
                    "initial_two_year_vs_three_month_gap": round(k * (math.sqrt(104) - math.sqrt(13)), 2)}
                   for k in [10, 20, 40]]
    write_csv(OUT / "sensitivity.csv", sensitivity)
    write_csv(OUT / "scenarios.csv", scenarios)
    snapshots = [row for row in scenarios if row["week"] in [1, 2, 4, 8, 13, 26, 52, 260]]
    write_csv(OUT / "snapshots.csv", snapshots)
    summary = {
        "model": "discussion-v2-square-root",
        "parameters": {"history_k": K_HISTORY, "competition_k": K_COMPETITION,
                       "competition_memory": COMPETITION_MEMORY, "mature_alpha": 1 / 7,
                       "expected_result_scale": 2000, "reference_volume": REFERENCE},
        "growth": growth,
        "coefficient_sensitivity": sensitivity,
        "newcomer_gap": [{"additional_weeks": n, "gap": round(history_bonus(104 + n) - history_bonus(13 + n), 2)} for n in [0, 13, 52, 260, 1040]],
        "snapshots": snapshots,
        "checks": "passed",
    }
    (OUT / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps({"checks": summary["checks"], "growth": growth,
                      "newcomer_gap": summary["newcomer_gap"],
                      "selected_snapshots": [r for r in snapshots if r["scenario"] in ["stop_35", "declare_3_actual_35", "declare_50_actual_3"] and r["week"] in [1, 4, 13]]}, indent=2))


if __name__ == "__main__":
    main()
