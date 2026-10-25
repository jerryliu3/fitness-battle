import { DEFAULT_BOOT_SPLASH_VARIANT, type BootSplashVariant } from "@fitness-battle/shared/boot";
import { EmberBootSplash } from "./ember-boot-splash";
import { LogoRaceBootSplash } from "./logo-race-boot-splash";

export { EmberBootSplash } from "./ember-boot-splash";
export { LogoRaceBootSplash } from "./logo-race-boot-splash";

export interface BootSplashProps {
  waiting?: boolean;
  onAnimationComplete: () => void;
  variant?: BootSplashVariant;
}

export function BootSplash({ variant = DEFAULT_BOOT_SPLASH_VARIANT, ...props }: BootSplashProps) {
  return variant === "ember" ? <EmberBootSplash {...props} /> : <LogoRaceBootSplash {...props} />;
}
