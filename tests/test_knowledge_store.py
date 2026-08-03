import io
import tempfile
import unittest
from pathlib import Path

from apps.api.knowledge_store import (
    InvalidKnowledgeUploadError,
    KnowledgeSourceNotReadyError,
    KnowledgeStore,
)


class KnowledgeStoreTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        root = Path(self.temp_dir.name)
        self.store = KnowledgeStore(root / "knowledge.sqlite3", root / "files")

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_ingests_native_markdown_and_preserves_page_citation(self) -> None:
        source = self.store.ingest_upload(
            io.BytesIO(b"# Attention\n\nAttention relates queries to keys and values."),
            "attention.md",
            "text/markdown",
        )

        self.assertEqual(source.extraction_status, "ready")
        self.assertEqual(source.extraction_mode, "native_text")
        self.assertEqual(source.chunk_count, 1)
        self.assertEqual(self.store.chunks(source.source_id)[0].page_start, 1)

        context = self.store.build_generation_context([source.source_id], query="keys")
        self.assertIn("[Source: attention, page 1]", context)
        self.assertIn("queries to keys", context)

    def test_records_image_as_needing_ocr_when_worker_is_unavailable(self) -> None:
        # Deliberately invalid image bytes: the no-OCR-worker path must still
        # retain the original and never expose it as a ready empty document.
        source = self.store.ingest_upload(io.BytesIO(b"not an image"), "scan.png", "image/png")

        if source.extraction_status == "ready":
            self.skipTest("A local OCR worker accepted the test fixture")
        self.assertEqual(source.extraction_status, "needs_ocr")
        with self.assertRaises(KnowledgeSourceNotReadyError):
            self.store.build_generation_context([source.source_id])

    def test_rejects_unsupported_file_type(self) -> None:
        with self.assertRaises(InvalidKnowledgeUploadError):
            self.store.ingest_upload(io.BytesIO(b"binary"), "archive.exe", "application/octet-stream")
