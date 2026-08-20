# LocalAlgo

[简体中文](https://github.com/tiandada/localalgo/blob/main/README.md) |
[English](https://github.com/tiandada/localalgo/blob/main/README.en.md)

[![npm version](https://img.shields.io/npm/v/localalgo.svg)](https://www.npmjs.com/package/localalgo)
[![CI](https://github.com/tiandada/localalgo/actions/workflows/ci.yml/badge.svg)](https://github.com/tiandada/localalgo/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/localalgo.svg)](LICENSE)

An offline, conversation-first algorithm practice CLI inspired by coding agents.
Problem statements, editing actions, and judge results are appended as a message
stream. There is no split-pane IDE and no built-in code editor to learn.

> **Project status: 0.x preview.** The core workflow is usable and is currently
> tested primarily on Linux. More real-world testing is still needed on macOS
> and Windows.

## Features

- Coding-agent-style message stream with a bottom command composer
- Slash-command suggestions, Tab completion, and command history
- Beginner-friendly tutorials and a learning roadmap for 12 patterns
- A bundled Chinese practice catalog
- Editing through `$VISUAL` or `$EDITOR`
- Public examples and local hidden tests for Python and C++
- C++ compilation cache invalidated by source, tests, compiler, and platform
- Local progress, completion status, submission counts, and review history
- Problems, tutorials, solutions, and judging available without a network

> The current runner executes local Python and C++ solutions directly and is
> not a security sandbox. Do not run untrusted solutions or problem packs.

## Requirements

- Node.js 20+
- Python 3
- `g++` with C++17 support when using C++
- A terminal editor such as Vim, Neovim, Helix, or Nano

## Installation

### Install from npm

The recommended installation method is a global npm install:

```bash
npm install --global localalgo
localalgo --version

mkdir -p ~/practice/localalgo
cd ~/practice/localalgo
localalgo
```

### Install from source

Clone the repository, install dependencies, build it, and register the CLI with
`npm link`:

```bash
git clone https://github.com/tiandada/localalgo.git
cd localalgo
npm install
npm run build
npm link

mkdir -p ~/practice/localalgo
cd ~/practice/localalgo
localalgo
```

For local development, you can run the source without `npm link`:

```bash
npm run dev -- ~/practice/localalgo
```

LocalAlgo creates the following files in the selected practice workspace:

```text
.localalgo/state.json      # Local progress
.localalgo/problems/*.json # Imported offline problems
solutions/*.py             # Python solutions
solutions/*.cpp            # C++ solutions
```

## Usage

```text
/list
/list 数组 2
/topics
/topic
/topic 数组
/topic 动态规划 medium
/learn
/learn 滑动窗口
/roadmap
/next
/next 滑动窗口
/import ./my-problems.json
/pick two-sum
/random easy
/hint
/locale en
/edit
/test [[2,7,11,15],9]
/run
/submit
/progress
/wrong
/review
/doctor
```

## Interface language

LocalAlgo uses Chinese by default. Enter `/locale en` to switch the interface
to English and `/locale zh` to switch it back. The selection is stored in the
current practice workspace and restored on the next launch. Command help,
pickers, run status, and interactive feedback are available in both languages.
The bundled problem statements and tutorials are currently still written in
Chinese.

Switch to C++ with:

```text
/lang cpp
/edit
/run
/submit
```

You can also select a language while opening a problem:

```text
/pick two-sum cpp
```

Python and C++ solutions are stored separately as `solutions/two-sum.py` and
`solutions/two-sum.cpp`, so switching languages does not overwrite either
version. A new solution file includes the problem statement, examples, and
constraints as comments. Older untouched starter files are upgraded safely;
modified solutions are never overwritten.

C++ executables are cached under `.localalgo/cache/cpp/`. A cached build is
reused for the same source and test set. Source changes, test changes, compiler
upgrades, or platform changes produce a new entry. The cache retains at most 64
entries and is always safe to delete. A test set is compiled once, while each
case runs in an isolated process so global state, crashes, and timeouts cannot
affect another case.

`/test` accepts a JSON array with one item for each function argument and shows
the returned value directly. Use it to check edge cases before submitting:

```text
/test [[3,3],6]
/test ["{[]}"]
```

Press `Ctrl+C` during `/test`, `/run`, or `/submit` to cancel the current judge
and return to the command composer. `Ctrl+C` exits LocalAlgo only while it is
idle. Each process has a 1 MiB output limit to prevent runaway output from
exhausting the terminal process memory.

The bundled catalog currently contains 16 core problems, 14 structurally
distinct curated problems, and 300 deterministic drill variants, for 330 total
entries. Topics include arrays, matrices, linked lists, binary trees, hash
tables, strings, stacks, mathematics, binary search, two pointers, sliding
windows, prefix sums and products, greedy algorithms, divide and conquer, and
dynamic programming.

Use `/topics` to see progress by topic. `/topic <topic> [difficulty]` prefers an
unsolved problem from the requested topic. `/list` displays 20 entries per page;
for example, `/list 数组 2` filters by the Chinese array topic and opens page 2.
Entering `/topic` without arguments opens the inline topic picker. Move with the
arrow keys or `j/k`, press Enter for any difficulty, or use `E`, `M`, and `H` for
easy, medium, and hard.

## Learning mode

Enter `/learn` before practicing to open the inline tutorial picker. Move with
the arrow keys or `j/k`, press Enter to open a tutorial, and press Esc to cancel.
You can also enter a topic directly, such as `/learn 双指针`; topic names support
Tab completion. Each tutorial includes:

- Signals that suggest the pattern
- A repeatable step-by-step approach
- Time and space complexity
- Common beginner mistakes
- Language-neutral pseudocode
- Matching `/list` and `/topic` practice entry points

`/roadmap` shows the recommended order, beginning with arrays and hash tables
and progressing through two pointers, sliding windows, trees, dynamic
programming, and greedy algorithms. Each tutorial contains an ordered practice
list. `/next` opens the next unsolved problem in the full roadmap, while
`/next 滑动窗口` advances only within the requested topic. LocalAlgo does not
silently skip the current recommended problem while it remains incomplete.
Tutorials, routes, and practice problems all work offline.

## Reviewing failed problems

A failed `/submit` increments the problem's failure count. `/wrong` displays the
review list, and `/review` selects a failed problem, preferring those that are
still unsolved. Solving a problem later preserves its failure history and marks
it as mastered. `/progress` also displays the number of failed problems.

Wrong Answer results display the complete input, expected value, actual value,
and the first differing array or string position. Runtime errors and timeouts
also display the complete input that triggered the failure.

## Importing offline problem packs

A problem pack is a JSON file containing one or more problems. Start from the
included [`examples/problem-pack.json`](examples/problem-pack.json):

```text
/import ./examples/problem-pack.json
/pick fibonacci-number
```

Imported problems are stored under `.localalgo/problems/` and loaded offline on
future launches. LocalAlgo validates slugs, statements, examples, constraints,
Python and C++ starters, tests, function names, argument types, and integer
ranges. Existing problems are never overwritten silently. Multi-problem packs
are written atomically, and one damaged custom file is skipped and reported
without preventing other local problems from loading.

Progress uses a versioned state format and keeps `.localalgo/state.json.bak`
before updates. If the primary state is damaged, LocalAlgo attempts to recover
from the backup. Older unversioned state files remain supported. If the first
launch finds only the former `.localcode` data directory, it is migrated to
`.localalgo` automatically.

Problem-pack arguments support `int`, `long long`, `double`, `bool`, `string`,
`vector<int>`, `vector<string>`, `vector<vector<int>>`, `ListNode`, and
`TreeNode`. Linked lists use integer arrays; binary trees use level-order arrays
containing integers and `null`. The runner constructs the corresponding Python
and C++ node objects automatically.

Entering `/` displays matching commands. Use `Tab` to complete commands,
problem slugs, languages, topics, or difficulties, and use `↑`/`↓` to browse
command history from the current session. `/hint` reveals progressively more
specific guidance without immediately showing a complete solution.

To use Neovim:

```bash
export EDITOR=nvim
localalgo
```

VS Code must wait until its editing window is closed:

```bash
export EDITOR="code --wait"
```

## Development

```bash
npm install
npm run dev
npm test
```

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before contributing. Report security
issues privately according to [`SECURITY.md`](SECURITY.md); do not disclose
exploitable details in a public issue.

## Problem content and project relationship

LocalAlgo is an independent community project and is not affiliated with,
sponsored by, or endorsed by LeetCode or another coding platform. Bundled
statements, examples, hints, starters, and tests are maintained as LocalAlgo
content. Contributors may submit only original material or content whose
license explicitly permits redistribution. Do not copy or scrape material from
commercial problem catalogs. See [`NOTICE.md`](NOTICE.md) for details.

## License

The source code and project-owned content are released under the
[MIT License](LICENSE).

Suitable next steps include adding more structurally distinct curated problems,
an interactive `/browse` command, and an optional container sandbox.
