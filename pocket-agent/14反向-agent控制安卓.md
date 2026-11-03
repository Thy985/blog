# 反向——Agent 控制安卓：模拟器插件解剖

> 本系列至此都在回答"agent 怎么上手机"。还有一个反向家族被忽略了：**agent 坐在桌面上，安卓是它手里被调试的对象**——ZCode 官方的 `android-emulator-plugin` 让 agent 构建、安装、截图、检查 UI、读日志，把整个安卓开发循环变成它的工具箱。这一章解剖这个插件，它同时也是"工具设计"的一堂小课。

---

## 1. 插件的解剖

`apps/zcode-cli/packages/android-emulator-plugin/` 的目录本身就是 ZCode 插件体系的教程：

```
.zcode-plugin/plugin.json    # 插件元数据（名称、版本、入口声明）
.mcp.json                    # stdio MCP 服务器声明
skills/android-dev/SKILL.md  # 模型工作流（技能）
commands/android-dev.md      # 斜杠命令
src/mcp/server.ts            # MCP 服务器本体
src/providers/               # 能力层：avd / device / build / screenshot / ui / logs / app / sdk / preflight / project
templates/compose-app/       # 项目模板
```

四个概念的分工：**plugin.json** 声明"我是谁"；**MCP 服务器**暴露"我有什么工具"（Model Context Protocol，stdio 传输）；**SKILL.md** 教模型"该怎么用这些工具"（工作流知识）；**providers** 是工具的实现层。**知识（SKILL）与能力（MCP）分离**——同一个 MCP 服务器配不同 SKILL，就是不同工作流。

## 2. 装载机制：插件如何进入会话

README 记录了 ZCode 的插件分发链路（对理解"宿主假设"很有用）：

1. 用户启用 `android-emulator@zcode-plugins-official`；
2. ZCode 启动时把插件文件播种到 `~/.zcode/cli/plugins/cache/zcode-plugins-official/android-emulator/<ver>/`；
3. **SEA 构建（单可执行文件）会改写官方插件的 manifest，让 MCP 服务器经由 ZCode 内嵌 Node runtime 启动**——第三方插件不被自动改写，保留自己声明的启动命令；
4. stdio MCP 服务器被 CLI 以子进程拉起。

第 3 步值得停一下：**宿主为插件解决运行时**——插件的 MCP 服务器不需要用户装 Node，因为宿主把内嵌 runtime 借给它。这与本机派"给 agent 找运行时"是同一个问题反过来了：**插件跟着宿主走，运行时由宿主供给**。

## 3. providers：一整套"安卓开发"工具箱

`src/providers/` 的文件清单就是 agent 能做的事：

- `avd.ts` / `device.ts`：管理模拟器（AVD 创建/启动/快照）与设备连接；
- `build.ts` / `project.ts` / `project-template.ts`：构建 APK、脚手架新项目（Compose 模板）；
- `screenshot.ts` / `ui.ts`：截屏与 UI 状态检查——agent 的"眼睛"；
- `logs.ts`：logcat 读取——agent 的"耳朵"；
- `preflight.ts`：**前置检查**（SDK 在不在、模拟器起没起）。

工具设计的两个亮点：

- **preflight 独立成 provider**：把"环境前提检查"做成一等工具，让模型在行动前先问"我准备好了吗"——比在每次构建失败后再排查日志便宜得多；
- **面向状态机设计**：模拟器是有状态对象（启动中/在线/快照恢复），工具集按生命周期组织而非按命令组织——这是有状态资源的 MCP 工具设计通则。

## 4. 知识内核：MCP 工具设计的三条通则

从这个插件可以抽出给任何"agent 控制有状态系统"的工具设计通则：

1. **状态查询与状态变更分离**：`screenshot`/`logs`（只读）与 `build`/`avd create`（变更）是不同工具，模型可以先看后动——与 06 篇 DSHA 白名单的 READ/FILE/STOP 分类同源；
2. **前置检查作为独立工具**：preflight 让"环境假设"显式化；
3. **工作流知识与能力分离**：SKILL.md 承载"先 preflight → 再起 AVD → 再 build → 失败看 logs"的顺序知识，MCP 只管原子能力——**换工作流不用改工具，换工具不用改文档**。

这三条与 reverse-proxy 系列"协议/语义/行为分层"、embodied-ai 系列"技能五要素"是同一设计品味的不同实例。

## 5. 与本系列的镜像关系

把镜像画出来，两个家族完美对偶：

| | 本系列主线（agent 上手机） | 本篇（agent 管安卓） |
|---|---|---|
| agent 位置 | 手机内（本机派）或模型端（操机派） | 桌面 |
| 安卓的角色 | 宿主 / 被操控的身体 | **被开发的产品** |
| 连接方向 | 手机 → PC/模型 | 桌面 → 模拟器 |
| 通道 | Web/隧道/设备桥 | MCP stdio + adb |
| 关键难题 | 运行时移植、安全边界 | 状态管理、前置检查 |

对偶之外有一个合流点：`screenshot`/`ui` 两个 provider 与操机派（13 篇）的"读屏"能力同源——同一个"看懂安卓屏幕"的技术，向上服务 agent 操机，向下服务 agent 开发。

## 6. 边界与不足

模拟器 ≠ 真机：传感器、性能、厂商 ROM 差异都不在插件的覆盖面里；插件假设宿主机装有 Android SDK（preflight 只检查不安装）；CI 场景（无头模拟器农场）需要额外编排，插件不管；MCP 工具粒度较粗（一次 build 可能是分钟级动作，超时与进度反馈依赖 CLI 层约定）。

## 7. 一句话总结

> "agent 管安卓"与"agent 上手机"互为镜像——而镜像照出的共同原理是：给模型工具时，把状态查询与变更分离、把前置检查显式化、把工作流知识与原子能力分层。

下一篇收拢全系列：决策表与总结。

---

**证据索引**：`apps/zcode-cli/packages/android-emulator-plugin/README.md`、`.zcode-plugin/plugin.json`、`.mcp.json`、`src/providers/` 与 `src/mcp/server.ts` 结构（Thy985/ZCode）。
