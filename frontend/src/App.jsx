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
import { NotificationProvider } from "./context/NotificationContext";
import { LanguageProvider } from "./context/LanguageContext";
import api from "./services/api";
import SignInPage from "./pages/auth/SignInPage";
import SignupPage from "./pages/auth/SignupPage";
import CompleteProfilePage from "./pages/auth/CompleteProfilePage";
import ForgotPassword from "./pages/auth/ForgotPassword";
import AdminSignInPage from "./pages/admin/AdminSignInPage";
import AdminSignupPage from "./pages/admin/AdminSignupPage";
import ManageUsersPage from "./pages/admin/ManageUsersPage";
import AnalyticsPage from "./pages/admin/AnalyticsPage";
import DriverApprovalsPage from "./pages/admin/DriverApprovalsPage";
import FleetOverviewPage from "./pages/admin/FleetOverviewPage";
import SystemSettingsPage from "./pages/admin/SystemSettingsPage";
import SecurityPage from "./pages/admin/SecurityPage";
import RevenueAnalyticsPage from "./pages/admin/RevenueAnalyticsPage";
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
import GoOnlinePage from "./pages/driver/GoOnlinePage";
import DriverBookingsPage from "./pages/driver/DriverBookingsPage";
import ManageRidesPage from "./pages/driver/ManageRidesPage";
import RideRequestDetailsPage from "./pages/driver/RideRequestDetailsPage";
import PayoutRequestPage from "./pages/driver/PayoutRequestPage";
import RateCardPage from "./pages/driver/RateCardPage";
import DriverWalletPage from "./pages/driver/DriverWalletPage";
import AvailableRidesPage from "./pages/passenger/AvailableRidesPage";
import PassengerBookingsPage from "./pages/passenger/PassengerBookingsPage";
import PickupMap from './pages/PickupMap';
import PassengerLiveTracking from './pages/passenger/PassengerLiveTracking';
import StartRide from './pages/StartRide';
import HistoryPage from "./pages/HistoryPage";
import AdminHistoryPage from "./pages/admin/AdminHistoryPage";
import Loader from "./components/ui/Loader";
import PassengerProfile from "./pages/PassengerProfile";
import AdminProfile from "./pages/AdminProfile";
import SavedPlacesPage from "./pages/SavedPlacesPage";
import ReviewsPage from "./pages/ReviewsPage";
import PaymentsPage from "./pages/PaymentsPage";
import ReferralPage from "./pages/ReferralPage";
import NotificationsPage from "./pages/NotificationsPage";
import SettingsPage from "./pages/SettingsPage";

import FAQPage from "./pages/FAQPage";
import ContactUsPage from "./pages/ContactUsPage";
import EmergencyPage from "./pages/EmergencyPage";
import AdminSOSPage from "./pages/admin/AdminSOSPage";
import ReviewSubmissionPage from "./pages/ReviewSubmissionPage";
import AdminFlagDashboard from "./pages/AdminFlagDashboard";
import AdminReviewsPage from "./pages/AdminReviewsPage";
import { ShieldAlert } from "lucide-react";

import { getMyDriverProfile } from "./services/driverProfileService";
import { requestForToken, onMessageListener } from "./firebase";

// ─── Shared UI Components ─────────────────────────────────────────────────────
function SuspendedUI({ isSuspended = true }) {
  return (
    <div className="mesh-bg min-h-screen flex items-center justify-center p-6 text-center">
      <div className="glass-card p-10 max-w-sm rounded-3xl border-(--card-border)">
        <div className="bg-red-500/10 p-4 rounded-full w-fit mx-auto mb-6">
          <ShieldAlert size={48} className="text-red-500" />
        </div>
        <h2 className="text-xl font-black mb-2">
          {isSuspended ? "Account Suspended" : "Connectivity Error"}
        </h2>
        <p className="text-sm text-(--text-dim) mb-6">
          {isSuspended 
            ? "Your account has been suspended. Please check your email for more details regarding the issue." 
            : "We're having trouble reaching the server. Please check your connection and try again."}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="w-full bg-primary text-black py-3 rounded-xl font-bold hover:scale-105 transition-all"
        >
          {isSuspended ? "Reload Status" : "Retry Connection"}
        </button>
      </div>
    </div>
  );
}

// ─── Protected Route ──────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading)
    return <Loader fullPage text="Synchronizing your account securely..." />; // Use our new premium loader
  
  if (!user) return <Navigate to="/signin" replace />;

  if (user.isBlocked) {
    return <SuspendedUI isSuspended={true} />;
  }

  // Redirect to complete profile if mobile number is missing
  if (user.role !== "admin" && (!user.Mobile_no || user.Mobile_no === "0000000000")) {
    const location = window.location.pathname;
    if (location !== "/complete-profile") {
      return <Navigate to="/complete-profile" replace />;
    }
  }

  return children;
}

