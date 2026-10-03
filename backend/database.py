import os
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from backend.config import settings

def init_engine():
    db_url = settings.DATABASE_URL
    if "postgres" in db_url:
        try:
            test_engine = create_engine(
                db_url,
                pool_size=5,
                max_overflow=5,
                pool_timeout=5,
                pool_pre_ping=True
            )
            with test_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print("[DATABASE] Successfully connected to PostgreSQL.")
            return test_engine
        except Exception as e:
            print(f"[DATABASE WARNING] PostgreSQL unreachable ({e}). Falling back to embedded SQLite database.")
            db_dir = os.path.dirname(os.path.abspath(__file__))
            fallback_path = os.path.join(db_dir, "darshanai.db")
            fallback_url = f"sqlite:///{fallback_path}"
            return create_engine(
                fallback_url,
                connect_args={"check_same_thread": False},
                pool_size=10,
                max_overflow=10,
                pool_timeout=10,
                pool_recycle=300,
                pool_pre_ping=True
            )
    else:
        return create_engine(
            db_url,
            connect_args={"check_same_thread": False},
            pool_size=10,
            max_overflow=10,
            pool_timeout=10,
            pool_recycle=300,
            pool_pre_ping=True
        )

engine = init_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
