# LocalAlgo

一个离线、消息流式的算法练习 CLI。界面以 coding agent 为灵感：题面、编辑动作和判题结果按时间追加，不使用左右分栏，也不内置一套新的代码编辑器。

> **项目状态：0.1.0 预览版。** 核心流程已经可用，当前主要在 Linux 上验证；
> macOS 和 Windows 仍需要更多真实环境测试。

## 当前能力

- agent CLI 风格的消息流和底部输入框
- `/` 命令建议、Tab 补全与上下键历史
- 12 类面向初学者的本地技巧教程和学习路线
- 内置中文示例题库
- 使用 `$VISUAL` 或 `$EDITOR` 编辑解答
- Python、C++ 公开样例和本地隐藏测试
- 本地记录当前题目、完成状态和提交次数
- 题目与解答均可在断网环境使用

> 当前 runner 会直接执行本地 Python 代码，并不提供安全沙箱。不要运行不可信的题包或解答文件。

## 环境

- Node.js 20+
- Python 3
- 支持 C++ 时需要 `g++`（C++17）
- 一个终端编辑器，例如 Vim、Neovim、Helix 或 Nano

## 安装与运行

从 npm 发布后可以全局安装：

```bash
npm install --global localalgo
mkdir -p ~/practice/localalgo
cd ~/practice/localalgo
localalgo
```

从源码运行：

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

不执行 `npm link` 也可以直接运行：

```bash
npm run dev -- ~/practice/localalgo
```

程序会在练习工作区创建：

```text
.localalgo/state.json      # 本地进度
.localalgo/problems/*.json # 导入的离线题目
solutions/*.py             # Python 解答
solutions/*.cpp            # C++ 解答
```

## 使用

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
/edit
/test [[2,7,11,15],9]
/run
/submit
/progress
/wrong
/review
/doctor
```

切换到 C++：

```text
/lang cpp
/edit
/run
/submit
```

也可以选题时直接指定语言：

```text
/pick two-sum cpp
```

Python 和 C++ 解答分别保存在 `solutions/two-sum.py` 与
`solutions/two-sum.cpp`，切换语言不会覆盖另一个版本。新建的解答文件顶部会
包含题目描述、示例和约束；旧的空白模板会安全升级，已经修改过的代码不会被覆盖。

`/test` 接收一个 JSON 数组，其中每一项对应函数的一个参数，并直接显示返回值。
它适合在提交前快速验证自己想到的边界情况，例如：

```text
/test [[3,3],6]
/test ["{[]}"]
```

运行 `/test`、`/run` 或 `/submit` 时可以按 `Ctrl+C` 取消当前判题并返回输入框；
空闲状态下按 `Ctrl+C` 才会退出 LocalAlgo。单次运行的输出上限为 1 MiB，避免
失控程序持续打印耗尽终端进程内存。

内置题库目前包含 16 道核心题、14 道不同结构的精选题和 300 道确定性专项训练题，共 330 道。
覆盖数组、矩阵、链表、二叉树、哈希表、字符串、栈、数学、二分查找、双指针、
滑动窗口、前缀和、前缀积、贪心、分治和动态规划。使用 `/topics`
查看每个类型的完成进度；`/topic <类型> [难度]` 会优先随机选择该类型下尚未
完成的题目。`/list` 每页显示 20 道，使用 `/list 数组 2` 可以筛选并翻页。
直接输入 `/topic` 会打开内联类型选择器：使用方向键或 `j/k` 移动，Enter
选择不限难度，或者按 `E`、`M`、`H` 分别选择 easy、medium、hard。

## 学习模式

刷题前输入 `/learn` 会打开内联教程选择器，使用方向键或 `j/k` 移动、Enter
打开、Esc 取消。也可以直接输入类型，例如 `/learn 双指针`；类型名称支持 Tab
补全。每份教程都包含：

- 什么时候应该想到这个套路
- 可以照着执行的标准步骤
- 时间、空间复杂度
- 初学者常犯的错误
- 与语言无关的伪代码模板
- 对应的 `/list` 和 `/topic` 练习入口

输入 `/roadmap` 可以查看建议顺序：先学习数组与哈希表，再逐步进入双指针、
滑动窗口、树、动态规划和贪心。每份教程带有由浅入深的推荐题单；`/next`
会进入整条路线中的下一道未完成题，`/next 滑动窗口` 则只推进指定类型。当前
推荐题尚未完成时不会直接跳过，避免遗漏基础环节。教程、路线和练习题一样都
保存在本地，断网可用。

## 错题复习

`/submit` 未通过时会记录失败次数。使用 `/wrong` 查看错题本，使用 `/review`
随机选择一道错题；存在尚未解决的错题时会优先复习它们。题目后来通过后仍会
保留历史失败记录，并在错题本中标记为“已掌握”。`/progress` 也会显示错题数。

任一本地测试出现 Wrong Answer 时都会完整显示输入、期望值、实际值，以及数组
或字符串中的第一个差异位置；运行时错误和超时也会显示触发问题的完整输入。

## 导入离线题包

题包是一个 JSON 文件，可以包含一道或多道题。项目提供了可直接修改的
[`examples/problem-pack.json`](examples/problem-pack.json)：

```text
/import ./examples/problem-pack.json
/pick fibonacci-number
```

导入后的题目保存在练习工作区的 `.localalgo/problems/`，以后断网启动也会
自动加载。题包会校验 slug、题面、示例、约束、Python/C++ 模板和测试数据；
不会静默覆盖已有题目。

进度文件使用带版本号的格式保存，并在更新前保留 `.localalgo/state.json.bak`。
主状态损坏时会自动读取备份，同时兼容早期版本的无版本状态文件。
首次运行时如果只发现旧版 `.localcode` 数据目录，会自动迁移到 `.localalgo`。

题包参数类型支持 `int`、`long long`、`double`、`bool`、`string`、
`vector<int>`、`vector<string>`、`vector<vector<int>>`、`ListNode` 和
`TreeNode`。链表使用整数数组表示，二叉树使用包含 `null` 的层序数组表示；
运行时会为 Python 和 C++ 自动构造对应节点对象。

输入 `/` 会显示匹配的命令；使用 `Tab` 补全命令、题目 slug、语言或难度，
使用 `↑`/`↓` 浏览当前会话中的命令历史。`/hint` 会从思路方向开始逐级给出
提示，不直接展示完整答案。

如果希望使用 Neovim：

```bash
export EDITOR=nvim
localalgo
```

如果使用 VS Code，需要让命令等待编辑窗口关闭：

```bash
export EDITOR="code --wait"
```

## 开发

```bash
npm run dev
npm test
```

贡献前请阅读 [`CONTRIBUTING.md`](CONTRIBUTING.md)。安全问题请按照
[`SECURITY.md`](SECURITY.md) 私下报告；不要在公开 issue 中披露可利用细节。

## 题目内容与项目关系

LocalAlgo 是独立的社区项目，与 LeetCode 或其他刷题平台没有隶属、赞助或背书
关系。随项目分发的题面、示例、提示、模板与测试作为 LocalAlgo 内容维护；贡献
者只能提交自行创作或明确允许再分发的内容，不应从商业题库复制或抓取内容。
详细说明见 [`NOTICE.md`](NOTICE.md)。

## 许可证

代码和项目自有内容采用 [MIT License](LICENSE) 发布。

下一阶段适合增加更多真正不同的精选题、交互式 `/browse`、C++ 编译缓存和
可选的容器沙箱。
