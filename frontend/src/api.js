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

// In-flight GET request deduplication map to prevent redundant concurrent fetches
const inFlightRequests = new Map();

function dedupGet(url, params = {}) {
  const queryStr = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== "")
  ).toString();
  const cacheKey = `${url}?${queryStr}`;

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const reqPromise = api.get(url, { params }).finally(() => {
    // Keep in map for 1500ms to coalesce rapid identical re-renders
    setTimeout(() => {
      inFlightRequests.delete(cacheKey);
    }, 1500);
  });

  inFlightRequests.set(cacheKey, reqPromise);
  return reqPromise;
}

export const getBrands = () => dedupGet("/brands");
export const getModels = (brand) => dedupGet("/models", brand ? { brand } : {});
export const getSentiment = () => dedupGet("/sentiment");
export const getAspects = (brand) => dedupGet("/aspects", brand ? { brand } : {});
export const getOpportunities = (brand) => dedupGet("/opportunities", brand ? { brand } : {});
export const getModelAspects = (brand, model) => dedupGet("/model-aspects", { brand, model });
export const getCompetitorAdvantages = (target) => dedupGet("/competitor-advantages", { target });
export const getSpecPeers = (model) => dedupGet("/spec-peers", { model });
export const getSummary = (target) => dedupGet("/summary", { target });
export const getPriceModels = (brand) => dedupGet("/price-models", brand ? { brand } : {});
export const getModelComparison = (asusModel) => dedupGet("/model-comparison", { asus_model: asusModel });

export const sendChat = (query) => api.post("/chat", { query });

export const getInsights = (asusModel) => dedupGet("/insights", { asus_model: asusModel });
export const getKPIs = (target) => dedupGet("/kpis", target ? { target } : {});
export const getDataQuality = () => dedupGet("/data-quality");
