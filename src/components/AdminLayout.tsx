import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '@/components/ThemeProvider';
import { useUserRoleContext } from '@/components/UserRoleProvider';
import { OrganizationSelector } from '@/components/OrganizationSelector';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  LayoutDashboard, 
  Settings, 
  Building2, 
  LogOut,
  Home,
  Calendar,
  Crown
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ 
  children, 
  title = "Administration",
  subtitle = "Gestion des événements et organisations" 
}) => {
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { isSuperAdmin, user, organizations } = useUserRoleContext();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/admin');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const navItems = [
    {
      href: '/admin/dashboard',
      icon: LayoutDashboard,
      label: 'Tableau de bord',
      description: 'Gérer les événements'
    },
    ...(isSuperAdmin ? [
      {
        href: '/admin/settings',
        icon: Settings,
        label: 'Paramètres',
        description: 'Configuration'
      },
      {
        href: '/admin/organizations',
        icon: Building2,
        label: 'Organisations',
        description: 'Gérer les organisations'
      },
      {
        href: '/admin/superadmins',
        icon: Crown,
        label: 'Super Admins',
        description: 'Gérer les super administrateurs'
      }
    ] : [])
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo et titre */}
            <div className="flex items-center space-x-6">
              <Link to="/" className="flex items-center space-x-3">
                <img 
                  src={theme === 'light' ? '/images/ephemeride-logo-lite.png' : '/images/ephemeride-logo-dark.png'}
                  alt="Ephemeride" 
                  className="h-10 w-auto"
                />
                <div className="hidden md:block">
                  <h1 className="text-xl font-semibold">{title}</h1>
                  <p className="text-sm text-muted-foreground">{subtitle}</p>
                </div>
              </Link>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              <Link to="/" target="_blank">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Voir le site</span>
                </Button>
              </Link>
              
              <ThemeToggle />
              
              <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card className="p-4 space-y-4">
              {/* Sélecteur d'organisation */}
              {(isSuperAdmin || organizations.length > 1) && (
                <div className="pb-4 border-b">
                  <OrganizationSelector compact />
                </div>
              )}

              {/* User info */}
              <div className="pb-4 border-b">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <div className="flex-1">
                        <div>{item.label}</div>
                        <div className="text-xs opacity-75">{item.description}</div>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
