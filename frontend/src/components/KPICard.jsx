import React from "react";

export default function KPICard({
  title,
  value,
  businessQuestion,
  delta,
  deltaLabel = "vs Market",
  isPositiveGood = true,
  grain = "Brand",
  denominator = "All records in context",
  icon = null,
  color = null,
}) {
  let deltaClass = "delta-neutral";
  if (delta !== undefined && delta !== null && delta !== 0) {
    const isNumPositive = typeof delta === "number" ? delta > 0 : String(delta).startsWith("+");
    if (isPositiveGood) {
      deltaClass = isNumPositive ? "delta-positive" : "delta-negative";
    } else {
      deltaClass = isNumPositive ? "delta-negative" : "delta-positive";
    }
  }

  const formatDelta = (d) => {
    if (d === undefined || d === null) return null;
    if (typeof d === "number") {
      return (d > 0 ? `+${d.toLocaleString()}` : d.toLocaleString());
    }
    return d;
  };

  return (
    <div className="pbi-kpi-card" title={businessQuestion ? `Q: ${businessQuestion}` : ""}>
      <div className="pbi-kpi-top">
        <span className="pbi-kpi-title">{title}</span>
        {icon && <span className="pbi-kpi-icon">{icon}</span>}
      </div>

      <div className="pbi-kpi-value" style={color ? { color } : {}}>
        {value}
      </div>

      <div className="pbi-kpi-footer">
        {delta !== undefined && delta !== null ? (
          <span className={`pbi-kpi-delta ${deltaClass}`}>
            {formatDelta(delta)} {deltaLabel}
          </span>
        ) : (
          <span className="pbi-kpi-benchmark">Market Benchmark</span>
        )}
      </div>

      <div className="pbi-kpi-meta" title={`Denominator: ${denominator}`}>
        Grain: {grain} • Denom: {denominator}
      </div>
    </div>
  );
}
