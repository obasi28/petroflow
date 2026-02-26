"""
PetroFlow Database Seed Script
Populates the database with realistic sample data for development and demo.
Idempotent: checks if seed user exists before inserting.

Usage:
    cd backend && python -m scripts.seed_data
"""

import asyncio
import sys
import math
import calendar
from datetime import date, timedelta
from pathlib import Path

import numpy as np

# Ensure backend package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from passlib.context import CryptContext

from app.database import async_session
from app.models.user import User, Team, TeamMembership
from app.models.well import Well
from app.models.project import Project
from app.models.production import ProductionRecord
from app.models.dca import DCAAnalysis, DCAForecastPoint
from app.models.pvt import PVTStudy
from app.models.base import generate_uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ---------------------------------------------------------------------------
# Well definitions
# ---------------------------------------------------------------------------

WELLS = [
    # Permian Basin project wells
    dict(well_name="Permian-H-001", api_number="42-461-40001", well_type="oil", well_status="active",
         orientation="horizontal", basin="Permian Basin", field_name="Spraberry", formation="Wolfcamp A",
         operator="PetroFlow Demo", county="Midland", state_province="TX",
         latitude=31.9973, longitude=-102.0779, total_depth=22000, lateral_length=10000,
         initial_pressure=3800, reservoir_temp=210, porosity=0.08, permeability=0.05, net_pay=250,
         qi=1200, di=0.045, fluid="oil", project_idx=0),
    dict(well_name="Permian-V-002", api_number="42-461-40002", well_type="oil", well_status="active",
         orientation="vertical", basin="Permian Basin", field_name="Spraberry", formation="Wolfcamp B",
         operator="PetroFlow Demo", county="Midland", state_province="TX",
         latitude=31.9851, longitude=-102.0912, total_depth=12000, lateral_length=None,
         initial_pressure=3600, reservoir_temp=200, porosity=0.07, permeability=0.03, net_pay=180,
         qi=500, di=0.06, fluid="oil", project_idx=0),
    dict(well_name="Permian-H-003", api_number="42-461-40003", well_type="oil", well_status="shut_in",
         orientation="horizontal", basin="Permian Basin", field_name="Spraberry", formation="Wolfcamp A",
         operator="PetroFlow Demo", county="Upton", state_province="TX",
         latitude=31.8902, longitude=-101.9631, total_depth=21500, lateral_length=9500,
         initial_pressure=3750, reservoir_temp=208, porosity=0.08, permeability=0.04, net_pay=240,
         qi=900, di=0.07, fluid="oil", project_idx=0),
    dict(well_name="Midland-H-010", api_number="42-461-40010", well_type="oil", well_status="active",
         orientation="horizontal", basin="Permian Basin", field_name="Midland", formation="Lower Spraberry",
         operator="PetroFlow Demo", county="Martin", state_province="TX",
         latitude=32.0523, longitude=-101.8912, total_depth=21000, lateral_length=9800,
         initial_pressure=3700, reservoir_temp=205, porosity=0.075, permeability=0.045, net_pay=230,
         qi=1400, di=0.04, fluid="oil", project_idx=0),
    # Eagle Ford project wells
    dict(well_name="EagleFord-H-004", api_number="42-283-40004", well_type="oil", well_status="active",
         orientation="horizontal", basin="Eagle Ford", field_name="Hawkville", formation="Eagle Ford Shale",
         operator="PetroFlow Demo", county="La Salle", state_province="TX",
         latitude=28.3416, longitude=-99.1021, total_depth=16000, lateral_length=7500,
         initial_pressure=6500, reservoir_temp=290, porosity=0.06, permeability=0.02, net_pay=150,
         qi=800, di=0.05, fluid="oil", project_idx=1),
    dict(well_name="EagleFord-H-005", api_number="42-283-40005", well_type="gas", well_status="active",
         orientation="horizontal", basin="Eagle Ford", field_name="Karnes Trough", formation="Eagle Ford Shale",
         operator="PetroFlow Demo", county="Karnes", state_province="TX",
         latitude=28.8919, longitude=-97.8541, total_depth=14500, lateral_length=6800,
         initial_pressure=7000, reservoir_temp=305, porosity=0.055, permeability=0.015, net_pay=120,
         qi=6000, di=0.035, fluid="gas", project_idx=1),
    dict(well_name="EagleFord-H-011", api_number="42-283-40011", well_type="oil", well_status="active",
         orientation="horizontal", basin="Eagle Ford", field_name="Hawkville", formation="Eagle Ford Shale",
         operator="PetroFlow Demo", county="Webb", state_province="TX",
         latitude=28.1502, longitude=-99.4023, total_depth=15500, lateral_length=7200,
         initial_pressure=6200, reservoir_temp=280, porosity=0.058, permeability=0.018, net_pay=140,
         qi=650, di=0.055, fluid="oil", project_idx=1),
    # Unassigned wells
    dict(well_name="Bakken-H-006", api_number="33-105-40006", well_type="oil", well_status="active",
         orientation="horizontal", basin="Williston", field_name="Bakken", formation="Middle Bakken",
         operator="PetroFlow Demo", county="McKenzie", state_province="ND",
         latitude=47.8039, longitude=-103.7823, total_depth=21000, lateral_length=9500,
         initial_pressure=7500, reservoir_temp=240, porosity=0.06, permeability=0.04, net_pay=45,
         qi=1500, di=0.05, fluid="oil", project_idx=None),
    dict(well_name="Marcellus-H-007", api_number="37-117-40007", well_type="gas", well_status="active",
         orientation="horizontal", basin="Appalachian", field_name="Marcellus", formation="Marcellus Shale",
         operator="PetroFlow Demo", county="Greene", state_province="PA",
         latitude=39.8548, longitude=-80.1812, total_depth=9500, lateral_length=8500,
         initial_pressure=4200, reservoir_temp=160, porosity=0.07, permeability=0.001, net_pay=100,
         qi=8000, di=0.03, fluid="gas", project_idx=None),
    dict(well_name="DJ-Basin-V-008", api_number="05-123-40008", well_type="oil", well_status="plugged",
         orientation="vertical", basin="DJ Basin", field_name="Wattenberg", formation="Niobrara",
         operator="PetroFlow Demo", county="Weld", state_province="CO",
         latitude=40.3912, longitude=-104.6912, total_depth=8500, lateral_length=None,
         initial_pressure=3200, reservoir_temp=190, porosity=0.09, permeability=0.01, net_pay=70,
         qi=350, di=0.08, fluid="oil", project_idx=None),
]


