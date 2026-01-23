import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { TemplateEditor } from "./template-editor";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TemplateEditorPage({ params }: Props) {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  const { id } = await params;

  return (
    <div className="relative mx-auto min-h-screen max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Accents */}
      <div className="pointer-events-none absolute -left-20 top-20 h-64 w-64 rounded-full bg-purple-500/5 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-pink-500/5 blur-3xl" />

      <div className="relative">
        <TemplateEditor templateId={id} />
      </div>
    </div>
  );
}
