from PIL import Image
import random

REMEDIES = {
    "Tomato Leaf Blight": "Remove infected leaves, avoid overhead watering, and use copper-based fungicide.",
    "Potato Early Blight": "Use certified seeds, rotate crops, and apply recommended fungicide.",
    "Corn Leaf Spot": "Improve field drainage, remove infected residue, and use resistant varieties.",
    "Healthy Leaf": "No disease detected. Continue regular monitoring."
}

def predict_disease(image: Image.Image):
    disease = random.choice(list(REMEDIES.keys()))

    return {
        "crop": disease.split()[0],
        "disease": disease,
        "confidence": random.randint(82, 97),
        "remedy": REMEDIES[disease]
    }