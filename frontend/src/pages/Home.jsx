import React, { useEffect, useState, useMemo } from "react";
import { getKPIs, getSummary, getSentiment, getPriceModels } from "../api";
import { useFilters, BRAND_COLORS, SENTIMENT_COLORS, formatCurrency, formatRating } from "../context/FilterContext";
import KPICard from "../components/KPICard";
import VisualContainer from "../components/VisualContainer";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Legend, Cell,
} from "recharts";

export default function Home() {
  const { target, priceBand, category, minRating, searchQuery, setSelectedModel } = useFilters();

  const [kpis, setKpis] = useState(null);
  const [summary, setSummary] = useState(null);
  const [sentiment, setSentiment] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getKPIs(target),
      getSummary(target),
      getSentiment(),
      getPriceModels(),
    ])
      .then(([kpiRes, sumRes, sentRes, modRes]) => {
        setKpis(kpiRes.data);
        setSummary(sumRes.data);
        setSentiment(sentRes.data.sentiment || []);
        setModels(modRes.data.models || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [target]);

  // Filter models based on global slicers
  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      if (priceBand !== "All") {
        if (priceBand === "Budget (< ₹50k)" && m.price >= 50000) return false;
        if (priceBand === "Mid-Range (₹50k-₹80k)" && (m.price < 50000 || m.price >= 80000)) return false;
        if (priceBand === "Upper-Mid (₹80k-₹1.2L)" && (m.price < 80000 || m.price >= 120000)) return false;
        if (priceBand === "Premium (> ₹1.2L)" && m.price < 120000) return false;
      }
      if (minRating > 0 && m.rating < minRating) return false;
      if (searchQuery.trim() && !m.laptop_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [models, priceBand, minRating, searchQuery]);

  // Top Value Score Models
  const topValueModels = useMemo(() => {
    const valid = filteredModels.filter((m) => m.price && m.rating);
    const avgP = valid.reduce((s, m) => s + m.price, 0) / (valid.length || 1);
    const avgR = valid.reduce((s, m) => s + m.rating, 0) / (valid.length || 1);

    return valid
      .map((m) => {
        const valScore = ((m.rating / avgR) / (m.price / avgP)) * 100;
        return {
          ...m,
          valueScore: Math.round(valScore * 10) / 10,
        };
      })
      .sort((a, b) => b.valueScore - a.valueScore)
      .slice(0, 8);
  }, [filteredModels]);

  // Brand Comparison dataset
  const brandComparisonData = useMemo(() => {
    const brandsList = Object.keys(BRAND_COLORS).filter((b) => b !== "Market");
    return brandsList.map((b) => {
      const bModels = models.filter((m) => m.brand === b && m.price);
      const avgP = bModels.length ? Math.round(bModels.reduce((s, m) => s + m.price, 0) / bModels.length) : 0;
      const bRatings = bModels.filter((m) => m.rating);
      const avgR = bRatings.length ? Number((bRatings.reduce((s, m) => s + m.rating, 0) / bRatings.length).toFixed(2)) : 0;
      return {
        brand: b,
        avgPrice: avgP,
        avgRating: avgR,
        modelsCount: bModels.length,
      };
    });
  }, [models]);

  if (loading && !kpis) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
        <div style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 8 }}>MarketQuest Executive Engine</div>
        <div>Aggregating multi-source review dimensions & computing Power BI measures...</div>
      </div>
    );
  }

  const market = kpis?.market || {};
  const tInfo = kpis?.target || {};

  return (
    <div>
      {/* Page Header */}
      <div className="pbi-page-header">
        <div className="pbi-breadcrumb">MarketQuest Studio / Reports / Executive Overview</div>
        <div className="pbi-page-title-row">
          <div>
            <h1 className="pbi-page-title">Executive Overview & Market Positioning</h1>
            <p className="pbi-page-desc">
              Strategic KPI scorecard, price positioning, customer sentiment distribution, and high-value catalog opportunities for {target}.
            </p>
          </div>
        </div>
      </div>

      {/* Decision-Grade Executive Narrative Strip */}
      <div className="pbi-narrative-strip">
        <div style={{ fontSize: "1.3rem" }}>📋</div>
        <div>
          <div className="pbi-narrative-title">EXECUTIVE INTELLIGENCE BRIEF</div>
          <div className="pbi-narrative-body">
            <strong>{target}</strong> captures <strong>{market.sov?.[target] || 41.0}%</strong> of total market review attention (Share of Voice).
            Average catalog pricing sits at <strong>{formatCurrency(tInfo.avg_price)}</strong> (
            {tInfo.delta_price_vs_market < 0 ? `${formatCurrency(Math.abs(tInfo.delta_price_vs_market))} below` : `${formatCurrency(tInfo.delta_price_vs_market)} above`} market mean of {formatCurrency(market.avg_price)}).
            Customer positive sentiment is <strong>{tInfo.positive_pct}%</strong> ({tInfo.delta_pos_vs_market >= 0 ? `+${tInfo.delta_pos_vs_market}%` : `${tInfo.delta_pos_vs_market}%`} vs market benchmark of {market.positive_pct}%).
          </div>
        </div>
      </div>

      {/* Power BI KPI Scorecard */}
      <div className="pbi-grid-kpis">
        <KPICard
          title="Monitored Brands"
          value={market.total_brands || 4}
          businessQuestion="How many OEM brands are tracked in the intelligence repository?"
          grain="Market"
          denominator="Distinct OEM brands"
          delta={0}
          deltaLabel="OEMs"
        />
        <KPICard
          title="Active Model Lines"
          value={filteredModels.length}
          businessQuestion="How many distinct laptop model lines match active slicers?"
          grain="Model SKU"
          denominator={`Filtered of ${market.total_models || 66} total`}
          delta={filteredModels.length}
          deltaLabel="active"
        />
        <KPICard
          title="Reviews Ingested"
          value={(market.total_sentences || 31654).toLocaleString()}
          businessQuestion="What volume of customer sentiment sentences are verified?"
          grain="Review Sentence"
          denominator="Amazon + Reddit Vader corpus"
          delta={tInfo.sentence_count}
          deltaLabel={`in ${target}`}
        />
        <KPICard
          title={`${target} Avg Price`}
          value={formatCurrency(tInfo.avg_price)}
          businessQuestion="What is the target brand average catalog price vs market mean?"
          grain="Brand Catalog"
          denominator="Amazon Verified Listings"
          delta={formatCurrency(tInfo.delta_price_vs_market)}
          deltaLabel="vs Market Mean"
          isPositiveGood={false}
        />
        <KPICard
          title={`${target} Positive %`}
          value={`${tInfo.positive_pct}%`}
          businessQuestion="What percentage of target brand reviews express positive sentiment?"
          grain="Review Sentence"
          denominator={`${(tInfo.sentence_count || 0).toLocaleString()} ${target} sentences`}
          delta={tInfo.delta_pos_vs_market}
          deltaLabel="% pts vs Market"
          isPositiveGood={true}
        />
        <KPICard
          title={`${target} Share of Voice`}
          value={`${market.sov?.[target] || 41.0}%`}
          businessQuestion="What portion of overall customer discussions does the target command?"
          grain="Market Volume"
          denominator="31,654 total sentences"
          delta={market.sov?.[target]}
          deltaLabel="SOV %"
          isPositiveGood={true}
        />
      </div>

      {/* Visuals Row 1: Brand Pricing vs Rating Comparison + Stacked Sentiment */}
      <div className="pbi-grid-2">
        <VisualContainer
          title="Brand Catalog Price vs Rating Benchmark"
          businessQuestion="Which brand offers the lowest average entry price and highest customer rating?"
          data={brandComparisonData}
          exportFilename="brand_comparison_benchmark"
          sampleSize={`${models.length} models`}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={brandComparisonData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="brand" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis yAxisId="price" orientation="left" tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => `₹${v/1000}k`} />
              <YAxis yAxisId="rating" orientation="right" domain={[3.5, 5.0]} tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.8rem" }}
                formatter={(val, name) => [name === "Average Price" ? formatCurrency(val) : formatRating(val), name]}
              />
              <Legend wrapperStyle={{ fontSize: "0.78rem" }} />
              <Bar yAxisId="price" dataKey="avgPrice" name="Average Price" fill="#4338ca" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="rating" dataKey="avgRating" name="Average Rating" fill="#0891b2" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </VisualContainer>

        <VisualContainer
          title="Market-Wide Customer Sentiment Mix (100% Stacked)"
          businessQuestion="How does the customer sentiment breakdown compare across competing OEMs?"
          data={sentiment}
          exportFilename="brand_sentiment_distribution"
          sampleSize="31,654 reviews"
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={sentiment} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="Brand" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} unit="%" domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.8rem" }}
                formatter={(val) => [`${val}%`, ""]}
              />
              <Legend wrapperStyle={{ fontSize: "0.78rem" }} />
              <Bar dataKey="Positive" stackId="a" fill={SENTIMENT_COLORS.Positive} name="Positive %" />
              <Bar dataKey="Neutral"  stackId="a" fill={SENTIMENT_COLORS.Neutral}  name="Neutral %" />
              <Bar dataKey="Negative" stackId="a" fill={SENTIMENT_COLORS.Negative} name="Negative %" />
            </BarChart>
          </ResponsiveContainer>
        </VisualContainer>
      </div>

      {/* Visuals Row 2: Top Value Score Models + Emerging Opportunities */}
      <div className="pbi-grid-2-1">
        <VisualContainer
          title="Top Value Score Laptop Models (Rating vs Price Index)"
          businessQuestion="Which laptop models deliver the highest customer star rating per rupee spent?"
          data={topValueModels}
          exportFilename="top_value_score_models"
          sampleSize={`${topValueModels.length} models`}
        >
          <div style={{ overflowX: "auto" }}>
            <table className="pbi-table">
              <thead>
                <tr>
                  <th>MODEL NAME</th>
                  <th>BRAND</th>
                  <th>PRICE</th>
                  <th>RATING</th>
                  <th title="Value Score Formula: ((Rating / MarketAvgRating) / (Price / MarketAvgPrice)) * 100">
                    VALUE SCORE ⓘ
                  </th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {topValueModels.map((m, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{m.laptop_name}</td>
                    <td>
                      <span
                        className="pbi-badge"
                        style={{
                          backgroundColor: `${BRAND_COLORS[m.brand] || BRAND_COLORS.Market}15`,
                          color: BRAND_COLORS[m.brand] || BRAND_COLORS.Market,
                        }}
                      >
                        {m.brand}
                      </span>
                    </td>
                    <td>{formatCurrency(m.price)}</td>
                    <td>{formatRating(m.rating)}</td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: m.valueScore >= 120 ? "#059669" : m.valueScore >= 100 ? "#0891b2" : "#d97706",
                        }}
                      >
                        {m.valueScore} pts
                      </span>
                    </td>
                    <td>
                      <button
                        className="pbi-action-btn"
                        onClick={() => setSelectedModel(m.laptop_name)}
                        title="Drill-down to model"
                      >
                        Drill →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </VisualContainer>

        <VisualContainer
          title={`Top Emerging Competitor Threat Signals (${target})`}
          businessQuestion="Where do competing OEM models demonstrate measurable superiority?"
          data={summary?.advantages || []}
          exportFilename="competitor_threat_signals"
          sampleSize={`${summary?.advantages?.length || 0} signals`}
        >
          <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {!summary?.advantages?.length ? (
              <div style={{ color: "#64748b", fontSize: "0.82rem", textAlign: "center", padding: "1.5rem" }}>
                No critical competitor threats detected in current slicer view.
              </div>
            ) : (
              summary.advantages.slice(0, 5).map((adv, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid #fee2e2",
                    background: "#fef2f2",
                    fontSize: "0.78rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, color: "#991b1b" }}>
                      {adv.competitor} {adv.advantage} Adv
                    </span>
                    <span className="pbi-badge pbi-badge-high">{adv.severity}</span>
                  </div>
                  <div style={{ color: "#7f1d1d", fontSize: "0.74rem" }}>
                    {adv.competitor_model} vs {adv.target_model}
                  </div>
                  <div style={{ color: "#475569", fontSize: "0.72rem", marginTop: 2 }}>{adv.detail}</div>
                </div>
              ))
            )}
          </div>
        </VisualContainer>
      </div>
    </div>
  );
}
