from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt

def require_role(*roles):
    """
    Decorator to require specific roles for an endpoint.
    If no roles are passed, it just verifies that the user is authenticated.
    """
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if roles and claims.get("role") not in roles:
                return jsonify({"error": "Insufficient permissions to access this resource"}), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper
