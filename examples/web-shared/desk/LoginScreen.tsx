// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { type FormEvent, type ReactNode, useState } from "react";
import { EquipAccessLogo } from "./Logo";
import { loginDesk } from "./session";
import type { DeskRole } from "./session";

const BRAND = "#F15A24";
const NAVY = "#0B1F3A";

const COPY: Record<
  DeskRole,
  {
    eyebrow: string;
    headline: string;
    sub: string;
    panelLabel: string;
    title: string;
    hint: string;
    footer: string;
    forgot?: boolean;
    checkboxTone: "blue" | "orange";
  }
> = {
  admin: {
    eyebrow: "ADMIN",
    headline: "Run the marketplace.",
    sub: "Orders, sellers, agents, and payouts in one desk.",
    panelLabel: "EquipAccess Admin",
    title: "Sign in",
    hint: "Use your EquipAccess admin email.",
    footer: "Need access? Ask a super admin.",
    forgot: true,
    checkboxTone: "blue",
  },
  store: {
    eyebrow: "Store",
    headline: "Your store, live.",
    sub: "Inventory, orders, and payouts for sellers.",
    panelLabel: "EquipAccess Seller",
    title: "Sign in to your store",
    hint: "Sellers use the email on the store account.",
    footer: "ACME yard operators land here after approval.",
    checkboxTone: "orange",
  },
  agent: {
    eyebrow: "Agent",
    headline: "On the ground.",
    sub: "Track assigned orders and close deliveries.",
    panelLabel: "EquipAccess Agent",
    title: "Sign in to the agent desk",
    hint: "Field agents only — ask admin if you need an account.",
    footer: "Need an agent login? Contact your admin.",
    checkboxTone: "orange",
  },
};

