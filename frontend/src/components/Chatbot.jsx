import React, { useState, useRef, useEffect } from "react";
import { sendChat } from "../api";
import { useFilters } from "../context/FilterContext";

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
    `Summarize ${target} market sentiment`,
    `Which ${target} model has best Value Score?`,
    `What are the top battery complaints?`,
    `Compare ${target} vs ${competitors[0] || "HP"} in gaming thermals`,
  ];

  const handleSend = async (queryText) => {
    const q = (queryText || input).trim();
    if (!q || loading) return;
    setInput("");
    setMsgs((p) => [...p, { role: "user", text: q, meta: null }]);
    setLoading(true);

    try {
      // Send the clean, natural query to RAG without embedding noise
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
                <div style={{ whiteSpace: "pre-line", lineHeight: 1.55 }}>{m.text}</div>

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
              placeholder={`Ask about ${target}, battery, thermals, or value...`}
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
