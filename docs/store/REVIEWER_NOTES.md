# Reviewer notes

Paste this into App Store Connect (App Review Information → Notes) and Google Play Console (App access → Instructions). Keep it out of the public marketing site.

## Demo account

- Email: `alice@example.com`
- Password: `password123`
- Display name: Alice Park

Sign-in is email and password. There is no 2FA, one-time code, or magic link. The production seed marks this account’s email as confirmed. It already has running and cycling workouts, a crew, and standings, so empty screens are not required to review the app. There are no paid features to unlock.

Where to sign in:

- iOS and Android: open the **Athlete** tab, choose **Sign in**, and enter the email and password.
- Web: [https://overtaek.xyz/login](https://overtaek.xyz/login)

## Location and GPS

Overtaek does not ask for location permission and does not keep GPS running while the phone is locked. Route maps are drawn from workouts already stored on the demo account, or from a tracker the athlete connects. A reviewer can open the field and activity maps without going outside or starting an outdoor recording.

## Health

Health access is optional. The demo account already shows workouts if the permission prompt is skipped or denied.

- **iOS:** Athlete → **Apple Health** → **Tap to sync**. The system prompt asks to read workouts so the week can be scored. Overtaek does not write workouts back to Apple Health. Denying the prompt leaves the rest of the app usable.
- **Android:** Athlete → **Health Connect** → **Tap to sync**. The prompt asks to read exercise sessions and distance. Heart rate and sleep are not requested. Denying the prompt leaves the rest of the app usable.

This path needs a TestFlight, internal, or store build. Expo Go cannot read HealthKit or Health Connect.

## Profile photo

Choosing a profile photo opens the photo library. Denying that permission leaves the account usable without a photo. The app does not use the camera or microphone.

## Support

- Email: support@overtaek.xyz
- Help: [https://overtaek.xyz/support](https://overtaek.xyz/support)
- Account deletion: [https://overtaek.xyz/support#delete-account](https://overtaek.xyz/support#delete-account)
