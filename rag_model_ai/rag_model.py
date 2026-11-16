"""
RAG model for Reddit VADER laptop reviews.

Loads per-model CSV files, builds a shared FAISS index, and supports
product-aware and aspect-aware retrieval using cached sentence embeddings.
"""

import os
import glob
import pickle
import re

import numpy as np
import pandas as pd


# Default paths (overridden by api/main.py at runtime)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "datasets", "reddit_vader_results")
CACHE_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "rag_cache.pkl"
)


ASPECT_KEYWORDS = {
    "battery": [
        "battery", "backup", "battery life", "battery drain",
        "charging", "charge", "discharge", "unplugged"
    ],
    "thermal": [
        "heat", "heating", "temperature", "thermal",
        "fan", "cooling", "overheat", "overheating"
    ],
    "performance": [
        "performance", "slow", "lag", "speed", "processor",
        "cpu", "fps", "gaming", "stutter", "crash"
    ],
    "display": [
        "display", "screen", "brightness", "resolution",
        "refresh rate", "panel", "flicker"
    ],
    "build": [
        "build quality", "hinge", "body", "plastic",
        "chassis", "keyboard", "trackpad", "touchpad"
    ],
    "graphics": ["graphics", "gpu", "rtx", "gtx", "nvidia"],
    "price": ["price", "cost", "expensive", "cheap", "value", "worth"]
}


def normalize_text(value: str) -> str:
    """Lowercase text and remove punctuation for robust name matching."""
    return re.sub(
        r"\s+",
        " ",
        re.sub(r"[^a-z0-9 ]", " ", str(value).lower())
    ).strip()


def load_dataset(data_dir: str = None) -> pd.DataFrame:
    """Load all per-model Reddit VADER CSVs into one DataFrame."""
    if data_dir is None:
        data_dir = DATA_DIR

    if not os.path.isdir(data_dir):
        raise FileNotFoundError(
            f"Reddit dataset directory not found: {data_dir}"
        )

    frames = []

    for filepath in sorted(glob.glob(os.path.join(data_dir, "*.csv"))):
        if "all_reddit_cleaned" in os.path.basename(filepath).lower():
            continue

        try:
            frame = pd.read_csv(filepath)
            frame.columns = [column.strip().lower() for column in frame.columns]

            if "sentence" not in frame.columns:
                print(f"Skipping {filepath}: missing sentence column")
                continue

            if "laptop_name" not in frame.columns:
                stem = os.path.splitext(os.path.basename(filepath))[0]
                frame["laptop_name"] = stem.replace("_", " ")

            frames.append(frame)

        except Exception as exc:
            print(f"Could not read {filepath}: {exc}")

    if not frames:
        return pd.DataFrame(
            columns=[
                "laptop_name", "sentence", "compound_score",
                "sentiment", "brand"
            ]
        )

    dataframe = pd.concat(frames, ignore_index=True)

    dataframe["sentence"] = (
        dataframe["sentence"].fillna("").astype(str)
    )
    dataframe["compound_score"] = pd.to_numeric(
        dataframe.get("compound_score", 0),
        errors="coerce"
    )
    dataframe["compound_score"] = dataframe["compound_score"].fillna(0)
    dataframe["laptop_name"] = (
        dataframe["laptop_name"].fillna("Unknown").astype(str).str.strip()
    )

    def derive_brand(name):
        upper_name = name.upper()
        for brand in ["ASUS", "HP", "DELL", "LENOVO"]:
            if brand in upper_name:
                return brand
        return "Unknown"

    dataframe["brand"] = dataframe["laptop_name"].apply(derive_brand)

    # Keep positional row numbers aligned with the embedding matrix.
    return dataframe.reset_index(drop=True)


def build_index(df: pd.DataFrame, embed_model, cache_file: str = None):
    """
    Encode all review sentences and build a FAISS flat-L2 index.

    Returns:
        (faiss_index, float32_embeddings)

    Cache validation uses a content fingerprint, not only row count.
    Older cache files without a fingerprint are safely rebuilt once.
    """
    import faiss
    import hashlib

    if cache_file is None:
        cache_file = CACHE_FILE

    os.makedirs(os.path.dirname(os.path.abspath(cache_file)), exist_ok=True)

    sentences = df["sentence"].fillna("").astype(str).tolist()
    fingerprint_source = "\n".join(
        f"{product}\t{sentence}"
        for product, sentence in zip(
            df["laptop_name"].astype(str).tolist(),
            sentences
        )
    )
    fingerprint = hashlib.sha256(
        fingerprint_source.encode("utf-8")
    ).hexdigest()

    if os.path.exists(cache_file):
        try:
            with open(cache_file, "rb") as cache_handle:
                cached = pickle.load(cache_handle)

            cached_embeddings = cached.get("embeddings")
            cache_is_valid = (
                cached.get("n") == len(sentences)
                and cached.get("fingerprint") == fingerprint
                and isinstance(cached_embeddings, np.ndarray)
                and cached_embeddings.ndim == 2
                and cached_embeddings.shape[0] == len(sentences)
            )

            if cache_is_valid:
                embeddings = cached_embeddings.astype("float32", copy=False)
                print("Loading validated embeddings from cache...")
                index = faiss.IndexFlatL2(embeddings.shape[1])
                index.add(embeddings)
                print(f"Index ready - {index.ntotal} vectors")
                return index, embeddings

            print("Embedding cache is outdated or unverified. Rebuilding it...")

        except Exception as exc:
            print(f"Could not load embedding cache: {exc}")

    if not sentences:
        raise ValueError("Cannot build a RAG index from an empty dataset.")

    print(f"Encoding {len(sentences)} sentences...")
    embeddings = embed_model.encode(
        sentences,
        show_progress_bar=True,
        batch_size=64,
        convert_to_numpy=True
    )
    embeddings = np.asarray(embeddings, dtype="float32")

    if embeddings.ndim != 2 or embeddings.shape[0] != len(sentences):
        raise ValueError("Embedding model returned an unexpected array shape.")

    try:
        with open(cache_file, "wb") as cache_handle:
            pickle.dump(
                {
                    "n": len(sentences),
                    "fingerprint": fingerprint,
                    "embeddings": embeddings
                },
                cache_handle,
                protocol=pickle.HIGHEST_PROTOCOL
            )
        print(f"Saved embedding cache: {cache_file}")
    except Exception as exc:
        print(f"Could not save embedding cache: {exc}")

    index = faiss.IndexFlatL2(embeddings.shape[1])
    index.add(embeddings)
    print(f"Index ready - {index.ntotal} vectors")

    return index, embeddings


