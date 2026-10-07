import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NoticeCard } from "@/components/dashboard/ui";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [usersRes, plansRes, offersRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("plans")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("offers")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
  ]);

  const cards = [
    { label: "Users", count: usersRes.count ?? 0, href: "/dashboard/admin/users" },
    { label: "Plans", count: plansRes.count ?? 0, href: "/dashboard/admin/plans" },
    { label: "Active offers", count: offersRes.count ?? 0, href: "/dashboard/admin/offers" },
  ];

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="app-card block">
            <p className="text-sm font-medium text-muted-foreground">
              {card.label}
            </p>
            <p className="mt-1 text-2xl font-bold text-navy">{card.count}</p>
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <NoticeCard>
          Payments are not enabled yet. Plans and prices managed here become
          the single source of truth — the payment gateway will sync from
          these values via API, so nothing needs to be entered in the
          payment dashboard manually.
        </NoticeCard>
      </div>

      {(usersRes.error || plansRes.error || offersRes.error) && (
        <div className="mt-4">
          <NoticeCard>
            Some counts could not be loaded — check that the plans/offers
            migration (supabase/admin_plans.sql) has been applied.
          </NoticeCard>
        </div>
      )}
    </div>
  );
}
