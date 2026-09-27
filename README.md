# Predictive Model — Customer Churn ML Platform

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![MLflow](https://img.shields.io/badge/MLflow-2.x-0194E2?style=for-the-badge&logo=mlflow&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**A production-grade, end-to-end Machine Learning platform for Customer Churn Prediction.**  
Combines a data engineering pipeline, ML experiment tracking, a REST API backend, and a modern React dashboard — all containerised with Docker.

---

## Features

| Layer | Technology | Purpose |
|---|---|---|
| **Data Engineering** | Dagster | Orchestrated pipeline: ingest → validate → clean → transform → feature engineer → load |
| **Machine Learning** | Scikit-learn, XGBoost, MLflow | Experiment tracking, model registry, auto-selection of best model |
| **Explainability** | SHAP | Per-prediction feature contribution explanations |
| **Backend API** | FastAPI, SQLAlchemy, JWT | Auth, predictions, pipeline triggers, metrics endpoints |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS | Dark/light dashboard with charts (Recharts) and reactive forms |
| **Containerisation** | Docker Compose | One-command spin-up for all services |

---

## Architecture

```
Synthetic Data Generator
        |
        v
  Dagster Pipeline
  (ingest -> validate -> clean -> transform -> feature_engineer -> load)
        |                           |
        v                           v
  Raw CSV / Clean Data       Parquet Features
                                    |
                        +-----------+-----------+
                        |                       |
                        v                       v
             SQLite/PostgreSQL DW        ML Training
                        |              (Scikit-learn + XGBoost)
                        |                       |
                        |              MLflow Tracking Server
                        |              MLflow Model Registry
                        |                       |
                    FastAPI Backend <-----------+
                        |
                    React Frontend
```

---

## Quickstart

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended)
- OR Python 3.11+ and Node 18+ for local development

### Option 1 — Docker Compose (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/Sharmadhruv123/Predictive-Model-ML-.git
cd Predictive-Model-ML-

# 2. Copy and edit environment variables
cp .env.example .env

# 3. Start all services
docker-compose up --build
```

### Access Points

| Service | URL |
|---|---|
| Frontend Dashboard | http://localhost:5173 |
| FastAPI Docs (Swagger) | http://localhost:8000/docs |
| Dagster Webserver | http://localhost:3000 |
| MLflow Tracking UI | http://localhost:5000 |

### Option 2 — Local Development (PowerShell)

```powershell
# Run the automated startup script
.\start.ps1
```

---

## First-Run Initialization

After starting all services:

1. **Trigger the data pipeline** — Open the Dagster UI at http://localhost:3000 and run `__ASSET_JOB` to generate synthetic data and populate the data warehouse. (You can also trigger this from the Frontend under "Pipeline Runs".)

2. **Register and log in** — Open the Frontend Dashboard at http://localhost:5173, create an account, and sign in.

3. **Train the model** — Go to **Model Metrics** and click **"Retrain Model"**. This runs the XGBoost/Logistic Regression training pipeline, logs metrics to MLflow, and registers the best model to the production registry.

4. **Make predictions** — Navigate to the **Predict** page. Submit customer features to receive a live churn probability with SHAP-powered feature explanations.

---

## Project Structure

```
.
├── backend/                  # FastAPI service
│   ├── main.py               # All API routes (auth, predict, pipeline, metrics)
│   ├── models.py             # SQLAlchemy ORM models
│   ├── schemas.py            # Pydantic request/response schemas
│   ├── database.py           # DB engine & session factory
│   ├── ml_utils.py           # MLflow model loading wrapper
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/                 # React + Vite + TypeScript dashboard
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   └── pages/            # Dashboard, Predict, Metrics, Pipeline pages
│   ├── package.json
│   └── Dockerfile
│
├── ml/                       # Machine Learning training
│   ├── train.py              # Scikit-learn + XGBoost + SHAP + MLflow integration
│   ├── requirements.txt
│   └── Dockerfile.mlflow     # MLflow tracking server image
│
├── pipeline/                 # Dagster data engineering pipeline
│   ├── assets.py             # Dagster assets: ingest, validate, clean, transform, load
│   ├── generate_data.py      # Synthetic customer data generator
│   ├── db.py                 # Pipeline DB helpers
│   ├── repo.py               # Dagster repository definition
│   └── requirements.txt
│
├── data/                     # Raw & processed data (git-ignored)
├── infra/                    # Infrastructure configs (PostgreSQL, etc.)
├── tests/                    # Unit and integration tests
│
├── docker-compose.yml        # Multi-service orchestration
├── .env.example              # Environment variable template
├── start.ps1                 # Windows PowerShell startup script
└── README.md
```

---

## API Reference

All endpoints are documented interactively at `http://localhost:8000/docs`.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Register a new user |
| `POST` | `/api/v1/auth/login` | Login and receive a JWT token |

### Predictions

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/predict` | Submit customer features — get churn probability + SHAP values |
| `GET` | `/api/v1/predictions/history` | Get current user's prediction history |

### Pipeline & Model

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/pipeline/trigger` | Trigger a Dagster pipeline run |
| `GET` | `/api/v1/pipeline/runs` | List all pipeline run records |
| `POST` | `/api/v1/model/retrain` | Trigger model retraining via MLflow |
| `GET` | `/api/v1/metrics/model` | Fetch current production model metrics |
| `GET` | `/api/v1/metrics/model/history` | Fetch historical experiment run metrics |

### Data

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/data/explorer` | Paginated view of the processed data warehouse |
| `GET` | `/api/v1/health` | Health check: DB connection + model load status |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
# Backend
SECRET_KEY=your-super-secret-jwt-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Database (SQLite for local dev, PostgreSQL for production)
DATABASE_URL=sqlite:///./mlplatform.db

# MLflow
MLFLOW_TRACKING_URI=http://mlflow:5000
```

---

## Running Tests

```bash
# From the project root (with venv active or via Docker)
pytest tests/ -v
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## License

This project is licensed under the **MIT License**.

---

## Author

**Dhruv Sharma**  
Email: 2004dhrusharma@gmail.com  
GitHub: https://github.com/Sharmadhruv123

---

Built with FastAPI, React, MLflow, Dagster, and Docker
