import Image from "next/image";
import { DEFAULT_MASCOT, MASCOTS, type MascotVariant } from "@fitness-battle/shared";

/** Product mascot; retain the Ace API for existing Rally surfaces. */
export function Ace({
  className = "",
  decorative = true,
  variant = DEFAULT_MASCOT,
}: {
  className?: string;
  decorative?: boolean;
  variant?: MascotVariant;
}) {
  return (
    <Image
      className={`world-mascot ${className}`}
      src={`/brand/mascots/${variant}.webp`}
      alt={decorative ? "" : MASCOTS[variant].description}
      width={480}
      height={480}
      sizes="(max-width: 600px) 180px, 300px"
    />
  );
}
