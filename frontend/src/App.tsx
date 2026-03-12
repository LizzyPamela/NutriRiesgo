import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import InstallPrompt from './components/InstallPrompt';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Chat from './pages/Chat';
import BusquedaAlimentos from './pages/BusquedaAlimentos';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DiarioComidas from './pages/DiarioComidas';
import Estadisticas from './pages/Estadisticas';
import Perfil from './pages/Perfil';
import Recomendaciones from './pages/Recomendaciones';
import ExamenesMedicos from './pages/ExamenesMedicos';
import RegistroExitoso from './pages/RegistroExitoso';
import AcercaDe from './pages/AcercaDe';

function PrivateRoute() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-nutri-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return session ? <Outlet /> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro-exitoso" element={<RegistroExitoso />} />
      <Route path="/registro" element={<Navigate to="/login" replace />} />
      <Route element={<PrivateRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/diario" element={<DiarioComidas />} />
          <Route path="/estadisticas"    element={<Estadisticas />} />
          <Route path="/perfil"          element={<Perfil />} />
          <Route path="/alimentos"       element={<BusquedaAlimentos />} />
          <Route path="/recomendaciones" element={<Recomendaciones />} />
          <Route path="/examenes"        element={<ExamenesMedicos />} />
          <Route path="/acerca-de"       element={<AcercaDe />} />
        </Route>
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
        <InstallPrompt />
      </AuthProvider>
    </Router>
  );
}

export default App;
