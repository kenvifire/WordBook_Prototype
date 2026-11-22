# Sign in with Google on /signin

## What changes
- The /signin page gets a "Continue with Google" button above the email form. The email magic link stays as it is.
- After Google sign-in, the learner goes to the same place as today: /consent if consent is still missing, otherwise /library.
- New Google accounts get their learner profile and learner role from the existing sign-up step, with no changes needed.
- No other pages change.

## Steps
1. Turn on Google sign-in managed by Lovable. This adds the sign-in helper module `src/integrations/lovable`, which is generated and never edited by hand.
2. `src/content/copy.ts`: add `signin.google = "Continue with Google"` and `signin.googleError = "We could not sign you in with Google. Please try again."`.
3. `src/routes/signin.tsx`:
   - Add `<Button variant="secondary">` with the multicolor Google "G" logo (inline SVG, aria-hidden) above the form, plus a short "or" divider.
   - On click: `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/signin" })`. If it returns an error, show a message. If it redirects, do nothing.
   - The existing `getUser` + `onAuthStateChange("SIGNED_IN")` effect already does the consent/library redirect, so it is reused for both the popup flow and the full redirect flow.
4. Check: no change to the `handle_new_user` trigger, because it runs for every new account and inserts into `learners` and `user_roles`. After a test Google sign-in, confirm both rows exist.

## Note
- The button uses the app's secondary style, as requested. Google's own button guidelines ask for a white/dark neutral style with its logo. The logo is kept, but the color follows the app.
