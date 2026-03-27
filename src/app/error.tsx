"use client";

import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-4 text-4xl font-light text-muted">!</div>
        <h2 className="text-lg font-semibold text-foreground">
          問題が発生しました
        </h2>
        <p className="mt-2 text-sm text-muted">{error.message}</p>
        <button
          onClick={() => unstable_retry()}
          className="mt-6 rounded bg-primary px-5 py-2 text-sm text-white hover:bg-primary-hover"
        >
          再試行
        </button>
      </div>
    </div>
  );
}
