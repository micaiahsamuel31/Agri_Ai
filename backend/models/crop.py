from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from backend.database import Base 

class Crop(Base):
    __tablename__ = "crops"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    variety = Column(String)
    health_status = Column(String, default="Healthy")
    predicted_price = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())