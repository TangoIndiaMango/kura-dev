"""Generate Impact PDF bytes (fpdf2) — aggregate only, no PII."""
from __future__ import annotations

from io import BytesIO

from fpdf import FPDF

from analytics.services.impact import DISCLAIMER, monthly_snapshot
from core.money import format_naira


def _ascii(value: object) -> str:
    return (
        str(value or "—")
        .replace("₦", "NGN ")
        .replace("·", "-")
        .replace("—", "-")
        .encode("latin-1", "replace")
        .decode("latin-1")
    )


def render_impact_pdf(*, period: str | None = None) -> bytes:
    snap = monthly_snapshot(period=period)
    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()
    pdf.set_margins(18, 18, 18)

    def line(text: str, *, bold: bool = False, size: int = 11, color=(26, 43, 54)) -> None:
        pdf.set_x(pdf.l_margin)
        pdf.set_font("Helvetica", "B" if bold else "", size)
        pdf.set_text_color(*color)
        pdf.multi_cell(pdf.epw, 6, _ascii(text))

    line("KURA Government Impact", bold=True, size=18, color=(0, 49, 83))
    line(f"Period {snap['period']}", size=11, color=(90, 107, 117))
    pdf.ln(4)

    for label, value in (
        ("Operators served", snap["operators_served"]),
        ("Swaps", snap["swaps"]),
        ("Fuel savings", format_naira(int(snap["fuel_savings_kobo"]))),
        ("Engines replaced", snap["engines_replaced"]),
        ("CO2 avoided (kg)", snap["co2_kg"]),
    ):
        line(str(label), size=9, color=(91, 107, 117))
        line(str(value), bold=True, size=12)
        pdf.ln(1)

    pdf.ln(4)
    line("Monthly series", bold=True, size=12)
    for point in snap.get("series") or []:
        line(
            f"{point.get('period')}: {point.get('swaps')} swaps · "
            f"{point.get('co2_t')} t CO2",
            size=10,
        )

    pdf.ln(6)
    line("Disclaimer", bold=True, size=10, color=(91, 107, 117))
    line(DISCLAIMER, size=9, color=(91, 107, 117))

    buf = BytesIO()
    pdf.output(buf)
    return buf.getvalue()
