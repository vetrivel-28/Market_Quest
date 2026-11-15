import React, { useState, useEffect } from "react";
import {
  useFilters,
  PRICE_BANDS,
  CATEGORIES,
  RATING_FILTERS,
  BRAND_COLORS,
} from "../context/FilterContext";
import { getDataQuality } from "../api";

export default function TopFilterBar() {
  const {
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
    searchQuery,
    setSearchQuery,
    resetFilters,
    activeFilterCount,
    activeFilterSummary,
    bookmarks,
    saveBookmark,
    applyBookmark,
    deleteBookmark,
  } = useFilters();

  const [showDQ, setShowDQ] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bmName, setBmName] = useState("");
  const [dqData, setDqData] = useState(null);

  useEffect(() => {
    getDataQuality()
      .then((r) => setDqData(r.data))
      .catch(() => {});
  }, []);

  const handleSaveBm = (e) => {
    e.preventDefault();
    if (bmName.trim()) {
      saveBookmark(bmName.trim());
      setBmName("");
    }
  };

  return (
    <div className="pbi-topbar-wrapper">
      {/* Primary Slicer Ribbon */}
      <div className="pbi-slicer-ribbon">
        {/* Global Target Slicer */}
        <div className="pbi-slicer-group">
          <label className="pbi-slicer-label">TARGET BRAND</label>
          <div className="pbi-brand-pills">
            {brands.map((b) => {
              const isSelected = target.toLowerCase() === b.toLowerCase();
              return (
                <button
                  key={b}
                  className={`pbi-brand-pill ${isSelected ? "selected" : ""}`}
                  onClick={() => setTarget(b)}
                  style={isSelected ? { backgroundColor: BRAND_COLORS[b] || BRAND_COLORS.ASUS } : {}}
                >
                  {b}
                </button>
              );
            })}
          </div>
        </div>

        {/* Competitor Slicer Multi-toggle */}
        <div className="pbi-slicer-group">
          <label className="pbi-slicer-label">COMPETITORS</label>
          <div className="pbi-brand-pills">
            {brands
              .filter((b) => b.toLowerCase() !== target.toLowerCase())
              .map((comp) => {
                const isActive = competitors.includes(comp);
                return (
                  <button
                    key={comp}
                    className={`pbi-comp-pill ${isActive ? "active" : ""}`}
                    onClick={() => toggleCompetitor(comp)}
                    style={isActive ? { borderColor: BRAND_COLORS[comp], color: BRAND_COLORS[comp] } : {}}
                    title={`Toggle ${comp} in benchmarking`}
                  >
                    {isActive ? `✓ ${comp}` : `+ ${comp}`}
                  </button>
                );
              })}
          </div>
        </div>

        {/* Price Band Slicer */}
        <div className="pbi-slicer-group">
          <label className="pbi-slicer-label">PRICE BAND</label>
          <select
            className="pbi-select"
            value={priceBand}
            onChange={(e) => setPriceBand(e.target.value)}
          >
            {PRICE_BANDS.map((pb) => (
              <option key={pb} value={pb}>
                {pb}
              </option>
            ))}
          </select>
        </div>

        {/* Spec Category Slicer */}
        <div className="pbi-slicer-group">
          <label className="pbi-slicer-label">SPEC CATEGORY</label>
          <select
            className="pbi-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "All" ? "All Categories" : cat.replace(/^Group_\d+_/, "")}
              </option>
            ))}
          </select>
        </div>

        {/* Rating Slicer */}
        <div className="pbi-slicer-group">
          <label className="pbi-slicer-label">MIN STAR RATING</label>
          <select
            className="pbi-select"
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
          >
            {RATING_FILTERS.map((rf) => (
              <option key={rf.value} value={rf.value}>
                {rf.label}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="pbi-slicer-group" style={{ flex: 1, minWidth: 160 }}>
          <label className="pbi-slicer-label">SEARCH MODEL</label>
          <input
            type="text"
            className="pbi-input"
            placeholder="e.g. TUF, Legion, Omen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Reset & Bookmarks Utilities */}
        <div className="pbi-slicer-utilities">
          {activeFilterCount > 0 && (
            <button className="pbi-reset-btn" onClick={resetFilters} title="Reset all slicers">
              ↺ Reset ({activeFilterCount})
            </button>
          )}

          {/* Bookmarks Menu */}
          <div style={{ position: "relative" }}>
            <button
              className="pbi-utility-btn"
              onClick={() => setShowBookmarks((v) => !v)}
              title="Saved Filter Bookmarks"
            >
              📑 Views
            </button>
            {showBookmarks && (
              <div className="pbi-popover-dropdown">
                <div style={{ fontWeight: 700, fontSize: "0.82rem", marginBottom: 8, color: "#0f172a" }}>
                  Saved Filter States
                </div>
                <form onSubmit={handleSaveBm} style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  <input
                    type="text"
                    className="pbi-input"
                    placeholder="Bookmark name..."
                    value={bmName}
                    onChange={(e) => setBmName(e.target.value)}
                    style={{ fontSize: "0.78rem", padding: "4px 8px" }}
                  />
                  <button type="submit" className="pbi-action-btn" style={{ padding: "4px 8px" }}>
                    Save
                  </button>
                </form>
                {bookmarks.length === 0 ? (
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>No saved views yet.</div>
                ) : (
                  bookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "4px 0",
                        fontSize: "0.8rem",
                        borderBottom: "1px solid #f1f5f9",
                      }}
                    >
                      <span
                        onClick={() => {
                          applyBookmark(bm);
                          setShowBookmarks(false);
                        }}
                        style={{ cursor: "pointer", color: "#4338ca", fontWeight: 600 }}
                      >
                        {bm.name}
                      </span>
                      <button
                        onClick={() => deleteBookmark(bm.id)}
                        style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Data Quality Pill */}
          <div style={{ position: "relative" }}>
            <button
              className="pbi-dq-pill"
              onClick={() => setShowDQ((v) => !v)}
              title="Data Quality & Lineage Audit"
            >
              <span className="pbi-dq-dot" />
              <span>31.6k Records</span>
            </button>
            {showDQ && dqData && (
              <div className="pbi-popover-dropdown" style={{ width: 320, right: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a" }}>
                    Data Quality & Governance
                  </span>
                  <span className="pbi-badge pbi-badge-green">STATUS: {dqData.status}</span>
                </div>
                <div style={{ fontSize: "0.78rem", color: "#475569", lineHeight: 1.6, marginBottom: 8 }}>
                  <div>• <strong>Total Ingested:</strong> {dqData.total_records_ingested.toLocaleString()} reviews</div>
                  <div>• <strong>Reddit vs Amazon:</strong> {dqData.sources_breakdown.reddit?.toLocaleString()} / {dqData.sources_breakdown.amazon?.toLocaleString()}</div>
                  <div>• <strong>Null Review Texts:</strong> {dqData.null_sentence_count}</div>
                  <div>• <strong>Models Analyzed:</strong> {dqData.models_total} ({dqData.models_missing_price} missing catalog price)</div>
                  <div>• <strong>Sentiment Classification:</strong> {dqData.sentiment_coverage_pct}% VADER covered</div>
                </div>
                <div style={{ fontSize: "0.72rem", color: "#64748b", borderTop: "1px solid #e2e8f0", paddingTop: 6 }}>
                  <strong>Applied Steps (Power Query Engine):</strong>
                  <ol style={{ paddingLeft: 16, marginTop: 4 }}>
                    {dqData.applied_steps.map((st, i) => (
                      <li key={i}>{st}</li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Filter Chips Strip */}
      {activeFilterSummary.length > 0 && (
        <div className="pbi-active-chips-strip">
          <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Active Filters:</span>
          {activeFilterSummary.map((chip, idx) => (
            <span key={idx} className="pbi-filter-chip">
              <span style={{ opacity: 0.7, marginRight: 4 }}>{chip.type}:</span>
              <strong>{chip.label}</strong>
              <button onClick={chip.onRemove} title="Remove filter">
                ×
              </button>
            </span>
          ))}
          <button className="pbi-clear-all-link" onClick={resetFilters}>
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
