import Image from "next/image";

/** Ace — locked Rally mascot (same asset as the design-lab prototype). */
export function Ace({
  className = "",
  decorative = true,
}: {
  className?: string;
  decorative?: boolean;
}) {
  return (
    <Image
      className={`world-mascot ${className}`}
      src="/design/worlds/rally.png"
      alt={decorative ? "" : "Ace, a friendly sporting star"}
      width={1024}
      height={1024}
      sizes="(max-width: 600px) 180px, 300px"
    />
  );
}
