# ZCode 案例——产品化远控壳 vs 社区插件动物园

> DSH 远控生态是 15 个小插件的"动物园"——每层可换、组合自由。ZCode 官方的安卓壳走了另一极：一个集成的产品壳。我的 fork（单提交）则展示了把"远控演示壳"打磨成"日常可用客户端"需要补哪些东西。这一章用源码说话：三个核心文件的真实设计，比上一轮写作时的提交信息转述深一层。

---

## 1. 官方壳的定位与它的"不能"

上游 `zai-org/ZCode`（Apache-2.0，v3.16.2）的 `packages/android` 是真实能跑的安卓工程，但 README 自我定位是"**远控壳**"：只认 `https://zcode.z.ai/remote`，桌面 UI 直接塞 WebView；`allowFileAccess=false`、无 `onShowFileChooser`——"网页附件按钮点了没反应"；`window.open` 静默失败；无缩放、无小屏适配。

## 2. 信任模型实码：RemoteControlUrlPolicy 的类型化判定

`RemoteControlUrlPolicy.kt`（227 行）是 fork 信任模型的核心，它的头注释记录了一次**从硬编码到模型的演进**（原话要义）：

> Bugfix: 原实现把"能不能打开"写成硬编码的 zcode.z.ai + /remote 路径判断，自托管 `zcode --web` 的入口在 `/` 且端口随用户，正式包一律被拒。现在改成**端点钉住模型**：只信任用户显式添加过的 origin，**未知来源不直接拒绝**、而是交给界面发起一次"是否信任此后端"的确认，确认后写入配置再放行。

模型落成 Kotlin 的 sealed interface——**三种判定结果各自是类型，不是布尔值**：

```kotlin
sealed interface TrustDecision {
    data class Pinned(val endpoint: ZCodeEndpoint, val loadUrl: String)      // 命中已保存端点
    data class NeedsTrust(val uri: Uri, val token: String?, val cleartext: Boolean)  // 需用户确认
    data class Invalid(val raw: String?)                                     // 地址不合法
}
```

对比 DSHA 的 `DeviceShellPolicy`（06 篇）：两者都是"解析 → 类型化判定 → 分类处置"，差异在**未知来源的处置**——设备命令 fail-closed（未知 = 拒绝），URL 准入给用户一次显式确认机会（NeedsTrust 是合法判定，不是拒绝）。**fail-closed 不等于凡事都拒，而是"每一类未知都有明确的处理类型"**。

官方 relay 的授权域也是硬编码白名单，且注释解释了**为什么必须放开**（原话要义）：上游 `packages/web/src/auth/webZaiOAuthConfig.ts` 里 relay 登录走 `chat.z.ai/api/oauth/authorize` 与 `bigmodel.cn/login`，回跳固定是 `zcode.z.ai/remote/v4`——"不放开这条，扫桌面二维码后会停在 auth-required——授权页被当成外链丢给系统浏览器，WebView 里拿不到会话 cookie，**配对永远完不成**"。白名单的每一项都挂着上游文件引用。

## 3. 可用性实码：MobileAdaptation 的"CSS 可靠性论证"

`MobileAdaptation.kt`（170 行）的头注释是本仓库最好的工程写作，它回答了一个问题：**壳层为什么只做"CSS 可靠做到的部分"**（原话要义）：

> 自托管 `zcode --web` 的根路由是桌面工作区，上游只在 `/remote/v4` 那套手机壳里做了窄视口重组……根路由什么都没做：264px 侧栏 + `min-w-[320px]` 主栏 + 右侧面板直接塞进 412px 屏。
>
> 这里只做 CSS 可靠做到的部分。**布局的百分比尺寸由 react-resizable-panels 用 JS 写内联 style，上游在 `WorkspaceShellLayout.tsx:2363-2372` 明确记过：用 CSS 把对话列 flex 压成 0，库按各 panel 的 offsetWidth 求和算 group 尺寸，展开收起时两者皆 0，resize 得到 NaN，面板永久停在收起态。所以"把三栏重排成单列"必须在 packages/ui 里做，壳层硬来一定会留下修不完的洞。**
>
> 能可靠做的依据：侧栏折叠态本来就是纯 CSS（`opacity-0` + `pointer-events-none`，组件不卸载），我们接管它的定位与可见性不违反应用的状态机；主栏的 `min-w-[320px]` 是静态类；`--ui-font-size` 是 `:root` 上的单个变量（`packages/ui/src/styles.css:76`）。

