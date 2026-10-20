import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import HeroSection from '../components/landing/HeroSection';
import HowItWorks from '../components/landing/HowItWorks';
import WardrobeFeature from '../components/landing/WardrobeFeature';
import CallToAction from '../components/landing/CallToAction';
import Footer from '../components/landing/Footer';

const LandingPage = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Signed-in users go straight to the chat
  if (!isLoading && isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }

  return (
    <div className="min-h-dvh bg-ground">
      <main>
        <HeroSection />
        <HowItWorks />
        <WardrobeFeature />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
