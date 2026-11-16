import React, { useEffect, useState, useMemo } from "react";
import { getModelAspects, getCompetitorAdvantages, getOpportunities } from "../api";
import { useFilters, BRAND_COLORS, formatPercent } from "../context/FilterContext";
import VisualContainer from "../components/VisualContainer";
import KPICard from "../components/KPICard";

export default function StrengthsWeaknesses() {
  const { target } = useFilters();

  const [aspects, setAspects] = useState([]);
  const [advantages, setAdvantages] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failedSections, setFailedSections] = useState([]);
  const [error, setError] = useState("");

  // User-inspectable thresholds (Phase 5 requirement)
  const [strengthThreshold, setStrengthThreshold] = useState(45);
  const [weaknessThreshold, setWeaknessThreshold] = useState(15);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setFailedSections([]);
    setAspects([]);
    setAdvantages([]);
    setOpportunities([]);

    Promise.allSettled([
      getModelAspects(target),
      getCompetitorAdvantages(target),
      getOpportunities(),
    ])
      .then(([aspResult, advResult, oppResult]) => {
        if (!active) return;

        const failures = [];
        const applyResult = (result, setter, section, field) => {
          if (
            result.status === "fulfilled" &&
            Array.isArray(result.value.data?.[field])
          ) {
            setter(result.value.data[field]);
          } else {
            setter([]);
            failures.push(section);
          }
        };

        applyResult(aspResult, setAspects, "aspect sentiment", "model_aspects");
        applyResult(advResult, setAdvantages, "competitor threats", "advantages");
        applyResult(oppResult, setOpportunities, "opportunities", "opportunities");

        setFailedSections(failures);
        if (failures.length) {
          setError(`Could not load ${failures.join(", ")}. Affected counts are unavailable.`);
        }
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [target]);

  const metricValue = (section, value) =>
    loading ? "…" : failedSections.includes(section) ? "—" : value;
  const metricDelta = (section, value) =>
    loading || failedSections.includes(section) ? null : value;

  // Aggregate aspect metrics for target brand
  const aggregatedAspects = useMemo(() => {
    const agg = {};
    aspects.forEach((a) => {
      if (!agg[a.aspect]) {
        agg[a.aspect] = { aspect: a.aspect, demand: 0, strength: 0, weakness: 0 };
      }
      agg[a.aspect].demand += a.demand;
      agg[a.aspect].strength += a.strength;
      agg[a.aspect].weakness += a.weakness;
    });

    return Object.values(agg).map((c) => ({
      aspect: c.aspect,
      demand: c.demand,
      strength: c.strength,
      weakness: c.weakness,
      pos_ratio: c.demand ? Number(((c.strength / c.demand) * 100).toFixed(1)) : 0,
      neg_ratio: c.demand ? Number(((c.weakness / c.demand) * 100).toFixed(1)) : 0,
    }));
  }, [aspects]);

  // Quadrant 1: Strengths
  const strengthsList = useMemo(() => {
    return aggregatedAspects
      .filter((a) => a.pos_ratio >= strengthThreshold)
      .sort((a, b) => b.pos_ratio - a.pos_ratio);
  }, [aggregatedAspects, strengthThreshold]);

  // Quadrant 2: Weaknesses
  const weaknessesList = useMemo(() => {
    return aggregatedAspects
      .filter((a) => a.neg_ratio >= weaknessThreshold)
      .sort((a, b) => b.neg_ratio - a.neg_ratio);
  }, [aggregatedAspects, weaknessThreshold]);

  // Quadrant 3: Opportunities
  const opportunitiesList = useMemo(() => {
    return opportunities.slice(0, 5);
  }, [opportunities]);

  // Quadrant 4: Threats
  const threatsList = useMemo(() => {
    return advantages.filter((a) => a.severity === "High").slice(0, 5);
  }, [advantages]);

  return (
    <div>
      {/* Page Header */}
      <div className="pbi-page-header">
        <div className="pbi-breadcrumb">MarketQuest Studio / Reports / Strategic SWOT Matrix</div>
        <div className="pbi-page-title-row">
          <div>
            <h1 className="pbi-page-title">{target} Strategic SWOT Analysis Matrix</h1>
            <p className="pbi-page-desc">
              Data-grounded Strengths, Weaknesses, Market Opportunities, and Competitive Threats derived from customer sentiment and benchmarked pricing.
            </p>
          </div>

          {/* User-Inspectable Threshold Sliders */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "6px 12px",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
              <span style={{ fontWeight: 700, color: "#059669" }}>Strength Rule:</span> Pos % ≥
              <strong style={{ marginLeft: 4 }}>{strengthThreshold}%</strong>
              <input
                type="range"
                min="30"
                max="70"
                step="5"
                value={strengthThreshold}
                onChange={(e) => setStrengthThreshold(Number(e.target.value))}
                style={{ marginLeft: 6, verticalAlign: "middle" }}
              />
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
              <span style={{ fontWeight: 700, color: "#dc2626" }}>Weakness Rule:</span> Neg % ≥
              <strong style={{ marginLeft: 4 }}>{weaknessThreshold}%</strong>
              <input
                type="range"
                min="10"
                max="30"
                step="2"
                value={weaknessThreshold}
                onChange={(e) => setWeaknessThreshold(Number(e.target.value))}
                style={{ marginLeft: 6, verticalAlign: "middle" }}
              />
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div role="status" style={{ marginBottom: 12, color: "#475569" }}>
          Loading SWOT analysis…
        </div>
      )}
      {!loading && error && (
        <div
          role="alert"
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            border: "1px solid #fecaca",
            borderRadius: 6,
            background: "#fef2f2",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      )}

      {/* KPI Ribbon */}
      <div className="pbi-grid-kpis">
        <KPICard
          title="Verified Strengths"
          value={metricValue("aspect sentiment", strengthsList.length)}
          businessQuestion="How many hardware aspects satisfy the user-defined strength threshold?"
          grain="Aspect Score"
          denominator={`Pos % ≥ ${strengthThreshold}%`}
          delta={metricDelta("aspect sentiment", strengthsList.length)}
          deltaLabel="aspects"
          isPositiveGood={true}
        />
        <KPICard
          title="Critical Vulnerabilities"
          value={metricValue("aspect sentiment", weaknessesList.length)}
          businessQuestion="How many hardware aspects exceed the critical complaint threshold?"
          grain="Aspect Score"
          denominator={`Neg % ≥ ${weaknessThreshold}%`}
          delta={metricDelta("aspect sentiment", weaknessesList.length)}
          deltaLabel="aspects"
          isPositiveGood={false}
        />
        <KPICard
          title="High-Demand Opportunities"
          value={metricValue("opportunities", opportunitiesList.length)}
          businessQuestion="How many market opportunity avenues exhibit surging customer discussion volume?"
          grain="Category Trend"
          denominator="Reddit + Amazon Discourse"
          delta={metricDelta("opportunities", opportunitiesList.length)}
          deltaLabel="avenues"
        />
        <KPICard
          title="High-Severity Threats"
          value={metricValue("competitor threats", threatsList.length)}
          businessQuestion="How many rival advantages pose urgent commercial displacement threat?"
          grain="Rival Signal"
          denominator="Severe Delta > 30%"
          delta={metricDelta("competitor threats", threatsList.length)}
          deltaLabel="threats"
          isPositiveGood={false}
        />
      </div>

      {/* SWOT Quadrant Matrix (Strict 2x2 Grid) */}
      <div className="pbi-grid-2">
        {/* Quadrant 1: STRENGTHS */}
        <VisualContainer
          title={`[S] Strengths — Verified Customer Praise (${metricValue("aspect sentiment", strengthsList.length)})`}
          businessQuestion={`Which hardware aspects achieve ≥${strengthThreshold}% customer positive sentiment?`}
          data={strengthsList}
          exportFilename="swot_strengths"
          sampleSize={`${metricValue("aspect sentiment", strengthsList.length)} aspects`}
          style={{ borderTop: "4px solid #059669" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 340, overflowY: "auto" }}>
            {loading ? (
              <div style={{ color: "#64748b", fontSize: "0.8rem" }}>Loading aspect sentiment…</div>
            ) : failedSections.includes("aspect sentiment") ? (
              <div style={{ color: "#991b1b", fontSize: "0.8rem" }}>Aspect sentiment is unavailable because its request failed.</div>
            ) : aspects.length === 0 ? (
              <div style={{ color: "#64748b", fontSize: "0.8rem", textAlign: "center", padding: "1.5rem" }}>
                No aspect data is available for {target}.
              </div>
            ) : strengthsList.length === 0 ? (
              <div style={{ color: "#64748b", fontSize: "0.8rem", textAlign: "center", padding: "1.5rem" }}>
                No aspects meet the current ≥{strengthThreshold}% threshold.
              </div>
            ) : (
              strengthsList.map((s, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 6,
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#065f46" }}>
                      {s.aspect.toUpperCase()}
                    </span>
                    <span className="pbi-badge pbi-badge-green">+{s.pos_ratio}% POSITIVE</span>
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "#166534" }}>
                    Backed by <strong>{s.strength.toLocaleString()}</strong> verified positive review sentences across {s.demand.toLocaleString()} total mentions.
                  </div>
                </div>
              ))
            )}
          </div>
        </VisualContainer>

        {/* Quadrant 2: WEAKNESSES */}
        <VisualContainer
          title={`[W] Weaknesses — Customer Complaint Drivers (${metricValue("aspect sentiment", weaknessesList.length)})`}
          businessQuestion={`Which hardware aspects exceed the ≥${weaknessThreshold}% negative complaint threshold?`}
          data={weaknessesList}
          exportFilename="swot_weaknesses"
          sampleSize={`${metricValue("aspect sentiment", weaknessesList.length)} aspects`}
          style={{ borderTop: "4px solid #dc2626" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 340, overflowY: "auto" }}>
            {loading ? (
              <div style={{ color: "#64748b", fontSize: "0.8rem" }}>Loading aspect sentiment…</div>
            ) : failedSections.includes("aspect sentiment") ? (
              <div style={{ color: "#991b1b", fontSize: "0.8rem" }}>Aspect sentiment is unavailable because its request failed.</div>
            ) : aspects.length === 0 ? (
              <div style={{ color: "#64748b", fontSize: "0.8rem", textAlign: "center", padding: "1.5rem" }}>
                No aspect data is available for {target}.
              </div>
            ) : weaknessesList.length === 0 ? (
              <div style={{ color: "#64748b", fontSize: "0.8rem", textAlign: "center", padding: "1.5rem" }}>
                No aspects exceed the current ≥{weaknessThreshold}% complaint threshold.
              </div>
            ) : (
              weaknessesList.map((w, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 6,
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#991b1b" }}>
                      {w.aspect.toUpperCase()}
                    </span>
                    <span className="pbi-badge pbi-badge-high">-{w.neg_ratio}% COMPLAINTS</span>
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "#7f1d1d" }}>
                    Cited in <strong>{w.weakness.toLocaleString()}</strong> critical sentences. Primary complaint driver in {target} portfolio.
                  </div>
                </div>
              ))
            )}
          </div>
        </VisualContainer>

        {/* Quadrant 3: OPPORTUNITIES */}
        <VisualContainer
          title="[O] Market Opportunities — Surging Customer Demand"
          businessQuestion="Where does market discourse indicate unmet customer appetite or upgrade readiness?"
          data={opportunitiesList}
          exportFilename="swot_opportunities"
          sampleSize="Top demand categories"
          style={{ borderTop: "4px solid #0891b2" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 340, overflowY: "auto" }}>
            {loading ? (
              <div style={{ color: "#64748b", fontSize: "0.8rem" }}>Loading opportunities…</div>
            ) : failedSections.includes("opportunities") ? (
              <div style={{ color: "#991b1b", fontSize: "0.8rem" }}>Opportunity data is unavailable because its request failed.</div>
            ) : opportunitiesList.length === 0 ? (
              <div style={{ color: "#64748b", fontSize: "0.8rem", textAlign: "center", padding: "1.5rem" }}>
                No opportunity data was returned.
              </div>
            ) : opportunitiesList.map((opp, idx) => (
              <div
                key={idx}
                style={{
                  padding: "10px 12px",
                  borderRadius: 6,
                  background: "#ecfeff",
                  border: "1px solid #a5f3fc",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0e7490" }}>
                    {opp.opportunity.toUpperCase()} EXPANSION
                  </span>
                  <span className="pbi-badge" style={{ background: "#cffafe", color: "#155e75" }}>
                    {opp.mentions.toLocaleString()} MENTIONS
                  </span>
                </div>
                <div style={{ fontSize: "0.74rem", color: "#164e63" }}>
                  Represents <strong>{opp.percentage}%</strong> of all aspect discussions. Strong consumer willingness to pay for premium configurations.
                </div>
              </div>
            ))}
          </div>
        </VisualContainer>

        {/* Quadrant 4: THREATS */}
        <VisualContainer
          title={`[T] Competitive Threats — High-Severity Rival Leads (${metricValue("competitor threats", threatsList.length)})`}
          businessQuestion="Which competing models exert immediate commercial pressure via pricing or ratings?"
          data={threatsList}
          exportFilename="swot_threats"
          sampleSize={`${metricValue("competitor threats", threatsList.length)} high threats`}
          style={{ borderTop: "4px solid #d97706" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 340, overflowY: "auto" }}>
            {loading ? (
              <div style={{ color: "#64748b", fontSize: "0.8rem" }}>Loading competitor threats…</div>
            ) : failedSections.includes("competitor threats") ? (
              <div style={{ color: "#991b1b", fontSize: "0.8rem" }}>Competitor threat data is unavailable because its request failed.</div>
            ) : threatsList.length === 0 ? (
              <div style={{ color: "#64748b", fontSize: "0.8rem", textAlign: "center", padding: "1.5rem" }}>
                No high-severity threats were returned.
              </div>
            ) : threatsList.map((th, idx) => (
              <div
                key={idx}
                style={{
                  padding: "10px 12px",
                  borderRadius: 6,
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#92400e" }}>
                    {th.competitor} {th.advantage} LEAD
                  </span>
                  <span className="pbi-badge pbi-badge-medium">{th.metric}</span>
                </div>
                <div style={{ fontSize: "0.74rem", color: "#78350f" }}>
                  <strong>{th.competitor_model}</strong> leads over <strong>{th.target_model}</strong>.
                  <div style={{ marginTop: 2, color: "#92400e" }}>{th.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </VisualContainer>
      </div>
    </div>
  );
}
