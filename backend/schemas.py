from pydantic import BaseModel, EmailStr, Field
from typing import List, Dict, Any, Optional
import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    token: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class PredictRequest(BaseModel):
    age: float
    tenure: float
    monthly_charges: float
    total_charges: float
    contract_type: str
    internet_service: str

class ExplanationItem(BaseModel):
    feature: str
    contribution: float

class PredictResponse(BaseModel):
    prediction: int
    probability: float
    explanation: List[ExplanationItem]
    model_version: str
    timestamp: datetime.datetime

class PredictionHistoryItem(BaseModel):
    id: int
    timestamp: datetime.datetime
    features: Dict[str, Any]
    prediction: int
    probability: float
    model_version: str

class ErrorResponse(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None
