import sys
import threading
import time
import types
import unittest
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch

import pandas as pd
from fastapi import HTTPException

import api.main as api


class ApiInitializationTests(unittest.TestCase):
    def test_models_route_converts_missing_numeric_values_to_json_null(self):
        models = pd.DataFrame(
            [
                {
                    "laptop_name": "ASUS test model",
                    "brand": "ASUS",
                    "price": float("nan"),
                    "rating": float("nan"),
                    "value_score": float("nan"),
                }
            ]
        )

        with (
            patch.object(api, "load_all", return_value={"models": models}),
            patch.object(
                api.cache,
                "get_or_compute",
                side_effect=lambda _key, compute, ttl=None: compute(),
            ),
        ):
            result = api.get_models()

        row = result["models"][0]
        self.assertIsNone(row["price"])
        self.assertIsNone(row["rating"])
        self.assertIsNone(row["value_score"])

    def test_concurrent_load_all_calls_share_one_initialization(self):
        original_cache = api._cache
        api._cache = {}
        call_count = 0
        call_count_lock = threading.Lock()

        def initialize():
            nonlocal call_count
            with call_count_lock:
                call_count += 1
            time.sleep(0.05)
            api._cache.update({"initialized": True})
            return api._cache

        try:
            with patch.object(api, "_load_all", side_effect=initialize):
                with ThreadPoolExecutor(max_workers=8) as pool:
                    results = list(pool.map(lambda _: api.load_all(), range(8)))

            self.assertEqual(call_count, 1)
            self.assertTrue(all(result is api._cache for result in results))
        finally:
            api._cache = original_cache

    def test_affected_routes_handle_empty_data(self):
        empty_data = {
            "sentences": pd.DataFrame(columns=["source", "sentence"]),
            "models": pd.DataFrame(columns=["price", "rating"]),
            "sentiment": pd.DataFrame(),
            "aspects": pd.DataFrame(),
            "model_aspects": pd.DataFrame(),
            "opportunities": pd.DataFrame(),
        }

        with patch.object(api, "load_all", return_value=empty_data):
            self.assertEqual(
                api.get_model_aspects(brand="ASUS"),
                {"model_aspects": []},
            )
            self.assertEqual(
                api.get_opportunities(brand="ASUS"),
                {"opportunities": []},
            )
            self.assertEqual(api.get_data_quality()["status"], "EMPTY")

    def test_chat_reports_unavailable_rag_with_service_unavailable(self):
        with (
            patch.object(api, "_rag_ready", False),
            patch.object(api, "rm", None),
            patch.object(api, "_init_rag", return_value=False),
        ):
            with self.assertRaises(HTTPException) as raised:
                api.chat(api.ChatRequest(query="battery life"))

        self.assertEqual(raised.exception.status_code, 503)

    def test_concurrent_rag_initialization_loads_resources_once(self):
        counts = {"dataset": 0, "model": 0, "index": 0}
        counts_lock = threading.Lock()

        class FakeRag(types.ModuleType):
            DATA_DIR = "original-data"
            CACHE_FILE = "original-cache"

            def load_dataset(self, data_dir):
                with counts_lock:
                    counts["dataset"] += 1
                time.sleep(0.02)
                return ["dataset"]

            def build_index(self, dataset, model, cache_file=None):
                with counts_lock:
                    counts["index"] += 1
                time.sleep(0.02)
                return "index", "embeddings"

        sentence_transformers = types.ModuleType("sentence_transformers")

        def load_model(*args, **kwargs):
            with counts_lock:
                counts["model"] += 1
            time.sleep(0.02)
            return "model"

        sentence_transformers.SentenceTransformer = load_model

        with (
            patch.object(api, "_rag_ready", False),
            patch.object(api, "rm", None),
            patch.dict(
                sys.modules,
                {
                    "rag_model": FakeRag("rag_model"),
                    "sentence_transformers": sentence_transformers,
                },
            ),
        ):
            with ThreadPoolExecutor(max_workers=8) as pool:
                results = list(pool.map(lambda _: api._init_rag(), range(8)))

        self.assertEqual(counts, {"dataset": 1, "model": 1, "index": 1})
        self.assertTrue(all(results))


if __name__ == "__main__":
    unittest.main()
