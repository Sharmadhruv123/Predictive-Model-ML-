import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

const schema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

type FormData = z.infer<typeof schema>;

export const Login: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      const endpoint = isRegistering ? '/auth/register' : '/auth/login';
      let payload;
      if (isRegistering) {
        payload = data;
        const res = await api.post(endpoint, payload);
        login(res.data.token);
      } else {
        const formData = new URLSearchParams();
        formData.append('username', data.email);
        formData.append('password', data.password);
        const res = await api.post(endpoint, formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        login(res.data.access_token);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An error occurred during authentication.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary">ML Platform</h1>
          <p className="text-muted-foreground mt-2">
            {isRegistering ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-destructive/10 border border-destructive text-destructive rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email</label>
            <input
              type="email"
              {...register('email')}
              className={clsx('input', errors.email && 'border-destructive focus-visible:ring-destructive')}
              placeholder="you@example.com"
            />
            {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Password</label>
            <input
              type="password"
              {...register('password')}
              className={clsx('input', errors.password && 'border-destructive focus-visible:ring-destructive')}
              placeholder="••••••••"
            />
            {errors.password && <p className="text-destructive text-xs mt-1">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary w-full mt-4"
          >
            {isSubmitting ? 'Processing...' : isRegistering ? 'Register' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-primary hover:underline"
          >
            {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
};
