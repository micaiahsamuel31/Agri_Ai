import requests
from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from backend.database import Base

class MarketPrice(Base):
    __tablename__ = "market_prices"

    id = Column(Integer, primary_key=True, index=True)
    crop_name = Column(String, index=True)
    price = Column(Float)
    region = Column(String)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())