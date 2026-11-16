import React, { useEffect, useState, useMemo } from "react";
import { getCompetitorAdvantages } from "../api";
import {
  useFilters,
  BRAND_COLORS,
} from "../context/FilterContext";
import VisualContainer from "../components/VisualContainer";
import KPICard from "../components/KPICard";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Legend, Cell,
} from "recharts";

const SEVERITY_COLORS = {
  High: { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
  Medium: { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  Low: { bg: "#d1fae5", text: "#065f46", border: "#6ee7b7" },
};

const ADV_TYPE_COLORS = {
  price: "#2563eb",
  rating: "#0891b2",
  feature: "#059669",
  complaint: "#dc2626",
};

export default function CompetitorAdvantages() {
  const { target } = useFilters();

  const [allAdvantages, setAllAdvantages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fCompetitor, setFCompetitor] = useState("All");
  const [fSeverity, setFSeverity] = useState("All");
  const [fType, setFType] = useState("All");

  useEffect(() => {
    setLoading(true);
    getCompetitorAdvantages(target)
      .then((r) => {
        setAllAdvantages(r.data.advantages || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [target]);

  const competitorsList = useMemo(() => {
    const list = Array.from(
      new Set(
        allAdvantages
          .map((a) => a.competitor)
          .filter((c) => c && (!target || c.toLowerCase() !== target.toLowerCase()))
      )
    );
    return ["All", ...list];
  }, [allAdvantages, target]);

  const filteredAdvantages = useMemo(() => {
    return allAdvantages.filter((adv) => {
      if (adv.competitor && target && adv.competitor.toLowerCase() === target.toLowerCase()) return false;
      if (fCompetitor !== "All" && adv.competitor !== fCompetitor) return false;
      if (fSeverity !== "All" && adv.severity !== fSeverity) return false;
      if (fType !== "All" && adv.adv_type !== fType) return false;
      return true;
    });
  }, [allAdvantages, target, fCompetitor, fSeverity, fType]);

  // Aggregate count by competitor
  const competitorBarData = useMemo(() => {
    const counts = {};
    allAdvantages.forEach((adv) => {
      if (adv.competitor && target && adv.competitor.toLowerCase() === target.toLowerCase()) return;
      if (!counts[adv.competitor]) {
        counts[adv.competitor] = { competitor: adv.competitor, High: 0, Medium: 0, Low: 0, total: 0 };
      }
      counts[adv.competitor][adv.severity] = (counts[adv.competitor][adv.severity] || 0) + 1;
      counts[adv.competitor].total += 1;
    });
    return Object.values(counts);
  }, [allAdvantages, target]);

  // Type breakdown
  const typeCounts = useMemo(() => {
    const counts = { price: 0, rating: 0, feature: 0, complaint: 0 };
    filteredAdvantages.forEach((adv) => {
      if (counts[adv.adv_type] !== undefined) counts[adv.adv_type]++;
    });
    return counts;
  }, [filteredAdvantages]);

  const highSeverityCount = filteredAdvantages.filter((a) => a.severity === "High").length;
  const mediumSeverityCount = filteredAdvantages.filter((a) => a.severity === "Medium").length;

  return (
    <div>
      {/* Page Header */}
      <div className="pbi-page-header">
        <div className="pbi-breadcrumb">MarketQuest Studio / Reports / Competitor Advantages</div>
        <div className="pbi-page-title-row">
          <div>
            <h1 className="pbi-page-title">Competitor Advantage Matrix & Threat Heatmap</h1>
            <p className="pbi-page-desc">
              Systematic inventory of pricing gaps, star rating leads, feature superiority, and lower complaint rates held by rivals over {target}.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="pbi-grid-kpis">
        <KPICard
          title="Total Advantage Signals"
          value={filteredAdvantages.length}
          businessQuestion="How many verified statistical advantages are held by rivals over target?"
          grain="Signal Pair"
          denominator="Matched Model Pairs"
          delta={filteredAdvantages.length}
          deltaLabel="active"
        />
        <KPICard
          title="High Severity Threats"
          value={highSeverityCount}
          businessQuestion="How many advantages involve critical pricing (&gt;₹10k) or feature (&gt;30%) leads?"
          grain="Severity High"
          denominator="Priority Action Needed"
          delta={highSeverityCount}
          deltaLabel="urgent"
          isPositiveGood={false}
        />
        <KPICard
          title="Price Advantage Gaps"
          value={typeCounts.price}
          businessQuestion="How many competing models undercut target spec peers by ₹3,000 or more?"
          grain="Price Delta"
          denominator="Direct Spec Peers"
          delta={typeCounts.price}
          deltaLabel="skus"
          isPositiveGood={false}
        />
        <KPICard
          title="Feature Superiority Leads"
          value={typeCounts.feature}
          businessQuestion="How many hardware aspects show &gt;15% higher customer satisfaction for rivals?"
          grain="Aspect Satisfaction"
          denominator="Customer Review Sentences"
          delta={typeCounts.feature}
          deltaLabel="aspects"
          isPositiveGood={false}
        />
        <KPICard
          title="Lower Complaint Leads"
          value={typeCounts.complaint}
          businessQuestion="In how many cases do rivals enjoy &gt;15% lower complaint frequencies?"
          grain="Complaint Frequency"
          denominator="Negative Sentiment Mentions"
          delta={typeCounts.complaint}
          deltaLabel="aspects"
          isPositiveGood={false}
        />
      </div>

      {/* Slicer Ribbon for Advantage Filtering */}
      <div
        style={{
          display: "flex",
          gap: 12,
          padding: "10px 14px",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          marginBottom: "1.25rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#64748b" }}>RIVAL:</span>
          <select className="pbi-select" value={fCompetitor} onChange={(e) => setFCompetitor(e.target.value)}>
            {competitorsList.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#64748b" }}>SEVERITY:</span>
          <select className="pbi-select" value={fSeverity} onChange={(e) => setFSeverity(e.target.value)}>
            {["All", "High", "Medium", "Low"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#64748b" }}>TYPE:</span>
          <select className="pbi-select" value={fType} onChange={(e) => setFType(e.target.value)}>
            {["All", "price", "rating", "feature", "complaint"].map((t) => (
              <option key={t} value={t}>{t.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {(fCompetitor !== "All" || fSeverity !== "All" || fType !== "All") && (
          <button
            className="pbi-action-btn"
            onClick={() => { setFCompetitor("All"); setFSeverity("All"); setFType("All"); }}
            style={{ marginLeft: "auto", color: "#dc2626" }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Visuals: Rival Advantage Distribution Bar + Matrix Table */}
      <div className="pbi-grid-2">
        <VisualContainer
          title="Competitor Advantages by Rival OEM & Severity"
          businessQuestion="Which competing brand holds the highest concentration of high-severity advantages?"
          data={competitorBarData}
          exportFilename="competitor_advantages_by_oem"
          sampleSize={`${allAdvantages.length} total signals`}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={competitorBarData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <XAxis dataKey="competitor" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.8rem" }} />
              <Legend wrapperStyle={{ fontSize: "0.78rem" }} />
              <Bar dataKey="High" stackId="a" fill="#dc2626" name="High Severity" />
              <Bar dataKey="Medium" stackId="a" fill="#d97706" name="Medium Severity" />
              <Bar dataKey="Low" stackId="a" fill="#059669" name="Low Severity" />
            </BarChart>
          </ResponsiveContainer>
        </VisualContainer>

        <VisualContainer
          title={`Advantage Breakdown by Category (${filteredAdvantages.length} Verified)`}
          businessQuestion="What proportion of rival leads stem from pricing vs feature sentiment vs complaints?"
          data={[
            { type: "Price Under-cut", count: typeCounts.price, fill: ADV_TYPE_COLORS.price },
            { type: "Star Rating Lead", count: typeCounts.rating, fill: ADV_TYPE_COLORS.rating },
            { type: "Feature Sentiment", count: typeCounts.feature, fill: ADV_TYPE_COLORS.feature },
            { type: "Lower Complaint", count: typeCounts.complaint, fill: ADV_TYPE_COLORS.complaint },
          ]}
          exportFilename="advantage_category_breakdown"
          sampleSize="Filtered advantages"
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={[
                { type: "Price", count: typeCounts.price, fill: ADV_TYPE_COLORS.price },
                { type: "Rating", count: typeCounts.rating, fill: ADV_TYPE_COLORS.rating },
                { type: "Feature", count: typeCounts.feature, fill: ADV_TYPE_COLORS.feature },
                { type: "Complaint", count: typeCounts.complaint, fill: ADV_TYPE_COLORS.complaint },
              ]}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 30, bottom: 10 }}
            >
              <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis type="category" dataKey="type" tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", fontSize: "0.8rem" }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                <Cell fill={ADV_TYPE_COLORS.price} />
                <Cell fill={ADV_TYPE_COLORS.rating} />
                <Cell fill={ADV_TYPE_COLORS.feature} />
                <Cell fill={ADV_TYPE_COLORS.complaint} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </VisualContainer>
      </div>

      {/* Granular Traceable Table */}
      <VisualContainer
        title="Traceable Competitor Advantage Matrix"
        businessQuestion="What is the exact supporting metric and rival model for each advantage?"
        data={filteredAdvantages}
        exportFilename="traceable_competitor_advantages"
        sampleSize={`${filteredAdvantages.length} records`}
      >
        <div style={{ overflowX: "auto" }}>
          <table className="pbi-table">
            <thead>
              <tr>
                <th>RIVAL BRAND</th>
                <th>RIVAL MODEL</th>
                <th>TARGET MODEL</th>
                <th>ADVANTAGE DOMAIN</th>
                <th>METRIC DELTA</th>
                <th>SEVERITY</th>
                <th>EVIDENCE DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdvantages.map((adv, idx) => (
                <tr key={idx}>
                  <td>
                    <span
                      className="pbi-badge"
                      style={{
                        backgroundColor: `${BRAND_COLORS[adv.competitor] || BRAND_COLORS.Market}15`,
                        color: BRAND_COLORS[adv.competitor] || BRAND_COLORS.Market,
                      }}
                    >
                      {adv.competitor}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{adv.competitor_model}</td>
                  <td>{adv.target_model}</td>
                  <td style={{ fontWeight: 600 }}>{adv.advantage}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: "#991b1b" }}>{adv.metric}</span>
                  </td>
                  <td>
                    <span
                      className="pbi-badge"
                      style={{
                        backgroundColor: SEVERITY_COLORS[adv.severity]?.bg || "#f1f5f9",
                        color: SEVERITY_COLORS[adv.severity]?.text || "#475569",
                      }}
                    >
                      {adv.severity}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.74rem", color: "#475569" }}>{adv.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </VisualContainer>
    </div>
  );
}
