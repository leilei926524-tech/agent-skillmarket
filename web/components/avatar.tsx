"use client";

import { useState } from "react";
import { avatarUrl } from "@/lib/demo";

/* real-photo headshot with an initials fallback (offline-safe) */
export function Avatar({
  id,
  name,
  size = 40,
}: {
  id: string;
  name: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  const hue = [...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

  return (
    <span
      className="inline-grid place-items-center shrink-0 overflow-hidden rounded-lg border-[1.5px] border-foreground bg-white"
      style={{ width: size, height: size, boxShadow: "2px 3px 0 rgba(14,14,40,.75)" }}
      aria-hidden
    >
      {failed ? (
        <span
          className="w-full h-full grid place-items-center font-extrabold"
          style={{
            fontSize: size * 0.36,
            background: `hsl(${hue} 70% 85%)`,
            color: `hsl(${hue} 60% 25%)`,
          }}
        >
          {initials}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl(id)}
          alt=""
          width={size}
          height={size}
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
