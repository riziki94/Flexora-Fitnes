import { useState } from "react";
import type { Profile } from "~/lib/db-admin";
import { updateUserTier } from "~/lib/db-admin";

const TIERS = ["none", "kitoslight", "zongosol", "dashboard"];
const TIER_COLORS: Record<string, string> = {
  dashboard: "bg-emerald-100 text-emerald-700",
  kitoslight: "bg-blue-100 text-blue-700",
  zongosol: "bg-purple-100 text-purple-700",
  none: "bg-gray-100 text-gray-600",
};

export function UsersPanel({ users, onRefresh }: { users: Profile[]; onRefresh: () => void }) {
  const [changingId, setChangingId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const handleChangeTier = async (userId: string, newTier: string) => {
    setChangingId(userId);
    setMsg("");
    const result = await updateUserTier({ userId, tier: newTier });
    if (result.ok) {
      setMsg(`Tier updated to ${newTier}`);
      onRefresh();
    } else {
      setMsg(result.error || "Update failed");
    }
    setChangingId(null);
  };

  return (
    <div className="space-y-4">
      {msg && <div className={`rounded-lg px-4 py-2 text-sm ${msg.includes("failed") ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>{msg}</div>}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Subscription</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No users registered</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {u.full_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${TIER_COLORS[u.subscription_tier] || TIER_COLORS.none}`}>
                        {u.subscription_tier === "none" ? "Free" : u.subscription_tier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.subscription_tier || "none"}
                        onChange={(e) => handleChangeTier(u.id, e.target.value)}
                        disabled={changingId === u.id}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs disabled:opacity-50"
                      >
                        {TIERS.map((t) => (
                          <option key={t} value={t} className="capitalize">
                            {t === "none" ? "Free" : t}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
