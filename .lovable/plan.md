# Rebrand the application to سَنَد | SANAD

## Scope
- Replace the old Arabic and English brand names throughout visible screens, metadata, sharing copy, authentication messages, and documentation.
- Update the role-selection welcome message to use SANAD and update patient headers to use سَنَد.
- Rename the package to `sanad-app` and add Capacitor app configuration with display name `SANAD` and bundle ID `com.sanad.app`.
- Rename local patient-session storage keys to the SANAD namespace.
- Check database-generated notification functions for old brand wording and update only if any is present.

## Validation
- Search the full project for remaining old brand references.
- Verify type safety and the preview build.
- Open the role-selection and patient screens to confirm the new branding is visible and error-free.

## Technical note
This TanStack Start project has no `index.html`; document metadata is managed by route `head()` definitions instead. Those metadata entries will be updated rather than adding an unused HTML file.
