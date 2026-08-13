"""Persistent book-course plans layered on top of the knowledge library.

The store intentionally keeps a course map separate from generated A2UI pages:
planning a 100-lesson course is cheap, while each lesson can be generated,
retried, and edited independently through the existing session/project APIs.
"""

from __future__ import annotations

import json
import os
import sqlite3
import uuid
from contextlib import closing
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal


CourseStatus = Literal["planned", "generating", "ready", "failed"]


def _now() -> str:
    return datetime.now(UTC).isoformat()


@dataclass(frozen=True)
class CourseLesson:
    lesson_id: str
    course_id: str
    position: int
    title: str
    objectives: tuple[str, ...]
    key_concepts: tuple[str, ...]
    source_pages: tuple[int, ...]
    status: CourseStatus
    session_id: str | None
    project_id: str | None
    error: str | None

    def to_dict(self) -> dict[str, object]:
        return {
            "lessonId": self.lesson_id,
            "courseId": self.course_id,
            "position": self.position,
            "title": self.title,
            "objectives": list(self.objectives),
            "keyConcepts": list(self.key_concepts),
            "sourcePages": list(self.source_pages),
            "status": self.status,
            "sessionId": self.session_id,
            "projectId": self.project_id,
            "error": self.error,
        }


@dataclass(frozen=True)
class CoursePlan:
    course_id: str
    source_ids: tuple[str, ...]
    title: str
    summary: str
    target_language: str
    lesson_count: int
    created_at: str
    updated_at: str
    lessons: tuple[CourseLesson, ...]

    def to_dict(self) -> dict[str, object]:
        return {
            "courseId": self.course_id,
            "sourceIds": list(self.source_ids),
            "title": self.title,
            "summary": self.summary,
            "language": self.target_language,
            "lessonCount": self.lesson_count,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
            "lessons": [lesson.to_dict() for lesson in self.lessons],
        }


class CourseNotFoundError(KeyError):
    pass


class CourseLessonNotFoundError(KeyError):
    pass


@dataclass(frozen=True)
class CoursePlanningJob:
    job_id: str
    status: CourseStatus
    course_id: str | None
    error: str | None

    def to_dict(self) -> dict[str, object]:
        return {"jobId": self.job_id, "status": self.status, "courseId": self.course_id, "error": self.error}


