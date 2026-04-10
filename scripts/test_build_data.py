#!/usr/bin/env python3
"""
test_build_data.py - Unit + integration tests for build_data.py.

Run with:
    python scripts/test_build_data.py

Plain `assert` instead of pytest so no extra dependency. The script exits 0
on success and 1 on the first failure (with the failing assertion in the
traceback).

Coverage:
- classify_orbit:    known good cases + every conservative-override branch
                     + invalid eccentricity fallback
- normalize_purpose: aliasing, compound purposes (slash split), Other bucket
- normalize_operator: case fixing, alias map
- sanity_check_row:  every flag category fires when expected
- build():           runs against the real CSV and validates schema +
                     internal consistency invariants
"""

from __future__ import annotations

import json
import sys

import numpy as np

import build_data as bd


# ---- classify_orbit ------------------------------------------------------
def test_classify_orbit_happy_path():
    # Starlink-style LEO
    assert bd.classify_orbit(549, 551, 1.45e-04, "LEO") == "LEO"
    # Galileo MEO
    assert bd.classify_orbit(23222, 23222, 0.0, "MEO") == "MEO"
    # Geostationary
    assert bd.classify_orbit(35786, 35786, 0.0, "GEO") == "GEO"
    # Highly elliptical
    assert bd.classify_orbit(500, 35000, 0.7, "Elliptical") == "Elliptical"


def test_classify_orbit_overrides_leo_at_geo_altitude():
    # The original bug: WFOV Testbed
    assert bd.classify_orbit(36236, 36343, 0.00125, "LEO") == "GEO"
    # Angosat-2
    assert bd.classify_orbit(35782, 35791, 0.000107, "LEO") == "GEO"
    # MEO mislabel at GEO altitude
    assert bd.classify_orbit(35780, 35790, 0.0, "MEO") == "GEO"


def test_classify_orbit_overrides_elliptical_with_no_eccentricity():
    # Falconsat-7 case: UCS Elliptical but ecc < 0.1, low altitude
    assert bd.classify_orbit(305, 850, 0.0392, "Elliptical") == "LEO"
    # Hisaki
    assert bd.classify_orbit(952, 1155, 0.0137, "Elliptical") == "LEO"


def test_classify_orbit_trusts_ucs_for_borderline_eccentricity():
    # Galileo FOC FM2 - real eccentric orbit, ecc=0.231 < our 0.25 threshold,
    # but UCS knows it's Elliptical due to launch failure. Trust UCS.
    assert bd.classify_orbit(13810, 25918, 0.231, "Elliptical") == "Elliptical"
    # SES-17 - real GEO comm sat in temporary eccentric transfer orbit.
    # ecc=0.528 but UCS labels GEO and we don't second-guess.
    assert bd.classify_orbit(9403, 44654, 0.528, "GEO") == "GEO"


def test_classify_orbit_invalid_eccentricity_falls_back_to_perigee_apogee():
    # Alfa Crux: ecc=511 (sign error). Recomputed ecc from p=499, a=511 is
    # tiny, so it stays LEO instead of being wrongly flipped to Elliptical.
    assert bd.classify_orbit(499, 511, 511.0, "LEO") == "LEO"
    # PAN-B
    assert bd.classify_orbit(492, 495, 499.0, "LEO") == "LEO"


def test_classify_orbit_no_altitude_data_falls_back_to_ucs():
    import pandas as pd
    nan = pd.NA
    assert bd.classify_orbit(nan, nan, nan, "GEO") == "GEO"
    assert bd.classify_orbit(nan, nan, nan, "LEO") == "LEO"
    # Even no UCS class - return Unknown rather than crash
    assert bd.classify_orbit(nan, nan, nan, nan) == "Unknown"


def test_classify_orbit_no_ucs_class_uses_pure_physics():
    import pandas as pd
    nan = pd.NA
    assert bd.classify_orbit(500, 510, 0.0, nan) == "LEO"
    assert bd.classify_orbit(20000, 20000, 0.0, nan) == "MEO"
    assert bd.classify_orbit(35786, 35786, 0.0, nan) == "GEO"
    assert bd.classify_orbit(500, 30000, 0.7, nan) == "Elliptical"


# ---- normalize_purpose ---------------------------------------------------
def test_normalize_purpose_canonical_unchanged():
    for p in bd.TOP_PURPOSES:
        assert bd.normalize_purpose(p) == p


def test_normalize_purpose_aliases():
    assert bd.normalize_purpose("Technology Demonstration") == "Technology Development"
    assert bd.normalize_purpose("Earth Science") == "Earth Observation"
    assert bd.normalize_purpose("Space Observation") == "Space Science"
    assert bd.normalize_purpose("Satellite Positioning") == "Navigation"


def test_normalize_purpose_compound_takes_primary():
    assert bd.normalize_purpose("Navigation/Global Positioning") == "Navigation"
    assert bd.normalize_purpose("Earth Observation/Communications") == "Earth Observation"
    assert bd.normalize_purpose("Communications/Maritime Tracking") == "Communications"


