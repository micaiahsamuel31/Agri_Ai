from fastapi import FastAPI
import requests

app = FastAPI()

KAEGRO_API_URL = "https://www.kaegro.com/farms/api/soil"


# 🌍 Get full location + state
def get_location_details(lat, lon):
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json"
        res = requests.get(url, headers={"User-Agent": "soil-app"})
        data = res.json()

        address = data.get("address", {})

        area = (
            address.get("city")
            or address.get("town")
            or address.get("village")
            or "Unknown Area"
        )

        state = address.get("state", "Unknown State")
        country = address.get("country", "Unknown Country")

        full_location = f"{area}, {state}, {country}"

        return full_location, state

    except:
        return "Unknown Location", "Unknown"


# 🌱 Region-based fallback soil
def get_fallback_soil(state):
    region_data = {
        "Tamil Nadu": {"ph": 6.5, "texture": "red"},
        "Andhra Pradesh": {"ph": 7.5, "texture": "black"},
        "Karnataka": {"ph": 6.8, "texture": "red"},
        "Punjab": {"ph": 7.8, "texture": "loam"},
        "Maharashtra": {"ph": 7.2, "texture": "black"},
    }

    return region_data.get(state, {"ph": 6.5, "texture": "loam"})


# 🧠 Smarter soil scoring
def calculate_soil_score(ph, texture, crop):
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

    # 🌿 pH scoring (0–60)
    if crop in ideal_ph:
        low, high = ideal_ph[crop]

        if low <= ph <= high:
            score += 60
        else:
            diff = min(abs(ph - low), abs(ph - high))
            penalty = diff * 15
            score += max(60 - penalty, 0)

    # 🌱 texture scoring (0–40)
    if crop in ideal_texture:
        if texture.lower() in ideal_texture[crop]:
            score += 40
        else:
            score += 20  # partial credit

    return int(min(score, 100))


# 🏷️ Soil quality label
def get_soil_label(score):
    if score >= 80:
        return "Excellent"
    elif score >= 50:
        return "Moderate"
    else:
        return "Poor"


@app.get("/soil")
def get_soil(lat: float, lon: float, crop: str = "rice"):

    # 🌍 Location
    location_name, state = get_location_details(lat, lon)

    # 🌐 Try Kaegro API
    try:
        response = requests.get(
            KAEGRO_API_URL,
            params={"lat": lat, "lon": lon},
            timeout=3
        )
        data = response.json()

        ph = data.get("ph")
        texture = data.get("texture")

        if ph is None or texture is None:
            raise Exception("Missing data")

    except:
        fallback = get_fallback_soil(state)
        ph = fallback["ph"]
        texture = fallback["texture"]

    # 🧠 Score + label
    score = calculate_soil_score(ph, texture, crop)
    label = get_soil_label(score)

    return {
        "location": {"lat": lat, "lon": lon},
        "place": location_name,
        "region": state,
        "soil_data": {"ph": ph},
        "analysis": {"texture": texture},
        "crop": crop,
        "soil_score": score,
        "soil_label": label,
        "recommendation": "Suitable for cultivation",
        "fertilizer": "Apply nitrogen-rich fertilizer"
    }