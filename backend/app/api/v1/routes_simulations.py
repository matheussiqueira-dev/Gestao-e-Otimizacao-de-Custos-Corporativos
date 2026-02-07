from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories import CostRepository
from app.schemas.simulations import SimulationRequest, SimulationResponse
from app.services import SimulationService

router = APIRouter(tags=["simulations"])


@router.post("/simulations/run", response_model=SimulationResponse)
def run_simulation(payload: SimulationRequest, db: Session = Depends(get_db)) -> SimulationResponse:
    service = SimulationService(CostRepository(db))
    return service.run(payload)

