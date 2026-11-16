import React, { useEffect, useState, useMemo } from "react";
import { getModelComparison, getModels } from "../api";
import {
  useFilters,
  BRAND_COLORS,
  formatCurrency,
  formatRating,
} from "../context/FilterContext";
import VisualContainer from "../components/VisualContainer";
import KPICard from "../components/KPICard";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Legend, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

const ASPECTS_LIST = [
  "performance",
  "battery",
  "display",
  "thermal",
  "keyboard",
  "design",
  "price",
  "graphics",
  "ram",
  "storage",
];

const ASPECT_LABELS = {
  performance: "Performance",
  battery: "Battery",
  display: "Display",
  thermal: "Thermal",
  keyboard: "Keyboard",
  design: "Design",
  price: "Price",
  graphics: "Graphics",
  ram: "RAM",
  storage: "Storage",
};

export default function CompetitorComparison() {
  const { target, selectedModel, setSelectedModel } = useFilters();

  const [availableModels, setAvailableModels] = useState([]);
  const [currentModel, setCurrentModel] = useState(selectedModel || "ASUS ROG Strix G15");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // Load target brand models for dropdown
  useEffect(() => {
    getModels(target)
      .then((r) => {
        const mList = (r.data.models || []).map((m) => m.laptop_name);
        setAvailableModels(mList);
        if (!selectedModel && mList.length > 0) {
          if (!mList.includes(currentModel)) {
            setCurrentModel(mList[0]);
          }
        }
      })
      .catch(() => {});
  }, [target]);

  // Sync if selectedModel changed globally
  useEffect(() => {
    if (selectedModel) {
      setCurrentModel(selectedModel);
    }
  }, [selectedModel]);

  // Fetch comparison data for current model
  useEffect(() => {
    if (!currentModel) return;
    setLoading(true);
    setErr(null);
    getModelComparison(currentModel)
      .then((r) => {
        setData(r.data);
        setLoading(false);
      })
      .catch((e) => {
        setErr("API Error: " + e.message);
        setLoading(false);
      });
  }, [currentModel]);

  const modelsList = data?.models || [];
  const targetModelData = modelsList.find(
    (m) => m.is_target || (m.brand && target && m.brand.toLowerCase() === target.toLowerCase())
  );
  const rivalModels = modelsList.filter(
    (m) => !(m.is_target || (m.brand && target && m.brand.toLowerCase() === target.toLowerCase()))
  );

  // Radar chart transformation
  const radarData = useMemo(() => {
    if (!modelsList.length) return [];
    return ASPECTS_LIST.map((asp) => {
      const row = { aspect: ASPECT_LABELS[asp] || asp };
      modelsList.forEach((m) => {
        const key = m.brand + (m.is_target ? " (Target)" : "");
        row[key] = m.aspects?.[asp]?.pos_ratio || 0;
      });
      return row;
    });
  }, [modelsList]);

  // Price & Rating bar chart data
  const comparisonBarData = useMemo(() => {
    return modelsList.map((m) => ({
      name: m.model.replace(/^(ASUS|HP|Dell|Lenovo)\s+/i, ""),
      fullName: m.model,
      brand: m.brand,
      price: m.price || 0,
      rating: m.rating || 0,
      isTarget: m.is_target,
    }));
  }, [modelsList]);

  // Derived Advantages (Objective facts based on thresholds)
  const metricAdvantageSummary = useMemo(() => {
    if (!targetModelData) return [];
    const advList = [];

    rivalModels.forEach((rival) => {
      // 1. Price check
      if (rival.price && targetModelData.price) {
        const pDiff = targetModelData.price - rival.price;
        if (pDiff >= 3000) {
          advList.push({
            type: "price",
            leader: rival.brand,
            headline: `${rival.brand} has ${formatCurrency(pDiff)} Price Advantage`,
            detail: `${rival.model} (${formatCurrency(rival.price)}) is priced lower than ${targetModelData.model} (${formatCurrency(targetModelData.price)}).`,
            metric: `-${formatCurrency(pDiff)}`,
          });
        } else if (pDiff <= -3000) {
          advList.push({
            type: "price",
            leader: targetModelData.brand,
            headline: `${targetModelData.brand} has ${formatCurrency(Math.abs(pDiff))} Price Advantage`,
            detail: `${targetModelData.model} (${formatCurrency(targetModelData.price)}) is priced lower than ${rival.model} (${formatCurrency(rival.price)}).`,
            metric: `-${formatCurrency(Math.abs(pDiff))}`,
          });
        }
      }

      // 2. Rating check
      if (rival.rating && targetModelData.rating) {
        const rDiff = Number((rival.rating - targetModelData.rating).toFixed(1));
        if (rDiff >= 0.2) {
          advList.push({
            type: "rating",
            leader: rival.brand,
            headline: `${rival.brand} has +${rDiff}★ Rating Advantage`,
            detail: `${rival.model} rated ${rival.rating}★ vs ${targetModelData.rating}★ for ${targetModelData.model}.`,
            metric: `+${rDiff}★`,
          });
        } else if (rDiff <= -0.2) {
          advList.push({
            type: "rating",
            leader: targetModelData.brand,
            headline: `${targetModelData.brand} has +${Math.abs(rDiff)}★ Rating Advantage`,
            detail: `${targetModelData.model} rated ${targetModelData.rating}★ vs ${rival.rating}★ for ${rival.model}.`,
            metric: `+${Math.abs(rDiff)}★`,
          });
        }
      }

      // 3. Aspect checks
      ASPECTS_LIST.forEach((asp) => {
        const rAsp = rival.aspects[asp];
        const tAsp = targetModelData.aspects[asp];
        if (rAsp && tAsp) {
          const posDiff = rAsp.pos_ratio - tAsp.pos_ratio;
          if (posDiff >= 15) {
            advList.push({
              type: "feature",
              leader: rival.brand,
              headline: `${rival.brand} +${Math.round(posDiff)}% Higher ${ASPECT_LABELS[asp]} Satisfaction`,
              detail: `${rival.model} has ${rAsp.pos_ratio}% positive reviews for ${asp} vs ${tAsp.pos_ratio}% for ${targetModelData.model}.`,
              metric: `+${Math.round(posDiff)}%`,
            });
          }
          const negDiff = tAsp.neg_ratio - rAsp.neg_ratio;
          if (negDiff >= 15) {
            advList.push({
              type: "complaint",
              leader: rival.brand,
              headline: `${rival.brand} has ${Math.round(negDiff)}% Fewer ${ASPECT_LABELS[asp]} Complaints`,
              detail: `Complaint rate is only ${rAsp.neg_ratio}% on ${rival.model} vs ${tAsp.neg_ratio}% on ${targetModelData.model}.`,
              metric: `-${Math.round(negDiff)}% comp`,
            });
          }
        }
      });
    });

    return advList;
  }, [targetModelData, rivalModels]);

  return (
    <div>
      {/* Page Header */}
      <div className="pbi-page-header">
        <div className="pbi-breadcrumb">MarketQuest Studio / Reports / Spec Peer Comparison</div>
        <div className="pbi-page-title-row">
          <div>
            <h1 className="pbi-page-title">Direct Spec-Matched Peer Comparison</h1>
            <p className="pbi-page-desc">
              Objective head-to-head benchmarking against direct market rivals mapped by spec tier: {data?.group || "Selected Tier"}.
            </p>
          </div>

          {/* Model Selector Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b" }}>COMPARE MODEL:</span>
            <select
              className="pbi-select"
              value={currentModel}
              onChange={(e) => {
                setCurrentModel(e.target.value);
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

      {/* Target Model Banner Scorecard */}
      {targetModelData && (
        <div className="pbi-grid-kpis">
          <KPICard
            title={`Benchmark Anchor (${target})`}
            value={targetModelData.model.replace(/^(ASUS|HP|Dell|Lenovo)\s+/i, "")}
            businessQuestion="Which laptop model is currently selected as the benchmarking reference?"
            grain="Target SKU"
            denominator={targetModelData.model}
          />
          <KPICard
            title="Target Price"
            value={formatCurrency(targetModelData.price)}
            businessQuestion="What is the catalog price of the reference target model?"
            grain="SKU Price"
            denominator="Amazon Catalog"
          />
          <KPICard
            title="Customer Star Rating"
            value={formatRating(targetModelData.rating)}
            businessQuestion="What is the customer review star rating of the reference model?"
            grain="SKU Rating"
            denominator="Verified Purchase Reviews"
          />
          <KPICard
            title="Identified Spec Peers"
            value={rivalModels.length}
            businessQuestion="How many competing OEM models share this hardware specification tier?"
            grain="Group Row"
            denominator={`${data?.group || "Spec Tier"} row`}
          />
        </div>
      )}

      {/* Visuals Row 1: Price & Rating Comparison Bars */}
      <div className="pbi-grid-2">
        <VisualContainer
          title="Price & Star Rating Benchmark in Tier"
          businessQuestion="How does the target model price and star rating compare directly to competing rivals?"
          data={comparisonBarData}
          exportFilename="spec_tier_price_rating_benchmark"
          sampleSize={`${modelsList.length} rival models`}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={comparisonBarData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis yAxisId="p" tickFormatter={(v) => `₹${v / 1000}k`} tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis yAxisId="r" orientation="right" domain={[3.5, 5.0]} tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.8rem" }}
                formatter={(val, name) => [name === "Price" ? formatCurrency(val) : formatRating(val), name]}
              />
              <Legend wrapperStyle={{ fontSize: "0.78rem" }} />
              <Bar yAxisId="p" dataKey="price" name="Price" radius={[4, 4, 0, 0]}>
                {comparisonBarData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={BRAND_COLORS[entry.brand] || BRAND_COLORS.Market}
                    stroke={entry.isTarget ? "#000" : "none"}
                    strokeWidth={entry.isTarget ? 2 : 0}
                  />
                ))}
              </Bar>
              <Bar yAxisId="r" dataKey="rating" name="Rating" fill="#0891b2" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </VisualContainer>

        {/* Feature Satisfaction Radar */}
        <VisualContainer
          title="Hardware Aspect Satisfaction Radar (Pos %)"
          businessQuestion="Which laptop leads in battery, thermal cooling, performance, and display satisfaction?"
          data={radarData}
          exportFilename="aspect_satisfaction_radar"
          sampleSize="Derived aspect mentions"
        >
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="aspect" tick={{ fill: "#475569", fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 9 }} />
              {modelsList.map((m) => {
                const key = m.brand + (m.is_target ? " (Target)" : "");
                const color = BRAND_COLORS[m.brand] || BRAND_COLORS.Market;
                return (
                  <Radar
                    key={m.model}
                    name={key}
                    dataKey={key}
                    stroke={color}
                    fill={color}
                    fillOpacity={m.is_target ? 0.35 : 0.15}
                  />
                );
              })}
              <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
              <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", fontSize: "0.78rem" }} />
            </RadarChart>
          </ResponsiveContainer>
        </VisualContainer>
      </div>

      {/* Visuals Row 2: Comprehensive Aspect Matrix + Metric-Derived Advantage Summary */}
      <div className="pbi-grid-2-1">
        <VisualContainer
          title="Hardware Aspect Satisfaction & Complaint Rate Matrix"
          businessQuestion="What are the precise satisfaction percentages across every hardware aspect?"
          data={modelsList}
          exportFilename="hardware_aspect_comparison_matrix"
          sampleSize={`${modelsList.length} models`}
        >
          <div style={{ overflowX: "auto" }}>
            <table className="pbi-table">
              <thead>
                <tr>
                  <th>MODEL (BRAND)</th>
                  <th>BATTERY</th>
                  <th>THERMALS</th>
                  <th>PERF</th>
                  <th>DISPLAY</th>
                  <th>KEYBOARD</th>
                </tr>
              </thead>
              <tbody>
                {modelsList.map((m, idx) => (
                  <tr key={idx} style={m.is_target ? { background: "#f0fdf4" } : {}}>
                    <td style={{ fontWeight: 700 }}>
                      <span
                        className="pbi-badge"
                        style={{
                          marginRight: 6,
                          backgroundColor: `${BRAND_COLORS[m.brand] || BRAND_COLORS.Market}15`,
                          color: BRAND_COLORS[m.brand] || BRAND_COLORS.Market,
                        }}
                      >
                        {m.brand}
                      </span>
                      {m.model.replace(/^(ASUS|HP|Dell|Lenovo)\s+/i, "")}
                      {m.is_target && <span style={{ marginLeft: 6, color: "#059669", fontSize: "0.7rem" }}>[TARGET]</span>}
                    </td>
                    <td>
                      {m.aspects.battery ? `+${m.aspects.battery.pos_ratio}% / -${m.aspects.battery.neg_ratio}%` : "—"}
                    </td>
                    <td>
                      {m.aspects.thermal ? `+${m.aspects.thermal.pos_ratio}% / -${m.aspects.thermal.neg_ratio}%` : "—"}
                    </td>
                    <td>
                      {m.aspects.performance ? `+${m.aspects.performance.pos_ratio}% / -${m.aspects.performance.neg_ratio}%` : "—"}
                    </td>
                    <td>
                      {m.aspects.display ? `+${m.aspects.display.pos_ratio}% / -${m.aspects.display.neg_ratio}%` : "—"}
                    </td>
                    <td>
                      {m.aspects.keyboard ? `+${m.aspects.keyboard.pos_ratio}% / -${m.aspects.keyboard.neg_ratio}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </VisualContainer>

        <VisualContainer
          title="Verifiable Metric-Derived Advantage Summary"
          businessQuestion="Which model holds a quantified statistical advantage in each domain?"
          data={metricAdvantageSummary}
          exportFilename="metric_advantage_summary"
          sampleSize={`${metricAdvantageSummary.length} signals`}
        >
          <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {metricAdvantageSummary.length === 0 ? (
              <div style={{ padding: "1.5rem", color: "#64748b", fontSize: "0.82rem", textAlign: "center" }}>
                No significant statistical advantage (&gt;15% delta) detected in this group.
              </div>
            ) : (
              metricAdvantageSummary.map((adv, i) => (
                <div
                  key={i}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid #e2e8f0",
                    background: adv.leader === target ? "#f0fdf4" : "#fef2f2",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "0.78rem",
                        color: adv.leader === target ? "#065f46" : "#991b1b",
                      }}
                    >
                      {adv.headline}
                    </span>
                    <span
                      className="pbi-badge"
                      style={{
                        backgroundColor: adv.leader === target ? "#d1fae5" : "#fee2e2",
                        color: adv.leader === target ? "#065f46" : "#991b1b",
                      }}
                    >
                      {adv.metric}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#475569" }}>{adv.detail}</div>
                </div>
              ))
            )}
          </div>
        </VisualContainer>
      </div>
    </div>
  );
}
