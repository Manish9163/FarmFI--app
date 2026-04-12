# FarmFi: Predictive Agriculture & Smart B2C Marketplace 🌾🚀

FarmFi is a production-grade, multi-role mobile ecosystem designed to empower farmers, buyers, and agricultural workers. By leveraging AI-driven predictive analytics, real-time telemetry, and a secure B2C marketplace, FarmFi bridges the gap between traditional farming and modern financial technology.

---

## 📸 Platform Overview

![FarmFi Dashboard](assets/readme_mockups/dashboard.png)
*A premium Glassmorphism dashboard providing real-time telemetry and service access.*

![FarmFi Marketplace](assets/readme_mockups/marketplace.png)
*Direct Farm-to-Table marketplace with ACID-compliant inventory management.*

![FarmFi AI Advisory](assets/readme_mockups/ai_advisory.png)
*AI-driven crop selection and disease prediction engine.*

---

## ✨ Why FarmFi? (Agricultural Benefits)

FarmFi isn't just an app; it's a complete operating system for the modern farm.

### 🔬 1. AI-Powered Disease Detection
Farmers can use their smartphone camera to scan crops for diseases. Our backend uses high-concurrency CNN (Convolutional Neural Networks) to identify pathogens instantly, providing immediate countermeasures to save the harvest.

### ⛅ 2. Smart Environmental Telemetry
We calculate the **Soil Temperature** mathematically by averaging local weather data with the farm's base telemetry. This provides a precision-grade environment map for different crops without requiring expensive sensors in every square meter.

### 💰 3. Financial Inclusion (Credit & Finance)
FarmFi features a built-in credit system with secure KYC (Pan/Aadhar). Farmers can apply for 3-month loans with interest calculations handled natively. We track farm size, family size, and historical yields to determine creditworthiness.

### 🛒 4. B2C Vegetable Marketplace
Direct farm-to-table. Farmers list their fresh produce (pumpkins, tomatoes, wheat, etc.) directly. Buyers (Consumers/Restaurants) can purchase in real-time. Our backend implements **ACID-compliant transactions** (SELECT FOR UPDATE) to prevent overselling of limited stock.

### 👷 5. Worker Marketplace
A dedicated portal connecting farmers with vetted agricultural workers. Workers can find employment, and farmers can scale their human capital during peak harvest seasons.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React Native (Expo SDK 54), Lucide Icons |
| **Backend** | Python (Flask), Waitress (Production WSGI) |
| **Security** | Flask-Talisman (CSP), Flask-Limiter (Rate Limiting) |
| **Database** | MySQL (with connection pooling) |
| **Globalization** | i18next (English & Hindi support) |

---

## 🔒 Security & Scale

FarmFi is built to handle thousands of concurrent requests:
- **Rate Limiting**: 150 requests per minute to prevent API abuse.
- **Multithreading**: Waitress WSGI ensures responsive API calls even under heavy load.
- **Global Error Handling**: Standardized JSON error objects for all HTTP status codes.
- **Role-Based Access (RBAC)**: Buyers, Farmers, and Workers only see the tools relevant to their specific role.

---

## 🚀 Getting Started

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/Scripts/activate # Windows
pip install -r requirements.txt
py app.py
```

### 2. Mobile App Setup
```bash
npx expo start -c
```

---

## 🌍 Multilingual
Supports **English** and **Hindi** natively, ensuring accessibility for all demographics in the agricultural sector.

Designed with ❤️ for the future of Farming.
