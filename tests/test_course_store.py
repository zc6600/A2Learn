import tempfile
import unittest
from pathlib import Path

from apps.api.course_store import CourseStore


class CourseStoreTests(unittest.TestCase):
    def test_course_plan_and_lesson_lifecycle_persist(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            store = CourseStore(Path(directory) / "courses.sqlite3")
            course = store.create(
                source_ids=["src_book"], title="A Book", summary="A complete course", target_language="en",
                lessons=[{"title": "Start", "objectives": ["Understand the premise"], "keyConcepts": ["premise"], "sourcePages": [1, 2]}],
            )
            lesson = course.lessons[0]
            self.assertEqual(course.lesson_count, 1)
            self.assertEqual(lesson.status, "planned")
            store.set_lesson_generation(course.course_id, lesson.lesson_id, "sess_1")
            ready = store.set_lesson_result(course.course_id, lesson.lesson_id, status="ready", project_id="project_1")
            self.assertEqual(ready.status, "ready")
            self.assertEqual(ready.project_id, "project_1")
            self.assertEqual(store.get(course.course_id).lessons[0].session_id, "sess_1")

    def test_rejects_more_than_one_hundred_lessons(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            store = CourseStore(Path(directory) / "courses.sqlite3")
            lesson = {"title": "Lesson", "objectives": [], "keyConcepts": [], "sourcePages": []}
            with self.assertRaisesRegex(ValueError, "at most 100"):
                store.create(source_ids=["src_book"], title="Too long", summary="", target_language="en", lessons=[lesson] * 101)

    def test_planning_job_tracks_completion(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            store = CourseStore(Path(directory) / "courses.sqlite3")
            job = store.create_planning_job()
            self.assertEqual(job.status, "generating")
            store.complete_planning_job(job.job_id, "course_1")
            completed = store.get_planning_job(job.job_id)
            self.assertEqual(completed.status, "ready")
            self.assertEqual(completed.course_id, "course_1")
