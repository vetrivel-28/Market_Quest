import React, { useEffect, useState, useMemo } from "react";
import { getPriceModels, getSentiment, getAspects, getModels } from "../api";
import {
  useFilters,
  BRAND_COLORS,
  SENTIMENT_COLORS,
  formatCurrency,
  formatRating,
} from "../context/FilterContext";
import VisualContainer from "../components/VisualContainer";
import KPICard from "../components/KPICard";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Legend, Cell, ScatterChart, Scatter, ZAxis,
} from "recharts";

export default function MarketOverview() {
  const {
    target,
    priceBand,
    category,
    minRating,
    searchQuery,
    setSelectedModel,
  } = useFilters();

  const [allModels, setAllModels] = useState([]);
  const [sentiment, setSentiment] = useState([]);
  const [aspects, setAspects] = useState([]);
  const [aspectsLoading, setAspectsLoading] = useState(false);
  const [brandFilter, setBrandFilter] = useState(target);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setBrandFilter(target);
  }, [target]);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      getPriceModels(),
      getSentiment(),
      getModels(),
    ])
      .then(([prRes, sentRes, modRes]) => {
        const pmList = prRes.status === "fulfilled" ? prRes.value.data.models || [] : [];
        const rawList = modRes.status === "fulfilled" ? modRes.value.data.models || [] : [];

        const countMap = {};
        rawList.forEach((m) => {
          countMap[m.laptop_name.toLowerCase()] = m.total_sentences || 100;
        });

        // Use pmList (40 canonical models) if available, or fallback to rawList
        const baseModels = pmList.length > 0 ? pmList : rawList;

        const enriched = baseModels.map((m) => ({
          ...m,
          total_sentences: countMap[m.laptop_name.toLowerCase()] || m.total_sentences || 120,
        }));

        setAllModels(enriched);
        if (sentRes.status === "fulfilled") setSentiment(sentRes.value.data.sentiment || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    let active = true;
    setAspects([]);
    setAspectsLoading(true);
    getAspects(brandFilter === "All" ? undefined : brandFilter)
      .then((r) => {
        if (active) {
          setAspects(r.data.aspects || []);
          setAspectsLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setAspects([]);
          setAspectsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [brandFilter]);

  // Filter models based on global slicers & local brand selector
  const filteredModels = useMemo(() => {
    return allModels.filter((m) => {
      if (brandFilter !== "All" && m.brand !== brandFilter) return false;
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
  }, [allModels, brandFilter, priceBand, minRating, searchQuery]);

  // Brand summary statistics
  const brandSummaries = useMemo(() => {
    const brands = ["ASUS", "HP", "Dell", "Lenovo"];
    return brands.map((b) => {
      const bModels = allModels.filter((m) => m.brand === b && m.price);
      const prices = bModels.map((m) => m.price);
      const ratings = bModels.filter((m) => m.rating).map((m) => m.rating);
      const avgP = prices.length ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length) : 0;
      const avgR = ratings.length ? Number((ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(2)) : 0;
      return {
        brand: b,
        modelCount: bModels.length,
        minPrice: prices.length ? Math.min(...prices) : 0,
        maxPrice: prices.length ? Math.max(...prices) : 0,
        avgPrice: avgP,
        avgRating: avgR,
      };
    });
  }, [allModels]);

  // Price sorted data
  const priceSortedData = useMemo(() => {
    return [...filteredModels]
      .sort((a, b) => a.price - b.price)
      .map((m) => ({
        name: m.laptop_name.replace(/^(ASUS|HP|Dell|Lenovo)\s+/i, ""),
        fullName: m.laptop_name,
        price: m.price,
        rating: m.rating,
        brand: m.brand,
      }));
  }, [filteredModels]);

  // Scatter plot data with computed Value Score
  const scatterData = useMemo(() => {
    const valid = allModels.filter((m) => m.price && m.rating);
    const avgP = valid.reduce((s, m) => s + m.price, 0) / (valid.length || 1);
    const avgR = valid.reduce((s, m) => s + m.rating, 0) / (valid.length || 1);

    return filteredModels
      .filter((m) => m.price && m.rating)
      .map((m) => {
        const valScore = ((m.rating / avgR) / (m.price / avgP)) * 100;
        return {
          name: m.laptop_name,
          brand: m.brand,
          price: m.price,
          rating: m.rating,
          reviews: m.total_sentences || 100,
          valueScore: Math.round(valScore * 10) / 10,
        };
      });
  }, [filteredModels, allModels]);

  const aspectTotalMentions = useMemo(
    () => aspects.reduce((total, aspect) => total + aspect.demand, 0),
    [aspects],
  );
  const scatterBrands = brandFilter === "All"
    ? Object.keys(BRAND_COLORS).filter((brand) => brand !== "Market")
    : [brandFilter];
  const brandsFilterOptions = ["All", "ASUS", "HP", "Dell", "Lenovo"];

  return (
    <div>
      {/* Page Header */}
      <div className="pbi-page-header">
        <div className="pbi-breadcrumb">MarketQuest Studio / Reports / Market Overview</div>
        <div className="pbi-page-title-row">
          <div>
            <h1 className="pbi-page-title">Market Overview & Industry Benchmarking</h1>
            <p className="pbi-page-desc">
              Cross-brand competitive landscape: pricing elasticity, customer star ratings, feature demand distribution, and market positioning quadrants.
            </p>
          </div>

          {/* Quick Brand Filter Tabs */}
          <div style={{ display: "flex", gap: 4 }}>
            {brandsFilterOptions.map((b) => (
              <button
                key={b}
                className={`pbi-brand-pill ${brandFilter === b ? "selected" : ""}`}
                onClick={() => setBrandFilter(b)}
                style={brandFilter === b && b !== "All" ? { backgroundColor: BRAND_COLORS[b] } : {}}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Brand Summary Cards Ribbon */}
      <div className="pbi-grid-kpis">
        {brandSummaries
          .filter((bs) => brandFilter === "All" || bs.brand === brandFilter)
          .map((bs) => (
            <div
              key={bs.brand}
              className="pbi-kpi-card"
              style={{ borderTop: `3px solid ${BRAND_COLORS[bs.brand]}` }}
            >
              <div className="pbi-kpi-top">
                <span className="pbi-kpi-title" style={{ color: BRAND_COLORS[bs.brand] }}>
                  {bs.brand} Portfolio
                </span>
                <span className="pbi-badge" style={{ background: "#f1f5f9" }}>
                  {bs.modelCount} SKUs
                </span>
              </div>
              <div className="pbi-kpi-value">{formatCurrency(bs.avgPrice)}</div>
              <div className="pbi-kpi-footer">
                <span className="pbi-kpi-delta delta-neutral">
                  Avg Rating: {bs.avgRating ? `${bs.avgRating.toFixed(2)} ★` : "—"}
                </span>
              </div>
              <div className="pbi-kpi-meta">
                Range: {formatCurrency(bs.minPrice)} – {formatCurrency(bs.maxPrice)}
              </div>
            </div>
        ))}
      </div>

      {/* Visuals Row 1: Price by Model Bar Chart */}
      <VisualContainer
        title="Laptop Model Pricing Spectrum (Ascending Order)"
        businessQuestion="How are competitor models tiered in price, and where does each model sit along the price curve?"
        data={priceSortedData}
        exportFilename="model_pricing_spectrum"
        sampleSize={`${priceSortedData.length} models`}
      >
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={priceSortedData} margin={{ top: 10, right: 20, left: 20, bottom: 40 }}>
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              interval={0}
              height={70}
              tick={{ fill: "#64748b", fontSize: 10 }}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickFormatter={(v) => `₹${v / 1000}k`}
            />
            <Tooltip
              contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.8rem" }}
              formatter={(val, name, item) => [
                `${formatCurrency(val)} (Rating: ${item.payload.rating} ★)`,
                item.payload.fullName,
              ]}
            />
            <Bar dataKey="price" radius={[4, 4, 0, 0]}>
              {priceSortedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={BRAND_COLORS[entry.brand] || BRAND_COLORS.Market}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </VisualContainer>

      {/* Visuals Row 2: Price vs Rating Scatter Positioning + Aspect Demand */}
      <div className="pbi-grid-2">
        <VisualContainer
          title="Price vs Rating Market Positioning Quadrant"
          businessQuestion="Which models occupy the 'Sweet Spot' (high rating, accessible price) versus premium luxury?"
          data={scatterData}
          exportFilename="price_vs_rating_scatter"
          sampleSize={`${scatterData.length} models`}
        >
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <XAxis
                type="number"
                dataKey="price"
                name="Price"
                tickFormatter={(v) => `₹${v / 1000}k`}
                tick={{ fill: "#64748b", fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="rating"
                name="Rating"
                domain={[3.8, 4.8]}
                tick={{ fill: "#64748b", fontSize: 11 }}
              />
              <ZAxis type="number" dataKey="reviews" range={[50, 400]} name="Review Volume" />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.78rem" }}
                formatter={(val, name) => [name === "Price" ? formatCurrency(val) : val, name]}
              />
              {scatterBrands.map((b) => (
                <Scatter
                  key={b}
                  name={b}
                  data={scatterData.filter((d) => d.brand === b)}
                  fill={BRAND_COLORS[b]}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: "0.78rem" }} />
            </ScatterChart>
          </ResponsiveContainer>
        </VisualContainer>

        <VisualContainer
          title={`'What Buyers Talk About' — Hardware Aspect Demand (${brandFilter === "All" ? "All Brands" : brandFilter})`}
          businessQuestion={`Which laptop features generate the highest conversation volume among ${brandFilter === "All" ? "all brands" : `${brandFilter} buyers`}?`}
          data={aspects}
          exportFilename={`${brandFilter.toLowerCase()}_hardware_aspect_demand`}
          sampleSize={aspectsLoading ? "Loading aspect data" : `${aspectTotalMentions.toLocaleString()} review mentions`}
        >
          <div style={{ overflowX: "auto" }}>
            <table className="pbi-table">
              <thead>
                <tr>
                  <th>ASPECT</th>
                  <th>MENTIONS</th>
                  <th>SATISFACTION %</th>
                  <th>COMPLAINT %</th>
                  <th>SHARE OF VOICE</th>
                </tr>
              </thead>
              <tbody>
                {aspectsLoading ? (
                  <tr><td colSpan={5}>Loading {brandFilter === "All" ? "all-brand" : brandFilter} aspect data...</td></tr>
                ) : aspects.length === 0 ? (
                  <tr><td colSpan={5}>No aspect data available for {brandFilter === "All" ? "all brands" : brandFilter}.</td></tr>
                ) : aspects.slice(0, 8).map((asp, i) => {
                  const sat = Number(asp.positive_pct ?? (asp.demand ? (asp.strength / asp.demand) * 100 : 0));
                  const comp = Number(asp.negative_pct ?? (asp.demand ? (asp.weakness / asp.demand) * 100 : 0));
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 700 }}>{asp.aspect}</td>
                      <td>{asp.demand.toLocaleString()}</td>
                      <td>
                        <span style={{ color: "#059669", fontWeight: 700 }}>+{sat.toFixed(1)}%</span>
                      </td>
                      <td>
                        <span style={{ color: comp > 20 ? "#dc2626" : "#64748b", fontWeight: 700 }}>
                          -{comp.toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ flex: 1, height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${asp.demand_pct}%`, background: "#4338ca", height: "100%" }} />
                          </div>
                          <span style={{ fontSize: "0.72rem", color: "#64748b", minWidth: 35 }}>
                            {asp.demand_pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </VisualContainer>
      </div>
    </div>
  );
}
