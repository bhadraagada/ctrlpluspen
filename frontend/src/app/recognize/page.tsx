import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { OcrDashboard } from "~/app/_components/ocr-dashboard";

export default async function RecognizePage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <OcrDashboard />
    </div>
  );
}
