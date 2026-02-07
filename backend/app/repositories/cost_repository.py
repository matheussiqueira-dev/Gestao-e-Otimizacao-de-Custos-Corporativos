from datetime import date
from typing import Any, Literal

from sqlalchemy import Date, Select, func, select
from sqlalchemy.orm import Session

from app.models.entities import Category, CostCenter, CostEntry, Project
from app.schemas.costs import CostFilters

AggregationDimension = Literal["month", "cost_center", "project", "category"]


class CostRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_cost_centers(self) -> list[dict[str, Any]]:
        rows = self.db.execute(select(CostCenter.id, CostCenter.code, CostCenter.name).order_by(CostCenter.name)).all()
        return [{"id": row.id, "code": row.code, "name": row.name} for row in rows]

    def list_projects(self) -> list[dict[str, Any]]:
        rows = self.db.execute(select(Project.id, Project.code, Project.name).order_by(Project.name)).all()
        return [{"id": row.id, "code": row.code, "name": row.name} for row in rows]

    def list_categories(self) -> list[dict[str, Any]]:
        rows = self.db.execute(select(Category.id, Category.code, Category.name).order_by(Category.name)).all()
        return [{"id": row.id, "code": row.code, "name": row.name} for row in rows]

    def get_total_cost(self, filters: CostFilters) -> float:
        stmt = (
            select(func.coalesce(func.sum(CostEntry.amount), 0).label("total_amount"))
            .select_from(CostEntry)
            .join(CostCenter, CostCenter.id == CostEntry.cost_center_id)
            .join(Project, Project.id == CostEntry.project_id)
            .join(Category, Category.id == CostEntry.category_id)
        )
        stmt = self._apply_filters(stmt, filters)
        row = self.db.execute(stmt).one()
        return float(row.total_amount or 0)

    def get_aggregated_costs(self, filters: CostFilters, group_by: list[AggregationDimension]) -> list[dict[str, Any]]:
        dimensions = {
            "month": func.date_trunc("month", CostEntry.reference_date).cast(Date).label("month"),
            "cost_center": CostCenter.name.label("cost_center"),
            "project": Project.name.label("project"),
            "category": Category.name.label("category"),
        }

        selected_dimensions = [dimensions[key] for key in group_by]
        stmt = (
            select(
                *selected_dimensions,
                func.coalesce(func.sum(CostEntry.amount), 0).label("total_amount"),
            )
            .select_from(CostEntry)
            .join(CostCenter, CostCenter.id == CostEntry.cost_center_id)
            .join(Project, Project.id == CostEntry.project_id)
            .join(Category, Category.id == CostEntry.category_id)
        )

        stmt = self._apply_filters(stmt, filters)
        if selected_dimensions:
            stmt = stmt.group_by(*selected_dimensions).order_by(*selected_dimensions)

        rows = self.db.execute(stmt).all()
        payload: list[dict[str, Any]] = []
        for row in rows:
            row_dict = dict(row._mapping)
            row_dict["total_amount"] = float(row_dict.get("total_amount", 0) or 0)
            payload.append(row_dict)
        return payload

    def get_simulation_matrix(self, filters: CostFilters) -> list[dict[str, Any]]:
        stmt = (
            select(
                CostCenter.id.label("cost_center_id"),
                CostCenter.name.label("cost_center_name"),
                Category.id.label("category_id"),
                Category.name.label("category_name"),
                func.coalesce(func.sum(CostEntry.amount), 0).label("total_amount"),
            )
            .select_from(CostEntry)
            .join(CostCenter, CostCenter.id == CostEntry.cost_center_id)
            .join(Project, Project.id == CostEntry.project_id)
            .join(Category, Category.id == CostEntry.category_id)
        )
        stmt = self._apply_filters(stmt, filters)
        stmt = stmt.group_by(CostCenter.id, CostCenter.name, Category.id, Category.name).order_by(CostCenter.name, Category.name)
        rows = self.db.execute(stmt).all()
        return [
            {
                "cost_center_id": row.cost_center_id,
                "cost_center_name": row.cost_center_name,
                "category_id": row.category_id,
                "category_name": row.category_name,
                "total_amount": float(row.total_amount or 0),
            }
            for row in rows
        ]

    def get_bucket_totals(self, start_date: date, end_date: date) -> list[dict[str, Any]]:
        stmt = (
            select(
                CostCenter.name.label("cost_center"),
                Category.name.label("category"),
                func.coalesce(func.sum(CostEntry.amount), 0).label("total_amount"),
            )
            .select_from(CostEntry)
            .join(CostCenter, CostCenter.id == CostEntry.cost_center_id)
            .join(Category, Category.id == CostEntry.category_id)
            .where(CostEntry.reference_date.between(start_date, end_date))
            .group_by(CostCenter.name, Category.name)
        )
        rows = self.db.execute(stmt).all()
        return [
            {
                "cost_center": row.cost_center,
                "category": row.category,
                "total_amount": float(row.total_amount or 0),
            }
            for row in rows
        ]

    def get_monthly_bucket_totals(self, start_date: date, end_date: date) -> list[dict[str, Any]]:
        month_col = func.date_trunc("month", CostEntry.reference_date).cast(Date).label("month")
        stmt = (
            select(
                month_col,
                CostCenter.name.label("cost_center"),
                Category.name.label("category"),
                func.coalesce(func.sum(CostEntry.amount), 0).label("total_amount"),
            )
            .select_from(CostEntry)
            .join(CostCenter, CostCenter.id == CostEntry.cost_center_id)
            .join(Category, Category.id == CostEntry.category_id)
            .where(CostEntry.reference_date.between(start_date, end_date))
            .group_by(month_col, CostCenter.name, Category.name)
            .order_by(month_col, CostCenter.name, Category.name)
        )
        rows = self.db.execute(stmt).all()
        return [
            {
                "month": row.month,
                "cost_center": row.cost_center,
                "category": row.category,
                "total_amount": float(row.total_amount or 0),
            }
            for row in rows
        ]

    @staticmethod
    def _apply_filters(stmt: Select[Any], filters: CostFilters) -> Select[Any]:
        stmt = stmt.where(CostEntry.reference_date.between(filters.start_date, filters.end_date))
        if filters.cost_center_ids:
            stmt = stmt.where(CostEntry.cost_center_id.in_(filters.cost_center_ids))
        if filters.project_ids:
            stmt = stmt.where(CostEntry.project_id.in_(filters.project_ids))
        if filters.category_ids:
            stmt = stmt.where(CostEntry.category_id.in_(filters.category_ids))
        return stmt

