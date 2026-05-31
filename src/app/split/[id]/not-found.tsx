import Link from "next/link";

export default function SplitNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <h1 className="text-2xl font-semibold mb-2">Bill not found</h1>
      <p className="text-neutral-500 mb-6 text-center">
        It may have been deleted, or you don&rsquo;t have access to it.
      </p>
      <Link
        href="/dashboard"
        className="bg-black text-white rounded-full px-6 py-2 text-sm font-medium"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
