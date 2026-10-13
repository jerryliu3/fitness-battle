import Image from "next/image";
import type { ConceptId } from "./model";

export function Mascot({
  concept,
  className = "",
  decorative = true,
}: {
  concept: ConceptId;
  className?: string;
  decorative?: boolean;
}) {
  const names = {
    flip: "Zip, an energetic swift",
    rally: "Ace, a friendly sporting star",
    roam: "Rove, a jogging explorer",
    loop: "Luma, a friendly comet runner",
    tempo: "Bop, a radio in running shoes",
  };
  return (
    <Image
      className={`world-mascot ${className}`}
      src={`/design/worlds/${concept}.png`}
      alt={decorative ? "" : names[concept]}
      width={1024}
      height={1024}
      sizes="(max-width: 600px) 180px, 300px"
    />
  );
}
