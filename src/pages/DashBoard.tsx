
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import UserDashboard from '@/components/dashboards/UserDashboard';
import VendorDashboard from '@/components/dashboards/VendorDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';

const Dashboard = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth" replace />;
  }

  switch (profile.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'vendor':
      return <VendorDashboard />;
    case 'user':
    default:
      return <UserDashboard />;
  }
};

export default Dashboard;