// ─── Admin Protected Route ────────────────────────────────────────────────────
function AdminProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading)
    return <Loader fullPage text="Verifying administrative access..." />;
  
  if (!user) return <Navigate to="/signin" replace />;
  
  if (user.role !== "admin" && user.role !== "superadmin") {
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
  const [errorStatus, setErrorStatus] = useState(null);

  useEffect(() => {
    const checkDriverProfile = async () => {
      if (!user || user.role !== "driver") {
        setProfileLoading(false);
        return;
      }

      try {
        setProfileLoading(true);
        setErrorStatus(null);
        const response = await getMyDriverProfile();
        
        // Match the feature-based backend response: { success: true, data: profileObject }
        if (response.data.success) {
          if (response.data.data) {
            setHasProfile(true);
          } else {
            setHasProfile(false);
          }
        }
      } catch (err) {
        console.error("Driver Profile Guard Error:", err);
        // If it's a real API error (429, 500, etc.), don't assume they have no profile!
        // Stay on current page or show error, but DON'T force redirect to form
        setErrorStatus(err.response?.status || 500);
      } finally {
        setProfileLoading(false);
      }
    };

    if (!loading && user?.role === "driver") {
      checkDriverProfile();
    } else if (!loading && user?.role !== "driver") {
        setProfileLoading(false);
    }
  }, [user, loading]);

  // 1. Still loading Auth/Profile?
  if (loading || profileLoading) {
    return <Loader fullPage text="Synchronizing your driver status..." />;
  }

  // 2. Not authenticated?
  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // 3. Not a driver?
  if (user.role !== "driver") {
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  // 4. API Error (Transient)?
  if (errorStatus && errorStatus !== 404 && errorStatus !== 403) {
    return <SuspendedUI isSuspended={false} />;
  }

  // 5. Driver HAS NO PROFILE RECORD - force them to fill it
  if (!hasProfile) {
    const location = window.location.pathname;
    if (location !== "/driver/dashboard/profile-form") {
      return <Navigate to="/driver/dashboard/profile-form" replace />;
    }
  }

  // 6. Authorized and ready!
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
    // Prevent transition if we are already going to the loader page
    if (location.pathname === "/loader") {
      setIsTransitioning(false);
      return;
    }

    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 150);
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
        <Route path="/splash" element={<SplashPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/loader" element={<Loader fullPage text="System Demo Mode..." />} />

        {/* Public Emergency Page — no auth required */}
        <Route path="/emergency/:token" element={<EmergencyPage />} />

        {/* User Auth Routes */}
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/complete-profile" element={<CompleteProfilePage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Admin Auth Routes */}
        <Route path="/admin/signin" element={<AdminSignInPage />} />
        <Route path="/admin/signup" element={<AdminSignupPage />} />

        {/* Admin Secret Routes */}
        <Route
          path="/:role/dashboard/manage-users"
          element={
            <AdminProtectedRoute>
              <ManageUsersPage />
            </AdminProtectedRoute>
          }
        />

        {/* Admin Analytics & Driver Approvals */}
        <Route
          path="/:role/dashboard/analytics"
          element={
            <AdminProtectedRoute>
              <AnalyticsPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/:role/dashboard/revenue"
          element={
            <AdminProtectedRoute>
              <RevenueAnalyticsPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/:role/dashboard/driver-approvals"
          element={
            <AdminProtectedRoute>
              <DriverApprovalsPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/:role/dashboard/fleet"
          element={
            <AdminProtectedRoute>
              <FleetOverviewPage />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/:role/dashboard/settings"
          element={
            <AdminProtectedRoute>
              <SystemSettingsPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/:role/dashboard/security"
          element={
            <AdminProtectedRoute>
              <SecurityPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/:role/dashboard/profile"
          element={
            <AdminProtectedRoute>
              <AdminProfile />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/:role/dashboard/history"
          element={
            <AdminProtectedRoute>
              <AdminHistoryPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/:role/dashboard/sos"
          element={
            <AdminProtectedRoute>
              <AdminSOSPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/flags"
          element={
            <AdminProtectedRoute>
              <AdminFlagDashboard />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/:role/dashboard/notifications"
          element={
            <AdminProtectedRoute>
              <NotificationsPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/reviews"
          element={
            <AdminProtectedRoute>
              <AdminReviewsPage />
            </AdminProtectedRoute>
          }
        />


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
          path="/pickup-map/:rideId"
          element={
            <ProtectedRoute>
              <PickupMap />
            </ProtectedRoute>
          }
        />
        <Route
          path="/start-ride/:rideId"
          element={
            <ProtectedRoute>
              <StartRide />
            </ProtectedRoute>
          }
        />
        <Route
          path="/passenger/live-tracking/:rideId"
          element={
            <ProtectedRoute>
              <PassengerLiveTracking />
            </ProtectedRoute>
          }
        />
        <Route
          path="/passenger/dashboard/profile"
          element={
            <ProtectedRoute>
              <PassengerProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/passenger/dashboard/history"
          element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/passenger/dashboard/places"
          element={
            <ProtectedRoute>
              <SavedPlacesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/passenger/dashboard/reviews"
          element={
            <ProtectedRoute>
              <ReviewsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/passenger/dashboard/payments"
          element={
            <ProtectedRoute>
              <PaymentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/passenger/dashboard/referral"
          element={
            <ProtectedRoute>
              <ReferralPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/passenger/dashboard/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/passenger/dashboard/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/passenger/dashboard/faq"
          element={
            <ProtectedRoute>
              <FAQPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/passenger/dashboard/contact-us"
          element={
            <ProtectedRoute>
              <ContactUsPage />
            </ProtectedRoute>
          }
        />

        {/* ── Passenger: Find & Book Rides ── */}
        <Route
          path="/passenger/dashboard/find-rides"
          element={
            <ProtectedRoute>
              <AvailableRidesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/passenger/dashboard/my-rides"
          element={
            <ProtectedRoute>
              <PassengerBookingsPage />
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
          path="/driver/dashboard/history"
          element={
            <DriverProtectedRoute>
              <HistoryPage />
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
          path="/driver/dashboard/payout-request"
          element={
            <DriverProtectedRoute>
              <PayoutRequestPage />
            </DriverProtectedRoute>
          }
        />
        <Route
          path="/driver/dashboard/rate-card"
          element={
            <DriverProtectedRoute>
              <RateCardPage />
            </DriverProtectedRoute>
          }
        />
        <Route
          path="/driver/dashboard/go-online"
          element={
            <DriverProtectedRoute>
              <GoOnlinePage />
            </DriverProtectedRoute>
          }
        />
        {/* ── Driver: Booking Requests ── */}
        <Route
          path="/driver/dashboard/bookings"
          element={
            <DriverProtectedRoute>
              <DriverBookingsPage />
            </DriverProtectedRoute>
          }
        />
        <Route
          path="/driver/dashboard/manage-rides"
          element={
            <DriverProtectedRoute>
              <ManageRidesPage />
            </DriverProtectedRoute>
          }
        />
        <Route
          path="/driver/dashboard/notifications"
          element={
            <DriverProtectedRoute>
              <NotificationsPage />
            </DriverProtectedRoute>
          }
        />
        <Route
          path="/driver/dashboard/ride-request/:rideId/:bookingId"
          element={
            <DriverProtectedRoute>
              <RideRequestDetailsPage />
            </DriverProtectedRoute>
          }
        />
        <Route
          path="/driver/dashboard/settings"
          element={
            <DriverProtectedRoute>
              <SettingsPage />
            </DriverProtectedRoute>
          }
        />

        <Route
          path="/driver/dashboard/faq"
          element={
            <DriverProtectedRoute>
              <FAQPage />
            </DriverProtectedRoute>
          }
        />
        <Route
          path="/driver/dashboard/contact-us"
          element={
            <DriverProtectedRoute>
              <ContactUsPage />
            </DriverProtectedRoute>
          }
        />
        <Route
          path="/driver/dashboard/wallet"
          element={
            <DriverProtectedRoute>
              <DriverWalletPage />
            </DriverProtectedRoute>
          }
        />


        <Route
          path="/:role/dashboard"
          element={<DashboardRoute />}
        />

        {/* Review Routes */}
        <Route path="/review/:tripId" element={<ProtectedRoute><ReviewSubmissionPage /></ProtectedRoute>} />

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

import { DialogProvider } from "./context/DialogContext";
import { ToastProvider } from "./context/ToastContext";

function InternalAppInitializer({ children }) {
  const { user, setUser } = useAuth();
  const [globalSuspended, setGlobalSuspended] = useState(false);

  useEffect(() => {
    // 1. Request FCM Token on app load and sync with backend
    requestForToken().then(token => {
      if (token && user) {
        // Sync token with server for top-bar native notifications
        api.post("/users/update-fcm-token", { fcmToken: token })
           .catch(() => {}); // Silent catch — if it fails, we'll try again next load
      }
    });

    // 2. Listen for foreground messages
    onMessageListener().then(payload => {
      // Handle foreground notification
    }).catch(err => {});

    // 3. GLOBAL INTERCEPTOR for 403 (Suspension)
    const interceptor = api.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 403) {
          setGlobalSuspended(true);
        }
        return Promise.reject(error);
      }
    );

    return () => api.interceptors.response.eject(interceptor);
  }, []);

  if (globalSuspended) {
    return <SuspendedUI isSuspended={true} />;
  }

  return children;
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <DialogProvider>
          <ToastProvider>
            <NotificationProvider>
              <InternalAppInitializer>
                <AppRoutes />
              </InternalAppInitializer>
            </NotificationProvider>
          </ToastProvider>
        </DialogProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;