# Create virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1

# Install requirements
pip install -r backend\requirements.txt
pip install -r ml\requirements.txt
pip install -r pipeline\requirements.txt

# Start MLflow Server
Start-Process -NoNewWindow -FilePath "mlflow" -ArgumentList "server --host 127.0.0.1 --port 5000"

# Setup Frontend
cd frontend
npm install
# Start Frontend
Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run dev -- --port 5173"
cd ..

# Start Dagster
$env:DAGSTER_HOME = "$PWD\pipeline\dagster_home"
mkdir -p $env:DAGSTER_HOME
cd pipeline
# Overwrite dagster.yaml to be empty or remove it so it defaults to SQLite
Remove-Item -Path dagster.yaml -ErrorAction SilentlyContinue
Start-Process -NoNewWindow -FilePath "dagster-daemon" -ArgumentList "run"
Start-Process -NoNewWindow -FilePath "dagster-webserver" -ArgumentList "-h 127.0.0.1 -p 3000"
cd ..

# Start FastAPI Backend
$env:DATABASE_URL = "sqlite:///./mlplatform.db"
$env:MLFLOW_TRACKING_URI = "http://127.0.0.1:5000"
cd backend
Start-Process -NoNewWindow -FilePath "uvicorn" -ArgumentList "main:app --host 127.0.0.1 --port 8000"
cd ..

Write-Host "All services started!"
Write-Host "Frontend: http://localhost:5173"
Write-Host "Backend API: http://localhost:8000"
Write-Host "Dagster UI: http://localhost:3000"
Write-Host "MLflow UI: http://localhost:5000"
