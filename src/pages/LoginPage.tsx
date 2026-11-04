import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertCircle, KeyRound, Smartphone } from 'lucide-react';
import { isMobile, isStandalone, openInstallHelp } from '../pwa/install';
import { useTenant } from '../tenant/TenantContext';
import { api } from '../api/client';
import { clearSession, getUser, hasValidSession, homePathFor, saveSession, updateUser, type SessionUser } from '../auth/session';
import { TenantLogo } from '../components/TenantLogo';

const inputClass =
  'w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-400 transition-colors';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { tenant, sections, logoSrc } = useTenant();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(
    searchParams.get('expired') ? 'Tu sesión expiró. Ingresa nuevamente.' : null,
  );

  // Cambio de contraseña obligatorio (contraseña temporal)
  const pendingUser = hasValidSession() ? getUser() : null;
  const [mustChange, setMustChange] = useState<boolean>(!!pendingUser?.mustChangePass);
  const [currentPassword, setCurrentPassword] = useState('');
  // Si se llega con una sesión pendiente (recarga de página) hay que pedir la contraseña temporal otra vez
  const [askCurrent, setAskCurrent] = useState<boolean>(!!pendingUser?.mustChangePass);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Redirección por rol: SUPERADMIN → /plataforma, CUSTOMER → /portal, personal → /admin
  const goHome = (user: SessionUser) => navigate(homePathFor(user), { replace: true });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.login({ email: email.trim(), password });
      saveSession(res.accessToken, res.user);
      if (res.user.mustChangePass) {
        setCurrentPassword(password);
        setAskCurrent(false);
        setMustChange(true);
      } else {
        goHome(res.user);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Credenciales incorrectas. Verifique su correo y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (newPassword.length < 10) {
      setErrorMsg('La nueva contraseña debe tener al menos 10 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      updateUser({ mustChangePass: false });
      goHome(getUser()!);
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const cancelChange = () => {
    clearSession();
    setMustChange(false);
    setPassword('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8 glass-panel rounded-3xl border border-slate-700/80 bg-[#0F172A]/90 p-8 sm:p-10 shadow-2xl">
        <div className="text-center space-y-2">
          {mustChange ? (
            <div className="w-12 h-12 rounded-2xl bg-brand-accent text-brand-on-accent flex items-center justify-center mx-auto shadow-lg">
              <KeyRound className="w-6 h-6" />
            </div>
          ) : (
            <div className="flex justify-center">
              <TenantLogo name={tenant.name} src={logoSrc} className="w-14 h-14" textClassName="text-2xl" />
            </div>
          )}
          <h2 className="text-2xl font-black text-white tracking-widest uppercase">{tenant.name}</h2>
          <p className="text-xs text-slate-400">
            {mustChange
              ? 'Por seguridad debes definir una nueva contraseña antes de continuar.'
              : `Ingreso centralizado a ${sections.adminPanel} y ${sections.clientPortal}`}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {mustChange ? (
          <form onSubmit={handleChangePassword} className="space-y-5">
            {askCurrent && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="current-password">
                  Contraseña temporal
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    id="current-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="new-password">
                Nueva contraseña (mínimo 10 caracteres)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={10}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="confirm-password">
                Confirmar nueva contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  id="confirm-password"
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
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider btn-brand transition-all shadow-md disabled:opacity-50"
            >
              <span>{loading ? 'Guardando...' : 'Guardar y continuar'}</span>
              <ArrowRight className="w-4 h-4 text-slate-900" />
            </button>
            <button type="button" onClick={cancelChange} className="w-full text-xs text-slate-400 hover:text-white">
              Cancelar y salir
            </button>
          </form>
        ) : (
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
                  placeholder="Correo electrónico"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="password">
                Contraseña
              </label>
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
                  className={inputClass}
                />
              </div>
              <p className="text-[11px] mt-1.5 text-right">
                <Link to="/recuperar" className="text-brand-accent hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider btn-brand transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              <span>{loading ? 'Verificando...' : 'Iniciar Sesión'}</span>
              <ArrowRight className="w-4 h-4 text-slate-900" />
            </button>
          </form>
        )}

        {isMobile() && !isStandalone() && (
          <button
            type="button"
            onClick={openInstallHelp}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-slate-800/70 border border-slate-700 text-slate-200 hover:bg-slate-700 cursor-pointer"
          >
            <Smartphone className="w-4 h-4 text-brand-accent" /> Instalar la app en este teléfono
          </button>
        )}

        <div className="pt-2 text-center">
          <Link to="/" className="text-xs text-slate-400 hover:text-white transition-colors">
            ← Volver al sitio público
          </Link>
        </div>
      </div>
    </div>
  );
};
