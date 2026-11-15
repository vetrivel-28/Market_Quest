# MarketQuest — Semantic Layer & KPI Dictionary

## 1. Dimensional Star Schema Design

The MarketQuest analytical engine operates over a governed dimensional model derived from multi-source consumer sentiment (Reddit r/laptops, r/GamingLaptops) and e-commerce listing data (Amazon India).

```
                      ┌──────────────────────┐
                      │      Dim_Brand       │
                      ├──────────────────────┤
                      │ brand_id (PK)        │
                      │ brand_name           │
                      │ country_origin       │
                      └──────────┬───────────┘
                                 │ 1
                                 │
                                 │ *
┌──────────────────────┐      ┌──┴───────────────────┐      ┌──────────────────────┐
│     Dim_Category     │ 1  * │      Dim_Model       │ *  1 │    Dim_PriceBand     │
├──────────────────────┤──────┤──────────────────────├──────┤──────────────────────┤
│ category_id (PK)     │      │ model_id (PK)        │      │ band_id (PK)         │
│ category_name        │      │ model_name           │      │ band_name            │
│ spec_tier (1-4)      │      │ brand_id (FK)        │      │ min_price            │
└──────────────────────┘      │ category_id (FK)     │      │ max_price            │
                              │ base_price           │      └──────────────────────┘
                              │ catalog_rating       │
                              └──────────┬───────────┘
                                         │ 1
                                         │
                                         │ *
                              ┌──────────┴───────────┐
                              │     Fact_Review      │
                              ├──────────────────────┤
                              │ sentence_id (PK)     │
                              │ model_id (FK)        │
                              │ source (Reddit/Amz)  │
                              │ sentence_text        │
                              │ compound_score       │
                              │ sentiment_label      │
                              └──────────┬───────────┘
                                         │ *
                                         │
                                         │ 1
                              ┌──────────┴───────────┐
                              │     Dim_Feature      │
                              │   (Aspect Lexicon)   │
                              ├──────────────────────┤
                              │ aspect_key (PK)      │
                              │ aspect_label         │
                              │ keywords_regex       │
                              └──────────────────────┘
```

---

## 2. Core Measures & DAX Definitions

