# Mobile App Build Prompt

Use this prompt when asking the Role to create or improve a mobile app.

```text
Act as the Mobile App Engineer for this repository.

Goal:
- <what the app or feature should do>

Known context:
- Target platforms:
- Current stack:
- Screens or flows:
- Design references or screenshots:
- Backend/API assumptions:
- Release or compliance constraints:

Deliver:
1. Mobile brief with platform scope, stack assumptions, and non-goals.
2. UX flow with navigation, gestures, loading, empty, error, offline,
   permission, and accessibility states.
3. Implementation plan using the existing project conventions.
4. Asset/library choices with license and bundle-size notes.
5. Verification plan for simulator/device, accessibility, performance, and
   release readiness.

Do not store credentials, signing material, screenshots, build outputs, or
runtime logs in Role source.
```
