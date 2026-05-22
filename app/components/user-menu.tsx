'use client';

import { signOut, useSession } from "next-auth/react";
import { LogOut } from "lucide-react";

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>;
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 bg-gray-100 px-4 py-2 rounded-lg">
      <div className="text-right">
        <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
        <p className="text-xs text-gray-600">{session.user.email}</p>
      </div>
      <button
        onClick={() => signOut({ redirect: true, callbackUrl: "/login" })}
        className="ml-2 p-2 hover:bg-gray-200 rounded transition-colors"
        title="ออกจากระบบ"
      >
        <LogOut className="w-4 h-4 text-red-600" />
      </button>
    </div>
  );
}
