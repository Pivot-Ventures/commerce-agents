// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { EquipAccessLogo } from "web-shared";
import { api } from "@/lib/api";

const BRAND = "#F15A24";
const NAVY = "#0B1F3A";

export default function StoreRegisterPage() {
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`${api.root}/api/store/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_name: storeName.trim(),
          email: email.trim(),
          password,
          location: location.trim(),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { note?: string; detail?: string };
      if (!response.ok) {
        setError(data.detail || "Could not submit the store account.");
      } else {
        setNote(data.note || "Your store account is waiting on admin approval.");
      }
    } catch {
      setError("Could not reach the EquipAccess API.");
    }
    setBusy(false);
  }

  return (
    <div className="grid min-h-dvh bg-[#f7f4ee] lg:grid-cols-2">
      <aside className="hidden flex-col px-10 py-8 text-white lg:flex" style={{ background: NAVY }}>
        <EquipAccessLogo onDark />
        <div className="my-auto max-w-md">
          <h1 className="eq-display text-[52px] font-bold leading-[0.95] text-white">Open a yard.</h1>
          <p className="mt-4 text-[18px] text-white/85">Admin reviews new store accounts before they can list machines.</p>
        </div>
        <p className="text-[13px] text-white/80">EquipAccess Seller</p>
      </aside>
      <section className="flex flex-col items-center justify-center px-6 py-12">
        <form onSubmit={(event) => void submit(event)} className="w-full max-w-[420px]">
          <span className="inline-flex rounded-full border px-3 py-1 text-[12px] font-semibold" style={{ borderColor: BRAND, color: BRAND }}>
            Store
          </span>
          <h1 className="eq-display mt-4 text-[36px] font-bold" style={{ color: NAVY }}>
            Create a store account
          </h1>
          <p className="mt-2 text-[14px] text-[#5c6b7a]">Approval stays with EquipAccess admin. Nothing is published until then.</p>
          <Field id="store-name" label="Store name" value={storeName} onChange={setStoreName} />
          <Field id="store-email" label="Email" type="email" value={email} onChange={setEmail} />
          <Field id="store-password" label="Password" type="password" value={password} onChange={setPassword} />
          <Field id="store-location" label="Yard location" value={location} onChange={setLocation} />
          {error ? <p className="mt-3 text-[13px] text-[#b3402a]">{error}</p> : null}
          {note ? <p className="mt-3 text-[13px] text-[#1f7a4a]">{note}</p> : null}
          <button
            type="submit"
            disabled={busy || Boolean(note)}
            className="mt-5 h-12 w-full rounded-lg text-[16px] font-bold text-white disabled:opacity-70"
            style={{ background: BRAND }}
          >
            {busy ? "Submitting…" : "Request store account"}
          </button>
          <p className="mt-4 text-center text-[14px]">
            <Link href="/login" className="font-semibold" style={{ color: BRAND }}>
              Back to sign in
            </Link>
          </p>
        </form>
      </section>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <>
      <label className="mt-4 block text-[13px] font-semibold" style={{ color: NAVY }} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        className="mt-1.5 h-12 w-full rounded-lg border border-[#d5dce4] bg-white px-3 text-[15px] outline-none focus:border-[#F15A24]"
      />
    </>
  );
}
