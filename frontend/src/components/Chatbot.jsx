import React, { useState, useRef, useEffect } from "react";
import { sendChat } from "../api";
import { useFilters } from "../context/FilterContext";

// Rich Markdown & Analyst Block Formatter
function FormattedMessage({ text }) {
  if (!text) return null;

  // Split into lines
  const rawLines = text.split("\n");

  const renderInlineFormatted = (str) => {
    if (!str) return null;
    // Replace markdown bold, quotes, and badges
    const parts = [];
    // Regex splits by bold (**...**) or quotes ("> ...") or badges ([...])
    const regex = /(\*\*[^*]+\*\*|\[[^\]]+\]|\*[^*]+\*)/g;
    let lastIdx = 0;
    let match;

    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIdx) {
        parts.push(str.substring(lastIdx, match.index));
      }
      const token = match[0];
      if (token.startsWith("**") && token.endsWith("**")) {
        parts.push(
          <strong key={match.index} style={{ fontWeight: 700, color: "#0f172a" }}>
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith("*") && token.endsWith("*")) {
        parts.push(
          <em key={match.index} style={{ color: "#475569" }}>
            {token.slice(1, -1)}
          </em>
        );
      } else if (token.startsWith("[") && token.endsWith("]")) {
        const badgeContent = token.slice(1, -1);
        const isPos = badgeContent.includes("Positive") || badgeContent.includes("✅");
        const isNeg = badgeContent.includes("Complaint") || badgeContent.includes("⚠️") || badgeContent.includes("Negative");
        parts.push(
          <span
            key={match.index}
            className="pbi-badge"
            style={{
              backgroundColor: isPos ? "#d1fae5" : isNeg ? "#fee2e2" : "#f1f5f9",
              color: isPos ? "#065f46" : isNeg ? "#991b1b" : "#475569",
              fontWeight: 700,
              fontSize: "0.68rem",
              margin: "0 4px",
              padding: "2px 6px",
              borderRadius: 4,
            }}
          >
            {badgeContent}
          </span>
        );
      }
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < str.length) {
      parts.push(str.substring(lastIdx));
    }
    return parts.length ? parts : str;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.84rem", lineHeight: 1.55 }}>
      {rawLines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} style={{ height: 4 }} />;
        }

        // Section Headers (### ...)
        if (trimmed.startsWith("###")) {
          const title = trimmed.replace(/^###\s*/, "");
          return (
            <div
              key={idx}
              style={{
                fontWeight: 800,
                fontSize: "0.95rem",
                color: "#1e1b4b",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: 4,
                marginTop: 6,
                marginBottom: 2,
              }}
            >
              {title}
            </div>
          );
        }

        // Blockquotes (> "...")
        if (trimmed.startsWith(">") || trimmed.startsWith("&gt;")) {
          const quote = trimmed.replace(/^(?:>|&gt;)\s*/, "").replace(/^"|"$/g, "");
          return (
            <div
              key={idx}
              style={{
                margin: "4px 0 6px 8px",
                padding: "6px 12px",
                backgroundColor: "#f8fafc",
                borderLeft: "3px solid #6366f1",
                borderRadius: "0 6px 6px 0",
                fontStyle: "italic",
                color: "#334155",
                fontSize: "0.8rem",
              }}
            >
              "{quote}"
            </div>
          );
        }

        // Bullet list item (• or -)
        if (trimmed.startsWith("•") || trimmed.startsWith("- ") || /^\*\s/.test(trimmed)) {
          const bulletBody = trimmed.replace(/^(?:•|-|\*)\s*/, "");
          return (
            <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 6, margin: "2px 0" }}>
              <span style={{ color: "#4338ca", fontWeight: 800, lineHeight: 1.4 }}>•</span>
              <div style={{ flex: 1 }}>{renderInlineFormatted(bulletBody)}</div>
            </div>
          );
        }

        // Numbered list item (e.g. **1. ...**)
        if (/^\*\*\d+\./.test(trimmed)) {
          return (
            <div
              key={idx}
              style={{
                background: "#fdfefe",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                padding: "6px 10px",
                margin: "4px 0",
              }}
            >
              {renderInlineFormatted(trimmed)}
            </div>
          );
        }

        // Sub-bullets (indented)
        if (line.startsWith("   •") || line.startsWith("   -") || line.startsWith("  -")) {
          const subContent = line.replace(/^\s*(?:•|-)\s*/, "");
          return (
            <div key={idx} style={{ marginLeft: 20, display: "flex", gap: 6, fontSize: "0.8rem", color: "#475569" }}>
              <span>–</span>
              <div>{renderInlineFormatted(subContent)}</div>
            </div>
          );
        }

        // Standard text line
        return <div key={idx}>{renderInlineFormatted(line)}</div>;
      })}
    </div>
  );
}

