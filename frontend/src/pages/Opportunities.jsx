import React, { useEffect, useState, useMemo } from "react";
import { getOpportunities, getPriceModels } from "../api";
import { useFilters } from "../context/FilterContext";
import VisualContainer from "../components/VisualContainer";
import KPICard from "../components/KPICard";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Legend, Cell,
} from "recharts";

export default function Opportunities() {
  const { target } = useFilters();

  const [opportunities, setOpportunities] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setOpportunities([]);
    setModels([]);
    Promise.allSettled([getOpportunities(target), getPriceModels(target)])
      .then(([oppRes, modelRes]) => {
        if (!active) return;
        if (oppRes.status === "fulfilled") setOpportunities(oppRes.value?.data?.opportunities || []);
        if (modelRes.status === "fulfilled") setModels(modelRes.value?.data?.models || []);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [target]);

  const totalMentions = useMemo(() => {
    return opportunities.reduce((s, o) => s + o.mentions, 0);
  }, [opportunities]);

  const ratedModels = models.filter((model) => Number.isFinite(Number(model.rating)) && Number(model.rating) > 0);
  const averageRating = ratedModels.length
    ? ratedModels.reduce((total, model) => total + Number(model.rating), 0) / ratedModels.length
    : null;

  const opportunityMatrix = useMemo(() => {
    return opportunities.map((opp, idx) => {
      const priority = opp.percentage >= 12 ? "P0 High Impact" : opp.percentage >= 8 ? "P1 Expansion" : "P2 Niche";

      return {
        id: idx + 1,
        opportunity: opp.opportunity,
        mentions: opp.mentions,
        percentage: opp.percentage,
        positive_pct: opp.positive_pct,
        negative_pct: opp.negative_pct,
        priority,
      };
    });
  }, [opportunities]);

  const p0Count = opportunityMatrix.filter((o) => o.priority.startsWith("P0")).length;

  return (
    <div>
      {/* Page Header */}
      <div className="pbi-page-header">
        <div className="pbi-breadcrumb">MarketQuest Studio / Reports / Market Opportunities</div>
        <div className="pbi-page-title-row">
          <div>
            <h1 className="pbi-page-title">Brand Demand & Sentiment Analysis</h1>
            <p className="pbi-page-desc">
              {target} demand and sentiment, aggregated from the available review-derived model-aspect records.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="pbi-grid-kpis">
        <KPICard
          title="Identified Opportunities"
          value={loading ? "…" : opportunities.length}
          businessQuestion="How many high-volume market demand avenues are tracked?"
          grain="Demand Category"
          denominator="Aspect Lexicon Analysis"
          delta={loading ? null : opportunities.length}
          deltaLabel="categories"
        />
        <KPICard
          title="Total Demand Mentions"
          value={loading ? "…" : totalMentions.toLocaleString()}
          businessQuestion={`What is the conversation volume across the tracked ${target} aspect categories?`}
          grain="Review Sentences"
          denominator={`${target} review-derived aspect mentions`}
          delta={loading ? null : totalMentions}
          deltaLabel="sentences"
        />
        <KPICard
          title="P0 High-Impact Vectors"
          value={loading ? "…" : p0Count}
          businessQuestion={`How many ${target} aspects represent ≥12% of tracked demand mentions?`}
          grain="Priority P0"
          denominator={`${target} aspect share ≥ 12%`}
          delta={loading ? null : p0Count}
          deltaLabel="vectors"
          isPositiveGood={true}
        />
        <KPICard
          title="Top Customer Desire"
          value={loading ? "…" : opportunities[0]?.opportunity || "—"}
          businessQuestion={`Which hardware aspect has the most mentions for ${target}?`}
          grain="Top Aspect"
          denominator={opportunities[0] ? `${opportunities[0].percentage}% share` : "No aspect data"}
        />
        <KPICard
          title={`${target} Average Star Rating`}
          value={loading ? "…" : averageRating == null ? "—" : `${averageRating.toFixed(2)} ★`}
          businessQuestion={`What is the mean catalog star rating across available ${target} models?`}
          grain="Catalog Model Rating"
          denominator={`${ratedModels.length} rated models`}
        />
      </div>

      {/* Visuals Row 1: Horizontal Demand Bar Chart + Priority Distribution */}
      <div className="pbi-grid-2">
        <VisualContainer
          title="Trending Customer Demand Volume (Mention Count)"
          businessQuestion={`Which hardware categories have the most mentions in ${target} reviews?`}
          data={opportunities}
          exportFilename={`${target.toLowerCase()}_market_demand_volume`}
          sampleSize={`${totalMentions.toLocaleString()} mentions`}
        >
          {loading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading {target} demand data...</div>
          ) : opportunities.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>No aspect data available for {target}.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={opportunities.slice(0, 8)}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 30, bottom: 10 }}
              >
                <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="opportunity"
                  tick={{ fill: "#334155", fontSize: 11, fontWeight: 600 }}
                  width={90}
                />
                <Tooltip
                  contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.8rem" }}
                  formatter={(val, name, item) => [
                    `${val.toLocaleString()} mentions (${item.payload.percentage}% share)`,
                    "Discussion Volume",
                  ]}
                />
                <Bar dataKey="mentions" fill="#4338ca" radius={[0, 4, 4, 0]}>
                  {opportunities.slice(0, 8).map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={idx === 0 ? "#4338ca" : idx < 3 ? "#0891b2" : "#64748b"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </VisualContainer>

        <VisualContainer
          title={`Consumer Conversation Share Distribution (${target})`}
          businessQuestion={`What percentage of tracked ${target} aspect mentions belong to each feature?`}
          data={opportunities}
          exportFilename={`${target.toLowerCase()}_conversation_share_percentage`}
          sampleSize={`${opportunities.length} aspects`}
        >
          {loading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading {target} demand data...</div>
          ) : opportunities.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>No aspect data available for {target}.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={opportunities.slice(0, 8)}
                margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
              >
                <XAxis dataKey="opportunity" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis unit="%" tick={{ fill: "#64748b", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.8rem" }}
                  formatter={(val) => [`${val}%`, "Share of Target Discourse"]}
                />
                <Bar dataKey="percentage" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </VisualContainer>
      </div>

      {/* Structured Opportunity Matrix Table */}
      <VisualContainer
        title={`${target} Demand & Sentiment Evidence`}
        businessQuestion="What do the available brand-specific review-aspect counts show?"
        data={opportunityMatrix}
        exportFilename={`${target.toLowerCase()}_demand_sentiment_evidence`}
        sampleSize={`${opportunityMatrix.length} categories`}
      >
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading {target} aspect data...</div>
        ) : opportunityMatrix.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>No aspect data available for {target}.</div>
        ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="pbi-table">
            <thead>
              <tr>
                <th>ASPECT</th>
                <th>{target.toUpperCase()} MENTIONS</th>
                <th>SHARE OF {target.toUpperCase()} ASPECT MENTIONS</th>
                <th>POSITIVE MENTIONS</th>
                <th>NEGATIVE MENTIONS</th>
                <th>PRIORITY</th>
              </tr>
            </thead>
            <tbody>
              {opportunityMatrix.map((opp) => (
                <tr key={opp.id}>
                  <td style={{ fontWeight: 700, color: "#0f172a" }}>{opp.opportunity.toUpperCase()}</td>
                  <td>{opp.mentions.toLocaleString()}</td>
                  <td>{opp.percentage}%</td>
                  <td>{opp.positive_pct}%</td>
                  <td>{opp.negative_pct}%</td>
                  <td>
                    <span
                      className="pbi-badge"
                      style={{
                        backgroundColor: opp.priority.startsWith("P0") ? "#fee2e2" : opp.priority.startsWith("P1") ? "#e0f2fe" : "#f1f5f9",
                        color: opp.priority.startsWith("P0") ? "#991b1b" : opp.priority.startsWith("P1") ? "#0369a1" : "#475569",
                      }}
                    >
                      {opp.priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </VisualContainer>
    </div>
  );
}
