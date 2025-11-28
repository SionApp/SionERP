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
import { useLiveStreamStatus } from "@/hooks/useLiveStreamStatus";
import { useEffect } from "react";

const Index = () => {
  const { registerServiceWorker, requestPermission } = useNotifications();
  const { isLive, liveData } = useLiveStreamStatus();

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
      <LiveBanner />
      <Header />
      <Hero />
      <Services />
      <About />

      {/* Conditionally render LiveStream or Newsletter */}
      <div id="streaming">
        {isLive ? (
          <LiveStream liveData={liveData} />
        ) : (
          <Newsletter />
        )}
      </div>

      <Contact />
      <Footer />
      <RegistrationModal />
    </div>
  );
};

export default Index;
