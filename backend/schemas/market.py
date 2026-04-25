from pydantic import BaseModel


class MarketPoint(BaseModel):
    date: str
    price: float


class MarketObservation(BaseModel):
    state: str
    district: str
    market: str
    commodity: str
    variety: str | None = None
    grade: str | None = None
    arrival_date: str
    min_price: float | None = None
    max_price: float | None = None
    modal_price: float


class MarketPriceResponse(BaseModel):
    crop_name: str
    region: str
    current_price: float
    predicted_price: float
    trend: str
    confidence: float
    unit: str
    history: list[MarketPoint]
    forecast: list[MarketPoint]
    observations: list[MarketObservation] = []
    source: str
    source_url: str | None = None
    data_quality: str
    last_updated: str | None = None
    market: str | None = None
    district: str | None = None
    state: str | None = None
    min_price: float | None = None
    max_price: float | None = None
    forecast_available: bool = False
    recommendation: str