| Measure Name | Business Question | DAX-Style Formulation | Grain | Denominator | Owner Persona |
|---|---|---|---|---|---|
| **Total Brands** | How many competing laptop OEMs are monitored? | `DISTINCTCOUNT(Dim_Brand[brand_name])` | Market | N/A | Market Research |
| **Total Models** | How many specific SKU/model lines are covered? | `DISTINCTCOUNT(Dim_Model[model_id])` | Market / Brand | N/A | Product Strategy |
| **Total Sentences Analyzed** | What is the total volume of customer sentiment units? | `COUNTROWS(Fact_Review)` | Market / Brand / Model | N/A | Data Analyst |
| **Average Catalog Price** | What is the mean listing price across portfolio? | `AVERAGE(Dim_Model[base_price])` | Brand / Category | Total Models with Price | Pricing Lead |
| **Average Catalog Rating** | What is the mean customer star rating on e-commerce? | `AVERAGE(Dim_Model[catalog_rating])` | Brand / Category | Total Models with Rating | Commercial Lead |
| **Positive Sentiment %** | What proportion of customer feedback expresses positive sentiment? | `DIVIDE(COUNTROWS(FILTER(Fact_Review, Fact_Review[sentiment_label] = "Positive")), COUNTROWS(Fact_Review))` | Brand / Model / Aspect | Total Sentences in Context | Brand Experience |
| **Negative Sentiment %** | What proportion of customer feedback expresses negative sentiment? | `DIVIDE(COUNTROWS(FILTER(Fact_Review, Fact_Review[sentiment_label] = "Negative")), COUNTROWS(Fact_Review))` | Brand / Model / Aspect | Total Sentences in Context | Quality Engineering |
| **Feature Positive %** | For a specific hardware aspect (e.g. Battery), what is customer satisfaction? | `DIVIDE(COUNTROWS(FILTER(Fact_Review, [HasAspect] && Fact_Review[sentiment_label] = "Positive")), COUNTROWS(FILTER(Fact_Review, [HasAspect])))` | Aspect x Model / Brand | Sentences mentioning that aspect | Product Manager |
| **Feature Complaint Rate** | For a specific hardware aspect, what fraction of mentions are critical/flawed? | `DIVIDE(COUNTROWS(FILTER(Fact_Review, [HasAspect] && Fact_Review[sentiment_label] = "Negative")), COUNTROWS(FILTER(Fact_Review, [HasAspect])))` | Aspect x Model / Brand | Sentences mentioning that aspect | Engineering / QA |
| **Share of Voice (SOV %)** | How much customer attention/discussion does a brand capture relative to total market? | `DIVIDE(COUNTROWS(FILTER(Fact_Review, Fact_Review[brand] = SelectedBrand)), COUNTROWS(Fact_Review))` | Brand | Total Market Sentences | Marketing Director |
| **Value Score** | Which laptops deliver superior rating per unit price compared to market baseline? | `(([Rating] / MarketAvgRating) / ([Price] / MarketAvgPrice)) * 100` | Model | Market Baseline Ratio | Commercial Analyst |
| **Competitive Sentiment Gap** | How far ahead or behind is the target brand versus a competitor in a specific aspect? | `[Target Feature Positive %] - [Competitor Feature Positive %]` | Aspect x Brand Pair | Aspect Mentions | Competitive Intelligence |
| **Price Delta** | How much higher or lower is the target model priced against a spec peer? | `[Target Model Price] - [Peer Model Price]` | Model Pair | N/A | Pricing Strategy |

---

## 3. Measure Transparency & Computation Notes

### Value Score Formula
The **Value Score** is an index centered around 100:
$$\text{Value Score} = \left( \frac{\text{Model Rating}}{\overline{\text{Market Rating}}} \right) \div \left( \frac{\text{Model Price}}{\overline{\text{Market Price}}} \right) \times 100$$
- A score **> 100** indicates that the model provides above-average customer rating relative to its cost bracket (High Value / Sweet Spot).
- A score **< 100** signifies a premium pricing premium or a sub-par rating relative to price.

### Denominator Governance Rule
- For **Brand Sentiment**: Denominator is **all classified sentences** for that brand across Amazon and Reddit.
- For **Feature/Aspect Sentiment**: Denominator is **sentences containing explicit keywords for that aspect** (`detect_aspects()`). Sentences lacking aspect keywords are not included in the aspect's denominator to prevent diluting feature satisfaction metrics.

---

## 4. Data Quality & Transformation Rules ("Applied Steps")

1. **Step 1 - Extraction & Source Attribution**: Load 38 Amazon India product reviews and 41 Reddit discussions. Assign `source = 'amazon'` or `source = 'reddit'`.
2. **Step 2 - Text Normalization**: Normalize column names to lowercase snake_case, trim leading/trailing whitespace, and remove carriage returns.
3. **Step 3 - Brand Identification**: Infer brand from model name prefix (`ASUS`, `HP`, `Dell`, `Lenovo`). If unmatched, classify as `Unknown`.
4. **Step 4 - Sentiment Standardization**: Compute VADER `compound_score` if missing; map `compound_score > 0` to `Positive`, `< 0` to `Negative`, and `= 0` to `Neutral`.
5. **Step 5 - Catalog Price & Rating Enrichment**: Join with canonical e-commerce price catalogue (`model_prices.py`). If a model lacks verified price data, flag as `Missing Price` rather than imputing 0.
6. **Step 6 - Spec Grouping**: Map models to spec tiers (Budget Student, Midrange Thin & Light, Entry Gaming, Mid Gaming, Premium Performance) according to `model_groups.py`.
