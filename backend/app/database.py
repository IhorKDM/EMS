from sqlalchemy import create_engine, event
from sqlalchemy.engine import cursor
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False}, # For SQLite
)

@event.listens_for(engine, "connect")
def do_connect(dbapi_conn, _):
    '''
    Enable foreign key constraints and set journal mode to WAL for SQLite.
    '''
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    '''
    Base class for all database models.
    '''
    pass

def get_db():
    '''
    Dependency that provides a database session.
    Ensures that the session behaves as expected.
    '''
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()