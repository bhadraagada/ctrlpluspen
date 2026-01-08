import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { GalleryDashboard } from "~/app/_components/gallery-dashboard";

export default async function GalleryPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Gallery</h1>
        <p className="mt-1 text-gray-400">
          View and manage your saved handwriting generations.
        </p>
      </div>
      <GalleryDashboard />
    </div>
  );
}
