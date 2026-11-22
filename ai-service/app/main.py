"""FastAPI entrypoint for the RentSaathi self-hosted AI service."""
from __future__ import annotations

import logging
import os
import secrets
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import Settings, settings as default_settings
from .schemas import (
    AnalyzeListingRequest,
    AnalyzeListingResponse,
    AnalyzeReviewRequest,
    AnalyzeReviewResponse,
    DeleteIndexResponse,
    ErrorResponse,
    HealthResponse,
    IndexListingRequest,
    IndexListingResponse,
    PredictPriceRequest,
    PredictPriceResponse,
    RecommendRequest,
    RecommendResponse,
    RetrainRequest,
    RetrainResponse,
)
from .service import FraudDetectionService

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"), format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("rentsaathi.ai")


def create_app(service: FraudDetectionService | None = None) -> FastAPI:
    settings: Settings = service.settings if service else default_settings

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if app.state.service is None:
            logger.info("Starting RentSaathi AI service in %s mode", settings.resolved_mode)
            app.state.service = FraudDetectionService(settings)
        yield

    app = FastAPI(
        title="RentSaathi AI Service",
        version="1.0.0",
        description=(
            "Self-hosted fraud detection for rental listings. Module 1 (image fake/duplicate detection) "
            "is implemented; price, review and recommendation endpoints are contract-correct stubs."
        ),
        lifespan=lifespan,
    )
    app.state.service = service

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["Content-Type", "X-API-KEY"],
    )

    def get_service(request: Request) -> FraudDetectionService:
        current = request.app.state.service
        if current is None:  # pragma: no cover - lifespan normally handles this
            current = FraudDetectionService(settings)
            request.app.state.service = current
        return current

    def require_api_key(request: Request, x_api_key: str | None = Header(default=None)) -> None:
        expected = request.app.state.service.settings.api_key if request.app.state.service else settings.api_key
        if not expected or not x_api_key or not secrets.compare_digest(expected, x_api_key):
            raise HTTPException(status_code=401, detail="Invalid or missing X-API-KEY")

    @app.exception_handler(ValueError)
    async def value_error_handler(_: Request, exc: ValueError) -> JSONResponse:
        return JSONResponse(status_code=422, content={"detail": str(exc)})

    @app.get("/", include_in_schema=False)
    def root() -> dict:
        return {"service": "RentSaathi AI", "docs": "/docs", "health": "/health"}

    @app.get("/health", response_model=HealthResponse)
    def health(svc: FraudDetectionService = Depends(get_service)) -> dict:
        return svc.health()

    @app.get("/metrics")
    def metrics(svc: FraudDetectionService = Depends(get_service)) -> dict:
        return svc.metrics()

    @app.post("/analyze-listing", response_model=AnalyzeListingResponse, dependencies=[Depends(require_api_key)])
    def analyze_listing(payload: AnalyzeListingRequest, svc: FraudDetectionService = Depends(get_service)):
        return svc.analyze_listing(payload.listingId, payload.imageUrls, payload.metadata)

    @app.post("/index-listing", response_model=IndexListingResponse, dependencies=[Depends(require_api_key)])
    def index_listing(payload: IndexListingRequest, svc: FraudDetectionService = Depends(get_service)):
        result = svc.index_listing(payload.listingId, payload.imageUrls)
        if not result.indexed:
            raise HTTPException(status_code=422, detail="No usable images could be downloaded for indexing")
        return result

    @app.delete("/index-listing/{listing_id}", response_model=DeleteIndexResponse, dependencies=[Depends(require_api_key)])
    def delete_index(listing_id: str, svc: FraudDetectionService = Depends(get_service)):
        return DeleteIndexResponse(deleted=svc.delete_listing(listing_id), listingId=listing_id)

    @app.post("/retrain", response_model=RetrainResponse, dependencies=[Depends(require_api_key)])
    def retrain(payload: RetrainRequest, svc: FraudDetectionService = Depends(get_service)):
        try:
            return svc.retrain_metadata(payload.metadataCsv)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    # ------------------------------------------------------------------
    # STUBS — NOT IMPLEMENTED YET (Part 3 / Part 4). Contracts are frozen.
    # ------------------------------------------------------------------
    @app.post("/predict-price", response_model=PredictPriceResponse, dependencies=[Depends(require_api_key)])
    def predict_price(payload: PredictPriceRequest, svc: FraudDetectionService = Depends(get_service)):
        return {
            "status": "not_implemented",
            "part": "Part 3 — fair price regression",
            "message": "NOT IMPLEMENTED YET (Part 3). This endpoint will host our own price regression model.",
            "mode": svc.mode,
            "model": "fair_price_regression",
            "prediction": {"min": None, "max": None, "currency": "PKR", "flag": "unknown"},
        }

    @app.post("/analyze-review", response_model=AnalyzeReviewResponse, dependencies=[Depends(require_api_key)])
    def analyze_review(payload: AnalyzeReviewRequest, svc: FraudDetectionService = Depends(get_service)):
        return {
            "status": "not_implemented",
            "part": "Part 4 — fake review NLP",
            "message": "NOT IMPLEMENTED YET (Part 4). This endpoint will host our own review-authenticity model.",
            "mode": svc.mode,
            "model": "review_authenticity",
            "authenticityScore": None,
            "label": "unknown",
        }

    @app.post("/recommend", response_model=RecommendResponse, dependencies=[Depends(require_api_key)])
    def recommend(payload: RecommendRequest, svc: FraudDetectionService = Depends(get_service)):
        return {
            "status": "not_implemented",
            "part": "Part 4 — content-based recommender",
            "message": "NOT IMPLEMENTED YET (Part 4). This endpoint will host our own content-based recommender.",
            "mode": svc.mode,
            "model": "content_recommender",
            "recommendations": [],
        }

    return app


app = create_app()
