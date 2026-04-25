"""
backend/services/market.py
Market price prediction service using historical data + simple ML forecasting.
"""

from datetime import datetime, timedelta
from typing import Optional
import statistics

from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.models.market import MarketPrice


# ---------------------------------------------------------------------------
# Static fallback prices (₹ per quintal) when no DB records exist yet.
# Source: typical APMC mandi ranges for India, 2024.
# ---------------------------------------------------------------------------
FALLBACK_PRICES: dict[str, float] = {
    "tomato":    1800.0,
    "wheat":     2275.0,
    "rice":      2183.0,
    "onion":     1500.0,
    "potato":    1200.0,
    "maize":     1850.0,
    "cotton":    6500.0,
    "sugarcane":  350.0,
    "soybean":   4300.0,
    "groundnut": 5500.0,
    "chilli":    8000.0,
    "turmeric":  7500.0,
    "banana":     800.0,
    "mango":     2500.0,
}

# Seasonal adjustment factors per month (index 1‑12).
# Values above 1.0 → price typically higher that month.
SEASONAL_FACTORS: dict[str, list[float]] = {
    "tomato":  [1.3, 1.2, 1.0, 0.9, 0.85, 0.9, 1.0, 1.1, 1.2, 1.3, 1.3, 1.4],
    "onion":   [1.1, 1.0, 0.9, 0.85, 0.8, 1.0, 1.3, 1.4, 1.3, 1.1, 1.0, 1.0],
    "potato":  [0.9, 0.9, 0.85, 0.9, 1.0, 1.1, 1.2, 1.2, 1.1, 1.0, 0.95, 0.9],
}

# Regional multipliers (relative to national average).
REGION_MULTIPLIERS: dict[str, float] = {
    "delhi":     1.15,
    "mumbai":    1.20,
    "bangalore": 1.10,
    "chennai":   1.08,
    "kolkata":   1.05,
    "hyderabad": 1.07,
    "pune":      1.10,
    "ahmedabad": 1.02,
    "jaipur":    0.98,
    "lucknow":   0.97,
    "patna":     0.95,
    "bhopal":    0.96,
    "default":   1.00,
}


def _seasonal_factor(crop: str, month: int) -> float:
    factors = SEASONAL_FACTORS.get(crop.lower())
    if factors:
        return factors[month - 1]
    return 1.0


def _region_multiplier(region: str) -> float:
    return REGION_MULTIPLIERS.get(region.lower().strip(), REGION_MULTIPLIERS["default"])


def _trend_from_history(prices: list[float]) -> float:
    """
    Returns a simple linear-trend multiplier based on the last N prices.
    1.0 = flat, >1.0 = uptrend, <1.0 = downtrend.
    """
    if len(prices) < 2:
        return 1.0
    # Average of last-3 vs average of first-3
    recent = statistics.mean(prices[-3:])
    older  = statistics.mean(prices[:3])
    if older == 0:
        return 1.0
    ratio = recent / older
    # Dampen extreme swings: blend 70% trend + 30% flat
    return 0.3 + 0.7 * ratio


def fetch_and_save_prices(
    db: Session,
    crop: str,
    region: str,
    days_history: int = 30,
) -> dict:
    """
    Main service function called by the FastAPI route.

    Returns a dict with:
      - crop_name
      - region
      - current_price   (₹/quintal)
      - predicted_price (7-day forecast, ₹/quintal)
      - trend           ('rising' | 'falling' | 'stable')
      - confidence      (0-1 float)
      - history         (list of {date, price} for sparkline)
      - recommendation  (buy/sell advice string)
      - unit            'INR/quintal'
    """
    crop_key = crop.strip().lower()
    since = datetime.utcnow() - timedelta(days=days_history)

    # ── 1. Pull historical records from DB ──────────────────────────────────
    records = (
        db.query(MarketPrice)
        .filter(
            MarketPrice.crop_name.ilike(f"%{crop_key}%"),
            MarketPrice.region.ilike(f"%{region}%"),
            MarketPrice.timestamp >= since,
        )
        .order_by(MarketPrice.timestamp)
        .all()
    )

    history_prices = [r.price for r in records]
    history_dates  = [r.timestamp.strftime("%Y-%m-%d") for r in records]

    # ── 2. Determine base price ──────────────────────────────────────────────
    base_price = FALLBACK_PRICES.get(crop_key, 2000.0)

    if history_prices:
        base_price = statistics.mean(history_prices[-7:])  # last-week average

    # ── 3. Apply seasonal + regional adjustments ─────────────────────────────
    month = datetime.utcnow().month
    seasonal  = _seasonal_factor(crop_key, month)
    regional  = _region_multiplier(region)
    current_price = round(base_price * regional, 2)

    # ── 4. Forecast next 7 days ──────────────────────────────────────────────
    trend_mult    = _trend_from_history(history_prices) if history_prices else seasonal
    predicted_7d  = round(current_price * trend_mult, 2)

    # ── 5. Classify trend ────────────────────────────────────────────────────
    delta = predicted_7d - current_price
    if delta > current_price * 0.03:
        trend = "rising"
    elif delta < -current_price * 0.03:
        trend = "falling"
    else:
        trend = "stable"

    # ── 6. Confidence score ──────────────────────────────────────────────────
    # More history → higher confidence (caps at 0.92)
    confidence = min(0.92, 0.50 + len(history_prices) * 0.01)

    # ── 7. Save current snapshot to DB (so history grows over time) ──────────
    new_record = MarketPrice(
        crop_name=crop.strip().title(),
        price=current_price,
        region=region.strip().title(),
    )
    db.add(new_record)
    db.commit()

    # ── 8. Build 7-day forecast series for chart ─────────────────────────────
    forecast_series = []
    for i in range(1, 8):
        day_label = (datetime.utcnow() + timedelta(days=i)).strftime("%b %d")
        # small daily drift
        day_price = round(current_price + (predicted_7d - current_price) * (i / 7), 2)
        forecast_series.append({"date": day_label, "price": day_price})

    # ── 9. Human-readable recommendation ─────────────────────────────────────
    if trend == "rising":
        recommendation = (
            f"Prices for {crop.title()} are expected to rise in {region.title()}. "
            "Consider selling later in the week for better returns."
        )
    elif trend == "falling":
        recommendation = (
            f"Prices for {crop.title()} may soften in {region.title()}. "
            "Consider selling now to lock in current rates."
        )
    else:
        recommendation = (
            f"Prices for {crop.title()} are relatively stable in {region.title()}. "
            "Hold or sell based on your storage capacity."
        )

    return {
        "crop_name":       crop.strip().title(),
        "region":          region.strip().title(),
        "current_price":   current_price,
        "predicted_price": predicted_7d,
        "trend":           trend,
        "confidence":      round(confidence, 2),
        "unit":            "INR/quintal",
        "history":         [
            {"date": d, "price": p}
            for d, p in zip(history_dates, history_prices)
        ],
        "forecast":        forecast_series,
        "recommendation":  recommendation,
    }