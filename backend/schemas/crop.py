from pydantic import BaseModel
from typing import Optional

class CropBase(BaseModel):
    name: str
    variety: str
    health_status: Optional[str] = "Healthy"
    predicted_price: Optional[float] = None

class CropCreate(CropBase):
    pass

class CropResponse(CropBase):
    id: int

    class Config:
        from_attributes = True