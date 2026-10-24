import Link from "next/link";
import { Children, Fragment, useId, type ReactNode, type CSSProperties, type HTMLAttributes } from "react";
import { SHELL_TYPOGRAPHY, type TypographyRole } from "@fitness-battle/shared";
import "./section.css";

export function typographyStyle(role: TypographyRole): CSSProperties {
  const token = SHELL_TYPOGRAPHY[role];
  return { fontFamily: 'var(--font-body), "DM Sans", sans-serif', fontSize: `${token.size / 16}rem`, lineHeight: `${token.lineHeight / 16}rem`, fontWeight: token.weight, letterSpacing: "normal" };
}
export function AppText({ role = "body", secondary = false, children }: { role?: TypographyRole; secondary?: boolean; children: ReactNode }) {
  return <span style={typographyStyle(role)} className={secondary ? "ui-text ui-text-secondary" : "ui-text"}>{children}</span>;
}
export function TextAction({ href, label, accessibilityLabel }: { href: string; label: string; accessibilityLabel: string }) {
  return <Link className="ui-text-action" style={typographyStyle("actionLabel")} href={href} aria-label={accessibilityLabel}>{label}</Link>;
}
export function SectionHeader({ title, subtitle, action, id }: { title: string; subtitle?: string; action?: ReactNode; id?: string }) {
  return <div className="ui-section-header"><div className="ui-section-heading"><h2 id={id} style={typographyStyle("sectionTitle")}>{title}</h2>{subtitle && <p style={typographyStyle("body")} className="ui-text-secondary">{subtitle}</p>}</div>{action}</div>;
}
export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return <header className="ui-section-heading"><h1 style={typographyStyle("pageTitle")}>{title}</h1>{subtitle && <p className="ui-text-secondary" style={typographyStyle("body")}>{subtitle}</p>}</header>;
}
export function Section({ title, subtitle, action, children, className = "" }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  const id = useId();
  return <section className={`ui-section ${className}`} aria-labelledby={id}><SectionHeader id={id} title={title} subtitle={subtitle} action={action}/><div className="ui-section-content">{children}</div></section>;
}
export function SectionStack({ children, divided = true }: { children: ReactNode; divided?: boolean }) {
  return <div className={`ui-section-stack${divided ? " is-divided" : ""}`}>{Children.toArray(children).map((child, index) => <Fragment key={(child as { key?: string }).key ?? index}>{index > 0 && <div className="ui-section-boundary" aria-hidden="true"/>}{child}</Fragment>)}</div>;
}
export function StatusBadge({ children, tone = "neutral", icon }: { children: ReactNode; tone?: "neutral" | "success"; icon?: ReactNode }) {
  return <span className={`ui-status-badge is-${tone}`} style={typographyStyle("badgeLabel")}>{icon}{children}</span>;
}
export function Surface({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) { return <div {...props} className={`ui-surface ${className}`}/>; }
export function ListRow({ title, subtitle, leading, trailing }: { title: string; subtitle?: string; leading?: ReactNode; trailing?: ReactNode }) {
  return <div className="ui-list-row">{leading}<div><AppText role="itemTitle">{title}</AppText>{subtitle && <div><AppText role="supporting" secondary>{subtitle}</AppText></div>}</div>{trailing}</div>;
}
