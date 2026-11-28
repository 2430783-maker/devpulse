
import os
from pathlib import Path

import psycopg
from psycopg.rows import dict_row


MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"


def get_db():
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise RuntimeError(
            "DATABASE_URL environment variable is not configured"
        )

    return psycopg.connect(
        database_url,
        row_factory=dict_row,
        connect_timeout=10,
        sslmode=os.getenv("DB_SSLMODE", "require"),
        prepare_threshold=None,
    )


def initialize_database():
    with get_db() as conn:
        # Create a table to track executed migrations.
        conn.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Find migrations that have already been applied.
        applied = conn.execute(
            "SELECT version FROM schema_migrations"
        ).fetchall()

        applied_versions = {row["version"] for row in applied}

        # Execute pending migrations in filename order.
        migration_files = sorted(MIGRATIONS_DIR.glob("*.sql"))

        for migration_file in migration_files:
            version = migration_file.name

            if version in applied_versions:
                continue

            migration_sql = migration_file.read_text(encoding="utf-8")

            conn.execute(migration_sql)

            conn.execute(
                """
                INSERT INTO schema_migrations (version)
                VALUES (%s)
                """,
                (version,),
            )

            print(f"Applied database migration: {version}")
