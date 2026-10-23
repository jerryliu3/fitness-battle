"use client";

export function ChartFrame({
  ready = true,
  label = "Chart loading",
  children,
}: {
  ready?: boolean;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={ready ? "fb-chart-frame" : "fb-chart-frame fb-chart-frame--loading"}
      aria-busy={!ready}
      aria-label={ready ? undefined : label}
    >
      {ready ? children : <div className="fb-chart-frame-placeholder" aria-hidden="true" />}
    </div>
  );
}