def _generate_production(qi: float, di: float, fluid: str, start_date: date, months: int,
                          well_id, team_id):
    """Generate realistic declining production records."""
    records = []
    cum_oil = cum_gas = cum_water = 0.0
    rng = np.random.default_rng(hash(str(well_id)) % 2**31)
    is_gas = fluid == "gas"
    wc_start = rng.uniform(0.05, 0.20)

    for m in range(months):
        d = start_date + timedelta(days=30 * m)
        prod_date = date(d.year, d.month, 1)
        days_in_month = calendar.monthrange(prod_date.year, prod_date.month)[1]

        t = m + 1
        base_rate = qi * math.exp(-di * t)
        noise = rng.normal(1.0, 0.05)
        rate = max(base_rate * noise, 1.0)

        wc = min(wc_start + m * rng.uniform(0.003, 0.008), 0.95)
        water_rate = rate * wc / (1 - wc) if wc < 0.95 else rate * 10

        if is_gas:
            gas_rate = rate
            oil_rate = gas_rate / rng.uniform(5, 15)
            gor = gas_rate / oil_rate if oil_rate > 0 else 0
        else:
            oil_rate = rate
            gas_rate = oil_rate * rng.uniform(0.5, 3.0)
            gor = gas_rate / oil_rate if oil_rate > 0 else 0

        cum_oil += oil_rate * days_in_month
        cum_gas += gas_rate * days_in_month
        cum_water += water_rate * days_in_month

        records.append(ProductionRecord(
            well_id=well_id,
            team_id=team_id,
            production_date=prod_date,
            days_on=days_in_month,
            oil_rate=round(oil_rate, 2),
            gas_rate=round(gas_rate, 2),
            water_rate=round(water_rate, 2),
            cum_oil=round(cum_oil, 1),
            cum_gas=round(cum_gas, 1),
            cum_water=round(cum_water, 1),
            gor=round(gor, 2),
            water_cut=round(wc, 4),
            tubing_pressure=round(rng.uniform(200, 600), 0),
            casing_pressure=round(rng.uniform(400, 900), 0),
        ))
    return records


