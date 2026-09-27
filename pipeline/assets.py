import pandas as pd
import numpy as np
import os
from dagster import asset, Output, MetadataValue, get_dagster_logger
from sqlalchemy import create_engine
import sys

# Add current dir to path to import db
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db import init_db, create_run, update_run, log_stage

logger = get_dagster_logger()
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')

def get_run_id(context):
    return context.run_id

@asset
def ingest(context) -> Output[pd.DataFrame]:
    run_id = get_run_id(context)
    init_db()
    create_run(run_id)
    log_stage(run_id, "ingest", "running")
    
    try:
        raw_file = os.path.join(DATA_DIR, 'raw_customers.csv')
        if not os.path.exists(raw_file):
            # Fallback to generating it if it doesn't exist
            from generate_data import generate_telecom_data
            df = generate_telecom_data(5000)
            os.makedirs(DATA_DIR, exist_ok=True)
            df.to_csv(raw_file, index=False)
        else:
            df = pd.read_csv(raw_file)
            
        rows_in = len(df)
        log_stage(run_id, "ingest", "success", rows_in=rows_in, rows_out=rows_in)
        return Output(df, metadata={"num_records": len(df)})
    except Exception as e:
        log_stage(run_id, "ingest", "failed", log_message=str(e))
        update_run(run_id, "failed")
        raise e

@asset
def validate(context, ingest: pd.DataFrame) -> Output[pd.DataFrame]:
    run_id = get_run_id(context)
    log_stage(run_id, "validate", "running", rows_in=len(ingest))
    try:
        # Simple validation: ensure required columns exist
        required_cols = ['customer_id', 'age', 'tenure', 'monthly_charges', 'total_charges', 'churn']
        for col in required_cols:
            if col not in ingest.columns:
                raise ValueError(f"Missing required column: {col}")
        
        log_stage(run_id, "validate", "success", rows_out=len(ingest))
        return Output(ingest, metadata={"num_records": len(ingest), "status": "validated"})
    except Exception as e:
        log_stage(run_id, "validate", "failed", log_message=str(e))
        update_run(run_id, "failed")
        raise e

@asset
def clean(context, validate: pd.DataFrame) -> Output[pd.DataFrame]:
    run_id = get_run_id(context)
    log_stage(run_id, "clean", "running", rows_in=len(validate))
    try:
        df = validate.copy()
        
        # 1. Fill missing total_charges with tenure * monthly_charges
        missing_mask = df['total_charges'].isna()
        df.loc[missing_mask, 'total_charges'] = df.loc[missing_mask, 'tenure'] * df.loc[missing_mask, 'monthly_charges']
        
        # 2. Cap outliers in monthly_charges
        df['monthly_charges'] = np.where(df['monthly_charges'] > 200, 120.0, df['monthly_charges'])
        
        # 3. Drop negative tenures if any
        df = df[df['tenure'] >= 0]
        
        log_stage(run_id, "clean", "success", rows_out=len(df))
        return Output(df, metadata={"num_records": len(df)})
    except Exception as e:
        log_stage(run_id, "clean", "failed", log_message=str(e))
        update_run(run_id, "failed")
        raise e

@asset
def transform(context, clean: pd.DataFrame) -> Output[pd.DataFrame]:
    run_id = get_run_id(context)
    log_stage(run_id, "transform", "running", rows_in=len(clean))
    try:
        df = clean.copy()
        # Binary encode churn
        df['churn'] = df['churn'].map({'Yes': 1, 'No': 0})
        
        # Create categorical features list
        df['contract_type'] = df['contract_type'].fillna('Unknown')
        df['internet_service'] = df['internet_service'].fillna('Unknown')
        
        log_stage(run_id, "transform", "success", rows_out=len(df))
        return Output(df, metadata={"num_records": len(df)})
    except Exception as e:
        log_stage(run_id, "transform", "failed", log_message=str(e))
        update_run(run_id, "failed")
        raise e

@asset
def feature_engineer(context, transform: pd.DataFrame) -> Output[pd.DataFrame]:
    run_id = get_run_id(context)
    log_stage(run_id, "feature_engineer", "running", rows_in=len(transform))
    try:
        df = transform.copy()
        # New feature: average charge per month (from total)
        df['avg_charge_per_month'] = np.where(df['tenure'] > 0, df['total_charges'] / df['tenure'], df['monthly_charges'])
        
        # Save as parquet for ML step
        processed_dir = os.path.join(DATA_DIR, 'processed')
        os.makedirs(processed_dir, exist_ok=True)
        parquet_path = os.path.join(processed_dir, 'features.parquet')
        df.to_parquet(parquet_path, index=False)
        
        log_stage(run_id, "feature_engineer", "success", rows_out=len(df))
        return Output(df, metadata={"num_records": len(df), "path": parquet_path})
    except Exception as e:
        log_stage(run_id, "feature_engineer", "failed", log_message=str(e))
        update_run(run_id, "failed")
        raise e

@asset
def load(context, feature_engineer: pd.DataFrame) -> Output[str]:
    run_id = get_run_id(context)
    log_stage(run_id, "load", "running", rows_in=len(feature_engineer))
    try:
        DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///../backend/mlplatform.db")
        engine = create_engine(DATABASE_URL)
        # We save this final table to query in data explorer
        feature_engineer.to_sql('processed_data', engine, if_exists='replace', index=False)
        
        log_stage(run_id, "load", "success", rows_out=len(feature_engineer))
        update_run(run_id, "success")
        return Output("Success", metadata={"table": "processed_data", "rows": len(feature_engineer)})
    except Exception as e:
        log_stage(run_id, "load", "failed", log_message=str(e))
        update_run(run_id, "failed")
        raise e
