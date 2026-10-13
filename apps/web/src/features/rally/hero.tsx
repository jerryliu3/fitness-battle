import { Ace } from "./ace";

export function RallyHero({
  kicker,
  line1,
  line2,
  copy,
}: {
  kicker: string;
  line1: string;
  line2: string;
  copy: string;
}) {
  return (
    <section className="rf-hero">
      <div>
        <p className="rf-kicker">{kicker}</p>
        <h1>
          {line1}
          <br />
          <em>{line2}</em>
        </h1>
        <p>{copy}</p>
      </div>
      <div className="rf-hero-ace">
        <Ace decorative={false} />
        <span>ACE / IN YOUR CORNER</span>
      </div>
    </section>
  );
}
