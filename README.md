# AgriAI

AgriAI is an Expo + FastAPI farming assistant with:

- Local weather report and farming recommendations
- Market price dashboard
- Crop disease image analysis
- Location-based soil analysis

## App

```bash
npm install
npm start
```

## Backend

```bash
python3 -m uvicorn backend.main:app --port 8000
```

Optional market data:

```bash
export DATA_GOV_API_KEY="your_data_gov_key"
```
