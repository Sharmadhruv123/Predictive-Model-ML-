import pandas as pd
import numpy as np
import os
import random

def generate_telecom_data(num_records=5000):
    np.random.seed(42)
    random.seed(42)
    
    customer_ids = [f"CUST_{i:05d}" for i in range(num_records)]
    
    # Age: 18 to 80
    ages = np.random.randint(18, 81, size=num_records)
    
    # Tenure: 0 to 72 months
    tenures = np.random.randint(0, 73, size=num_records)
    
    # Monthly charges: 20 to 120
    monthly_charges = np.random.uniform(20.0, 120.0, size=num_records)
    
    # Total charges: tenure * monthly_charges + some noise
    # Intentional messiness: missing total charges
    total_charges = tenures * monthly_charges + np.random.normal(0, 10, size=num_records)
    total_charges = np.where(total_charges < 0, 0, total_charges)
    
    contract_types = np.random.choice(["Month-to-month", "One year", "Two year"], size=num_records, p=[0.55, 0.20, 0.25])
    internet_services = np.random.choice(["DSL", "Fiber optic", "No"], size=num_records, p=[0.35, 0.45, 0.20])
    
    # Introduce intentional missing values
    missing_idx = np.random.choice(range(num_records), size=int(num_records * 0.05), replace=False)
    total_charges[missing_idx] = np.nan
    
    # Outliers in monthly charges
    outlier_idx = np.random.choice(range(num_records), size=int(num_records * 0.01), replace=False)
    monthly_charges[outlier_idx] = 999.0
    
    # Churn probability logic
    # Higher churn for Month-to-month, Fiber optic, High monthly charges, low tenure
    churn_prob = np.zeros(num_records)
    
    churn_prob += np.where(contract_types == "Month-to-month", 0.3, 0.0)
    churn_prob += np.where(contract_types == "Two year", -0.2, 0.0)
    churn_prob += np.where(internet_services == "Fiber optic", 0.1, 0.0)
    churn_prob += np.where(internet_services == "No", -0.1, 0.0)
    churn_prob += (monthly_charges / 120) * 0.2
    churn_prob -= (tenures / 72) * 0.3
    
    # Add noise
    churn_prob += np.random.normal(0, 0.1, size=num_records)
    
    # Clip and threshold
    churn_prob = np.clip(churn_prob, 0.05, 0.95)
    churn = (np.random.random(size=num_records) < churn_prob).astype(int)
    
    df = pd.DataFrame({
        'customer_id': customer_ids,
        'age': ages,
        'tenure': tenures,
        'monthly_charges': monthly_charges,
        'total_charges': total_charges,
        'contract_type': contract_types,
        'internet_service': internet_services,
        'churn': churn
    })
    
    # Map churn back to Yes/No to simulate raw strings
    df['churn'] = df['churn'].map({1: 'Yes', 0: 'No'})
    
    return df

if __name__ == "__main__":
    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
    os.makedirs(data_dir, exist_ok=True)
    out_path = os.path.join(data_dir, 'raw_customers.csv')
    df = generate_telecom_data(5000)
    df.to_csv(out_path, index=False)
    print(f"Generated {len(df)} records at {out_path}")
