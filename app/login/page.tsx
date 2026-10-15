'use client';

import { signIn } from "next-auth/react";
import { useState } from "react";
import { LogoFull } from "@/components/Logo";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleAzureLogin = async () => {
    setLoading(true);
    setError("");
    await signIn("microsoft-entra-id", { redirect: true, callbackUrl: "/" });
  };

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      setLoading(false);
    } else if (result?.ok) {
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen bg-ios-bg px-4 py-16 text-ios-label">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <LogoFull width={240} className="mx-auto mb-5" />
          <h1 className="sr-only">SO Rankly</h1>
          <p className="mt-1 text-[15px] text-ios-secondary">เข้าสู่ระบบเพื่อเริ่มใช้งาน</p>
        </div>

        {error && (
          <div className="mb-4 rounded-[14px] bg-ios-red/10 px-4 py-3 text-[15px] text-ios-red">
            {error}
          </div>
        )}

        {/* Azure AD Button */}
        <button
          onClick={handleAzureLogin}
          disabled={loading}
          className="flex h-[52px] w-full items-center justify-center gap-3 rounded-[14px] border border-[#8C8C8C]/40 bg-white text-[17px] font-semibold text-[#5E5E5E] shadow-sm transition active:scale-[0.98] active:opacity-80 disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#5E5E5E] border-t-transparent"></div>
              กำลังเข้าสู่ระบบ...
            </>
          ) : (
            <>
              <svg className="h-5 w-5" viewBox="0 0 21 21" aria-hidden="true">
                <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
              </svg>
              เข้าสู่ระบบด้วย Microsoft
            </>
          )}
        </button>

        <div className="my-6 flex items-center gap-3 text-[13px] text-ios-secondary">
          <div className="h-px flex-1 bg-ios-separator"></div>
          หรือใช้อีเมลและรหัสผ่าน
          <div className="h-px flex-1 bg-ios-separator"></div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleCredentialsLogin}>
          <div className="divide-y divide-ios-separator overflow-hidden rounded-[14px] bg-white">
            <input
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="อีเมล"
              disabled={loading}
              className="h-12 w-full bg-transparent px-4 text-[17px] outline-none placeholder:text-ios-tertiary"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="รหัสผ่าน"
              disabled={loading}
              className="h-12 w-full bg-transparent px-4 text-[17px] outline-none placeholder:text-ios-tertiary"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="mt-4 h-[52px] w-full rounded-[14px] bg-ios-blue text-[17px] font-semibold text-white transition active:scale-[0.98] active:opacity-80 disabled:bg-ios-blue/40"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </div>
  );
}
