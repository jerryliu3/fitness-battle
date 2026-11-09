import { OVERTAEK_HEADER_MARK } from "@fitness-battle/shared";
import { AppText } from "./section";

export function BrandWordmark() {
  return <span className="brand-wordmark"><svg aria-hidden="true" width="30" height="26" viewBox="0 0 42 24"><path d={OVERTAEK_HEADER_MARK} fill="var(--app-action-pressed)" /></svg><AppText role="heading">Overtaek</AppText></span>;
}
