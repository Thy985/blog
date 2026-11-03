# 多轮轨迹与 renderers——extension property 为什么是 RL 的命脉

> 单轮 RL 里 token 是天然连续的。多轮一进来，问题就来了：第 3 轮的 prompt 和第 2 轮的采样输出，到底是不是同一条 token 流？这个问题的答案，直接决定你的训练算力是 O(T) 还是 O(T²)。

---

## 1. 问题：多轮 rollout 是谁的 token

智能体 RL 的一条轨迹长这样：模型生成 → 环境返回工具结果 → 模型再生成 → ……每一轮都是一次独立的 LLM 调用。训练时你要把这几轮合并成一个样本（或几个），于是必须回答：**合并的依据是什么？**

答案是 token。RL 训练的本质是对"策略采样过的那串 token"重新评估 logprob——所以训练样本里的 token 必须和推理时**逐字节相同**。任何"重新渲染历史"的做法都在偷偷改 token：chat template 规范化了空白、丢了 thinking 块、把模型输出的 `false` 解析成 Python 布尔又渲染回 `False`。

Prime Intellect 为此写了 [renderers 博客](https://www.primeintellect.ai/blog/renderers)和同名的 Python 包。他们的一句话立场：

> "Every assumption one could make about a chat template will be violated eventually."
> （你对 chat template 的每一个假设，终将被违反。）

## 2. chat template 的三个坑

Jinja 模板只定义 messages → text，没有逆向操作。三个典型的坑：

**坑一：解析往返破坏字节。** 模型输出 JSON `{"flag": false}`，harness 解析成结构再放回历史，重渲染变成 `{"flag": False}`——训练时评估的 token 和采样时的 token 已经不同，logprob 漂移。

**坑二：模板改写历史。** 最著名的是 Qwen3 的模板会把历史轮的 `<think>` 块剥掉。对推理模型来说，thinking token 恰恰是 RL 最想训练的部分——模板在错误的层面帮你"省 token"，把训练信号直接删了。文档里给了逐字复现的例子：`apply_chat_template` 三轮消息后，第一轮的 `<think>R1</think>` 消失了。

**坑三：截断没有收尾。** max_tokens 截断的生成缺少 turn-close token（如 `<|im_end|>`），通用方案只能放弃合并。

## 3. Extension property：一条不变量

prime-rl 的解法建立在一条形式化不变量上。一条轨迹的步骤序列满足 **extension property**（扩展性）当且仅当：

$$\text{prompt\_ids}_{t+1} = \text{prompt\_ids}_t + \text{completion\_ids}_t + \text{continuation\_ids}_{t+1}$$

即：**下一轮的 prompt 必须逐字节延续上一轮的采样流**。成立时，整条多轮轨迹是一条连续 token 流，一次 forward/backward 搞定，计算量 O(T)。

不成立时（模板剥 thinking、环境压缩上下文、主 agent 把任务交给子 agent 只拿回摘要），从断裂处开启新训练样本——优雅降级，不产脏数据，但前缀被重复编码，最坏情况 O(T²)。文档算了笔账：五轮全断约需 15 个 turn 长度的工作量，**约 3 倍的干净算力开销**。

orchestrator 的合并策略因此叫 **best-effort interleaving**（尽力交错）：

```
5 步轨迹，第 4 步断裂：
第 1–3 步：扩展性成立 → 合并为 Sample 1
第 4 步：  断裂（thinking 被剥）
第 4–5 步：成立 → 合并为 Sample 2
结果：2 个训练样本，而不是 5 个，也不是 1 个脏样本
```

为什么"宁可断"是对的？如果第 2 轮 prompt 是 `U1, A1', U2` 而 `A1' ≠ A1`（历史被改写），orchestrator 无论怎么合并，训练器评估的都将是模型**没有采样过**的 token——logprob 漂移直接污染优势估计。开新样本是唯一正确行为。

## 4. Renderer 协议：把 bridge 变成显式代码

renderers 包把"模型专属的 bridge 逻辑"写成显式 Python。协议四个方法：

- `render_ids(messages)` — messages → 推理引擎接受的 token ids
- `parse_response(completion_ids)` — 从采样 ids 恢复结构化 `(content, reasoning_content, tool_calls)`——**按特殊 token id 扫描**（如 Qwen 的 `<tool_call>`），不做解码后正则，避免误报
- `get_stop_token_ids()` — 停止条件
- `bridge_to_next_turn(prev_prompt_ids, prev_completion_ids, new_messages)` — 把新环境轮**逐字节续**在前一轮的采样流上，不重渲染历史

bridge 内部做三件事：锚定上一轮的 close token（干净停止则已在采样流里；截断则合成 canonical close 作为非 loss 的上下文）；拒绝扩展中含 assistant 内容（重渲染 assistant = 用模板字节替换采样字节）；只渲染新消息，用该模型家族精确的 framing（Qwen 的 `<|im_start|>` 风格等）。

配套一个聪明的产物：**message_indices**——render 时返回每个 token 来自哪条消息（结构脚手架标 −1），loss mask 一次遍历就能构造，不需要每轮渲染完再 diff 前缀。

**不安全即返回 None**：bridge 证明不了安全时回退全量重渲染——但用的是从原始 completion_ids 保留的解码字节，不是可能被规范化的解析 dict。

手写 renderer 已覆盖 Qwen3/3.5、GLM-4.5/5、MiniMax-M2、DeepSeek-V3、Kimi K2/K2.5、Nemotron-3、GPT-OSS 等家族，其余落到 `DefaultRenderer`（`apply_chat_template` 包装）。SFT 侧同样 renderer-only：位置相关的模板（比如剥 thinking 的）不再会污染 loss mask，因为 mask 由 message_indices 直接推导。

## 5. 断续轨迹：不是 bug，是自然语义

有些环境天生断续——主 agent 委托子 agent，只拿回摘要，子 agent 的完整对话根本不在主 agent 的上下文里。best-effort interleaving 对此的处理是免费的：每个 agent 的连续轮各自合并，交接处自然开新样本。**训练器永远不会看到伪造的连续性。**

这其实是"采样历史默认不可变"原则的体现：改写历史必须是显式记录的事件，而不是 harness 里的静默修复。renderers 博客里点名过反例——某些 harness 的 `repairToolCall` 会静默把 `Bash` 改成 `bash`，这类"贴心"修复在 RL 里全是毒。

## 6. 一句话总结

> Token 是 RL 的账本。多轮 RL 的全部工程，就是保证这本账逐字节连续——连续的地方合并成 O(T) 的样本，断裂的地方诚实开新账，绝不伪造一条没发生过的 token 流。

下一篇切换到规模侧：FSDP2、专家并行、权重广播，以及"batch ≥ 64"这类经验法则的来历。

---

**参考**：Prime Intellect, [The renderers writeup](https://www.primeintellect.ai/blog/renderers)（权威出处）；prime-rl `docs/algorithms.md` §Multi-Turn Trajectories；代码 `deps/renderers/` 子模块。
