from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

class DomainError(Exception):
    """Base domain exception with standardized code and HTTP status."""
    def __init__(self, code: str, message: str, details=None, http_status=status.HTTP_400_BAD_REQUEST):
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}
        self.http_status = http_status

def custom_exception_handler(exc, context):
    """
    Uniform error envelope:
    {
      "error": {
        "code": "ERROR_CODE",
        "message": "Human-readable explanation",
        "details": {...}
      }
    }
    """
    if isinstance(exc, DomainError):
        return Response(
            {
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                }
            },
            status=exc.http_status
        )

    # Call REST framework's default exception handler first to get standard response
    response = exception_handler(exc, context)

    if response is not None:
        error_code = getattr(exc, 'default_code', 'API_ERROR').upper()
        if response.status_code == 404:
            error_code = 'NOT_FOUND'
        elif response.status_code == 401:
            error_code = 'UNAUTHORIZED'
        elif response.status_code == 403:
            error_code = 'FORBIDDEN'
        elif response.status_code == 400:
            error_code = 'VALIDATION_ERROR'

        # Flatten details
        details = response.data if isinstance(response.data, (dict, list)) else {"detail": str(response.data)}
        message = "An error occurred while processing your request."
        if isinstance(response.data, dict) and 'detail' in response.data:
            message = str(response.data['detail'])

        response.data = {
            "error": {
                "code": error_code,
                "message": message,
                "details": details,
            }
        }

    return response
