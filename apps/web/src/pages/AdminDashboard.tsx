import { adminLogout } from "../api/admin";

export default function AdminDashboard({
  adminEmail,
  onLogout,
}: {
  adminEmail: string;
  onLogout: () => void;
}) {
  const handleLogout = async () => {
    try {
      await adminLogout();
    } finally {
      onLogout();
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Suggestion Box
            </h1>

            <p className="text-xs text-slate-500">Management Dashboard</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Signed in as</p>

          <p className="mt-1 font-semibold text-slate-900">{adminEmail}</p>

          <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-center">
            <p className="font-semibold text-slate-700">Dashboard coming next</p>

            <p className="mt-2 text-sm text-slate-500">
              Suggestion statistics and management tools will appear here.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
