import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import About from "@/components/About";
import LiveStream from "@/components/LiveStream";
import Newsletter from "@/components/Newsletter";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import RegistrationModal from "@/components/RegistrationModal";
import LiveBanner from "@/components/LiveBanner";
import { useNotifications } from "@/hooks/useNotifications";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  const { registerServiceWorker, requestPermission } = useNotifications();

  useEffect(() => {
    // Register service worker for PWA
    registerServiceWorker();
    
    // Request notification permission after a short delay
    const timer = setTimeout(() => {
      requestPermission();
    }, 3000);

    return () => clearTimeout(timer);
  }, [registerServiceWorker, requestPermission]);

  return (
    <div className="min-h-screen bg-background">
      {/* Panel de administración */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Link to="/login">
          <Button variant="outline" size="sm">
            Admin Login
          </Button>
        </Link>
        <Link to="/register">
          <Button variant="default" size="sm">
            Registro
          </Button>
        </Link>
      </div>
      <LiveBanner />
      <Header />
      <Hero />
      <Services />
      <About />
      <LiveStream />
      <Newsletter />
      <Contact />
      <Footer />
      <RegistrationModal />
    </div>
  );
};

export default Index;
