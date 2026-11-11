#!/usr/bin/env python3
"""Bench press percentiles of raw powerlifting competitors, from the OpenPowerlifting CSV.

  python3 -I scripts/build-bench-standards.py <path/to/openpowerlifting-YYYY-MM-DD-*.csv>

Writes src/data/benchStandards.json. Used by /bench-press-standards/.

Data: OpenPowerlifting (https://www.openpowerlifting.org), public domain (LICENSE.txt in the download,
https://openpowerlifting.gitlab.io/opl-csv/files/openpowerlifting-latest.zip). Keep the downloaded data in
its own directory and run this with -I.

WHO THIS DESCRIBES: people who entered a full-power raw meet. That is a self-selected, stronger-than-average
group, so these are NOT percentiles of the general gym-going population. The page says so.

Method (every choice is here so the numbers can be rebuilt):
  - Equipment == Raw (bare knees or sleeves), Event == SBD (full-power meets).
  - Meet date 2015-01-01 or later. Sex M or F (Mx is too small to report).
  - Place is a number or G (guest): drops DQ, DD (doping), NS (no-show).
  - Best3BenchKg > 0 and BodyweightKg present. A missed squat or deadlift does not remove a made bench.
  - Adults only: Age >= 18, or when Age is blank the AgeClass / BirthYearClass must start at 18 or older.
  - One value per lifter: the lifter's best successful bench across all qualifying meets, placed in the
    current IPF class for the bodyweight recorded at that meet. People are matched by Name, so two
    lifters sharing a name are merged (this slightly understates counts, it does not inflate any value).
  - Age table: needs a numeric Age; each lifter counts once per age group they competed in, using their
    best bench-to-bodyweight ratio within that group.
  - Cells with fewer than MIN_N lifters are dropped.
"""
import csv, json, os, sys
from collections import defaultdict
import numpy as np

MIN_DATE = "2015-01-01"
MIN_N = 200
PCTS = [10, 25, 50, 75, 90]
KG_TO_LB = 2.20462262
CLASSES = {"M": [59, 66, 74, 83, 93, 105, 120], "F": [47, 52, 57, 63, 69, 76, 84]}
AGE_GROUPS = [("18-23", 18, 24), ("24-34", 24, 35), ("35-39", 35, 40), ("40-49", 40, 50),
              ("50-59", 50, 60), ("60-69", 60, 70), ("70+", 70, 200)]

def ipf_class(sex, bw):
    for c in CLASSES[sex]:
        if bw <= c:
            return str(c)
    return f"{CLASSES[sex][-1]}+"

def age_class_lower(s):
    if not s:
        return None
    try:
        return float(s.split("-")[0].rstrip("+"))
    except ValueError:
        return None

def is_adult(row):
    if row["Age"]:
        return float(row["Age"]) >= 18
    lo = age_class_lower(row["AgeClass"])
    if lo is None:
        lo = age_class_lower(row["BirthYearClass"])
    if lo is None:
        return None
    return lo >= 18

def pct(vals):
    p = np.percentile(np.array(vals), PCTS)
    return {f"p{q}": round(float(v), 3) for q, v in zip(PCTS, p)}

def main(path):
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "data", "benchStandards.json")
    stats = defaultdict(int)
    best = {}                      # name -> (kg, sex, bw)
    by_age = {}                    # (name, sex, group) -> best ratio
    dates = []
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            stats["rows"] += 1
            if row["Equipment"] != "Raw" or row["Event"] != "SBD":
                continue
            if row["Date"] < MIN_DATE or row["Sex"] not in ("M", "F"):
                continue
            stats["raw_sbd_2015plus_MF"] += 1
            place = row["Place"]
            if not (place.isdigit() or place == "G"):
                stats["dropped_place"] += 1
                continue
            try:
                bench, bw = float(row["Best3BenchKg"]), float(row["BodyweightKg"])
            except ValueError:
                stats["dropped_missing"] += 1
                continue
            if bench <= 0 or bw <= 0:
                stats["dropped_missing"] += 1
                continue
            adult = is_adult(row)
            if adult is None:
                stats["dropped_no_age"] += 1
                continue
            if not adult:
                stats["dropped_under_18"] += 1
                continue
            stats["qualifying_entries"] += 1
            dates.append(row["Date"])
            name, sex = row["Name"], row["Sex"]
            prev = best.get(name)
            if prev is None or bench > prev[0]:
                best[name] = (bench, sex, bw)
            if row["Age"]:
                age = float(row["Age"])
                for g, lo, hi in AGE_GROUPS:
                    if lo <= age < hi:
                        k = (name, sex, g)
                        r = bench / bw
                        if r > by_age.get(k, 0):
                            by_age[k] = r
                        break

    groups = defaultdict(list)
    for kg, sex, bw in best.values():
        groups[(sex, ipf_class(sex, bw))].append(kg)
        groups[(sex, "all")].append(kg)
    cells = []
    for sex in ("M", "F"):
        for cls in [str(c) for c in CLASSES[sex]] + [f"{CLASSES[sex][-1]}+", "all"]:
            vals = groups.get((sex, cls), [])
            if len(vals) < MIN_N:
                stats[f"dropped_cell_{sex}_{cls}"] = len(vals)
                continue
            p = pct(vals)
            cells.append({"sex": sex, "class_kg": cls, "n": len(vals),
                          **{f"{k}_kg": round(v, 1) for k, v in p.items()},
                          **{f"{k}_lb": round(v * KG_TO_LB, 1) for k, v in p.items()}})

    # bodyweight multiples, everyone in the sex pooled (the ratio is the cleaner cross-weight comparison)
    ratios = defaultdict(list)
    for kg, sex, bw in best.values():
        ratios[sex].append(kg / bw)
    ratio_cells = [{"sex": s, "n": len(v), **pct(v)} for s, v in ratios.items()]

    age_groups = defaultdict(list)
    for (name, sex, g), r in by_age.items():
        age_groups[(sex, g)].append(r)
    age_cells = []
    for sex in ("M", "F"):
        for g, _, _ in AGE_GROUPS:
            v = age_groups.get((sex, g), [])
            if len(v) < MIN_N:
                stats[f"dropped_age_{sex}_{g}"] = len(v)
                continue
            age_cells.append({"sex": sex, "age": g, "n": len(v), **pct(v)})

    summary = {
        "source": "OpenPowerlifting, https://www.openpowerlifting.org",
        "licence": "Public domain (OpenPowerlifting LICENSE.txt)",
        "data_file": os.path.basename(path),
        "who": "Adults who entered a full-power raw powerlifting meet. Stronger than the general gym-going population.",
        "filters": {"equipment": "Raw", "event": "SBD", "min_meet_date": MIN_DATE, "sex": ["M", "F"],
                    "place": "number or G", "bench": "best successful bench per lifter",
                    "classes": "IPF, by bodyweight at the meet of the best bench", "min_cell_n": MIN_N},
        "meet_date_range": [min(dates), max(dates)],
        "lifters": {s: sum(1 for v in best.values() if v[1] == s) for s in ("M", "F")},
        "counts": dict(stats),
        "weight_classes": cells, "bodyweight_ratio": ratio_cells, "by_age_ratio": age_cells,
    }
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as f:
        json.dump(summary, f, indent=1)
    print(json.dumps({k: v for k, v in summary.items() if k not in ("weight_classes", "by_age_ratio")}, indent=1))

if __name__ == "__main__":
    main(sys.argv[1])
