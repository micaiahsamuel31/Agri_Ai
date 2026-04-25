from datetime import datetime, timedelta
import math
import os
import statistics

import requests
from sqlalchemy.orm import Session

from backend.models.market import MarketPrice


DATA_GOV_RESOURCE_URL = (
    "https://api.data.gov.in/resource/"
    "current-daily-price-various-commodities-various-markets-mandi"
)

FALLBACK_PRICES: dict[str, float] = {
    "tomato": 1800.0,
    "wheat": 2275.0,
    "rice": 2183.0,
    "onion": 1500.0,
    "potato": 1200.0,
    "maize": 1850.0,
    "cotton": 6500.0,
    "sugarcane": 350.0,
    "soybean": 4300.0,
    "groundnut": 5500.0,
    "chilli": 8000.0,
    "turmeric": 7500.0,
    "banana": 800.0,
    "mango": 2500.0,
}

REGION_TO_STATE: dict[str, str] = {
    "mumbai": "Maharashtra",
    "pune": "Maharashtra",
    "delhi": "NCT of Delhi",
    "bangalore": "Karnataka",
    "bengaluru": "Karnataka",
    "chennai": "Tamil Nadu",
    "kolkata": "West Bengal",
    "hyderabad": "Telangana",
    "ahmedabad": "Gujarat",
    "jaipur": "Rajasthan",
    "lucknow": "Uttar Pradesh",
    "patna": "Bihar",
    "bhopal": "Madhya Pradesh",
}

SEASONAL_FACTORS: dict[str, list[float]] = {
    "tomato": [1.3, 1.2, 1.0, 0.9, 0.85, 0.9, 1.0, 1.1, 1.2, 1.3, 1.3, 1.4],
    "onion": [1.1, 1.0, 0.9, 0.85, 0.8, 1.0, 1.3, 1.4, 1.3, 1.1, 1.0, 1.0],
    "potato": [0.9, 0.9, 0.85, 0.9, 1.0, 1.1, 1.2, 1.2, 1.1, 1.0, 0.95, 0.9],
}

REGION_MULTIPLIERS: dict[str, float] = {
    "delhi": 1.15,
    "mumbai": 1.20,
    "bangalore": 1.10,
    "chennai": 1.08,
    "kolkata": 1.05,
    "hyderabad": 1.07,
    "pune": 1.10,
    "ahmedabad": 1.02,
    "jaipur": 0.98,
    "lucknow": 0.97,
    "patna": 0.95,
    "bhopal": 0.96,
    "default": 1.00,
}


def _seasonal_factor(crop: str, month: int) -> float:
    factors = SEASONAL_FACTORS.get(crop.lower())
    if factors:
        return factors[month - 1]
    return 1.0


def _region_multiplier(region: str) -> float:
    return REGION_MULTIPLIERS.get(region.lower().strip(), REGION_MULTIPLIERS["default"])


def _trend_from_history(prices: list[float]) -> float:
    if len(prices) < 2:
        return 1.0

    recent = statistics.mean(prices[-3:])
    older = statistics.mean(prices[:3])
    if older == 0:
        return 1.0

    return 0.3 + 0.7 * (recent / older)


def _fallback_history(crop: str, region: str, days: int = 14) -> list[dict]:
    today = datetime.utcnow().date()
    base_price = FALLBACK_PRICES.get(crop, 2000.0)
    region_price = base_price * _region_multiplier(region)
    month_factor = _seasonal_factor(crop, datetime.utcnow().month)
    points = []

    for index in range(days, 0, -1):
        day = today - timedelta(days=index)
        wave = 1 + math.sin(index / 2.6) * 0.035
        drift = 1 + ((days - index) / days) * (month_factor - 1) * 0.25
        points.append({
            "date": day.strftime("%Y-%m-%d"),
            "price": round(region_price * wave * drift, 2),
        })

    return points


def _to_float(value) -> float | None:
    if value in (None, "", "NA", "N/A"):
        return None
    try:
        return float(str(value).replace(",", "").strip())
    except ValueError:
        return None


def _normalize_observation(record: dict) -> dict | None:
    modal_price = _to_float(record.get("modal_price"))
    if modal_price is None:
        return None

    return {
        "state": record.get("state") or "",
        "district": record.get("district") or "",
        "market": record.get("market") or "",
        "commodity": record.get("commodity") or "",
        "variety": record.get("variety") or None,
        "grade": record.get("grade") or None,
        "arrival_date": record.get("arrival_date") or "",
        "min_price": _to_float(record.get("min_price")),
        "max_price": _to_float(record.get("max_price")),
        "modal_price": modal_price,
    }


