
import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";

const TipeeeSupport = () => {
  const [isVisible, setIsVisible] = useState(true);
  const { theme } = useTheme();

  if (!isVisible) return null;

  return (
    <div className={`fixed left-0 top-1/2 -translate-y-1/2 z-40 group ${theme === 'light' ? 'hover:bg-white/90' : 'hover:bg-black/20'} transition-all duration-300 rounded-r-lg`}>
      <div className="relative">
        <a 
          href="https://fr.tipeee.com/ephemeride" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center p-2 hover:opacity-80 transition-opacity"
        >
          <img 
            src="/lovable-uploads/c797c39f-25e0-4264-b65c-1ea1a517408b.png" 
            alt="Tipeee" 
            className="h-8 w-8 transform -rotate-90"
          />
          <span className={`text-xs font-medium mt-1 writing-mode-vertical transform -rotate-90 whitespace-nowrap ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
            Soutenez-nous
          </span>
        </a>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsVisible(false)}
          className={`absolute -top-1 -right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity ${theme === 'light' ? 'text-gray-400 hover:text-gray-600' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <X size={12} />
        </Button>
      </div>
    </div>
  );
};

export default TipeeeSupport;
