$VENV_DIR = "$PWD\.venv\Scripts"

# Start MLflow Server
Start-Process -NoNewWindow -FilePath "$VENV_DIR\mlflow.exe" -ArgumentList "server --host 127.0.0.1 --port 5000"

# Start Dagster
$env:DAGSTER_HOME = "$PWD\pipeline\dagster_home"
cd pipeline
Start-Process -NoNewWindow -FilePath "$VENV_DIR\dagster-daemon.exe" -ArgumentList "run"
Start-Process -NoNewWindow -FilePath "$VENV_DIR\dagster-webserver.exe" -ArgumentList "-h 127.0.0.1 -p 3000"
cd ..

# Start FastAPI Backend
$env:DATABASE_URL = "sqlite:///./mlplatform.db"
$env:MLFLOW_TRACKING_URI = "http://127.0.0.1:5000"
cd backend
Start-Process -NoNewWindow -FilePath "$VENV_DIR\uvicorn.exe" -ArgumentList "main:app --host 127.0.0.1 --port 8000"
cd ..

Write-Host "Backend services launched!"
