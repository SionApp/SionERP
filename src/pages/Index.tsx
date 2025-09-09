import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import About from "@/components/About";
import LiveStream from "@/components/LiveStream";
import Newsletter from "@/components/Newsletter";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import RegistrationModal from "@/components/RegistrationModal";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
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
