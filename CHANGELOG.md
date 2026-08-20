# Changelog

This project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.4] - 2026-08-20

### Added

- Add a complete English README and language links between the Chinese and English documentation.

### Changed

- Document both npm and source installation in the Chinese and English READMEs.

## [0.1.3] - 2026-08-20

### Changed

- Run each C++ test case in an isolated process while reusing a single compiled executable.
- Store multi-problem imports as one atomic local pack file and continue loading other packs when one file is invalid.
- Validate imported problem function names, required learning content, argument shapes, numeric ranges, and supported C++ input types before saving.

### Fixed

- Attribute C++ crashes and timeouts to the actual failing case and display that case's complete input.
- Serialize control characters in C++ string results as valid JSON.

## [0.1.2] - 2026-08-19

### Added

- Add `/locale [zh|en]` to switch the interface language; the choice is persisted in state schema version 3 (older state files still load).
- Cache successful C++ builds with automatic invalidation for source, test, compiler, and platform changes.

### Changed

- Localize command help, pickers, status text, and core CLI feedback in Chinese and English.
- Localize Python/C++ runner diagnostics and use structured failure kinds for cancellation and compilation errors.

## [0.1.1] - 2026-08-18

### Added

- Add `localalgo --version` and `localalgo -v`.

### Changed

- Make the published npm installation the primary README setup path.

## [0.1.0] - 2026-08-18

### Added

- Conversation-first terminal interface with command completion and history.
- 330 offline Python and C++ practice problems across common algorithm topics.
- Local samples, hidden tests, custom cases, and detailed failure diagnostics.
- Tutorials, learning roadmap, progress tracking, and wrong-answer review.
- Versioned local storage and importable offline problem packs.
