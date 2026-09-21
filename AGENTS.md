# AGENTS.md — Operational Guide for AI Assistants & Autonomous Agents

This document provides architectural standards, operational directives, security policies, and development workflows for AI coding assistants and autonomous agents working on the **ApnaNeta** repository.

---

## 1. Project Overview

**ApnaNeta** is an open-source, non-partisan civic-technology ledger for Indian electoral transparency. It tracks:
- **Electoral Affidavits (ECI Form 26)**: Candidate net worth, itemized assets/liabilities, 5-year ITR declarations, criminal charges, and educational qualifications.
- **Parliamentary Performance (Sansad API)**: Attendance rates, debates participated, and questions raised in Lok Sabha and Rajya Sabha.
- **Development Funds (MoSPI e-SAKSHI MPLADS)**: ₹25 Cr/term constituency allocations, expenditure velocity, unspent treasury balances, itemized public works, and GIS satellite verification for ghost project detection.
- **Corporate Registry & Conflicts (MCA21 / CPPP)**: Directorships (DIN), company affiliations (CIN), and commercial procurement tenders cross-referenced against Section 9A of the Representation of the People Act, 1951.

---

## 2. Core Directives & Invariants

### 🚫 STRICT ZERO-SYNTHETIC-DATA INVARIANT
- **NEVER seed, generate, or commit synthetic, mock, or placeholder candidate data.**
- All candidate records, financials, criminal cases, and public works MUST originate from authentic government portals or verified open datasets (ECI, e-SAKSHI, Sansad, Wikidata).
- If the live Supabase database is unconfigured or unavailable, the application MUST display an informative disconnected/empty state rather than falling back to hardcoded mock candidates.

---

## 3. Technology Stack & Directory Map

| Layer | Technologies |
| :--- | :--- |
| **Backend & Ingestion** | Python 3.12, `httpx`, `curl_cffi`, `pydantic`, `google-genai` (Gemini 3.8 Flash), `pymupdf` (`fitz`), `boto3` |
| **Database & Storage** | Supabase (PostgreSQL 15+ with PostgREST), Cloudflare R2 (S3-compatible PDF archive) |
| **Frontend Web App** | React 18, TypeScript, Tailwind CSS, Vite 6, Phosphor Icons, Lucide React, Cloudflare Pages |
| **CI/CD Automation** | GitHub Actions workflows (`.github/workflows/`) |

### Repository Structure
```
ApnaNeta/
├── .github/workflows/          # Ingestion & deployment automation workflows
│   ├── extract_affidavits.yml  # Gemini Flash Form 26 multimodal extraction worker
│   ├── scrape_eci.yml          # ECI Playwright candidate & affidavit scraper
│   ├── sync_mplads.yml         # MoSPI & e-SAKSHI development works sync + GIS audit
│   ├── scrape_sansad.yml       # Parliamentary debates, questions & attendance sync
│   └── deploy_web.yml          # Cloudflare Pages frontend deployment
├── config/
│   └── settings.py             # Application settings & environment variables
├── src/
│   ├── ingestion/              # Ingestion crawlers (ECI, e-SAKSHI, Sansad, Wikidata)
│   ├── parsing/                # Gemini VLM client, Pydantic schemas, OCR
│   ├── storage/                # Supabase client, R2 storage, schema.sql
│   ├── utils/                  # PII sanitizer (DPDPA 2023), rate limiters
│   └── verification/           # Double-entry math reconciler, GIS verifier, legal classifier
├── tests/                      # Python unit & security test suite
├── web/                        # Vite + React frontend web application
│   ├── public/_headers         # HSTS, CSP, X-Frame-Options, security headers
│   ├── src/                    # UI components, contexts, and Supabase live query
│   └── wrangler.toml           # Cloudflare Pages deployment configuration
├── AGENTS.md                   # This file
└── README.md                   # Project overview and citizen guide
```

---

## 4. Security Policies & Mandatory Guards

### 🛡️ SSRF (Server-Side Request Forgery) Prevention
- Any network request fetching external documents or PDFs **MUST** be validated using `is_allowed_pdf_url()` from `src.ingestion.eci_affidavits`.
- **Whitelisted Domains**: `*.eci.gov.in`, `affidavit.eci.gov.in`, `affidavitresults.eci.gov.in`, `suvidha.eci.gov.in`.
- **Prohibited Endpoints**: Direct IP addresses (e.g. AWS/GCP metadata `169.254.169.254`, localhost `127.0.0.1`, private VPC subnets) and non-HTTP/HTTPS schemes are strictly rejected before opening sockets.

### 🔒 DPDPA 2023 Privacy Compliance (PII Sanitization)
- Under Section 3(c)(ii) of the Digital Personal Data Protection Act (DPDPA) 2023, sensitive personal identifiers must be masked before persistence or presentation:
  - **PAN**: `mask_pan()` -> `XXXXX1234F`
  - **Aadhaar**: `mask_aadhaar()` -> `XXXXXXXX0123`
  - **Phone Numbers**: `mask_phone()` -> `XXXXXX3210`
  - **Bank Accounts**: `mask_bank_account()` -> `XXXXXXX8901`
- Always apply `sanitize_payload()` (`src/utils/pii_sanitizer.py`) to raw extraction dictionaries before writing to Supabase.

### ⚡ GitHub Actions Script Injection Hardening
- **Never interpolate workflow inputs directly into inline bash scripts** (e.g., `if [ "${{ inputs.flag }}" = "true" ];`).
- **Always pass inputs through the `env:` block**:
  ```yaml
  env:
    MY_FLAG: ${{ inputs.flag || 'false' }}
  run: |
    if [ "$MY_FLAG" = "true" ]; then
      ...
    fi
  ```

### 🗄️ Database Least Privilege & RLS
- Supabase Row-Level Security (RLS) is enabled on all tables (`src/storage/schema.sql`).
- The anonymous public role (`anon`) has read-only `SELECT` access.
- `service_role` authority is strictly restricted to backend ingestion scripts executed via secure GitHub Actions secrets.
- Anonymous PostgREST queries must never fetch `affidavits.raw_payload`.

---

## 5. Standard Commands

### Python Unit & Security Tests
```bash
python3 -m unittest discover tests
```

### Frontend Development & Build
```bash
cd web
npm install
npm run dev     # Start local Vite development server
npm run build   # Typecheck (tsc) & produce production bundle in dist/
```

### Ingestion Scripts Execution
```bash
# Form 26 Gemini AI Extraction
python -m src.ingestion.extract_affidavits --limit 5

# MoSPI MPLADS Fund Tracking & e-SAKSHI Works Crawl
python -m src.ingestion.mospi_mplads
python -m src.ingestion.esakshi_crawler
python -m src.verification.gis_verifier

# Sansad Parliamentary Sync
python -m src.ingestion.sansad_api
```

---

## 6. Guidelines for AI Agents Modifying This Codebase

1. **Verify Before and After**: Always run `python3 -m unittest discover tests` and `cd web && npm run build` before concluding changes.
2. **Preserve Documentation**: Maintain existing docstrings, legal statutory citations (RPA 1951, DPDPA 2023, MoSPI Guidelines), and comments.
3. **No Synthetic Fallbacks**: If an API or external dependency fails, fail gracefully with clear logging; never introduce fake data generators.
4. **Follow Least Privilege**: Never expose API keys or service role secrets in client-side code or git commits.
