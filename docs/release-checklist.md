# Release Checklist

Use this for unsigned releases. `latest` is a rolling prerelease. Version tags are stable releases with SHA-256 checksums. Signing/notarization/code-signing are intentionally out of scope.

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

## Rolling Main Build

- [ ] Merge to `main`.
- [ ] Confirm merged PR changed `apps/desktop/package.json`; otherwise no rolling release is expected.
- [ ] `release.yml` package job green on macOS, Windows, and Linux.
- [ ] `latest` tag exists.
- [ ] `latest` prerelease created or updated.
- [ ] Release assets attached for macOS, Windows, and Linux targets.
- [ ] Matching `SHA256SUMS*.txt` assets attached for macOS, Windows, and Linux packages.
- [ ] Download each `latest` asset.
- [ ] Verify every downloaded asset against the matching `SHA256SUMS*.txt` file.
- [ ] Install/open macOS asset.
- [ ] Install/open Windows asset.
- [ ] Install/open Linux asset.

## First Versioned Release

- [ ] Confirm `latest` artifacts open on each OS.
- [ ] Update root and desktop package versions.
- [ ] Create tag: `git tag v0.0.1 && git push origin v0.0.1`.
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
