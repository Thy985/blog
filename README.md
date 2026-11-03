# Blog

个人技术学习笔记，按系列组织。每个子目录是一个独立主题系列。

## 系列目录

| 系列 | 说明 |
|------|------|
| [weather-recognition](weather-recognition/) | 天气图像四分类 CNN 项目的完整复盘 |
| [reverse-proxy](reverse-proxy/) | 逆向反代网关：从协议逆向到账号治理的完整方法论 |
| [prime-rl](prime-rl/) | 异步 RL 训练框架 prime-rl 的架构剖析与八次实验复盘 |
| [embodied-ai](embodied-ai/) | 用双臂机器人项目打开具身智能的大门：70% 知识 + 30% 项目 |
| [pocket-agent](pocket-agent/) | 把编程 Agent 装进口袋：本机派 / 远控派 / 操机派三大家族的完整地图 |

> 后续新增系列将在此表登记。

---

## 系列一：从天气分类到可证据化实验

记录用 CNN 做天气四分类的完整过程：约 4990 张训练图，类别不平衡约 1.75:1，隐藏测试存在分布偏移，最终 Macro-F1 0.9137。

真正值得写的不是分数，而是过程中形成的科研规范与那些反直觉的现象：本地指标上升但平台指标下降、关闭合成噪声成为最大单项提升、更强的 ResNet18 在集成中导致崩溃、Mixup/CutMix/加权采样失效，以及五个异构模型在 8/499 个样本上仍然一致出错。

| # | 文章 | 主题 |
|---|------|------|
| 00 | [从天气分类到可证据化实验：一个小样本 CNN 项目的系统复盘](weather-recognition/00系列导言.md) | 系列总览与写作动机 |
| 01 | [项目全貌——任务、数据、约束与评估目标](weather-recognition/01项目全貌.md) | 任务定义、数据规模、部署与依赖约束 |
| 02 | [CNN 知识地图——从卷积到 ResNet](weather-recognition/02CNN%20知识地图——从卷积到%20ResNet.md) | 卷积、池化、归一化、残差连接的系统梳理 |
| 03 | [数据与增强——为什么增强必须匹配目标分布](weather-recognition/03数据与增强.md) | 增强策略与目标分布对齐 |
| 04 | [训练配方——从损失函数到早停](weather-recognition/04训练配方.md) | 损失、优化器、学习率、早停 |
| 05 | [分布偏移与平台差距——四次本地升，平台降](weather-recognition/05分布偏移与平台差距.md) | 本地与平台指标的四次反转 |
| 06 | [集成学习——系统差异比伙伴强度更重要](weather-recognition/06集成学习.md) | 异构集成与权重策略 |
| 07 | [评估与误差分析——Macro-F1、混淆矩阵与误差下限](weather-recognition/07评估与误差分析.md) | 评估指标与误差下限 |
| 08 | [负结果与证据链——失败也是一种科学产出](weather-recognition/08负结果与证据链.md) | 失败实验的记录规范 |
| 09 | [总结与迁移——从天气分类到其他 CNN 项目](weather-recognition/09总结与迁移.md) | 可迁移的经验与原则 |
| 10 | [Agent 作为实验协作者——当 CNN 流水线学会自己搜索时](weather-recognition/10agent作为实验协作者.md) | AI Agent 辅助实验的方法反思 |

## 写作原则

真实项目中最有价值的部分，往往不是配方，而是那些失败、反转和停止信号。

---

## 系列二：从逆向到一个可用的反向代理网关

把一个没有公开 API 文档的闭源 AI 编程助手，逆向成 OpenAI 兼容的多账号网关——完整复盘。

