import React, { useEffect, useState } from 'react';
import api from '../api';
import { Database, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const DataExplorer: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = async (p: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/data/explorer?page=${p}&page_size=15`);
      if (res.data.error) {
        setError(res.data.error.message);
      } else {
        setData(res.data);
      }
    } catch (e: any) {
      setError(e.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage(page);
  }, [page]);

  if (error) {
    return (
      <div className="card p-8 text-center text-destructive">
        <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-semibold mb-2">Data Explorer Unavailable</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Processed Data Explorer</h1>
      
      {loading && !data ? (
        <div className="card p-8 text-center">Loading...</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-6 col-span-1">
              <h3 className="font-semibold mb-2">Dataset Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Total Rows</span>
                  <span className="font-medium">{data.total}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Total Columns</span>
                  <span className="font-medium">{Object.keys(data.schema).length}</span>
                </div>
              </div>
            </div>
            
            <div className="card p-6 col-span-2">
              <h3 className="font-semibold mb-4">Sample Distribution (Current Page)</h3>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.rows.slice(0, 50)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="age" tick={{fontSize: 10}} />
                    <YAxis tick={{fontSize: 10}} />
                    <Tooltip />
                    <Bar dataKey="monthly_charges" fill="#3b82f6" name="Monthly Charges" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-secondary/50 text-muted-foreground font-semibold">
                  <tr>
                    {Object.keys(data.schema).map(col => (
                      <th key={col} className="px-4 py-3 whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.rows.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-secondary/30">
                      {Object.keys(data.schema).map(col => (
                        <td key={col} className="px-4 py-3 truncate max-w-[150px]">
                          {row[col] !== null ? String(row[col]) : <span className="text-muted-foreground italic">null</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-border flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Showing {((page - 1) * data.page_size) + 1} to {Math.min(page * data.page_size, data.total)} of {data.total}
              </span>
              <div className="flex gap-2">
                <button 
                  className="btn btn-secondary" 
                  disabled={page === 1} 
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <button 
                  className="btn btn-secondary" 
                  disabled={page * data.page_size >= data.total} 
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
