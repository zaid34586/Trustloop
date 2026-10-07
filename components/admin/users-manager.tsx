"use client";

import { useCallback, useEffect, useState } from "react";
import { PLAN_KEYS, type PlanKey } from "@/lib/plans";
import { Badge, ErrorCard } from "@/components/dashboard/ui";

// ============================================================
// Admin → Users: list accounts and assign a plan per user.
// ============================================================

type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  company_name: string | null;
  role: string | null;
  plan: string;
  created_at: string | null;
};

export default function UsersManager() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/users");
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setUsers([]);
      setError(data?.error ?? "Could not load users.");
      return;
    }
    setUsers((data?.users ?? []) as UserRow[]);
    setError(null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handlePlanChange = async (userId: string, plan: string) => {
    setSavingId(userId);
    const previous = users;
    setUsers(
      (users ?? []).map((user) =>
        user.id === userId ? { ...user, plan } : user
      )
    );
    const response = await fetch("/api/admin/users/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, plan }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setUsers(previous ?? []);
      setError(data?.error ?? "Could not update the plan.");
    } else {
      setError(null);
    }
    setSavingId(null);
  };

  if (users === null) {
    return <div className="app-card">Loading users…</div>;
  }

  return (
    <div className="space-y-4">
      {error && <ErrorCard>{error}</ErrorCard>}

      <div className="app-card app-table-scroll p-0">
        <table className="app-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Company</th>
              <th>Role</th>
              <th>Plan</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted-foreground">
                  No users found.
                </td>
              </tr>
            )}
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <span className="font-medium text-navy">
                    {user.full_name || "—"}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </td>
                <td>{user.company_name || "—"}</td>
                <td>
                  <Badge tone={user.role === "admin" ? "primary" : "gray"}>
                    {user.role || "user"}
                  </Badge>
                </td>
                <td>
                  <select
                    className="app-select"
                    value={PLAN_KEYS.includes(user.plan as PlanKey) ? user.plan : "trial"}
                    disabled={savingId === user.id}
                    onChange={(e) => handlePlanChange(user.id, e.target.value)}
                  >
                    {PLAN_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  {user.created_at
                    ? new Date(user.created_at).toLocaleDateString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Showing up to 500 users. Plan changes take effect immediately.
      </p>
    </div>
  );
}
