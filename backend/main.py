from fastapi import FastAPI, Depends, UploadFile, File, HTTPException, Form
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

import backend.database as database
import backend.models.crop as crop_models
import backend.models.market as market_models

from backend.schemas.crop import CropCreate, CropResponse
from backend.schemas.market import MarketPriceResponse
from backend.services.market import fetch_and_save_prices
from backend.ai.predict import predict_disease


crop_models.Base.metadata.create_all(bind=database.engine)
market_models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="AgriAI Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ───────────────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {
        "status": "Online",
        "message": "AgriAI Backend is Live",
        "database": "Connected to PostgreSQL (agriai_db)",
    }


@app.get("/db-test")
def test_db_connection(db: Session = Depends(database.get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "Success", "details": "Database connection is working"}


# ── Crops ────────────────────────────────────────────────────────────────────

@app.post("/crops", response_model=CropResponse)
def create_crop(crop: CropCreate, db: Session = Depends(database.get_db)):
    new_crop = crop_models.Crop(
        name=crop.name,
        variety=crop.variety,
        health_status=crop.health_status,
        predicted_price=crop.predicted_price,
    )
    db.add(new_crop)
    db.commit()
    db.refresh(new_crop)
    return new_crop


@app.get("/crops", response_model=list[CropResponse])
def get_crops(db: Session = Depends(database.get_db)):
    return db.query(crop_models.Crop).all()


# ── Market Price Prediction ───────────────────────────────────────────────────

@app.get("/market-price", response_model=MarketPriceResponse)
def get_market_price(
    crop: str,
    region: str,
    db: Session = Depends(database.get_db),
):
    """
    Returns current market price + 7-day forecast for a given crop and region.

    Query params:
      - crop   : crop name (e.g. 'Tomato')
      - region : mandi/city region (e.g. 'Hyderabad')
    """
    if not crop.strip():
        raise HTTPException(status_code=422, detail="'crop' query param is required.")
    if not region.strip():
        raise HTTPException(status_code=422, detail="'region' query param is required.")

    result = fetch_and_save_prices(db, crop, region)
    return result


@app.get("/market-price/history")
def get_price_history(
    crop: str,
    region: str,
    days: int = 30,
    db: Session = Depends(database.get_db),
):
    """Returns raw historical price records for a crop+region combo."""
    from datetime import datetime, timedelta
    since = datetime.utcnow() - timedelta(days=days)

    records = (
        db.query(market_models.MarketPrice)
        .filter(
            market_models.MarketPrice.crop_name.ilike(f"%{crop}%"),
            market_models.MarketPrice.region.ilike(f"%{region}%"),
            market_models.MarketPrice.timestamp >= since,
        )
        .order_by(market_models.MarketPrice.timestamp)
        .all()
    )

    return [
        {
            "id":        r.id,
            "crop_name": r.crop_name,
            "region":    r.region,
            "price":     r.price,
            "timestamp": r.timestamp.isoformat(),
        }
        for r in records
    ]


@app.get("/market-price/crops")
def list_supported_crops():
    """Returns the list of crops with built-in fallback price data."""
    from backend.services.market import FALLBACK_PRICES
    return {
        "crops": sorted(FALLBACK_PRICES.keys()),
        "note": "Other crops are also supported; fallback price will be ₹2000/quintal.",
    }


# ── Disease Detection ─────────────────────────────────────────────────────────

@app.post("/detect-disease")
async def detect_disease(file: UploadFile = File(...)):
    image = Image.open(file.file).convert("RGB")
    result = predict_disease(image)
    return result

@app.post("/api/disease/predict")
async def predict_disease_api(
    crop_name: str = Form(...),
    image: UploadFile = File(...),
):
    pil_image = Image.open(image.file).convert("RGB")
    result = predict_disease(pil_image)
    result["crop_name"] = crop_name
    result["filename"] = image.filename
    return result