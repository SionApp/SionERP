import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-background/95 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50 transition-all duration-300">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">✝</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Iglesia Evangélica Pentecostal Sion</h1>
              <p className="text-sm text-muted-foreground">Cambiando vidas</p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#inicio" className="text-muted-foreground hover:text-foreground transition-colors">
              Inicio
            </a>
            <a href="#servicios" className="text-muted-foreground hover:text-foreground transition-colors">
              Servicios
            </a>
            <a href="#nosotros" className="text-muted-foreground hover:text-foreground transition-colors">
              Nosotros
            </a>
            <a href="#streaming" className="text-muted-foreground hover:text-foreground transition-colors">
              En Vivo
            </a>
            <Link to="/galeria" className="text-muted-foreground hover:text-foreground transition-colors">
              Galería
            </Link>
            <a href="#contacto" className="text-muted-foreground hover:text-foreground transition-colors">
              Contacto
            </a>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <LanguageSwitcher />
            <ThemeToggle />
            <Button variant="default" size="sm">
              Únete a Nosotros
            </Button>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-border">
            <nav className="flex flex-col space-y-4 pt-4">
              <a href="#inicio" className="text-muted-foreground hover:text-foreground transition-colors">
                Inicio
              </a>
              <a href="#servicios" className="text-muted-foreground hover:text-foreground transition-colors">
                Servicios
              </a>
              <a href="#nosotros" className="text-muted-foreground hover:text-foreground transition-colors">
                Nosotros
              </a>
              <a href="#streaming" className="text-muted-foreground hover:text-foreground transition-colors">
                En Vivo
              </a>
              <Link to="/galeria" className="text-muted-foreground hover:text-foreground transition-colors">
                Galería
              </Link>
              <a href="#contacto" className="text-muted-foreground hover:text-foreground transition-colors">
                Contacto
              </a>
              <Button variant="default" size="sm" className="mt-4 self-start">
                Únete a Nosotros
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;