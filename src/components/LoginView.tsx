import React, { useState } from 'react';
import {
  Zap,
  Lock,
  User,
  Shield,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  TowerControl as Tower,
  Users,
  Eye,
  EyeOff
} from 'lucide-react';
import { Usuario } from '../types';
import { storageService } from '../services/storageService';

interface LoginViewProps {
  onLoginSuccess: (user: Usuario, token: string) => void;
  allUsuarios?: Usuario[];
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, allUsuarios = [] }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const DEMO_ACCOUNTS = [
    {
      username: 'admin',
      password: 'password123',
      name: 'Juan Carlos Pérez Vargas',
      role: 'Administrador (Control Total)',
      desc: 'Acceso total a todas las actividades, contratistas, usuarios y configuraciones.',
      badge: 'bg-purple-950 text-purple-300 border-purple-800'
    },
    {
      username: 'cont_electrotech',
      password: 'password123',
      name: 'Jorge Luis Torres Benavides',
      role: 'Contratista: ELECTROTECH / MONTAJES',
      desc: 'Línea L-6601: Deficiencias, Corona, Termografía, DMS y Órdenes de Mantenimiento.',
      badge: 'bg-amber-950 text-amber-300 border-amber-800'
    },
    {
      username: 'cont_nassan',
      password: 'password123',
      name: 'Patricia Ramos Delgado',
      role: 'Contratista: NASSAN',
      desc: 'Control de Podas y Órdenes de Mantenimiento.',
      badge: 'bg-emerald-950 text-emerald-300 border-emerald-800'
    },
    {
      username: 'cont_pcoin',
      password: 'password123',
      name: 'Julio César Morales',
      role: 'Contratista: PCOIN',
      desc: 'Puesta a Tierra y Órdenes de Mantenimiento.',
      badge: 'bg-cyan-950 text-cyan-300 border-cyan-800'
    },
    {
      username: 'cont_vento',
      password: 'password123',
      name: 'Alberto Vento Carrión',
      role: 'Contratista: VENTO INGENIEROS',
      desc: 'Hidrolavado de Aislamiento y Órdenes de Mantenimiento.',
      badge: 'bg-sky-950 text-sky-300 border-sky-800'
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      let authenticatedUser: Usuario | null = null;
      let token = 'token-' + Date.now();
      let serverResponded = false;

      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim(), password })
        });
        serverResponded = true;
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success && data?.user) {
          authenticatedUser = data.user;
          token = data.token || token;
        } else {
          setErrorMessage(data?.message || 'Credenciales no válidas.');
          setLoading(false);
          return;
        }
      } catch (netErr) {
        // Fallback to local storage validation only if server network is unreachable
        if (serverResponded) {
          setErrorMessage('Error al procesar la respuesta del servidor.');
          setLoading(false);
          return;
        }
        console.warn('Servidor offline, usando validación local:', netErr);
      }

      // Offline network fallback only
      if (!authenticatedUser) {
        const localUsers = allUsuarios.length > 0 ? allUsuarios : storageService.getUsuarios();
        const found = localUsers.find(
          u => u.username.toLowerCase() === username.trim().toLowerCase()
        );

        if (found) {
          const expectedPassword = found.password || 'password123';
          if (password === expectedPassword) {
            authenticatedUser = found;
          } else {
            setErrorMessage('Contraseña incorrecta para el usuario.');
            setLoading(false);
            return;
          }
        } else {
          const demo = DEMO_ACCOUNTS.find(d => d.username.toLowerCase() === username.trim().toLowerCase());
          if (demo && demo.password === password) {
            let contratista_id: string | undefined;
            let contratista_nombre: string | undefined;
            if (demo.username === 'cont_electrotech') {
              contratista_id = 'CONT-001';
              contratista_nombre = 'MONTAJES Y OBRAS ELÉCTRICAS DEL NORTE';
            } else if (demo.username === 'cont_nassan') {
              contratista_id = 'CONT-002';
              contratista_nombre = 'NASSAN';
            } else if (demo.username === 'cont_pcoin') {
              contratista_id = 'CONT-003';
              contratista_nombre = 'PCOIN';
            } else if (demo.username === 'cont_vento') {
              contratista_id = 'CONT-004';
              contratista_nombre = 'VENTO INGENIEROS';
            }

            authenticatedUser = {
              id_usuario: 'USR-DEMO-' + demo.username,
              nombres: demo.name.split(' ')[0],
              apellidos: demo.name.split(' ').slice(1).join(' '),
              dni: '43981254',
              email: `${demo.username}@empresa.com`,
              telefono: '+51 984 551 223',
              username: demo.username,
              rol: demo.role.includes('Administrador') ? 'Administrador' : 'Contratista',
              estado: 'Activo',
              contratista_id,
              contratista_nombre,
              lineas_asignadas: demo.role.includes('Administrador') ? ['*'] : ['L-6601', 'L-6657C'],
              fecha_creacion: '2026-01-15'
            };
          } else {
            setErrorMessage('El usuario especificado no existe o las credenciales no coinciden.');
            setLoading(false);
            return;
          }
        }
      }

      if (authenticatedUser) {
        const { password: _omitted, ...safeUser } = authenticatedUser;
        try {
          localStorage.setItem('st_auth_token', token);
          localStorage.setItem('st_auth_user', JSON.stringify(safeUser));
        } catch {
          // ignore quota errors
        }
        storageService.setCurrentUser(safeUser);
        onLoginSuccess(safeUser, token);
      }
    } catch (err: any) {
      setErrorMessage('Error al autenticar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemo = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 items-center justify-center shadow-xl shadow-cyan-500/20 ring-1 ring-cyan-400/40 mb-2">
            <Zap className="h-8 w-8 text-white animate-pulse" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            SISTEMA DE SUBTRANSMISIÓN
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Plataforma multiusuario con Control de Acceso Basado en Roles (RBAC), supervisión de líneas, efecto corona UV, deficiencias y DMS.
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="h-4 w-4 text-cyan-400" />
              Validación de Identidad y Roles
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Ingrese su usuario asignado para cargar sus actividades y líneas autorizadas.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nombre de Usuario o Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ej: admin, cont_electrotech, cont_nassan"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                />
                <User className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                />
                <Lock className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-500 hover:text-slate-300 absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Validando credenciales...</span>
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Access for testing accounts & roles */}
          <div className="mt-5 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Cuentas de Acceso Rápido para Pruebas:
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => handleSelectDemo(acc)}
                  className={`p-2 rounded-xl border text-left transition hover:scale-[1.02] cursor-pointer ${
                    username === acc.username
                      ? 'border-cyan-500 bg-cyan-950/60 shadow-md shadow-cyan-600/20'
                      : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-[11px] text-white truncate">{acc.username}</div>
                  <div className="text-[9px] text-slate-400 truncate">{acc.role.split('(')[0]}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <div>Conexión en Tiempo Real • Control de Permisos RBAC • Google Sheets Sync</div>
          <div>Zona Horaria Oficial: America/Lima (UTC-5)</div>
        </div>
      </div>
    </div>
  );
};
