from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
import datetime
import os
import requests
import bcrypt
from jose import JWTError, jwt

import database, models, schemas
from ml_utils import model_wrapper

app = FastAPI(title="ML Platform API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth Configuration
SECRET_KEY = os.environ.get("SECRET_KEY", "supersecretkeythatshouldbechangedinproduction")
ALGORITHM = os.environ.get("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")
# Init DB
models.Base.metadata.create_all(bind=database.engine)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

@app.post("/api/v1/auth/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = hash_password(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    token = create_access_token(data={"sub": new_user.email})
    return {"id": new_user.id, "email": new_user.email, "token": token}

@app.post("/api/v1/auth/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/v1/health")
def health(db: Session = Depends(database.get_db)):
    db_status = "ok"
    try:
        db.execute(text("SELECT 1"))
    except:
        db_status = "failed"
        
    return {
        "status": "ok",
        "db_connected": db_status == "ok",
        "model_loaded": model_wrapper.model is not None,
    }

@app.post("/api/v1/predict", response_model=schemas.PredictResponse)
def predict(request: schemas.PredictRequest, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    features = request.dict()
    try:
        result = model_wrapper.predict(features)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    hist = models.PredictionHistory(
        user_id=current_user.id,
        features=features,
        prediction=result['prediction'],
        probability=result['probability'],
        model_version=result['model_version']
    )
    db.add(hist)
    db.commit()
    
    return {**result, "timestamp": hist.timestamp}

@app.get("/api/v1/predictions/history", response_model=List[schemas.PredictionHistoryItem])
def history(skip: int = 0, limit: int = 20, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    items = db.query(models.PredictionHistory).filter(models.PredictionHistory.user_id == current_user.id).order_by(models.PredictionHistory.timestamp.desc()).offset(skip).limit(limit).all()
    return items

@app.get("/api/v1/data/explorer")
def data_explorer(page: int = 1, page_size: int = 20, db: Session = Depends(database.get_db)):
    try:
        count = db.execute(text("SELECT count(*) FROM processed_data")).scalar()
        offset = (page - 1) * page_size
        rows = db.execute(text(f"SELECT * FROM processed_data LIMIT {page_size} OFFSET {offset}")).fetchall()
        
        # Get schema
        if db.bind.dialect.name == "sqlite":
            schema = db.execute(text("PRAGMA table_info('processed_data')")).fetchall()
            schema_dict = {row[1]: row[2] for row in schema}
        else:
            schema = db.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'processed_data'")).fetchall()
            schema_dict = {row[0]: row[1] for row in schema}
        
        return {
            "total": count,
            "page": page,
            "page_size": page_size,
            "schema": schema_dict,
            "rows": [dict(row._mapping) for row in rows]
        }
    except Exception as e:
        return {"error": {"code": "DATA_EXPLORER_ERROR", "message": "Could not fetch data. Pipeline might not have run.", "details": str(e)}}

@app.get("/api/v1/pipeline/runs")
def get_pipeline_runs(db: Session = Depends(database.get_db)):
    try:
        runs = db.execute(text("SELECT * FROM pipeline_runs ORDER BY start_time DESC")).fetchall()
        return [{"id": r.id, "status": r.status, "start_time": r.start_time, "end_time": r.end_time} for r in runs]
    except:
        return []

@app.get("/api/v1/pipeline/runs/{run_id}")
def get_pipeline_run_details(run_id: str, db: Session = Depends(database.get_db)):
    try:
        run = db.execute(text("SELECT * FROM pipeline_runs WHERE id = :run_id"), {"run_id": run_id}).first()
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")
            
        stages = db.execute(text("SELECT * FROM pipeline_stages WHERE run_id = :run_id ORDER BY id ASC"), {"run_id": run_id}).fetchall()
        return {
            "run": {"id": run.id, "status": run.status, "start_time": run.start_time, "end_time": run.end_time},
            "stages": [dict(s._mapping) for s in stages]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/pipeline/trigger")
def trigger_pipeline(current_user: models.User = Depends(get_current_user)):
    # Simple trigger using requests to dagster UI
    # In production, we'd use Dagster's GraphQL API
    import uuid
    import threading
    import subprocess
    
    # We can just run it using dagster CLI locally inside docker via subprocess or docker exec, 
    # but since they share DB, running dagster materialization here or trigger via api.
    # To keep it simple, we run the dagster CLI in the background if possible, or call GraphQL
    
    def trigger():
        try:
            # Assumes running inside docker with dagster available via url
            query = """
            mutation {
                launchPipelineExecution(
                    executionParams: {
                        selector: { repositoryLocationName: "repo", repositoryName: "repo", pipelineName: "__ASSET_JOB" }
                    }
                ) {
                    __typename
                }
            }
            """
            requests.post("http://dagster-webserver:3000/graphql", json={"query": query})
        except:
            pass
            
    threading.Thread(target=trigger).start()
    return {"status": "started", "message": "Pipeline run triggered"}

@app.post("/api/v1/model/retrain")
def retrain_model(current_user: models.User = Depends(get_current_user)):
    # To trigger retraining, we can run ml/train.py.
    # We'll just execute it in a background thread
    import threading
    import subprocess
    
    def train():
        subprocess.run(["python", "/ml/train.py"])
        # Reload model after training
        model_wrapper.load_model()
        
    threading.Thread(target=train).start()
    return {"status": "started", "message": "Model retraining triggered"}

@app.get("/api/v1/metrics/model")
def model_metrics():
    # Fetch from MLflow
    from mlflow.tracking import MlflowClient
    client = MlflowClient()
    try:
        model_name = "ChurnPredictor"
        model_info = client.get_model_version_by_alias(model_name, "production")
        run = client.get_run(model_info.run_id)
        return {
            "version": model_info.version,
            "trained_at": model_info.creation_timestamp,
            "metrics": run.data.metrics,
            "params": run.data.params
        }
    except Exception as e:
        return {"error": "Could not fetch metrics", "details": str(e)}

@app.get("/api/v1/metrics/model/history")
def model_metrics_history():
    from mlflow.tracking import MlflowClient
    import mlflow
    try:
        experiment = mlflow.get_experiment_by_name("churn_prediction")
        if not experiment:
            return []
        runs = mlflow.search_runs([experiment.experiment_id])
        # Convert to list of dicts
        result = []
        for _, row in runs.iterrows():
            result.append({
                "run_id": row.get("run_id"),
                "status": row.get("status"),
                "model": row.get("params.model"),
                "f1_score": row.get("metrics.f1_score"),
                "accuracy": row.get("metrics.accuracy"),
                "start_time": row.get("start_time")
            })
        return result
    except:
        return []

