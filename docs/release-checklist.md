# Release Checklist

Use this for unsigned releases. Merges with a desktop version bump publish stable releases automatically. `latest` mirrors the newest versioned `main` release. Signing/notarization/code-signing are intentionally out of scope.

## Before Merge

- [ ] `ci.yml` green.
- [ ] `e2e.yml` green.
- [ ] `release-gate.yml` green.
- [ ] PR changes `apps/desktop/package.json` version or title contains `[skip release]`.
- [ ] `release.yml` PR package job green.
- [ ] PR package artifacts uploaded with expected channel, OS, architecture, and target names.
- [ ] PR package artifacts include matching `SHA256SUMS*.txt` files.
- [ ] Linux packaged smoke passed.
- [ ] macOS packaged smoke passed if the PR ran the full matrix.
- [ ] Windows unpacked-app check passed if the PR ran the full matrix.

## Main Release

- [ ] Merge to `main`.
- [ ] Confirm merged PR changed `apps/desktop/package.json`; otherwise no rolling release is expected.
- [ ] `release.yml` package job green on macOS, Windows, and Linux.
- [ ] Version tag `vX.Y.Z` created from `apps/desktop/package.json`.
- [ ] Stable GitHub release `vX.Y.Z` created or updated.
- [ ] `release-manifest.json` attached to `vX.Y.Z`.
- [ ] Package manager manifest workflow artifact exists.
- [ ] `latest` tag exists.
- [ ] `latest` prerelease created or updated.
- [ ] Release assets attached for macOS, Windows, and Linux targets on `vX.Y.Z` and `latest`.
- [ ] Matching `SHA256SUMS*.txt` assets attached for macOS, Windows, and Linux packages.
- [ ] Download each `vX.Y.Z` asset.
- [ ] Verify every downloaded asset against the matching `SHA256SUMS*.txt` file.
- [ ] Install/open macOS asset.
- [ ] Install/open Windows asset.
- [ ] Install/open Linux asset.

## First Release

- [ ] Confirm root and desktop package versions are `0.0.1`.
- [ ] Merge the release PR.
- [ ] Confirm `release.yml` creates tag `v0.0.1`.
- [ ] Confirm `release.yml` creates a published GitHub release for `v0.0.1`.
- [ ] Download each versioned asset.
- [ ] Verify every downloaded asset against the matching `SHA256SUMS*.txt` file.
- [ ] Install/open macOS asset.
- [ ] Install/open Windows asset.
- [ ] Install/open Linux asset.
- [ ] Confirm release notes mention unsigned binaries and checksum verification.
- [ ] Confirm assets are publicly downloadable.
- [ ] Confirm `release-manifest.json` is attached.
- [ ] Confirm package manager manifest workflow artifact exists.

## Later Distribution

- [ ] Self-owned Homebrew tap cask.
- [ ] Self-owned Scoop bucket manifest.
- [ ] winget manifest.
- [ ] Linux package manager path, if demand justifies it.
- [ ] Public download copy and support policy.
