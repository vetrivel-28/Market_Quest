import React, { useState } from "react";
import { exportToCsv } from "../context/FilterContext";

export default function VisualContainer({
  title,
  businessQuestion,
  sampleSize,
  data,
  exportFilename,
  children,
  tableColumns,
  tableData,
  style = {},
  className = "",
  actions = null,
}) {
  const [showTable, setShowTable] = useState(false);
  const [isFocus, setIsFocus] = useState(false);

  const handleExport = () => {
    const rows = tableData || data;
    if (rows && Array.isArray(rows) && rows.length > 0) {
      exportToCsv(exportFilename || title.replace(/\s+/g, "_").toLowerCase(), rows);
    }
  };

  const renderContent = () => {
    if (showTable) {
      const rows = tableData || data;
      if (!rows || !rows.length) {
        return (
          <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
            No tabular data available for this visual.
          </div>
        );
      }
      const cols = tableColumns || Object.keys(rows[0]).slice(0, 8);
      return (
        <div style={{ overflowX: "auto", maxHeight: isFocus ? 520 : 360 }}>
          <table className="pbi-table">
            <thead>
              <tr>
                {cols.map((col) => (
                  <th key={col}>{col.replace(/_/g, " ").toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx}>
                  {cols.map((col) => (
                    <td key={col}>
                      {typeof row[col] === "number"
                        ? row[col].toLocaleString()
                        : String(row[col] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return children;
  };

  return (
    <>
      <div
        className={`pbi-card ${className}`}
        style={{
          display: "flex",
          flexDirection: "column",
          position: "relative",
          ...style,
        }}
      >
        {/* Visual Header */}
        <div className="pbi-card-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="pbi-card-title">{title}</div>
            {businessQuestion && (
              <div className="pbi-card-question" title={businessQuestion}>
                Q: {businessQuestion}
              </div>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="pbi-card-actions">
            {sampleSize && (
              <span className="pbi-sample-tag" title="Sample size in current filter context">
                n = {sampleSize}
              </span>
            )}
            {actions}
            <button
              className={`pbi-action-btn ${showTable ? "active" : ""}`}
              onClick={() => setShowTable((v) => !v)}
              title={showTable ? "Switch to Visual" : "See Data Table"}
            >
              {showTable ? "📊 Visual" : "📋 Table"}
            </button>
            <button
              className="pbi-action-btn"
              onClick={handleExport}
              title="Export Underlying Data to CSV"
            >
              📥 CSV
            </button>
            <button
              className="pbi-action-btn"
              onClick={() => setIsFocus(true)}
              title="Focus Mode (Full Screen)"
            >
              ⛶ Focus
            </button>
          </div>
        </div>

        {/* Visual Body */}
        <div className="pbi-card-body" style={{ flex: 1, minHeight: 220 }}>
          {renderContent()}
        </div>
      </div>

      {/* Focus Mode Modal */}
      {isFocus && (
        <div className="pbi-modal-backdrop" onClick={() => setIsFocus(false)}>
          <div
            className="pbi-modal-window"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "90vw", maxWidth: 1200, height: "85vh", display: "flex", flexDirection: "column" }}
          >
            <div className="pbi-card-header" style={{ padding: "1rem 1.5rem" }}>
              <div>
                <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>{title}</div>
                {businessQuestion && (
                  <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: 4 }}>
                    Q: {businessQuestion}
                  </div>
                )}
              </div>
              <div className="pbi-card-actions">
                <button
                  className={`pbi-action-btn ${showTable ? "active" : ""}`}
                  onClick={() => setShowTable((v) => !v)}
                >
                  {showTable ? "📊 Visual" : "📋 Table"}
                </button>
                <button className="pbi-action-btn" onClick={handleExport}>
                  📥 Export CSV
                </button>
                <button
                  className="pbi-action-btn"
                  onClick={() => setIsFocus(false)}
                  style={{ fontWeight: 700 }}
                >
                  ✕ Close Focus
                </button>
              </div>
            </div>
            <div style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
              {renderContent()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
