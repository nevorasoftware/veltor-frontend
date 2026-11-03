import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, KeyRound, Lock, Mail } from 'lucide-react';
import { api } from '../api/client';
import { useTenant } from '../tenant/TenantContext';
import { TenantLogo } from '../components/TenantLogo';

/** Misma regla que el cambio de contraseña obligatorio (LoginPage) y el backend. */
export const PASSWORD_MIN_LENGTH = 10;

const inputClass =
  'w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-400 transition-colors';

const Card: React.FC<{ title: string; subtitle: string; children: React.ReactNode }> = ({ title, subtitle, children }) => {
  const { tenant, logoSrc } = useTenant();
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8 glass-panel rounded-3xl border border-slate-700/80 bg-[#0F172A]/90 p-8 sm:p-10 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <TenantLogo name={tenant.name} src={logoSrc} className="w-14 h-14" textClassName="text-2xl" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">{title}</h2>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        {children}
        <div className="pt-2 text-center">
          <Link to="/login" className="text-xs text-slate-400 hover:text-white transition-colors">
            ← Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
};

const ErrorBox: React.FC<{ message: string }> = ({ message }) => (
  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
    <AlertCircle className="w-4 h-4 shrink-0" />
    <span>{message}</span>
  </div>
);

const SuccessBox: React.FC<{ message: string }> = ({ message }) => (
  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2">
    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
    <span>{message}</span>
  </div>
);

/** /recuperar: pide el correo y siempre responde con un mensaje neutro (no revela si la cuenta existe). */
export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.forgotPassword(email.trim().toLowerCase());
    } catch {
      // Se ignora a propósito: la respuesta es la misma exista o no la cuenta
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <Card title="Recuperar contraseña" subtitle="Te enviaremos un enlace para crear una nueva contraseña.">
      {sent ? (
        <SuccessBox message="Si el correo corresponde a una cuenta registrada, recibirás en unos minutos un enlace para restablecer tu contraseña. Revisa también la carpeta de spam." />
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="recover-email">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                id="recover-email"
                type="email"
                required
                autoComplete="username"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider btn-brand shadow-md disabled:opacity-50 cursor-pointer"
          >
            <span>{loading ? 'Enviando...' : 'Enviar enlace'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}
    </Card>
  );
};

/** /restablecer?token=...: define la nueva contraseña con el token del correo. */
export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      setError(`La nueva contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, newPassword);
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'El enlace no es válido o ya expiró. Solicita uno nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Card title="Enlace incompleto" subtitle="El enlace para restablecer la contraseña no es válido.">
        <Link
          to="/recuperar"
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider btn-brand"
        >
          Solicitar un enlace nuevo
        </Link>
      </Card>
    );
  }

  return (
    <Card title="Nueva contraseña" subtitle={`Escribe una contraseña de al menos ${PASSWORD_MIN_LENGTH} caracteres.`}>
      {done ? (
        <div className="space-y-5">
          <SuccessBox message="Tu contraseña se actualizó. Ya puedes iniciar sesión con ella." />
          <Link
            to="/login"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider btn-brand"
          >
            <span>Iniciar sesión</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {error && (
            <div className="space-y-2">
              <ErrorBox message={error} />
              <Link to="/recuperar" className="block text-right text-[11px] text-brand-accent hover:underline">
                Solicitar un enlace nuevo
              </Link>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="reset-new">
              Nueva contraseña (mínimo {PASSWORD_MIN_LENGTH} caracteres)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                id="reset-new"
                type="password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="reset-confirm">
              Confirmar nueva contraseña
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                id="reset-confirm"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider btn-brand shadow-md disabled:opacity-50 cursor-pointer"
          >
            <span>{loading ? 'Guardando...' : 'Guardar contraseña'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}
    </Card>
  );
};
