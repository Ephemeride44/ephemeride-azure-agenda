import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const navigate = useNavigate();

  return (
  <div className="min-h-screen bg-ephemeride flex flex-col">
    <header className="py-4 px-4 md:px-8 border-b border-white/10">
      <div className="container mx-auto">
        <div className="flex justify-between items-center">
          <Link to="/">
            <img 
              src="/lovable-uploads/131a8b24-2c42-453d-8e62-bb48e8c55b00.png" 
              alt="Ephemeride" 
              className="h-10"
            />
          </Link>
          <div className="flex items-center gap-4">
            <Button 
              asChild
              variant="ghost" 
              className="text-white hover:bg-white/10"
            >
              <Link to="/">Voir le site</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="text-white hover:bg-white/10 p-2"
              title="Paramètres du site"
            >
              <Link to="/admin/settings">
                <Settings className="w-6 h-6" />
              </Link>
            </Button>
            <Button 
              variant="outline" 
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => {
                supabase.auth.signOut();
                navigate("/admin");
              }}
            >
              Déconnexion
            </Button>
          </div>
        </div>
      </div>
    </header>
    <main className="flex-1 container mx-auto px-4 md:px-8 py-8">
      {children}
    </main>
  </div>
  );
};

export default AdminLayout; 