def _fetch_data_gov_prices(crop: str, region: str, limit: int = 50) -> list[dict]:
    api_key = os.getenv("DATA_GOV_API_KEY")
    if not api_key:
        return []

    params = {
        "api-key": api_key,
        "format": "json",
        "limit": limit,
        "filters[commodity]": crop.strip().title(),
    }

    state = REGION_TO_STATE.get(region.strip().lower())
    if state:
        params["filters[state]"] = state

    response = requests.get(DATA_GOV_RESOURCE_URL, params=params, timeout=8)
    response.raise_for_status()
    payload = response.json()

    observations = []
    for record in payload.get("records", []):
        observation = _normalize_observation(record)
        if observation:
            observations.append(observation)

    return observations


def _best_observation(observations: list[dict], region: str) -> dict | None:
    if not observations:
        return None

    region_key = region.strip().lower()
    for observation in observations:
        if observation["market"].lower() == region_key:
            return observation

    for observation in observations:
        if (
            observation["district"].lower() == region_key
            or region_key in observation["market"].lower()
            or region_key in observation["district"].lower()
        ):
            return observation

    return observations[0]


def fetch_and_save_prices(
    db: Session,
    crop: str,
    region: str,
    days_history: int = 30,
) -> dict:
    crop_key = crop.strip().lower()
    region_key = region.strip()
    since = datetime.utcnow() - timedelta(days=days_history)

    records = (
        db.query(MarketPrice)
        .filter(
            MarketPrice.crop_name.ilike(f"%{crop_key}%"),
            MarketPrice.region.ilike(f"%{region_key}%"),
            MarketPrice.timestamp >= since,
        )
        .order_by(MarketPrice.timestamp)
        .all()
    )

    try:
        observations = _fetch_data_gov_prices(crop_key, region_key)
    except requests.RequestException:
        observations = []

    best = _best_observation(observations, region_key)

    if best:
        current_price = best["modal_price"]
        min_price = best["min_price"]
        max_price = best["max_price"]
        history = [
            {
                "date": observation["market"][:10] or observation["arrival_date"],
                "price": observation["modal_price"],
            }
            for observation in observations[:8]
        ]
        source = "data.gov.in / AGMARKNET"
        data_quality = "official"
        last_updated = best["arrival_date"]
        source_url = DATA_GOV_RESOURCE_URL
    else:
        base_price = FALLBACK_PRICES.get(crop_key, 2000.0)
        current_price = round(base_price * _region_multiplier(region_key), 2)
        min_price = round(current_price * 0.92, 2)
        max_price = round(current_price * 1.08, 2)
        source = "local estimate"
        data_quality = "estimated"
        last_updated = datetime.utcnow().strftime("%Y-%m-%d")
        source_url = None

        if len(records) >= 7:
            history = [
                {"date": record.timestamp.strftime("%Y-%m-%d"), "price": record.price}
                for record in records
            ]
        else:
            history = _fallback_history(crop_key, region_key)

    history_prices = [point["price"] for point in history]
    seasonal = _seasonal_factor(crop_key, datetime.utcnow().month)
    trend_multiplier = _trend_from_history(history_prices) if not best and records else seasonal
    predicted_price = round(current_price * trend_multiplier, 2) if not best else current_price

    delta = predicted_price - current_price
    if best:
        trend = "stable"
    elif delta > current_price * 0.03:
        trend = "rising"
    elif delta < -current_price * 0.03:
        trend = "falling"
    else:
        trend = "stable"

    confidence = 0.9 if best else min(0.65, 0.45 + len(records) * 0.02)

    forecast = [] if best else [
        {
            "date": (datetime.utcnow() + timedelta(days=day)).strftime("%b %d"),
            "price": round(current_price + (predicted_price - current_price) * (day / 7), 2),
        }
        for day in range(1, 8)
    ]

    if best:
        recommendation = (
            f"Official modal mandi price for {crop.title()} is available from "
            f"{best['market'] or region_key.title()}, {best['state']}. Compare nearby mandis before selling."
        )
    elif trend == "rising":
        recommendation = (
            f"Estimated prices for {crop.title()} may rise in {region_key.title()}. "
            "Use this only as a rough signal until official mandi data is configured."
        )
    elif trend == "falling":
        recommendation = (
            f"Estimated prices for {crop.title()} may soften in {region_key.title()}. "
            "Confirm with a nearby mandi before deciding."
        )
    else:
        recommendation = (
            f"Estimated prices for {crop.title()} are relatively stable in {region_key.title()}. "
            "Configure DATA_GOV_API_KEY for official daily mandi rates."
        )

    return {
        "crop_name": crop.strip().title(),
        "region": region_key.title(),
        "current_price": current_price,
        "predicted_price": predicted_price,
        "trend": trend,
        "confidence": round(confidence, 2),
        "unit": "INR/quintal",
        "history": history,
        "forecast": forecast,
        "observations": observations[:12],
        "source": source,
        "source_url": source_url,
        "data_quality": data_quality,
        "last_updated": last_updated,
        "market": best["market"] if best else region_key.title(),
        "district": best["district"] if best else None,
        "state": best["state"] if best else REGION_TO_STATE.get(region_key.lower()),
        "min_price": min_price,
        "max_price": max_price,
        "forecast_available": not best,
        "recommendation": recommendation,
    }
