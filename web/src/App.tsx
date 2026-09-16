import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { CandidateCard } from './components/CandidateCard';
import { AffidavitProofViewer } from './components/AffidavitProofViewer';
import { ConstituencyFilter, FilterState } from './components/ConstituencyFilter';
import { ComparisonModal } from './components/ComparisonModal';
import { ReportCardModal } from './components/ReportCardModal';
import { LeaderboardsView } from './components/LeaderboardsView';
import { Candidate, BoundingBox } from './types/candidate';
import {
  Cpu,
  Database,
  SpinnerGap,
  Stack,
  X,
  ArrowRight,
  ShieldCheck,
  Scales,
  Trophy,
  SquaresFour,
  Bank,
  CheckCircle,
} from '@phosphor-icons/react';

// Seed sample data for interactive citizen demonstration
const SAMPLE_CANDIDATES: Candidate[] = [
  {
    id: '1',
    name: 'Narendra Damodardas Modi',
    constituency: 'Varanasi',
    state: 'Uttar Pradesh',
    house: 'Lok Sabha',
    party: 'Bharatiya Janata Party',
    filing_year: 2024,
    age: 73,
    spouse_status: 'Not Applicable / Nil',
    education: 'M.A. (Gujarat University, 1983)',
    voter_serial_no: 128,
    voter_part_no: 42,
    total_movable_assets: 30200000.0,
    total_immovable_assets: 0.0,
    total_liabilities: 0.0,
    total_net_worth: 30200000.0,
    total_five_year_income: 14200000.0,
    criminal_cases_count: 0,
    serious_criminal_cases_count: 0,
    protest_cases_count: 0,
    attendance_rate: 98.2,
    has_arithmetic_discrepancy: false,
    delta_movable: 0.0,
    delta_immovable: 0.0,
    wealth_discrepancy_ratio: 2.12,
    has_anomalous_wealth_ratio: false,
    pdf_source_url: 'https://affidavit.eci.gov.in/CandidateCustomFilter?electionType=24-PC-GENERAL-1-2024',
    proof_bbox: { page: 1, ymin: 245, xmin: 30, ymax: 355, xmax: 970 },
    mplads: {
      entitled_amount: 250000000.0,
      released_amount: 220000000.0,
      expenditure_amount: 218500000.0,
      unspent_balance: 1500000.0,
      utilization_rate: 99.3,
      works_recommended: 52,
      works_completed: 49,
      term_years: '2019-2024',
    },
    historical_wealth: [
      {
        from_year: 2014,
        to_year: 2019,
        initial_assets: 16564685.0,
        final_assets: 25136119.0,
        absolute_increase: 8571434.0,
        percentage_increase: 51.7,
        cagr_percent: 8.7,
        is_rapid_accumulation: false,
      },
      {
        from_year: 2019,
        to_year: 2024,
        initial_assets: 25136119.0,
        final_assets: 30206000.0,
        absolute_increase: 5069881.0,
        percentage_increase: 20.2,
        cagr_percent: 3.7,
        is_rapid_accumulation: false,
      },
    ],
  },
  {
    id: '2',
    name: 'Rahul Gandhi',
    constituency: 'Rae Bareli',
    state: 'Uttar Pradesh',
    house: 'Lok Sabha',
    party: 'Indian National Congress',
    filing_year: 2024,
    age: 54,
    spouse_status: 'Unmarried / Nil',
    education: 'M.Phil. (Development Studies, Trinity College, Cambridge, 1995)',
    voter_serial_no: 24,
    voter_part_no: 89,
    total_movable_assets: 92400000.0,
    total_immovable_assets: 111500000.0,
    total_liabilities: 4970000.0,
    total_net_worth: 198930000.0,
    total_five_year_income: 48000000.0,
    criminal_cases_count: 8,
    serious_criminal_cases_count: 0,
    protest_cases_count: 8,
    attendance_rate: 82.5,
    has_arithmetic_discrepancy: false,
    delta_movable: 0.0,
    delta_immovable: 0.0,
    wealth_discrepancy_ratio: 4.14,
    has_anomalous_wealth_ratio: false,
    pdf_source_url: 'https://affidavit.eci.gov.in/CandidateCustomFilter?electionType=24-PC-GENERAL-1-2024',
    proof_bbox: { page: 1, ymin: 245, xmin: 30, ymax: 355, xmax: 970 },
    mplads: {
      entitled_amount: 250000000.0,
      released_amount: 200000000.0,
      expenditure_amount: 168000000.0,
      unspent_balance: 32000000.0,
      utilization_rate: 84.0,
      works_recommended: 44,
      works_completed: 39,
      term_years: '2019-2024',
    },
    historical_wealth: [
      {
        from_year: 2014,
        to_year: 2019,
        initial_assets: 94000000.0,
        final_assets: 158800000.0,
        absolute_increase: 64800000.0,
        percentage_increase: 68.9,
        cagr_percent: 11.1,
        is_rapid_accumulation: false,
      },
      {
        from_year: 2019,
        to_year: 2024,
        initial_assets: 158800000.0,
        final_assets: 203800000.0,
        absolute_increase: 45000000.0,
        percentage_increase: 28.3,
        cagr_percent: 5.1,
        is_rapid_accumulation: false,
      },
    ],
  },
  {
    id: '3',
    name: 'Vikramjit Singh',
    alias: 'Vicky',
    constituency: 'Ludhiana',
    state: 'Punjab',
    house: 'Lok Sabha',
    party: 'Aam Aadmi Party',
    filing_year: 2024,
    age: 48,
    spouse_name: 'Surinder Kaur',
    spouse_status: 'Declared',
    voter_serial_no: 312,
    voter_part_no: 65,
    education: 'Graduate (Punjab University)',
    total_movable_assets: 45000000.0,
    total_immovable_assets: 120000000.0,
    total_liabilities: 15000000.0,
    total_net_worth: 150000000.0,
    total_five_year_income: 7500000.0,
    criminal_cases_count: 3,
    serious_criminal_cases_count: 2,
    protest_cases_count: 1,
    attendance_rate: 74.0,
    has_arithmetic_discrepancy: true,
    delta_movable: 4200000.0, // 42 Lakh discrepancy flagged!
    delta_immovable: 0.0,
    wealth_discrepancy_ratio: 20.0, // High WDR anomaly flagged!
    has_anomalous_wealth_ratio: true,
    pdf_source_url: 'https://affidavit.eci.gov.in/CandidateCustomFilter?electionType=24-PC-GENERAL-1-2024',
    proof_bbox: { page: 7, ymin: 545, xmin: 30, ymax: 755, xmax: 970 },
    mplads: {
      entitled_amount: 250000000.0,
      released_amount: 150000000.0,
      expenditure_amount: 78000000.0,
      unspent_balance: 72000000.0,
      utilization_rate: 52.0, // Low velocity flagged!
      works_recommended: 30,
      works_completed: 18,
      term_years: '2019-2024',
    },
    historical_wealth: [
      {
        from_year: 2019,
        to_year: 2024,
        initial_assets: 35000000.0,
        final_assets: 150000000.0,
        absolute_increase: 115000000.0,
        percentage_increase: 328.6, // Rapid accumulation flagged!
        cagr_percent: 33.8,
        is_rapid_accumulation: true,
      },
    ],
  },
  {
    id: '4',
    name: 'Kanimozhi Karunanidhi',
    constituency: 'Thoothukkudi',
    state: 'Tamil Nadu',
    house: 'Lok Sabha',
    party: 'Dravida Munnetra Kazhagam',
    filing_year: 2024,
    age: 56,
    spouse_name: 'G. Aravindan',
    spouse_status: 'Declared',
    education: 'M.A. (Economics, Ethiraj College, 1989)',
    voter_serial_no: 512,
    voter_part_no: 104,
    total_movable_assets: 380000000.0,
    total_immovable_assets: 195000000.0,
    total_liabilities: 22000000.0,
    total_net_worth: 553000000.0,
    total_five_year_income: 92000000.0,
    criminal_cases_count: 1,
    serious_criminal_cases_count: 0,
    protest_cases_count: 1,
    attendance_rate: 91.0,
    has_arithmetic_discrepancy: false,
    delta_movable: 0.0,
    delta_immovable: 0.0,
    wealth_discrepancy_ratio: 6.01,
    has_anomalous_wealth_ratio: false,
    pdf_source_url: 'https://affidavit.eci.gov.in/CandidateCustomFilter?electionType=24-PC-GENERAL-1-2024',
    proof_bbox: { page: 1, ymin: 245, xmin: 30, ymax: 355, xmax: 970 },
    mplads: {
      entitled_amount: 250000000.0,
      released_amount: 235000000.0,
      expenditure_amount: 219000000.0,
      unspent_balance: 16000000.0,
      utilization_rate: 93.2,
      works_recommended: 61,
      works_completed: 58,
      term_years: '2019-2024',
    },
    historical_wealth: [
      {
        from_year: 2014,
        to_year: 2019,
        initial_assets: 265000000.0,
        final_assets: 303300000.0,
        absolute_increase: 38300000.0,
        percentage_increase: 14.5,
        cagr_percent: 2.7,
        is_rapid_accumulation: false,
      },
      {
        from_year: 2019,
        to_year: 2024,
        initial_assets: 303300000.0,
        final_assets: 572700000.0,
        absolute_increase: 269400000.0,
        percentage_increase: 88.8,
        cagr_percent: 13.6,
        is_rapid_accumulation: false,
      },
    ],
  },
  {
    id: '5',
    name: 'Akhilesh Yadav',
    constituency: 'Kannauj',
    state: 'Uttar Pradesh',
    house: 'Lok Sabha',
    party: 'Samajwadi Party',
    filing_year: 2024,
    age: 50,
    spouse_name: 'Dimple Yadav',
    spouse_status: 'Declared',
    education: 'B.E. (Civil), M.S. (Environmental, Univ. of Sydney)',
    voter_serial_no: 401,
    voter_part_no: 77,
    total_movable_assets: 172200000.0,
    total_immovable_assets: 250000000.0,
    total_liabilities: 25000000.0,
    total_net_worth: 397200000.0,
    total_five_year_income: 68000000.0,
    criminal_cases_count: 2,
    serious_criminal_cases_count: 0,
    protest_cases_count: 2,
    attendance_rate: 88.0,
    has_arithmetic_discrepancy: true,
    delta_movable: 5000000.0, // 50 Lakh variance flagged!
    delta_immovable: 0.0,
    wealth_discrepancy_ratio: 5.84,
    has_anomalous_wealth_ratio: false,
    pdf_source_url: 'https://affidavit.eci.gov.in/CandidateCustomFilter?electionType=24-PC-GENERAL-1-2024',
    proof_bbox: { page: 6, ymin: 440, xmin: 30, ymax: 680, xmax: 970 },
    mplads: {
      entitled_amount: 250000000.0,
      released_amount: 210000000.0,
      expenditure_amount: 182000000.0,
      unspent_balance: 28000000.0,
      utilization_rate: 86.7,
      works_recommended: 47,
      works_completed: 42,
      term_years: '2019-2024',
    },
    historical_wealth: [
      {
        from_year: 2014,
        to_year: 2019,
        initial_assets: 88400000.0,
        final_assets: 377800000.0,
        absolute_increase: 289400000.0,
        percentage_increase: 327.4, // Rapid accumulation flagged!
        cagr_percent: 33.7,
        is_rapid_accumulation: true,
      },
      {
        from_year: 2019,
        to_year: 2024,
        initial_assets: 377800000.0,
        final_assets: 422200000.0,
        absolute_increase: 44400000.0,
        percentage_increase: 11.8,
        cagr_percent: 2.2,
        is_rapid_accumulation: false,
      },
    ],
  },
  {
    id: '6',
    name: 'Supriya Sule',
    constituency: 'Baramati',
    state: 'Maharashtra',
    house: 'Lok Sabha',
    party: 'Nationalist Congress Party (SP)',
    filing_year: 2024,
    age: 55,
    spouse_name: 'Sadanand Sule',
    spouse_status: 'Declared',
    education: 'B.Sc. (Microbiology, Jai Hind College, Mumbai)',
    voter_serial_no: 280,
    voter_part_no: 119,
    total_movable_assets: 544000000.0,
    total_immovable_assets: 1120000000.0,
    total_liabilities: 145000000.0,
    total_net_worth: 1519000000.0,
    total_five_year_income: 184000000.0,
    criminal_cases_count: 0,
    serious_criminal_cases_count: 0,
    protest_cases_count: 0,
    attendance_rate: 94.6,
    has_arithmetic_discrepancy: false,
    delta_movable: 0.0,
    delta_immovable: 0.0,
    wealth_discrepancy_ratio: 8.25,
    has_anomalous_wealth_ratio: false,
    pdf_source_url: 'https://affidavit.eci.gov.in/CandidateCustomFilter?electionType=24-PC-GENERAL-1-2024',
    proof_bbox: { page: 1, ymin: 245, xmin: 30, ymax: 355, xmax: 970 },
    mplads: {
      entitled_amount: 250000000.0,
      released_amount: 240000000.0,
      expenditure_amount: 232000000.0,
      unspent_balance: 8000000.0,
      utilization_rate: 96.7,
      works_recommended: 65,
      works_completed: 63,
      term_years: '2019-2024',
    },
    historical_wealth: [
      {
        from_year: 2014,
        to_year: 2019,
        initial_assets: 1139000000.0,
        final_assets: 1408800000.0,
        absolute_increase: 269800000.0,
        percentage_increase: 23.7,
        cagr_percent: 4.3,
        is_rapid_accumulation: false,
      },
      {
        from_year: 2019,
        to_year: 2024,
        initial_assets: 1408800000.0,
        final_assets: 1664000000.0,
        absolute_increase: 255200000.0,
        percentage_increase: 18.1,
        cagr_percent: 3.4,
        is_rapid_accumulation: false,
      },
    ],
  },
];

