from datetime import date

from pydantic import BaseModel


class DateWindow(BaseModel):
    start_date: date
    end_date: date

