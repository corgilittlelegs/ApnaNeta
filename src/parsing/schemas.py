from typing import List, Optional

try:
    from pydantic import BaseModel, Field
except ImportError:
    class FieldInfo:
        def __init__(self, default=None, default_factory=None, **kwargs):
            self.default = default
            self.default_factory = default_factory
            self.kwargs = kwargs

    def Field(default=..., **kwargs):
        return FieldInfo(default=default, **kwargs)

    class BaseModel:
        def __init__(self, **kwargs):
            for key, val in self.__class__.__dict__.items():
                if isinstance(val, FieldInfo):
                    if val.default_factory is not None:
                        setattr(self, key, val.default_factory())
                    elif val.default is not ...:
                        setattr(self, key, val.default)
                    else:
                        setattr(self, key, None)
                elif not key.startswith('_') and not callable(val):
                    setattr(self, key, val)
            for k, v in kwargs.items():
                setattr(self, k, v)

        def model_dump(self):
            out = {}
            for k, v in self.__dict__.items():
                if isinstance(v, BaseModel):
                    out[k] = v.model_dump()
                elif isinstance(v, list):
                    out[k] = [x.model_dump() if isinstance(x, BaseModel) else x for x in v]
                else:
                    out[k] = v
            return out

        def dict(self):
            return self.model_dump()


class BoundingBox(BaseModel):
    """
    Normalized 0-1000 coordinate bounding box on the PDF page.
    Used for visual proof of source overlay on affidavit scans.
    """
    page: int = Field(..., description="1-indexed page number in the affidavit PDF")
    ymin: int = Field(..., ge=0, le=1000, description="Top coordinate (0-1000)")
    xmin: int = Field(..., ge=0, le=1000, description="Left coordinate (0-1000)")
    ymax: int = Field(..., ge=0, le=1000, description="Bottom coordinate (0-1000)")
    xmax: int = Field(..., ge=0, le=1000, description="Right coordinate (0-1000)")


class CandidateIdentity(BaseModel):
    name: str = Field(..., description="Full legal name of the candidate")
    alias: Optional[str] = Field(None, description="Popular alias or moniker if disclosed")
    gender: Optional[str] = Field(None, description="Male / Female / Third Gender")
    age: Optional[int] = Field(None, description="Age declared at the time of nomination")
    father_or_spouse_name: Optional[str] = Field(None, description="Father's or spouse's name")
    state: str = Field(..., description="State or Union Territory")
    constituency: str = Field(..., description="Constituency name or number")
    house: str = Field(..., description="Lok Sabha | Rajya Sabha | Vidhan Sabha | Vidhan Parishad")
    party: Optional[str] = Field(None, description="Political party or Independent")
    filing_year: int = Field(..., description="Election year, e.g. 2024")
    education_level: Optional[str] = Field(None, description="Highest educational qualification")
    education_institution: Optional[str] = Field(None, description="School, college or university")
    proof_bbox: Optional[BoundingBox] = Field(None, description="Bounding box on identity declaration page")


class AssetItem(BaseModel):
    category: str = Field(..., description="Cash, Bank Deposits, Shares/Bonds, NSS/Postal, Vehicles, Jewelry, Land, Commercial, Residential, etc.")
    description: Optional[str] = Field(None, description="Specific details, make, survey number, etc.")
    self_amount: float = Field(default=0.0, description="Value declared for candidate (INR)")
    spouse_amount: float = Field(default=0.0, description="Value declared for spouse (INR)")
    dependents_amount: float = Field(default=0.0, description="Total value for all dependents (INR)")
    proof_bbox: Optional[BoundingBox] = Field(None, description="PDF coordinate of this asset row")


class ITRDeclaration(BaseModel):
    financial_year: str = Field(..., description="e.g. '2023-24'")
    declared_income: float = Field(..., description="Total income shown in Income Tax Return (INR)")
    has_filed_itr: bool = Field(default=True, description="Whether ITR was filed for this year")
    proof_bbox: Optional[BoundingBox] = Field(None, description="PDF coordinate of the ITR table row")


class CriminalCase(BaseModel):
    case_type: str = Field(default="pending", description="'pending' or 'convicted'")
    fir_or_case_number: str = Field(..., description="Case/FIR number")
    police_station: Optional[str] = Field(None, description="Police station name")
    court_name: Optional[str] = Field(None, description="Court where case is pending or convicted")
    statutory_charges: List[str] = Field(default_factory=list, description="List of IPC / BNS / statutory sections")
    charges_framed: bool = Field(default=False, description="Whether charges have been formally framed by the court")
    charges_framed_date: Optional[str] = Field(None, description="Date on which charges were framed (YYYY-MM-DD)")
    is_serious_category: bool = Field(default=False, description="True if punishable by 5+ years, corruption, rape, murder, etc.")
    category_justification: Optional[str] = Field(None, description="Statutory justification under ADR / RPA Section 8 criteria")
    proof_bbox: Optional[BoundingBox] = Field(None, description="PDF coordinate of this criminal case row")


class PartBSummary(BaseModel):
    """
    Abstract summary figures re-stated in Part B of Form 26.
    Used for double-entry arithmetic audit against itemized Part A totals.
    """
    movable_assets_total: float = Field(default=0.0, description="Total declared movable assets in Part B")
    immovable_assets_total: float = Field(default=0.0, description="Total declared immovable assets in Part B")
    liabilities_total: float = Field(default=0.0, description="Total declared liabilities in Part B")
    movable_proof_bbox: Optional[BoundingBox] = Field(None, description="PDF coordinate of Part B movable total")
    immovable_proof_bbox: Optional[BoundingBox] = Field(None, description="PDF coordinate of Part B immovable total")


class Form26AffidavitPayload(BaseModel):
    """
    Full canonical payload extracted from a candidate's Form 26 filing.
    """
    source_url: str = Field(..., description="Original URL or archival link")
    sha256_hash: str = Field(..., description="Cryptographic SHA-256 fingerprint of the PDF")
    candidate: CandidateIdentity
    part_a_movable_items: List[AssetItem] = Field(default_factory=list)
    part_a_immovable_items: List[AssetItem] = Field(default_factory=list)
    five_year_itr: List[ITRDeclaration] = Field(default_factory=list)
    criminal_cases: List[CriminalCase] = Field(default_factory=list)
    part_b_summary: PartBSummary


class ForensicAuditResult(BaseModel):
    """
    Results of the algorithmic double-entry audit and anomaly detection.
    """
    candidate_name: str
    filing_year: int
    constituency: str
    
    # Part A Computed Sums
    part_a_movable_sum: float
    part_a_immovable_sum: float
    
    # Part B Declared Totals
    part_b_movable_total: float
    part_b_immovable_total: float
    
    # Discrepancies
    delta_movable: float = Field(..., description="|Part B - Part A sum| for movable assets")
    delta_immovable: float = Field(..., description="|Part B - Part A sum| for immovable assets")
    has_arithmetic_discrepancy: bool
    
    # Wealth Discrepancy Ratio (WDR)
    total_net_worth: float
    total_five_year_declared_income: float
    wealth_discrepancy_ratio: Optional[float] = Field(None, description="Net Worth / 5-Year Income")
    has_anomalous_wealth_ratio: bool
    
    # Visual Proof Coordinates for any detected variance
    variance_proof_coordinates: List[BoundingBox] = Field(default_factory=list)
