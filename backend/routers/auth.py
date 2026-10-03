import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.user import User
from backend.models.temple import Temple
from backend.schemas.auth import (
    LoginRequest, 
    RegisterUserRequest, 
    ForgotPasswordRequest, 
    ResetPasswordRequest, 
    TokenResponse, 
    UserResponse
)
from backend.services.auth_service import authenticate_user, create_access_token, get_password_hash
from backend.dependencies.auth import get_current_user
from backend.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

ROLE_MAPPING = {
    "Temple Admin": "TEMPLE_ADMIN",
    "Receptionist": "RECEPTIONIST",
    "Queue Manager": "MANAGER",
    "Security": "SECURITY",
    "Volunteer": "VOLUNTEER"
}

@router.post("/register", response_model=UserResponse)
def register_user(payload: RegisterUserRequest, db: Session = Depends(get_db)):
    # 1. Validate Password Match
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    # 2. Validate Unique Email
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    temple_id = payload.temple_id.strip().upper()
    temple = db.query(Temple).filter(Temple.temple_id == temple_id).first()

    # 3. Create Temple if it does not exist
    if not temple:
        temple = Temple(
            temple_id=temple_id,
            name=payload.temple_name or f"Temple {temple_id}",
            address=f"{payload.city}, {payload.state}",
            city=payload.city or "Somnath",
            state=payload.state or "Gujarat",
            country="India",
            contact_number=payload.mobile,
            email=payload.email,
            capacity=payload.capacity or 18000,
            opening_time=payload.opening_time or "04:00 AM",
            closing_time=payload.closing_time or "10:00 PM",
            status="ACTIVE"
        )
        db.add(temple)
        db.commit()
        db.refresh(temple)

    mapped_role = ROLE_MAPPING.get(payload.role, "VOLUNTEER")

    # 4. Create User
    new_user = User(
        temple_id=temple_id,
        email=payload.email,
        mobile=payload.mobile,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        role=mapped_role,
        status="Active",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return UserResponse(
        id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role,
        temple_id=new_user.temple_id,
        temple_name=temple.name,
        status=new_user.status,
        is_active=new_user.is_active
    )

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    try:
        user = authenticate_user(db, email=payload.email, password=payload.password, temple_id=payload.temple_id)
    except Exception as e:
        print(f"[AUTH LOGIN ERROR] {e}")
        try:
            from backend.main import seed_database
            from backend.database import Base, engine
            Base.metadata.create_all(bind=engine)
            seed_database()
            user = authenticate_user(db, email=payload.email, password=payload.password, temple_id=payload.temple_id)
        except Exception as retry_err:
            print(f"[AUTH RETRY ERROR] {retry_err}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database authentication error: {str(e)}"
            )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials or incorrect Temple ID."
        )

    # Status check
    if user.status == "Pending":
        raise HTTPException(status_code=403, detail="Your account is awaiting administrator approval.")
    elif user.status in ["Suspended", "Inactive"]:
        raise HTTPException(status_code=403, detail="Your account has been suspended. Contact your administrator.")

    temple = None
    if user.temple_id:
        temple = db.query(Temple).filter(Temple.temple_id == user.temple_id).first()
        if temple and temple.status == "INACTIVE":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Temple account is currently deactivated."
            )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token_payload = {
        "sub": user.email,
        "user_id": user.id,
        "temple_id": user.temple_id,
        "role": user.role
    }

    token = create_access_token(data=token_payload, expires_delta=access_token_expires)

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        temple_id=user.temple_id,
        temple_name=temple.name if temple else "Super Platform Admin"
    )

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    temple_id = payload.temple_id.strip().upper()
    user = db.query(User).filter(User.email == payload.email, User.temple_id == temple_id).first()
    if not user:
        # Prevent account enumeration: return success message
        return {"message": "If an account matches those credentials, a password reset link has been issued."}

    reset_token = uuid.uuid4().hex
    user.reset_token = reset_token
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    db.commit()

    return {
        "message": "Password reset token generated successfully.",
        "reset_token": reset_token,
        "reset_url": f"/reset-password?token={reset_token}"
    }

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    user = db.query(User).filter(User.reset_token == payload.reset_token).first()
    if not user or not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    user.hashed_password = get_password_hash(payload.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()

    return {"message": "Password reset successfully. You may now log in with your new password."}

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    temple = None
    if current_user.temple_id:
        temple = db.query(Temple).filter(Temple.temple_id == current_user.temple_id).first()

    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "temple_id": current_user.temple_id,
        "temple_name": temple.name if temple else "Super Platform Admin",
        "status": current_user.status,
        "is_active": current_user.is_active
    }

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Successfully logged out"}
