import { requireNativeView, requireOptionalNativeModule } from "expo";
import type { SystemChoiceProps } from "./system-choice";

// An OTA on an older binary must stay usable until the new native build is installed.
export const SystemChoice = requireOptionalNativeModule("AnchoredChoice")
  ? requireNativeView<SystemChoiceProps>("AnchoredChoice") : null;