export function LoginScreen({
  role,
  apiRoot,
  apiPrefix,
  onSignedIn,
  signup,
}: {
  role: DeskRole;
  apiRoot: string;
  apiPrefix: string;
  onSignedIn: (session: { sessionId: string; name?: string; persist: boolean }) => void;
  signup?: ReactNode;
}) {
  const copy = COPY[role];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [persist, setPersist] = useState(role !== "admin");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    const result = await loginDesk(apiRoot, apiPrefix, email.trim(), password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSignedIn({ sessionId: result.sessionId, name: result.name, persist });
  }

  const pill =
    role === "admin" ? (
      <span className="inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white" style={{ background: BRAND }}>
        ADMIN
      </span>
    ) : role === "store" ? (
      <span
        className="inline-flex rounded-full border px-3 py-1 text-[12px] font-semibold"
        style={{ borderColor: BRAND, color: BRAND }}
      >
        Store
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-black px-3 py-1 text-[12px] font-semibold text-white">
        <i aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: BRAND }} />
        Agent
      </span>
    );

  const form = (
    <form
      method="post"
      action="#"
      onSubmit={(event) => void submit(event)}
      className="flex w-full max-w-[420px] flex-col"
      autoComplete="on"
    >
      <div className={role === "store" ? "flex justify-center" : ""}>{pill}</div>
      <h1
        className="eq-display mt-4 text-[40px] font-bold leading-[1.05] tracking-tight"
        style={{ color: NAVY }}
      >
        {copy.title}
      </h1>
      <p className="mt-2 text-[14px] text-[#5c6b7a]">{copy.hint}</p>
      <label className="mt-6 text-[13px] font-semibold" style={{ color: NAVY }} htmlFor={`${role}-email`}>
        Email
      </label>
      <input
        id={`${role}-email`}
        name="email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        autoComplete="username"
        required
        className="mt-1.5 h-12 rounded-lg border border-[#d5dce4] bg-white px-3 text-[15px] outline-none focus:border-[#F15A24]"
      />
      <label className="mt-4 text-[13px] font-semibold" style={{ color: NAVY }} htmlFor={`${role}-password`}>
        Password
      </label>
      <div className="relative mt-1.5">
        <input
          id={`${role}-password`}
          name="password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          className="h-12 w-full rounded-lg border border-[#d5dce4] bg-white px-3 pr-11 text-[15px] outline-none focus:border-[#F15A24]"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-[#8d98a4]"
          aria-label={showPassword ? "Hide password" : "Show password"}
          onClick={() => setShowPassword((open) => !open)}
        >
          <EyeIcon off={showPassword} />
        </button>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-[13px]" style={{ color: NAVY }}>
          <input
            type="checkbox"
            checked={persist}
            onChange={(event) => setPersist(event.target.checked)}
            className="h-4 w-4 rounded"
            style={{ accentColor: copy.checkboxTone === "blue" ? "#2c6a86" : BRAND }}
          />
          Keep me logged in
        </label>
        {copy.forgot ? (
          <button
            type="button"
            className="text-[13px] font-semibold"
            style={{ color: BRAND }}
            onClick={() => setNotice("Ask a super admin to reset your password.")}
          >
            Forgot password?
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-3 text-[13px] text-[#b3402a]">{error}</p> : null}
      {notice ? <p className="mt-3 text-[13px] text-[#5c6b7a]">{notice}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="mt-5 h-12 w-full rounded-lg text-[16px] font-bold text-white disabled:opacity-70"
        style={{ background: BRAND }}
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
      {signup ? <div className="mt-4 text-center text-[14px] font-semibold" style={{ color: BRAND }}>{signup}</div> : null}
    </form>
  );

  return (
    <div className={`grid min-h-dvh ${role === "admin" ? "lg:grid-cols-[minmax(280px,40%)_1fr]" : "lg:grid-cols-2"}`}>
      <aside className="relative hidden overflow-hidden text-white lg:flex lg:flex-col" style={{ background: NAVY }}>
        {role === "store" ? <WarehouseBackdrop /> : null}
        {role === "agent" ? <MapBackdrop /> : null}
        {role === "admin" ? <AdminGear /> : null}
        <div className="relative z-10 flex flex-1 flex-col px-10 py-8">
          <EquipAccessLogo onDark />
          <div className="my-auto max-w-md">
            <h2 className="eq-display text-[56px] font-bold leading-[0.95] tracking-tight text-white">{copy.headline}</h2>
            <p className="mt-4 text-[18px] font-normal text-white/85">{copy.sub}</p>
          </div>
          <p className="relative z-10 flex items-center gap-2 text-[13px] text-white/80">
            {role === "store" ? <StoreGlyph /> : role === "agent" ? <span className="h-2 w-2 rounded-full" style={{ background: BRAND }} /> : null}
            {copy.panelLabel}
          </p>
        </div>
      </aside>
      <section className="flex flex-col bg-[#f7f4ee] px-6 py-10">
        <div className="mb-8 lg:hidden">
          <EquipAccessLogo />
        </div>
        <div className={`flex flex-1 flex-col ${role === "admin" ? "items-center justify-center" : "items-center justify-center"}`}>
          {role === "admin" ? (
            <div className="w-full max-w-[440px] rounded-2xl bg-white px-8 py-9 shadow-[0_12px_40px_-12px_rgba(11,31,58,0.18)]">{form}</div>
          ) : (
            form
          )}
        </div>
        <p className="mt-8 text-center text-[13px] text-[#8d98a4]">{copy.footer}</p>
      </section>
    </div>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" />
      {off ? <path d="M4 20 20 4" strokeLinecap="round" /> : null}
    </svg>
  );
}

function StoreGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke={BRAND} strokeWidth="1.8" aria-hidden>
      <path d="M4 9 6 4h12l2 5v11H4z" strokeLinejoin="round" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function AdminGear() {
  return (
    <svg className="pointer-events-none absolute -bottom-16 -left-16 h-[340px] w-[340px] opacity-40" viewBox="0 0 200 200" aria-hidden>
      <path
        fill={BRAND}
        d="M128 18c-8-5-17-8-27-8-26 0-48 22-48 48 0 9 2 18 7 25l-18 8 8 18-16 14 12 16-20 4 4 20 20-2 4 18 18-10 12 16 16-14 16 10 10-18 20 4 2-20-16-8 6-18-16-12 4-20-20 2c3-8 4-16 4-23 0-10-3-19-8-26z"
      />
    </svg>
  );
}

function WarehouseBackdrop() {
  return (
    <div className="absolute inset-0" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(11,31,58,0.35), rgba(11,31,58,0.78)), repeating-linear-gradient(90deg, #243044 0 28px, #1b2738 28px 56px)",
        }}
      />
      <div className="absolute inset-x-8 bottom-24 top-28 opacity-50">
        {Array.from({ length: 5 }, (_, column) => (
          <div key={column} className="absolute top-0 bottom-0 w-[14%]" style={{ left: `${column * 18}%` }}>
            {Array.from({ length: 6 }, (_, row) => (
              <div
                key={row}
                className="absolute w-full rounded-sm"
                style={{
                  height: "12%",
                  top: `${row * 16}%`,
                  background: row % 2 ? "#3a2a20" : "#2a3344",
                  boxShadow: "inset 0 0 0 1px rgba(241,90,36,0.12)",
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function MapBackdrop() {
  return (
    <div className="absolute inset-0" aria-hidden>
      <svg className="h-full w-full opacity-30" viewBox="0 0 400 600" preserveAspectRatio="none">
        {Array.from({ length: 12 }, (_, index) => (
          <line key={`v${index}`} x1={index * 36} y1="0" x2={index * 36} y2="600" stroke="#4a6a8a" strokeWidth="1" />
        ))}
        {Array.from({ length: 16 }, (_, index) => (
          <line key={`h${index}`} x1="0" y1={index * 40} x2="400" y2={index * 40} stroke="#4a6a8a" strokeWidth="1" />
        ))}
      </svg>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 600" fill="none" aria-hidden>
        <path
          d="M40 420 C120 380, 160 480, 240 440 S340 360, 380 400"
          stroke={BRAND}
          strokeWidth="3"
          strokeDasharray="10 8"
        />
        <circle cx="40" cy="420" r="7" fill={BRAND} />
        <circle cx="240" cy="440" r="7" fill={BRAND} />
        <circle cx="380" cy="400" r="7" fill={BRAND} />
      </svg>
    </div>
  );
}