def test_normalize_purpose_unknown_buckets_to_other():
    assert bd.normalize_purpose("Surveillance") == "Other"
    assert bd.normalize_purpose("Educational") == "Other"
    assert bd.normalize_purpose("Platform") == "Other"


def test_normalize_purpose_handles_nan_and_whitespace():
    import pandas as pd
    assert bd.normalize_purpose(pd.NA) == "Other"
    assert bd.normalize_purpose("  Communications  ") == "Communications"
    assert bd.normalize_purpose("Technology  Development") == "Technology Development"


# ---- normalize_operator --------------------------------------------------
def test_normalize_operator_case_fix():
    assert bd.normalize_operator("Spacex") == "SpaceX"
    assert bd.normalize_operator("SpaceX") == "SpaceX"  # already canonical


def test_normalize_operator_alias_map():
    assert bd.normalize_operator("OneWeb Satellites") == "OneWeb"
    assert bd.normalize_operator("Planet Labs, Inc.") == "Planet Labs"
    assert bd.normalize_operator("Iridium Communications, Inc.") == "Iridium"


def test_normalize_operator_unknown_passthrough():
    assert bd.normalize_operator("Acme Space Corp") == "Acme Space Corp"


def test_normalize_operator_handles_nan():
    import pandas as pd
    assert bd.normalize_operator(pd.NA) is None
    assert bd.normalize_operator(None) is None


# ---- sanity_check_row ----------------------------------------------------
def test_sanity_check_invalid_eccentricity_flags():
    bd.reset_flags()
    bd.sanity_check_row("Test Sat", 500, 510, 511.0, 50, "LEO")
    flags = bd.get_flags()
    assert any(f["category"] == "invalid_eccentricity" for f in flags)


def test_sanity_check_apogee_lt_perigee_flags():
    bd.reset_flags()
    bd.sanity_check_row("Test Sat", 500, 100, 0.01, 50, "LEO")
    flags = bd.get_flags()
    assert any(f["category"] == "apogee_lt_perigee" for f in flags)


def test_sanity_check_invalid_inclination_flags():
    bd.reset_flags()
    bd.sanity_check_row("Test Sat", 500, 510, 0.01, 250, "LEO")
    flags = bd.get_flags()
    assert any(f["category"] == "invalid_inclination" for f in flags)


def test_sanity_check_suspicious_apogee_only_for_non_elliptical():
    # Non-elliptical with huge apogee - flagged
    bd.reset_flags()
    bd.sanity_check_row("Test Sat", 35786, 350000, 0.5, 0, "GEO")
    assert any(f["category"] == "suspicious_apogee" for f in bd.get_flags())

    # Elliptical with huge apogee - NOT flagged (Chandra etc. are real)
    bd.reset_flags()
    bd.sanity_check_row("Chandra", 16000, 138825, 0.74, 28.5, "Elliptical")
    assert not any(f["category"] == "suspicious_apogee" for f in bd.get_flags())


def test_sanity_check_clean_row_no_flags():
    bd.reset_flags()
    bd.sanity_check_row("Starlink-1234", 549, 551, 1.45e-04, 53, "LEO")
    assert bd.get_flags() == []


