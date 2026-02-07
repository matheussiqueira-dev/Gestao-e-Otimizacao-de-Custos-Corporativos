from datetime import date

from app.schemas.simulations import CutByCenter, SimulationRequest
from app.services.cost_service import SimulationService


class FakeRepository:
    def get_simulation_matrix(self, _filters):
        return [
            {
                "cost_center_id": 1,
                "cost_center_name": "Operacoes",
                "category_id": 1,
                "category_name": "Logistica",
                "total_amount": 1000.0,
            },
            {
                "cost_center_id": 1,
                "cost_center_name": "Operacoes",
                "category_id": 2,
                "category_name": "Energia",
                "total_amount": 1000.0,
            },
            {
                "cost_center_id": 2,
                "cost_center_name": "Marketing",
                "category_id": 1,
                "category_name": "Logistica",
                "total_amount": 1000.0,
            },
        ]


def test_simulation_applies_center_cut():
    service = SimulationService(FakeRepository())  # type: ignore[arg-type]
    payload = SimulationRequest(
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 31),
        center_cuts=[CutByCenter(cost_center_id=1, percent_cut=10)],
    )
    result = service.run(payload)
    assert result.baseline_total == 3000.0
    assert result.projected_total == 2800.0
    assert result.estimated_savings == 200.0

