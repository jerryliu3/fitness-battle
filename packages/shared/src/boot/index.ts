export {
  BOOT_DURATION_MS,
  READY_END,
  FLIGHT_END,
  ZOOM_END,
  bootDashProgress,
  bootFlightT,
  bootFlyProgress,
  bootFrame,
  bootKCrossfade,
  bootKMorph,
  clamp,
  smooth,
  type BootFrame,
  type BootLayout,
} from "./motion";
export { bootEmberPose } from "./pose";
export { isCompeteDataReady, shouldShowBootSplash } from "./gate";

export { DEFAULT_BOOT_SPLASH_VARIANT, LOGO_RACE_DURATION_MS, logoRaceWords, stackedLayout, staggeredLogoFrame, type BootSplashVariant, type LogoRaceWord } from "./logo-race";
