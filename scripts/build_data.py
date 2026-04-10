#!/usr/bin/env python3
"""
build_data.py - Regenerate prototype data files from the UCS Satellite Database.

Reads:
    data/UCS-Satellite-Database-1-1-2023.csv

Writes:
    prototype/data/satellites.json        (chart aggregates)
    prototype/data/satellites-globe.json  (per-satellite slim list for the 3D globe)

Run from anywhere:
    python scripts/build_data.py

"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

# ---- Paths ---------------------------------------------------------------
HERE = Path(__file__).resolve().parent
REPO = HERE.parent
CSV_PATH = REPO / "data" / "UCS-Satellite-Database-1-1-2023.csv"
OUT_DIR = REPO / "prototype" / "data"
OUT_MAIN = OUT_DIR / "satellites.json"
OUT_GLOBE = OUT_DIR / "satellites-globe.json"
QUALITY_REPORT = REPO / "data" / "data_quality_flags.md"

# ---- Constants -----------------------------------------------------------
EARTH_RADIUS_KM = 6371.0
GEO_ALTITUDE_KM = 35786.0
# Midpoint between top of MEO (~27,000 km in practice) and GEO (35,786 km).
# Any satellite above this is recognised as GEO regardless of its UCS label.
MEO_GEO_BOUNDARY_KM = 31570.0
# Eccentricity above which a satellite is considered Highly Elliptical.
ELLIPTICAL_ECC = 0.25

ORBIT_ORDER = ["LEO", "MEO", "GEO", "Elliptical"]

# Top purposes broken out individually; everything else folds into "Other".
TOP_PURPOSES = [
    "Communications",
    "Earth Observation",
    "Technology Development",
    "Navigation",
    "Space Science",
]

# Map UCS variants -> canonical buckets so the aggregates use clean labels.
# Applied AFTER taking the primary segment of compound purposes (split on "/").
PURPOSE_ALIASES = {
    "Technology Demonstration": "Technology Development",
    "Earth Science": "Earth Observation",
    "Earth": "Earth Observation",
    "Space Observation": "Space Science",
    "Satellite Positioning": "Navigation",
}

# Operator name cleanup for top-N display. UCS uses different case ("Spacex"
# vs "SpaceX") and trailing legal suffixes ("Inc.", "S.A.", etc.) that look
# noisy on charts. Keys are matched case-insensitively against the raw value.
OPERATOR_ALIASES = {
    "spacex": "SpaceX",
    "oneweb satellites": "OneWeb",
    "planet labs, inc.": "Planet Labs",
    "spire global inc.": "Spire Global",
    "iridium communications, inc.": "Iridium",
    "ses s.a.": "SES",
    "intelsat s.a.": "Intelsat",
    "satellogic s.a.": "Satellogic",
    "orbcomm inc.": "ORBCOMM",
    "european space agency (esa)": "ESA",
    "indian space research organization (isro)": "ISRO",
    "national reconnaissance office (nro)": "NRO",
    "chinese ministry of national defense": "China MoD",
    "ministry of defense": "Russia MoD",
    "chang guang satellite technology co. ltd.": "Chang Guang",
    "china academy of space technology (cast)": "CAST",
    "swarm technologies": "Swarm",
    "dod/us air force": "US Air Force",
}


# ---- Data quality flagging ----------------------------------------------
# Flags accumulate during a build run. Each entry: {name, category, detail}.
# Reset by reset_flags() at the start of each build.
_FLAGS: list[dict[str, Any]] = []

# Flag categories that cause the row to be dropped from the output entirely.
# Each row in any of these categories has corrupt or missing orbital data
# that the script cannot recover (unlike invalid_eccentricity, which it
# recomputes from perigee/apogee, or orbit_reclassified, which it overrides
# in place).
DROP_CATEGORIES = {
    "apogee_lt_perigee",
    "invalid_inclination",
    "suspicious_apogee",
    "missing_orbital_data",
}


def reset_flags() -> None:
    _FLAGS.clear()


def flag(name: Any, category: str, detail: str) -> None:
    _FLAGS.append({"name": str(name), "category": category, "detail": detail})


def get_flags() -> list[dict[str, Any]]:
    return list(_FLAGS)


def remove_flags_for(name: str) -> None:
    """Remove every existing flag attached to a given satellite name."""
    survivors = [f for f in _FLAGS if f["name"] != name]
    _FLAGS.clear()
    _FLAGS.extend(survivors)


# ---- Cleaning helpers ----------------------------------------------------
def to_numeric(series: pd.Series) -> pd.Series:
    """Coerce a UCS string column (with embedded commas / junk) to float."""
    return pd.to_numeric(
        series.astype(str).str.replace(",", "", regex=False).str.strip(),
        errors="coerce",
    )


def sanity_check_row(
    name: Any,
    perigee: Any,
    apogee: Any,
    ecc: Any,
    inclination: Any,
    ucs_class: Any = None,
) -> None:
    """
    Inspect a single row's orbital parameters and emit flags for any value
    that is physically suspicious. These do NOT block the build - they are
    written to data/data_quality_flags.md so a human can review them.
    """
    # Apogee > 100,000 km is normal for genuinely Elliptical missions
    # (Chandra, INTEGRAL, TESS, Cluster, Geotail, ...) but on a satellite
    # tagged GEO/MEO/LEO it almost always indicates a digit-shift typo.
    if (
        pd.notna(apogee)
        and apogee > 100000
        and ucs_class != "Elliptical"
    ):
        flag(
            name,
            "suspicious_apogee",
            f"apogee = {apogee:,.0f} km on a non-elliptical satellite "
            f"(UCS class = {ucs_class}) - likely a digit-shift typo",
        )
    if pd.notna(perigee) and pd.notna(apogee) and apogee < perigee:
        flag(
            name,
            "apogee_lt_perigee",
            f"perigee = {perigee} km > apogee = {apogee} km is physically "
            f"impossible (likely a column swap in the UCS source)",
        )
    if pd.notna(ecc) and (ecc < 0 or ecc >= 1):
        flag(
            name,
            "invalid_eccentricity",
            f"eccentricity = {ecc} is outside [0, 1) - looks like a sign-error "
            f"typo (e.g. 5.11E+02 instead of 5.11E-02). Recomputed from "
            f"perigee/apogee for classification.",
        )
    if pd.notna(inclination) and (inclination < 0 or inclination > 180):
        flag(
            name,
            "invalid_inclination",
            f"inclination = {inclination} degrees is outside [0, 180]",
        )
    # Both inclination AND a usable altitude are required to position the
    # satellite on the 3D globe; without them the row cannot be visualised
    # and is excluded from the aggregate counts as well so the two outputs
    # always agree on the total.
    if pd.isna(inclination) or (
        pd.isna(perigee) and pd.isna(apogee)
    ):
        missing = []
        if pd.isna(inclination):
            missing.append("inclination")
        if pd.isna(perigee) and pd.isna(apogee):
            missing.append("perigee/apogee")
        flag(
            name,
            "missing_orbital_data",
            f"missing {' and '.join(missing)} - cannot be positioned on the globe",
        )


def normalize_purpose(raw) -> str:
    """
    Map a UCS Purpose string to one of TOP_PURPOSES or 'Other'.

    UCS uses compound values like 'Navigation/Global Positioning' or
    'Earth Observation/Communications' for satellites with multiple roles.
    We take the segment before the first '/' as the primary purpose, then
    apply alias merging.
    """
    if pd.isna(raw):
        return "Other"
    p = re.sub(r"\s+", " ", str(raw)).strip()
    primary = p.split("/")[0].strip()
    primary = PURPOSE_ALIASES.get(primary, primary)
    return primary if primary in TOP_PURPOSES else "Other"


def normalize_operator(raw):
    """Tidy up a UCS operator name: case typos + trailing legal suffixes."""
    if pd.isna(raw):
        return None
    s = str(raw).strip()
    return OPERATOR_ALIASES.get(s.lower(), s)


def classify_orbit(perigee, apogee, ecc_csv, ucs_class) -> str:
    """
    Conservative orbit classification.

    UCS Class of Orbit is the source of truth EXCEPT where it is
    unambiguously contradicted by altitude or eccentricity data:

        1. UCS says LEO or MEO but mean altitude > 30,000 km
           -> override to GEO  (catches WFOV Testbed, Angosat-2)

        2. UCS says Elliptical but eccentricity is essentially zero (< 0.1)
           -> override to LEO/MEO/GEO based on altitude
           (catches Falconsat-7, Gaofen 11, Hisaki, ...)

        3. UCS says GEO but altitude is > 5,000 km away from geostationary
           with eccentricity essentially zero
           -> override to LEO/MEO based on altitude

    All other cases trust UCS. In particular, satellites with moderate-to-high
    eccentricity (Galileo FOC FM1/FM2, SES-17, Express-AMU3/7, Turksat 5B,
    Hotbird 13G, ...) keep their UCS label even when a naive ecc threshold
    would flip them: UCS reflects operational reality and we don't second-
    guess it for borderline cases.

    The eccentricity column in the UCS CSV has occasional sign-error typos
    (5.11E+02 stored instead of 5.11E-02). Any value not in [0, 1) is
    discarded and recomputed from perigee/apogee.
    """
    p_ok = pd.notna(perigee) and perigee > 0
    a_ok = pd.notna(apogee) and apogee > 0

    # No altitude data: nothing physics can do.
    if not p_ok and not a_ok:
        return ucs_class if pd.notna(ucs_class) else "Unknown"

    # Mean altitude (one-sided if only perigee or apogee is known).
    if p_ok and a_ok:
        mean_alt = (perigee + apogee) / 2.0
    else:
        mean_alt = perigee if p_ok else apogee

    # Eccentricity: trust the CSV only if it's in the physically valid range.
    # Otherwise recompute from perigee/apogee (which are usually fine even
    # when the ecc cell is broken).
    if pd.notna(ecc_csv) and 0 <= ecc_csv < 1:
        ecc = float(ecc_csv)
    elif p_ok and a_ok:
        ra = apogee + EARTH_RADIUS_KM
        rp = perigee + EARTH_RADIUS_KM
        ecc = (ra - rp) / (ra + rp) if (ra + rp) > 0 else 0.0
    else:
        ecc = 0.0

    # If UCS is missing entirely, fall back to a pure physics rule.
    if pd.isna(ucs_class):
        if ecc > ELLIPTICAL_ECC:
            return "Elliptical"
        if mean_alt < 2000:
            return "LEO"
        if mean_alt < MEO_GEO_BOUNDARY_KM:
            return "MEO"
        return "GEO"

    # --- Conservative overrides ---

    # 1. LEO/MEO at GEO altitude is physically impossible.
    if ucs_class in ("LEO", "MEO") and mean_alt > 30000:
        return "GEO"

    # 2. "Elliptical" with no eccentricity isn't elliptical.
    if ucs_class == "Elliptical" and ecc < 0.1:
        if mean_alt < 2000:
            return "LEO"
        if mean_alt < MEO_GEO_BOUNDARY_KM:
            return "MEO"
        return "GEO"

    # 3. "GEO" far from geostationary altitude with no eccentricity isn't GEO.
    if (
        ucs_class == "GEO"
        and ecc < 0.1
        and abs(mean_alt - GEO_ALTITUDE_KM) > 5000
    ):
        if mean_alt < 2000:
            return "LEO"
        if mean_alt < MEO_GEO_BOUNDARY_KM:
            return "MEO"
        # Above boundary -> still GEO (this branch shouldn't fire here)

    return ucs_class


# ---- Loading -------------------------------------------------------------
def load_dataframe(verbose: bool = True) -> pd.DataFrame:
    if not CSV_PATH.exists():
        sys.exit(f"ERROR: source CSV not found at {CSV_PATH}")

    df = pd.read_csv(CSV_PATH, encoding="latin-1", low_memory=False)

    # Drop trailing all-empty columns the CSV ships with.
    df = df.dropna(axis=1, how="all")
    df.columns = df.columns.str.strip()

    # Drop rows where the official name is blank (footnote / spacer rows).
    df = df.dropna(subset=["Current Official Name of Satellite"]).reset_index(drop=True)

    # Numeric coercions.
    for col in [
        "Perigee (km)",
        "Apogee (km)",
        "Eccentricity",
        "Inclination (degrees)",
        "Period (minutes)",
    ]:
        if col in df.columns:
            df[col] = to_numeric(df[col])

    # Class of orbit cleanup (UCS has the typo "LEo").
    df["Class of Orbit"] = (
        df["Class of Orbit"]
        .astype(str)
        .str.strip()
        .replace({"LEo": "LEO", "nan": np.nan, "": np.nan})
    )

    # Sanity-check every row's orbital parameters and accumulate flags.
    for idx in df.index:
        sanity_check_row(
            df.at[idx, "Current Official Name of Satellite"],
            df.at[idx, "Perigee (km)"],
            df.at[idx, "Apogee (km)"],
            df.at[idx, "Eccentricity"],
            df.at[idx, "Inclination (degrees)"],
            df.at[idx, "Class of Orbit"],
        )

    # Drop rows whose orbital data is too corrupt to use. For each dropped
    # row, replace all of its existing flags with a single "dropped" entry
    # in the quality report so it is obvious from the report what happened.
    drop_reasons: dict[str, list[str]] = {}
    for f in get_flags():
        if f["category"] in DROP_CATEGORIES:
            drop_reasons.setdefault(f["name"], []).append(
                f"{f['category']} ({f['detail']})"
            )
    if drop_reasons:
        for name, reasons in drop_reasons.items():
            remove_flags_for(name)
            flag(name, "dropped", "; ".join(reasons))
        if verbose:
            print(f"Dropped {len(drop_reasons)} row(s) with corrupt data:")
            for name in sorted(drop_reasons):
                print(f"  - {name}")
            print()
        df = df[
            ~df["Current Official Name of Satellite"].isin(drop_reasons)
        ].reset_index(drop=True)

    # Apply physics-based orbit reclassification.
    original_class = df["Class of Orbit"].copy()
    df["orbit_class"] = df.apply(
        lambda r: classify_orbit(
            r["Perigee (km)"],
            r["Apogee (km)"],
            r["Eccentricity"],
            r["Class of Orbit"],
        ),
        axis=1,
    )

    # Record reclassifications: log to console (when verbose) AND add to
    # flags so they appear in the data quality report.
    changed_mask = original_class.notna() & (original_class != df["orbit_class"])
    n_changed = int(changed_mask.sum())
    if n_changed:
        if verbose:
            print(f"Reclassified {n_changed} satellite(s) by physics:")
        for idx in df.index[changed_mask]:
            name = df.at[idx, "Current Official Name of Satellite"]
            old_cls = original_class.at[idx]
            new_cls = df.at[idx, "orbit_class"]
            p = df.at[idx, "Perigee (km)"]
            a = df.at[idx, "Apogee (km)"]
            e = df.at[idx, "Eccentricity"]
            if verbose:
                print(f"  {name:<40s} {old_cls} -> {new_cls}  "
                      f"(perigee={p}, apogee={a}, ecc={e})")
            flag(
                name,
                "orbit_reclassified",
                f"UCS class '{old_cls}' overridden to '{new_cls}' "
                f"(perigee={p} km, apogee={a} km, ecc={e})",
            )
        if verbose:
            print()

    # Mean altitude (used by the globe and by physics).
    df["mean_altitude"] = df[["Perigee (km)", "Apogee (km)"]].mean(axis=1)

    # Canonical purpose for the chart aggregates.
    df["purpose_canonical"] = df["Purpose"].apply(normalize_purpose)

    # Cleaned operator name (collapses "Spacex" -> "SpaceX" etc.).
    df["operator_clean"] = df["Operator/Owner"].apply(normalize_operator)

    # Launch year (UCS uses DD-MM-YYYY).
    df["launch_year"] = pd.to_datetime(
        df["Date of Launch"], errors="coerce", dayfirst=True
    ).dt.year

    return df


# ---- Aggregates ----------------------------------------------------------
def build_main_json(df: pd.DataFrame) -> dict:
    n = len(df)

    # Cumulative launches by year.
    yr = df.dropna(subset=["launch_year"]).copy()
    yr["launch_year"] = yr["launch_year"].astype(int)
    by_year = yr.groupby("launch_year").size().reset_index(name="count")
    by_year["cumulative"] = by_year["count"].cumsum()
    cumulative_launches = [
        {
            "year": int(row["launch_year"]),
            "count": int(row["count"]),
            "cumulative": int(row["cumulative"]),
        }
        for _, row in by_year.iterrows()
    ]

    # Top 15 countries.
    cc = df["Country of Operator/Owner"].value_counts().head(15)
    top_countries = [{"country": str(k), "count": int(v)} for k, v in cc.items()]

    # Orbit distribution.
    od = df["orbit_class"].value_counts()
    orbit_distribution = []
    for cls in ORBIT_ORDER:
        c = int(od.get(cls, 0))
        orbit_distribution.append(
            {"orbit": cls, "count": c, "pct": round(c / n * 100, 1)}
        )

    # Purpose breakdown (canonical, with explicit "Other" bucket).
    pp = df["purpose_canonical"].value_counts()
    purpose_breakdown = []
    for p in TOP_PURPOSES + ["Other"]:
        c = int(pp.get(p, 0))
        purpose_breakdown.append(
            {"purpose": p, "count": c, "pct": round(c / n * 100, 1)}
        )

    # Purpose by orbit (top 5 only, no "Other").
    purpose_by_orbit = []
    for p in TOP_PURPOSES:
        sub = df[df["purpose_canonical"] == p]
        row: dict[str, object] = {"purpose": p}
        for o in ORBIT_ORDER:
            row[o] = int((sub["orbit_class"] == o).sum())
        purpose_by_orbit.append(row)

    # Top 10 operators (cleaned names).
    op_top = df["operator_clean"].value_counts().head(10)
    top_operators = [{"operator": str(k), "count": int(v)} for k, v in op_top.items()]

    # Lorenz curve + Gini coefficient over the (cleaned) operator distribution.
    op_all = df["operator_clean"].dropna().value_counts().sort_values().to_numpy()
    cum_share = np.cumsum(op_all) / op_all.sum()
    op_share = np.arange(1, len(op_all) + 1) / len(op_all)
    # 0%, 10%, 20%, ..., 90%, 95%, 99%, 100% - extra resolution at the top
    # because that's where the operator distribution gets sharply skewed.
    sample_points = list(range(0, 100, 10)) + [95, 99, 100]
    lorenz_curve = []
    for pct in sample_points:
        if pct == 0:
            lorenz_curve.append({"pct_operators": 0, "pct_satellites": 0})
            continue
        idx = int(np.searchsorted(op_share, pct / 100, side="left"))
        idx = min(idx, len(cum_share) - 1)
        lorenz_curve.append(
            {
                "pct_operators": pct,
                "pct_satellites": round(float(cum_share[idx]) * 100, 1),
            }
        )
    n_op = len(op_all)
    total_sats = op_all.sum()
    if n_op > 0 and total_sats > 0:
        gini = (2 * np.sum(np.arange(1, n_op + 1) * op_all)) / (
            n_op * total_sats
        ) - (n_op + 1) / n_op
    else:
        gini = 0.0

    # Launches by decade.
    dec = yr.copy()
    dec["decade"] = (dec["launch_year"] // 10 * 10).astype(int).astype(str).add("s")
    dec_counts = dec["decade"].value_counts()
    decades = ["1970s", "1980s", "1990s", "2000s", "2010s", "2020s"]
    launches_by_decade = [
        {"decade": d, "count": int(dec_counts.get(d, 0))} for d in decades
    ]

    summary = {
        "total_satellites": n,
        "unique_countries": int(df["Country of Operator/Owner"].nunique()),
        "unique_operators": int(df["operator_clean"].nunique()),
        "orbit_classes": int(df["orbit_class"].nunique()),
        "year_range": [int(yr["launch_year"].min()), int(yr["launch_year"].max())],
        "gini_coefficient": round(float(gini), 3),
        "pct_launched_since_2019": round(
            (yr["launch_year"] >= 2019).sum() / n * 100, 1
        ),
        "pct_usa": round(int(cc.get("USA", 0)) / n * 100, 1),
        "pct_leo": next(o["pct"] for o in orbit_distribution if o["orbit"] == "LEO"),
        "pct_communications": next(
            p["pct"] for p in purpose_breakdown if p["purpose"] == "Communications"
        ),
        "top_operator_pct": round(int(op_top.iloc[0]) / n * 100, 1),
    }

    return {
        "summary": summary,
        "cumulative_launches": cumulative_launches,
        "top_countries": top_countries,
        "orbit_distribution": orbit_distribution,
        "purpose_breakdown": purpose_breakdown,
        "purpose_by_orbit": purpose_by_orbit,
        "top_operators": top_operators,
        "lorenz_curve": lorenz_curve,
        "launches_by_decade": launches_by_decade,
    }


def build_globe_json(df: pd.DataFrame) -> list:
    """Slim per-satellite list for the 3D globe (Globe.gl points layer).
    Rows missing orbital data have already been dropped upstream by
    load_dataframe, so this function trusts that every row has both a
    valid altitude and a valid inclination."""
    out_df = pd.DataFrame(
        {
            "name": df["Current Official Name of Satellite"].astype(str).str.strip(),
            "country": df["Country of Operator/Owner"].fillna("Unknown").astype(str).str.strip(),
            "orbit_class": df["orbit_class"],
            "purpose": df["Purpose"].fillna("Unknown").astype(str).str.strip(),
            "altitude": df["mean_altitude"].round(1),
            "inclination": df["Inclination (degrees)"].round(2),
        }
    )
    return out_df.to_dict(orient="records")


# ---- Data quality report -------------------------------------------------
def write_quality_report(flags: list[dict[str, Any]]) -> None:
    """
    Write a human-readable Markdown report of every flagged row, grouped
    by category. Always overwritten on a build run.
    """
    QUALITY_REPORT.parent.mkdir(parents=True, exist_ok=True)

    by_cat: dict[str, list[dict[str, Any]]] = {}
    for f in flags:
        by_cat.setdefault(f["category"], []).append(f)

    cat_descriptions = {
        "dropped": (
            "Rows excluded from both output JSONs because their orbital "
            "parameters are either corrupt or incomplete. Aggregate counts "
            "in `satellites.json` and the per-satellite list in "
            "`satellites-globe.json` both exclude these so the two files "
            "always agree on the total satellite count."
        ),
        "orbit_reclassified": (
            "Rows whose UCS `Class of Orbit` was overridden by the script's "
            "physics-based classifier (e.g. LEO satellites at GEO altitude)."
        ),
        "invalid_eccentricity": (
            "Rows where the UCS eccentricity column is outside `[0, 1)` "
            "(usually a sign-error typo). The bad value is discarded and "
            "eccentricity is recomputed from perigee and apogee for "
            "classification purposes."
        ),
    }

    lines = [
        "# Data Quality Flags",
        "",
        "Auto-generated by `scripts/build_data.py`. Do not edit by hand.",
        "",
        "Each entry below is a row in the UCS CSV that the build script "
        "either corrected, overrode, or dropped.",
        "",
        f"**Total flags:** {len(flags)}",
        "",
    ]

    # Show "dropped" first because it is the most consequential category.
    cat_order = sorted(by_cat.keys(), key=lambda c: (c != "dropped", c))
    for cat in cat_order:
        rows = by_cat[cat]
        lines.append(f"## {cat} ({len(rows)})")
        lines.append("")
        if cat in cat_descriptions:
            lines.append(cat_descriptions[cat])
            lines.append("")
        for r in rows:
            lines.append(f"- **{r['name']}** - {r['detail']}")
        lines.append("")

    if not flags:
        lines.append("_No flags - source data is clean._")
        lines.append("")

    QUALITY_REPORT.write_text("\n".join(lines), encoding="utf-8")


# ---- Validation ----------------------------------------------------------
def validate(main_json: dict, globe_json: list) -> list[str]:
    errors = []

    # No LEO satellite should sit at GEO altitude.
    bad = [s for s in globe_json if s["orbit_class"] == "LEO" and s["altitude"] > 30000]
    if bad:
        errors.append(
            f"{len(bad)} LEO satellite(s) still have altitude > 30,000 km: "
            + ", ".join(s["name"] for s in bad[:5])
        )

    # Orbit distribution should sum to total_satellites.
    od_total = sum(o["count"] for o in main_json["orbit_distribution"])
    n = main_json["summary"]["total_satellites"]
    if od_total != n:
        errors.append(f"orbit_distribution total {od_total} != summary total {n}")

    # Purpose breakdown should also sum to total_satellites.
    pb_total = sum(p["count"] for p in main_json["purpose_breakdown"])
    if pb_total != n:
        errors.append(f"purpose_breakdown total {pb_total} != summary total {n}")

    # Lorenz curve should be monotone non-decreasing and end at 100.
    pcts = [pt["pct_satellites"] for pt in main_json["lorenz_curve"]]
    if pcts != sorted(pcts):
        errors.append("lorenz_curve pct_satellites is not monotone")
    if main_json["lorenz_curve"][-1]["pct_operators"] != 100:
        errors.append("lorenz_curve does not end at 100% of operators")

    return errors


# ---- Build pipeline ------------------------------------------------------
def build(verbose: bool = True) -> tuple[dict, list, list[dict[str, Any]]]:
    """
    Run the full pipeline and return (main_json, globe_json, flags).
    Does NOT write to disk - that is the caller's job.
    """
    reset_flags()
    if verbose:
        print(f"Loading {CSV_PATH.relative_to(REPO)}")
    df = load_dataframe(verbose=verbose)
    if verbose:
        print(f"  {len(df)} rows after cleaning")
        print(f"  {len(get_flags())} data quality flag(s)\n")

    main_json = build_main_json(df)
    globe_json = build_globe_json(df)

    errors = validate(main_json, globe_json)
    if errors:
        print("VALIDATION FAILED:")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)

    return main_json, globe_json, get_flags()


def render_main_json(obj: dict) -> str:
    return json.dumps(obj, indent=2) + "\n"


def render_globe_json(obj: list) -> str:
    return json.dumps(obj, separators=(",", ":"))


# ---- Subcommands ---------------------------------------------------------
def cmd_write(verbose: bool) -> int:
    main_json, globe_json, flags = build(verbose=verbose)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_MAIN.write_text(render_main_json(main_json), encoding="utf-8")
    OUT_GLOBE.write_text(render_globe_json(globe_json), encoding="utf-8")
    write_quality_report(flags)

    if verbose:
        print(f"Wrote {OUT_MAIN.relative_to(REPO)}")
        print(f"Wrote {OUT_GLOBE.relative_to(REPO)}  ({len(globe_json)} satellites)")
        print(f"Wrote {QUALITY_REPORT.relative_to(REPO)}  ({len(flags)} flags)\n")

        od = {o["orbit"]: o["count"] for o in main_json["orbit_distribution"]}
        print(f"Orbit distribution: {od}")
        print(f"Total: {main_json['summary']['total_satellites']}")
        print("OK")
    return 0


def cmd_check(verbose: bool) -> int:
    """
    Recompute the JSONs in memory and compare against what is currently
    committed on disk. Exit nonzero on any drift. Useful as a pre-commit
    hook or CI guard.
    """
    main_json, globe_json, _ = build(verbose=verbose)

    expected_main = render_main_json(main_json)
    expected_globe = render_globe_json(globe_json)

    drifts = []
    if not OUT_MAIN.exists():
        drifts.append(f"{OUT_MAIN.relative_to(REPO)} is missing")
    elif OUT_MAIN.read_text(encoding="utf-8") != expected_main:
        drifts.append(f"{OUT_MAIN.relative_to(REPO)} is out of date")
    if not OUT_GLOBE.exists():
        drifts.append(f"{OUT_GLOBE.relative_to(REPO)} is missing")
    elif OUT_GLOBE.read_text(encoding="utf-8") != expected_globe:
        drifts.append(f"{OUT_GLOBE.relative_to(REPO)} is out of date")

    if drifts:
        print("CHECK FAILED:")
        for d in drifts:
            print(f"  - {d}")
        print("\nRun `python scripts/build_data.py` to regenerate.")
        return 1

    if verbose:
        print("CHECK OK - committed JSONs match the script output.")
    return 0


# ---- CLI -----------------------------------------------------------------
def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog="build_data.py",
        description="Regenerate prototype data files from the UCS Satellite Database.",
    )
    p.add_argument(
        "--check",
        action="store_true",
        help="Recompute and compare against committed files; exit nonzero on drift. "
             "Does not write anything.",
    )
    p.add_argument(
        "-q",
        "--quiet",
        action="store_true",
        help="Suppress informational output (errors still print).",
    )
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    verbose = not args.quiet
    if args.check:
        return cmd_check(verbose=verbose)
    return cmd_write(verbose=verbose)


if __name__ == "__main__":
    sys.exit(main())