| # | 文章 | 主题 |
|---|------|------|
| 00 | [系列导言：从逆向到一个可用的反向代理网关](reverse-proxy/00系列导言.md) | 系列总览与写作动机 |
| 01 | [逆向工程三层模型](reverse-proxy/01逆向工程三层模型.md) | 协议层 / 语义层 / 行为层，以及每层的方法与产出 |
| 02 | [上游逆向：抓包与认证](reverse-proxy/02上游逆向-抓包与认证.md) | 三域分流、OAuth 设备流、请求头体系、并发刷新三个坑 |
| 03 | [请求改写：12 步实战](reverse-proxy/03请求改写-12步实战.md) | OpenAI 请求 → 上游私有格式的逐字段改写，每个 case 都是实测 |
| 04 | [错误分类与冷却：状态码背后的决策树](reverse-proxy/04错误分类与冷却-状态码背后的决策树.md) | 14 路决策树、三种冷却语义、模型级限流豁免、关键词名单原则 |
| 05 | [账号池调度：从加权选号到会话粘性](reverse-proxy/05账号池调度-从加权选号到会话粘性.md) | 加权轮盘、成本分层、积分保底、防惊群、会话粘性 |
| 06 | [本体逆向：用 Ghidra 读 Go 二进制](reverse-proxy/06本体逆向-用Ghidra读Go二进制.md) | 分析流程、符号恢复、源码与二进制对照、全局量恢复 |
| 07 | [反代生态横向图景](reverse-proxy/07反代生态横向图景.md) | 五类项目、四条技术路线、网页版 Tool 真相、两层 Harness |
| 08 | [总结：选上游与长期工程](reverse-proxy/08总结-选上游与长期工程.md) | 检查清单、工具链、成本、上游选择的甜区判断 |

> 本系列已做去敏感化处理：删去了具体产品名、账号、token、真实端点等细节，只保留可迁移的方法论与机制。

---

## 系列三：prime-rl——异步 RL 训练框架与后训练实践

剖析 Prime Intellect 的 prime-rl（大规模异步 RL 后训练框架）：三进程异步架构、算法抽象、损失函数与信任域、多轮轨迹与 renderers、规模工程；并复盘在它之上做的八次实验（E01–E08）——从 RLVR 起步、验证器审计，到一个"运行时干预改变 agent 动作分配"的小研究，其中被证伪的假设比被证实的多。

| # | 文章 | 主题 |
|---|------|------|
| 00 | [系列导言](prime-rl/00系列导言.md) | 系列总览：框架篇 + 实验篇的双层结构 |
| 01 | [后训练知识地图](prime-rl/01后训练知识地图.md) | SFT / RLVR / 蒸馏的版图，GRPO 家族的来龙去脉 |
| 02 | [三进程异步架构](prime-rl/02三进程异步架构.md) | inference / orchestrator / trainer，异步流水线与 staleness |
| 03 | [算法抽象](prime-rl/03算法抽象.md) | trainer-blind 设计：八种算法统一成 per-token 流 |
| 04 | [损失函数与信任域](prime-rl/04损失函数与信任域.md) | IPO、IcePop、mismatch KL 与裁剪的谱系 |
| 05 | [多轮轨迹与 renderers](prime-rl/05多轮轨迹与renderers.md) | extension property：多轮 RL 的 token 账本 |
| 06 | [训练工程与规模扩展](prime-rl/06训练工程与规模扩展.md) | FSDP2、EP/CP、权重同步、P/D 分离、观测与经验法则 |
| 07 | [E01：reverse-text 起步](prime-rl/07E01-reverse-text起步.md) | 第一次 RLVR：SFT 建能力、reward 消融、两次撤回 |
| 08 | [E02：验证器审计](prime-rl/08E02-验证器审计.md) | "测试套件通过"不是验证器：篡改 1.000 vs 真修复 0.571 |
| 09 | [E03：难度阶梯与预算前沿](prime-rl/09E03-难度阶梯与预算前沿.md) | 审计轨迹比排名值钱；预算才是开关，且曾被 bug 藏住 |
| 10 | [E04：harness 对比与 44 分反转](prime-rl/10E04-harness对比与44分反转.md) | 删一个工具掉 44 分；n=32 上另一半结论反转 |
| 11 | [E05：真实 SWE-bench](prime-rl/11E05-真实SWE-bench.md) | +32 分 pilot、T=8 反转 −6、静态散文对照、蒸馏 0/10 |
| 12 | [E06：2×2 因子实验](prime-rl/12E06-2x2因子实验.md) | "门"的死刑：H_P = H_D，H_G 地板 |
| 13 | [E07：banner 七臂分解](prime-rl/13E07-banner七臂分解.md) | 三个可分离的杠杆：重复、内容、角色 |
| 14 | [E08：复制与减半](prime-rl/14E08-复制与减半.md) | n=60 复制：headline 腰斩，两个配对 McNemar 幸存 |
| 15 | [研究方法与总结](prime-rl/15研究方法与总结.md) | 研究档案三层结构、假设生死簿、八条教训、可迁移检查清单 |