这段注释的价值在**反方向的克制**：它不是"我们能做什么"的清单，而是"什么必须不做"的证明——每条"能做"都引用上游源码的具体位置（组件不卸载、静态类、单变量），每条"不能做"都引用上游记录过的失败模式（offsetWidth 求和 → NaN）。注入守卫同样在类型里：`appliesTo(endpoint, desktopMode) = !desktopMode && endpoint.kind == SelfHosted`——**官方 `/remote` 页上游已按手机写过，不叠第二层**（04 篇星渡"贴官方契约组合"的同源纪律，且更进一步：上游没坏的都不碰）。

## 4. 六组改动全景与安全档位

提交信息里的完整清单（12 篇旧版已列，此处只补源码锚点）：

- **多后端**：`ZCodeEndpointStore` 端点 profile；自建 origin 显式信任、`http://` 单独 opt-in、mixedContent 按端点设置——**每个端点一份安全档位**（`ZCodeEndpoint.Kind.SelfHosted` vs Official 是类型成员，不是字符串标记）；
- **relay 配对**：JWT 换一次性 token 的受限登录通道——仅 Official 端点、强制 https、origin 白名单 `chat.z.ai`/`bigmodel.cn`、跳转链校验（§2 的注释即出处）；
- **附件/分享**：FileProvider `content://`（`allowFileAccess` 保持 false）、`clipboard-sanitized-write`；
- **token 卫生**：通知/intent 脱敏、`onPause` flush CookieManager、退出清 cookie + WebStorage（`web/ZCodeWebViewHost.kt`）；
- **构建**：`ai.zcode.mobile`、单 ABI（MLKit .so）、环境变量签名。

## 5. 架构决策的反面：为什么不做本机派

fork README 原话：

> Agent 仍然跑在 PC 或服务器上，手机是客户端。不是把 Node 后端塞进手机——**上游 server 依赖 `node-pty`、`ssh2` 等原生模块并锁定 Node 24，Android 上直跑不现实**。

本系列的分界线：ZCode server 的依赖面使"塞进手机"成本失控，且长会话开发的使用重心天然在 PC——**远控不是退而求其次，是针对这个依赖结构的正确答案**。星渡/DSHA 面对同样的 Node+pty 依赖选择硬啃（03/05 篇）——选哪条取决于你愿意付哪种成本（15 篇决策表）。

## 6. 一体化壳 vs 社区动物园

| | ZCode 产品化壳（+fork） | DSH 社区动物园 |
|---|---|---|
| 形态 | 单壳集成三层 | 每层独立小项目自由组合 |
| 升级路径 | 跟上游版本走（versionName 跟随 3.16.2） | 各项目独立节奏 |
| 安全模型 | 端点级档位内建于壳 | 网关/通道/UI 各管一段 |
| 定制自由 | 改壳代码 | **换任意一层而不动其余** |
| 门槛 | 装 App 即用 | 理解三层栈后组装 |

没有高下：**动物园的对抗性优势是"任何一层坏了换一层"**，**壳的优势是"安全和体验的一致性"**（端点信任、token 卫生、移动适配在一个代码库里互相咬合）。

## 7. 边界与不足

单提交、无真机测试矩阵；`MobileAdaptation` 的 CSS 注入依赖上游 className 稳定性（`opacity-0`/`min-w-[320px]` 变更即失效）——与星渡的 `data-dsh-*` 契约同一种税；受限登录通道的 origin 白名单硬编码（上游 OAuth 域变更需发版）；未做 iOS 对应物；versionName 跟随上游意味着长期维护依赖 rebase 纪律。

## 8. 一句话总结

> 产品化壳的日用化不是堆功能，是三段论证写进代码注释：信任判定类型化（每个未知来源都有明确处置类型）、可用性改造先证明"CSS 可靠做到的部分"是哪些、每个白名单项挂着上游文件引用——贴着上游契约做组合，连"不做什么"都给出 file:line 的理由。

下一篇把本系列出现过的四种信任模型摆上同一张解剖台。

---

**证据索引**：`packages/android/app/src/main/java/ai/zcode/mobile/remote/RemoteControlUrlPolicy.kt`（227 行，sealed TrustDecision、OFFICIAL_AUTH_ORIGIN_KEYS 注释）、`web/MobileAdaptation.kt`（170 行，CSS 可靠性论证）、`remote/ZCodeEndpointStore.kt`、`web/ZCodeWebViewHost.kt`；fork 提交 `22f9bbbd`；`packages/android/README.md`。
