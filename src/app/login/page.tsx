import LoginForm from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Sign in to Wishlist</h1>
        <p className="mt-1 text-sm text-gray-500">Frictionless, no password required.</p>
      </div>
      <LoginForm next={next && next.startsWith("/") ? next : "/dashboard"} />
    </main>
  );
}
