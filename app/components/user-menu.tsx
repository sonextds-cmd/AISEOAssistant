'use client';

import { signOut, useSession } from "next-auth/react";

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-8 w-8 rounded-full bg-ios-fill animate-pulse"></div>;
  }

  if (!session?.user) {
    return null;
  }

  const name = session.user.name || session.user.email || "";
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-[13px] font-medium leading-tight text-ios-label">{session.user.name}</p>
        <p className="text-[11px] leading-tight text-ios-secondary">{session.user.email}</p>
      </div>
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-[#A8A8AD] to-[#8E8E93] text-[14px] font-semibold text-white" title={name}>
        {initial}
      </div>
      <button
        onClick={() => signOut({ redirect: true, callbackUrl: "/login" })}
        className="text-[15px] text-ios-red transition active:opacity-50"
      >
        ออกจากระบบ
      </button>
    </div>
  );
}
