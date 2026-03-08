import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useParams,
} from "react-router-dom";
import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import SignInPage from "./pages/auth/SignInPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPassword from "./pages/auth/ForgotPassword";
import AdminSignInPage from "./pages/admin/AdminSignInPage";
import AdminSignupPage from "./pages/admin/AdminSignupPage";
import ManageUsersPage from "./pages/admin/ManageUsersPage";
import AnalyticsPage from "./pages/admin/AnalyticsPage";
import DriverApprovalsPage from "./pages/admin/DriverApprovalsPage";
import FleetOverviewPage from "./pages/admin/FleetOverviewPage";
import SystemSettingsPage from "./pages/admin/SystemSettingsPage";
import SecurityPage from "./pages/admin/SecurityPage";
import DashboardPage from "./pages/DashboardPage";
import HomePage from "./pages/HomePage";
import SplashPage from "./pages/SplashPage";
import RideMapPage from "./pages/RideMapPage";
import DriverProfileFormPage from "./pages/DriverProfileFormPage";
import DriverProfile from "./pages/DriverProfile";
import ActiveRidesPage from "./pages/driver/ActiveRidesPage";
import EarningsPage from "./pages/driver/EarningsPage";
import SchedulePage from "./pages/driver/SchedulePage";
import MyRatingPage from "./pages/driver/MyRatingPage";
import PayoutsPage from "./pages/driver/PayoutsPage";
import Loader from "./components/ui/Loader";
import { getMyDriverProfile } from "./services/driverProfileService";

// ─── Protected Route ──────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading)
    return <Loader fullPage text="Synchronizing your account securely..." />; // Use our new premium loader
  return user ? children : <Navigate to="/signin" replace />;
}

// ─── Admin Protected Route ────────────────────────────────────────────────────
function AdminProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading)
    return <Loader fullPage text="Verifying administrative access..." />;
  
  if (!user) return <Navigate to="/signin" replace />;
  
  if (user.role !== "admin") {
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }
  
  return children;
}

// ─── Driver Protected Route ───────────────────────────────────────────────────
// Ensures driver is authenticated AND has submitted driver profile form
function DriverProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const [profileLoading, setProfileLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    const checkDriverProfile = async () => {
      if (!user || user.role !== "driver") {
        setProfileLoading(false);
        return;
      }

      try {
        const response = await getMyDriverProfile();
        if (response.data.success && response.data.data) {
          setHasProfile(true);
        }
      } catch {
        setHasProfile(false);
      } finally {
        setProfileLoading(false);
      }
    };

    if (!loading) {
      checkDriverProfile();
    }
  }, [user, loading]);

  // Still loading auth
  if (loading) {
    return <Loader fullPage text="Synchronizing your account securely..." />;
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // Not a driver
  if (user.role !== "driver") {
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  // Still checking driver profile
  if (profileLoading) {
    return <Loader fullPage text="Setting up your driver credentials..." />;
  }

  // Driver doesn't have a profile - allow access to dashboard for now
  /*
  if (!hasProfile) {
    return <Navigate to="/driver/dashboard/profile-form" replace />;
  }
  */

  // Driver is authenticated and has profile - allow access
  return children;
}



// ─── Dashboard Route Wrapper ─────────────────────────────────────────────────
// Routes to appropriate protected route based on user role
function DashboardRoute() {
  const { role } = useParams();
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader fullPage text="Synchronizing your dashboard..." />;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // If it's a driver dashboard route, use DriverProtectedRoute
  if (role === "driver") {
    return (
      <DriverProtectedRoute>
        <DashboardPage />
      </DriverProtectedRoute>
    );
  }

  // For other roles, use standard ProtectedRoute
  return (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  );
}

function PageTransition({ children }) {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const getLoadingMessage = (path) => {
    if (path.includes("dashboard")) return "Synchronizing your dashboard...";
    if (path.includes("signin")) return "Preparing secure access...";
    if (path.includes("signup")) return "Building your ride profile...";
    if (path.includes("driver/profile")) return "Setting up your driver credentials...";
    if (path.includes("forgot-password"))
      return "Locating recovery protocols...";
    if (path.includes("home")) return "Initializing urban experience...";
    return "Optimizing your route...";
  };

  useEffect(() => {
    // Artificial delay removed for a smoother and faster experience
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 150); // Set to 150ms instead of 800ms so it barely flashes if needed
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
    // Clean up Facebook OAuth URL hash artifact
    if (window.location.hash === '#_=_') {
      if (window.history && window.history.replaceState) {
        window.history.replaceState(
          '',
          document.title,
          window.location.pathname + window.location.search
        );
      } else {
        window.location.hash = '';
      }
    }
  }, []);

  useEffect(() => {
    if (showSplash) {
      // Show splash page on initial load (reduced time for better experience)
      const timer = setTimeout(() => {
        setShowSplash(false);
        sessionStorage.setItem("splashShown", "true");
      }, 1200);
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
        <Route path="/home" element={<HomePage />} />

        {/* User Auth Routes */}
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Admin Auth Routes */}
        <Route path="/admin/signin" element={<AdminSignInPage />} />
        <Route path="/admin/signup" element={<AdminSignupPage />} />

        {/* Admin Secret Routes */}
        <Route
          path="/admin/dashboard/manage-users"
          element={
            <AdminProtectedRoute>
              <ManageUsersPage />
            </AdminProtectedRoute>
          }
        />

        {/* Admin Analytics & Driver Approvals */}
        <Route
          path="/admin/dashboard/analytics"
          element={
            <AdminProtectedRoute>
              <AnalyticsPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard/driver-approvals"
          element={
            <AdminProtectedRoute>
              <DriverApprovalsPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard/fleet"
          element={
            <AdminProtectedRoute>
              <FleetOverviewPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard/settings"
          element={
            <AdminProtectedRoute>
              <SystemSettingsPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard/security"
          element={
            <AdminProtectedRoute>
              <SecurityPage />
            </AdminProtectedRoute>
          }
        />

        {/* Loader Demo Route */}
        <Route path="/loader" element={<Loader fullPage />} />

        {/* Protected Dashboard Features */}
        <Route
          path="/passenger/dashboard/ride"
          element={
            <ProtectedRoute>
              <RideMapPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/driver/dashboard/profile-form"
          element={
            <ProtectedRoute>
              <DriverProfileFormPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/driver/dashboard/profile"
          element={
            <DriverProtectedRoute>
              <DriverProfile />
            </DriverProtectedRoute>
          }
        />

        <Route
          path="/driver/dashboard/active-rides"
          element={
            <DriverProtectedRoute>
              <ActiveRidesPage />
            </DriverProtectedRoute>
          }
        />
        <Route
          path="/driver/dashboard/earnings"
          element={
            <DriverProtectedRoute>
              <EarningsPage />
            </DriverProtectedRoute>
          }
        />
        <Route
          path="/driver/dashboard/schedule"
          element={
            <DriverProtectedRoute>
              <SchedulePage />
            </DriverProtectedRoute>
          }
        />
        <Route
          path="/driver/dashboard/rating"
          element={
            <DriverProtectedRoute>
              <MyRatingPage />
            </DriverProtectedRoute>
          }
        />
        <Route
          path="/driver/dashboard/payouts"
          element={
            <DriverProtectedRoute>
              <PayoutsPage />
            </DriverProtectedRoute>
          }
        />

        <Route
          path="/:role/dashboard"
          element={<DashboardRoute />}
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