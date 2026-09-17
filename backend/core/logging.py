"""Structured logging helpers with PII redaction."""
from __future__ import annotations

import logging
import re
from typing import Any

SENSITIVE_KEY = re.compile(
    r"(pin|otp|nin|bvn|password|token|authorization|signature|card|secret|refresh)",
    re.I,
)
PHONE_RE = re.compile(r"(\+?234)\d{6}(\d{4})")


def mask_phone(value: str) -> str:
    return PHONE_RE.sub(r"\1***\2", value)


def redact(obj: Any) -> Any:
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if SENSITIVE_KEY.search(str(k)):
                out[k] = "***"
            else:
                out[k] = redact(v)
        return out
    if isinstance(obj, list):
        return [redact(x) for x in obj]
    if isinstance(obj, str):
        return mask_phone(obj)
    return obj


class RedactingFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.args, dict):
            record.args = redact(record.args)
        elif isinstance(record.args, tuple):
            record.args = tuple(redact(a) for a in record.args)
        if isinstance(record.msg, str):
            record.msg = mask_phone(record.msg)
        return True
