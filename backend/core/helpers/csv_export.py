"""Admin table export — CSV (stdlib) / PDF (fpdf2). Headers + rows owned by backend."""
from __future__ import annotations

import csv
import io
from typing import Iterable, Sequence

from django.http import HttpResponse
from fpdf import FPDF
from fpdf.enums import TableCellFillMode, XPos, YPos
from fpdf.fonts import FontFace

from core.exceptions import DomainError

EXPORT_ROW_CAP = 25_000
PDF_ROW_CAP = 2_000
TRUNCATION_NOTE = (
    f"TRUNCATED at {EXPORT_ROW_CAP:,} rows — contact KURA ops for a full DB export."
)
SUPPORTED_FORMATS = frozenset({"csv", "pdf"})


def _materialize_rows(
    headers: Sequence[str],
    rows: Iterable[Sequence[object]],
    *,
    cap: int = EXPORT_ROW_CAP,
    latin1: bool = False,
) -> tuple[list[list[str]], bool]:
    out: list[list[str]] = []
    truncated = False
    for row in rows:
        if len(out) >= cap:
            truncated = True
            break
        cells = ["" if cell is None else str(cell) for cell in row]
        if latin1:
            cells = [c.encode("latin-1", "replace").decode("latin-1") for c in cells]
        out.append(cells)
    if truncated:
        note = TRUNCATION_NOTE
        if latin1:
            note = note.encode("latin-1", "replace").decode("latin-1")
        pad = [""] * max(0, len(headers) - 1)
        out.append([note, *pad])
    return out, truncated


def csv_response(
    *,
    filename: str,
    headers: Sequence[str],
    rows: Iterable[Sequence[object]],
) -> HttpResponse:
    materialised, truncated = _materialize_rows(headers, rows)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(list(headers))
    writer.writerows(materialised)
    response = HttpResponse(buffer.getvalue(), content_type="text/csv; charset=utf-8")
    safe_name = filename if filename.endswith(".csv") else f"{filename}.csv"
    response["Content-Disposition"] = f'attachment; filename="{safe_name}"'
    _attach_export_headers(response, materialised, truncated)
    return response


def pdf_response(
    *,
    filename: str,
    title: str,
    headers: Sequence[str],
    rows: Iterable[Sequence[object]],
) -> HttpResponse:
    materialised, truncated = _materialize_rows(
        headers, rows, cap=PDF_ROW_CAP, latin1=True
    )
    title_safe = title.encode("latin-1", "replace").decode("latin-1")
    pdf = FPDF(orientation="L", format="A4", unit="mm")
    pdf.set_auto_page_break(auto=True, margin=12)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 8, title_safe, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_font("Helvetica", "", 8)
    pdf.cell(
        0,
        5,
        f"{len(materialised) - (1 if truncated else 0)} rows"
        + (" (truncated — open CSV for full set)" if truncated else ""),
        new_x=XPos.LMARGIN,
        new_y=YPos.NEXT,
    )
    pdf.ln(2)

    table_rows = [list(headers), *materialised]
    with pdf.table(
        rows=table_rows,
        first_row_as_headings=True,
        repeat_headings=1,
        text_align="LEFT",
        line_height=5,
        headings_style=FontFace(
            emphasis="BOLD",
            size_pt=8,
            color=(255, 255, 255),
            fill_color=(30, 41, 59),
        ),
        cell_fill_color=(245, 247, 250),
        cell_fill_mode=TableCellFillMode.EVEN_ROWS,
        borders_layout="HORIZONTAL_LINES",
        padding=1.5,
    ):
        pass

    safe_name = filename if filename.endswith(".pdf") else f"{filename}.pdf"
    response = HttpResponse(bytes(pdf.output()), content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{safe_name}"'
    _attach_export_headers(response, materialised, truncated)
    return response


def table_export_response(
    *,
    format: str,
    filename_stem: str,
    title: str,
    headers: Sequence[str],
    rows: Iterable[Sequence[object]],
) -> HttpResponse:
    fmt = (format or "csv").strip().lower()
    if fmt not in SUPPORTED_FORMATS:
        raise DomainError(
            "VALIDATION_ERROR",
            f"Unsupported export format '{format}'. Use csv or pdf.",
        )
    if fmt == "pdf":
        return pdf_response(
            filename=f"{filename_stem}.pdf",
            title=title,
            headers=headers,
            rows=rows,
        )
    return csv_response(
        filename=f"{filename_stem}.csv",
        headers=headers,
        rows=rows,
    )


def _attach_export_headers(
    response: HttpResponse,
    materialised: list[list[str]],
    truncated: bool,
) -> None:
    response["X-Export-Row-Count"] = str(
        max(0, len(materialised) - (1 if truncated else 0))
    )
    response["X-Export-Truncated"] = "1" if truncated else "0"
    response["Access-Control-Expose-Headers"] = (
        "Content-Disposition, X-Export-Row-Count, X-Export-Truncated"
    )
