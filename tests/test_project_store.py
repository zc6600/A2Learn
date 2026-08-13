import sqlite3
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from agent.document.page_document import A2uiCompiler, PageDocument
from apps.api.example_projects import load_example_documents
from apps.api.page_document_store import (
    DocumentNotFoundError,
    PageDocumentStore,
    SqlitePageDocumentStore,
)
from apps.api.project_store import ProjectStore, SqliteProjectStore


def document(document_id: str, surface_id: str) -> PageDocument:
    return PageDocument.from_dict(
        {
            "documentId": document_id,
            "revision": 1,
            "surfaceId": surface_id,
            "components": [
                {"id": "root", "component": "Column", "props": {"children": ["title"]}},
                {"id": "title", "component": "Text", "props": {"text": surface_id}},
            ],
        }
    )


class ProjectStoreTests(unittest.TestCase):
    def test_bundled_hash_table_imports_as_multiple_page_documents(self) -> None:
        documents = load_example_documents("hash-table")

        self.assertEqual(len(documents), 4)
        self.assertEqual(documents[0].document_id, "hash-table:surface-module-1")
        self.assertEqual(documents[0].components[0].id, "root")

    def test_project_groups_multiple_surfaces_without_changing_page_store(self) -> None:
        page_store = PageDocumentStore()
        project_store = ProjectStore(page_store)
        project = project_store.create(
            "hash-table",
            [document("hash-table:module-1", "module-1"), document("hash-table:module-2", "module-2")],
            source="example",
            owner_id=None,
            actor="human",
        )

        saved, documents = project_store.get("hash-table")

        self.assertEqual(project.project_id, "hash-table")
        self.assertEqual(saved.document_ids, ("hash-table:module-1", "hash-table:module-2"))
        self.assertEqual([item.surface_id for item in documents], ["module-1", "module-2"])
        self.assertEqual(page_store.get("hash-table:module-1").revision, 1)

    def test_project_history_aggregates_surface_changes(self) -> None:
        page_store = PageDocumentStore()
        project_store = ProjectStore(page_store)
        project_store.create(
            "user-project-1",
            [document("user-project-1:main", "main")],
            source="generated",
            owner_id="user-1",
            actor="ai",
        )
        page_store.apply_operations(
            "user-project-1:main",
            [{"op": "set_props", "component_id": "title", "props": {"text": "Edited"}}],
            base_revision=1,
            actor="human",
            summary="Human edit",
        )

        history = project_store.history("user-project-1")

        self.assertEqual([change["revision"] for change in history], [1, 2])
        self.assertEqual(history[-1]["documentId"], "user-project-1:main")

    def test_in_memory_project_creation_does_not_leave_documents_after_a_batch_failure(self) -> None:
        class FailingSecondCompile:
            def __init__(self) -> None:
                self.calls = 0
                self.compiler = A2uiCompiler()

            def compile(self, previous: PageDocument | None, current: PageDocument):
                self.calls += 1
                if self.calls == 2:
                    raise RuntimeError("forced compile failure")
                return self.compiler.compile(previous, current)

        page_store = PageDocumentStore(compiler=FailingSecondCompile())
        project_store = ProjectStore(page_store)

        with self.assertRaisesRegex(RuntimeError, "forced compile failure"):
            project_store.create(
                "failed-project",
                [document("failed-project:one", "one"), document("failed-project:two", "two")],
                source="generated",
                owner_id=None,
                actor="human",
            )

        with self.assertRaises(DocumentNotFoundError):
            page_store.get("failed-project:one")

    def test_sqlite_project_registry_survives_a_process_restart(self) -> None:
        with TemporaryDirectory() as directory:
            database_path = Path(directory) / "editor.sqlite3"
            first_documents = SqlitePageDocumentStore(database_path)
            first_projects = SqliteProjectStore(first_documents)
            first_projects.create(
                "persistent-project",
                [document("persistent-project:main", "main")],
                source="generated",
                owner_id=None,
                actor="human",
            )
            first_documents.close()

            restarted_documents = SqlitePageDocumentStore(database_path)
            restarted_projects = SqliteProjectStore(restarted_documents)
            project, documents = restarted_projects.get("persistent-project")

            self.assertEqual(project.document_ids, ("persistent-project:main",))
            self.assertEqual(documents[0].components[1].props["text"], "main")
            restarted_documents.close()

    def test_sqlite_project_creation_rolls_back_documents_when_mapping_write_fails(self) -> None:
        with TemporaryDirectory() as directory:
            database_path = Path(directory) / "editor.sqlite3"
            documents = SqlitePageDocumentStore(database_path)
            projects = SqliteProjectStore(documents)
            documents.run_extension_transaction(
                lambda connection: connection.execute(
                    """
                    CREATE TRIGGER reject_project_insert
                    BEFORE INSERT ON projects
                    BEGIN
                      SELECT RAISE(ABORT, 'forced project mapping failure');
                    END;
                    """
                )
            )

            with self.assertRaises(sqlite3.IntegrityError):
                projects.create(
                    "failed-project",
                    [document("failed-project:main", "main")],
                    source="generated",
                    owner_id=None,
                    actor="human",
                )
            with self.assertRaises(DocumentNotFoundError):
                documents.get("failed-project:main")
            documents.close()

    def test_all_known_examples_load_successfully(self) -> None:
        from apps.api.example_projects import EXAMPLE_IDS
        for example_id in EXAMPLE_IDS:
            with self.subTest(example_id=example_id):
                docs = load_example_documents(example_id, "zh")
                self.assertGreater(len(docs), 0, f"Example {example_id} loaded 0 documents")
                # If an English version exists in public examples, test it as well
                en_example_path = Path(__file__).resolve().parents[1] / f"apps/viewer/public/examples/en/{example_id}.json"
                if en_example_path.is_file():
                    en_docs = load_example_documents(example_id, "en")
                    self.assertGreater(len(en_docs), 0, f"English example {example_id} loaded 0 documents")


if __name__ == "__main__":
    unittest.main()
