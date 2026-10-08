# Current work
- [x] Floating voice accessibility: automatic loop, voice preference, no activation navigation, permission/cleanup browser checks with simulated speech; real server round trip returned directory fallback, not verified Groq analysis. Physical microphone/audio requires device testing.

- [x] Map polish: clustering, compact circular medical pins, safe selection preview, GPS/auto-fit, browser checks.

- [x] Replace the previous brand name across screens, metadata, sharing, and system copy.
- [x] Update local storage, export, and session namespaces while preserving patient data.
- [x] Update package and mobile app identity to SANAD / com.sanad.app.
- [x] Verify database notification definitions contain no legacy brand text.
- [x] Verify build output and mobile/desktop screens.
- [x] Patient guest browsing + auth guard on follow/review/contact (resume action after sign-in)
- [x] Dedicated patient login screen (/patient/login): Google + name/phone quick login, no SMS

- [x] Search/map upgrade: GPS recenter, auto-fit, open-now filter, directions, book CTA
- [x] Test the doctor search section end-to-end
- [x] Patient bottom navigation: home, search, emergency, account
- [x] Move health indicators and medication reminders into the patient account
- [x] Storage: avatars bucket (5MB), clinic-media 50MB, image compression, upload progress/size errors, indexes, list caps + paging helper
- [x] Patient home header shows only «سَنَد | SANAD»
- [x] Headers hide on scroll down across all pages
- [x] Move light/dark switch into patient & doctor settings

- [x] Doctor story manager page (/doctor/stories) linked from doctor settings
- [ ] AI analysis of repeated save failures for the owner panel (paused for stories)
- [x] Make the search map fast and smooth on phones

- [x] Map micro-styling: center cluster numbers (flex, white 700/14px); remove dashed borders on pins; solid badge with dark drop shadow
- [x] Performance: 1h data cache, offline map tiles, lazy map/story viewer

- [x] Show the medical disclaimer only as a link under sign-in
- [ ] Voice assistant + admin monitor: Groq model llama-3.3-70b-versatile unavailable on the key (waiting on user choice of replacement)
