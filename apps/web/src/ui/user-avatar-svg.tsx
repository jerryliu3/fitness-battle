"use client";
import { useId, useState } from "react";
import { initialsFromName, SHELL_COLORS as c } from "@fitness-battle/shared";
import { typographyStyle } from "./section";
/** SVG identity for standings; retains a useful fallback if the image fails. */
export function UserAvatarSvg({ src, name, x, y, size = 34 }: { src?: string | null; name: string; x: number; y: number; size?: number }) {
  const id = useId().replace(/:/g, ""), [failed, setFailed] = useState<string | null>(null);
  return <g aria-hidden="true">
    <defs><clipPath id={id}><circle cx={x+size/2} cy={y+size/2} r={size/2}/></clipPath></defs>
    <circle cx={x+size/2} cy={y+size/2} r={size/2} fill={c.soft}/>
    {src && src !== failed ? <image href={src} x={x} y={y} width={size} height={size} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id})`} onError={() => setFailed(src)} />
      : <text x={x+size/2} y={y+size/2+4} textAnchor="middle" style={typographyStyle("caption")} fill={c.ink}>{initialsFromName(name)}</text>}
  </g>;
}
