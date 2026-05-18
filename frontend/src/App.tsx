import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Landing from './pages/Landing';
import FichaEmpresa from './pages/FichaEmpresa';
import Dashboard from './pages/Dashboard';
import MiEmpresa from './pages/MiEmpresa';
import AdminPanel from './pages/AdminPanel';
import Navbar from './components/Navbar';
import ChatbotWidget from './components/ChatbotWidget';

function AppRoutes() {
  const { role } = useApp();

  return (
    <div className="min-h-screen bg-cream">
      {role && <Navbar />}
      <Routes>
        <Route path="/" element={role ? <Navigate to={role === 'admin' ? '/admin' : '/dashboard'} /> : <Landing />} />
        <Route path="/ficha" element={role === 'pyme' ? <FichaEmpresa /> : <Navigate to="/" />} />
        <Route path="/dashboard" element={role === 'pyme' ? <Dashboard /> : <Navigate to="/" />} />
        <Route path="/mi-empresa" element={role === 'pyme' ? <MiEmpresa /> : <Navigate to="/" />} />
        <Route path="/admin" element={role === 'admin' ? <AdminPanel /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      {role && <ChatbotWidget />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
