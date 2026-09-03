import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { submitSuggestion } from "../api/suggestions";
import { validateFiles } from "../utils/file-validation";

const categories = [
  { value: "PATIENT_CARE", label: "Patient Care" },
  { value: "STAFFING", label: "Staffing" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "WORKPLACE_SAFETY", label: "Workplace Safety" },
  { value: "STAFF_WELFARE", label: "Staff Welfare" },
  { value: "MANAGEMENT", label: "Management" },
  { value: "COMMUNICATION", label: "Communication" },
  { value: "OTHER", label: "Other" },
];

const priorities = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "Important" },
  { value: "URGENT", label: "Urgent" },
];

export default function SubmitSuggestion() {
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [referenceCode, setReferenceCode] = useState("");

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    const nextFiles = [...files, ...selectedFiles].slice(0, 5);

    const validationError = validateFiles(nextFiles);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setFiles(nextFiles);

    // Allows selecting the same file again after removing it.
    event.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    setError("");

    if (!category) {
      setError("Please select a category.");
      return;
    }

    if (message.trim().length < 10) {
      setError("Please provide a little more detail about your suggestion.");
      return;
    }

    const fileError = validateFiles(files);

    if (fileError) {
      setError(fileError);
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await submitSuggestion({
        category,
        priority,
        message: message.trim(),
        files,
      });

      setReferenceCode(response.data.referenceCode);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      const messageText =
        e?.response?.data?.error?.message ??
        "We could not submit your suggestion. Please try again.";

      setError(messageText);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (referenceCode) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto flex min-h-[80vh] w-full max-w-lg items-center">
          <section className="w-full rounded-2xl bg-white p-6 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-2xl">
              ✓
            </div>

            <h1 className="mt-5 text-2xl font-bold text-slate-900">
              Suggestion submitted
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Thank you for sharing your suggestion. Your submission has been
              received anonymously.
            </p>

            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Your reference number
              </p>

              <p className="mt-2 text-2xl font-bold tracking-wider text-slate-900">
                {referenceCode}
              </p>
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              Save this reference number. You can use it later to check the
              status of your suggestion.
            </p>

            <button
              type="button"
              onClick={() => {
                setReferenceCode("");
                setCategory("");
                setPriority("NORMAL");
                setMessage("");
                setFiles([]);
                setError("");
              }}
              className="mt-6 w-full rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
            >
              Submit another suggestion
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto w-full max-w-lg">
        <header className="mb-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-xl text-white">
            💬
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Anonymous Suggestion Box
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Tell us what is happening, what could be improved, or what needs
            attention.
          </p>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">
              Your identity is not required.
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Please do not include patient names, patient numbers, phone
              numbers, or other identifying information in your suggestion.
            </p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <label
              htmlFor="category"
              className="mb-2 block text-sm font-semibold text-slate-900"
            >
              What is your suggestion about?
            </label>

            <select
              id="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            >
              <option value="">Select a category</option>

              {categories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <label className="mb-3 block text-sm font-semibold text-slate-900">
              How important is this?
            </label>

            <div className="grid grid-cols-2 gap-3">
              {priorities.map((item) => (
                <label
                  key={item.value}
                  className={`cursor-pointer rounded-xl border p-3 text-center text-sm font-medium transition ${
                    priority === item.value
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="priority"
                    value={item.value}
                    checked={priority === item.value}
                    onChange={(event) => setPriority(event.target.value)}
                    className="sr-only"
                  />

                  {item.label}
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <label
              htmlFor="message"
              className="mb-2 block text-sm font-semibold text-slate-900"
            >
              Your suggestion
            </label>

            <textarea
              id="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
              minLength={10}
              maxLength={5000}
              rows={7}
              placeholder="Describe what is happening and, if possible, what you think could improve it..."
              className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />

            <div className="mt-2 text-right text-xs text-slate-400">
              {message.length}/5000
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <label className="mb-2 block text-sm font-semibold text-slate-900">
              Supporting files{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>

            <p className="mb-4 text-xs leading-5 text-slate-500">
              You can attach up to 5 images or documents.
            </p>

            <label className="flex min-h-28 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 px-4 text-center transition hover:border-slate-500">
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Tap to attach a file
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  JPG, PNG, WebP, PDF or DOCX
                </p>
              </div>

              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.pdf,.docx"
                onChange={handleFiles}
                className="hidden"
              />
            </label>

            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-700">
                        {file.name}
                      </p>

                      <p className="text-xs text-slate-400">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="ml-3 shrink-0 px-2 py-1 text-sm font-medium text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-5 text-red-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-slate-900 px-5 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Submitting..." : "Submit anonymously"}
          </button>

          <p className="pb-6 text-center text-xs leading-5 text-slate-400">
            No name, email, phone number, staff ID, ward, or account is
            required.
          </p>
        </form>
      </div>
    </main>
  );
}
