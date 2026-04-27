# Release Checklist

Use this for unsigned development releases. Binaries are published as prereleases; signing/notarization work stays deferred until the app is ready for a trusted public release.

## Before Merge

- [ ] `ci.yml` green.
- [ ] `e2e.yml` green.
- [ ] `release.yml` PR package job green.
- [ ] PR package artifacts uploaded with expected channel, OS, architecture, and target names.
- [ ] Linux packaged smoke passed.
- [ ] macOS packaged smoke passed if the PR ran the full matrix.
- [ ] Windows unpacked-app check passed if the PR ran the full matrix.

## Rolling Main Build

- [ ] Merge to `main`.
- [ ] `release.yml` package job green on macOS, Windows, and Linux.
- [ ] `main-latest` prerelease recreated.
- [ ] Release assets attached for macOS, Windows, and Linux targets.
- [ ] Download each `main-latest` asset.
- [ ] Install/open macOS asset.
- [ ] Install/open Windows asset.
- [ ] Install/open Linux asset.

## First Versioned Prerelease

- [ ] Confirm `main-latest` artifacts open on each OS.
- [ ] Update package versions if needed.
- [ ] Create tag: `git tag v0.0.1 && git push origin v0.0.1`.
- [ ] Confirm `release.yml` creates a published GitHub prerelease for `v0.0.1`.
- [ ] Download each versioned asset.
- [ ] Install/open macOS asset.
- [ ] Install/open Windows asset.
- [ ] Install/open Linux asset.
- [ ] Confirm release notes mention the unsigned-build warning.
- [ ] Confirm assets are publicly downloadable.

## Deferred Before Public Release

- [ ] macOS Developer ID signing.
- [ ] macOS notarization.
- [ ] Windows code-signing certificate.
- [ ] Linux package signing decision.
- [ ] Public download copy and support policy.
