# DSHA（下）——设备桥："手机就是 agent 的手"

> agent 跑在手机里之后，顺理成章的问题来了：它能操作这台手机吗？DSHA 的答案是一座设备能力桥——无障碍读屏、ADB 无线直连、独立虚拟屏，挂在本机 127.0.0.1:3090 上供 agent 调用。上一章讲的是 README 层；这一章读源码：`DeviceShellPolicy` 的类型化白名单到底怎么写的。

---

## 1. 白名单本体：DeviceShellPolicy

`util/DeviceShellPolicy.java` 的类注释就是设计宣言：

> **设备命令默认拒绝：只接受可完整识别的单条 argv，不执行用户提供的 shell 程序。**

三个词值得停顿：**默认拒绝**（fail-closed，没有兜底放行）、**完整识别的单条 argv**（不是字符串模式匹配——无法解析 = 拒绝）、**不执行用户提供的 shell 程序**（堵死"用 sh -c 绕过白名单"的经典逃逸）。

结构是类型化的两级判定：

```java
public enum Kind { READ, FILE, STOP, SENSITIVE_READ, VIRTUAL_SCREEN, DENY }

public static final class Plan {
  public final Kind kind;
  public final List<String> argv, operands;
  public final String reason;
  public boolean allowed() { return kind != Kind.DENY; }
}
```

`inspect(command)` 把任意命令解析成一个 `Plan`——要么归类为五类合法操作之一（带解析出的 argv），要么 `DENY`（带 reason）。名单是显式的常量集合：

- **READ**（约 40 个只读命令）：id whoami pwd uname ps ls cat grep stat df free …
- **BLOCK**（约 50 个破坏性命令，**命中即拒**）：dd mkfs fdisk parted setenforce mount reboot shutdown flash …
- **FILE**（7 个）：mkdir touch cp mv rm rmdir rename
- **PROTECTED 路径**：`/dcim`、`/pictures`、`/android/data`、`/android/obb`（及祖先）
- **SMS_PROVIDER**：`com.android.providers.telephony`（短信库，独立敏感能力）

`DeviceShellExecutor` 消费 Plan：`plan.allowed()` 不通过返回 reason + `[EXIT=126]`；`Kind.SENSITIVE_READ`（短信）即使走 ADB 通道也被拦——"[POLICY_BLOCKED] 短信读取请使用 ADB 通道，并在 DSHA 授权"（独立授权闸门在更前面）；`Kind.STOP`（杀应用）的实现里藏着一个精彩细节，见下一节。

## 2. 一个细节看工程深度：kill 的 PID 复用防护

`DeviceShellExecutor` 处理 STOP 命令时**不用 PID 直接杀**：

```java
String processes = plan.command().equals("kill")
    ? checked(runner.run(Arrays.asList("ps", "-A", "-o", "PID,UID,NAME"))) : "";
targets = snapshot.targets(plan, processes);   // PID → 包名解析
// 按包名操作，避免检查完 PID 后号码复用而误伤系统进程。
String result = runner.run(Arrays.asList("am", "force-stop", target));
```

检查"这个 PID 是谁"到"执行杀"之间有时间窗——**期间进程可能退出、PID 被系统复用**，直接 `kill <pid>` 会误杀无辜（甚至系统进程）。解法：先 `ps -A` 拿全表，把 PID 解析成包名，再用 `am force-stop <package>` 按包名杀——把 TOCTOU（检查-使用竞态）的窗口从"进程生命周期"缩小到"包名不变"。

配套的错误语义也分层：`[EXIT=126]` = 策略拒绝（fail-closed），`[EXIT=125]` + `[EXECUTION_UNKNOWN]` = 执行结果未知（取消）——**agent 能从退出码区分"不允许做"和"不知道做成没有"**，后者不应重试前者不应放弃。虚拟屏则走独立的类型化入口：`executeVirtualScreen` 注释明写"used only by VirtualScreenManager, **never by generic shell text**"——特权能力不走字符串通道。

## 3. 无障碍服务：结构化读屏

`DshaAccessibilityService.java`（563 行）实现屏幕操作（无需 ADB）：读屏结构化输出（**带可点击区域坐标**）、按文字/坐标点按、输入、滑动、截屏。这是 14 篇操机派"第一代栈"（结构化感知）的实现——对比视觉端到端（截图→多模态模型出坐标），无障碍树把"语义层的活"提前做掉，可靠且可审计，代价是能力上限锁死在无障碍树的信息里。

桥本身（`DeviceBridgeService.java`，644 行）挂在本机 `127.0.0.1:3090`，X-Token 请求头门控，`/app/help` 提供完整端点清单。文件侧用 `DeviceFileCore`/`DeviceFileOperations`：设备写仅允许策略认可的共享存储子路径及 `/data/local/tmp/`，**凭据区（`.dsh`/`.ssh`/`.android`）读写均被拒绝**；文件操作要求精确调用格式（`--package <name> --uid <n> --`），格式不符直接 `FILE_INVOCATION_INVALID`。

## 4. 安全模型文档：不能推导的保证

DSHA 的 `docs/security-model.md` 是全系列最好的安全文档，两个设计值得单独抄录：

**"不能推导的保证"列**（信任边界表每行两列）：

| 边界 | 实际保证 | 不能推导的保证 |
|---|---|---|
| Android 应用 UID | 系统隔离其他普通应用的私有数据 | **proot 的 root 不是 Android root** |
| Ubuntu 与插件 | 包、路径、实际摘要和事务核验 | **同 UID 任意代码不是独立沙箱** |
| loopback 桥 | 当前 token、路由与能力约束 | **本机 TCP 不等于只有本应用能连接** |
| 内嵌页面 | 当前来源、实际端口、页面和运行代次 | 不能批准任意网页、旧回调或摄像头 |

第二列提前否定读者最可能做出的危险外推——安全文档的可信度不在说了多少"做到了"，在敢写多少"推不到"。

**已知缺口公开**。2026-10-22 对某提交的核查发现：递归 READ 只核验顶层参数和 canonical 路径，**未核验遍历中子链接指向的目标**——"`grep -R` 等跟随链接的读取不能据此获得『整个 telephony 树不可达』的保证；这仍是待修实现问题"，同时记录"隔离策略检查证明派发前缺少该项核验，**未读取真实手机短信，也未证明某 ROM 能被实际利用**"。发现、影响范围、已验证未发生、修复去向（指向权限架构文档 §6.2），四件事一次说清。

## 5. 边界与不足

虚拟屏是实验性（Android 11+ 且需先授权 ADB/Shizuku/Root）；无障碍服务"可接收其他应用窗口事件"（文档自己标注的暴露面）；截图"不能声称完全不落盘"；proot root 与同 UID 代码无隔离；**符号链接递归读缺口在写作时点仍待修**；跨厂商 ROM 行为差异只能逐机型验证。

## 6. 一句话总结

> 白名单守门人的正确形态是"默认拒绝 + 类型化 Plan + 完整识别的 argv"——再加上 PID 复用防护、分层退出码和一张"不能推导的保证"表，"手机就是 agent 的手"才从口号变成权限工程。

下一篇离场本机派，看所有本机派应用都绕不开的商业问题：这样的应用怎么发布？

---

**证据索引**：`util/DeviceShellPolicy.java`（类注释、Kind/Plan、READ/BLOCK/FILE/PROTECTED/SMS 名单）、`DeviceShellExecutor.java`（STOP 的 PID 复用防护、EXIT=126/125）、`DeviceFileCore.java`（调用格式校验）、`DshaAccessibilityService.java`（563 行）、`DeviceBridgeService.java`（644 行）、`docs/security-model.md`。
