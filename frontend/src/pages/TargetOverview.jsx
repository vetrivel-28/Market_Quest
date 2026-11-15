import React, { useEffect, useState, useMemo } from "react";
import { getModels, getModelAspects, getSpecPeers } from "../api";
import { useFilters, BRAND_COLORS, SENTIMENT_COLORS, formatCurrency, formatRating } from "../context/FilterContext";
import KPICard from "../components/KPICard";
import VisualContainer from "../components/VisualContainer";

function AspectBar({ aspect, pos, neg, demand }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: 3 }}>
        <span style={{ fontWeight: 600, color: "#334155" }}>{aspect.toUpperCase()}</span>
        <span style={{ color: "#64748b" }}>
          <strong style={{ color: "#059669" }}>+{pos}%</strong> / <strong style={{ color: "#dc2626" }}>-{neg}%</strong> ({demand} mentions)
        </span>
      </div>
      <div style={{ display: "flex", height: 7, borderRadius: 4, overflow: "hidden", background: "#f1f5f9" }}>
        <div style={{ width: `${pos}%`, background: "#059669" }} title={`Positive: ${pos}%`} />
        <div style={{ width: `${Math.max(0, 100 - pos - neg)}%`, background: "#cbd5e1" }} title="Neutral" />
        <div style={{ width: `${neg}%`, background: "#dc2626" }} title={`Negative: ${neg}%`} />
      </div>
    </div>
  );
}

