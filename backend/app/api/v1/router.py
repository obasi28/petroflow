from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, wells, production, dca, projects, imports,
    dashboard, pvt, material_balance, well_test,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(wells.router)
api_router.include_router(production.router)
api_router.include_router(dca.router)
api_router.include_router(projects.router)
api_router.include_router(imports.router)
api_router.include_router(dashboard.router)
api_router.include_router(pvt.router)
api_router.include_router(material_balance.router)
api_router.include_router(well_test.router)
