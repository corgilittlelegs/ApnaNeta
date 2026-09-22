"""Evidence-first candidate election-expenditure compliance calculations."""

from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional


FILING_WINDOW_DAYS = 30


@dataclass(frozen=True)
class ExpenseCompliance:
    filing_due_on: date
    filing_status: str
    ceiling_status: str


def filing_due_date(result_declared_on: date) -> date:
    """Section 78 window: the declaration date is excluded, then 30 days run."""
    return result_declared_on + timedelta(days=FILING_WINDOW_DAYS)


def evaluate_expense_compliance(
    *,
    result_declared_on: date,
    filed_on: Optional[date],
    declared_expenditure: Optional[Decimal],
    expenditure_ceiling: Optional[Decimal],
    as_of: Optional[date] = None,
) -> ExpenseCompliance:
    """Classifies filing timeliness and ceiling compliance without making legal findings."""
    due_on = filing_due_date(result_declared_on)
    today = as_of or date.today()

    if filed_on is None:
        filing_status = "missing" if today > due_on else "pending"
    else:
        filing_status = "on_time" if filed_on <= due_on else "late"

    if declared_expenditure is None or expenditure_ceiling is None:
        ceiling_status = "unknown"
    elif declared_expenditure > expenditure_ceiling:
        ceiling_status = "over_limit"
    else:
        ceiling_status = "within_limit"
    return ExpenseCompliance(due_on, filing_status, ceiling_status)
