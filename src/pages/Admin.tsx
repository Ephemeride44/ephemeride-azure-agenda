import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "@/components/LoginForm";
import { supabase as baseSupabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from '@supabase/supabase-js';

const supabase: SupabaseClient = baseSupabase;

const Admin = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
    navigate("/admin/dashboard");
  }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-ephemeride flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mb-8">
        <img 
          src="/lovable-uploads/131a8b24-2c42-453d-8e62-bb48e8c55b00.png" 
          alt="Ephemeride" 
          className="h-12 md:h-16 mx-auto mb-8"
        />
        <LoginForm />
      </div>
    </div>
  );
};

export default Admin;
