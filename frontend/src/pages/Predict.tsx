import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '../api';
import clsx from 'clsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BrainCircuit } from 'lucide-react';

const schema = z.object({
  age: z.number().min(18).max(120),
  tenure: z.number().min(0),
  monthly_charges: z.number().min(0),
  total_charges: z.number().min(0),
  contract_type: z.enum(['Month-to-month', 'One year', 'Two year']),
  internet_service: z.enum(['DSL', 'Fiber optic', 'No']),
});

type FormData = z.infer<typeof schema>;

export const Predict: React.FC = () => {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      age: 35,
      tenure: 12,
      monthly_charges: 50.0,
      total_charges: 600.0,
      contract_type: 'Month-to-month',
      internet_service: 'DSL'
    }
  });

  const onSubmit = async (data: FormData) => {
    setResult(null);
    setError(null);
    try {
      const res = await api.post('/predict', data);
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to make prediction.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Form */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Customer Details</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Age</label>
              <input type="number" {...register('age', { valueAsNumber: true })} className={clsx('input', errors.age && 'border-destructive')} />
              {errors.age && <p className="text-destructive text-xs mt-1">{errors.age.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tenure (months)</label>
              <input type="number" {...register('tenure', { valueAsNumber: true })} className={clsx('input', errors.tenure && 'border-destructive')} />
              {errors.tenure && <p className="text-destructive text-xs mt-1">{errors.tenure.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Monthly Charges ($)</label>
              <input type="number" step="0.01" {...register('monthly_charges', { valueAsNumber: true })} className={clsx('input', errors.monthly_charges && 'border-destructive')} />
              {errors.monthly_charges && <p className="text-destructive text-xs mt-1">{errors.monthly_charges.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Total Charges ($)</label>
              <input type="number" step="0.01" {...register('total_charges', { valueAsNumber: true })} className={clsx('input', errors.total_charges && 'border-destructive')} />
              {errors.total_charges && <p className="text-destructive text-xs mt-1">{errors.total_charges.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Contract Type</label>
              <select {...register('contract_type')} className={clsx('input', errors.contract_type && 'border-destructive')}>
                <option value="Month-to-month">Month-to-month</option>
                <option value="One year">One year</option>
                <option value="Two year">Two year</option>
              </select>
              {errors.contract_type && <p className="text-destructive text-xs mt-1">{errors.contract_type.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Internet Service</label>
              <select {...register('internet_service')} className={clsx('input', errors.internet_service && 'border-destructive')}>
                <option value="DSL">DSL</option>
                <option value="Fiber optic">Fiber optic</option>
                <option value="No">No</option>
              </select>
              {errors.internet_service && <p className="text-destructive text-xs mt-1">{errors.internet_service.message}</p>}
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full mt-6">
            {isSubmitting ? 'Predicting...' : 'Predict Churn'}
          </button>
        </form>
        {error && <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md">{error}</div>}
      </div>

      {/* Results */}
      <div className="space-y-6">
        {result ? (
          <>
            <div className="card p-6">
              <h2 className="text-xl font-semibold mb-4">Prediction Result</h2>
              <div className="flex items-center justify-center p-6 border rounded-lg bg-secondary/50">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Churn Probability</div>
                  <div className={clsx("text-5xl font-bold", result.prediction === 1 ? 'text-destructive' : 'text-success')}>
                    {(result.probability * 100).toFixed(1)}%
                  </div>
                  <div className="mt-2 font-medium">
                    {result.prediction === 1 ? 'Likely to churn' : 'Likely to stay'}
                  </div>
                </div>
              </div>
            </div>

            {result.explanation && result.explanation.length > 0 && (
              <div className="card p-6">
                <h2 className="text-xl font-semibold mb-4">Feature Contributions (SHAP)</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  These features had the most impact on this specific prediction. Positive values push towards churn.
                </p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={result.explanation} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <XAxis type="number" />
                      <YAxis dataKey="feature" type="category" width={120} tick={{fontSize: 12}} />
                      <Tooltip />
                      <Bar dataKey="contribution" radius={[0, 4, 4, 0]}>
                        {result.explanation.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.contribution > 0 ? '#ef4444' : '#22c55e'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="card p-6 h-full flex flex-col items-center justify-center text-muted-foreground min-h-[400px]">
            <BrainCircuit className="h-16 w-16 mb-4 opacity-20" />
            <p>Fill out the form and submit to see prediction results.</p>
          </div>
        )}
      </div>
    </div>
  );
};
