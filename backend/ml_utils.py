import os
import mlflow.sklearn
from mlflow.tracking import MlflowClient
import pandas as pd
import numpy as np
import shap

mlflow.set_tracking_uri(os.environ.get("MLFLOW_TRACKING_URI", "http://localhost:5000"))

class ModelWrapper:
    def __init__(self):
        self.model = None
        self.version = None
        self.explainer = None
        self.load_model()
        
    def load_model(self):
        client = MlflowClient()
        try:
            model_name = "ChurnPredictor"
            model_info = client.get_model_version_by_alias(model_name, "production")
            model_uri = f"models:/{model_name}@production"
            self.model = mlflow.sklearn.load_model(model_uri)
            self.version = model_info.version
            print(f"Loaded {model_name} version {self.version}")
            
            # Setup SHAP explainer
            # The model is a sklearn Pipeline (preprocessor -> classifier)
            # TreeExplainer is ideal for XGBoost, but since we have a pipeline,
            # we can use shap.Explainer or shap.TreeExplainer on the classifier step.
            classifier = self.model.named_steps['classifier']
            
            # Try TreeExplainer, fallback to generic Explainer
            try:
                self.explainer = shap.TreeExplainer(classifier)
            except:
                self.explainer = shap.Explainer(classifier)
                
        except Exception as e:
            print(f"Warning: Could not load production model: {e}")
            self.model = None
            self.version = "unknown"
            self.explainer = None

    def predict(self, features: dict):
        if not self.model:
            self.load_model()
        if not self.model:
            raise RuntimeError("Model not loaded and could not be fetched from MLflow")
            
        # Add avg_charge_per_month feature which is engineered in the pipeline
        df = pd.DataFrame([features])
        df['avg_charge_per_month'] = np.where(df['tenure'] > 0, df['total_charges'] / df['tenure'], df['monthly_charges'])
        
        # Predict
        pred = self.model.predict(df)[0]
        prob = 0.0
        if hasattr(self.model, "predict_proba"):
            prob = self.model.predict_proba(df)[0][1]
            
        # Explain
        explanations = []
        if self.explainer:
            try:
                preprocessor = self.model.named_steps['preprocessor']
                X_transformed = preprocessor.transform(df)
                
                # Get feature names after transformation
                cat_encoder = preprocessor.named_transformers_['cat']
                cat_features = preprocessor.transformers_[1][2]
                cat_names = cat_encoder.get_feature_names_out(cat_features)
                num_features = preprocessor.transformers_[0][2]
                feature_names = list(num_features) + list(cat_names)
                
                shap_values = self.explainer.shap_values(X_transformed)
                # Ensure shap_values is a 1D array for single prediction
                if isinstance(shap_values, list): # For some multiclass
                    shap_values = shap_values[1]
                if len(shap_values.shape) > 1:
                    shap_values = shap_values[0]
                    
                # Pair with names, sort by magnitude
                feature_importance = [(name, float(val)) for name, val in zip(feature_names, shap_values)]
                feature_importance.sort(key=lambda x: abs(x[1]), reverse=True)
                
                # Take top 5
                for name, val in feature_importance[:5]:
                    explanations.append({"feature": name, "contribution": val})
            except Exception as e:
                print(f"Failed to generate SHAP explanation: {e}")
                
        return {
            "prediction": int(pred),
            "probability": float(prob),
            "explanation": explanations,
            "model_version": self.version
        }

model_wrapper = ModelWrapper()
