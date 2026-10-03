import React, { useContext, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext';
import { SidebarProvider } from './context/SidebarContext';

import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import ProtectedRoute from './components/ProtectedRoute';
import Loading from './components/Loading';
import ErrorBoundary from './components/ErrorBoundary';

// Public Auth Pages (Loaded Eagerly for Immediate Interactivity)
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Lazy-Loaded Operations Modules for Fast Initial Bundle Loading
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DevoteeRegistration = lazy(() => import('./pages/DevoteeRegistration'));
const QueueManagement = lazy(() => import('./pages/QueueManagement'));
const CrowdMonitoring = lazy(() => import('./pages/CrowdMonitoring'));
const Predictions = lazy(() => import('./pages/Predictions'));
const RiskAnalysis = lazy(() => import('./pages/RiskAnalysis'));
const Simulation = lazy(() => import('./pages/Simulation'));
const TempleMapPage = lazy(() => import('./pages/TempleMap'));
const Analytics = lazy(() => import('./pages/Analytics'));
const ModelPerformance = lazy(() => import('./pages/ModelPerformance'));
const Pilgrims = lazy(() => import('./pages/Pilgrims'));
const DarshanTokens = lazy(() => import('./pages/DarshanTokens'));
const Staff = lazy(() => import('./pages/Staff'));
const Reports = lazy(() => import('./pages/Reports'));
const AlertsPage = lazy(() => import('./pages/Alerts'));
const UsersPage = lazy(() => import('./pages/Users'));
const TempleManagement = lazy(() => import('./pages/TempleManagement'));
const Settings = lazy(() => import('./pages/Settings'));

const Layout = ({ children }) => {
  return (
    <div className="d-flex min-vh-100 bg-ivory" style={{ backgroundColor: '#F9F6F0' }}>
      <Sidebar />
      <div className="d-flex flex-column flex-grow-1 overflow-hidden">
        <Topbar />
        <main className="flex-grow-1 overflow-auto bg-ivory p-0" style={{ minHeight: 'calc(100vh - 65px)', backgroundColor: '#F9F6F0' }}>
          <ErrorBoundary>
            <Suspense fallback={<Loading />}>
              {children}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

const AppRoutes = () => {
  const { user } = useContext(AuthContext);

  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      {/* Protected Operations Routes with Lazy Loading & Role Authorizations */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Layout><Dashboard /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/devotee-registration" element={
        <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TEMPLE_ADMIN', 'MANAGER', 'RECEPTIONIST']}>
          <Layout><DevoteeRegistration /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/queue-management" element={
        <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TEMPLE_ADMIN', 'MANAGER', 'RECEPTIONIST']}>
          <Layout><QueueManagement /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/crowd-monitoring" element={
        <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TEMPLE_ADMIN', 'MANAGER', 'SECURITY', 'VOLUNTEER']}>
          <Layout><CrowdMonitoring /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/predictions" element={
        <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TEMPLE_ADMIN', 'MANAGER']}>
          <Layout><Predictions /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/risk-analysis" element={
        <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TEMPLE_ADMIN', 'MANAGER', 'SECURITY', 'MEDICAL']}>
          <Layout><RiskAnalysis /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/simulation" element={
        <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TEMPLE_ADMIN', 'MANAGER']}>
          <Layout><Simulation /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/temple-map" element={
        <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TEMPLE_ADMIN', 'MANAGER', 'SECURITY', 'MEDICAL', 'VOLUNTEER']}>
          <Layout><TempleMapPage /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/analytics" element={
        <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TEMPLE_ADMIN', 'MANAGER']}>
          <Layout><Analytics /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/model-performance" element={
        <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TEMPLE_ADMIN', 'MANAGER']}>
          <Layout><ModelPerformance /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/pilgrims" element={
        <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TEMPLE_ADMIN', 'MANAGER', 'RECEPTIONIST']}>
          <Layout><Pilgrims /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/darshan-tokens" element={
        <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TEMPLE_ADMIN', 'MANAGER', 'RECEPTIONIST']}>
          <Layout><DarshanTokens /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/staff" element={
        <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TEMPLE_ADMIN', 'MANAGER']}>
          <Layout><Staff /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/reports" element={
        <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TEMPLE_ADMIN', 'MANAGER']}>
          <Layout><Reports /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/alerts" element={
        <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TEMPLE_ADMIN', 'MANAGER', 'SECURITY', 'MEDICAL', 'VOLUNTEER']}>
          <Layout><AlertsPage /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/users" element={
        <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TEMPLE_ADMIN']}>
          <Layout><UsersPage /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/temples-management" element={
        <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
          <Layout><TempleManagement /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/settings" element={
        <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TEMPLE_ADMIN']}>
          <Layout><Settings /></Layout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SidebarProvider>
          <Router>
            <AppRoutes />
          </Router>
        </SidebarProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
