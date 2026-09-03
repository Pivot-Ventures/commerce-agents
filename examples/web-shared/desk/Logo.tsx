// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/** Official EquipAccess mark: orange C-gear, orange Equip, navy or white Access. */

const ORANGE = "#F15A24";

export function EquipAccessLogo({
  onDark = false,
  size = 42,
}: {
  onDark?: boolean;
  size?: number;
}) {
  const access = onDark ? "#ffffff" : "#0B1F3A";
  return (
    <span className="inline-flex items-center gap-1.5" aria-label="EquipAccess">
      <svg width={size} height={size} viewBox="0 0 72 72" aria-hidden>
        <g fill={ORANGE}>
          <path d="M49.8 12.6A30 30 0 1 0 36 66V54.4A18.4 18.4 0 1 1 52.2 19.8L49.8 12.6z" />
          <circle cx="36" cy="8.2" r="4.2" />
          <circle cx="19.4" cy="13.2" r="4.2" />
          <circle cx="9.4" cy="27.2" r="4.2" />
          <circle cx="9.4" cy="44.8" r="4.2" />
          <circle cx="19.4" cy="58.8" r="4.2" />
          <circle cx="36" cy="63.8" r="4.2" />
          <circle cx="52.6" cy="58.8" r="4.2" />
        </g>
      </svg>
      <span className="eq-display text-[30px] font-bold italic leading-none" style={{ letterSpacing: "-0.04em" }}>
        <span style={{ color: ORANGE }}>Equip</span>
        <span style={{ color: access }}>Access</span>
      </span>
    </span>
  );
}
