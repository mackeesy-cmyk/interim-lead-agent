# Data Sources List

This document lists all the external data sources currently monitored by the Interim Lead Agent.

## 1. Brønnøysundregistrene (Official Business Registry)

| Source Name | Method | URL / Endpoint | Frequency |
|---|---|---|---|
| **Konkurser** | API | `https://data.brreg.no/enhetsregisteret/api/konkurser` | Daily |
| **Enhetsregisteret** | API | `https://data.brreg.no/enhetsregisteret/api/enheter` | On Demand (Verification) |
| **Endringer (Updates)** | API | `https://data.brreg.no/enhetsregisteret/api/oppdateringer/enheter` | Daily (2 day lookback) |
| **Kunngjøringer** | Scraping | `https://w2.brreg.no/kunngjoring/kombisok.jsp` | Daily |

**Filters Applied:**
- Geographic scope: "Østlandet" (Postcodes 0000-3999)
- Relevance: Only companies with operations (`har_virksomhet: true`)
- Size: Status updates ignored for companies with < 1 employee (shell companies)

---

## 2. Financial News (RSS Feeds)

| Source | Feed URL | Notes |
|---|---|---|
| **Dagens Næringsliv (DN)** | `https://services.dn.no/api/feed/rss/?categories=nyheter,etterbørs,gründer,børs,jobb_og_ledelse&topics=` | Filtered for business/leadership topics |
| **E24** | `https://e24.no/rss2/?seksjon=boers-og-finans`<br>`https://e24.no/rss2/?seksjon=it` | Tech & Finance sections |
| **Finansavisen** | `https://ws.finansavisen.no/api/articles.rss?category=Børs`<br>`https://ws.finansavisen.no/api/articles.rss` | Børs & General |
| **NTB** | `https://rss.app/feeds/MSIy5TCoyjpmiKyn.xml` | Press releases (via X/Twitter bridge) |

**Keyword Triggers:**
- "Går av", "fratrer", "ny CEO", "lederskifte"
- "Konkurs", "restrukturering", "nedbemanning"
- "Oppkjøp", "fusjon", "strategisk gjennomgang"

---

## 3. Targeted Web Scraping

| Source | URL | Method |
|---|---|---|
| **NewsWeb (Oslo Børs)** | `https://newsweb.oslobors.no/` | Firecrawl (Headless Browser) |
| **Finansavisen PR** | `https://www.finansavisen.no/siste/pressemeldinger` | Firecrawl (Headless Browser) |

**Purpose:** Captures official stock exchange announcements and press releases often missed by mainstream news.

---

## 4. Job Boards

| Source | Search Query | Method |
|---|---|---|
| **FINN.no** | `Lederstillinger (CEO, CFO, COO, Interim)` | Firecrawl |

**Triggers:**
- "Interim", "Midlertidig", "Snarlig tiltredelse"
- High-level C-suite roles in Oslo/Viken area.
