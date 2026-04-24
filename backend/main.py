from fastapi import FastAPI, Depends, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

import backend.database as database
import backend.models.crop as crop_models
import backend.models.market as market_models

from backend.schemas.crop import CropCreate, CropResponse
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


@app.get("/")
def read_root():
    return {
        "status": "Online",
        "message": "AgriAI Backend is Live",
        "database": "Connected to PostgreSQL (agriai_db)"
    }


@app.get("/db-test")
def test_db_connection(db: Session = Depends(database.get_db)):
    db.execute(text("SELECT 1"))
    return {
        "status": "Success",
        "details": "Database connection is working"
    }


@app.post("/crops", response_model=CropResponse)
def create_crop(crop: CropCreate, db: Session = Depends(database.get_db)):
    new_crop = crop_models.Crop(
        name=crop.name,
        variety=crop.variety,
        health_status=crop.health_status,
        predicted_price=crop.predicted_price
    )

    db.add(new_crop)
    db.commit()
    db.refresh(new_crop)

    return new_crop


@app.get("/crops", response_model=list[CropResponse])
def get_crops(db: Session = Depends(database.get_db)):
    return db.query(crop_models.Crop).all()


@app.get("/market-price")
def get_market_price(crop: str, region: str, db: Session = Depends(database.get_db)):
    return fetch_and_save_prices(db, crop, region)


@app.post("/detect-disease")
async def detect_disease(file: UploadFile = File(...)):
    image = Image.open(file.file).convert("RGB")
    result = predict_disease(image)
    return result