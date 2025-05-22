
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { CircleHalf } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <Button 
      variant="outline" 
      size="icon" 
      onClick={toggleTheme}
      className={`bg-white/10 border-white/20 hover:bg-white/20 ${theme === 'light' ? 'text-ephemeride rotate-180' : 'text-white'}`}
    >
      <CircleHalf className="h-5 w-5" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
