"use client";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <main className="min-h-screen bg-[#090908] px-5 pt-20 text-zinc-100">
      <section className="mx-auto max-w-[53rem] space-y-4">
        <p className="text-sm uppercase tracking-[0.18em] text-rose-300">Lorecraft failed to load</p>
        <p className="text-sm leading-6 text-zinc-300">{error.message}</p>
        <button
          type="button"
          onClick={unstable_retry}
          className="rounded-md bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-700"
        >
          Retry
        </button>
      </section>
    </main>
  );
}