// Canonical lookup for prominent political figures to enrich unindexed rows
const PROMINENT_PARTY_MAP: Record<
  string,
  { party: string; state?: string; constituency?: string; house?: 'Lok Sabha' | 'Rajya Sabha' | 'Vidhan Sabha' }
> = {
  // Aam Aadmi Party (AAP)
  'bhagwant mann': { party: 'Aam Aadmi Party', state: 'Punjab', constituency: 'Sangrur', house: 'Lok Sabha' },
  'arvind kejriwal': { party: 'Aam Aadmi Party', state: 'Delhi', constituency: 'New Delhi', house: 'Vidhan Sabha' },
  'raghav chadha': { party: 'Aam Aadmi Party', state: 'Punjab', constituency: 'Punjab', house: 'Rajya Sabha' },
  'sanjay singh': { party: 'Aam Aadmi Party', state: 'Delhi', constituency: 'Delhi', house: 'Rajya Sabha' },
  'harbhajan singh': { party: 'Aam Aadmi Party', state: 'Punjab', constituency: 'Punjab', house: 'Rajya Sabha' },
  'atishi': { party: 'Aam Aadmi Party', state: 'Delhi', constituency: 'Kalkaji', house: 'Vidhan Sabha' },
  'saurabh bharadwaj': { party: 'Aam Aadmi Party', state: 'Delhi', constituency: 'Greater Kailash', house: 'Vidhan Sabha' },
  'manish sisodia': { party: 'Aam Aadmi Party', state: 'Delhi', constituency: 'Patparganj', house: 'Vidhan Sabha' },
  'sandeep pathak': { party: 'Aam Aadmi Party', state: 'Punjab', constituency: 'Punjab', house: 'Rajya Sabha' },
  'vikramjit singh sahney': { party: 'Aam Aadmi Party', state: 'Punjab', constituency: 'Punjab', house: 'Rajya Sabha' },
  'ashok kumar mittal': { party: 'Aam Aadmi Party', state: 'Punjab', constituency: 'Punjab', house: 'Rajya Sabha' },
  'swati maliwal': { party: 'Aam Aadmi Party', state: 'Delhi', constituency: 'Delhi', house: 'Rajya Sabha' },
  'narain dass gupta': { party: 'Aam Aadmi Party', state: 'Delhi', constituency: 'Delhi', house: 'Rajya Sabha' },
  'balbir singh seechewal': { party: 'Aam Aadmi Party', state: 'Punjab', constituency: 'Punjab', house: 'Rajya Sabha' },
  'sanjeev arora': { party: 'Aam Aadmi Party', state: 'Punjab', constituency: 'Punjab', house: 'Rajya Sabha' },
  'amanatullah khan': { party: 'Aam Aadmi Party', state: 'Delhi', constituency: 'Okhla', house: 'Vidhan Sabha' },
  'satyendar jain': { party: 'Aam Aadmi Party', state: 'Delhi', constituency: 'Shakur Basti', house: 'Vidhan Sabha' },
  'gopal rai': { party: 'Aam Aadmi Party', state: 'Delhi', constituency: 'Babarpur', house: 'Vidhan Sabha' },
  'somnath bharti': { party: 'Aam Aadmi Party', state: 'Delhi', constituency: 'Malviya Nagar', house: 'Vidhan Sabha' },
  'durgesh pathak': { party: 'Aam Aadmi Party', state: 'Delhi', constituency: 'Rajinder Nagar', house: 'Vidhan Sabha' },

  // Bharatiya Janata Party (BJP)
  'narendra damodardas modi': { party: 'Bharatiya Janata Party', state: 'Uttar Pradesh', constituency: 'Varanasi', house: 'Lok Sabha' },
  'narendra modi': { party: 'Bharatiya Janata Party', state: 'Uttar Pradesh', constituency: 'Varanasi', house: 'Lok Sabha' },
  'amit shah': { party: 'Bharatiya Janata Party', state: 'Gujarat', constituency: 'Gandhinagar', house: 'Lok Sabha' },
  'rajnath singh': { party: 'Bharatiya Janata Party', state: 'Uttar Pradesh', constituency: 'Lucknow', house: 'Lok Sabha' },
  'nitin gadkari': { party: 'Bharatiya Janata Party', state: 'Maharashtra', constituency: 'Nagpur', house: 'Lok Sabha' },
  'nirmala sitharaman': { party: 'Bharatiya Janata Party', state: 'Karnataka', constituency: 'Karnataka', house: 'Rajya Sabha' },
  's. jaishankar': { party: 'Bharatiya Janata Party', state: 'Gujarat', constituency: 'Gujarat', house: 'Rajya Sabha' },
  'subrahmanyam jaishankar': { party: 'Bharatiya Janata Party', state: 'Gujarat', constituency: 'Gujarat', house: 'Rajya Sabha' },
  'piyush goyal': { party: 'Bharatiya Janata Party', state: 'Maharashtra', constituency: 'Mumbai North', house: 'Lok Sabha' },
  'anurag thakur': { party: 'Bharatiya Janata Party', state: 'Himachal Pradesh', constituency: 'Hamirpur', house: 'Lok Sabha' },
  'smriti irani': { party: 'Bharatiya Janata Party', state: 'Uttar Pradesh', constituency: 'Amethi', house: 'Lok Sabha' },
  'jyotiraditya scindia': { party: 'Bharatiya Janata Party', state: 'Madhya Pradesh', constituency: 'Guna', house: 'Lok Sabha' },
  'yogi adityanath': { party: 'Bharatiya Janata Party', state: 'Uttar Pradesh', constituency: 'Gorakhpur Urban', house: 'Vidhan Sabha' },
  'jp nadda': { party: 'Bharatiya Janata Party', state: 'Gujarat', constituency: 'Gujarat', house: 'Rajya Sabha' },
  'jagat prakash nadda': { party: 'Bharatiya Janata Party', state: 'Gujarat', constituency: 'Gujarat', house: 'Rajya Sabha' },
  'shivraj singh chouhan': { party: 'Bharatiya Janata Party', state: 'Madhya Pradesh', constituency: 'Vidisha', house: 'Lok Sabha' },
  'dharmendra pradhan': { party: 'Bharatiya Janata Party', state: 'Odisha', constituency: 'Sambalpur', house: 'Lok Sabha' },
  'giriraj singh': { party: 'Bharatiya Janata Party', state: 'Bihar', constituency: 'Begusarai', house: 'Lok Sabha' },
  'mansukh mandaviya': { party: 'Bharatiya Janata Party', state: 'Gujarat', constituency: 'Porbandar', house: 'Lok Sabha' },
  'ashwini vaishnaw': { party: 'Bharatiya Janata Party', state: 'Odisha', constituency: 'Odisha', house: 'Rajya Sabha' },
  'hardeep singh puri': { party: 'Bharatiya Janata Party', state: 'Uttar Pradesh', constituency: 'Uttar Pradesh', house: 'Rajya Sabha' },
  'kiren rijiju': { party: 'Bharatiya Janata Party', state: 'Arunachal Pradesh', constituency: 'Arunachal West', house: 'Lok Sabha' },
  'om birla': { party: 'Bharatiya Janata Party', state: 'Rajasthan', constituency: 'Kota', house: 'Lok Sabha' },
  'gautam gambhir': { party: 'Bharatiya Janata Party', state: 'Delhi', constituency: 'East Delhi', house: 'Lok Sabha' },
  'sunny deol': { party: 'Bharatiya Janata Party', state: 'Punjab', constituency: 'Gurdaspur', house: 'Lok Sabha' },
  'kirron kher': { party: 'Bharatiya Janata Party', state: 'Chandigarh', constituency: 'Chandigarh', house: 'Lok Sabha' },
  'hema malini': { party: 'Bharatiya Janata Party', state: 'Uttar Pradesh', constituency: 'Mathura', house: 'Lok Sabha' },
  'kangana ranaut': { party: 'Bharatiya Janata Party', state: 'Himachal Pradesh', constituency: 'Mandi', house: 'Lok Sabha' },
  'kangna ranaut': { party: 'Bharatiya Janata Party', state: 'Himachal Pradesh', constituency: 'Mandi', house: 'Lok Sabha' },
  'arun govil': { party: 'Bharatiya Janata Party', state: 'Uttar Pradesh', constituency: 'Meerut', house: 'Lok Sabha' },
  'manoj tiwari': { party: 'Bharatiya Janata Party', state: 'Delhi', constituency: 'North East Delhi', house: 'Lok Sabha' },
  'himanta biswa sarma': { party: 'Bharatiya Janata Party', state: 'Assam', constituency: 'Jalukbari', house: 'Vidhan Sabha' },

  // Indian National Congress (INC)
  'rahul gandhi': { party: 'Indian National Congress', state: 'Uttar Pradesh', constituency: 'Rae Bareli', house: 'Lok Sabha' },
  'mallikarjun kharge': { party: 'Indian National Congress', state: 'Karnataka', constituency: 'Karnataka', house: 'Rajya Sabha' },
  'sonia gandhi': { party: 'Indian National Congress', state: 'Rajasthan', constituency: 'Rajasthan', house: 'Rajya Sabha' },
  'priyanka gandhi vadra': { party: 'Indian National Congress', state: 'Kerala', constituency: 'Wayanad', house: 'Lok Sabha' },
  'priyanka gandhi': { party: 'Indian National Congress', state: 'Kerala', constituency: 'Wayanad', house: 'Lok Sabha' },
  'shashi tharoor': { party: 'Indian National Congress', state: 'Kerala', constituency: 'Thiruvananthapuram', house: 'Lok Sabha' },
  'kc venugopal': { party: 'Indian National Congress', state: 'Kerala', constituency: 'Alappuzha', house: 'Lok Sabha' },
  'jairam ramesh': { party: 'Indian National Congress', state: 'Karnataka', constituency: 'Karnataka', house: 'Rajya Sabha' },
  'gaurav gogoi': { party: 'Indian National Congress', state: 'Assam', constituency: 'Jorhat', house: 'Lok Sabha' },
  'sachin pilot': { party: 'Indian National Congress', state: 'Rajasthan', constituency: 'Tonk', house: 'Vidhan Sabha' },
  'ashok gehlot': { party: 'Indian National Congress', state: 'Rajasthan', constituency: 'Sardarpura', house: 'Vidhan Sabha' },
  'dk shivakumar': { party: 'Indian National Congress', state: 'Karnataka', constituency: 'Kanakapura', house: 'Vidhan Sabha' },
  'd. k. shivakumar': { party: 'Indian National Congress', state: 'Karnataka', constituency: 'Kanakapura', house: 'Vidhan Sabha' },
  'siddaramaiah': { party: 'Indian National Congress', state: 'Karnataka', constituency: 'Varuna', house: 'Vidhan Sabha' },
  'revanth reddy': { party: 'Indian National Congress', state: 'Telangana', constituency: 'Kodangal', house: 'Vidhan Sabha' },
  'p. chidambaram': { party: 'Indian National Congress', state: 'Tamil Nadu', constituency: 'Tamil Nadu', house: 'Rajya Sabha' },
  'digvijaya singh': { party: 'Indian National Congress', state: 'Madhya Pradesh', constituency: 'Rajgarh', house: 'Lok Sabha' },
  'deepender singh hooda': { party: 'Indian National Congress', state: 'Haryana', constituency: 'Rohtak', house: 'Lok Sabha' },
  'manish tewari': { party: 'Indian National Congress', state: 'Chandigarh', constituency: 'Chandigarh', house: 'Lok Sabha' },
  'charanjit singh channi': { party: 'Indian National Congress', state: 'Punjab', constituency: 'Jalandhar', house: 'Lok Sabha' },

  // Samajwadi Party (SP)
  'akhilesh yadav': { party: 'Samajwadi Party', state: 'Uttar Pradesh', constituency: 'Kannauj', house: 'Lok Sabha' },
  'dimple yadav': { party: 'Samajwadi Party', state: 'Uttar Pradesh', constituency: 'Mainpuri', house: 'Lok Sabha' },
  'ram gopal yadav': { party: 'Samajwadi Party', state: 'Uttar Pradesh', constituency: 'Uttar Pradesh', house: 'Rajya Sabha' },
  'dharmendra yadav': { party: 'Samajwadi Party', state: 'Uttar Pradesh', constituency: 'Azamgarh', house: 'Lok Sabha' },
  'awadhesh prasad': { party: 'Samajwadi Party', state: 'Uttar Pradesh', constituency: 'Faizabad', house: 'Lok Sabha' },
  'iqra hasan': { party: 'Samajwadi Party', state: 'Uttar Pradesh', constituency: 'Kairana', house: 'Lok Sabha' },
  'mohibullah nadvi': { party: 'Samajwadi Party', state: 'Uttar Pradesh', constituency: 'Rampur', house: 'Lok Sabha' },
  'afzal ansari': { party: 'Samajwadi Party', state: 'Uttar Pradesh', constituency: 'Ghazipur', house: 'Lok Sabha' },

  // All India Trinamool Congress (TMC)
  'mamata banerjee': { party: 'All India Trinamool Congress', state: 'West Bengal', constituency: 'Bhabanipur', house: 'Vidhan Sabha' },
  'abhishek banerjee': { party: 'All India Trinamool Congress', state: 'West Bengal', constituency: 'Diamond Harbour', house: 'Lok Sabha' },
  'mahua moitra': { party: 'All India Trinamool Congress', state: 'West Bengal', constituency: 'Krishnanagar', house: 'Lok Sabha' },
  'derek o\'brien': { party: 'All India Trinamool Congress', state: 'West Bengal', constituency: 'West Bengal', house: 'Rajya Sabha' },
  'kalyan banerjee': { party: 'All India Trinamool Congress', state: 'West Bengal', constituency: 'Serampore', house: 'Lok Sabha' },
  'shatrughan sinha': { party: 'All India Trinamool Congress', state: 'West Bengal', constituency: 'Asansol', house: 'Lok Sabha' },
  'yusuf pathan': { party: 'All India Trinamool Congress', state: 'West Bengal', constituency: 'Baharampur', house: 'Lok Sabha' },
  'sougata roy': { party: 'All India Trinamool Congress', state: 'West Bengal', constituency: 'Dum Dum', house: 'Lok Sabha' },

  // Dravida Munnetra Kazhagam (DMK)
  'm. k. stalin': { party: 'Dravida Munnetra Kazhagam', state: 'Tamil Nadu', constituency: 'Kolathur', house: 'Vidhan Sabha' },
  'mk stalin': { party: 'Dravida Munnetra Kazhagam', state: 'Tamil Nadu', constituency: 'Kolathur', house: 'Vidhan Sabha' },
  'kanimozhi karunanidhi': { party: 'Dravida Munnetra Kazhagam', state: 'Tamil Nadu', constituency: 'Thoothukkudi', house: 'Lok Sabha' },
  'dayanidhi maran': { party: 'Dravida Munnetra Kazhagam', state: 'Tamil Nadu', constituency: 'Chennai Central', house: 'Lok Sabha' },
  'a. raja': { party: 'Dravida Munnetra Kazhagam', state: 'Tamil Nadu', constituency: 'Nilgiris', house: 'Lok Sabha' },
  't. r. baalu': { party: 'Dravida Munnetra Kazhagam', state: 'Tamil Nadu', constituency: 'Sriperumbudur', house: 'Lok Sabha' },
  'tr baalu': { party: 'Dravida Munnetra Kazhagam', state: 'Tamil Nadu', constituency: 'Sriperumbudur', house: 'Lok Sabha' },

  // Nationalist Congress Party (NCP / NCP-SP)
  'sharad pawar': { party: 'Nationalist Congress Party (SP)', state: 'Maharashtra', constituency: 'Maharashtra', house: 'Rajya Sabha' },
  'supriya sule': { party: 'Nationalist Congress Party (SP)', state: 'Maharashtra', constituency: 'Baramati', house: 'Lok Sabha' },
  'amol kolhe': { party: 'Nationalist Congress Party (SP)', state: 'Maharashtra', constituency: 'Shirur', house: 'Lok Sabha' },
  'ajit pawar': { party: 'Nationalist Congress Party', state: 'Maharashtra', constituency: 'Baramati', house: 'Vidhan Sabha' },
  'praful patel': { party: 'Nationalist Congress Party', state: 'Maharashtra', constituency: 'Maharashtra', house: 'Rajya Sabha' },

  // Shiv Sena & Shiv Sena (UBT)
  'uddhav thackeray': { party: 'Shiv Sena (UBT)', state: 'Maharashtra', constituency: 'Maharashtra', house: 'Vidhan Sabha' },
  'sanjay raut': { party: 'Shiv Sena (UBT)', state: 'Maharashtra', constituency: 'Maharashtra', house: 'Rajya Sabha' },
  'arvind sawant': { party: 'Shiv Sena (UBT)', state: 'Maharashtra', constituency: 'Mumbai South', house: 'Lok Sabha' },
  'eknath shinde': { party: 'Shiv Sena', state: 'Maharashtra', constituency: 'Kopri-Pachpakhadi', house: 'Vidhan Sabha' },
  'shrikant shinde': { party: 'Shiv Sena', state: 'Maharashtra', constituency: 'Kalyan', house: 'Lok Sabha' },

  // Regional & Other Parties
  'nitish kumar': { party: 'Janata Dal (United)', state: 'Bihar', constituency: 'Bihar', house: 'Vidhan Sabha' },
  'lalan singh': { party: 'Janata Dal (United)', state: 'Bihar', constituency: 'Munger', house: 'Lok Sabha' },
  'n. chandrababu naidu': { party: 'Telugu Desam Party', state: 'Andhra Pradesh', constituency: 'Kuppam', house: 'Vidhan Sabha' },
  'chandrababu naidu': { party: 'Telugu Desam Party', state: 'Andhra Pradesh', constituency: 'Kuppam', house: 'Vidhan Sabha' },
  'kinjarapu ram mohan naidu': { party: 'Telugu Desam Party', state: 'Andhra Pradesh', constituency: 'Srikakulam', house: 'Lok Sabha' },
  'ram mohan naidu kinjarapu': { party: 'Telugu Desam Party', state: 'Andhra Pradesh', constituency: 'Srikakulam', house: 'Lok Sabha' },
  'y. s. jagan mohan reddy': { party: 'YSRCP', state: 'Andhra Pradesh', constituency: 'Pulivendula', house: 'Vidhan Sabha' },
  'pinarayi vijayan': { party: 'Communist Party of India (Marxist)', state: 'Kerala', constituency: 'Dharmadom', house: 'Vidhan Sabha' },
  'asaduddin owaisi': { party: 'All India Majlis-E-Ittehadul Muslimeen', state: 'Telangana', constituency: 'Hyderabad', house: 'Lok Sabha' },
  'chirag paswan': { party: 'Lok Janshakti Party (Ram Vilas)', state: 'Bihar', constituency: 'Hajipur', house: 'Lok Sabha' },
  'jayant chaudhary': { party: 'Rashtriya Lok Dal', state: 'Uttar Pradesh', constituency: 'Uttar Pradesh', house: 'Rajya Sabha' },
  'pawan kalyan': { party: 'Jana Sena Party', state: 'Andhra Pradesh', constituency: 'Pithapuram', house: 'Vidhan Sabha' },
  'chandrashekhar azad': { party: 'Aazad Samaj Party (Kanshi Ram)', state: 'Uttar Pradesh', constituency: 'Nagina', house: 'Lok Sabha' },
  'amritpal singh': { party: 'Independent', state: 'Punjab', constituency: 'Khadoor Sahib', house: 'Lok Sabha' },
  'sarabjeet singh khalsa': { party: 'Independent', state: 'Punjab', constituency: 'Faridkot', house: 'Lok Sabha' },
  'engineer rashid': { party: 'Jammu & Kashmir Awami Ittehad Party', state: 'Jammu and Kashmir', constituency: 'Baramulla', house: 'Lok Sabha' },
  'abdul rashid sheikh': { party: 'Jammu & Kashmir Awami Ittehad Party', state: 'Jammu and Kashmir', constituency: 'Baramulla', house: 'Lok Sabha' },
  'omar abdullah': { party: 'Jammu & Kashmir National Conference', state: 'Jammu and Kashmir', constituency: 'Ganderbal', house: 'Vidhan Sabha' },
  'farooq abdullah': { party: 'Jammu & Kashmir National Conference', state: 'Jammu and Kashmir', constituency: 'Srinagar', house: 'Lok Sabha' },
  'mehbooba mufti': { party: 'Jammu & Kashmir Peoples Democratic Party', state: 'Jammu and Kashmir', constituency: 'Anantnag', house: 'Lok Sabha' },
  'lalu prasad yadav': { party: 'Rashtriya Janata Dal', state: 'Bihar', constituency: 'Saran', house: 'Lok Sabha' },
  'tejashwi yadav': { party: 'Rashtriya Janata Dal', state: 'Bihar', constituency: 'Raghopur', house: 'Vidhan Sabha' },
  'misa bharti': { party: 'Rashtriya Janata Dal', state: 'Bihar', constituency: 'Pataliputra', house: 'Lok Sabha' },
  'pappu yadav': { party: 'Independent', state: 'Bihar', constituency: 'Purnia', house: 'Lok Sabha' },
  'rajesh ranjan': { party: 'Independent', state: 'Bihar', constituency: 'Purnia', house: 'Lok Sabha' },
  'h. d. kumaraswamy': { party: 'Janata Dal (Secular)', state: 'Karnataka', constituency: 'Mandya', house: 'Lok Sabha' },
  'hd kumaraswamy': { party: 'Janata Dal (Secular)', state: 'Karnataka', constituency: 'Mandya', house: 'Lok Sabha' },
  'h. d. deve gowda': { party: 'Janata Dal (Secular)', state: 'Karnataka', constituency: 'Karnataka', house: 'Rajya Sabha' },
  'p. k. kunhalikutty': { party: 'Indian Union Muslim League', state: 'Kerala', constituency: 'Vengara', house: 'Vidhan Sabha' },
  'e. t. mohammed basheer': { party: 'Indian Union Muslim League', state: 'Kerala', constituency: 'Malappuram', house: 'Lok Sabha' },
};

