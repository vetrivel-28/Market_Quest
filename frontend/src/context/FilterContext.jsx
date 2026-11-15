import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

const FilterContext = createContext(null);

export const BRAND_COLORS = {
  ASUS: "#4338ca",   // Target Deep Indigo
  HP: "#2563eb",     // Royal Blue
  Dell: "#0891b2",   // Ocean Cyan
  Lenovo: "#7c3aed", // Vivid Violet
  Market: "#64748b", // Neutral Slate
};

export const SENTIMENT_COLORS = {
  Positive: "#059669",
  Neutral: "#64748b",
  Negative: "#dc2626",
};

export const PRICE_BANDS = [
  "All",
  "Budget (< ₹50k)",
  "Mid-Range (₹50k-₹80k)",
  "Upper-Mid (₹80k-₹1.2L)",
  "Premium (> ₹1.2L)",
];

export const CATEGORIES = [
  "All",
  "Group 1 Budget Student",
  "Group 2 Midrange Thin Light",
  "Group 3 Entry Gaming",
  "Group 4 Mid Gaming",
  "Group 5 Premium Performance",
];

export const RATING_FILTERS = [
  { label: "All Ratings", value: 0 },
  { label: "≥ 4.0 ★", value: 4.0 },
  { label: "≥ 4.3 ★", value: 4.3 },
  { label: "≥ 4.5 ★", value: 4.5 },
];

export function formatCurrency(num) {
  if (num == null || isNaN(num) || num === 0) return "₹0";
  return "₹" + Number(num).toLocaleString("en-IN");
}

export function formatRating(num) {
  if (num == null || isNaN(num)) return "—";
  return Number(num).toFixed(1) + " ★";
}

export function formatPercent(num) {
  if (num == null || isNaN(num)) return "0.0%";
  return Number(num).toFixed(1) + "%";
}

export function exportToCsv(filename, rows) {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(","),
    ...rows.map(row =>
      headers.map(field => {
        let val = row[field];
        if (val === null || val === undefined) val = "";
        const escaped = ("" + val).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(",")
    ),
  ].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function FilterProvider({ children, brands = ["ASUS", "HP", "Dell", "Lenovo"] }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [target, setTargetState] = useState(() => searchParams.get("target") || "ASUS");
  const [competitors, setCompetitors] = useState(() => {
    const cp = searchParams.get("comp");
    return cp ? cp.split(",") : ["HP", "Dell", "Lenovo"];
  });
  const [priceBand, setPriceBandState] = useState(() => searchParams.get("price") || "All");
  const [category, setCategoryState] = useState(() => searchParams.get("cat") || "All");
  const [minRating, setMinRatingState] = useState(() => Number(searchParams.get("rating")) || 0);
  const [selectedModel, setSelectedModel] = useState(() => searchParams.get("model") || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("mq_bookmarks") || "[]");
    } catch {
      return [];
    }
  });

  // Sync state to URL search parameters for shareable links & bookmarks
  useEffect(() => {
    const params = new URLSearchParams();
    if (target !== "ASUS") params.set("target", target);
    if (competitors.length < 3) params.set("comp", competitors.join(","));
    if (priceBand !== "All") params.set("price", priceBand);
    if (category !== "All") params.set("cat", category);
    if (minRating > 0) params.set("rating", String(minRating));
    if (selectedModel) params.set("model", selectedModel);
    setSearchParams(params, { replace: true });
  }, [target, competitors, priceBand, category, minRating, selectedModel]);

  const setTarget = (val) => {
    setTargetState(val);
    // keep competitors mutually exclusive with target
    setCompetitors(prev => prev.filter(c => c.toLowerCase() !== val.toLowerCase()));
  };

  const toggleCompetitor = (comp) => {
    setCompetitors(prev => {
      if (prev.includes(comp)) {
        return prev.length > 1 ? prev.filter(c => c !== comp) : prev;
      } else {
        return [...prev, comp];
      }
    });
  };

  const setPriceBand = (band) => setPriceBandState(band);
  const setCategory = (cat) => setCategoryState(cat);
  const setMinRating = (r) => setMinRatingState(r);

  const resetFilters = () => {
    setPriceBandState("All");
    setCategoryState("All");
    setMinRatingState(0);
    setSelectedModel(null);
    setSearchQuery("");
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (priceBand !== "All") count++;
    if (category !== "All") count++;
    if (minRating > 0) count++;
    if (selectedModel) count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [priceBand, category, minRating, selectedModel, searchQuery]);

  const activeFilterSummary = useMemo(() => {
    const chips = [];
    if (priceBand !== "All") chips.push({ type: "price", label: priceBand, onRemove: () => setPriceBandState("All") });
    if (category !== "All") chips.push({ type: "category", label: category.replace(/^Group_\d+_/, ""), onRemove: () => setCategoryState("All") });
    if (minRating > 0) chips.push({ type: "rating", label: `≥ ${minRating} ★`, onRemove: () => setMinRatingState(0) });
    if (selectedModel) chips.push({ type: "model", label: selectedModel, onRemove: () => setSelectedModel(null) });
    if (searchQuery.trim()) chips.push({ type: "search", label: `"${searchQuery}"`, onRemove: () => setSearchQuery("") });
    return chips;
  }, [priceBand, category, minRating, selectedModel, searchQuery]);

  const saveBookmark = (name) => {
    const newBm = {
      id: Date.now(),
      name: name || `View ${bookmarks.length + 1}`,
      target,
      priceBand,
      category,
      minRating,
      selectedModel,
    };
    const updated = [...bookmarks, newBm];
    setBookmarks(updated);
    localStorage.setItem("mq_bookmarks", JSON.stringify(updated));
  };

  const applyBookmark = (bm) => {
    if (bm.target) setTargetState(bm.target);
    setPriceBandState(bm.priceBand || "All");
    setCategoryState(bm.category || "All");
    setMinRatingState(bm.minRating || 0);
    setSelectedModel(bm.selectedModel || null);
  };

  const deleteBookmark = (id) => {
    const updated = bookmarks.filter(b => b.id !== id);
    setBookmarks(updated);
    localStorage.setItem("mq_bookmarks", JSON.stringify(updated));
  };

  return (
    <FilterContext.Provider
      value={{
        target,
        setTarget,
        brands,
        competitors,
        toggleCompetitor,
        priceBand,
        setPriceBand,
        category,
        setCategory,
        minRating,
        setMinRating,
        selectedModel,
        setSelectedModel,
        searchQuery,
        setSearchQuery,
        resetFilters,
        activeFilterCount,
        activeFilterSummary,
        bookmarks,
        saveBookmark,
        applyBookmark,
        deleteBookmark,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within FilterProvider");
  return ctx;
}
