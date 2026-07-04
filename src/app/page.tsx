import { redirect } from "next/navigation";
import { StorefrontHome } from "@/components/Home/StorefrontHome";
import { isAdminSite } from "@/lib/site-mode";

export default function HomePage() {
  if (isAdminSite()) {
    redirect("/admin-portal");
  }

  return <StorefrontHome />;
}
