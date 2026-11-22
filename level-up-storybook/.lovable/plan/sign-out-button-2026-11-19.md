# Sign out button

## What you will see
- Learner pages: a "Sign out" button in the top bar, next to the streak. On phones it shows as a small icon button with the same label for screen readers.
- Admin pages: a "Sign out" button at the bottom of the side menu.
- After pressing it, you go to the sign-in page. The Back button does not bring you back into the app.
- If sign-out fails, a short message appears ("We could not sign you out. Please try again.").

## First admin
- I could not find an account for swalkerllan@gmail.com yet. The sign-in is only finished after you open the link in the email.
- Please open that email link, then tell me. After that I give your account the admin role (one database change, no code).

## Technical details
- New `src/components/wb/sign-out-button.tsx`: cancel queries, clear the query cache, `supabase.auth.signOut()`, then `navigate({ to: "/signin", replace: true })`; toast on error.
- Use it in `src/routes/_learner.tsx` header and `src/routes/admin.tsx` sidebar.
- Copy keys (`signOut`, `signOutError`) in `src/content/copy.ts`.
- Keep the single `onAuthStateChange` listener in `__root.tsx`; no second listener.
- Check with a test user in the browser: sign in, sign out, land on /signin, /library sends back to /signin.
