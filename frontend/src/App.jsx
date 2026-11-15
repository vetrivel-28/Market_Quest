import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FilterProvider } from "./context/FilterContext";
import Sidebar from "./components/Sidebar";
import TopFilterBar from "./components/TopFilterBar";
import Chatbot from "./components/Chatbot";
import Home from "./pages/Home";
import TargetOverview from "./pages/TargetOverview";
import MarketOverview from "./pages/MarketOverview";
import CompetitorComparison from "./pages/CompetitorComparison";
import CompetitorAdvantages from "./pages/CompetitorAdvantages";
import StrengthsWeaknesses from "./pages/StrengthsWeaknesses";
import Strategy from "./pages/Strategy";
import Opportunities from "./pages/Opportunities";
import Insights from "./pages/Insights";
import { getBrands } from "./api";

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
            </main>
          </div>
          <Chatbot />
        </div>
      </FilterProvider>
    </BrowserRouter>
  );
}
