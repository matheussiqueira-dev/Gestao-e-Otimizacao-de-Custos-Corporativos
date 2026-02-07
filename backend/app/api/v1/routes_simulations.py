from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import require_scope
from app.db.session import get_db
from app.repositories import CostRepository
from app.schemas.common import ErrorResponse
from app.schemas.simulations import (
    SimulationComparisonRequest,
    SimulationComparisonResponse,
    SimulationRequest,
    SimulationResponse,
)
from app.services import SimulationService

ERROR_RESPONSES = {
    401: {"model": ErrorResponse, "description": "Missing/invalid API key"},
    403: {"model": ErrorResponse, "description": "Insufficient scope"},
    422: {"model": ErrorResponse, "description": "Validation error"},
    500: {"model": ErrorResponse, "description": "Internal server error"},
}

router = APIRouter(tags=["simulations"])


@router.post("/simulations/run", response_model=SimulationResponse, responses=ERROR_RESPONSES)
def run_simulation(
    payload: SimulationRequest,
    db: Session = Depends(get_db),
    _auth=Depends(require_scope("simulations:write")),
) -> SimulationResponse:
    service = SimulationService(CostRepository(db))
    return service.run(payload)


@router.post("/simulations/compare", response_model=SimulationComparisonResponse, responses=ERROR_RESPONSES)
def compare_simulations(
    payload: SimulationComparisonRequest,
    db: Session = Depends(get_db),
    _auth=Depends(require_scope("simulations:write")),
) -> SimulationComparisonResponse:
    service = SimulationService(CostRepository(db))
    return service.compare(payload)
