import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isLoading, isAuthenticated } = useAuth();

  // En cours de chargement
  if (isLoading || isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  // Pas authentifié, rediriger vers la page de login
  if (!isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  // Authentifié, afficher le contenu
  return <>{children}</>;
};
