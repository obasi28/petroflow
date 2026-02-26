"""
Generate realistic test well production data for PetroFlow CSV import.
"""

import csv
import os
from datetime import date
from typing import List, Dict, Any

import numpy as np

RNG = np.random.default_rng(42)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
OUTPUT_PATH = os.path.join(PROJECT_ROOT, "test_wells.csv")

COLUMNS = [
    "well_name", "api_number", "well_type", "well_status", "orientation",
    "latitude", "longitude", "basin", "field", "county", "state",
    "first_prod_date", "production_date", "days_on",
    "oil_rate", "gas_rate", "water_rate",
    "cum_oil", "cum_gas", "cum_water",
]


def _permian_wells():
    counties = ["Loving", "Reeves", "Ward", "Loving", "Reeves", "Ward"]
    fields = ["Red Hills", "Pecos Valley", "Ward South", "Mentone", "Toyah Draw", "Monahans North"]
    lat_range = (31.65, 32.10)
    lon_range = (-104.20, -103.50)
    wells = []
    for i in range(6):
        cc = RNG.integers(100, 500)
        wc = RNG.integers(10000, 99999)
        api = f"42-{cc:03d}-{wc:05d}"
        wells.append(dict(
            well_name=f"Permian {fields[i]} #{i+1}H",
            api_number=api, well_type="oil", orientation="horizontal",
            latitude=round(float(RNG.uniform(*lat_range)), 6),
            longitude=round(float(RNG.uniform(*lon_range)), 6),
            basin="Permian Basin", field=fields[i], county=counties[i], state="TX",
            qi_oil=float(RNG.uniform(600, 1200)),
            Di=float(RNG.uniform(0.04, 0.08)),
            b=float(RNG.uniform(0.6, 1.2)),
            gor_initial=float(RNG.uniform(600, 1000)),
            gor_annual_rise=float(RNG.uniform(0.05, 0.15)),
            wc_initial=float(RNG.uniform(0.05, 0.12)),
            wc_final=float(RNG.uniform(0.35, 0.60)),
            months=int(RNG.integers(24, 37)),
            shut_in=False,
        ))
    wells[3]["shut_in"] = True
    wells[3]["shut_in_month"] = int(RNG.integers(12, 19))
    return wells


def _eagle_ford_wells():
    counties = ["Webb", "La Salle", "Dimmit", "Webb", "La Salle"]
    fields = ["Briscoe Ranch", "Catarina", "Asherton", "Laredo North", "Fowlerton"]
    lat_range = (28.20, 28.80)
    lon_range = (-99.80, -99.00)
    wells = []
    for i in range(5):
        cc = RNG.integers(100, 500)
        wcd = RNG.integers(10000, 99999)
        api = f"42-{cc:03d}-{wcd:05d}"
        wells.append(dict(
            well_name=f"Eagle Ford {fields[i]} #{i+1}H",
            api_number=api, well_type="oil", orientation="horizontal",
            latitude=round(float(RNG.uniform(*lat_range)), 6),
            longitude=round(float(RNG.uniform(*lon_range)), 6),
            basin="Eagle Ford Shale", field=fields[i], county=counties[i], state="TX",
            qi_oil=float(RNG.uniform(400, 900)),
            Di=float(RNG.uniform(0.03, 0.07)),
            b=float(RNG.uniform(0.5, 1.0)),
            gor_initial=float(RNG.uniform(500, 900)),
            gor_annual_rise=float(RNG.uniform(0.05, 0.12)),
            wc_initial=float(RNG.uniform(0.06, 0.15)),
            wc_final=float(RNG.uniform(0.30, 0.55)),
            months=int(RNG.integers(24, 37)),
            shut_in=False,
        ))
    wells[2]["shut_in"] = True
    wells[2]["shut_in_month"] = int(RNG.integers(12, 19))
    return wells


def _marcellus_wells():
    counties = ["Greene", "Washington", "Greene", "Washington"]
    fields = ["Waynesburg", "Amwell", "Jefferson South", "Canton"]
    lat_range = (39.80, 40.20)
    lon_range = (-80.40, -79.90)
    wells = []
    for i in range(4):
        cc = RNG.integers(100, 500)
        wcd = RNG.integers(10000, 99999)
        api = f"37-{cc:03d}-{wcd:05d}"
        wells.append(dict(
            well_name=f"Marcellus {fields[i]} #{i+1}H",
            api_number=api, well_type="gas", orientation="horizontal",
            latitude=round(float(RNG.uniform(*lat_range)), 6),
            longitude=round(float(RNG.uniform(*lon_range)), 6),
            basin="Marcellus Shale", field=fields[i], county=counties[i], state="WV",
            qi_gas=float(RNG.uniform(5000, 15000)),
            Di=float(RNG.uniform(0.03, 0.06)),
            b=float(RNG.uniform(0.5, 1.0)),
            condensate_yield=float(RNG.uniform(5, 30)),
            wc_initial=float(RNG.uniform(0.05, 0.10)),
            wc_final=float(RNG.uniform(0.20, 0.40)),
            months=int(RNG.integers(24, 37)),
            shut_in=False,
        ))
    wells[1]["shut_in"] = True
    wells[1]["shut_in_month"] = int(RNG.integers(12, 19))
    return wells