def _generate_dca(well_id, team_id, user_id, model_type, qi, di, b, start_date, fluid_type):
    """Generate a DCA analysis with forecast points."""
    analysis_id = generate_uuid()

    params = {"qi": qi, "di": di}
    if model_type == "hyperbolic":
        params["b"] = b

    # Generate forecast
    forecast_months = 120
    points = []
    cum = 0.0
    for m in range(1, forecast_months + 1):
        t = float(m)
        if model_type == "exponential":
            rate = qi * math.exp(-di * t)
        else:
            rate = qi / ((1 + b * di * t) ** (1 / b))
        rate = max(rate, 0.1)
        cum += rate * 30.44  # average days/month
        fd = start_date + timedelta(days=int(30.44 * m))
        points.append(DCAForecastPoint(
            analysis_id=analysis_id,
            forecast_date=date(fd.year, fd.month, 1),
            time_months=t,
            rate=round(rate, 4),
            cumulative=round(cum, 2),
        ))

    eur = cum / 1000  # Mstb or MMscf

    analysis = DCAAnalysis(
        id=analysis_id,
        well_id=well_id,
        team_id=team_id,
        name=f"{model_type.title()} Fit",
        model_type=model_type,
        fluid_type=fluid_type,
        start_date=start_date,
        parameters=params,
        r_squared=round(0.92 + np.random.uniform(0, 0.07), 4),
        rmse=round(np.random.uniform(10, 80), 2),
        aic=round(np.random.uniform(200, 500), 1),
        bic=round(np.random.uniform(210, 520), 1),
        eur=round(eur, 2),
        remaining_reserves=round(eur * 0.7, 2),
        cum_at_forecast_start=round(eur * 0.3, 2),
        forecast_months=forecast_months,
        economic_limit=5.0,
        status="completed",
        created_by=user_id,
    )
    return analysis, points


