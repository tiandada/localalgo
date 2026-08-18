# Contributing to LocalAlgo

Thanks for helping improve LocalAlgo. Bug fixes, terminal UX improvements,
documentation, runners, tutorials, and original practice problems are welcome.

## Development

Requirements are Node.js 20+, Python 3, and `g++` with C++17 support.

```bash
npm ci
npm test
```

For interactive development:

```bash
npm run dev -- /tmp/localalgo-practice
```

## Pull requests

1. Keep each change focused and add or update tests for changed behavior.
2. Run `npm test` before opening the pull request.
3. Describe user-visible behavior and any terminal or platform assumptions.
4. Do not commit `.localalgo/`, `solutions/`, credentials, or generated builds.

## Problem and tutorial contributions

Only submit content you wrote yourself or content with a clearly compatible
redistribution license. Do not copy or scrape statements, examples, hints,
solutions, or tests from LeetCode or another proprietary platform. Include
source and license details when adapting permissively licensed material.

New problems should have an unambiguous statement, constraints, useful hints,
Python and C++ starters, public examples, boundary-focused hidden tests, and a
matching topic tutorial where appropriate.

By contributing, you agree that your contribution is licensed under the MIT
License used by this repository.
