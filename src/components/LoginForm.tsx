"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function sendCode() {
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not send code");
      setStep("code");
      setInfo(`We sent a 6-digit code to ${email}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    await sendCode();
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Verification failed");
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "email") {
    return (
      <form onSubmit={handleEmailSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="rounded-md border border-gray-300 px-3 py-2 text-base outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-gray-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
        >
          {submitting ? "Sending..." : "Send code"}
        </button>
        <p className="text-xs text-gray-500">
          No password needed — we&apos;ll email you a 6-digit code to sign in.
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={handleCodeSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="code" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          6-digit code
        </label>
        <input
          id="code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="123456"
          className="rounded-md border border-gray-300 px-3 py-2 text-base tracking-widest outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-gray-900"
        />
      </div>
      {info && <p className="text-sm text-gray-500">{info}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting || code.length !== 6}
        className="rounded-md bg-gray-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
      >
        {submitting ? "Verifying..." : "Verify"}
      </button>
      <div className="flex justify-between text-xs text-gray-500">
        <button
          type="button"
          onClick={() => {
            setStep("email");
            setCode("");
            setError(null);
            setInfo(null);
          }}
          className="hover:underline"
        >
          Use a different email
        </button>
        <button type="button" onClick={sendCode} disabled={submitting} className="hover:underline">
          Resend code
        </button>
      </div>
    </form>
  );
}
