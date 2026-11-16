import React, { useState, useEffect, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FilterProvider } from "./context/FilterContext";
import Sidebar from "./components/Sidebar";
import TopFilterBar from "./components/TopFilterBar";
import Chatbot from "./components/Chatbot";
import { getBrands } from "./api";

// Route-level code-splitting for high-speed page loads
const Home = lazy(() => import("./pages/Home"));
const TargetOverview = lazy(() => import("./pages/TargetOverview"));
const MarketOverview = lazy(() => import("./pages/MarketOverview"));
const CompetitorComparison = lazy(() => import("./pages/CompetitorComparison"));
const CompetitorAdvantages = lazy(() => import("./pages/CompetitorAdvantages"));
const StrengthsWeaknesses = lazy(() => import("./pages/StrengthsWeaknesses"));
const Strategy = lazy(() => import("./pages/Strategy"));
const Opportunities = lazy(() => import("./pages/Opportunities"));
const Insights = lazy(() => import("./pages/Insights"));

function RouteLoadingFallback() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "50vh",
        gap: 12,
        color: "#64748b",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: "3px solid #e2e8f0",
          borderTopColor: "#4338ca",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>Loading Report Visuals...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function App() {
  const [brands, setBrands] = useState(["ASUS", "HP", "Dell", "Lenovo"]);

  useEffect(() => {
    getBrands()
      .then((r) => {
        if (r.data.brands && r.data.brands.length) {
          setBrands(r.data.brands);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <BrowserRouter>
      <FilterProvider brands={brands}>
        <div className="pbi-app-shell">
          <Sidebar />
          <div className="pbi-main-viewport">
            <TopFilterBar />
            <main className="pbi-canvas">
              <Suspense fallback={<RouteLoadingFallback />}>
                <Routes>
                  <Route path="/"              element={<Home />} />
                  <Route path="/target"        element={<TargetOverview />} />
                  <Route path="/market"        element={<MarketOverview />} />
                  <Route path="/comparison"    element={<CompetitorComparison />} />
                  <Route path="/advantages"    element={<CompetitorAdvantages />} />
                  <Route path="/strengths"     element={<StrengthsWeaknesses />} />
                  <Route path="/strategy"      element={<Strategy />} />
                  <Route path="/opportunities" element={<Opportunities />} />
                  <Route path="/insights"      element={<Insights />} />
                </Routes>
              </Suspense>
            </main>
          </div>
          <Chatbot />
        </div>
      </FilterProvider>
    </BrowserRouter>
  );
}