def hyperbolic_rate(qi, Di, b, t):
    return qi / (1.0 + b * Di * t) ** (1.0 / b)


def _days_in_month(year, month):
    if month == 12:
        return (date(year + 1, 1, 1) - date(year, month, 1)).days
    return (date(year, month + 1, 1) - date(year, month, 1)).days


def generate_rows(well):
    start_year = int(RNG.choice([2022, 2023, 2024]))
    start_month = int(RNG.integers(1, 13))
    first_prod = date(start_year, start_month, 1)
    is_gas_well = well["well_type"] == "gas"
    n_months = well["months"]
    shut_in = well.get("shut_in", False)
    shut_in_month = well.get("shut_in_month", n_months)
    cum_oil = 0.0
    cum_gas = 0.0
    cum_water = 0.0
    rows = []

    for t in range(n_months):
        prod_date = date(
            first_prod.year + (first_prod.month - 1 + t) // 12,
            (first_prod.month - 1 + t) % 12 + 1,
            1,
        )
        cal_days = _days_in_month(prod_date.year, prod_date.month)

        if shut_in and t >= shut_in_month:
            status = "shut_in"
            days_on = 0
            oil_rate = 0.0
            gas_rate = 0.0
            water_rate = 0.0
        else:
            status = "active"
            if RNG.random() < 0.10:
                days_on = int(RNG.integers(15, 26))
            else:
                days_on = int(RNG.integers(28, cal_days + 1))

            if is_gas_well:
                qi_gas = well["qi_gas"]
                gas_rate_raw = hyperbolic_rate(qi_gas, well["Di"], well["b"], t)
                gas_rate = max(0.0, gas_rate_raw * (1.0 + float(RNG.normal(0, 0.03))))
                oil_rate = gas_rate * well["condensate_yield"] / 1000.0
                frac = t / max(n_months - 1, 1)
                wc = well["wc_initial"] + (well["wc_final"] - well["wc_initial"]) * frac
                water_rate = (oil_rate * wc) / max(1.0 - wc, 0.01)
            else:
                qi_oil = well["qi_oil"]
                oil_rate_raw = hyperbolic_rate(qi_oil, well["Di"], well["b"], t)
                oil_rate = max(0.0, oil_rate_raw * (1.0 + float(RNG.normal(0, 0.03))))
                gor = well["gor_initial"] * (1.0 + well["gor_annual_rise"] * (t / 12.0))
                gas_rate = oil_rate * gor / 1000.0
                frac = t / max(n_months - 1, 1)
                wc = well["wc_initial"] + (well["wc_final"] - well["wc_initial"]) * frac
                water_rate = (oil_rate * wc) / max(1.0 - wc, 0.01)

        month_oil = oil_rate * days_on
        month_gas = gas_rate * days_on
        month_water = water_rate * days_on
        cum_oil += month_oil
        cum_gas += month_gas
        cum_water += month_water

        rows.append({
            "well_name": well["well_name"],
            "api_number": well["api_number"],
            "well_type": well["well_type"],
            "well_status": status,
            "orientation": well["orientation"],
            "latitude": well["latitude"],
            "longitude": well["longitude"],
            "basin": well["basin"],
            "field": well["field"],
            "county": well["county"],
            "state": well["state"],
            "first_prod_date": first_prod.isoformat(),
            "production_date": prod_date.isoformat(),
            "days_on": days_on,
            "oil_rate": round(oil_rate, 2),
            "gas_rate": round(gas_rate, 2),
            "water_rate": round(water_rate, 2),
            "cum_oil": round(cum_oil, 2),
            "cum_gas": round(cum_gas, 2),
            "cum_water": round(cum_water, 2),
        })

    return rows


def main():
    all_wells = _permian_wells() + _eagle_ford_wells() + _marcellus_wells()
    all_rows = []
    for well in all_wells:
        all_rows.extend(generate_rows(well))

    with open(OUTPUT_PATH, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(all_rows)

    print(f"Wrote {len(all_rows)} rows for {len(all_wells)} wells to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
