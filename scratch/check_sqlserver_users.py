from src.db import get_db
from src.db_models import User

db = next(get_db())

print("=== Users in SQL Server DB ===")
users = db.query(User).all()
for u in users:
    print(f"  User ID: {u.user_id} | Username: {u.username} | Role: {u.role_code} | Client ID: {u.client_id}")