export default function Chatbot() {
  const { target, competitors, priceBand, category, selectedModel } = useFilters();

  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([
    {
      role: "bot",
      text: `Hello! I am your Market Intelligence Analyst grounded on 31,654 real customer reviews across Amazon and Reddit. Ask me about sentiment, hardware thermals, battery life, pricing, or spec peer comparisons.`,
      meta: null,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const promptChips = [
    `Which ${target || "ASUS"} model has best Value Score?`,
    `What are the top battery complaints?`,
    `Summarize ${target || "ASUS"} market sentiment`,
    `Compare ${target || "ASUS"} vs ${competitors[0] || "HP"} in gaming thermals`,
  ];

  const handleSend = async (queryText) => {
    const q = (queryText || input).trim();
    if (!q || loading) return;
    setInput("");
    setMsgs((p) => [...p, { role: "user", text: q, meta: null }]);
    setLoading(true);

    try {
      const r = await sendChat(q);
      setMsgs((p) => [
        ...p,
        {
          role: "bot",
          text: r.data.answer,
          meta: r.data.meta,
        },
      ]);
    } catch {
      setMsgs((p) => [
        ...p,
        {
          role: "bot",
          text: "Could not get a response from the analytical backend. Please try again, or check backend availability.",
          meta: null,
        },
      ]);
    }
    setLoading(false);
  };

  const onKey = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <>
      <button className="chat-fab" onClick={() => setOpen((o) => !o)} title="Open Market Intelligence AI Analyst">
        <span>⚡</span>
        <span>{open ? "Close Analyst" : "AI Analyst"}</span>
      </button>

      {open && (
        <div className="chat-window">
          {/* Header */}
          <div className="chat-header">
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.92rem", display: "flex", alignItems: "center", gap: 6 }}>
                <span>🤖</span>
                <span>MarketQuest AI Analyst</span>
              </div>
              <div style={{ fontSize: "0.7rem", opacity: 0.85 }}>
                Grounded on 31,654 customer review sentences (RAG + Gemini)
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: "#fff",
                fontSize: "1.4rem",
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {msgs.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                {m.role === "bot" ? (
                  <FormattedMessage text={m.text} />
                ) : (
                  <div style={{ whiteSpace: "pre-line", lineHeight: 1.55 }}>{m.text}</div>
                )}

                {/* Grounding Metadata Expander */}
                {m.meta && (
                  <div
                    style={{
                      marginTop: 8,
                      paddingTop: 6,
                      borderTop: "1px solid #e2e8f0",
                      fontSize: "0.68rem",
                      color: "#64748b",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>
                        <strong>[Evidence]</strong> {m.meta.sources} review excerpts cited
                      </span>
                      {m.meta.gemini ? (
                        <span style={{ color: "#4338ca", fontWeight: 700 }}>Gemini Verified</span>
                      ) : (
                        <span>RAG Semantic Match</span>
                      )}
                    </div>
                    {m.meta.product && (
                      <div style={{ marginTop: 2 }}>
                        Top matched product: <em>{m.meta.product}</em> ({m.meta.tone} tone, score: {m.meta.score})
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="chat-msg bot" style={{ fontStyle: "italic", color: "#64748b" }}>
                Analyzing customer sentiment and synthesizing evidence...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="chat-chips-row">
            {promptChips.map((chip, idx) => (
              <button key={idx} className="chat-chip" onClick={() => handleSend(chip)}>
                {chip}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="chat-input-bar">
            <input
              type="text"
              className="pbi-input"
              placeholder={`Ask about ${target || "ASUS"}, battery, thermals, or value...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              disabled={loading}
            />
            <button
              className="pbi-action-btn"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              style={{ background: "#4338ca", color: "#ffffff", borderColor: "#4338ca" }}
            >
              Ask
            </button>
          </div>
        </div>
      )}
    </>
  );
}
