import os
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import src.db as db_module
from src.db import Base

# Create single shared SQLite in-memory engine with StaticPool
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Override src.db module engine and SessionLocal so all services and middleware use the test DB
db_module.engine = test_engine
db_module.SessionLocal = TestingSessionLocal
