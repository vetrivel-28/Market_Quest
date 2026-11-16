
# MarketQuest | AI-Powered Laptop Market Intelligence Platform

**From Product Data to Market Intelligence.**

Transform product reviews, pricing data, and customer sentiment into actionable business insights.

🌐 [Live Demo](https://market-quest-rosy.vercel.app) | 📚 [API Documentation](https://market-quest-6vg9.onrender.com/docs) | 💻 [GitHub Repository](https://github.com/vetrivel-28/Market_Quest)

![Python](https://img.shields.io/badge/Python-FastAPI-blue?style=for-the-badge&logo=python)
![React](https://img.shields.io/badge/React-Vite-61DAFB?style=for-the-badge&logo=react)
![AI](https://img.shields.io/badge/AI-RAG%20%7C%20FAISS-purple?style=for-the-badge)
![Redis](https://img.shields.io/badge/Cache-Redis-red?style=for-the-badge&logo=redis)
![Deployment](https://img.shields.io/badge/Deployment-Vercel%20%7C%20Render-black?style=for-the-badge)

---

---

## 📌 Overview

**MarketQuest** is an AI-powered laptop market intelligence platform designed to transform product information, pricing data, customer reviews, and sentiment signals into meaningful business insights.

Understanding a competitive product market involves more than comparing prices and specifications. Businesses need to understand customer expectations, identify recurring product complaints, evaluate competitors, discover market gaps, and make informed product decisions.

MarketQuest brings these analytical workflows together in a single platform.

By combining data analytics, machine learning, Natural Language Processing (NLP), Retrieval-Augmented Generation (RAG), and interactive visualizations, MarketQuest helps users explore the laptop market from multiple perspectives.

### What can MarketQuest answer?

- Which laptop models provide better value for money?
- What do customers appreciate or complain about?
- How do competing laptop brands compare?
- Which product aspects receive negative customer feedback?
- What opportunities exist for product improvement?
- What strategic decisions can be derived from customer reviews?

The platform combines structured analytics with an AI-powered conversational interface, making market intelligence accessible through both dashboards and natural-language queries.


## 🌐 Live Application

🚀 **[Explore MarketQuest Live](https://market-quest-rosy.vercel.app)**

| Component | URL |
|---|---|
| Live Application | [MarketQuest](https://market-quest-rosy.vercel.app) |
| Backend API | [FastAPI Backend](https://market-quest-6vg9.onrender.com) |
| API Documentation | [Swagger UI](https://market-quest-6vg9.onrender.com/docs) |
| Source Code | [GitHub Repository](https://github.com/vetrivel-28/Market_Quest) |


> **Note:** The backend is hosted on Render. If the service has been idle, its first request may take longer while the service starts.

---

## ✨ Key Features

### 1. Market Overview Dashboard

A consolidated view of the laptop market.

- Brand-wise product distribution.
- Laptop model catalog.
- Product pricing overview.
- Market-level KPIs.
- Interactive data visualizations.
- Consolidated market insights.

### 2. AI-Powered Intelligence Center

Explore individual laptop models and obtain detailed analytical insights.

- Model-level intelligence.
- Product price and rating analysis.
- Customer feedback interpretation.
- Model-specific market insights.
- Intelligent model-name matching.
- Data-driven product evaluation.

### 3. Competitor Analysis

Understand competitive positioning across laptop brands and models.

- Competitor comparison.
- Brand advantages.
- Model-level comparisons.
- Product strengths and weaknesses.
- Competitive positioning insights.

### 4. Customer Sentiment Analysis

Understand customer perception through review analytics.

- Positive and negative sentiment analysis.
- Customer feedback patterns.
- Product aspect-level sentiment.
- Common customer complaints.
- Review-driven product insights.

### 5. Market Opportunity Discovery

Identify potential opportunities from product and customer feedback data.

- Unmet customer needs.
- Product improvement opportunities.
- Market gaps.
- Customer complaint patterns.
- Data-driven opportunity identification.

### 6. Strategic Recommendations

Convert analytical findings into actionable business insights.

- Product improvement directions.
- Competitive recommendations.
- Customer-driven strategic insights.
- Opportunity-based recommendations.

### 7. AI Market Intelligence Chatbot

An intelligent conversational interface powered by Retrieval-Augmented Generation.

Users can ask questions such as:

- Which ASUS laptop provides the best value for money?
- What are the most common complaints about gaming laptops?
- Which laptop models have better customer ratings?
- What are the major customer concerns regarding battery life?
- Which product aspects need improvement?

The chatbot combines structured analytical calculations with retrieved review evidence to generate context-aware responses.

---

## 📸 Application Preview

Screenshots from the deployed application can be added here to help visitors explore the platform before opening the live demo.

Save your screenshots inside `docs/screenshots/` in the repository, using the filenames below.

### Market Overview



### Competitor Analysis



### Intelligence Center



### AI Market Intelligence Chatbot



---

## 🧠 How MarketQuest Works

MarketQuest follows a multi-stage data intelligence workflow.

```mermaid
flowchart TD
    A["Product and Customer Review Data"]
    B["Data Processing"]
    C["Data Cleaning and Transformation"]
    D["Structured Analytics"]
    E["NLP and Sentiment Analysis"]
    F["Aspect-Level Analysis"]
    G["Market Intelligence Engine"]
    H["Dashboard and Visualizations"]
    I["Market Opportunity Analysis"]
    J["RAG Intelligence System"]
    K["FAISS Retrieval"]
    L["AI Response Generation"]
    M["Conversational Interface"]

    A --> B
    B --> C
    C --> D
    C --> E
    E --> F
    D --> G
    F --> G
    G --> H
    G --> I
    G --> J
    J --> K
    K --> L
    L --> M
```

### Processing Pipeline

1. **Data Ingestion:** Product information, pricing, ratings, and customer reviews are loaded from the project's datasets.
2. **Data Processing:** Python and Pandas handle cleaning, normalization, and transformation.
3. **Analytical Processing:** Structured metrics are calculated for product performance, customer sentiment, competitor comparisons, and market opportunities.
4. **NLP Processing:** Customer reviews are analyzed to identify sentiment and product-related aspects.
5. **Knowledge Retrieval:** FAISS retrieves relevant review information for conversational queries.
6. **AI Synthesis:** Gemini, where configured, or the structured fallback analyst generates responses using available analytical evidence.
7. **Visualization:** React dashboards present processed insights through interactive interfaces.

---

## 🏗️ System Architecture

MarketQuest follows a decoupled frontend and backend architecture.

```mermaid
flowchart TB
    U["User"]

    subgraph FE["Frontend Layer"]
        R["React + Vite"]
        D["Interactive Dashboards"]
        C["AI Chatbot"]
    end

    subgraph BE["Backend Layer"]
        API["FastAPI REST API"]
        P["Pandas Analytics"]
        NLP["NLP and Sentiment Analysis"]
        RAG["RAG Engine"]
        F["FAISS Index"]
        CM["Cache Manager"]
    end

    subgraph INFRA["Infrastructure"]
        RD["Upstash Redis"]
        MEM["In-Memory Cache"]
        DS["Project Datasets"]
        GM["Gemini API (Optional)"]
    end

    U --> R
    R --> D
    R --> C
    D --> API
    C --> API
    API --> P
    API --> NLP
    API --> RAG
    RAG --> F
    RAG --> GM
    API --> CM
    CM --> RD
    CM --> MEM
    P --> DS
    NLP --> DS
```

### Architecture Components

| Layer            | Technology                          | Responsibility                              |
| ---------------- | ----------------------------------- | ------------------------------------------- |
| Frontend         | React, Vite                         | User interface and dashboards               |
| Backend          | FastAPI                             | REST endpoints and application logic        |
| Data Processing  | Python, Pandas, NumPy               | Data transformation and analytics           |
| NLP              | NLP and machine learning components | Sentiment and aspect analysis               |
| Retrieval        | FAISS                               | Semantic retrieval of review information    |
| AI               | Gemini API and structured fallback  | Conversational response generation          |
| Caching          | Redis and in-memory LRU             | Reduce repeated computation and data access |
| Backend Hosting  | Render                              | API deployment                              |
| Frontend Hosting | Vercel                              | Web application deployment                  |
| Cache Hosting    | Upstash Redis                       | Managed remote caching                      |

---

## ⚡ Performance Engineering

MarketQuest includes a multi-level caching system to reduce repeated data processing and improve API responsiveness.

### Two-Level Caching Architecture

**L1: In-Memory Cache**

- Fast local cache access.
- LRU-based cache management.
- Reduces repeated computation within the running process.

**L2: Redis Cache**

- Managed Redis through Upstash.
- Shared cache layer for supported application instances.
- Configurable expiration using TTL.
- Redis failure falls back to in-memory caching.

### Additional Optimizations

- Per-key locking to reduce cache stampedes.
- Dataset pre-warming during application startup.
- Lazy initialization of the RAG model.
- Cached conversational responses.
- Frontend route-based code splitting.
- Vendor bundle optimization.
- In-flight API request deduplication.

> Performance depends on the cache layer, dataset, deployment environment, and whether a request is a cache hit or miss. Benchmark results should be interpreted in the context of the measurement environment.

---

## 🛠️ Technology Stack

| Category              | Technologies                  |
| --------------------- | ----------------------------- |
| Programming Languages | Python, JavaScript            |
| Frontend              | React, Vite                   |
| Backend               | FastAPI                       |
| Data Analytics        | Pandas, NumPy                 |
| NLP / AI              | NLP, Gemini API               |
| RAG                   | FAISS                         |
| Caching               | Redis, Upstash, In-Memory LRU |
| API Communication     | REST API                      |
| Deployment            | Vercel, Render                |
| Version Control       | Git, GitHub                   |

---

## 📂 Project Structure

```text
Market_Quest/
│
├── api/
│   ├── main.py
│   └── cache.py
│
├── backend/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── api.js
│   │   └── App.jsx
│   ├── vite.config.js
│   └── package.json
│
├── rag_model_ai/
│   └── rag_model.py
│
├── datasets/
│
├── analysis/
│
├── notebooks/
│
├── scrapers/
│
├── docs/
│   └── screenshots/
│
├── tests/
│   └── test_api_initialization.py
│
├── .env.example
├── .gitignore
├── requirements_api.txt
└── README.md
```

---

## ⚙️ Getting Started

Follow these instructions to run MarketQuest locally.

### Prerequisites

Make sure you have:

- Python 3.10 or later.
- Node.js and npm.
- Git.
- A Gemini API key if you want to enable Gemini-powered response generation.
- An Upstash Redis database if you want remote Redis caching.

### 1. Clone the Repository

```bash
git clone https://github.com/vetrivel-28/Market_Quest.git

cd Market_Quest
```

### 2. Backend Setup

Create and activate a Python virtual environment.

**Windows:**

```cmd
python -m venv venv
venv\Scripts\activate
```

Install backend dependencies:

```cmd
pip install -r requirements_api.txt
```

### 3. Configure Environment Variables

Create a `.env` file in the project root using `.env.example` as the template.

Example configuration:

```env
GEMINI_API_KEY=your_gemini_api_key

REDIS_ENABLED=true
REDIS_URL=rediss://default:your_upstash_password@your-upstash-host:6379

CACHE_DEFAULT_TTL=900
```

For local development without remote Redis:

```env
REDIS_ENABLED=false
```

Keep API keys, Redis credentials, and other secrets private. Never commit your actual `.env` file.

### 4. Start the Backend

From the project root:

```cmd
python -m uvicorn api.main:app --reload --port 8000
```

Backend URL:

```text
http://127.0.0.1:8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

### 5. Frontend Setup

Open another terminal:

```cmd
cd frontend
npm install
```

Configure the frontend API URL using the environment variable expected by the application:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Start the frontend:

```cmd
npm run dev
```

Open the local application at the URL printed by Vite, usually:

```text
http://localhost:5173
```

---

## 🔌 API Overview

The FastAPI backend exposes endpoints for dashboard data, analytics, caching, and conversational intelligence.

| Endpoint                         | Purpose                           |
| -------------------------------- | --------------------------------- |
| `GET /api/brands`                | Brand information                 |
| `GET /api/models`                | Laptop model catalog              |
| `GET /api/price-models`          | Model pricing data                |
| `GET /api/sentiment`             | Sentiment analytics               |
| `GET /api/aspects`               | Product aspect analysis           |
| `GET /api/opportunities`         | Market opportunity insights       |
| `GET /api/model-aspects`         | Model-level aspect analytics      |
| `GET /api/competitor-advantages` | Competitive advantage analysis    |
| `GET /api/model-comparison`      | Product comparison                |
| `GET /api/spec-peers`            | Similar specification comparisons |
| `GET /api/insights`              | Model-level intelligence          |
| `GET /api/summary`               | Dashboard summary                 |
| `GET /api/kpis`                  | Key performance indicators        |
| `GET /api/data-quality`          | Dataset quality information       |
| `POST /api/chat`                 | Conversational intelligence       |
| `GET /api/cache/stats`           | Cache status and statistics       |
| `POST /api/cache/clear`          | Cache invalidation                |

Explore the interactive API documentation:

[**Open MarketQuest Swagger UI**](https://market-quest-6vg9.onrender.com/docs)

---

## 🧪 Testing & Validation

The project includes backend unit tests and frontend production-build validation.

### Run Backend Tests

```cmd
python -m unittest discover -s tests -v
```

### Check Python Syntax

```cmd
python -m py_compile api/main.py api/cache.py rag_model_ai/rag_model.py
```

### Build the Frontend

```cmd
cd frontend
npm run build
```

---

## ☁️ Deployment Architecture

MarketQuest uses separate hosting for the frontend and backend.

### Frontend: Vercel

- Root directory: `frontend/`
- Build command: `npm run build`
- Output directory: `dist/`

Configure the environment variable:

```env
VITE_API_BASE_URL=https://market-quest-6vg9.onrender.com
```

### Backend: Render

- Root directory: Repository root.
- Build command:

```bash
pip install -r requirements_api.txt
```

- Start command:

```bash
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

Configure the required environment variables in the Render dashboard.

### Caching: Upstash Redis

- Create a Redis database.
- Select a region close to the backend where practical.
- Use the TLS-enabled Redis connection URL.
- Configure the URL as a private environment variable in Render.

Never expose Redis credentials in frontend environment variables.

---

## 🔐 Security Considerations

- Keep API keys and Redis credentials in environment variables.
- Never commit `.env` files.
- Do not expose private service credentials in frontend code.
- Use HTTPS for deployed services.
- Restrict administrative cache operations if the API is publicly accessible.

---

## 🎯 Project Objectives

MarketQuest explores how data science and AI can solve practical business intelligence problems.

The primary objective is to bridge the gap between raw product data and meaningful business decisions through:

- Structured data analytics.
- Customer sentiment understanding.
- Competitor intelligence.
- Semantic search.
- AI-assisted reasoning.
- Performance-oriented application engineering.

---


\<p align="center">
&#x20; \<strong>MarketQuest\</strong>
&#x20; \<br />
&#x20; From Product Data to Market Intelligence.
&#x20; \<br />\<br />
&#x20; \<a href="[https://market-quest-rosy.vercel.app](https://market-quest-rosy.vercel.app)">Explore the Live Application\</a>
\</p>
