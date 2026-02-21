import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import SignInPage from "./pages/auth/SigninPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPassword from "./pages/auth/ForgotPassword";
import AdminSignInPage from "./pages/admin/AdminSignInPage";
import AdminSignupPage from "./pages/admin/AdminSignupPage";
import HomePage from "./pages/DashboardPage";
import LandingPage from "./pages/HomePage";
import SplashPage from "./pages/SplashPage";
import Loader from "./components/ui/Loader";

// ─── Protected Route ──────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading)
    return <Loader fullPage text="Synchronizing your account securely..." />; // Use our new premium loader
  return user ? children : <Navigate to="/signin" replace />;
}

// ─── App ──────────────────────────────────────────────────────────────────────
// ─── Transition Wrapper ──────────────────────────────────────────────────────
function PageTransition({ children }) {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const getLoadingMessage = (path) => {
    if (path.includes("dashboard")) return "Synchronizing your dashboard...";
    if (path.includes("signin")) return "Preparing secure access...";
    if (path.includes("signup")) return "Building your ride profile...";
    if (path.includes("forgot-password"))
      return "Locating recovery protocols...";
    if (path.includes("home")) return "Initializing urban experience...";
    return "Optimizing your route...";
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 800);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (isTransitioning)
    return <Loader fullPage text={getLoadingMessage(location.pathname)} />;
  return children;
}

function AppContent() {
  const [showSplash, setShowSplash] = useState(() => {
    // Check if splash was already shown in this session
    return !sessionStorage.getItem("splashShown");
  });

  useEffect(() => {
    if (showSplash) {
      // Show splash page on initial load
      const timer = setTimeout(() => {
        setShowSplash(false);
        sessionStorage.setItem("splashShown", "true");
      }, 4200);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  // Show splash page during initial load
  if (showSplash) {
    return <SplashPage />;
  }

  return (
    <PageTransition>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<LandingPage />} />

        {/* User Auth Routes */}
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Admin Auth Routes */}
        <Route path="/admin/signin" element={<AdminSignInPage />} />
        <Route path="/admin/signup" element={<AdminSignupPage />} />

        {/* Loader Demo Route */}
        <Route path="/loader" element={<Loader fullPage />} />

        {/* Protected Dashboard */}
        <Route
          path="/:role/dashboard"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PageTransition>
  );
}

function AppRoutes() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
