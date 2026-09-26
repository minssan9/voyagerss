"""판정 요청/결과 이력을 SQLite에 저장하고 조회한다."""
import json
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


@dataclass
class JudgeRecord:
    id: int
    created_at: str
    endpoint: str
    question: str
    choices: list[str] | None
    result: dict[str, float]
    image_filename: str
    device: str
    model_name: str


class JudgeRecordRepository:
    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS judge_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    endpoint TEXT NOT NULL,
                    question TEXT NOT NULL,
                    choices_json TEXT,
                    result_json TEXT NOT NULL,
                    image_filename TEXT NOT NULL,
                    device TEXT NOT NULL,
                    model_name TEXT NOT NULL
                )
                """
            )

    def insert(
        self,
        endpoint: str,
        question: str,
        choices: list[str] | None,
        result: dict[str, float],
        image_filename: str,
        device: str,
        model_name: str,
    ) -> int:
        created_at = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            cursor = conn.execute(
                """
                INSERT INTO judge_records
                    (created_at, endpoint, question, choices_json, result_json, image_filename, device, model_name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    created_at,
                    endpoint,
                    question,
                    json.dumps(choices) if choices is not None else None,
                    json.dumps(result),
                    image_filename,
                    device,
                    model_name,
                ),
            )
            return cursor.lastrowid

    def _row_to_record(self, row: sqlite3.Row) -> JudgeRecord:
        return JudgeRecord(
            id=row["id"],
            created_at=row["created_at"],
            endpoint=row["endpoint"],
            question=row["question"],
            choices=json.loads(row["choices_json"]) if row["choices_json"] else None,
            result=json.loads(row["result_json"]),
            image_filename=row["image_filename"],
            device=row["device"],
            model_name=row["model_name"],
        )

    def list_recent(self, limit: int = 50) -> list[JudgeRecord]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM judge_records ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return [self._row_to_record(row) for row in rows]

    def get(self, record_id: int) -> JudgeRecord | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM judge_records WHERE id = ?", (record_id,)
            ).fetchone()
        return self._row_to_record(row) if row else None

    def count(self) -> int:
        with self._connect() as conn:
            row = conn.execute("SELECT COUNT(*) AS cnt FROM judge_records").fetchone()
        return row["cnt"]
