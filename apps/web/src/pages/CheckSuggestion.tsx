import { useState } from "react";
import type { FormEvent } from "react";
import { getSuggestionStatus } from "../api/suggestions";

const statusLabels: Record<string, string> = {
  NEW: "New",
  UNDER_REVIEW: "Under Review",
  PENDING: "Pending",
  ACTIONED: "Actioned",
  CLOSED: "Closed",
};

const statusDescriptions: Record<string, string> = {
  NEW: "Your suggestion has been received and is waiting for review.",
  UNDER_REVIEW: "Your suggestion is currently being reviewed.",
  PENDING: "Action is pending on your suggestion.",
  ACTIONED: "Action has been taken regarding your suggestion.",
  CLOSED: "This suggestion has been closed.",
};

export default function CheckSuggestion({
  onBack,
}: {
  onBack: () => void;
}) {
  const [referenceCode, setReferenceCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLookup = async (event: FormEvent) => {
    event.preventDefault();

    setError("");
    setStatus(null);

    const normalizedCode = referenceCode.trim().toUpperCase();

    if (!/^SB-[A-Z0-9]{6}$/.test(normalizedCode)) {
      setError("Please enter a valid reference number, for example SB-B9FKMU.");
      return;
    }

    try {
      setLoading(true);

      const response = await getSuggestionStatus(normalizedCode);

      setReferenceCode(response.data.referenceCode);
      setStatus(response.data.status);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      if (e?.response?.status === 404) {
        setError(
          "We couldn't find a submission with that reference number.",
        );
      } else {
        setError(
          "We couldn't check your submission right now. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto w-full max-w-lg">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 text-sm font-medium text-slate-600"
        >
          ← Back to suggestion box
        </button>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Check my submission
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Enter the reference number you received after submitting your
            suggestion.
          </p>

          <form onSubmit={handleLookup} className="mt-6">
            <label
              htmlFor="referenceCode"
              className="mb-2 block text-sm font-semibold text-slate-900"
            >
              Reference number
            </label>

            <input
              id="referenceCode"
              type="text"
              value={referenceCode}
              onChange={(event) =>
                setReferenceCode(event.target.value.toUpperCase())
              }
              placeholder="SB-B9FKMU"
              maxLength={9}
              autoCapitalize="characters"
              autoComplete="off"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base uppercase tracking-wider outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-5 text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-5 w-full rounded-xl bg-slate-900 px-5 py-4 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Checking..." : "Check status"}
            </button>
          </form>
        </section>

        {status && (
          <section className="mt-5 rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Reference number
            </p>

            <p className="mt-1 text-lg font-bold tracking-wider text-slate-900">
              {referenceCode}
            </p>

            <div className="mt-6 border-t border-slate-100 pt-6">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Current status
              </p>

              <div className="mt-3 inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800">
                {statusLabels[status] ?? status}
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-600">
                {statusDescriptions[status] ??
                  "Your suggestion is being processed."}
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