class CourseStore:
    def __init__(self, database_path: str | Path) -> None:
        self.database_path = Path(database_path)
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    @classmethod
    def from_env(cls) -> "CourseStore":
        return cls(os.getenv("A2LEARN_COURSE_DB_PATH", "./data/a2learn-courses.sqlite3"))

    def _connection(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self) -> None:
        with closing(self._connection()) as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS courses (
                    course_id TEXT PRIMARY KEY,
                    source_ids_json TEXT NOT NULL,
                    title TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    target_language TEXT NOT NULL,
                    lesson_count INTEGER NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS course_lessons (
                    lesson_id TEXT PRIMARY KEY,
                    course_id TEXT NOT NULL REFERENCES courses(course_id),
                    position INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    objectives_json TEXT NOT NULL,
                    key_concepts_json TEXT NOT NULL,
                    source_pages_json TEXT NOT NULL,
                    status TEXT NOT NULL CHECK (status IN ('planned', 'generating', 'ready', 'failed')),
                    session_id TEXT,
                    project_id TEXT,
                    error TEXT,
                    UNIQUE(course_id, position)
                );
                CREATE TABLE IF NOT EXISTS course_planning_jobs (
                    job_id TEXT PRIMARY KEY,
                    status TEXT NOT NULL CHECK (status IN ('planned', 'generating', 'ready', 'failed')),
                    course_id TEXT,
                    error TEXT
                );
                """
            )
            connection.commit()

    def create_planning_job(self) -> CoursePlanningJob:
        job = CoursePlanningJob(f"coursejob_{uuid.uuid4().hex[:16]}", "generating", None, None)
        with closing(self._connection()) as connection:
            connection.execute("INSERT INTO course_planning_jobs VALUES (?, ?, ?, ?)", (job.job_id, job.status, None, None))
            connection.commit()
        return job

    def get_planning_job(self, job_id: str) -> CoursePlanningJob:
        with closing(self._connection()) as connection:
            row = connection.execute("SELECT * FROM course_planning_jobs WHERE job_id = ?", (job_id,)).fetchone()
        if row is None:
            raise CourseNotFoundError(job_id)
        return CoursePlanningJob(row["job_id"], row["status"], row["course_id"], row["error"])

    def complete_planning_job(self, job_id: str, course_id: str) -> None:
        self._set_job(job_id, "ready", course_id, None)

    def fail_planning_job(self, job_id: str, error: str) -> None:
        self._set_job(job_id, "failed", None, error[:2_000])

    def _set_job(self, job_id: str, status: CourseStatus, course_id: str | None, error: str | None) -> None:
        with closing(self._connection()) as connection:
            connection.execute("UPDATE course_planning_jobs SET status = ?, course_id = ?, error = ? WHERE job_id = ?", (status, course_id, error, job_id))
            connection.commit()

    def create(
        self,
        *,
        source_ids: list[str],
        title: str,
        summary: str,
        target_language: str,
        lessons: list[dict[str, Any]],
    ) -> CoursePlan:
        if not source_ids:
            raise ValueError("At least one source ID is required.")
        if not title.strip():
            raise ValueError("Course title is required.")
        if not lessons:
            raise ValueError("A course must contain at least one lesson.")
        if len(lessons) > 100:
            raise ValueError("A course may contain at most 100 lessons.")
        course_id = f"course_{uuid.uuid4().hex[:16]}"
        now = _now()
        normalized = [_normalize_lesson(course_id, index, raw) for index, raw in enumerate(lessons, start=1)]
        with closing(self._connection()) as connection:
            connection.execute(
                "INSERT INTO courses VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (course_id, json.dumps(source_ids), title.strip(), summary.strip(), target_language, len(normalized), now, now),
            )
            connection.executemany(
                "INSERT INTO course_lessons VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    (item.lesson_id, item.course_id, item.position, item.title, json.dumps(item.objectives),
                     json.dumps(item.key_concepts), json.dumps(item.source_pages), item.status, None, None, None)
                    for item in normalized
                ],
            )
            connection.commit()
        return self.get(course_id)

    def get(self, course_id: str) -> CoursePlan:
        with closing(self._connection()) as connection:
            course = connection.execute("SELECT * FROM courses WHERE course_id = ?", (course_id,)).fetchone()
            if course is None:
                raise CourseNotFoundError(course_id)
            rows = connection.execute("SELECT * FROM course_lessons WHERE course_id = ? ORDER BY position", (course_id,)).fetchall()
        lessons = tuple(_lesson_from_row(row) for row in rows)
        return CoursePlan(
            course_id=course["course_id"], source_ids=tuple(json.loads(course["source_ids_json"])), title=course["title"],
            summary=course["summary"], target_language=course["target_language"], lesson_count=course["lesson_count"],
            created_at=course["created_at"], updated_at=course["updated_at"], lessons=lessons,
        )

    def get_lesson(self, course_id: str, lesson_id: str) -> CourseLesson:
        self.get(course_id)
        with closing(self._connection()) as connection:
            row = connection.execute("SELECT * FROM course_lessons WHERE course_id = ? AND lesson_id = ?", (course_id, lesson_id)).fetchone()
        if row is None:
            raise CourseLessonNotFoundError(lesson_id)
        return _lesson_from_row(row)

    def set_lesson_generation(self, course_id: str, lesson_id: str, session_id: str) -> CourseLesson:
        return self._update_lesson(course_id, lesson_id, status="generating", session_id=session_id, error=None)

    def set_lesson_result(self, course_id: str, lesson_id: str, *, status: CourseStatus, project_id: str | None = None, error: str | None = None) -> CourseLesson:
        if status not in {"ready", "failed"}:
            raise ValueError("Result status must be ready or failed.")
        return self._update_lesson(course_id, lesson_id, status=status, project_id=project_id, error=error)

    def _update_lesson(self, course_id: str, lesson_id: str, **updates: object) -> CourseLesson:
        self.get_lesson(course_id, lesson_id)
        columns = ", ".join(f"{key} = ?" for key in updates)
        with closing(self._connection()) as connection:
            connection.execute(f"UPDATE course_lessons SET {columns} WHERE course_id = ? AND lesson_id = ?", (*updates.values(), course_id, lesson_id))
            connection.execute("UPDATE courses SET updated_at = ? WHERE course_id = ?", (_now(), course_id))
            connection.commit()
        return self.get_lesson(course_id, lesson_id)


def _normalize_lesson(course_id: str, position: int, raw: dict[str, Any]) -> CourseLesson:
    title = raw.get("title")
    if not isinstance(title, str) or not title.strip():
        raise ValueError(f"Lesson {position} needs a title.")
    def strings(key: str) -> tuple[str, ...]:
        value = raw.get(key, [])
        if not isinstance(value, list) or not all(isinstance(item, str) and item.strip() for item in value):
            raise ValueError(f"Lesson {position}.{key} must be an array of non-empty strings.")
        return tuple(item.strip() for item in value)
    pages = raw.get("sourcePages", [])
    if not isinstance(pages, list) or not all(isinstance(page, int) and page > 0 for page in pages):
        raise ValueError(f"Lesson {position}.sourcePages must be an array of positive page numbers.")
    return CourseLesson(
        lesson_id=f"{course_id}:lesson-{position:03d}", course_id=course_id, position=position, title=title.strip(),
        objectives=strings("objectives"), key_concepts=strings("keyConcepts"), source_pages=tuple(dict.fromkeys(pages)),
        status="planned", session_id=None, project_id=None, error=None,
    )


def _lesson_from_row(row: sqlite3.Row) -> CourseLesson:
    return CourseLesson(
        lesson_id=row["lesson_id"], course_id=row["course_id"], position=row["position"], title=row["title"],
        objectives=tuple(json.loads(row["objectives_json"])), key_concepts=tuple(json.loads(row["key_concepts_json"])),
        source_pages=tuple(json.loads(row["source_pages_json"])), status=row["status"], session_id=row["session_id"],
        project_id=row["project_id"], error=row["error"],
    )
