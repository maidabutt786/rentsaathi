"""Pydantic request/response contracts shared with the website and Cloud Functions."""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, HttpUrl, field_validator

FraudLabel = Literal["verified", "suspicious", "high_risk"]
Mode = Literal["bootstrap", "trained"]


class ListingMetadata(BaseModel):
    """Metadata used by the anomaly model. Every field is optional on purpose:
    early listings may be incomplete and the model degrades gracefully."""

    price: float | None = Field(default=None, ge=0)
    areaSqft: float | None = Field(default=None, ge=0)
    imageCount: int | None = Field(default=None, ge=0)
    descriptionLength: int | None = Field(default=None, ge=0)
    ownerPostingFrequency: float | None = Field(default=None, ge=0, description="Listings posted by this owner in the last 30 days")
    roomType: str | None = None
    city: str | None = None


class AnalyzeListingRequest(BaseModel):
    listingId: str = Field(min_length=1, max_length=128)
    imageUrls: list[str] = Field(default_factory=list)
    metadata: ListingMetadata = Field(default_factory=ListingMetadata)

    @field_validator("imageUrls")
    @classmethod
    def validate_urls(cls, urls: list[str]) -> list[str]:
        if len(urls) > 30:
            raise ValueError("At most 30 image URLs are allowed")
        for url in urls:
            if not url.startswith(("http://", "https://")):
                raise ValueError("imageUrls must be absolute http(s) URLs")
        return urls


class AnalyzeListingResponse(BaseModel):
    fraudScore: float = Field(ge=0, le=100)
    fraudLabel: FraudLabel
    duplicateOf: str | None
    duplicateSimilarity: float = Field(ge=0, le=1)
    reasons: list[str]
    mode: Mode
    modelVersion: str
    analyzedAt: str


class IndexListingRequest(BaseModel):
    listingId: str = Field(min_length=1, max_length=128)
    imageUrls: list[str] = Field(default_factory=list)

    @field_validator("imageUrls")
    @classmethod
    def validate_urls(cls, urls: list[str]) -> list[str]:
        if len(urls) > 30:
            raise ValueError("At most 30 image URLs are allowed")
        for url in urls:
            if not url.startswith(("http://", "https://")):
                raise ValueError("imageUrls must be absolute http(s) URLs")
        return urls


class IndexListingResponse(BaseModel):
    indexed: bool
    listingId: str
    images: int
    modelVersion: str


class DeleteIndexResponse(BaseModel):
    deleted: bool
    listingId: str


class HealthResponse(BaseModel):
    status: Literal["ok"]
    mode: Mode
    modelVersion: str
    classifierLoaded: bool
    indexedListings: int
    indexBackend: str
    backbone: str
    pretrainedWeights: bool


class RetrainRequest(BaseModel):
    metadataCsv: str | None = Field(default=None, description="Optional path to a real labelled CSV; defaults to the synthetic demo file")


class RetrainResponse(BaseModel):
    retrained: bool
    model: str
    rows: int
    mode: Mode
    message: str


# ---------------------------------------------------------------------------
# Stubs for later parts. Contracts are frozen now so the frontend can be built.
# ---------------------------------------------------------------------------


class PredictPriceRequest(BaseModel):
    listingId: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class PredictPriceResponse(BaseModel):
    status: Literal["not_implemented"]
    part: str
    message: str
    mode: Mode
    model: str
    prediction: dict[str, Any]


class AnalyzeReviewRequest(BaseModel):
    reviewId: str | None = None
    listingId: str | None = None
    text: str = ""


class AnalyzeReviewResponse(BaseModel):
    status: Literal["not_implemented"]
    part: str
    message: str
    mode: Mode
    model: str
    authenticityScore: float | None
    label: str


class RecommendRequest(BaseModel):
    studentId: str | None = None
    favorites: list[str] = Field(default_factory=list)
    limit: int = Field(default=6, ge=1, le=30)


class RecommendResponse(BaseModel):
    status: Literal["not_implemented"]
    part: str
    message: str
    mode: Mode
    model: str
    recommendations: list[dict[str, Any]]


class ErrorResponse(BaseModel):
    detail: str
