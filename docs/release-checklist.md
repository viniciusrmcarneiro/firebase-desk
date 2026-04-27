# Release Checklist

Use this for unsigned development releases. Binaries are published as prereleases with SHA-256 checksums. Signing/notarization/code-signing are intentionally out of scope; package-manager distribution can come later.

## Before Merge

- [ ] `ci.yml` green.
- [ ] `e2e.yml` green.
- [ ] `release.yml` PR package job green.
- [ ] PR package artifacts uploaded with expected channel, OS, architecture, and target names.
- [ ] PR package artifacts include matching `SHA256SUMS*.txt` files.
- [ ] Linux packaged smoke passed.
- [ ] macOS packaged smoke passed if the PR ran the full matrix.
- [ ] Windows unpacked-app check passed if the PR ran the full matrix.

## Rolling Main Build

- [ ] Merge to `main`.
- [ ] `release.yml` package job green on macOS, Windows, and Linux.
- [ ] `main-latest` prerelease recreated.
- [ ] Release assets attached for macOS, Windows, and Linux targets.
- [ ] Matching `SHA256SUMS*.txt` assets attached for macOS, Windows, and Linux packages.
- [ ] Download each `main-latest` asset.
- [ ] Verify every downloaded asset against the matching `SHA256SUMS*.txt` file.
- [ ] Install/open macOS asset.
- [ ] Install/open Windows asset.
- [ ] Install/open Linux asset.

## First Versioned Prerelease

- [ ] Confirm `main-latest` artifacts open on each OS.
- [ ] Update package versions if needed.
- [ ] Create tag: `git tag v0.0.1 && git push origin v0.0.1`.
- [ ] Confirm `release.yml` creates a published GitHub prerelease for `v0.0.1`.
- [ ] Download each versioned asset.
- [ ] Verify every downloaded asset against the matching `SHA256SUMS*.txt` file.
- [ ] Install/open macOS asset.
- [ ] Install/open Windows asset.
- [ ] Install/open Linux asset.
- [ ] Confirm release notes mention unsigned binaries and checksum verification.
- [ ] Confirm assets are publicly downloadable.

## Later Distribution

- [ ] Homebrew cask.
- [ ] winget manifest.
- [ ] Scoop manifest.
- [ ] Linux package manager path, if demand justifies it.
- [ ] Public download copy and support policy.
