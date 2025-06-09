
import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useTheme } from "@/components/ThemeProvider";
import { ThemeToggle } from "../ThemeToggle";

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  return (
  <div className="min-h-screen flex flex-col dark:bg-ephemeride light:bg-[#faf3ec]">
    <header className="py-4 px-4 md:px-8 border-b border-white/10">
      <div className="container mx-auto">
        <div className="flex justify-between items-center">
          <Link to="/">
            <img 
              src={theme === 'light' ? '/lovable-uploads/276e159d-8434-4c77-947f-731eaf4b8606.png' : '/lovable-uploads/5bf9022e-e505-4018-a848-1c576760dd26.png'} 
              alt="Ephemeride" 
              className="h-16"
            />
          </Link>
          <div className="flex items-center gap-4">
            <Button
              asChild
              variant="outline"
              className={
                theme === 'light'
                  ? 'bg-[#fff7e6] text-[#1B263B] border-[#f3e0c7] hover:bg-[#ffe2b0] hover:text-[#1B263B] shadow-sm rounded transition'
                  : 'text-white border-white/20 hover:bg-white/10 rounded transition'
              }
            >
              <Link to="/">Voir le site</Link>
            </Button>

            <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="outline-none focus:ring-2 focus:ring-ring rounded-md">
                    <ThemeToggle />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Changer le thème
                </TooltipContent>
              </Tooltip>
            <Button
              asChild
              variant="outline"
              className={
                theme === 'light'
                  ? 'bg-[#fff7e6] text-[#1B263B] border-[#f3e0c7] hover:bg-[#ffe2b0] hover:text-[#1B263B] shadow-sm rounded p-2 transition'
                  : 'text-white border-white/20 hover:bg-white/10 rounded p-2 transition'
              }
              title="Paramètres du site"
            >
              <Link to="/admin/settings">
                <Settings className="w-6 h-6" />
              </Link>
            </Button>
            <Button
              variant="outline"
              className={
                theme === 'light'
                  ? 'bg-[#fff7e6] text-[#1B263B] border-[#f3e0c7] hover:bg-[#ffe2b0] hover:text-[#1B263B] shadow-sm rounded transition'
                  : 'text-white border-white/20 hover:bg-white/10 rounded transition'
              }
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
