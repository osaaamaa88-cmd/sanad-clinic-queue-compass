# Remix of سندي — Guidelines

## Components

The design system exports these components — import them from `@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b` and compose them before building anything from scratch:

`AlarmStopper`, `AppShell`, `AvatarActionSheet`, `BroadcastBanner`, `Button`, `ClinicQrCard`, `ClinicsMap`, `Constants`, `DbHealthTab`, `DoctorBottomNav`, `DoctorNameSearch`, `LiveBookingsTab`, `LocationPickerModal`, `MediaTab`, `NetworkStatus`, `NotificationsBell`, `PatientAuthForm`, `PatientAuthModal`, `PatientBottomNav`, `PostViewer`, `RxComposer`, `SoundToggle`, `StaffAuth`, `StoryViewer`, `SystemTab`, `ThemeSetting`, `ThemeToggle`, `UsersTab`

Per-component details (import stanzas, props, variants, examples) live in `.lovable/rules/libraries/{slug}/components.md` — on disk, not auto-loaded. Read that file or the component source when the name alone isn't enough.

## Theme Files

The design system's theme is delivered through the following files. The author's original source files carry the full wiring the design system needs — variable declarations, framework-specific directives, provider objects, etc. — and are the canonical import target.

- `@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b/lib/theme` (source — preferred import)
- `@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b/styles.css` (source — preferred import)
- `@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b/dist/tokens.css` (auto-generated flat list of CSS custom properties — a raw-values fallback only; does NOT carry framework-specific wiring that the source files above provide)

