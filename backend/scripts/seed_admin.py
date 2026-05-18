import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import get_settings
from app.core.security import generate_temp_password, hash_password
from app.database import Base
from app.models import *
from app.models.user import RoleEnum, TitleEnum, User

settings = get_settings()


def main() -> None:
    engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)

    with Session() as db:
        existing = db.query(User).filter(User.role == RoleEnum.admin).first()
        if existing:
            print(f"Admin already exists: {existing.email}")
            print("Nothing created. Use the app to manage admins.")
            return

        temp_pwd = generate_temp_password()

        admin = User(
            title=TitleEnum.mr,
            first_name="System",
            last_name="Admin",
            email="admin@ems.com",
            dob=date(1990, 1, 1),
            address_line1="1 Admin Street",
            address_city="London",
            address_postcode="SW1A 1AA",
            address_country="UK",
            hashed_password=hash_password(temp_pwd),
            role=RoleEnum.admin,
            is_first_login=True,
            is_active=True,
        )
        db.add(admin)
        db.commit()

        print("=" * 50)
        print("Admin account created successfully.")
        print(f"  Email:            admin@example.com")
        print(f"  Temp password:    {temp_pwd}")
        print("  Log in and change your password immediately.")
        print("=" * 50)


if __name__ == "__main__":
    main()