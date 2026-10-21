"""
Money utilities for KURA Mobility.
Money is always stored as integers in kobo (1 Naira = 100 kobo).
VAT is 7.5% in Nigeria.
"""

VAT_BPS = 750  # 7.5% = 750 basis points

def split_vat_inclusive(gross_kobo: int) -> tuple[int, int]:
    """
    VAT-inclusive gross (what the rider sees) → (net_kobo, vat_kobo).
    Prices are configured inclusive; split only when posting the ledger.
    """
    if gross_kobo <= 0:
        return 0, 0
    vat_kobo = round(gross_kobo * VAT_BPS / (10_000 + VAT_BPS))
    net_kobo = gross_kobo - vat_kobo
    return net_kobo, vat_kobo


# Back-compat alias
split_vat = split_vat_inclusive

def calculate_vat_add(net_kobo: int) -> int:
    """Calculates 7.5% VAT on top of a net amount."""
    return round(net_kobo * VAT_BPS / 10000)

def kobo_to_naira(kobo: int) -> float:
    return kobo / 100.0

def naira_to_kobo(naira: int | float) -> int:
    """Prefer integers. Floats are rounded — do not use for money input paths."""
    return int(round(naira * 100))

def format_naira(kobo: int) -> str:
    naira = kobo / 100.0
    sign = "-" if naira < 0 else ""  # ASCII: PDF core fonts and SMS have no U+2212
    return f"{sign}₦{abs(naira):,.2f}"
