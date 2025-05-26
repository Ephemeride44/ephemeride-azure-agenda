
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

const BackToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { theme } = useTheme();

  // Show button when page is scrolled down
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Button
      onClick={scrollToTop}
      className={`fixed bottom-8 right-8 z-50 rounded-full w-12 h-12 p-0 shadow-lg transition-all duration-300 hover:scale-110 ${
        theme === 'light' 
          ? 'bg-[#1B263B] text-[#faf3ec] hover:bg-[#243447]' 
          : 'bg-[#faf3ec] text-[#1B263B] hover:bg-white/90'
      }`}
      size="icon"
      aria-label="Retour vers le haut"
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  );
};

export default BackToTop;
