import React, { useEffect, useState } from 'react';
import api from '../api';
import { Activity, BrainCircuit, Database, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [healthRes, metricsRes, runsRes] = await Promise.all([
        api.get('/health'),
        api.get('/metrics/model').catch(() => ({ data: null })),
        api.get('/pipeline/runs').catch(() => ({ data: [] }))
      ]);
      setHealth(healthRes.data);
      setMetrics(metricsRes.data);
      setRuns(runsRes.data?.slice(0, 5) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Model Status</h3>
            <BrainCircuit className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold">{health?.model_loaded ? 'Loaded' : 'Not Loaded'}</div>
          {metrics && !metrics.error && (
            <p className="text-xs text-muted-foreground mt-1">
              F1 Score: {metrics.metrics?.f1_score?.toFixed(4) || 'N/A'} (v{metrics.version})
            </p>
          )}
        </div>
        
        <div className="card p-6">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Pipeline Status</h3>
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold">
            {runs.length > 0 ? runs[0].status : 'No Runs'}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Last run: {runs.length > 0 ? new Date(runs[0].start_time).toLocaleString() : 'N/A'}
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Database</h3>
            <Database className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold">{health?.db_connected ? 'Connected' : 'Disconnected'}</div>
          <p className="text-xs text-muted-foreground mt-1">PostgreSQL Backend</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link to="/predict" className="btn btn-primary w-full justify-start">
              <BrainCircuit className="mr-2 h-4 w-4" />
              Make a Prediction
            </Link>
            <Link to="/pipeline" className="btn btn-secondary w-full justify-start">
              <Activity className="mr-2 h-4 w-4" />
              View Pipeline Runs
            </Link>
            <Link to="/data" className="btn btn-ghost border border-border w-full justify-start">
              <Database className="mr-2 h-4 w-4" />
              Explore Processed Data
            </Link>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Pipeline Activity</h3>
          <div className="space-y-4">
            {runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent pipeline runs.</p>
            ) : (
              runs.map((run) => (
                <div key={run.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium truncate w-48">{run.id}</p>
                    <p className="text-xs text-muted-foreground">{new Date(run.start_time).toLocaleString()}</p>
                  </div>
                  {run.status === 'success' ? (
                    <span className="flex items-center text-xs text-success bg-success/10 px-2 py-1 rounded-full">
                      <CheckCircle className="mr-1 h-3 w-3" /> Success
                    </span>
                  ) : run.status === 'failed' ? (
                    <span className="flex items-center text-xs text-destructive bg-destructive/10 px-2 py-1 rounded-full">
                      <XCircle className="mr-1 h-3 w-3" /> Failed
                    </span>
                  ) : (
                    <span className="flex items-center text-xs text-warning bg-warning/10 px-2 py-1 rounded-full">
                      <Activity className="mr-1 h-3 w-3 animate-pulse" /> Running
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
