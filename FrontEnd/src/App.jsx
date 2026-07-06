import { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Gem } from 'lucide-react';
import { CraftShieldProvider, CraftShieldContext } from './context/CraftShieldContext';
import Layout from './components/Layout';
import ArtisanDashboard from './pages/ArtisanDashboard';
import ClientDashboard from './pages/ClientDashboard';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import Login from './pages/Login';
import VerifyProof from './pages/VerifyProof';
import './App.css';

function MainApp() {
  const { token, user, loading } = useContext(CraftShieldContext);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">
          <Gem className="logo-icon animate-spin-slow" size={64} />
          <h2 className="headline-md">CraftShield</h2>
          <p className="label-sm text-muted">Securing Handmade Luxury...</p>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Login />;
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {user.role === 'client' && (
          <>
            <Route index element={<ClientDashboard />} />
            <Route path="profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
        {user.role === 'artisan' && (
          <>
            <Route index element={<ArtisanDashboard />} />
            <Route path="profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
        {user.role === 'admin' && (
          <>
            <Route index element={<AdminPanel />} />
            <Route path="profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <CraftShieldProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/verify/:proofId" element={<VerifyProof />} />
          <Route path="/*" element={<MainApp />} />
        </Routes>
      </BrowserRouter>
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#1c1c19',
            fontFamily: 'Inter, sans-serif',
            boxShadow: '0 4px 20px rgba(10, 25, 47, 0.1)',
            borderRadius: '8px',
          },
          success: {
            iconTheme: {
              primary: '#2d5a5a',
              secondary: '#ffffff',
            },
          },
        }}
      />
    </CraftShieldProvider>
  );
}

export default App;
