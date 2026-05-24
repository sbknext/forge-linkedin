# Contributing to forge-linkedin

Thanks for your interest. PRs are welcome. Keep changes focused.

---

## Dev setup

```bash
git clone https://github.com/sbknext/forge-linkedin
cd forge-linkedin
cargo build
cargo test
```

Requires Rust 1.75+ and a local Chrome/Chromium installation. See [INSTALL.md](INSTALL.md) for system prerequisites.

---

## Code style

- **Format**: run `cargo fmt` before committing. CI will reject unformatted code.
- **Lints**: run `cargo clippy -- -D warnings`. Clippy warnings are CI failures.
- **Naming**: follow Rust API guidelines — `snake_case` for functions/variables, `PascalCase` for types.
- **Errors**: use `thiserror` for library-facing errors, `anyhow` for binary entry points. No `unwrap()` in non-test code.

---

## Commit conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(filter): add skip_repost option to config
fix(login): handle 2FA prompt without panicking
docs(readme): clarify daily cap math section
refactor(chrome): extract session manager into own module
test(filter): add cases for unicode keyword matching
```

One logical change per commit. Keep commits small enough to revert safely.

---

## Tests

- New filter rules **require tests**. Add them to `tests/` or as `#[cfg(test)]` modules in the relevant file.
- Tests must not make real network requests. Use mock data / fixtures.
- Run the full suite before opening a PR:

```bash
cargo test
```

---

## Pull requests

1. Fork, create a branch from `main`.
2. Keep changes under ~300 lines where possible — smaller diffs get reviewed faster.
3. Update `CHANGELOG.md` under `[Unreleased]`.
4. Open the PR against `main`. Describe what changed and why.
5. One approval from a maintainer + passing CI required to merge.

---

## What we will not accept

- Changes that raise the `daily_cap` ceiling above 30.
- Headless-browser mode (defeats the safety design).
- Password storage in any form other than the existing `.env` approach.
- Auto-comment, bulk-follow, or mass-DM features in this repo (not in scope for v0.x).

---

## Reporting bugs

Open a GitHub issue with:
- `forge-linkedin --version`
- OS and Chrome/Chromium version
- Relevant log lines from `~/.forge-linkedin/logs/`
- Steps to reproduce

Security issues: see [SECURITY.md](SECURITY.md).
