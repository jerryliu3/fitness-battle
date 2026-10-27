import Link from "next/link";
import { Children, Fragment, useId, type ReactNode, type ReactElement, type CSSProperties, createElement, type HTMLAttributes } from "react";
import { SHELL_TYPOGRAPHY, type TypographyRole } from "@fitness-battle/shared";
import "./section.css";

/** Publish the shared contract for legacy semantic CSS classes and portal surfaces. */
export function typographyVariables(): CSSProperties {
  return Object.fromEntries(Object.entries(SHELL_TYPOGRAPHY).flatMap(([role, token]) => [
    [`--type-${role}`, `${token.weight} ${token.size / 16}rem/${token.lineHeight / 16}rem var(--font-body), "Manrope", sans-serif`],
    [`--type-${role}-size`, `${token.size / 16}rem`],
    [`--type-${role}-leading`, `${token.lineHeight / 16}rem`],
    [`--type-${role}-weight`, token.weight],
    [`--type-${role}-tracking`, `${token.tracking}em`],
  ])) as CSSProperties;
}
export function typographyStyle(role: TypographyRole): CSSProperties {
  const token = SHELL_TYPOGRAPHY[role];
  return { fontFamily: 'var(--font-body), "Manrope", sans-serif', fontSize: `${token.size / 16}rem`, lineHeight: `${token.lineHeight / 16}rem`, fontWeight: token.weight, letterSpacing: `${token.tracking}em`, textTransform: "none", fontStyle: "normal" };
}
export function AppHeading({ role = "heading", level = 2, style, ...props }: Omit<HTMLAttributes<HTMLHeadingElement>, "role"> & { role?: TypographyRole; level?: 1 | 2 | 3 | 4 | 5 | 6 }): ReactElement {
  return createElement(`h${level}`, { ...props, style: { ...style, ...typographyStyle(role) } });
}
export function AppText({ role = "body", secondary = false, as = "span", style, className = "", ...props }: Omit<HTMLAttributes<HTMLElement>, "role"> & { role?: TypographyRole; secondary?: boolean; as?: "span" | "small" }): ReactElement {
  return createElement(as, { ...props, style: { ...style, ...typographyStyle(role) }, className: `ui-text${secondary ? " ui-text-secondary" : ""} ${className}` });
}
export function AppParagraph({ typographyRole = "body", style, ...props }: HTMLAttributes<HTMLParagraphElement> & { typographyRole?: TypographyRole }) {
  return <p {...props} style={{ ...style, ...typographyStyle(typographyRole) }}/>;
}
export function TextAction({ href, label, accessibilityLabel }: { href: string; label: string; accessibilityLabel: string }) {
  return <Link className="ui-text-action" style={typographyStyle("label")} href={href} aria-label={accessibilityLabel}>{label}</Link>;
}
export function SectionHeader({ title, titleRole = "heading", subtitle, action, id }: { title: ReactNode; titleRole?: "display" | "heading"; subtitle?: string; action?: ReactNode; id?: string }) {
  return <div className="ui-section-header"><div className="ui-section-heading"><AppHeading id={id} role={titleRole} level={titleRole === "display" ? 1 : 2}>{title}</AppHeading>{subtitle && <p style={typographyStyle("body")} className="ui-text-secondary">{subtitle}</p>}</div>{action}</div>;
}
export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return <header className="ui-section-heading"><AppHeading level={1} role="display">{title}</AppHeading>{subtitle && <p className="ui-text-secondary" style={typographyStyle("body")}>{subtitle}</p>}</header>;
}
export function Section({ title, titleRole, subtitle, action, children, className = "", ...props }: Omit<HTMLAttributes<HTMLElement>, "title"> & { title: string; titleRole?: "display" | "heading"; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  const id = useId();
  return <section {...props} className={`ui-section ${className}`} aria-labelledby={id}><SectionHeader id={id} title={title} titleRole={titleRole} subtitle={subtitle} action={action}/><div className="ui-section-content">{children}</div></section>;
}
export function SectionStack({ children, divided = true, className = "" }: { children: ReactNode; divided?: boolean; className?: string }) {
  if (!divided) return <div className={`ui-section-stack is-open ${className}`}>{children}</div>;
  return <div className={`ui-section-stack is-divided ${className}`}>{Children.toArray(children).map((child, index) => <Fragment key={(child as { key?: string }).key ?? index}>{index > 0 && <div className="ui-section-boundary" aria-hidden="true"/>}{child}</Fragment>)}</div>;
}
export function StatusBadge({ children, tone = "neutral", icon }: { children: ReactNode; tone?: "neutral" | "success"; icon?: ReactNode }) {
  return <span className={`ui-status-badge is-${tone}`} style={typographyStyle("label")}>{icon}{children}</span>;
}
export function Surface({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) { return <div {...props} className={`ui-surface ${className}`}/>; }
export function ListRow({ title, subtitle, leading, trailing }: { title: string; subtitle?: string; leading?: ReactNode; trailing?: ReactNode }) {
  return <div className="ui-list-row">{leading}<div><AppText role="row">{title}</AppText>{subtitle && <div><AppText role="support" secondary>{subtitle}</AppText></div>}</div>{trailing}</div>;
}

export function FeatureCard({ title, description, badge, href }: { title: string; description: string; badge?: string; href?: string }) {
  const content = <>{badge && <StatusBadge>{badge}</StatusBadge>}<AppHeading>{title}</AppHeading><AppParagraph className="ui-text-secondary">{description}</AppParagraph></>;
  return href ? <Link href={href} className="ui-feature-card">{content}</Link> : <section className="ui-feature-card">{content}</section>;
}