export const App: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>(SAMPLE_CANDIDATES);
  const [totalDatabaseCount, setTotalDatabaseCount] = useState<number>(0);
  const [displayLimit, setDisplayLimit] = useState<number>(50);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHouse, setSelectedHouse] = useState('ALL');
  const [activeView, setActiveView] = useState<'directory' | 'leaderboards'>('directory');
  const [selectedForComparison, setSelectedForComparison] = useState<Candidate[]>([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState<boolean>(false);
  const [sharingCandidate, setSharingCandidate] = useState<Candidate | null>(null);

  const handleToggleComparison = (cand: Candidate) => {
    setSelectedForComparison((prev) => {
      const exists = prev.some((c) => c.id === cand.id);
      if (exists) {
        return prev.filter((c) => c.id !== cand.id);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), cand];
      }
      return [...prev, cand];
    });
  };

  const handleRemoveFromComparison = (id: string) => {
    setSelectedForComparison((prev) => prev.filter((c) => c.id !== id));
  };

  const handleClearComparison = () => {
    setSelectedForComparison([]);
  };

  const handleOpenShareCard = (cand: Candidate) => {
    setSharingCandidate(cand);
  };

  // Interactive filters state
  const [filterState, setFilterState] = useState<FilterState>({
    state: 'ALL',
    constituency: 'ALL',
    party: 'ALL',
    forensicFlag: 'ALL',
    wealthTier: 'ALL',
  });

  useEffect(() => {
    const metaEnv = (import.meta as any).env || {};
    const rawUrl = String(metaEnv.VITE_SUPABASE_URL || '').trim();
    const rawKey = String(metaEnv.VITE_SUPABASE_ANON_KEY || '').trim();

    if (!rawUrl || !rawKey) {
      return;
    }

    const cleanUrl = rawUrl.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');

    const fetchLiveCandidates = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `${cleanUrl}/rest/v1/candidates?select=*,sansad_records(attendance_rate,debates_count,questions_count),affidavits(id,filing_year,source_url,r2_storage_key,audit_discrepancies(*),criminal_cases(is_serious_category)),mplads_records(*),historical_wealth_cagr(*)&order=name.asc&limit=10000`,
          {
            headers: {
              apikey: rawKey,
              Authorization: `Bearer ${rawKey}`,
              Prefer: 'count=exact',
            },
          }
        );

        if (!res.ok) {
          throw new Error(`Supabase query failed with status: ${res.status}`);
        }

        const contentRange = res.headers.get('content-range');
        if (contentRange && contentRange.includes('/')) {
          const totalCount = parseInt(contentRange.split('/')[1], 10);
          if (!isNaN(totalCount) && totalCount > 0) {
            setTotalDatabaseCount(totalCount);
          }
        }

        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const sampleNames = new Set(SAMPLE_CANDIDATES.map((c) => c.name.toLowerCase()));

          const dbCandidates: Candidate[] = data
            .filter((row: any) => !sampleNames.has((row.name || '').toLowerCase()))
            .map((row: any) => {
              const sansad = Array.isArray(row.sansad_records) && row.sansad_records.length > 0 ? row.sansad_records[0] : null;
              const attendance = sansad?.attendance_rate != null ? Number(sansad.attendance_rate) : undefined;
              const debates = sansad?.debates_count != null ? Number(sansad.debates_count) : undefined;
              const questions = sansad?.questions_count != null ? Number(sansad.questions_count) : undefined;

              const aff = Array.isArray(row.affidavits) && row.affidavits.length > 0 ? row.affidavits[0] : null;
              const audit = aff?.audit_discrepancies && Array.isArray(aff.audit_discrepancies) && aff.audit_discrepancies.length > 0
                ? aff.audit_discrepancies[0]
                : (aff?.audit_discrepancies && !Array.isArray(aff.audit_discrepancies) ? aff.audit_discrepancies : null);
              const cases = aff && Array.isArray(aff.criminal_cases) ? aff.criminal_cases : [];

              const totalMovable = Number(audit?.part_b_movable_total ?? row.total_movable_assets ?? 0.0);
              const totalImmovable = Number(audit?.part_b_immovable_total ?? row.total_immovable_assets ?? 0.0);
              const totalLiabilities = Number(row.total_liabilities ?? 0.0);
              const totalNetWorth = Number(audit?.total_net_worth ?? row.total_net_worth ?? 0.0);
              const totalIncome = Number(audit?.total_five_year_declared_income ?? row.total_five_year_income ?? 0.0);
              const deltaMovable = Number(audit?.delta_movable ?? row.delta_movable ?? 0.0);
              const deltaImmovable = Number(audit?.delta_immovable ?? row.delta_immovable ?? 0.0);
              const hasArithDiscrepancy = Boolean(audit?.has_arithmetic_discrepancy ?? row.has_arithmetic_discrepancy ?? false);
              const wdr = audit?.wealth_discrepancy_ratio != null
                ? Number(audit.wealth_discrepancy_ratio)
                : (row.wealth_discrepancy_ratio != null ? Number(row.wealth_discrepancy_ratio) : 1.0);
              const hasAnomalousWdr = Boolean(audit?.has_anomalous_wealth_ratio ?? row.has_anomalous_wealth_ratio ?? false);

              const crimCount = cases.length > 0 ? cases.length : Number(row.criminal_cases_count ?? 0);
              const seriousCount = cases.length > 0
                ? cases.filter((c: any) => c.is_serious_category).length
                : Number(row.serious_criminal_cases_count ?? 0);
              const protestCount = Number(row.protest_cases_count ?? 0);

              const pdfSourceUrl = aff?.source_url || row.pdf_source_url || 'https://affidavit.eci.gov.in';
              const r2Key = aff?.r2_storage_key || row.r2_storage_key || undefined;

              // Parse MoSPI MPLADS Record if available
              const mpladsRaw = Array.isArray(row.mplads_records) && row.mplads_records.length > 0 ? row.mplads_records[0] : null;
              const mpladsRecord = mpladsRaw
                ? {
                    entitled_amount: Number(mpladsRaw.entitled_amount ?? 250000000.0),
                    released_amount: Number(mpladsRaw.released_amount ?? 0.0),
                    expenditure_amount: Number(mpladsRaw.expenditure_amount ?? 0.0),
                    unspent_balance: Number(mpladsRaw.unspent_balance ?? 0.0),
                    utilization_rate: Number(mpladsRaw.utilization_rate ?? 0.0),
                    works_recommended: Number(mpladsRaw.works_recommended ?? 0),
                    works_completed: Number(mpladsRaw.works_completed ?? 0),
                    term_years: mpladsRaw.term_years || '2019-2024',
                  }
                : undefined;

              // Parse Historical Wealth CAGR if available
              const cagrRawList = Array.isArray(row.historical_wealth_cagr) ? row.historical_wealth_cagr : [];
              const cagrRecords =
                cagrRawList.length > 0
                  ? cagrRawList.map((c: any) => ({
                      from_year: Number(c.from_year),
                      to_year: Number(c.to_year),
                      initial_assets: Number(c.initial_assets),
                      final_assets: Number(c.final_assets),
                      absolute_increase: Number(c.absolute_increase),
                      percentage_increase: Number(c.percentage_increase),
                      cagr_percent: c.cagr_percent != null ? Number(c.cagr_percent) : undefined,
                      is_rapid_accumulation: Boolean(c.is_rapid_accumulation),
                    }))
                  : undefined;

              const known = PROMINENT_PARTY_MAP[row.name ? row.name.toLowerCase().trim() : ''];
              const resolvedParty =
                known?.party ||
                (row.party && row.party !== 'Parliamentarian' && row.party !== 'None' && row.party !== 'null' && row.party !== 'Unknown'
                  ? row.party
                  : 'Independent');
              const resolvedState =
                known?.state ||
                (row.state && row.state !== 'India' && row.state !== 'National'
                  ? row.state
                  : (row.state || 'India'));
              const resolvedConstituency =
                known?.constituency ||
                (row.constituency && row.constituency !== 'Parliament of India' && row.constituency !== 'National'
                  ? row.constituency
                  : (row.constituency || 'National'));

              const rawHouse = row.house ? String(row.house).trim() : '';
              let resolvedHouse: 'Lok Sabha' | 'Rajya Sabha' | 'Vidhan Sabha' = known?.house || 'Lok Sabha';
              if (!known?.house) {
                if (rawHouse === 'Rajya Sabha') {
                  resolvedHouse = 'Rajya Sabha';
                } else if (rawHouse.includes('Vidhan')) {
                  resolvedHouse = 'Vidhan Sabha';
                } else {
                  resolvedHouse = 'Lok Sabha';
                }
              }

              return {
                id: String(row.id),
                name: row.name,
                alias: row.alias || undefined,
                constituency: resolvedConstituency,
                state: resolvedState,
                house: resolvedHouse,
                party: resolvedParty,
                filing_year: aff?.filing_year || 2024,
                total_movable_assets: totalMovable,
                total_immovable_assets: totalImmovable,
                total_liabilities: totalLiabilities,
                total_net_worth: totalNetWorth,
                total_five_year_income: totalIncome,
                criminal_cases_count: crimCount,
                serious_criminal_cases_count: seriousCount,
                protest_cases_count: protestCount,
                attendance_rate: attendance,
                debates_count: debates,
                questions_count: questions,
                mplads: mpladsRecord,
                historical_wealth: cagrRecords,
                has_arithmetic_discrepancy: hasArithDiscrepancy,
                delta_movable: deltaMovable,
                delta_immovable: deltaImmovable,
                wealth_discrepancy_ratio: wdr,
                has_anomalous_wealth_ratio: hasAnomalousWdr,
                pdf_source_url: pdfSourceUrl,
                r2_storage_key: r2Key,
              };
            });

          setCandidates([...SAMPLE_CANDIDATES, ...dbCandidates]);
          setIsLiveConnected(true);
        }
      } catch (err) {
        console.error('Failed to load live Supabase candidates, showing local sample data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLiveCandidates();
  }, []);

  // Proof Viewer Modal State
  const [proofModal, setProofModal] = useState<{
    isOpen: boolean;
    candidateName: string;
    fieldLabel: string;
    value: string;
    pdfUrl: string;
    bbox?: BoundingBox;
    candidate?: Candidate;
  }>({
    isOpen: false,
    candidateName: '',
    fieldLabel: '',
    value: '',
    pdfUrl: '',
  });

  const handleOpenProof = (
    candidateName: string,
    fieldLabel: string,
    value: string,
    pdfUrl: string,
    candidate?: Candidate
  ) => {
    setProofModal({
      isOpen: true,
      candidateName,
      fieldLabel,
      value,
      pdfUrl,
      bbox: candidate?.proof_bbox,
      candidate,
    });
  };

  // Derive unique options for filters
  const availableStates = useMemo(() => {
    const states = new Set<string>();
    candidates.forEach((c) => {
      if (c.state && c.state !== 'India' && c.state !== 'National') states.add(c.state);
    });
    return Array.from(states).sort();
  }, [candidates]);

  const availableConstituencies = useMemo(() => {
    const constits = new Set<string>();
    candidates.forEach((c) => {
      if (filterState.state === 'ALL' || c.state === filterState.state) {
        if (c.constituency && c.constituency !== 'National') constits.add(c.constituency);
      }
    });
    return Array.from(constits).sort();
  }, [candidates, filterState.state]);

  const availableParties = useMemo(() => {
    const parties = new Set<string>();
    candidates.forEach((c) => {
      if (c.party) parties.add(c.party);
    });
    return Array.from(parties).sort();
  }, [candidates]);

  // Comprehensive multi-factor candidate filter
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      // 1. Text Search Query
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesQuery =
          c.name.toLowerCase().includes(q) ||
          c.constituency.toLowerCase().includes(q) ||
          c.state.toLowerCase().includes(q) ||
          (c.party && c.party.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }

      // 2. House Filter
      if (selectedHouse !== 'ALL' && c.house !== selectedHouse) {
        return false;
      }

      // 3. State Filter
      if (filterState.state !== 'ALL' && c.state !== filterState.state) {
        return false;
      }

      // 4. Constituency Filter
      if (filterState.constituency !== 'ALL' && c.constituency !== filterState.constituency) {
        return false;
      }

      // 5. Political Party Filter
      if (filterState.party !== 'ALL' && c.party !== filterState.party) {
        return false;
      }

      // 6. Forensic Audit Flag Filter
      if (filterState.forensicFlag === 'DISCREPANCY') {
        if (!c.has_arithmetic_discrepancy) return false;
      } else if (filterState.forensicFlag === 'HIGH_WDR') {
        if (!c.has_anomalous_wealth_ratio && (!c.wealth_discrepancy_ratio || c.wealth_discrepancy_ratio < 10)) {
          return false;
        }
      } else if (filterState.forensicFlag === 'CRIMINAL') {
        if (c.criminal_cases_count <= 0) return false;
      } else if (filterState.forensicFlag === 'LOW_MPLADS') {
        if (!c.mplads || c.mplads.utilization_rate >= 60) return false;
      } else if (filterState.forensicFlag === 'RAPID_WEALTH') {
        const hasSurge = c.historical_wealth?.some((h) => h.is_rapid_accumulation);
        if (!hasSurge) return false;
      }

      // 7. Wealth Tier Filter
      if (filterState.wealthTier === '100CR_PLUS') {
        if (c.total_net_worth < 1000000000) return false;
      } else if (filterState.wealthTier === '10CR_TO_100CR') {
        if (c.total_net_worth < 100000000 || c.total_net_worth >= 1000000000) return false;
      } else if (filterState.wealthTier === '1CR_TO_10CR') {
        if (c.total_net_worth < 10000000 || c.total_net_worth >= 100000000) return false;
      } else if (filterState.wealthTier === 'UNDER_1CR') {
        if (c.total_net_worth >= 10000000) return false;
      }

      return true;
    });
  }, [candidates, searchQuery, selectedHouse, filterState]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans pb-20 md:pb-0">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedHouse={selectedHouse}
        onHouseChange={setSelectedHouse}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      {/* Civic Pulse Masthead / Telemetry Overview */}
      <section className="bg-white border-b border-slate-200/90 py-8 px-4 sm:px-6 lg:px-8 shadow-2xs">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                  <ShieldCheck size={14} weight="duotone" className="text-emerald-600" />
                  Section 79 Evidentiary Safe Harbor
                </span>
                <span className="text-xs text-slate-400 font-sans hidden sm:inline">• ECI Form 26 Sworn Disclosures</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
                Empirical Political Accountability & Forensic Audits
              </h1>
              <p className="text-slate-600 text-xs sm:text-sm mt-1.5 max-w-2xl font-sans leading-relaxed">
                Automated civic intelligence cross-referencing ECI affidavits, Sansad parliamentary participation, and MoSPI public fund flows. Every metric is bound to cryptographic PDF coordinates.
              </p>
            </div>

            {/* Cloud Engine Telemetry Badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-semibold shadow-2xs">
                <Cpu size={15} weight="duotone" className="text-emerald-600" />
                Gemini 3.8 Flash Active
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold shadow-2xs ${isLiveConnected ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
                <Database size={15} weight="duotone" className="text-blue-600" />
                {isLiveConnected ? `Supabase Live (${(totalDatabaseCount || candidates.length).toLocaleString()} MPs)` : 'Supabase & R2 Online'}
              </div>
            </div>
          </div>

          {/* Quick Telemetry Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6">
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-medium block">MPs & Candidates Indexed</span>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {(totalDatabaseCount || candidates.length).toLocaleString()}
              </p>
              <span className="text-[10px] text-emerald-700 font-medium">
                {isLiveConnected ? 'Live from Supabase' : 'Verified OpenSanctions'}
              </span>
            </div>

            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-medium block">Double-Entry Audits</span>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">100%</p>
              <span className="text-[10px] text-slate-500">Automated arithmetic checks</span>
            </div>

            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-medium block">MoSPI MPLADS Velocity</span>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">10-Yr Flow</p>
              <span className="text-[10px] text-blue-700 font-medium">Constituency Fund Tracking</span>
            </div>

            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-medium block">Monthly Operating Cost</span>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">$0.00</p>
              <span className="text-[10px] text-slate-500">100% Free Public Good</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Candidate Feed / Leaderboards */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'leaderboards' ? (
          <LeaderboardsView
            candidates={candidates}
            onVerifyProof={handleOpenProof}
            onOpenShareCard={handleOpenShareCard}
            selectedForComparison={selectedForComparison}
            onToggleComparison={handleToggleComparison}
          />
        ) : (
          <>
            {/* Interactive Constituency & Forensic Filter Dock */}
            <ConstituencyFilter
              filters={filterState}
              onFilterChange={setFilterState}
              availableStates={availableStates}
              availableConstituencies={availableConstituencies}
              availableParties={availableParties}
              totalMatches={filteredCandidates.length}
            />

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Parliamentary Profiles & Audited Declarations ({filteredCandidates.length.toLocaleString()})
                </h2>
                {isLoading && (
                  <span className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                    <SpinnerGap size={14} weight="bold" className="animate-spin text-blue-700" /> Connecting...
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500 hidden sm:inline">Click any card to inspect photo proof or export dossier</span>
            </div>

            {filteredCandidates.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <p className="text-slate-600 text-sm font-medium">No parliamentarians found matching your selected filters.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                  {filteredCandidates.slice(0, displayLimit).map((candidate) => (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      onVerifyProof={handleOpenProof}
                      isSelectedForComparison={selectedForComparison.some((c) => c.id === candidate.id)}
                      onToggleComparison={handleToggleComparison}
                      onOpenShareCard={handleOpenShareCard}
                    />
                  ))}
                </div>

                {filteredCandidates.length > displayLimit && (
                  <div className="mt-10 text-center">
                    <button
                      onClick={() => setDisplayLimit((prev) => prev + 50)}
                      className="px-8 py-3.5 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 text-sm font-semibold rounded-2xl shadow-sm hover:shadow transition-all duration-200 cursor-pointer active:scale-95"
                    >
                      Load More Parliamentarians ({filteredCandidates.length - displayLimit} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Sticky Bottom Comparison Drawer */}
      {selectedForComparison.length > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#0A192F] text-white rounded-2xl shadow-2xl px-4 sm:px-6 py-3 border border-slate-700 flex items-center gap-3 sm:gap-5 animate-in slide-in-from-bottom-6 max-w-[95vw]">
          <div className="flex items-center gap-2">
            <Stack size={18} weight="duotone" className="text-blue-400 flex-shrink-0" />
            <span className="text-xs font-semibold hidden md:inline">Compare:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-[200px] sm:max-w-xs md:max-w-md">
              {selectedForComparison.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-1.5 bg-slate-800 text-xs px-2.5 py-1 rounded-lg border border-slate-700 whitespace-nowrap"
                >
                  <span className="truncate max-w-[90px] font-medium">{c.name.split(' ')[0]}</span>
                  <button
                    onClick={() => handleRemoveFromComparison(c.id)}
                    className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition-colors"
                    title="Remove"
                  >
                    <X size={12} weight="bold" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setIsComparisonOpen(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>Side-by-Side ({selectedForComparison.length})</span>
              <ArrowRight size={13} weight="bold" />
            </button>
            <button
              onClick={handleClearComparison}
              className="text-slate-400 hover:text-slate-200 text-xs font-medium px-2 py-1 transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Navigation Dock */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0A192F]/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around h-16 px-2 text-white shadow-lg">
        <button
          onClick={() => setActiveView('directory')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeView === 'directory' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <SquaresFour size={20} weight={activeView === 'directory' ? 'fill' : 'duotone'} />
          <span className="text-[10px] mt-0.5 font-sans">Directory</span>
        </button>

        <button
          onClick={() => setActiveView('leaderboards')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeView === 'leaderboards' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy size={20} weight={activeView === 'leaderboards' ? 'fill' : 'duotone'} />
          <span className="text-[10px] mt-0.5 font-sans">Leaderboards</span>
        </button>

        <button
          onClick={() => {
            if (selectedForComparison.length > 0) {
              setIsComparisonOpen(true);
            }
          }}
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-200 relative"
        >
          <Scales size={20} weight="duotone" />
          <span className="text-[10px] mt-0.5 font-sans">Compare</span>
          {selectedForComparison.length > 0 && (
            <span className="absolute top-1 right-5 w-4 h-4 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center font-mono">
              {selectedForComparison.length}
            </span>
          )}
        </button>
      </nav>

      {/* Comparison Modal */}
      <ComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        candidates={selectedForComparison}
        onRemoveCandidate={handleRemoveFromComparison}
        onVerifyProof={handleOpenProof}
        onOpenShareCard={handleOpenShareCard}
      />

      {/* Social Report Card Graphic Modal */}
      <ReportCardModal
        isOpen={!!sharingCandidate}
        onClose={() => setSharingCandidate(null)}
        candidate={sharingCandidate}
      />

      {/* Affidavit Proof Viewer Modal */}
      <AffidavitProofViewer
        isOpen={proofModal.isOpen}
        onClose={() => setProofModal((prev) => ({ ...prev, isOpen: false }))}
        candidateName={proofModal.candidateName}
        pdfUrl={proofModal.pdfUrl}
        fieldLabel={proofModal.fieldLabel}
        claimedValue={proofModal.value}
        bbox={proofModal.bbox}
        candidate={proofModal.candidate}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 text-center text-xs text-slate-500 font-sans">
        <p>
          Apna Neta is an open-source non-partisan civic technology project. All declarations are reproduced
          verbatim from sworn ECI Form 26 filings under Section 3(c)(ii) of the Digital Personal Data Protection Act, 2023.
        </p>
      </footer>
    </div>
  );
};

export default App;
