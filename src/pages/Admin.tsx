
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "@/components/LoginForm";

const Admin = () => {
  const [isAuthenticated] = useState(() => {
    return localStorage.getItem("ephemeride-admin") === "true";
  });
  const navigate = useNavigate();

  // If user is already authenticated, redirect to dashboard
  if (isAuthenticated) {
    navigate("/admin/dashboard");
    return null;
  }

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
