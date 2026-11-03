# Android 的沙箱与运行时——为什么"跑个 Node"是道系统题

> 在 Linux 服务器上 `npm install && node index.js` 天经地义；在 Android 上，这句话的每个词都是坑。这一章讲清三件事：Android 的安全模型为什么禁止你 exec、Bionic 和 glibc 的差异为什么致命、proot 如何用 ptrace 在用户态"伪造"一个 Linux 世界。

---

## 1. W^X 与"应用数据目录不可执行"

Linux 服务器上你可以在任何目录放二进制并执行。Android 不行：

- **W^X（Write XOR Execute）**：Android 10（API 29）起，`targetSdk >= 29` 的应用**禁止执行应用数据目录里的任何二进制**——防恶意软件的核心防线：数据区可写，可写区不可执行；
- **合法执行位只有一处**：`nativeLibraryDir`（APK 里 `jniLibs` 打包的 `.so`）——系统认为"随 APK 签名分发的原生库"才是可信代码；
- **targetSdk 28 的窗口**：把 targetSdk 压在 28 可以继续在数据目录 exec——这是星渡当前架构的立足点，也是它"sideload 兼容性折中、不是商店发布方案"的原因（07 篇：Play 2026-08 起要求 targetSdk 36，此路在商店渠道已死）。

正确的长期解是**把二进制放进 jniLibs**（伪装成 `.so` 由安装器解到 nativeLibraryDir）——星渡 ROADMAP 已把迁移列为 0.3.0 必做。Termux 的做法正是如此。

## 2. Bionic vs glibc：一堵看不见的墙

Android 的 C 库是 **Bionic**，不是桌面 Linux 的 glibc。对"跑 Node 生态"这意味着：

| 假设 | glibc 世界 | Android/Bionic 现实 |
|---|---|---|
| 动态链接器 | `/lib64/ld-linux-x86-64.so.2` | `/system/bin/linker64`，搜索路径完全不同 |
| 系统调用包装 | glibc 私有实现 | Bionic 自己的一套，部分调用缺失/受限（`link(2)` 被 SELinux 挡——DSHA README 点名） |
| 预编译原生模块 | npm 下载 .node 文件直接用 | 全部要按 NDK/Bionic 工具链重编 |
| `/etc/resolv.conf`、`/usr` 等 FHS 路径 | 存在 | 不存在 |

所以 **glibc 编译的 Node 在 Android 上无法直接加载**。星渡的解法不是自己重编 Node，而是**从 Termux 官方 apt 仓库收集 Bionic 版依赖闭包**——这个"借力"的决策在 03 篇详述（我第一版写作时误写为"NDK 重编"，读 `build-runtime.sh` 后修正——这正是源码级阅读的价值）。

## 3. proot 的机制：ptrace 用户态虚拟化

proot 的原理值得讲透，因为它是 DSHA（05/06 篇）的地基：

**proot 是一个用 `ptrace(2)` 实现的用户态虚拟化器。** 它以追踪者身份启动目标进程，拦截每一次系统调用：

1. **路径翻译**：目标进程以为自己访问 `/etc/apt/sources.list`，ptrace 处理器把路径改写成 `rootfs/etc/apt/sources.list`（rootfs 是打包进 APK 的 Ubuntu 根文件系统）——整个 Ubuntu 目录树"贴"在 Android 沙箱里的一个子目录上；
2. **语义修补**：对 Bionic 缺失或行为不同的调用做 shim，让 glibc 程序以为自己在标准 Linux 内核上；
3. **假身份**：`getuid()` 等调用被改写，proot 让 guest 相信自己是 root——**但这是 ptrace 层的障眼法，不是真实特权**（DSHA 安全模型把它列为"不能推导的保证"第一条："proot 的 root 不是 Android root"）。

代价与收益都源于这个机制：**收益**——glibc 一切照旧、apt 可用、上游零改动，不需要内核模块或 root；**代价**——每个系统调用两次上下文切换 + 路径翻译检查，I/O 密集和进程密集负载有明显开销，且 **ptrace 依赖内核允许追踪**（部分强化版 ROM 的 SELinux 会限制 ptrace，这是"兼容结果依机型"的根源之一）。

一个精妙的细节来自 DSHA 源码：`PtySession.start()` 在拉起 PTY 前调用 `proot.ensureAndroidGroups()`——"登录 shell 的 `$(groups)` 依赖 `/etc/group` 里有 Android GID"。proot 里的 Ubuntu 进程要能映射回 Android 的真实 UID/GID，必须在 rootfs 的 `/etc/group` 里补上 Android 的组定义——**用户态虚拟化的缝隙，全靠这类手动缝合**。

## 4. 剩下的系统课：让服务活着

agent 是长驻 Web 服务，Android 对后台进程有完整的"消灭机制"：

- **前台服务（foreground service）**：常驻通知换取不被随手回收——星渡的 `DshService` 和 DSHA 的看门狗都靠它；
- **Doze/电池优化**：息屏后网络与 CPU 被收紧——DSHA 的发布说明明确"不承诺完整 Doze/功耗验收"，这是诚实；
- **进程被杀后的恢复**：文件锁防双开（星渡 `DshService` 的 FileLock）、看门狗自动拉起（DSHA）、启动自检（dsh-phone-access 在远控侧做同样的事，09 篇）。

## 5. 项目锚点：同一道题的三个答案

| | 星渡 | DSHA | Termux |
|---|---|---|---|
| exec 位置 | 数据目录（targetSdk 28 窗口） | proot 内（ptrace 执行） | nativeLibraryDir + 自建仓库 |
| libc | Bionic（Termux 编译成果 + 补丁） | glibc（proot 提供） | Bionic（自建编译体系） |
| 代价 | 逐依赖补丁、targetSdk 锁死 | proot 开销、包体 278MB | 用户动手门槛 |
| 得到 | 原生速度、无发行版层 | apt 全套、上游零改动 | 完全自由 + 社区惯例 |

**演进注记**：星渡 ROADMAP 把"二进制迁移到 nativeLibraryDir"列为 0.3.0 必做——targetSdk 28 窗口是被发布渠道逼出来的临时架构，不是设计信仰。

## 6. 边界与不足

无论选哪条路，**同 UID 的代码之间没有隔离**——proot 的"root"不是 Android root，Ubuntu 里的进程和 Android 应用共享 UID（DSHA 安全模型"不能推导的保证"第一条，12 篇展开）。SELinux 策略因厂商 ROM 而异，`link(2)` 这类坑在部分机型上表现不同；ptrace 可用性同样依机型——两个项目都只能按"验证过的机型清单"说话。

## 7. 一句话总结

> Android 用 W^X + Bionic + SELinux 三道墙把"跑个 Node"变成系统题：proot 用 ptrace 障眼法穿墙（代价是每个系统调用的翻译税），Bionic 借力用蛮力穿墙（代价是逐依赖补丁），targetSdk 28 是一扇随时会关的窗。

下一篇进第一个案例：星渡怎么借 Termux 的编译成果把 825MB 运行时装进 APK，以及那个 386 行的 PTY 助手协议。

---

**证据索引**：星渡 `ROADMAP.md`、`scripts/runtime/build-runtime.sh`（Termux apt 收集）；DSHA `PtySession.java:101`（ensureAndroidGroups）、`docs/security-model.md`；星渡 `DshService.java`。