def match_product(query: str, df: pd.DataFrame):
    """
    Return the best exact known product mentioned in a query.

    Supports both 'ASUS ROG Strix G15' and 'ROG Strix G15'.
    Returns None when no sufficiently specific known product is present.
    """
    if df.empty or "laptop_name" not in df.columns:
        return None

    normalized_query = normalize_text(query)
    products = (
        df["laptop_name"].dropna().astype(str).unique().tolist()
    )

    candidates = []

    for product in products:
        normalized_product = normalize_text(product)
        if not normalized_product:
            continue

        aliases = {normalized_product}

        # Permit omission of a leading brand in the user's wording.
        for brand in ("asus", "hp", "dell", "lenovo"):
            prefix = brand + " "
            if normalized_product.startswith(prefix):
                aliases.add(normalized_product[len(prefix):].strip())

        for alias in aliases:
            if alias and re.search(
                r"(?<![a-z0-9])" + re.escape(alias) + r"(?![a-z0-9])",
                normalized_query
            ):
                candidates.append((len(alias), product))
                break

    if not candidates:
        return None

    candidates.sort(key=lambda item: item[0], reverse=True)
    return candidates[0][1]


def detect_aspect(query: str):
    """Return a recognized review aspect, or None if not specified."""
    normalized_query = normalize_text(query)

    matches = []
    for aspect, keywords in ASPECT_KEYWORDS.items():
        for keyword in keywords:
            normalized_keyword = normalize_text(keyword)
            if normalized_keyword and re.search(
                r"(?<![a-z0-9])" + re.escape(normalized_keyword) + r"(?![a-z0-9])",
                normalized_query
            ):
                matches.append((len(normalized_keyword), aspect))
                break

    if not matches:
        return None

    matches.sort(key=lambda item: item[0], reverse=True)
    return matches[0][1]


def retrieve(
    query: str,
    df: pd.DataFrame,
    index,
    embed_model,
    top_k: int = 5,
    embeddings=None,
    product=None,
    aspect=None
) -> list:
    """
    Product-aware and aspect-aware semantic retrieval.

    Product and aspect filters are applied before ranking. Distances are
    calculated against the matching rows from the shared embedding matrix.
    """
    if df.empty:
        return []

    if embeddings is None:
        raise ValueError(
            "The embeddings matrix is required for filtered retrieval. "
            "Capture the second value returned by build_index()."
        )

    if len(embeddings) != len(df):
        raise ValueError(
            "Embedding count does not match dataset row count. "
            "Rebuild the FAISS index and embedding cache."
        )

    filtered = df

    if product:
        filtered = filtered[
            filtered["laptop_name"].astype(str) == str(product)
        ]

    if filtered.empty:
        return []

    if aspect:
        keywords = ASPECT_KEYWORDS.get(aspect, [])
        if keywords:
            pattern = "|".join(re.escape(word) for word in keywords)
            aspect_mask = filtered["sentence"].str.contains(
                pattern,
                case=False,
                na=False,
                regex=True
            )
            filtered = filtered[aspect_mask]

    if filtered.empty:
        return []

    # load_dataset() returns a reset RangeIndex, preserving embedding alignment.
    row_positions = filtered.index.to_numpy(dtype=int)
    candidate_embeddings = embeddings[row_positions]

    query_vector = embed_model.encode(
        [query],
        convert_to_numpy=True
    )
    query_vector = np.asarray(query_vector, dtype="float32")[0]

    distances = np.sum(
        (candidate_embeddings - query_vector) ** 2,
        axis=1
    )

    best_positions = np.argsort(distances)[:max(1, int(top_k))]

    results = []
    for candidate_position in best_positions:
        row = filtered.iloc[int(candidate_position)]
        distance = float(distances[candidate_position])

        results.append({
            "sentence": str(row.get("sentence", "")),
            "product": str(row.get("laptop_name", "Unknown")),
            "brand": str(row.get("brand", "Unknown")),
            "compound_score": float(row.get("compound_score", 0.0)),
            "similarity_score": float(1.0 / (1.0 + distance))
        })

    return results
