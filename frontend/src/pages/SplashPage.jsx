import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Loader from "../components/ui/Loader";

/**
 * SplashPage — shown once per session on app open.
 * Uses the same branded <Loader fullPage> as every other loading state
 * so the experience is visually consistent throughout the app.
 */
const SplashPage = () => {
  const navigate = useNavigate();
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // If manually navigated to /splash (demo/dev), never auto-redirect
    if (window.location.pathname === "/splash") return;

    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => navigate("/home", { replace: true }), 400);
    }, 2800);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      className="fixed inset-0 z-[9999] transition-opacity duration-400"
      style={{ opacity: exiting ? 0 : 1 }}
    >
      <Loader fullPage text="Your Urban Journey Starts Here" />
    </div>
  );
};

export default SplashPage;
