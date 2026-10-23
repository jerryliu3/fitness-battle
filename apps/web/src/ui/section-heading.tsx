export function SectionHeading({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="fb-section-heading">
      <div className="fb-section-heading-text">
        <h2 className="fb-section-title">{title}</h2>
        {detail ? <p className="fb-section-detail">{detail}</p> : null}
      </div>
      {action ? <div className="fb-section-heading-action">{action}</div> : null}
    </div>
  );
}
