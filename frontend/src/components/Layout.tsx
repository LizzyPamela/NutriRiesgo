import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  BarChart3,
  User,
  Search,
  LogOut,
  Heart,
  Menu,
  X,
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/chat', label: 'Chat IA', icon: MessageSquare },
  { path: '/diario', label: 'Diario', icon: Calendar },
  { path: '/estadisticas', label: 'Estadísticas', icon: BarChart3 },
  { path: '/alimentos', label: 'Alimentos', icon: Search },
  { path: '/perfil', label: 'Perfil', icon: User },
];

interface SidebarContentProps {
  pathname: string;
  user: { nombre?: string; email?: string };
  onLogout: () => void;
  onClose?: () => void;
}

function SidebarContent({ pathname, user, onLogout, onClose }: SidebarContentProps) {
  return (
    <>
      <div className="flex items-center justify-between px-6 py-5 border-b border-nutri-gray-200 flex-shrink-0">
        <Link
          to="/dashboard"
          onClick={onClose}
          className="flex items-center space-x-2"
        >
          <Heart className="w-7 h-7 text-nutri-secondary fill-nutri-secondary" />
          <span className="text-xl font-bold text-nutri-primary">NutriRiesgo</span>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-nutri-gray-100 text-nutri-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-4 py-5 space-y-0.5 overflow-y-auto">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = pathname === path;
          return (
            <Link
              key={path}
              to={path}
              onClick={onClose}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-nutri-primary text-white'
                  : 'text-nutri-gray-700 hover:bg-nutri-gray-100'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-nutri-gray-200 flex-shrink-0">
        <div className="flex items-center space-x-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-nutri-primary flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            {(user.nombre || user.email || 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-nutri-gray-900 truncate">
              {user.nombre || 'Usuario'}
            </p>
            <p className="text-xs text-nutri-gray-500 truncate">{user.email || ''}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-nutri-gray-700 hover:bg-nutri-gray-100 w-full transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </>
  );
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const user: { nombre?: string; email?: string } = JSON.parse(
    localStorage.getItem('user') || '{}'
  );

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-nutri-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 flex-shrink-0 bg-white border-r border-nutri-gray-200">
        <SidebarContent
          pathname={location.pathname}
          user={user}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-white border-r border-nutri-gray-200 md:hidden">
            <SidebarContent
              pathname={location.pathname}
              user={user}
              onLogout={handleLogout}
              onClose={() => setMobileOpen(false)}
            />
          </aside>
        </>
      )}

      {/* Main Column */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Top Bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-nutri-gray-200 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-nutri-gray-100 text-nutri-gray-700"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2">
            <Heart className="w-5 h-5 text-nutri-secondary fill-nutri-secondary" />
            <span className="font-bold text-nutri-primary">NutriRiesgo</span>
          </div>
          <div className="w-9" />
        </header>

        {/* Page Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
