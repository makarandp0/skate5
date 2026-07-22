# TODO

## Auth And Email

- [ ] Update Firebase Auth password reset template branding for `skate1-test` and production.
  - Use Skate5 naming in the subject, sender display name, and email body.
  - Keep the current Firebase-hosted reset handler unless we decide to own the reset page.
- [ ] Add a continue URL to Firebase password reset requests so users can return to the Skate5 login screen after resetting.
- [ ] Consider a Resend-powered password reset email.
  - API generates the Firebase reset link with Admin SDK `generatePasswordResetLink`.
  - API sends a branded Skate5 email through Resend.
  - Frontend keeps the same forgot-password UI and generic success message.
- [ ] Consider a custom Skate5 reset-password page.
  - Handle Firebase `mode=resetPassword` and `oobCode` in the web app.
  - Confirm the new password with Firebase `confirmPasswordReset`.
  - Keep fallback copy for expired or already-used reset links.
- [ ] Add lightweight public endpoint rate limiting before replacing Firebase's built-in reset email.
  - Avoid account enumeration by returning the same user-facing success message whether the email exists or not.
  - Log operational errors server-side without exposing account state.
