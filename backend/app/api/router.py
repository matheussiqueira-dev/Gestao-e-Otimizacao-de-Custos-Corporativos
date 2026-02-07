from fastapi import APIRouter

from app.api.v1 import routes_analytics, routes_budgets, routes_costs, routes_simulations

api_router = APIRouter()
api_router.include_router(routes_costs.router)
api_router.include_router(routes_simulations.router)
api_router.include_router(routes_analytics.router)
api_router.include_router(routes_budgets.router)
