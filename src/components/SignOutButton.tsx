export function SignOutButton() {
  return (
    <form action="/api/auth/signout" method="post">
      <button
        type="submit"
        className="text-sm text-neutral-500 hover:text-black transition"
      >
        Sign out
      </button>
    </form>
  );
}
