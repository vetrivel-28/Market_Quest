import React, { useEffect, useState, useMemo } from "react";
import { getInsights, getModels, getPriceModels } from "../api";
import { useFilters, BRAND_COLORS, formatCurrency, formatRating } from "../context/FilterContext";
import VisualContainer from "../components/VisualContainer";
import KPICard from "../components/KPICard";

const INSIGHT_TYPE_META = {
  threat: { label: "Competitor Threat", badgeClass: "pbi-badge-high", color: "#dc2626", icon: "⚠️" },
  price: { label: "Price Anomaly", badgeClass: "pbi-badge-medium", color: "#d97706", icon: "💰" },
  gap: { label: "Feature Sentiment Gap", badgeClass: "pbi-badge-neutral", color: "#0891b2", icon: "📊" },
  advantage: { label: "Target Advantage", badgeClass: "pbi-badge-green", color: "#059669", icon: "✅" },
  weakness: { label: "Complaint Driver", badgeClass: "pbi-badge-high", color: "#dc2626", icon: "🚨" },
};

function InsightCard({ ins }) {
  const [showMethodology, setShowMethodology] = useState(false);
  const meta = INSIGHT_TYPE_META[ins.type] || INSIGHT_TYPE_META.gap;

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderLeft: `4px solid ${meta.color}`,
        borderRadius: 8,
        padding: "14px 16px",
        background: "#ffffff",
        marginBottom: 10,
        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: "0.85rem" }}>{meta.icon}</span>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: meta.color, textTransform: "uppercase" }}>
              {meta.label}
            </span>
            {ins.brand && (
              <span
                className="pbi-badge"
                style={{
                  backgroundColor: `${BRAND_COLORS[ins.brand] || BRAND_COLORS.Market}15`,
                  color: BRAND_COLORS[ins.brand] || BRAND_COLORS.Market,
                }}
              >
                {ins.brand}
              </span>
            )}
          </div>
          <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#0f172a", marginBottom: 4 }}>
            {ins.title}
          </div>
          <div style={{ fontSize: "0.82rem", color: "#475569", lineHeight: 1.5 }}>
            {ins.body}
          </div>
        </div>

        {ins.severity && (
          <span
            className="pbi-badge"
            style={{
              background: ins.severity === "High" ? "#fee2e2" : ins.severity === "Medium" ? "#fef3c7" : "#d1fae5",
              color: ins.severity === "High" ? "#991b1b" : ins.severity === "Medium" ? "#92400e" : "#065f46",
              whiteSpace: "nowrap",
            }}
          >
            {ins.severity} Severity
          </span>
        )}
      </div>

      {/* Methodology & Traceability Expander */}
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #f8fafc" }}>
        <button
          onClick={() => setShowMethodology((v) => !v)}
          style={{
            background: "none",
            border: "none",
            color: "#4338ca",
            fontSize: "0.72rem",
            fontWeight: 600,
            cursor: "pointer",
            padding: 0,
          }}
        >
          {showMethodology ? "▾ Hide Calculation Methodology" : "▸ How was this computed? (Traceability)"}
        </button>

        {showMethodology && (
          <div
            style={{
              marginTop: 6,
              padding: "8px 10px",
              background: "#f8fafc",
              borderRadius: 6,
              fontSize: "0.72rem",
              color: "#64748b",
              lineHeight: 1.5,
            }}
          >
            <div>
              <strong>Measure Logic:</strong> Evaluates sentiment delta `[Target Pos %] - [Competitor Pos %]` across matched specification tiers and verifies price delta against canonical Amazon listings.
            </div>
            <div>
              <strong>Grain & Denominator:</strong> Model-Aspect pair level; denominator is verified sentences explicitly detecting aspect keywords.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Insights() {
  const { target, selectedModel, setSelectedModel } = useFilters();

  const [availableModels, setAvailableModels] = useState([]);
  const [modelDetailsMap, setModelDetailsMap] = useState({});
  const [insightsData, setInsightsData] = useState([]);
  const [analysisMeta, setAnalysisMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fType, setFType] = useState("All");

  const currentModel = availableModels.includes(selectedModel)
    ? selectedModel
    : availableModels[0] || "";

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.allSettled([
      getModels(target),
      getPriceModels(target),
    ]).then(([modRes, prRes]) => {
      if (!active) return;
      const rawModels = modRes.status === "fulfilled"
        ? (Array.isArray(modRes.value?.data) ? modRes.value.data : (modRes.value?.data?.models || []))
        : [];
      const prModels = prRes.status === "fulfilled"
        ? (Array.isArray(prRes.value?.data) ? prRes.value.data : (prRes.value?.data?.models || []))
        : [];

      const dMap = {};
      // Populate from price-models first (canonical prices)
      prModels.forEach((m) => {
        if (m && m.laptop_name) {
          dMap[m.laptop_name.toLowerCase()] = m;
        }
      });
      // Populate/merge with raw models
      rawModels.forEach((m) => {
        if (m && m.laptop_name) {
          const k = m.laptop_name.toLowerCase();
          dMap[k] = { ...m, ...(dMap[k] || {}) };
        }
      });

      const mList = rawModels.length > 0
        ? rawModels.map((m) => m.laptop_name).filter(Boolean)
        : prModels.map((m) => m.laptop_name).filter(Boolean);

      setModelDetailsMap(dMap);
      setAvailableModels(mList);
      if (mList.length === 0) setLoading(false);
    }).catch(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [target]);

  useEffect(() => {
    if (availableModels.length > 0 && !availableModels.includes(selectedModel)) {
      setSelectedModel(availableModels[0]);
    }
  }, [availableModels, selectedModel, setSelectedModel]);

  useEffect(() => {
    if (!currentModel) return;
    let active = true;
    setLoading(true);
    setInsightsData([]);
    setAnalysisMeta(null);

    getInsights(currentModel)
      .then((r) => {
        if (!active) return;
        setInsightsData(r.data.insights || []);
        setAnalysisMeta(r.data.analysis || null);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [currentModel]);

  const filteredInsights = useMemo(() => {
    if (fType === "All") return insightsData;
    return insightsData.filter((ins) => ins.type === fType);
  }, [insightsData, fType]);

  const currentModelDetails = modelDetailsMap[currentModel.toLowerCase()] || {};
  const catalogPrice = Number(
    analysisMeta?.price ||
    analysisMeta?.asus_price ||
    currentModelDetails.price ||
    0
  );
  const catalogRating = Number(
    analysisMeta?.rating ||
    analysisMeta?.asus_rating ||
    currentModelDetails.rating ||
    0
  );

  return (
    <div>
      {/* Page Header */}
      <div className="pbi-page-header">
        <div className="pbi-breadcrumb">MarketQuest Studio / Reports / Intelligence Reporting Center</div>
        <div className="pbi-page-title-row">
          <div>
            <h1 className="pbi-page-title">Competitive Intelligence & Insights Reporting Center</h1>
            <p className="pbi-page-desc">
              Algorithmic intelligence digests synthesizing customer sentiment anomalies, price position threats, and feature gap alerts for {target}.
            </p>
          </div>

          {/* Model Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b" }}>ANALYZE MODEL:</span>
            <select
              className="pbi-select"
              value={currentModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
              }}
              style={{ fontWeight: 600, minWidth: 240 }}
            >
              {availableModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Model Spec Overview Banner */}
      {currentModel && (
        <div className="pbi-grid-kpis">
          <KPICard
            title="Analyzed SKU"
            value={currentModel.replace(/^(ASUS|HP|Dell|Lenovo)\s+/i, "")}
            businessQuestion="Which laptop model is currently under algorithmic diagnosis?"
            grain="Target SKU"
            denominator={currentModel}
          />
          <KPICard
            title="Catalog Price"
            value={formatCurrency(catalogPrice)}
            businessQuestion="What is the verified e-commerce listing price of this model?"
            grain="Price Dimension"
            denominator="Amazon India"
          />
          <KPICard
            title="Star Rating"
            value={formatRating(catalogRating)}
            businessQuestion="What is the customer review star rating for this SKU?"
            grain="Star Rating"
            denominator="Verified Reviews"
          />
          <KPICard
            title="Detected Insights"
            value={insightsData.length}
            businessQuestion="How many statistical anomalies or competitive findings were flagged?"
            grain="Insights"
            denominator="Multi-Factor Analysis"
          />
        </div>
      )}

      {/* Slicer Tabs for Insight Types */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: "1.25rem",
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: 8,
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginRight: 6 }}>
          Filter by Type:
        </span>
        {[
          { key: "All", label: "All Findings" },
          { key: "threat", label: "Competitor Threat" },
          { key: "price", label: "Price Anomaly" },
          { key: "gap", label: "Feature Sentiment Gap" },
          { key: "advantage", label: "Target Advantage" },
          { key: "weakness", label: "Complaint Driver" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setFType(t.key)}
            className={`pbi-brand-pill ${fType === t.key ? "selected" : ""}`}
            style={{ fontSize: "0.75rem", padding: "4px 10px" }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
          Generating algorithmic competitive intelligence for {currentModel}...
        </div>
      ) : filteredInsights.length === 0 ? (
        <div className="pbi-card" style={{ padding: "2.5rem", textAlign: "center", color: "#64748b" }}>
          <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>🔍</div>
          <div style={{ fontWeight: 600 }}>No {fType !== "All" ? fType : ""} findings flagged for {currentModel}.</div>
          <div style={{ fontSize: "0.78rem", marginTop: 4 }}>
            Try selecting a different insight category or switch to another analyzed SKU above.
          </div>
        </div>
      ) : (
        <VisualContainer
          title={`Algorithmic Intelligence Findings (${filteredInsights.length} Verified Records)`}
          businessQuestion="What specific findings, complaints, or rival advantages are diagnosed for this model?"
          data={filteredInsights}
          exportFilename={`${currentModel.toLowerCase().replace(/\s+/g, "_")}_insights`}
          sampleSize={`${filteredInsights.length} findings`}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredInsights.map((ins, i) => (
              <InsightCard key={i} ins={ins} />
            ))}
          </div>
        </VisualContainer>
      )}
    </div>
  );
}
