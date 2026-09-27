import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from xgboost import XGBClassifier
import mlflow
import mlflow.sklearn
import mlflow.xgboost
from mlflow.tracking import MlflowClient

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')

def load_data():
    parquet_path = os.path.join(DATA_DIR, 'processed', 'features.parquet')
    if not os.path.exists(parquet_path):
        raise FileNotFoundError(f"Processed data not found at {parquet_path}. Run pipeline first.")
    df = pd.read_parquet(parquet_path)
    return df

def train():
    mlflow.set_tracking_uri(os.environ.get("MLFLOW_TRACKING_URI", "http://localhost:5000"))
    mlflow.set_experiment("churn_prediction")
    
    df = load_data()
    X = df.drop(columns=['customer_id', 'churn'])
    y = df['churn']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    numeric_features = ['age', 'tenure', 'monthly_charges', 'total_charges', 'avg_charge_per_month']
    categorical_features = ['contract_type', 'internet_service']
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numeric_features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ])
    
    models = {
        "LogisticRegression": LogisticRegression(max_iter=1000, random_state=42),
        "XGBoost": XGBClassifier(eval_metric='logloss', random_state=42)
    }
    
    best_f1 = 0
    best_run_id = None
    best_model_name = None
    
    for model_name, model in models.items():
        with mlflow.start_run(run_name=model_name) as run:
            clf = Pipeline(steps=[('preprocessor', preprocessor),
                                  ('classifier', model)])
            
            clf.fit(X_train, y_train)
            y_pred = clf.predict(X_test)
            if hasattr(clf, "predict_proba"):
                y_prob = clf.predict_proba(X_test)[:, 1]
                auc = roc_auc_score(y_test, y_prob)
            else:
                auc = 0.0
                
            acc = accuracy_score(y_test, y_pred)
            prec = precision_score(y_test, y_pred)
            rec = recall_score(y_test, y_pred)
            f1 = f1_score(y_test, y_pred)
            
            mlflow.log_params({"model": model_name})
            mlflow.log_metrics({
                "accuracy": acc,
                "precision": prec,
                "recall": rec,
                "f1_score": f1,
                "roc_auc": auc
            })
            
            # Log the full pipeline - trust XGBoost types explicitly
            trusted_types = [
                'xgboost.core.Booster',
                'xgboost.sklearn.XGBClassifier',
            ]
            model_info = mlflow.sklearn.log_model(
                clf, "model",
                skops_trusted_types=trusted_types
            )
            
            if f1 > best_f1:
                best_f1 = f1
                best_run_id = run.info.run_id
                best_model_name = model_name
                
    # Promote the best model to Production
    client = MlflowClient()
    model_registry_name = "ChurnPredictor"
    try:
        client.create_registered_model(model_registry_name)
    except:
        pass  # Already exists

    # Build the model source URI from the run ID directly
    best_model_uri = f"runs:/{best_run_id}/model"
        
    model_version = client.create_model_version(
        name=model_registry_name,
        source=best_model_uri,
        run_id=best_run_id
    )
    
    # In newer MLflow, aliasing is preferred over Stages
    client.set_registered_model_alias(model_registry_name, "production", model_version.version)
    
    print(f"Registered {best_model_name} as production with F1: {best_f1:.4f}")
    return {"best_model": best_model_name, "f1_score": best_f1}

if __name__ == "__main__":
    train()
