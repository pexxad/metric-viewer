import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-2 text-6xl font-extralight text-muted">404</div>
        <h2 className="text-lg font-semibold text-foreground">
          ページが見つかりません
        </h2>
        <p className="mt-2 text-sm text-muted">
          お探しのページは存在しないか、移動した可能性があります。
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded bg-primary px-5 py-2 text-sm text-white hover:bg-primary-hover"
        >
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}
