import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';
import { BRANDING, SECTIONS } from '../config/branding';
import { api } from '../api/client';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.login({ email, password });
      if (res?.accessToken) {
        localStorage.setItem('veltor_token', res.accessToken);
        localStorage.setItem('veltor_user', JSON.stringify(res.user));

        if (res.user.role === 'CUSTOMER') {
          navigate('/portal');
        } else {
          navigate('/admin');
        }
      }
    } catch (err: any) {
      // Fallback para modo demo si el backend aún no tiene BD conectada
      if (email === 'admin@veltor.app' && (password === 'Veltor2026!' || password === 'admin')) {
        const mockAdmin = {
          id: 'mock-admin',
          email: 'admin@veltor.app',
          fullName: 'Carlos Mendoza (Superadmin)',
          role: 'SUPERADMIN',
        };
        localStorage.setItem('veltor_token', 'demo-admin-token');
        localStorage.setItem('veltor_user', JSON.stringify(mockAdmin));
        navigate('/admin');
        return;
      }

      if (email === 'cliente.demo@veltor.app' && (password === 'Veltor2026!' || password === 'cliente')) {
        const mockCustomer = {
          id: 'mock-client',
          email: 'cliente.demo@veltor.app',
          fullName: 'Alejandro Morales Rivera',
          role: 'CUSTOMER',
          customerId: 'CLI-00001',
        };
        localStorage.setItem('veltor_token', 'demo-customer-token');
        localStorage.setItem('veltor_user', JSON.stringify(mockCustomer));
        navigate('/portal');
        return;
      }

      setErrorMsg(err.message || 'Credenciales incorrectas. Verifique su correo y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: 'admin' | 'customer') => {
    if (role === 'admin') {
      setEmail('admin@veltor.app');
      setPassword('Veltor2026!');
    } else {
      setEmail('cliente.demo@veltor.app');
      setPassword('Veltor2026!');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8 glass-panel rounded-3xl border border-slate-700/80 bg-[#0F172A]/90 p-8 sm:p-10 shadow-2xl">
        {/* Logo y Encabezado */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-600 flex items-center justify-center mx-auto text-white shadow-lg">
            <UserCheck className="w-6 h-6 text-slate-100" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-widest uppercase">
            {BRANDING.name}
          </h2>
          <p className="text-xs text-slate-400">
            Ingreso centralizado a {SECTIONS.adminPanel} y {SECTIONS.clientPortal}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="email">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                inputMode="email"
                autoCorrect="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@veltor.app"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-400 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300" htmlFor="password">
                Contraseña
              </label>
              <span className="text-[11px] text-slate-400 hover:text-white cursor-pointer transition-colors">
                ¿Olvidaste tu contraseña?
              </span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-400 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-white text-slate-900 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
          >
            <span>{loading ? 'Verificando...' : 'Iniciar Sesión'}</span>
            <ArrowRight className="w-4 h-4 text-slate-900" />
          </button>
        </form>

        {/* Acceso Rápido para Demostración */}
        <div className="pt-6 border-t border-slate-800 space-y-3">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block text-center">
            Credenciales de Demostración
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillDemo('admin')}
              className="py-2 px-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-300 hover:text-white transition-colors text-center"
            >
              Cargar Superadmin
            </button>
            <button
              type="button"
              onClick={() => fillDemo('customer')}
              className="py-2 px-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-300 hover:text-white transition-colors text-center"
            >
              Cargar Cliente Demo
            </button>
          </div>
        </div>

        <div className="pt-2 text-center">
          <Link to="/" className="text-xs text-slate-400 hover:text-white transition-colors">
            ← Volver al sitio público
          </Link>
        </div>
      </div>
    </div>
  );
};
