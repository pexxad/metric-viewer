export default function Loading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
          <span
            className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary"
            style={{ animationDelay: "300ms" }}
          />
        </div>
        <p className="text-xs text-muted">読み込み中...</p>
      </div>
    </div>
  );
}
