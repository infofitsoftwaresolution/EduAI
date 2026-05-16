from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.security import hash_password
from app.config import ADMIN_EMAIL, ADMIN_PASSWORD
from app.db.models import User


def seed_admin_user(db: Session) -> None:
    email = ADMIN_EMAIL.strip().lower()
    existing = db.scalar(select(User).where(User.email == email))
    if existing is not None:
        return
    db.add(
        User(
            email=email,
            password_hash=hash_password(ADMIN_PASSWORD),
            role="admin",
        )
    )
    db.commit()
