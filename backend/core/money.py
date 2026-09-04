"""
Money utilities for KURA Mobility.
Money is always stored as integers in kobo (1 Naira = 100 kobo).
VAT is 7.5% in Nigeria.
"""

VAT_BPS = 750  # 7.5% = 750 basis points

def split_vat(gross_kobo: int) -> tuple[int, int]:
    """
    Given a gross amount in kobo that includes VAT,
    returns (net_kobo, vat_kobo).
    gross = net * 1.075 -> net = gross / 1.075 = gross * 10000 / 10750
    """
    if gross_kobo <= 0:
        return 0, 0
    vat_kobo = round(gross_kobo * VAT_BPS / (10000 + VAT_BPS))
    net_kobo = gross_kobo - vat_kobo
    return net_kobo, vat_kobo

def calculate_vat_add(net_kobo: int) -> int:
    """Calculates 7.5% VAT on top of a net amount."""
    return round(net_kobo * VAT_BPS / 10000)

def kobo_to_naira(kobo: int) -> float:
    return kobo / 100.0

def naira_to_kobo(naira: float) -> int:
    return int(round(naira * 100))

def format_naira(kobo: int) -> str:
    naira = kobo / 100.0
    return f"₦{naira:,.2f}"
