# 星渡（下）——WebView 移动化与策略即代码

> 引擎在手机里跑起来只是上半场。下半场是两个更容易翻车的问题：桌面上设计的 Web UI 怎么在小屏可用？手机存储模型怎么和 agent 工作区对接？星渡的答案是一个有纪律的适配层、一套"策略即代码"的安全壳，和一个 8 行的路径守卫。

---

## 1. 适配层的纪律：不碰官方内部状态

`mobile-shell/src/client.js` 开头的注释值得整段引用：

> Independent Android-only composition. **No React internals, DOM reparenting, synthetic clicks, native bridge or private store writes.**

即：移动适配层不侵入官方 Web UI 内部——不摸 React 私有状态、不搬 DOM、不伪造点击、不开原生桥。它做的是**组合**：用 React 写自己的 MobileChrome 组件，通过**官方暴露的 DOM 属性**（`data-dsh-mobile-frame`、`data-dsh-android-mobile`）和**官方公开服务**（`sidebarRight.mounted.subscribe`）读状态，用 `matchMedia('(max-width: 600px)')` 驱动窄屏切换。

为什么不直接改官方 UI？因为官方 UI 会升级——**建立在官方公共契约上的适配层，升级时只需重验契约；建立在私有内部上的适配层，升级即崩**。11 篇的 ZCode fork 会给出同一条纪律的更精细版本（连"上游已经适配过的部分都不重复加工"）。

配套的 `patch-webview-polyfill.py`（03 篇）解决另一半：旧系统 WebView 缺现代 Web API，靠 polyfill 补齐。

## 2. SAF：Android 存储模型 vs agent 工作区

agent 的工作区假设是"一个可自由读写的目录树"；Android 现代存储模型（Scoped Storage）不给你这个自由——沙箱外文件要走 **SAF（Storage Access Framework）** 的系统选择器授权。

星渡的 `SafTransferController`/`WorkspaceTransfers`/`SnapshotExportPlan` 实现了一套**快照式**文件桥（README 原话"不是实时挂载或双向同步"）：

- **导入**：系统文件选择器导入文件副本、导入文件夹快照；
- **导出**：单文件另存为、向原授权文件夹导出新副本；
- **明确不承诺**：实时挂载、双向同步。

为什么不做实时挂载？SAF 的流式访问模型与 Linux 文件语义（随机读写、mmap、inotify）有根本错位——强做实时挂载会把不一致问题埋进 agent 的每一次文件操作。**把边界写在 README 第一屏**，与 DSHA 的"画中画默认关闭"（05 篇）是同一哲学。

## 3. 策略类走读：ZipPathPolicy 的 8 行

星渡的"策略即代码"最好用一个完整类来展示——`ZipPathPolicy.java`，全文 8 行有效代码：

```java
/** Pure validation for ZIP entry names; no filesystem access. */
public final class ZipPathPolicy {
  private ZipPathPolicy() {}

  public static boolean isSafe(String name) {
    return name != null
        && !name.startsWith("/")        // 绝对路径
        && name.indexOf('\\') < 0       // Windows 分隔符
        && name.indexOf('\0') < 0       // 空字节截断
        && !name.equals("..")
        && !name.contains("../");       // zip-slip 目录穿越
  }
}
```

这个类示范了策略代码的四个品质：**纯函数**（注释明说 "no filesystem access"——无 I/O 即无副作用即无时序坑）、**每个条件对应一个已知攻击**（绝对路径逃逸、Windows 分隔符、空字节截断、zip-slip）、**私有构造器**（不可实例化的策略命名空间）、**可单测**（`SecurityHelpersTest` 直接锁行为）。解压 825MB 运行时的安全，建立在这 8 行上——安全代码不需要长，需要每个字符都有理由。

同族策略还有 `UrlPolicy`/`RemoteUrlPolicy`（URL 准入）、`LocalOriginPolicy`（loopback 来源判定）、`HomeStatePolicy`（主页状态机）、`ScreenPrivacy`（截图保护：默认开、确认风险后放开、本机与远程共用开关）——Activity/Service 只做装配，安全决策全部在可单测的纯类里。

## 4. 远程模式的留白

星渡同时提供远程入口：粘贴自有 DSH 主机的启动 URL 即可连接。README 的边界写得像法律条文："网络需先由系统建立，**应用不创建 VPN、不配置远端 DSH，也不开放主机公网端口**"。局域网连通已真机验收；Tailscale 连通**尚未验证**，屏幕隐私的系统级行为"仍无单独验收结论"——测试归档按版本存放在 `tests/validation/`。

对照 DSH 远控生态（08–10 篇）：星渡把"公网怎么到"整体外包给用户（自己配 Tailscale/网关），App 只守端点策略——**这是安全层的一种合法形态：承认自己不做，并说清楚谁来做**。

## 5. 演进注记

适配层策略有一个隐含风险：官方 Web UI 如果改掉 `data-dsh-*` 属性或 `sidebarRight` 服务签名，适配层**静默失效**——没有测试能锁住"上游不破坏契约"。ROADMAP 的应对是把 CI 和验证加厚放在架构迁移之前，但"上游契约稳定性"不在星渡控制内——这是所有"贴官方组合"路线的共同税，11 篇 ZCode fork 会展示同一条税的另一种缴法（versionName 跟随上游 + rebase 策略）。

## 6. 边界与不足

SAF 快照式桥对"agent 改文件 → 系统相册立即看到"类场景缺失（要手动导出）；适配层只覆盖 `max-width: 600px` 一个断点（平板形态未做）；策略类的威胁模型没有成文 ADR（对比 DSHA 的威胁模型文档，12 篇的差距项）；多窗口/分屏下的 WebView 行为未验收。

## 7. 一句话总结

> 移动化的下半场拼的不是功能是纪律：适配层贴公共契约组合而不碰内部，文件桥诚实承认快照而非实时，安全壳落成"每个字符都有理由"的策略类——8 行的 ZipPathPolicy 守住 825MB 的解压。

下一篇换一个案例：DSHA 用 proot Ubuntu 走了完全不同的路——看它的 ProotBootstrap 和 79 个类组成的备份体系。

---

**证据索引**：`mobile-shell/src/client.js`（头注释与组合逻辑）、`app/src/main/java/.../ZipPathPolicy.java`（全文）、`SafTransferController.java`/`WorkspaceTransfers.java`/`SnapshotExportPlan.java`、README"能做什么"表与验证状态节、`patch-webview-polyfill.py`。
