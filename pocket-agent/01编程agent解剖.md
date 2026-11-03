# 编程 Agent 解剖——把"它"看清楚才知道怎么搬

> 所有搬运难题的根源，都藏在上游架构里。这一章解剖编程 agent CLI 的构造——模型环、工具执行、权限审批、PTY、Web UI——看清楚每一块对操作系统的假设，才能理解为什么把它搬上手机这么难。

---

## 1. 一个编程 agent 由什么构成

剥离各家实现差异，编程 agent CLI（Claude Code、DeepSeek Harness、ZCode CLI、OpenCode……）的骨架是同一套：

```
大模型 API ←→ Agent 内核（对话循环/上下文管理）
                 ↓ 工具调用
        工具执行层：读写文件 / 执行 shell（PTY） / 浏览器 / MCP / 插件
                 ↑ 授权闸门
        权限审批：allowlist / 会话内确认 / hooks
                 ↕ 呈现
        TUI（终端）或 Web UI（浏览器）
```

四个值得驻足的部件：

- **Agent 内核**：对话循环 + 上下文压缩 + 会话持久化。纯 TypeScript/JavaScript，跨平台无忧——**它不是移植难题的来源**；
- **工具执行层**：文件读写纯 JS 可以扛；**shell 执行才是硬骨头**——agent 要交互式终端（PTY）、子进程管理、信号处理，这些全压在 `node-pty` 这类**原生模块**上；
- **权限审批**：编程 agent 的安全模型核心。"执行危险命令前先问用户"要求 UI 与内核之间有可靠通道——手机化之后审批交互恰恰是最难做好的部分（06 篇的弹窗三选项、08 篇的审批横幅都是对这个部件的移动化）；
- **Web UI 模式**：几乎所有 agent CLI 都提供 `--web` 或远控页面——这件事本身就暗示了"移动化"的一条正路（远控派），也是 DSH 生态 15+ 个远控项目的物质基础。

## 2. 标本一：ZCode CLI 的构造

ZCode（zai-org/ZCode，Apache-2.0）的 agent CLI 在 `apps/zcode-cli/`，`packages/core/src` 的目录就是一张能力清单：`agent`（对话循环）、`permission`（授权闸门）、`hooks`（生命周期钩子）、`mcp`（MCP 客户端）、`memory`、`model`（多模型接入）、`plugin-reference`。外围是插件家族：`android-emulator-plugin`、`browser-use-plugin`、`bundled-skills`、`dynamic-workflow`……

三个与"移动化"直接相关的工程事实：

1. **产物是 Node.js bundle**，SEA（single executable application）打包可选——运行时依赖 Node 24（mise.toml 锁定）；
2. **插件经 plugin cache 播种**（`~/.zcode/cli/plugins/cache/`），官方插件由启动器改写清单以复用内嵌 Node（14 篇详述这个机制）——**对宿主环境有明确假设**；
3. **`zcode --web` 提供 Web 服务**——远控派的物质基础，也是 fork 改造的对象（11 篇）。

## 3. 标本二：DSH 的构造与它的桌面假设

DeepSeek Harness（`@deepseek-ai/dsh`，MIT）官方自述"为 glibc Linux 写的"。星渡与 DSHA 两个项目共同记录了它在 Android 上撞到的四堵墙：

1. **原生模块编译不过**：node-pty 等需要按 Android Bionic 工具链重编（星渡的解法是**借 Termux 的编译成果**——03 篇有一个重要修正）；
2. **`link(2)` 被 SELinux 挡住**：某些系统调用在 Android 的 SELinux 策略下不可用；
3. **沙箱起不来**：上游依赖的 Linux 隔离机制在应用沙箱里不可得；
4. **前端按桌面布局排版**：Web UI 的交互假设鼠标 + 宽屏。

清单的结构值得注意：前三条是**运行时层**的（02–07 篇的主战场），第四条是**呈现层**的（04/08 篇）。DSH 的 Web 服务 + Host/Origin 栅栏 + 会话 cookie 绑定，则是**远控派**全部安全设计的对手盘（10 篇的"三道门"）。

## 4. 为什么 PTY 是灵魂

shell 工具的执行为什么非要 PTY（伪终端）不可？因为 agent 的命令需要**交互语义**：vim 全屏刷新、进度条靠 `\r` 回写、Ctrl-C 要发信号、sudo 要提示密码。管道能拿到输出但拿不到"终端会话语义"。所以每个本机派项目都要解决"Android 上哪里来的 PTY"：

- Termux：自己编译的终端模拟器 JNI 体系；
- 星渡：**自研 `dsh_pty_exec.c` 助手 + node-pty 兼容层**——一个 386 行的独立可执行文件，用 fd-3 双向控制通道协议桥接引擎（03 篇完整走读这个协议）；
- DSHA：直接复用 Termux 的 terminal-emulator JNI 库（站在社区肩膀上）。

这也是 ZCode fork 选择远控派的直接原因之一：`node-pty` 锁定 Node 24 且假设 glibc——"Android 上直跑不现实"（其 README 原话，11 篇）。

## 5. 项目锚点：两个标本的"最小运行时清单"

| 依赖 | ZCode CLI | DSH | Android 上的麻烦 |
|---|---|---|---|
| Node 24 | ✅ 锁定 | ✅ 锁定 | Bionic 移植或 proot 提供 glibc |
| node-pty（原生） | ✅ | ✅ | 需要 PTY 助手 / Termux JNI |
| ssh2 等原生模块 | ✅ | 按插件 | 每个都要 Android 工具链重编 |
| glibc 假设 | 部分 | **是** | Bionic 不兼容 → proot 或逐个补丁 |
| Web UI | `--web` | `dsh web` | 桌面布局 + 现代浏览器 API |

**本机派的全部工程（02–07 篇）就是消灭这张表的后三行**；**远控派的全部工程（08–12 篇）是承认消灭不了、改走另一条路**。

## 6. 边界与不足

本章解剖以两个标本为准，Claude Code/OpenCode/Codex 的内部构造未逐一展开（闭源/另构），但"Node + 原生模块 + Web UI"的共性假设在它们的 Android 移植讨论（HN/Termux 社区）中同样出现。审批闸门的内核实现（`permission`/`hooks` 模块）只点到为止——它与移动审批 UI 的耦合是 06/08 篇的伏笔。

## 7. 一句话总结

> 编程 agent = 纯 JS 的内核 + 一堆假设 glibc 的原生模块 + 一个 Web UI。搬运难题 80% 在第二项，20% 在第三项——而解决方案分裂成本系列的两大派。

下一篇是本机派的地基：Android 的沙箱与运行时——为什么"在手机上跑个 Node"本身就是一道系统题。

---

**证据索引**：`apps/zcode-cli/README.md`、`packages/core/src/` 结构（Thy985/ZCode）；星渡 `UPSTREAM.json` 与 README 的四堵墙表述；DSHA README。
