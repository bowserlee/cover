"use client";

import { createBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const handleGoogleSignIn = async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-4xl font-semibold mb-2">Cover</h1>
        <p className="text-neutral-500 mb-12">Split the bill in 30 seconds.</p>
        <button
          onClick={handleGoogleSignIn}
          className="w-full bg-black text-white rounded-full py-3 font-medium hover:bg-neutral-800 transition"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
