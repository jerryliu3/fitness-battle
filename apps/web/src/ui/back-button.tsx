"use client";
import Link from "next/link";
import { APP_ICON_PATHS } from "@fitness-battle/shared";
import "./back-button.css";

export function BackButton({ href, onClick, disabled = false }: { href?: string; onClick?: () => void; disabled?: boolean }) {
  const icon = <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={APP_ICON_PATHS.back} /></svg>;
  return href ? <Link className="ui-back-button" href={href} aria-label="Back">{icon}</Link>
    : <button className="ui-back-button" type="button" aria-label="Back" disabled={disabled} onClick={onClick}>{icon}</button>;
}
