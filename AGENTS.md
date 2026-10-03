<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Brand identity is **سَنَد | SANAD**; use `sanad` for technical namespaces and `com.sanad.app` for the mobile bundle ID. This keeps customer-facing and platform identity consistent.
- Patient routes share a fixed bottom navigation through `AppShell`; keep health and medication tools grouped under the account destination.
- Clinic media uploads go browser → signed upload URL (`src/lib/media.functions.ts` + `media-upload.ts`) and refs are signed via `signMediaRefs`; `avatars:` prefix marks the avatars bucket. Why: big files, real progress, buckets stay private.