function ModelRow({ model, target, onSelectForCompare }) {
  const [expanded, setExpanded] = useState(false);
  const [aspects, setAspects] = useState([]);
  const [peers, setPeers] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (expanded && aspects.length === 0) {
      setLoadingDetails(true);
      Promise.all([
        getModelAspects(target, model.laptop_name),
        getSpecPeers(model.laptop_name),
      ])
        .then(([aspRes, peerRes]) => {
          setAspects(aspRes.data.model_aspects || []);
          setPeers(peerRes.data || { peers: [], group: "Ungrouped" });
          setLoadingDetails(false);
        })
        .catch(() => setLoadingDetails(false));
    }
  }, [expanded, target, model.laptop_name]);

  const weaknesses = aspects.filter((a) => a.neg_ratio >= 18).sort((a, b) => b.neg_ratio - a.neg_ratio);
  const strengths = aspects.filter((a) => a.pos_ratio >= 45).sort((a, b) => b.pos_ratio - a.pos_ratio);

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        marginBottom: 10,
        background: "#ffffff",
        overflow: "hidden",
        transition: "box-shadow 0.15s ease",
      }}
    >
      {/* Model Summary Bar */}
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          cursor: "pointer",
          background: expanded ? "#f8fafc" : "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "1.1rem" }}>{expanded ? "▾" : "▸"}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#0f172a" }}>
              {model.laptop_name}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
              {model.category ? model.category.replace(/^Group_\d+_/, "") : "Catalog Model"} • {model.price_band || "Standard Band"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#0f172a" }}>
              {formatCurrency(model.price)}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
              {formatRating(model.rating)}
            </div>
          </div>

          {model.value_score && (
            <div
              style={{
                textAlign: "center",
                padding: "3px 8px",
                borderRadius: 4,
                background: model.value_score >= 100 ? "#ecfdf5" : "#fffbeb",
                border: `1px solid ${model.value_score >= 100 ? "#a7f3d0" : "#fde68a"}`,
              }}
            >
              <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#64748b" }}>VAL SCORE</div>
              <div style={{ fontWeight: 800, fontSize: "0.85rem", color: model.value_score >= 100 ? "#059669" : "#d97706" }}>
                {model.value_score}
              </div>
            </div>
          )}

          <div style={{ textAlign: "right", minWidth: 90 }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#334155" }}>
              {(model.total_sentences || 0).toLocaleString()} reviews
            </div>
            <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>Analyzed</div>
          </div>
        </div>
      </div>

      {/* Expanded Drillthrough Drawer */}
      {expanded && (
        <div style={{ padding: "16px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
          {loadingDetails ? (
            <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Loading model aspects and spec peers...</div>
          ) : (
            <div className="pbi-grid-2">
              {/* Aspect Satisfaction Breakdown */}
              <div style={{ background: "#ffffff", padding: "12px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#0f172a", marginBottom: 10 }}>
                  HARDWARE ASPECT SENTIMENT MIX
                </div>
                {aspects.length === 0 ? (
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>No specific aspect mentions detected for this model.</div>
                ) : (
                  aspects.slice(0, 6).map((a, i) => (
                    <AspectBar
                      key={i}
                      aspect={a.aspect}
                      pos={a.pos_ratio}
                      neg={a.neg_ratio}
                      demand={a.demand}
                    />
                  ))
                )}
              </div>

              {/* Spec Peers & Benchmarks */}
              <div style={{ background: "#ffffff", padding: "12px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "#0f172a" }}>
                    SPEC-TIER RIVALS ({peers?.group || "Group"})
                  </span>
                  <button
                    className="pbi-action-btn"
                    onClick={() => onSelectForCompare(model.laptop_name)}
                    style={{ fontSize: "0.72rem", background: "#4338ca", color: "#fff", borderColor: "#4338ca" }}
                  >
                    Compare Rivals ⚖️
                  </button>
                </div>

                {!peers?.peers?.length ? (
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>No direct spec peers mapped in this tier.</div>
                ) : (
                  peers.peers.map((peer, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "6px 0",
                        borderBottom: "1px solid #f1f5f9",
                        fontSize: "0.78rem",
                      }}
                    >
                      <div>
                        <span
                          className="pbi-badge"
                          style={{
                            marginRight: 6,
                            backgroundColor: `${BRAND_COLORS[peer.brand] || BRAND_COLORS.Market}15`,
                            color: BRAND_COLORS[peer.brand] || BRAND_COLORS.Market,
                          }}
                        >
                          {peer.brand}
                        </span>
                        <span style={{ fontWeight: 600 }}>{peer.model}</span>
                      </div>
                      <div style={{ color: "#475569" }}>
                        {formatCurrency(peer.price)} • {formatRating(peer.rating)}
                      </div>
                    </div>
                  ))
                )}

                {/* Strengths & Weaknesses Summary Badges */}
                <div style={{ marginTop: 12, paddingTop: 8, borderTop: "1px solid #f1f5f9" }}>
                  {strengths.length > 0 && (
                    <div style={{ fontSize: "0.74rem", marginBottom: 4 }}>
                      <strong style={{ color: "#059669" }}>Key Strengths:</strong>{" "}
                      {strengths.map((s) => `${s.aspect} (+${s.pos_ratio}%)`).join(", ")}
                    </div>
                  )}
                  {weaknesses.length > 0 && (
                    <div style={{ fontSize: "0.74rem" }}>
                      <strong style={{ color: "#dc2626" }}>Key Vulnerabilities:</strong>{" "}
                      {weaknesses.map((w) => `${w.aspect} (-${w.neg_ratio}%)`).join(", ")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TargetOverview() {
  const { target, priceBand, category, minRating, searchQuery, setSelectedModel } = useFilters();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getModels(target)
      .then((r) => {
        setModels(r.data.models || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [target]);

  // Slicer filtering
  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      if (priceBand !== "All" && m.price_band !== priceBand) return false;
      if (category !== "All" && m.category !== category) return false;
      if (minRating > 0 && m.rating < minRating) return false;
      if (searchQuery.trim() && !m.laptop_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [models, priceBand, category, minRating, searchQuery]);

  // Metric computations
  const stats = useMemo(() => {
    const prices = filteredModels.map((m) => m.price).filter(Boolean);
    const ratings = filteredModels.map((m) => m.rating).filter(Boolean);
    const totalReviews = filteredModels.reduce((s, m) => s + (m.total_sentences || 0), 0);

    return {
      count: filteredModels.length,
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      avgPrice: prices.length ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length) : 0,
      avgRating: ratings.length ? Number((ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(2)) : 0,
      totalReviews,
    };
  }, [filteredModels]);

  const handleCompareDrill = (modelName) => {
    setSelectedModel(modelName);
    window.location.hash = "#/comparison"; // or router push
    window.location.pathname = "/comparison";
  };

  return (
    <div>
      {/* Page Header */}
      <div className="pbi-page-header">
        <div className="pbi-breadcrumb">MarketQuest Studio / Reports / Target Brand Portfolio</div>
        <div className="pbi-page-title-row">
          <div>
            <h1 className="pbi-page-title">{target} Product Portfolio & Model Catalog</h1>
            <p className="pbi-page-desc">
              Detailed SKU-level breakdown of {target} laptops, customer rating benchmarks, hardware aspect satisfaction, and rival spec peers.
            </p>
          </div>
        </div>
      </div>

      {/* Target Brand KPI Scorecard */}
      <div className="pbi-grid-kpis">
        <KPICard
          title="Portfolio SKUs"
          value={stats.count}
          businessQuestion="How many laptop models exist in target catalog under active slicers?"
          grain="Brand Catalog"
          denominator="Active Slicer Context"
          delta={stats.count}
          deltaLabel="active models"
        />
        <KPICard
          title="Price Spread"
          value={`${formatCurrency(stats.minPrice)} – ${formatCurrency(stats.maxPrice)}`}
          businessQuestion="What is the lowest and highest price point in target catalog?"
          grain="Catalog"
          denominator="Amazon Verified Listings"
          delta={0}
          deltaLabel="range"
        />
        <KPICard
          title="Catalog Avg Price"
          value={formatCurrency(stats.avgPrice)}
          businessQuestion="What is the average catalog price across filtered target models?"
          grain="Model Price"
          denominator={`${stats.count} models`}
          delta={formatCurrency(stats.avgPrice)}
          deltaLabel="brand mean"
          isPositiveGood={false}
        />
        <KPICard
          title="Average Star Rating"
          value={formatRating(stats.avgRating)}
          businessQuestion="What is the average e-commerce star rating for target models?"
          grain="Customer Rating"
          denominator={`${stats.count} models`}
          delta={stats.avgRating}
          deltaLabel="stars"
          isPositiveGood={true}
        />
        <KPICard
          title="Total Reviews Analyzed"
          value={stats.totalReviews.toLocaleString()}
          businessQuestion="What is the customer sentiment sample size for target models?"
          grain="Sentence Grain"
          denominator="Verified customer discussions"
          delta={stats.totalReviews}
          deltaLabel="sentences"
        />
      </div>

      {/* Model Catalog Section */}
      <VisualContainer
        title={`${target} Verified Models Directory (${filteredModels.length} SKUs)`}
        businessQuestion="How does each model line perform across pricing, ratings, customer review volume, and Value Score?"
        data={filteredModels}
        exportFilename={`${target.toLowerCase()}_catalog_models`}
        sampleSize={`${filteredModels.length} models, ${stats.totalReviews.toLocaleString()} reviews`}
      >
        <div style={{ marginBottom: 12, fontSize: "0.78rem", color: "#64748b" }}>
          Click on any model row to expand hardware aspect sentiment, weakness alerts, and direct spec rivals.
        </div>

        {filteredModels.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
            No models match the active filter criteria. Try adjusting the Price Band or Category slicer.
          </div>
        ) : (
          filteredModels.map((m, idx) => (
            <ModelRow
              key={idx}
              model={m}
              target={target}
              onSelectForCompare={handleCompareDrill}
            />
          ))
        )}
      </VisualContainer>
    </div>
  );
}
