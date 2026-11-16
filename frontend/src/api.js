import axios from "axios";

const backendOrigin = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? "http://localhost:8000"
    : "https://market-quest-6vg9.onrender.com")
).replace(/\/+$/, "");

const api = axios.create({
  baseURL: `${backendOrigin}/api`,
  timeout: 60000,
});

export const getBrands = () => api.get("/brands");
export const getModels = (brand) => api.get("/models", { params: brand ? { brand } : {} });
export const getSentiment = () => api.get("/sentiment");
export const getAspects = (brand) =>
  api.get("/aspects", { params: brand ? { brand } : {} });
export const getOpportunities = (brand) =>
  api.get("/opportunities", { params: brand ? { brand } : {} });
export const getModelAspects = (brand, model) =>
  api.get("/model-aspects", { params: { brand, model } });
export const getCompetitorAdvantages = (target) =>
  api.get("/competitor-advantages", { params: { target } });
export const getSpecPeers = (model) =>
  api.get("/spec-peers", { params: { model } });
export const getSummary = (target) =>
  api.get("/summary", { params: { target } });
export const getPriceModels = (brand) =>
  api.get("/price-models", { params: brand ? { brand } : {} });
export const getModelComparison = (asusModel) =>
  api.get("/model-comparison", { params: { asus_model: asusModel } });

export const sendChat = (query) =>
  api.post("/chat", { query });

export const getInsights = (asusModel) =>
  api.get("/insights", { params: { asus_model: asusModel } });

export const getKPIs = (target) =>
  api.get("/kpis", { params: target ? { target } : {} });

export const getDataQuality = () =>
  api.get("/data-quality");
