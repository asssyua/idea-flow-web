import { Navigate } from 'react-router-dom';

interface PrivateRouteProps {
  children: React.ReactNode;
}

function PrivateRoute({ children }: PrivateRouteProps) {
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default PrivateRoute;