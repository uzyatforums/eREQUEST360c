from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from src.config import settings

engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


from sqlalchemy import text

def init_db():
    # Connectivity check
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))

    # Only run create_all and seed for in-memory / local SQLite
    if engine.url.drivername.startswith("sqlite"):
        from src.db_models import Base as ModelsBase
        from src.seed import seed_data
        ModelsBase.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            seed_data(db)
        finally:
            db.close()