> 实验篇的数字全部来自 fork 仓库 `research/` 目录的冻结档案 `research-p8c-final`，结论均标注证据强度。

---

## 系列四：用一台双臂机器人打开具身智能的大门

以自己的项目 [multi_arm_line_ws](https://github.com/Thy985/multi_arm_line_ws)（双 UR5e 多机械臂 ROS 2 系统，M1–M7 从接口架构做到具身操作）为线索的具身智能全景：70% 知识（身体、空间感、运动学、规划、控制、编排、安全、协调、世界模型、感知抓取、技能、模仿学习、VLA 与 sim2real），30% 项目实例。每篇附"边界与不足"与"演进注记"——技术路线不预设正确，缺陷清单就是学习派的入场券。

| # | 文章 | 知识主题 / 项目实例 |
|---|------|-------------------|
| 00 | [系列导言](embodied-ai/00系列导言.md) | 具身智能两派之争 / 项目全貌与里程碑线 |
| 01 | [机器人的身体](embodied-ai/01机器人的身体.md) | 自由度、URDF/xacro、传感器布局 / robot.yaml + M7.1 身体升级 |
| 02 | [机器人的空间感](embodied-ai/02机器人的空间感.md) | 坐标系、TF 树、标定 / 命名空间隔离与 CM 架构回摆 |
| 03 | [运动学](embodied-ai/03运动学.md) | FK/IK、奇异性、为什么 6 轴 / KDL、mock→真求解器 |
| 04 | [运动规划](embodied-ai/04运动规划.md) | 采样规划、碰撞检测、失败率管理 / 五类恢复处理器 |
| 05 | [实时控制](embodied-ai/05实时控制.md) | ros2_control、JTC、双真相源 / 7 控制器与 E-Stop 解剖 |
| 06 | [任务编排](embodied-ai/06任务编排.md) | BT vs FSM vs LLM 规划 / M5.2 异步死锁全景 |
| 07 | [安全](embodied-ai/07安全.md) | 功能安全、横切安全平面 / SafetySupervisor 独立存活实测 |
| 08 | [多机协调](embodied-ai/08多机协调.md) | 互斥、死锁、调度 / ResourceManager 双轨警示 |
| 09 | [世界模型](embodied-ai/09世界模型.md) | 单一真相源、五层结构、概率信念 / 五层→六层的诚实升级 |
| 10 | [感知与抓取](embodied-ai/10感知与抓取.md) | 感知→操作流水线、GT 双重身份 / 0.015m vs 0.038m |
| 11 | [技能抽象](embodied-ai/11技能抽象.md) | 动作的类型系统、LLM 接口 / Skill 五要素与接口冻结 |
| 12 | [项目的边界](embodied-ai/12项目的边界.md) | 确定性栈解决不了什么 / 六条路线性局限 = 学习派需求清单 |
| 13 | [数据与模仿学习](embodied-ai/13数据与模仿学习.md) | 模仿学习、遥操作、Open X-Embodiment / 域随机化 + 可重放 Episode |
| 14 | [VLA 与 sim2real](embodied-ai/14VLA与sim2real.md) | RT-2 / OpenVLA / π0 / LeRobot、reality gap / "下半身就绪，上半身空白" |
| 15 | [总结：两派会师](embodied-ai/15总结.md) | 分层共生的接口图 / 路线复盘表 + 缺陷→下一步映射 + 可迁移清单 |
| 16 | [业界全景](embodied-ai/16业界全景.md) | 从"元年"到"量产元年"：中西产业两线、三种商业形态、自主 vs 遥操作 |
| 17 | [机器人基础模型军备竞赛](embodied-ai/17机器人基础模型军备竞赛.md) | VLA 第三代与 GPT-6 Astra 变量 / "非自然语言"接口的兑现 |
| 18 | [世界模型的三个流派](embodied-ai/18世界模型的三个流派.md) | 状态估计式 / 环境生成式 / 隐式端到端派 / 六层 WorldModel 微缩教具 |
| 19 | [数据、仿真与基准生态](embodied-ai/19数据仿真与基准生态.md) | 飞轮三层合流、生成式仿真、评测专业化 / 半个飞轮的归宿 |
| 20 | [回到项目](embodied-ai/20回到项目.md) | 业界标配定位图、路线修正与负清单、三流派情景分析（系列终章） |

> 00–15 为项目锚定的知识篇；16–20 为业界篇（调研快照 2026-10-24：产业数据、模型格局均来自该时点公开报道，GPT-6 Astra 具身结果标注"待复现"）。
---

## 系列五：把编程 Agent 装进口袋

以自己的两个项目——[xingdu-dsh-android（星渡）](https://github.com/Thy985/xingdu-dsh-android)（本机派：借 Termux 编译成果的 Bionic 运行时进 APK）与 [ZCode fork](https://github.com/Thy985/ZCode)（远控派：产品化 WebView 客户端）——为双锚点，剖析"编程 agent 移动化"的完整生态：本机派四方案、远控派三层栈（UI/通道/安全）、操机派与反向家族。知识约 60% / 项目约 40%；案例断言给到 file:line 级源码证据，安全结论按"文档承诺 / 代码可验证 / 未经独立审计"分级。本系列为第二轮深化版（合并两篇综述，案例篇全部重写为源码级）。

| # | 文章 | 内容 |
|---|------|------|
| 00 | [系列导言](pocket-agent/00系列导言.md) | 问题地图：三大家族 + 一对镜像项目 + 生态全景 |
| 01 | [编程 agent 解剖](pocket-agent/01编程agent解剖.md) | 工具环、审批、PTY、Web UI——搬运难题的根源 |
| 02 | [Android 的沙箱与运行时](pocket-agent/02Android的沙箱与运行时.md) | W^X、Bionic vs glibc、proot 的 ptrace 机制 |
| 03 | [星渡（上）](pocket-agent/03星渡上-825MB运行时进APK.md) | 借 Termux apt 的闭包收集、dsh_pty_exec.c 的 fd-3 协议 |
| 04 | [星渡（下）](pocket-agent/04星渡下-WebView移动化与策略即代码.md) | 官方契约组合、SAF 快照桥、ZipPathPolicy 走读 |
| 05 | [DSHA（上）](pocket-agent/05DSHA上-prootUbuntu进APK.md) | ProotBootstrap、装机流水线、79 类备份体系 |
| 06 | [DSHA（下）](pocket-agent/06DSHA下-设备桥.md) | DeviceShellPolicy 白名单本体、PID 复用防护、无障碍服务 |
| 07 | [发布的经济学](pocket-agent/07发布的经济学.md) | Play/IzzyOnDroid/F-Droid 三重约束与瘦包方案 |
| 08 | [远控 UI 层](pocket-agent/08远控UI层.md) | 原生 App / Web 完整版 / 桌面反代——"反代只搬界面不搬能力" |
| 09 | [远控通道层](pocket-agent/09远控通道层.md) | SSH 反向、Cloudflare、frp、Tailscale 与 CGNAT 自愈 |
| 10 | [远控安全层](pocket-agent/10远控安全层.md) | 三道门源码证据：Host/Origin 双写、cookie 铸造、39 方法白名单 |
| 11 | [ZCode 案例](pocket-agent/11ZCode案例-产品化远控壳.md) | TrustDecision 类型化判定、CSS 可靠性论证 |
| 12 | [安全边界大对照](pocket-agent/12安全边界大对照.md) | 四种信任模型：类型化判定是收敛点 |
| 13 | [操机派全景](pocket-agent/13操机派全景.md) | GUI agent 谱系、两代技术栈、与编程 agent 的分野 |
| 14 | [反向：agent 控制安卓](pocket-agent/14反向-agent控制安卓.md) | 模拟器插件与 MCP 工具设计三通则 |
| 15 | [总结：决策表与清单](pocket-agent/15总结.md) | 场景选型、三种工程文化、可迁移清单 |

> 快照 2026-10-24：星渡/ZCode fork/DSHA/StyleJeke/bluelightgit 以克隆仓库源码为据；其余远控生态以 README 为据（文档口径）。