import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import ManageServer from './pages/ManageServer';
import AFKPage from './pages/AFKPage';
import Account from './pages/Account';
import GamesPage from './pages/GamesPage';
import NotFound from './pages/NotFound';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import BrandingLoader from './components/BrandingLoader';
import SessionHeartbeat from './components/SessionHeartbeat';
import DiscordSuccess from './pages/DiscordSuccess';
import NotificationListener from './components/NotificationListener';
import SystemIntegrityCheck from './components/SystemIntegrityCheck';
import GlobalAdScript from './components/GlobalAdScript';
import ScriptAdInjector from './components/ScriptAdInjector';
import CustomAdInjector from './components/CustomAdInjector';
import GlobalButtonAdInterceptor from './components/GlobalButtonAdInterceptor';
import VisualAdEditor from './components/VisualAdEditor';
import GlobalAdCreationModal from './components/GlobalAdCreationModal';
import AdBlockDetector from './components/AdBlockDetector';


function App() {
  return (
    <Router>
      <NotificationListener />
      <BrandingLoader />
      <SessionHeartbeat />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin" element={
          <PrivateRoute>
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          </PrivateRoute>
        } />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/server/:id" element={<PrivateRoute><ManageServer /></PrivateRoute>} />
        <Route path="/server/:id" element={<PrivateRoute><ManageServer /></PrivateRoute>} />
        <Route path="/account" element={<PrivateRoute><Account /></PrivateRoute>} />
        <Route path="/games" element={<PrivateRoute><GamesPage /></PrivateRoute>} />
        <Route path="/afk" element={<PrivateRoute><AFKPage /></PrivateRoute>} />
        <Route path="/auth/discord/success" element={<DiscordSuccess />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <SystemIntegrityCheck />
      <GlobalAdScript />
      <ScriptAdInjector />
      <CustomAdInjector />
      <GlobalButtonAdInterceptor />
      <VisualAdEditor />
      <GlobalAdCreationModal />
      <AdBlockDetector />
    </Router>
  );
}

export default App;
