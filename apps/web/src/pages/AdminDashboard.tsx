import { useEffect, useState } from "react";
import {
  addSuggestionNote,
  adminLogout,
  CATEGORY_LABELS,
  downloadAttachment,
  getAdminSuggestion,
  getAdminSuggestions,
  getDashboardSummary,
  PRIORITY_LABELS,
  STATUS_LABELS,
  SUGGESTION_CATEGORIES,
  SUGGESTION_PRIORITIES,
  SUGGESTION_STATUSES,
  type AdminSuggestionDetail,
  type AdminSuggestionListItem,
  type AdminSuggestionListParams,
  type DashboardSummary,
  type SuggestionCategory,
  type SuggestionPriority,
  type SuggestionStatus,
} from "../api/admin";

const ALLOWED_TRANSITIONS: Record<SuggestionStatus, SuggestionStatus[]> = {
  NEW: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["PENDING", "ACTIONED"],
  PENDING: ["UNDER_REVIEW", "ACTIONED"],
  ACTIONED: ["CLOSED"],
  CLOSED: [],
};

const STATUS_BADGE_STYLES: Record<SuggestionStatus, string> = {
  NEW: "bg-blue-100 text-blue-800",
  UNDER_REVIEW: "bg-amber-100 text-amber-800",
  PENDING: "bg-purple-100 text-purple-800",
  ACTIONED: "bg-emerald-100 text-emerald-800",
  CLOSED: "bg-slate-200 text-slate-700",
};

