import React, { useEffect, useState } from 'react';
import api from '../api';
import { ChartLine, RotateCcw, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export const ModelMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [currentRes, historyRes] = await Promise.all([
        api.get('/metrics/model'),
        api.get('/metrics/model/history').catch(() => ({ data: [] }))
      ]);
      
      if (currentRes.data.error) {
        setError(currentRes.data.error);
      } else {
        setMetrics(currentRes.data);
      }
      
      // Sort history by start time
      const sortedHistory = (historyRes.data || []).sort((a: any, b: any) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      setHistory(sortedHistory);
    } catch (e: any) {
      setError(e.message || "Failed to fetch metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const triggerRetrain = async () => {
    try {
      await api.post('/model/retrain');
      alert("Retraining triggered in the background. Check back in a few minutes.");
    } catch (e: any) {
      alert("Failed to trigger retraining.");
    }
  };

  if (error && !metrics) {
    return (
      <div className="card p-8 text-center text-warning">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-semibold mb-2">Metrics Unavailable</h2>
        <p>{error}</p>
        <p className="text-sm text-muted-foreground mt-4">Make sure the pipeline has run and a model is trained.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Model Metrics</h1>
        <button onClick={triggerRetrain} className="btn btn-secondary">
          <RotateCcw className="mr-2 h-4 w-4" /> Retrain Model
        </button>
      </div>

      {loading ? (
        <div className="card p-8 text-center">Loading metrics...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard title="F1 Score" value={metrics?.metrics?.f1_score} format="percent" />
            <MetricCard title="Accuracy" value={metrics?.metrics?.accuracy} format="percent" />
            <MetricCard title="Precision" value={metrics?.metrics?.precision} format="percent" />
            <MetricCard title="ROC AUC" value={metrics?.metrics?.roc_auc} format="percent" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-6 col-span-1">
              <h3 className="font-semibold mb-4 text-lg">Production Model Details</h3>
              <div className="space-y-3 text-sm">
                <DetailRow label="Version" value={`v${metrics?.version}`} />
                <DetailRow label="Algorithm" value={metrics?.params?.model} />
                <DetailRow label="Trained At" value={new Date(parseInt(metrics?.trained_at)).toLocaleString()} />
              </div>
            </div>

            <div className="card p-6 col-span-2">
              <h3 className="font-semibold mb-4 text-lg">Experiment History</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="start_time" 
                      tickFormatter={(val) => new Date(val).toLocaleTimeString()} 
                      tick={{fontSize: 10}} 
                    />
                    <YAxis domain={['auto', 'auto']} tick={{fontSize: 10}} />
                    <Tooltip 
                      labelFormatter={(val) => new Date(val).toLocaleString()}
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="f1_score" name="F1 Score" stroke="#2563eb" strokeWidth={2} dot={{r: 4}} activeDot={{r: 6}} />
                    <Line type="monotone" dataKey="accuracy" name="Accuracy" stroke="#22c55e" strokeWidth={2} dot={{r: 4}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const MetricCard = ({ title, value, format }: { title: string, value: any, format?: string }) => {
  let displayValue = 'N/A';
  if (value !== undefined && value !== null) {
    if (format === 'percent') {
      displayValue = `${(value * 100).toFixed(2)}%`;
    } else {
      displayValue = value.toFixed(4);
    }
  }

  return (
    <div className="card p-6 text-center">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>
      <div className="text-3xl font-bold text-foreground">{displayValue}</div>
    </div>
  );
};

const DetailRow = ({ label, value }: { label: string, value: string }) => (
  <div className="flex justify-between items-center py-2 border-b border-border last:border-0 last:pb-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right max-w-[60%] truncate" title={value}>{value || 'N/A'}</span>
  </div>
);