async def seed():
    async with async_session() as db:
        # ── Idempotency check ──────────────────────────────────────────
        existing = await db.execute(select(User).where(User.email == "seed@petroflow.dev"))
        if existing.scalar_one_or_none():
            print("Seed data already exists, skipping.")
            return

        print("Creating seed data...")

        # ── User + Team ────────────────────────────────────────────────
        user = User(
            id=generate_uuid(),
            email="seed@petroflow.dev",
            name="Seed User",
            password_hash=pwd_context.hash("PetroFlow2024!"),
            is_active=True,
        )
        db.add(user)
        await db.flush()

        team = Team(id=generate_uuid(), name="Demo Team", slug="demo-team", owner_id=user.id)
        db.add(team)
        await db.flush()

        membership = TeamMembership(
            id=generate_uuid(), user_id=user.id, team_id=team.id, role="owner"
        )
        db.add(membership)
        await db.flush()
        print(f"  User: {user.email}  Team: {team.slug}")

        # ── Projects ──────────────────────────────────────────────────
        projects = [
            Project(id=generate_uuid(), team_id=team.id, name="Permian Basin Study",
                    description="Multi-well horizontal development in the Permian Basin Wolfcamp.", created_by=user.id),
            Project(id=generate_uuid(), team_id=team.id, name="Eagle Ford Analysis",
                    description="Eagle Ford Shale oil and gas window analysis.", created_by=user.id),
        ]
        for p in projects:
            db.add(p)
        await db.flush()
        print(f"  Projects: {len(projects)}")

        # ── Wells ─────────────────────────────────────────────────────
        well_objects = []
        for wdef in WELLS:
            proj_idx = wdef.pop("project_idx")
            qi = wdef.pop("qi")
            di = wdef.pop("di")
            fluid = wdef.pop("fluid")
            project_id = projects[proj_idx].id if proj_idx is not None else None

            first_prod = date(2023, np.random.randint(1, 7), 1)
            spud = first_prod - timedelta(days=np.random.randint(60, 180))
            completion = first_prod - timedelta(days=np.random.randint(10, 40))

            w = Well(
                id=generate_uuid(),
                team_id=team.id,
                project_id=project_id,
                spud_date=spud,
                completion_date=completion,
                first_prod_date=first_prod,
                created_by=user.id,
                **wdef,
            )
            db.add(w)
            well_objects.append((w, qi, di, fluid, first_prod))

        await db.flush()
        print(f"  Wells: {len(well_objects)}")

        # ── Production records ────────────────────────────────────────
        prod_count = 0
        for w, qi, di, fluid, first_prod in well_objects:
            months = np.random.randint(24, 37)
            records = _generate_production(qi, di, fluid, first_prod, months, w.id, team.id)
            for r in records:
                db.add(r)
            prod_count += len(records)

        await db.flush()
        print(f"  Production records: {prod_count}")

        # ── DCA Analyses ──────────────────────────────────────────────
        dca_count = 0
        active_oil = [(w, qi, di, fp) for w, qi, di, fl, fp in well_objects
                      if w.well_status == "active" and fl == "oil"]
        for i, (w, qi, di, fp) in enumerate(active_oil[:4]):
            mt = "exponential" if i % 2 == 0 else "hyperbolic"
            b = 0.0 if mt == "exponential" else 0.5
            analysis, points = _generate_dca(
                w.id, team.id, user.id, mt, qi, di, b, fp, w.well_type
            )
            db.add(analysis)
            for pt in points:
                db.add(pt)
            dca_count += 1

        await db.flush()
        print(f"  DCA analyses: {dca_count}")

        # ── PVT Studies ───────────────────────────────────────────────
        pvt_wells = [wo for wo, *_ in well_objects if wo.well_type == "oil"][:2]
        for w in pvt_wells:
            study = PVTStudy(
                id=generate_uuid(),
                well_id=w.id,
                team_id=team.id,
                name=f"PVT Study - {w.well_name}",
                inputs={
                    "api_gravity": round(np.random.uniform(30, 42), 1),
                    "gas_gravity": round(np.random.uniform(0.65, 0.85), 3),
                    "temperature": round(np.random.uniform(180, 260), 0),
                    "separator_pressure": 100.0,
                    "separator_temperature": 60.0,
                },
                correlation_set={
                    "bubble_point": "standing",
                    "rs": "standing",
                    "bo": "standing",
                    "dead_oil_viscosity": "beggs_robinson",
                },
                results={
                    "bubble_point": round(np.random.uniform(1800, 3200), 0),
                    "rs_at_pb": round(np.random.uniform(300, 800), 0),
                    "bo_at_pb": round(np.random.uniform(1.15, 1.45), 3),
                    "mu_o_at_pb": round(np.random.uniform(0.3, 1.2), 3),
                },
                created_by=user.id,
            )
            db.add(study)

        await db.flush()
        print(f"  PVT studies: {len(pvt_wells)}")

        await db.commit()
        print("\nSeed data created successfully!")
        print(f"  Login: seed@petroflow.dev / PetroFlow2024!")


if __name__ == "__main__":
    asyncio.run(seed())
