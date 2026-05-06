from pathlib import Path

from PIL import Image
from PIL import ImageStat

MODEL_PATH = "backend/ai/crop_disease_model.pth"

CLASS_NAMES = [
    "Healthy",
    "Leaf Spot",
    "Leaf Blight",
    "Powdery Mildew",
    "Rust Disease",
]

model = None
transform = None
model_error: str | None = None


def load_model():
    global model, transform, model_error

    if model is not None:
        return model, transform

    if not Path(MODEL_PATH).exists():
        model_error = f"Model file not found at {MODEL_PATH}"
        return None, None

    try:
        import torch
        from torchvision import transforms

        loaded_model = torch.load(MODEL_PATH, map_location=torch.device("cpu"))
        loaded_model.eval()

        loaded_transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ])
    except Exception as exc:
        model_error = str(exc)
        return None, None

    model = loaded_model
    transform = loaded_transform
    model_error = None
    return model, transform


def get_severity(confidence: float, disease_name: str) -> str:
    if "healthy" in disease_name.lower():
        return "low"

    if confidence < 0.60:
        return "low"
    elif confidence < 0.85:
        return "medium"
    else:
        return "high"


def get_recommendations(disease_name: str):
    disease = disease_name.lower()

    if "healthy" in disease:
        return [
            "Crop appears healthy.",
            "Continue regular watering and monitoring.",
            "Keep leaves clean and avoid overcrowding.",
        ]

    if "spot" in disease:
        return [
            "Remove affected leaves carefully.",
            "Avoid overhead watering.",
            "Improve airflow around the crop.",
            "Use suitable treatment only after expert confirmation.",
        ]

    if "blight" in disease:
        return [
            "Remove badly infected parts of the plant.",
            "Avoid wet conditions around leaves.",
            "Separate affected plants if possible.",
            "Contact a local agriculture expert for treatment advice.",
        ]

    if "mildew" in disease:
        return [
            "Improve sunlight and airflow.",
            "Avoid excessive moisture.",
            "Remove infected leaves.",
            "Use recommended fungicide only after expert advice.",
        ]

    if "rust" in disease:
        return [
            "Remove infected leaves.",
            "Avoid watering leaves directly.",
            "Keep enough spacing between plants.",
            "Consult an expert before using fungicide.",
        ]

    return [
        "Monitor the crop closely.",
        "Remove damaged leaves if infection spreads.",
        "Improve airflow and avoid excess moisture.",
        "Consult a local agriculture expert.",
    ]


def fallback_prediction(image: Image.Image):
    thumbnail = image.resize((96, 96)).convert("RGB")
    pixels = list(thumbnail.getdata())
    stat = ImageStat.Stat(thumbnail)
    red, green, blue = stat.mean

    total = max(len(pixels), 1)
    green_pixels = sum(1 for r, g, b in pixels if g > r * 1.08 and g > b * 1.08)
    yellow_brown_pixels = sum(1 for r, g, b in pixels if r > 95 and g > 70 and b < 95 and r >= g)
    dark_spot_pixels = sum(1 for r, g, b in pixels if r < 70 and g < 80 and b < 70)

    green_ratio = green_pixels / total
    yellow_brown_ratio = yellow_brown_pixels / total
    dark_spot_ratio = dark_spot_pixels / total

    if green_ratio > 0.45 and yellow_brown_ratio < 0.08 and dark_spot_ratio < 0.08:
        disease_name = "Healthy Leaf"
        confidence = 0.72
    elif yellow_brown_ratio > 0.18 or (red > green and green > blue):
        disease_name = "Leaf Blight"
        confidence = min(0.86, 0.58 + yellow_brown_ratio)
    elif dark_spot_ratio > 0.12:
        disease_name = "Leaf Spot"
        confidence = min(0.84, 0.56 + dark_spot_ratio)
    elif green_ratio < 0.25:
        disease_name = "Possible Leaf Stress"
        confidence = 0.55
    else:
        disease_name = "Healthy Leaf"
        confidence = 0.60

    severity = get_severity(confidence, disease_name)

    return {
        "disease_name": disease_name,
        "confidence": confidence,
        "severity": severity,
        "recommendations": get_recommendations(disease_name),
        "notes": (
            "Fallback image analysis was used because the trained model file is missing. "
            "Add backend/ai/crop_disease_model.pth for real model predictions."
        ),
    }


def predict_disease(image: Image.Image):
    loaded_model, loaded_transform = load_model()
    if loaded_model is None or loaded_transform is None:
        return fallback_prediction(image)

    import torch
    import torch.nn.functional as F

    image_tensor = loaded_transform(image).unsqueeze(0)

    with torch.no_grad():
        outputs = loaded_model(image_tensor)
        probabilities = F.softmax(outputs, dim=1)
        confidence, predicted_index = torch.max(probabilities, dim=1)

    confidence_value = float(confidence.item())
    disease_name = CLASS_NAMES[predicted_index.item()]
    severity = get_severity(confidence_value, disease_name)

    return {
        "disease_name": disease_name,
        "confidence": confidence_value,
        "severity": severity,
        "recommendations": get_recommendations(disease_name),
        "notes": "Prediction is generated from the uploaded crop image using the trained AI model.",
    }