const PRIORITY_BADGE_STYLES: Record<SuggestionPriority, string> = {
  LOW: "bg-slate-100 text-slate-600",
  NORMAL: "bg-slate-100 text-slate-700",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function AdminDashboard({
  adminEmail,
  onLogout,
}: {
  adminEmail: string;
  onLogout: () => void;
}) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [items, setItems] = useState<AdminSuggestionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState<SuggestionStatus | "">("");
  const [categoryFilter, setCategoryFilter] = useState<SuggestionCategory | "">(
    "",
  );
  const [priorityFilter, setPriorityFilter] = useState<SuggestionPriority | "">(
    "",
  );
  const [search, setSearch] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminSuggestionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function refreshSummary() {
    try {
      const res = await getDashboardSummary();
      setSummary(res.data);
    } catch {
      /* ignore — handled in main load */
    }
  }

  async function loadList() {
    setLoading(true);
    setError("");
    try {
      const params: AdminSuggestionListParams = { page: 1, limit: 50 };
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (search.trim()) params.search = search.trim();

      const res = await getAdminSuggestions(params);
      setItems(res.data.items);
      setTotal(res.data.pagination.total);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(
        e?.response?.data?.error?.message ??
          "We couldn't load suggestions right now.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshSummary();
    void loadList();
  }, [statusFilter, categoryFilter, priorityFilter]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    getAdminSuggestion(selectedId)
      .then((res) => setDetail(res.data))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  async function handleLogout() {
    try {
      await adminLogout();
    } finally {
      onLogout();
    }
  }

  function clearFilters() {
    setStatusFilter("");
    setCategoryFilter("");
    setPriorityFilter("");
    setSearch("");
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Suggestion Box</h1>
            <p className="text-xs text-slate-500">Management Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs text-slate-500">Signed in as</p>
              <p className="text-sm font-semibold text-slate-900">
                {adminEmail}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {summary && (
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <SummaryCard label="Total" value={summary.total} accent="bg-slate-900" />
            <SummaryCard label="New" value={summary.new} accent="bg-blue-600" />
            <SummaryCard
              label="Under Review"
              value={summary.underReview}
              accent="bg-amber-500"
            />
            <SummaryCard
              label="Pending"
              value={summary.pending}
              accent="bg-purple-600"
            />
            <SummaryCard
              label="Actioned"
              value={summary.actioned}
              accent="bg-emerald-600"
            />
            <SummaryCard
              label="Closed"
              value={summary.closed}
              accent="bg-slate-500"
            />
          </section>
        )}

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void loadList();
              }}
              placeholder="Search reference or message"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as SuggestionStatus | "")
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            >
              <option value="">All statuses</option>
              {SUGGESTION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as SuggestionCategory | "")
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            >
              <option value="">All categories</option>
              {SUGGESTION_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter(e.target.value as SuggestionPriority | "")
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            >
              <option value="">All priorities</option>
              {SUGGESTION_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {total} {total === 1 ? "result" : "results"}
            </p>
            <div className="flex gap-2">
              {(statusFilter || categoryFilter || priorityFilter || search) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => void loadList()}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Apply
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Suggestions
          </h2>
          {loading ? (
            <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
              Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
              No suggestions match the current filters.
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    className="w-full rounded-2xl bg-white p-4 text-left shadow-sm transition hover:shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm font-bold text-slate-900">
                          {s.referenceCode}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(s.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE_STYLES[s.status]}`}
                      >
                        {STATUS_LABELS[s.status]}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                        {CATEGORY_LABELS[s.category]}
                      </span>
                      <span
                        className={`rounded-lg px-2 py-0.5 font-semibold ${PRIORITY_BADGE_STYLES[s.priority]}`}
                      >
                        {PRIORITY_LABELS[s.priority]}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                      <span>📎 {s._count.attachments} attachment(s)</span>
                      <span>💬 {s._count.notes} note(s)</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {selectedId && (
        <SuggestionDetail
          suggestionId={selectedId}
          detail={detail}
          loading={detailLoading}
          onClose={() => setSelectedId(null)}
          onChanged={async () => {
            await refreshSummary();
            await loadList();
            const res = await getAdminSuggestion(selectedId);
            setDetail(res.data);
          }}
        />
      )}
    </main>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className={`mb-2 h-1 w-8 rounded-full ${accent}`} />
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function SuggestionDetail({
  suggestionId,
  detail,
  loading,
  onClose,
  onChanged,
}: {
  suggestionId: string;
  detail: AdminSuggestionDetail | null;
  loading: boolean;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [noteText, setNoteText] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState("");

  async function handleStatusChange(nextStatus: SuggestionStatus) {
    if (!detail) return;
    setUpdatingStatus(true);
    setError("");
    try {
      await (
        await import("../api/admin")
      ).updateAdminSuggestion(detail.id, nextStatus);
      await onChanged();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(
        e?.response?.data?.error?.message ??
          "We couldn't update the status. Please try again.",
      );
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleAddNote() {
    if (!detail) return;
    const trimmed = noteText.trim();
    if (trimmed.length < 1) {
      setError("Note cannot be empty.");
      return;
    }
    setSubmittingNote(true);
    setError("");
    try {
      await addSuggestionNote(detail.id, trimmed);
      setNoteText("");
      await onChanged();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(
        e?.response?.data?.error?.message ??
          "We couldn't save the note. Please try again.",
      );
    } finally {
      setSubmittingNote(false);
    }
  }

  async function handleDownloadAttachment(attachmentId: string) {
    try {
      const blob = await downloadAttachment(suggestionId, attachmentId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const att = detail?.attachments.find((x) => x.id === attachmentId);
      a.download = att?.originalName ?? "attachment";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("We couldn't download that attachment.");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-slate-600"
          >
            ← Back
          </button>
          {detail && (
            <span className="font-mono text-sm font-bold text-slate-900">
              {detail.referenceCode}
            </span>
          )}
          <span className="w-12" />
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {loading || !detail ? (
            <p className="text-center text-sm text-slate-500">
              Loading details…
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                  {CATEGORY_LABELS[detail.category]}
                </span>
                <span
                  className={`rounded-lg px-2 py-0.5 font-semibold ${PRIORITY_BADGE_STYLES[detail.priority]}`}
                >
                  {PRIORITY_LABELS[detail.priority]}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 font-semibold ${STATUS_BADGE_STYLES[detail.status]}`}
                >
                  {STATUS_LABELS[detail.status]}
                </span>
                <span className="ml-auto text-slate-500">
                  {formatDate(detail.createdAt)}
                </span>
              </div>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Suggestion
                </h3>
                <p className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-800">
                  {detail.message}
                </p>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Attachments ({detail.attachments.length})
                </h3>
                {detail.attachments.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">
                    No attachments.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {detail.attachments.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-700">
                            {a.originalName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {a.mimeType} · {formatBytes(a.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDownloadAttachment(a.id)}
                          className="ml-3 shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                        >
                          Download
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Internal notes ({detail.notes.length})
                </h3>
                {detail.notes.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">No notes yet.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {detail.notes.map((n) => (
                      <li
                        key={n.id}
                        className="rounded-lg bg-slate-50 px-3 py-2"
                      >
                        <p className="whitespace-pre-wrap text-sm text-slate-800">
                          {n.note}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(n.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 space-y-2">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={3}
                    maxLength={5000}
                    placeholder="Add an internal note (visible to admins only)..."
                    className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  />
                  <button
                    type="button"
                    onClick={handleAddNote}
                    disabled={submittingNote || noteText.trim().length === 0}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submittingNote ? "Saving…" : "Add note"}
                  </button>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ALLOWED_TRANSITIONS[detail.status].length === 0 ? (
                    <p className="text-sm text-slate-500">
                      This suggestion is closed. No further transitions
                      available.
                    </p>
                  ) : (
                    ALLOWED_TRANSITIONS[detail.status].map((next) => (
                      <button
                        key={next}
                        type="button"
                        disabled={updatingStatus}
                        onClick={() => handleStatusChange(next)}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Move to {STATUS_LABELS[next]}
                      </button>
                    ))
                  )}
                </div>
              </section>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
