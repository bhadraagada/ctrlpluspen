import { redirect } from "next/navigation";

// Dashboard now redirects to synthesis page
export default function DashboardPage() {
  redirect("/synthesis");
}
