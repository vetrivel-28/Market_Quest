"""
RAG model — loads Reddit VADER review CSVs, builds a FAISS vector index,
and exposes a retrieve() function used by the FastAPI chat endpoint.
"""

import os
import glob
import pickle
import numpy as np
import pandas as pd

# ── Default paths (overridden by api/main.py at runtime) ─────────────────────
BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR   = os.path.join(BASE_DIR, "datasets", "reddit_vader_results")
CACHE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rag_cache.pkl")


# ── Load dataset ──────────────────────────────────────────────────────────────
def load_dataset(data_dir: str = None) -> pd.DataFrame:
    """Load all per-model Reddit VADER CSVs into one DataFrame."""
    if data_dir is None:
        data_dir = DATA_DIR

    if not os.path.isdir(data_dir):
        print(f"Warning: Reddit dataset directory not found: {data_dir}")

    frames = []
    for fp in glob.glob(os.path.join(data_dir, "*.csv")):
        if "all_reddit_cleaned" in fp:
            continue
        try:
            df = pd.read_csv(fp)
            df.columns = [c.strip().lower() for c in df.columns]
            # Normalise column names
            if "laptop_name" not in df.columns:
                stem = os.path.splitext(os.path.basename(fp))[0].replace("_", " ")
                df["laptop_name"] = stem
            frames.append(df)
        except Exception:
            pass

    if not frames:
        return pd.DataFrame(columns=["laptop_name", "sentence", "compound_score", "sentiment"])

    df = pd.concat(frames, ignore_index=True)
    df["sentence"]       = df["sentence"].fillna("").astype(str)
    df["compound_score"] = pd.to_numeric(df.get("compound_score", 0), errors="coerce").fillna(0)
    df["laptop_name"]    = df["laptop_name"].fillna("Unknown").astype(str)

    # Derive brand from laptop_name
    def _brand(name):
        n = name.upper()
        for b in ["ASUS", "HP", "DELL", "LENOVO"]:
            if b in n:
                return b.capitalize() if b != "HP" else "HP"
        return "Unknown"

    df["brand"] = df["laptop_name"].apply(_brand)
    return df


# ── Build FAISS index ─────────────────────────────────────────────────────────
def build_index(df: pd.DataFrame, embed_model, cache_file: str = None):
    """
    Encode all sentences with embed_model and build a FAISS flat-L2 index.
    Caches embeddings to disk to avoid re-encoding on every restart.
    Returns (index, embeddings).
    """
    import faiss

    if cache_file is None:
        cache_file = CACHE_FILE

    sentences = df["sentence"].tolist()

    # Try loading from cache
    if os.path.exists(cache_file):
        try:
            with open(cache_file, "rb") as f:
                cached = pickle.load(f)
            if cached.get("n") == len(sentences):
                embeddings = cached["embeddings"]
                print("Loading embeddings from cache ...")
                dim   = embeddings.shape[1]
                index = faiss.IndexFlatL2(dim)
                index.add(embeddings.astype("float32"))
                print(f"Index ready - {index.ntotal} vectors")
                return index, embeddings
        except Exception:
            pass

    # Encode fresh
    print(f"Encoding {len(sentences)} sentences ...")
    embeddings = embed_model.encode(sentences, show_progress_bar=True,
                                    batch_size=64, convert_to_numpy=True)
    embeddings = embeddings.astype("float32")

    # Save cache
    try:
        with open(cache_file, "wb") as f:
            pickle.dump({"n": len(sentences), "embeddings": embeddings}, f)
    except Exception:
        pass

    dim   = embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings)
    print(f"Index ready - {index.ntotal} vectors")
    return index, embeddings


# ── Retrieve ──────────────────────────────────────────────────────────────────
def retrieve(query: str, df: pd.DataFrame, index, embed_model, top_k: int = 5) -> list:
    """
    Encode query, search FAISS index, return top_k matching review rows as dicts.
    Each dict has: sentence, product, brand, compound_score, similarity_score
    """
    q_vec = embed_model.encode([query], convert_to_numpy=True).astype("float32")
    distances, indices = index.search(q_vec, top_k)

    results = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx < 0 or idx >= len(df):
            continue
        row = df.iloc[idx]
        results.append({
            "sentence":        str(row.get("sentence", "")),
            "product":         str(row.get("laptop_name", "Unknown")),
            "brand":           str(row.get("brand", "Unknown")),
            "compound_score":  float(row.get("compound_score", 0.0)),
            "similarity_score": float(1 / (1 + dist)),   # convert L2 dist → similarity
        })
    return results
