import hashlib
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote_plus
from dotenv import load_dotenv
import pyodbc

# Load environment
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(env_path)

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("ERROR: DATABASE_URL not set in .env")
    sys.exit(1)

# Parse SQLAlchemy database URL to ODBC connection string
match = re.match(r"mssql\+pyodbc://([^:]+):([^@]+)@([^\/]+)\/([^?]+)\?driver=(.+)", db_url)
if not match:
    print(f"ERROR: Could not parse DATABASE_URL: {db_url}")
    sys.exit(1)

user, password, server, database, driver = match.groups()
driver = unquote_plus(driver)

odbc_conn_str = (
    f"DRIVER={{{driver}}};"
    f"SERVER={server};"
    f"DATABASE={database};"
    f"UID={user};"
    f"PWD={password};"
)

backup_dir = Path(__file__).resolve().parents[1] / "database" / "backups"
backup_dir.mkdir(parents=True, exist_ok=True)

timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
backup_filename = f"{database}_full_backup_{timestamp}.bak"
backup_filepath = backup_dir / backup_filename

print(f"Connecting to SQL Server instance [{server}] database [{database}]...")
conn = pyodbc.connect(odbc_conn_str, autocommit=True)
cur = conn.cursor()

try:
    # 1. Server & Database Details
    cur.execute("SELECT @@VERSION")
    server_version = cur.fetchone()[0]

    cur.execute("SELECT collation_name, compatibility_level FROM sys.databases WHERE name = ?", (database,))
    db_meta = cur.fetchone()
    collation = db_meta[0]
    compat_level = db_meta[1]

    # 2. Database logical files
    cur.execute("SELECT name, physical_name, type_desc, size * 8 / 1024 AS size_mb FROM sys.database_files")
    files = cur.fetchall()

    # 3. Table count
    cur.execute("SELECT COUNT(*) FROM information_schema.tables WHERE TABLE_TYPE = 'BASE TABLE'")
    table_count = cur.fetchone()[0]

    # 4. Schemas
    cur.execute(
        """
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name NOT IN ('sys', 'guest', 'INFORMATION_SCHEMA', 'db_owner', 'db_accessadmin', 
                                  'db_securityadmin', 'db_ddladmin', 'db_backupoperator', 
                                  'db_datareader', 'db_datawriter', 'db_denydatareader', 'db_denydatawriter')
        ORDER BY schema_name
        """
    )
    schemas = [r[0] for r in cur.fetchall()]

    print(f"\n=======================================================")
    print(f"DATABASE METADATA:")
    print(f"=======================================================")
    print(f"Database Name       : {database}")
    print(f"SQL Server Version  : {server_version.splitlines()[0]}")
    print(f"Collation           : {collation}")
    print(f"Compatibility Level : {compat_level}")
    print(f"Total Tables        : {table_count}")
    print(f"Domain Schemas      : {', '.join(schemas)}")
    print("Logical Files:")
    for f in files:
        print(f"  - Logical Name: '{f[0]}' ({f[2]}), Size: {f[3]} MB, Path: {f[1]}")
    print(f"=======================================================\n")

    # 5. Perform Backup
    clean_path = str(backup_filepath).replace("'", "''")
    backup_sql = f"""
    BACKUP DATABASE [{database}]
    TO DISK = N'{clean_path}'
    WITH FORMAT,
         INIT,
         NAME = N'{database}-Full Database Backup {timestamp}',
         SKIP,
         NOREWIND,
         NOUNLOAD,
         CHECKSUM,
         STATS = 20;
    """

    print(f"Executing BACKUP DATABASE to:\n{backup_filepath}\n")
    cur.execute(backup_sql)
    while cur.nextset():
        pass

    print("SUCCESS: Database backup completed!")

finally:
    cur.close()
    conn.close()

if not backup_filepath.exists():
    print(f"ERROR: Backup file {backup_filepath} was not found on disk!")
    sys.exit(1)

# Compute SHA256
print("\nComputing SHA-256 checksum of the backup file...")
sha256 = hashlib.sha256()
with open(backup_filepath, "rb") as f:
    for chunk in iter(lambda: f.read(65536), b""):
        sha256.update(chunk)
file_hash = sha256.hexdigest()

file_size_bytes = backup_filepath.stat().st_size
file_size_mb = file_size_bytes / (1024 * 1024)

print(f"\n=======================================================")
print(f"BACKUP COMPLETED SUCCESSFULLY")
print(f"=======================================================")
print(f"File Name    : {backup_filename}")
print(f"Directory    : {backup_dir}")
print(f"Full Path    : {backup_filepath}")
print(f"File Size    : {file_size_mb:.2f} MB ({file_size_bytes:,} bytes)")
print(f"SHA-256 Hash : {file_hash}")
print(f"Created At   : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print(f"=======================================================")
