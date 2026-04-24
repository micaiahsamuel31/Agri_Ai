from sqlalchemy.orm import Session
from backend.models.market import MarketPrice

def fetch_and_save_prices(db: Session, crop: str, region: str):
    # This fulfills your 'Market pricing' methodology [cite: 16]
    # For now, we mock the API response
    mock_price = 50.0 
    new_entry = MarketPrice(crop_name=crop, price=mock_price, region=region)
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry
