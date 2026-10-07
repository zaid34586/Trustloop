import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchProfile } from "@/lib/admin";
import { PageHeader } from "@/components/dashboard/ui";
import AdminTabs from "@/components/admin/admin-tabs";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await fetchProfile(supabase, user.id);
  if (profile?.role !== "admin") redirect("/dashboard");

  return (
    <div>
      <PageHeader title="Admin" subtitle="Plans, offers and user management.">
        <Link href="/dashboard" className="btn btn-secondary btn-sm">
          Back to dashboard
        </Link>
      </PageHeader>
      <div className="mt-4">
        <AdminTabs />
        {children}
      </div>
    </div>
  );
}
