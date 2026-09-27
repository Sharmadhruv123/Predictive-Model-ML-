import React, { useEffect, useState } from 'react';
import api from '../api';
import { Play, CheckCircle, XCircle, Activity, ChevronRight, ChevronDown } from 'lucide-react';

export const PipelineRuns: React.FC = () => {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [runDetails, setRunDetails] = useState<any>(null);

  const fetchRuns = async () => {
    try {
      const res = await api.get('/pipeline/runs');
      setRuns(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 5000);
    return () => clearInterval(interval);
  }, []);

  const triggerRun = async () => {
    try {
      await api.post('/pipeline/trigger');
      setTimeout(fetchRuns, 1000);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleRun = async (runId: string) => {
    if (expandedRun === runId) {
      setExpandedRun(null);
      setRunDetails(null);
      return;
    }
    setExpandedRun(runId);
    try {
      const res = await api.get(`/pipeline/runs/${runId}`);
      setRunDetails(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Pipeline Runs</h1>
        <button onClick={triggerRun} className="btn btn-primary">
          <Play className="mr-2 h-4 w-4" /> Trigger New Run
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading runs...</div>
        ) : runs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No pipeline runs found.</div>
        ) : (
          <div className="divide-y divide-border">
            {runs.map((run) => (
              <div key={run.id} className="flex flex-col">
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-colors"
                  onClick={() => toggleRun(run.id)}
                >
                  <div className="flex items-center gap-4">
                    {expandedRun === run.id ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                    <div>
                      <p className="font-semibold">{run.id}</p>
                      <p className="text-xs text-muted-foreground">Started: {new Date(run.start_time).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {run.end_time && <span className="text-sm text-muted-foreground">Duration: {((new Date(run.end_time).getTime() - new Date(run.start_time).getTime()) / 1000).toFixed(1)}s</span>}
                    {run.status === 'success' ? (
                      <span className="flex items-center text-sm font-medium text-success bg-success/10 px-3 py-1 rounded-full">
                        <CheckCircle className="mr-1 h-4 w-4" /> Success
                      </span>
                    ) : run.status === 'failed' ? (
                      <span className="flex items-center text-sm font-medium text-destructive bg-destructive/10 px-3 py-1 rounded-full">
                        <XCircle className="mr-1 h-4 w-4" /> Failed
                      </span>
                    ) : (
                      <span className="flex items-center text-sm font-medium text-warning bg-warning/10 px-3 py-1 rounded-full">
                        <Activity className="mr-1 h-4 w-4 animate-pulse" /> Running
                      </span>
                    )}
                  </div>
                </div>

                {expandedRun === run.id && runDetails && (
                  <div className="bg-secondary/20 p-6 border-t border-border">
                    <h4 className="font-semibold mb-4">Stage Breakdown</h4>
                    <div className="space-y-4">
                      {runDetails.stages.map((stage: any, idx: number) => (
                        <div key={idx} className="flex items-start justify-between bg-white p-4 rounded-md border border-border shadow-sm">
                          <div>
                            <p className="font-medium capitalize">{stage.stage_name}</p>
                            {stage.log_message && <p className="text-sm text-destructive mt-1">{stage.log_message}</p>}
                          </div>
                          <div className="text-right text-sm">
                            <p>Status: <span className={stage.status === 'success' ? 'text-success' : stage.status === 'failed' ? 'text-destructive' : 'text-warning'}>{stage.status}</span></p>
                            {stage.rows_in !== null && <p className="text-muted-foreground">Rows In: {stage.rows_in}</p>}
                            {stage.rows_out !== null && <p className="text-muted-foreground">Rows Out: {stage.rows_out}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
