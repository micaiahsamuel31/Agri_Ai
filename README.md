# AgriAI - Intelligent Farming Assistant

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-66.3%25-blue)
![Python](https://img.shields.io/badge/Python-33.4%25-green)
![Repository Size](https://img.shields.io/github/languages/code-size/micaiahsamuel31/Agri_Ai)

**AgriAI** is a comprehensive mobile and web farming assistant application built with modern technologies. It leverages real-time weather data, market information, AI-powered crop disease detection, and soil analysis to help farmers make informed decisions and optimize their agricultural practices.

## 🌾 Features

### Core Capabilities

- **🌤️ Local Weather Reports & Farming Recommendations**
  - Real-time weather forecasting tailored to your location
  - AI-driven farming recommendations based on current and forecasted weather conditions
  - Alerts for adverse weather conditions

- **💰 Market Price Dashboard**
  - Real-time agricultural commodity price tracking
  - Historical price trends and market analysis
  - Integration with government market data APIs for accurate pricing information

- **🔬 Crop Disease Image Analysis**
  - AI-powered image recognition for crop disease detection
  - Instant disease identification and severity assessment
  - Treatment recommendations for identified crop diseases

- **🗺️ Location-Based Soil Analysis**
  - Geolocation-enabled soil quality assessment
  - Soil composition insights specific to your farming area
  - Recommendations for soil improvement and crop suitability

## 🏗️ Tech Stack

### Frontend
- **Expo** - Cross-platform mobile development framework
- **React Native** - Mobile app development
- **TypeScript** - Type-safe JavaScript (66.3% of codebase)

### Backend
- **FastAPI** - High-performance Python web framework
- **Python** - Server-side logic (33.4% of codebase)
- **Uvicorn** - ASGI server for running FastAPI

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn** package manager
- **Python 3.8** or higher
- **pip** package manager
- Expo CLI (installed globally: `npm install -g expo-cli`)

## 🚀 Getting Started

### Frontend Setup (Mobile App)

```bash
# Install dependencies
npm install

# Start the Expo development server
npm start

# Options:
# - Press 'i' for iOS simulator
# - Press 'a' for Android emulator
# - Scan QR code with Expo Go app on physical device
```

### Backend Setup (FastAPI Server)

```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI server
python3 -m uvicorn backend.main:app --port 8000

# The API will be available at http://localhost:8000
# Interactive API documentation: http://localhost:8000/docs
```

### Environment Configuration

#### Market Data Integration (Optional)

To enable real-time market data from government sources:

```bash
export DATA_GOV_API_KEY="your_data_gov_api_key_here"
```

Or create a `.env` file in the backend directory:

```env
DATA_GOV_API_KEY=your_data_gov_api_key_here
```

To obtain a Data.gov API key, visit [data.gov](https://data.gov) and register for an account.

## 📁 Project Structure

```
Agri_Ai/
├── frontend/              # Expo React Native mobile app
│   ├── src/
│   ├── package.json
│   └── app.json
├── backend/               # FastAPI server
│   ├── main.py
│   ├── requirements.txt
│   └── routes/
├── README.md
└── .env.example
```

## 🔌 API Endpoints

The backend API provides the following main endpoints:

- `GET /health` - Health check endpoint
- `POST /weather` - Get weather data for location
- `POST /recommendations` - Get farming recommendations
- `GET /market-prices` - Get current market prices
- `POST /analyze-disease` - Analyze crop disease from image
- `POST /soil-analysis` - Get soil analysis data

For detailed API documentation, run the backend and visit `http://localhost:8000/docs`

## 🤝 Contributing

We welcome contributions! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Micaiah Samuel**
- GitHub: [@micaiahsamuel31](https://github.com/micaiahsamuel31)

## 🙋 Support & Issues

If you encounter any issues or have questions, please:

1. Check existing [GitHub Issues](https://github.com/micaiahsamuel31/Agri_Ai/issues)
2. Create a new issue with detailed information about your problem
3. Include steps to reproduce and your environment details

## 🎯 Future Enhancements

- [ ] Multi-language support
- [ ] Offline mode with data synchronization
- [ ] Advanced weather prediction models
- [ ] Integration with IoT farm sensors
- [ ] Yield prediction algorithms
- [ ] Farmer community forum

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Native Docs](https://reactnative.dev/)
- [Python Documentation](https://docs.python.org/)

---

**Last Updated:** May 2026