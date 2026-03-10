import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Chat from './pages/Chat';
import BusquedaAlimentos from './pages/BusquedaAlimentos';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DiarioComidas from './pages/DiarioComidas';
import Estadisticas from './pages/Estadisticas';
import Perfil from './pages/Perfil';

function PrivateRoute() {
  const user = localStorage.getItem('user');
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Navigate to="/login" replace />} />
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/diario" element={<DiarioComidas />} />
            <Route path="/estadisticas" element={<Estadisticas />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/alimentos" element={<BusquedaAlimentos />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
