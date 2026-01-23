import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { BulkDashboard } from "~/app/_components/bulk-dashboard";

export default async function BulkPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="relative mx-auto min-h-screen max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Accents */}
      <div className="pointer-events-none absolute -left-20 top-20 h-64 w-64 rounded-full bg-cyan-500/5 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-indigo-500/5 blur-3xl" />

      <div className="relative mb-12">
        <h1 className="text-4xl font-medium tracking-tight text-white">Bulk Processing</h1>
        <p className="mt-2 text-white/50">
          Upload a CSV file and generate handwritten versions for each row.
        </p>
      </div>
      
      <div className="relative">
        <BulkDashboard />
      </div>
    </div>
  );
}
