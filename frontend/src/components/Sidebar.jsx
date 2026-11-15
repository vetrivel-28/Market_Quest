import React from "react";
import { NavLink } from "react-router-dom";
import { useFilters, BRAND_COLORS } from "../context/FilterContext";

const NAV = [
  { to: "/",              label: "Executive Overview",     icon: "📊" },
  { to: "/target",        label: "Target Brand Portfolio", icon: "🎯" },
  { to: "/market",        label: "Market Overview",        icon: "🌐" },
  { to: "/comparison",    label: "Spec Peer Comparison",   icon: "⚖️" },
  { to: "/advantages",    label: "Competitor Advantages",  icon: "🛡️" },
  { to: "/strengths",     label: "Strengths & Weaknesses", icon: "📈" },
  { to: "/strategy",      label: "Strategy Action Plan",   icon: "💡" },
  { to: "/opportunities", label: "Market Opportunities",   icon: "🚀" },
  { to: "/insights",      label: "Intelligence Center",    icon: "🔍" },
];

export default function Sidebar() {
  const { target } = useFilters();

  return (
    <aside className="pbi-sidebar">
      {/* Brand & Studio Logo Header */}
      <div className="pbi-sidebar-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="pbi-logo-icon">MQ</div>
          <div>
            <div className="pbi-app-title">MarketQuest</div>
            <div className="pbi-app-subtitle">Market Intelligence Studio</div>
          </div>
        </div>
        <div className="pbi-target-badge" style={{ backgroundColor: BRAND_COLORS[target] || BRAND_COLORS.ASUS }}>
          Focus: {target}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="pbi-nav">
        <div className="pbi-nav-section-title">REPORTS & ANALYTICS</div>
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) => `pbi-nav-item ${isActive ? "active" : ""}`}
          >
            <span className="pbi-nav-icon">{icon}</span>
            <span className="pbi-nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Semantic Metadata & Architecture Footer */}
      <div className="pbi-sidebar-footer">
        <div style={{ fontSize: "0.72rem", color: "#64748b", lineHeight: 1.5 }}>
          <div style={{ fontWeight: 600, color: "#334155" }}>Semantic Layer v2.0</div>
          <div>Star Schema • 31.6k Reviews</div>
          <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
            <span>Power BI Engine Active</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
