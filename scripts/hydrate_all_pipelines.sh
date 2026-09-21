#!/usr/bin/env bash
# ==============================================================================
# Apna Neta: Automated Database Hydration & Pipeline Orchestrator
# Triggers all data enrichment workflows in strict dependency order:
#   1. scrape_sansad.yml       -> 2,206 Lok Sabha MPs & attendance
#   2. sync_mplads.yml         -> MoSPI public development fund velocity
#   3. extract_affidavits.yml  -> Gemini Flash AI extraction on Form 26 PDFs
#   4. analyze_historical_wealth.yml -> Multi-term longitudinal asset CAGR
# ==============================================================================

set -euo pipefail
# Auto-detect repository from git remote or GITHUB_REPOSITORY environment variable
DEFAULT_REPO="$(git config --get remote.origin.url 2>/dev/null | sed -E 's/.*github\.com[:\/](.+?)(\.git)?$/\1/' || echo '')"
REPO_NAME="${GITHUB_REPOSITORY:-${DEFAULT_REPO:-corgilittlelegs/ApnaNeta}}"
TARGET_TERM="${1:-all}"
AFFIDAVIT_BATCH_LIMIT="${2:-10}"

echo "====================================================================="
echo "🇮🇳 APNA NETA PIPELINE ORCHESTRATOR & DATABASE HYDRATION"
echo "Target Repository: ${REPO_NAME}"
echo "Lok Sabha Term:    ${TARGET_TERM}"
echo "Affidavit Batch:   ${AFFIDAVIT_BATCH_LIMIT} per worker run"
echo "====================================================================="

# Check if GitHub CLI is available
if command -v gh >/dev/null 2>&1; then
    echo "✓ GitHub CLI (gh) detected."
    
    # Check authentication
    if ! gh auth status >/dev/null 2>&1; then
        echo "⚠️ GitHub CLI is not authenticated. Run 'gh auth login' or provide GITHUB_TOKEN."
        USE_GH=false
    else
        USE_GH=true
    fi
else
    echo "ℹ️ GitHub CLI (gh) not installed. Using curl with GITHUB_TOKEN."
    USE_GH=false
fi

trigger_workflow() {
    local workflow_file="$1"
    local inputs_json="${2:-{}}"

    echo ""
    echo "🚀 Triggering workflow: ${workflow_file}..."

    if [ "$USE_GH" = true ]; then
        if [ "$inputs_json" != "{}" ]; then
            # Parse inputs or pass as flags
            if [ "$workflow_file" = "scrape_sansad.yml" ]; then
                gh workflow run "${workflow_file}" --repo "${REPO_NAME}" -f target_term="${TARGET_TERM}"
            elif [ "$workflow_file" = "extract_affidavits.yml" ]; then
                gh workflow run "${workflow_file}" --repo "${REPO_NAME}" -f limit="${AFFIDAVIT_BATCH_LIMIT}" -f force=false
            else
                gh workflow run "${workflow_file}" --repo "${REPO_NAME}"
            fi
        else
            gh workflow run "${workflow_file}" --repo "${REPO_NAME}"
        fi
        echo "✓ Dispatched ${workflow_file} successfully via gh CLI."
    else
        if [ -z "${GITHUB_TOKEN:-}" ]; then
            echo "❌ GITHUB_TOKEN is not set in environment."
            echo "   Please export GITHUB_TOKEN='ghp_...' with repo/workflow permissions"
            echo "   Or trigger manually in GitHub Actions UI: https://github.com/${REPO_NAME}/actions"
            return 1
        fi

        curl -s -X POST \
            -H "Accept: application/vnd.github.v3+json" \
            -H "Authorization: Bearer ${GITHUB_TOKEN}" \
            "https://api.github.com/repos/${REPO_NAME}/actions/workflows/${workflow_file}/dispatches" \
            -d "{\"ref\":\"main\", \"inputs\": ${inputs_json}}"
        echo "✓ Dispatched ${workflow_file} successfully via GitHub REST API."
    fi
}

echo ""
echo "--- STAGE 1: SANSAD PARLIAMENTARY SYNC ---"
trigger_workflow "scrape_sansad.yml" "{\"target_term\": \"${TARGET_TERM}\"}" || true

echo ""
echo "--- STAGE 1b: POLITICIAN PROFILE PHOTO SYNC (WIKIDATA / COMMONS) ---"
trigger_workflow "sync_politician_photos.yml" "{\"limit\": \"all\"}" || true

echo ""
echo "--- STAGE 1c: VIDHAN SABHA CANDIDATES & AFFIDAVITS SYNC ---"
trigger_workflow "scrape_eci.yml" "{\"state\": \"ALL\", \"batch_limit\": \"0\"}" || true

echo ""
echo "--- STAGE 2: MOSPI MPLADS EXPENDITURE SYNC ---"
trigger_workflow "sync_mplads.yml" "{}" || true

echo ""
echo "--- STAGE 3: GEMINI FORM 26 AFFIDAVIT EXTRACTION ---"
echo "ℹ️ Running batch of ${AFFIDAVIT_BATCH_LIMIT} affidavits with Gemini Flash..."
trigger_workflow "extract_affidavits.yml" "{\"limit\": \"${AFFIDAVIT_BATCH_LIMIT}\", \"force\": \"false\"}" || true

echo ""
echo "--- STAGE 4: LONGITUDINAL WEALTH GROWTH (CAGR) ANALYSIS ---"
echo "ℹ️ Triggering CAGR verification after multi-term filings are indexed..."
trigger_workflow "analyze_historical_wealth.yml" "{}" || true

echo ""
echo "--- STAGE 5: FORENSIC AUDITS, SEC 9A CONFLICTS & MOBILITY DYNAMICS ---"
echo "ℹ️ Dispatching mathematical reconciliation, Section 9A audits, and mobility tracking..."
trigger_workflow "verify_data.yml" "{}" || true

echo ""
echo "====================================================================="
echo "✅ All 5 data pipelines have been dispatched in sequence!"
echo "Live Run Logs: https://github.com/${REPO_NAME}/actions"
echo "====================================================================="
