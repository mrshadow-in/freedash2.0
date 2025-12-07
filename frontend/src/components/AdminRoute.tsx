import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface AdminRouteProps {
    children: ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
    const { user, isAuthenticated } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (user?.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

export default AdminRoute;
