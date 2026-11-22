# Backend plan (Lovable Cloud)

**Sign-in:** Email magic link is available. No passwords. After the first sign-in the learner goes to /consent. A learner who already gave consent goes to /library.

## Tables and access rules (RLS on for every table)
| Table | Learner | Reviewer / Admin |
|---|---|---|
| learners | Read and update own row only | — |
| user_roles | Read own role | Admin can add, change and remove roles |
| stories, story_versions, sections, cards | Read only rows whose version is `approved` | Read all; add, change and delete |
| reviews, section_attempts, lookups, events, placement_results | Add and read own rows only | — |
| adaptation_runs | No access | Read and write |

`has_role(uid, role)` is a security-definer function. No table has an anonymous (signed-out) access rule.

## Screens
- **/signin:** an email field and a "Send me a link" button. The age box moves to /consent.
- **/consent:** a checkbox for pilot data use, a checkbox for "I am 18 or older", a first-language dropdown and a short goal field. It saves `consent_at`. The rest of the app stays closed until this is saved.
- **Protection:** everything except / and /signin needs sign-in. /admin/* is checked on the server with has_role (reviewer or admin).
- **Data:** one story is added with both levels, approved. All screens read through `src/data/*` and never import mock data directly.

## Extra pieces I need (not on your list). Please approve.
1. **Sign-up trigger:** at the first sign-in, it creates the `learners` row and the `learner` role. Without it, the "learner by default" rule cannot work.
2. **Email sign-in switch:** I have to turn on email sign-in in Cloud, or no link is sent.
3. **Language list:** the dropdown needs a short fixed list of languages: Spanish, Portuguese, French, Chinese, Arabic and Other.
4. **Mock-only screens:** Review, Progress and the quiz still use test numbers. I only connect stories to the new tables now.

## Open questions
- Which story should I add: Alice, Holmes or Twain?
- How do you get the first admin account? My suggestion: you sign in once, then I give your email the admin role by hand.
