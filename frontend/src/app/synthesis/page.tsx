import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { SynthesisDashboard } from "~/app/_components/synthesis-dashboard";

export default async function SynthesisPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Handwriting Synthesis</h1>
        <p className="mt-1 text-gray-400">
          Welcome back, {session.user.name ?? "User"}! Type your text and transform it into beautiful handwriting.
        </p>
      </div>
      <SynthesisDashboard />
    </div>
  );
}
