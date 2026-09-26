"""
Singleton slowapi rate limiter.

Exported as a module-level object so every router can import it without
creating circular dependencies through main.py.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
