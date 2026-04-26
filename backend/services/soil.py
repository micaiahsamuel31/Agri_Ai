import requests


KAEGRO_API_URL = "https://www.kaegro.com/farms/api/soil"


def get_location_details(lat: float, lon: float) -> tuple[str, str]:
    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={"lat": lat, "lon": lon, "format": "json"},
            headers={"User-Agent": "AgriAI soil analysis"},
            timeout=4,
        )
        response.raise_for_status()
        data = response.json()
        address = data.get("address", {})

        area = (
            address.get("city")
            or address.get("town")
            or address.get("village")
            or address.get("county")
            or "Unknown Area"
        )
        state = address.get("state", "Unknown State")
        country = address.get("country", "Unknown Country")

        return f"{area}, {state}, {country}", state
    except requests.RequestException:
        return "Unknown Location", "Unknown"


def get_fallback_soil(state: str) -> dict:
    region_data = {
        "Tamil Nadu": {"ph": 6.5, "texture": "red"},
        "Andhra Pradesh": {"ph": 7.5, "texture": "black"},
        "Karnataka": {"ph": 6.8, "texture": "red"},
        "Punjab": {"ph": 7.8, "texture": "loam"},
        "Maharashtra": {"ph": 7.2, "texture": "black"},
    }

    return region_data.get(state, {"ph": 6.5, "texture": "loam"})


def calculate_soil_score(ph: float, texture: str, crop: str) -> int:
    crop_key = crop.strip().lower()
    ideal_ph = {
        "rice": (5.5, 7.0),
        "wheat": (6.0, 7.5),
        "cotton": (5.8, 8.0),
        "tomato": (6.0, 7.0),
    }
    ideal_texture = {
        "rice": ["clay", "loamy"],
        "wheat": ["loam"],
        "cotton": ["black", "clay"],
        "tomato": ["loam", "sandy loam"],
    }

    score = 0
    if crop_key in ideal_ph:
        low, high = ideal_ph[crop_key]
        if low <= ph <= high:
            score += 60
        else:
            diff = min(abs(ph - low), abs(ph - high))
            score += max(60 - diff * 15, 0)

    if crop_key in ideal_texture:
        if texture.lower() in ideal_texture[crop_key]:
            score += 40
        else:
            score += 20

    return int(min(score, 100))


def get_soil_label(score: int) -> str:
    if score >= 80:
        return "Excellent"
    if score >= 50:
        return "Moderate"
    return "Poor"


def get_soil_recommendation(score: int, crop: str, texture: str) -> tuple[str, str]:
    crop_name = crop.strip().title()

    if score >= 80:
        return (
            f"Soil conditions look strong for {crop_name}. Maintain regular irrigation and monitoring.",
            "Use balanced compost or farmyard manure to maintain nutrient levels.",
        )

    if score >= 50:
        return (
            f"Soil is usable for {crop_name}, but texture or pH may need correction.",
            "Apply organic matter and use a crop-specific NPK fertilizer after a local soil test.",
        )

    return (
        f"Soil may not be ideal for {crop_name} right now, especially with {texture} texture.",
        "Consult a local agriculture office and correct pH/nutrients before sowing.",
    )


def analyze_soil(lat: float, lon: float, crop: str = "rice") -> dict:
    location_name, state = get_location_details(lat, lon)
    source = "regional fallback"

    try:
        response = requests.get(
            KAEGRO_API_URL,
            params={"lat": lat, "lon": lon},
            timeout=3,
        )
        response.raise_for_status()
        data = response.json()

        ph = data.get("ph")
        texture = data.get("texture")
        if ph is None or texture is None:
            raise ValueError("Missing soil data")

        source = "Kaegro soil API"
    except (requests.RequestException, ValueError):
        fallback = get_fallback_soil(state)
        ph = fallback["ph"]
        texture = fallback["texture"]

    score = calculate_soil_score(float(ph), str(texture), crop)
    label = get_soil_label(score)
    recommendation, fertilizer = get_soil_recommendation(score, crop, str(texture))

    return {
        "location": {"lat": lat, "lon": lon},
        "place": location_name,
        "region": state,
        "soil_data": {"ph": float(ph)},
        "analysis": {"texture": str(texture)},
        "crop": crop,
        "soil_score": score,
        "soil_label": label,
        "recommendation": recommendation,
        "fertilizer": fertilizer,
        "source": source,
    }
