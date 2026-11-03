# DSHA（上）——proot Ubuntu 进 APK

> 如果说星渡的答案是"借 Termux 的编译成果直跑 Bionic"，DSHA 的答案正好相反："把 Android 假装成 Linux"。APK 内置完整 Ubuntu 24.04 rootfs，用 proot 走 glibc——apt 能用、原生模块能编译、上游插件不用改。这一章用源码说话：ProotBootstrap、装机流水线，和一个由 79 个 Java 类组成的备份体系。

---

## 1. 为什么选 proot：一份兼容性账单

DSHA README 对动机的陈述极其直白：DSH 是为 glibc Linux 写的，直接上安卓"原生模块编译不过、`link(2)` 被 SELinux 挡住、沙箱起不来、前端按桌面布局排版"。四堵墙里前三堵都是运行时层的——proot 一次性全绕开（02 篇讲过 ptrace 机制）。

与星渡的对照就绪：**星渡借 Termux 编译成果逐依赖补丁换原生速度，DSHA 一个 proot 换全套兼容**。两条路都成立——选择变量是"你预期上游变化多快"。DSH 生态在快速长插件，上游兼容性权重高，proot 的账算得过来。

## 2. 源码形态：593 个 Java 类的壳

克隆 DSHA 仓库（`DSH-APP/DSHA`）后第一眼：`app/src/main/java` 下 **593 个 Java 类**，全部 Java（无一 Kotlin），包结构按领域组织。几个与本章直接相关的类：

- **`HarnessService.java`（718 行）**：引擎宿主——前台服务，持有 rootfs 目录、Web 端口、运行代数（`generation`），对应星渡的 DshService 但职责更重（还管受管更新与恢复）；
- **`ProotBootstrap`**：proot 启动的封装。`PtySession.start()` 的调用序列暴露了启动前的三步准备：`proot.requireUserRuntime()`（用户运行时就位）、`proot.ensureAndroidGroups()`（**"登录 shell 的 `$(groups)` 依赖 `/etc/group` 里有 Android GID"**——用户态虚拟化的缝隙靠手动缝合）、`proot.ptyLaunch()`；
- **`PtySession.java`（350 行）**：会话级 PTY 管理，`ProcessIdentity.isProot(argv[0])` 用进程身份区分"proot 内的进程"与"原生进程"；
- **`InstallPipeline.java` + `InstallProbe.java`**：装机流水线本体（§3）；
- **`backup/` 包：79 个类**——BackupManager、ColdInstallTransaction、EnvironmentRebuildTransaction、AutomaticBackupService……（§4）。

## 3. 装机流水线：六步、可恢复、先探测

README 描述的六步（解压 → 基础工具 → Node.js → pnpm → dsh → 补丁）落到源码是 `InstallPipeline` + `InstallProbe` 的组合，特征三条：

- **先探测再执行、装完即校验，只修失败项不从头重来**——流水线的幂等性设计；
- **分步重装**：rootfs、工具、Node、harness 相互独立可单独重装；"界面更新不重建环境，普通 dsh 更新不递增基础版本"——基础环境独立版本化；
- **离线工具链**：curl/git/Python/证书随包锁版本（`packages.lock.json`），apt 源官方/中科大镜像自动回退，DNS 三模式，"AAAA 被拒时仅重试解析、不重放 HTTP 请求"——中国网络环境的实战细节。

**双运行时**：默认 proot、可选自研 proroot，回退策略克制到代码级——"proroot 在鉴权前明确退出**且无插件故障**时，确认 guest 退出后仅重试一次 proot；慢启动不触发回退"。两个条件（鉴权前退出 + 无插件故障）把"兼容性失败"与"用户环境故障"区分开，避免把真问题当兼容问题重试掉。

## 4. 79 个类的备份体系

agent 的对话与工作区是用户最贵的数据。DSHA 的 `backup/` 包用 **79 个 Java 类**做了一个企业级子系统，README 的功能表在源码里都有对应物：

| 能力 | 源码对应 |
|---|---|
| v5 导出（无密码 .tar.gz 完整性归档） | `BackupArchive` + `DataFormatEvidence` |
| 自动备份（每天/间隔 1–168h/停止后） | `AutomaticBackupService` + `AutomaticBackupPruner` |
| 分范围备份（全量/对话/插件/设置） | `BackupSource` 家族 + `BackupPreview` |
| 凭据剔除（桥 token 整文件排除、.credentials.yaml 字段级剔除） | `CredentialFileBackupSource` + `CredentialProjection` |
| 换机恢复（先认证/摘要核验再预检，保留冲突原件） | `BackupTree` + `GuestDataResolver` |
| 坏会话隔离（corrupt-backup） | `CompletedHistory` + 事务类 |
| 冷安装/环境重建事务 | `ColdInstallTransaction` + `EnvironmentRebuildTransaction` |

两个设计判断值得学：**"事务"是这个子系统的核心抽象**（冷安装、环境重建都是带回切的事务，不是"覆盖了事"）；**凭据投影**（`CredentialProjection`）把"哪些字段属于本机密钥、哪些属于用户 API key"变成显式数据结构而不是散落的字符串过滤。

## 5. 双内核与共存

- **WebView 双内核**：Standard 用系统 WebView，Low 内置 GeckoView 143——"不受系统 WebView 版本拖累"，双 APK 各发各的；
- **新旧共存**：新包名 `dsh.android.client` 与旧 `com.dsh.client` 并排安装，数据授权独立，备份导出/恢复迁移，"同时运行两套服务仍可能遇到设备端口冲突"写进发布说明。

## 6. 边界与不足

proot 的性能开销依赖设备与 I/O（DSHA 自己拒绝排名引擎："实际性能取决于设备、I/O、缓存和插件，不以历史异条件样本给引擎排名"）；Android 11+ 门槛（星渡 8.0+）；ptrace 依赖内核允许追踪，强化版 ROM 可能受限；"正式终端允许修复 shell"与插件自动安装在安全模型里明确标注"自动安装不是独立安全认证"（06 篇展开）。

## 7. 一句话总结

> 第二种答案：一个 proot 换整套 glibc 兼容，把工程力气花在用户感知不到 Linux 的地方——幂等的装机流水线、事务化的更新与备份、79 个类守着用户最贵的对话数据。

下一篇看 DSHA 更激进的部分：设备能力桥——用 `DeviceShellPolicy` 的类型化白名单让 agent 拥有这台手机。

---

**证据索引**：`app/src/main/java/com/deepseekharness/app/{HarnessService,PtySession}.java`、`runtime/InstallPipeline.java`、`util/InstallProbe.java`、`backup/`（79 类）、`ProotBootstrap`（ensureAndroidGroups）；README"核心模块"表。
