import React, { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import TemplatesPage from "./pages/TemplatesPage";
import DashboardPage from "./pages/DashboardPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import EditorPage from "./pages/EditorPage";
import SigningPage from "./pages/SigningPage";
import { CheckCircle2, X } from "lucide-react";

// Toast notification component
const Toast = ({ message, onClose }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex max-w-sm items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/95 px-4 py-3 text-sm text-emerald-900 shadow-xl backdrop-blur">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
      <div className="flex-1">
        <p className="font-medium tracking-tight">Success</p>
        <p className="text-sm text-emerald-800/90">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="rounded-full p-1 text-emerald-600 transition hover:bg-emerald-100"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

const AppContent = () => {
  const location = useLocation();
  const [toastMessage, setToastMessage] = React.useState(null);

  useEffect(() => {
    if (location.state?.message) {
      setToastMessage(location.state.message);
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/sign/:token" element={<SigningPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <AppContent />
      </div>
    </BrowserRouter>
  );
};

export default App;
