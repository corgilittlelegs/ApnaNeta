# Apna Neta (अपना नेता)
### Automated Political Accountability Infrastructure in India

> **100% Free & Open-Source Civic Intelligence Platform**  
> Autonomous Ingestion, Multimodal Document AI (Gemini 3.8 Flash), Double-Entry Forensic Auditing, and Multi-Dimensional Governance Tracking.

---

## 🚀 Key Features

1. **Autonomous Cloud Crawling**: Scheduled **GitHub Actions** cron workers poll the Election Commission of India (ECI), `sansad.in`, and MoSPI portals without requiring a local machine running 24/7.
2. **Multimodal Document AI (Gemini 3.8 Flash)**: Extracts handwritten, stamped, and complex tabular Form 26 electoral affidavits directly into verified, structured JSON using Google AI Studio's free tier (up to 1,500 requests/day).
3. **Double-Entry Forensic Auditing**: 
   - Compares itemized Part A assets against Part B abstract totals ($\Delta_{\text{movable}}, \Delta_{\text{immovable}}$) to detect arithmetic variances.
   - Computes the **Wealth Discrepancy Ratio (WDR)** against 5-year Income Tax Returns (ITR).
4. **Visual Proof-of-Source (Section 79 Safe Harbor)**: Every data point links to an interactive **PDF.js Canvas Bounding-Box Overlay** showing the exact notarized row and signature from the candidate's sworn filing.
5. **Continuous Governance Tracking**: Tracks Parliamentary attendance, Question Hour activity, MPLADS spending velocity, and defection dynamics.
6. **DPDPA 2023 Compliant**: Built-in PII redaction that automatically masks PANs, bank accounts, and personal phone numbers under Section 3(c)(ii) statutory exemptions.

---

## 🏗️ 100% Free Cloud Architecture

* **Cloud Ingestion & Cron**: GitHub Actions (2,000 free minutes/month)
* **Document AI (Tier 3)**: Google AI Studio Gemini 3.8 Flash (1,500 free requests/day)
* **Cloud Database & Live API**: Supabase Free Tier (500 MB PostgreSQL + PostgREST)
* **Document & Image Storage**: Cloudflare R2 (10 GB free storage, $0 egress fees)
* **Public Web Portal**: Cloudflare Pages (Unlimited visitor traffic, global CDN)

---

## 🛠️ Quick Start (100% Online)

### 1. Configure Cloud Secrets
In your GitHub repository settings under **Settings > Secrets and variables > Actions**, add the following free secrets:
* `SUPABASE_URL`: Your free Supabase project URL (e.g. `https://xyz.supabase.co`)
* `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role secret
* `GEMINI_API_KEY`: Your free Google AI Studio API key (from [aistudio.google.com](https://aistudio.google.com/))
* `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`: From your free Cloudflare dashboard

### 2. Initialize Database Tables
Open the **SQL Editor** in your Supabase dashboard and paste the contents of:
[`src/storage/schema.sql`](src/storage/schema.sql)

### 3. Run Cloud Seed Data Ingestion
Navigate to the **Actions** tab in your GitHub repository, select **"Seed Database with Indian Parliamentarians"**, and click **Run workflow**. 
This will stream 8,368 Indian parliamentarians directly into your Supabase database in the cloud with zero disk usage on your personal laptop.

---

## 📂 Repository Structure

```
apnaneta/
├── .github/
│   └── workflows/
│       └── seed_database.yml       # Cloud ingestion of 8,368 Indian MPs
├── config/
│   └── settings.py                 # Environment configuration
├── src/
│   ├── ingestion/
│   │   └── seed_loaders.py         # OpenSanctions & TCPD streaming loaders
│   ├── parsing/
│   │   └── schemas.py              # Canonical Pydantic Form 26 models & BBoxes
│   ├── storage/
│   │   ├── schema.sql              # Supabase PostgreSQL tables & indexes
│   │   └── supabase_client.py      # Async PostgREST client
│   └── verification/               # Math reconciler & WDR analyzers
├── tests/
│   └── test_schemas.py             # Automated unit tests
├── pyproject.toml                  # Python 3.12 dependencies
└── README.md
```
