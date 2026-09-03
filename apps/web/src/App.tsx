import { useEffect, useState } from "react";

import SubmitSuggestion from "./pages/SubmitSuggestion";
import CheckSuggestion from "./pages/CheckSuggestion";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

import { getCurrentAdmin, type Admin } from "./api/admin";

type Page = "submit" | "check" | "admin-login" | "admin-dashboard";

function App() {
  const [page, setPage] = useState<Page>("submit");
  const [admin, setAdmin] = useState<Admin | null>(null);

  useEffect(() => {
    if (page !== "admin-dashboard") {
      return;
    }

    getCurrentAdmin()
      .then((response) => {
        setAdmin(response.data.admin);
      })
      .catch(() => {
        setAdmin(null);
        setPage("admin-login");
      });
  }, [page]);

  if (page === "check") {
    return <CheckSuggestion onBack={() => setPage("submit")} />;
  }

  if (page === "admin-login") {
    return (
      <AdminLogin
        onLogin={async () => {
          try {
            const response = await getCurrentAdmin();

            setAdmin(response.data.admin);
            setPage("admin-dashboard");
          } catch {
            setAdmin(null);
          }
        }}
      />
    );
  }

  if (page === "admin-dashboard") {
    if (!admin) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      );
    }

    return (
      <AdminDashboard
        adminEmail={admin.email}
        onLogout={() => {
          setAdmin(null);
          setPage("admin-login");
        }}
      />
    );
  }

  return <SubmitSuggestion onCheckStatus={() => setPage("check")} />;
}

export default App;
