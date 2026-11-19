import AsyncStorage from "@react-native-async-storage/async-storage";
import { GUEST_INTRO_DRAFT_KEY, parseGuestIntroDraft } from "@fitness-battle/shared";

export { GUEST_INTRO_DRAFT_KEY, GUEST_OAUTH_SIGNUP_PENDING, GUEST_SIGNUP_PENDING_KEY, type GuestIntroDraft } from "@fitness-battle/shared";

export async function readGuestIntroDraft() {
  return parseGuestIntroDraft(await AsyncStorage.getItem(GUEST_INTRO_DRAFT_KEY));
}
