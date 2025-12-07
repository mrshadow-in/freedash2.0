import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import ManageServer from './pages/ManageServer';
import AFKPage from './pages/AFKPage';
import Account from './pages/Account';
import NotFound from './pages/NotFound';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import BrandingLoader from './components/BrandingLoader';


function App() {
  return (
    <Router>
      <BrandingLoader />
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
        <Route path="/server/:id" element={<PrivateRoute><ManageServer /></PrivateRoute>} />
        <Route path="/account" element={<PrivateRoute><Account /></PrivateRoute>} />
        <Route path="/afk" element={<PrivateRoute><AFKPage /></PrivateRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
