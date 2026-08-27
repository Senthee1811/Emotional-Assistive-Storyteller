import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict
try:
    import jwt
except Exception:
    import base64
    import hmac
    import json
    import hashlib as _hashlib

    class _MiniJWTError(Exception):
        pass

    class _MiniJWT:
        PyJWTError = _MiniJWTError

        @staticmethod
        def _b64url(data: bytes) -> str:
            return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")

        @staticmethod
        def _b64url_decode(data: str) -> bytes:
            padding = "=" * ((4 - len(data) % 4) % 4)
            return base64.urlsafe_b64decode((data + padding).encode("ascii"))

        @classmethod
        def encode(cls, payload: dict, secret: str, algorithm: str = "HS256") -> str:
            if algorithm != "HS256":
                raise _MiniJWTError("Only HS256 is supported by fallback JWT")
            header = {"alg": "HS256", "typ": "JWT"}
            h = cls._b64url(json.dumps(header, separators=(",", ":")).encode("utf-8"))
            p = cls._b64url(json.dumps(payload, default=str, separators=(",", ":")).encode("utf-8"))
            signing_input = f"{h}.{p}".encode("ascii")
            sig = hmac.new(secret.encode("utf-8"), signing_input, _hashlib.sha256).digest()
            return f"{h}.{p}.{cls._b64url(sig)}"

        @classmethod
        def decode(cls, token: str, secret: str, algorithms=None):
            if algorithms and "HS256" not in algorithms:
                raise _MiniJWTError("Only HS256 is supported by fallback JWT")
            try:
                h, p, s = token.split(".")
            except ValueError as exc:
                raise _MiniJWTError("Invalid token format") from exc

            signing_input = f"{h}.{p}".encode("ascii")
            expected = hmac.new(secret.encode("utf-8"), signing_input, _hashlib.sha256).digest()
            received = cls._b64url_decode(s)
            if not hmac.compare_digest(expected, received):
                raise _MiniJWTError("Invalid signature")

            payload = json.loads(cls._b64url_decode(p).decode("utf-8"))
            exp = payload.get("exp")
            if exp is not None:
                try:
                    exp_dt = datetime.fromisoformat(str(exp))
                except Exception as exc:
                    raise _MiniJWTError("Invalid exp claim") from exc
                if exp_dt <= datetime.utcnow():
                    raise _MiniJWTError("Token expired")
            return payload

    jwt = _MiniJWT()
from database import db

# JWT Configuration
SECRET_KEY = secrets.token_urlsafe(32)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

class AuthService:
    def __init__(self):
        self.db = db
    
    def hash_password(self, password: str) -> str:
        """Hash a password using SHA-256"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def verify_password(self, password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return self.hash_password(password) == hashed_password
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        """Create a JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[Dict]:
        """Verify and decode a JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except jwt.PyJWTError:
            return None
    
    def register_user(self, username: str, email: str, password: str) -> Dict:
        """Register a new user"""
        # Check if user already exists
        if self.db.get_user_by_username(username):
            return {"success": False, "message": "Username already exists"}
        
        if self.db.get_user_by_email(email):
            return {"success": False, "message": "Email already exists"}
        
        # Create new user
        password_hash = self.hash_password(password)
        user_id = self.db.create_user(username, email, password_hash)
        
        # Track registration activity
        self.db.track_activity(user_id, "user_registration", {"username": username, "email": email})
        
        return {"success": True, "user_id": user_id, "message": "User registered successfully"}
    
    def authenticate_user(self, username: str, password: str) -> Optional[Dict]:
        """Authenticate a user"""
        user = self.db.get_user_by_username(username)
        if not user:
            return None
        
        if not self.verify_password(password, user['password_hash']):
            return None
        
        # Track login activity
        self.db.track_activity(user['id'], "user_login", {"username": username})
        
        return {
            "id": user['id'],
            "username": user['username'],
            "email": user['email'],
            "created_at": user['created_at']
        }
    
    def login_user(self, username: str, password: str) -> Dict:
        """Login a user and return access token"""
        user = self.authenticate_user(username, password)
        if not user:
            return {"success": False, "message": "Invalid username or password"}
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = self.create_access_token(
            data={"sub": str(user['id']), "username": user['username']},
            expires_delta=access_token_expires
        )
        
        return {
            "success": True,
            "access_token": access_token,
            "token_type": "bearer",
            "user": user
        }

# Pydantic models
from pydantic import BaseModel, field_validator
import re

try:
    # EmailStr requires email-validator at runtime (schema generation), so verify it first.
    import email_validator  # noqa: F401
    from pydantic import EmailStr as _EmailStr
    EMAIL_FIELD_TYPE = _EmailStr
except Exception:
    # Fallback to str when email-validator is not installed.
    EMAIL_FIELD_TYPE = str

class UserLogin(BaseModel):
    username: str
    password: str

class UserRegister(BaseModel):
    username: str
    email: EMAIL_FIELD_TYPE
    password: str

    @field_validator("email")
    @classmethod
    def validate_email_fallback(cls, value):
        # Always keep a minimal validation so startup doesn't depend on email-validator.
        email = str(value).strip()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
            raise ValueError("Invalid email format")
        return email

class AuthResponse(BaseModel):
    success: bool
    message: str
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    user: Optional[Dict] = None

# Create global auth service instance
auth_service = AuthService()

# FastAPI dependencies
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    token = credentials.credentials
    payload = auth_service.verify_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.get_user_by_id(int(user_id))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

async def get_user_id(current_user: Dict = Depends(get_current_user)) -> int:
    """Get current user ID"""
    return current_user['id']
