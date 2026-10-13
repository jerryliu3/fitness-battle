import Image from "next/image";

/** Ace — the locked Rally mascot. Product path; design lab keeps /design/worlds/rally.png. */
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
      src="/brand/ace.png"
      alt={decorative ? "" : "Ace, a friendly sporting star"}
      width={1024}
      height={1024}
      sizes="(max-width: 600px) 180px, 300px"
      priority={false}
    />
  );
}