# ---- Integration: full pipeline against the real CSV --------------------
def test_build_against_real_csv():
    """Heaviest test - actually runs the pipeline."""
    main_json, globe_json, flags = bd.build(verbose=False)

    # ---- summary ----
    s = main_json["summary"]
    # 6718 in the raw CSV minus 5 dropped rows: 3 with corrupt orbital data
    # (Ciel-2, Eutelsat Hotbird 13G, Yaogan 35A) and 2 with missing
    # inclination (Lemur-2-KarenB, Lemur-2 Mimi1307).
    assert s["total_satellites"] == 6713
    assert s["orbit_classes"] == 4
    # Numbers can drift slightly with reclassification, but never wildly.
    assert 0.85 <= s["pct_leo"] / 100 <= 0.92
    assert 0.65 <= s["pct_communications"] / 100 <= 0.75
    assert 0.6 <= s["pct_usa"] / 100 <= 0.75
    assert 0.7 <= s["pct_launched_since_2019"] / 100 <= 0.85

    # ---- orbit_distribution shape and consistency ----
    od = main_json["orbit_distribution"]
    assert {o["orbit"] for o in od} == set(bd.ORBIT_ORDER)
    assert sum(o["count"] for o in od) == s["total_satellites"]

    # ---- purpose_breakdown sums to total ----
    pb = main_json["purpose_breakdown"]
    assert sum(p["count"] for p in pb) == s["total_satellites"]
    assert {p["purpose"] for p in pb} == set(bd.TOP_PURPOSES + ["Other"])

    # ---- purpose_by_orbit excludes Other but otherwise covers top 5 ----
    pbo = main_json["purpose_by_orbit"]
    assert {r["purpose"] for r in pbo} == set(bd.TOP_PURPOSES)
    pbo_total = sum(r[o] for r in pbo for o in bd.ORBIT_ORDER)
    other_count = next(p["count"] for p in pb if p["purpose"] == "Other")
    assert pbo_total + other_count == s["total_satellites"]

    # ---- top_countries / top_operators length ----
    assert len(main_json["top_countries"]) == 15
    assert len(main_json["top_operators"]) == 10

    # ---- lorenz curve invariants ----
    lc = main_json["lorenz_curve"]
    assert lc[0] == {"pct_operators": 0, "pct_satellites": 0}
    assert lc[-1]["pct_operators"] == 100
    assert lc[-1]["pct_satellites"] == 100
    pcts = [pt["pct_satellites"] for pt in lc]
    assert pcts == sorted(pcts), "Lorenz curve must be monotone non-decreasing"

    # ---- launches_by_decade reasonable ----
    decades = main_json["launches_by_decade"]
    assert {d["decade"] for d in decades} == {"1970s", "1980s", "1990s", "2000s", "2010s", "2020s"}
    # 2020s should be the biggest (mega-constellation era)
    biggest = max(decades, key=lambda d: d["count"])
    assert biggest["decade"] == "2020s"

    # ---- globe JSON: original outliers must be GEO, not LEO ----
    angosat = next(g for g in globe_json if g["name"] == "Angosat-2")
    wfov = next(g for g in globe_json if g["name"] == "WFOV Testbed")
    assert angosat["orbit_class"] == "GEO"
    assert wfov["orbit_class"] == "GEO"

    # ---- globe JSON: no LEO satellite at GEO altitude ----
    bad = [g for g in globe_json if g["orbit_class"] == "LEO" and g["altitude"] > 30000]
    assert bad == [], f"Found {len(bad)} LEO satellites at GEO altitude"

    # ---- flags include the known issues ----
    flag_names = {f["name"] for f in flags}
    assert "Angosat-2" in flag_names
    assert "WFOV Testbed" in flag_names
    assert "Eutelsat Hotbird 13G" in flag_names
    assert "Ciel-2" in flag_names
    assert "Yaogan 35A" in flag_names
    assert "Lemur-2-KarenB" in flag_names
    assert "Lemur-2 Mimi1307" in flag_names

    # ---- all 5 dropped rows must NOT appear in either output JSON ----
    dropped_names = {
        "Ciel-2",
        "Eutelsat Hotbird 13G",
        "Yaogan 35A",
        "Lemur-2-KarenB",
        "Lemur-2 Mimi1307",
    }
    assert all(g["name"] not in dropped_names for g in globe_json), \
        "A dropped row leaked into the globe JSON"
    # And they must each have a 'dropped' flag (not their original sanity flag).
    dropped_flags = {f["name"] for f in flags if f["category"] == "dropped"}
    assert dropped_flags == dropped_names

    # ---- the two output JSONs must agree on the satellite count ----
    assert len(globe_json) == s["total_satellites"]


def test_build_output_is_valid_json():
    """Round-trip through json.dumps to make sure nothing leaks numpy types."""
    main_json, globe_json, _ = bd.build(verbose=False)
    # Will raise TypeError if there are stray np.int64 / np.float64 etc.
    s_main = json.dumps(main_json)
    s_globe = json.dumps(globe_json)
    assert json.loads(s_main) == main_json
    assert json.loads(s_globe) == globe_json


# ---- Test runner ---------------------------------------------------------
def main() -> int:
    tests = [
        # classify_orbit
        test_classify_orbit_happy_path,
        test_classify_orbit_overrides_leo_at_geo_altitude,
        test_classify_orbit_overrides_elliptical_with_no_eccentricity,
        test_classify_orbit_trusts_ucs_for_borderline_eccentricity,
        test_classify_orbit_invalid_eccentricity_falls_back_to_perigee_apogee,
        test_classify_orbit_no_altitude_data_falls_back_to_ucs,
        test_classify_orbit_no_ucs_class_uses_pure_physics,
        # normalize_purpose
        test_normalize_purpose_canonical_unchanged,
        test_normalize_purpose_aliases,
        test_normalize_purpose_compound_takes_primary,
        test_normalize_purpose_unknown_buckets_to_other,
        test_normalize_purpose_handles_nan_and_whitespace,
        # normalize_operator
        test_normalize_operator_case_fix,
        test_normalize_operator_alias_map,
        test_normalize_operator_unknown_passthrough,
        test_normalize_operator_handles_nan,
        # sanity_check_row
        test_sanity_check_invalid_eccentricity_flags,
        test_sanity_check_apogee_lt_perigee_flags,
        test_sanity_check_invalid_inclination_flags,
        test_sanity_check_suspicious_apogee_only_for_non_elliptical,
        test_sanity_check_clean_row_no_flags,
        # integration
        test_build_against_real_csv,
        test_build_output_is_valid_json,
    ]

    failed = 0
    for t in tests:
        try:
            t()
            print(f"  ok    {t.__name__}")
        except AssertionError as e:
            failed += 1
            print(f"  FAIL  {t.__name__}: {e}")
        except Exception as e:
            failed += 1
            print(f"  ERROR {t.__name__}: {type(e).__name__}: {e}")

    print()
    print(f"{len(tests) - failed} / {len(tests)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
