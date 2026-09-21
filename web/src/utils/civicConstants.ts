/**
 * Centralized Civic & Forensic Constants for Apna Neta
 * Used for real-world impact calculations, forensic audit thresholds, and wealth tier classifications.
 */

export const CIVIC_IMPACT_BENCHMARKS = {
  // Standard 5-year MPLADS entitlement per Lok Sabha MP (₹5 Cr / year = ₹25 Cr)
  DEFAULT_5YR_MPLADS_ENTITLEMENT: 250000000,
  // Estimated cost per Primary Health Center / Mohalla Clinic (₹25 Lakh)
  COST_PER_PRIMARY_CLINIC: 2500000,
  // Estimated cost per km of rural road or community solar street lighting (₹15 Lakh)
  COST_PER_KM_COMMUNITY_INFRA: 1500000,
  // Minimum unspent balance to trigger "What this means for you" civic callout (₹2 Crore)
  MIN_UNSPENT_BALANCE_FOR_CALLOUT: 20000000,
} as const;

export const CIVIC_THRESHOLDS = {
  // MPLADS fund spending percentages
  MPLADS_LOW_SPEND_PERCENT: 60,
  MPLADS_FAIR_SPEND_PERCENT: 75,
  MPLADS_GOOD_SPEND_PERCENT: 80,

  // Parliament attendance percentages
  ATTENDANCE_LOW_PERCENT: 65,
  ATTENDANCE_FAIR_PERCENT: 80,
  ATTENDANCE_HIGH_PERCENT: 85,

  // Wealth accumulation thresholds
  WEALTH_RAPID_SURGE_PERCENT: 300, // 300%+ increase over 5 years flags rapid accumulation
  WEALTH_DISCREPANCY_RATIO_MODERATE: 3, // Net worth > 3x 5-yr declared taxable income
  WEALTH_DISCREPANCY_RATIO_HIGH: 10, // Net worth > 10x 5-yr declared taxable income
} as const;

export const WEALTH_TIERS = {
  TIER_100CR_PLUS: 1000000000, // ₹100 Crore
  TIER_10CR_TO_100CR: 100000000, // ₹10 Crore
  TIER_1CR_TO_10CR: 10000000, // ₹1 Crore
} as const;

export const CIVIC_METADATA = {
  DEFAULT_FILING_YEAR: 2024,
  LOK_SABHA_TOTAL_SEATS: 543,
} as const;
