import { GUEST_INTRO_DRAFT_KEY, parseGuestIntroDraft } from "@fitness-battle/shared";

export function readGuestIntroDraft() {
  try { return parseGuestIntroDraft(localStorage.getItem(GUEST_INTRO_DRAFT_KEY)); }
  catch { return null; }
}
