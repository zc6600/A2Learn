import json
from pathlib import Path

def optimize_agent_react():
    path = Path("skill/references/examples/agent-react.json")
    data = json.loads(path.read_text(encoding="utf-8"))
    comps = data[1]["updateComponents"]["components"]
    for c in comps:
        if c.get("id") == "detailed-implementation-from-scratch":
            c["content"] = """要从零实现一个工业级的 ReAct Agent，无需依赖重型框架，底层核心就是一个 **while 循环 + 正则状态解析器**：

```python
# ReAct Agent 极简控制循环 (From Scratch Python 伪代码)
import re

def run_react_agent(prompt_history, tools, max_steps=5):
    for step in range(max_steps):
        # 1. 调用 LLM 生成当前思考与动作
        response = llm.generate(prompt_history)
        
        # 2. 检查是否到达 Finish 终止条件
        if "Action: Finish" in response:
            return extract_answer(response)
            
        # 3. 正则解析捕获 Action: tool_name[arg]
        match = re.search(r"Action:\\s*(\\w+)\\[(.*?)\\]", response)
        if match:
            tool_name, tool_arg = match.groups()
            # 4. 执行本地挂载函数，获取真实 Observation
            obs = tools[tool_name](tool_arg)
            # 5. 拼接物理反馈，追加回上下文驱动下一轮
            prompt_history += f"\\nObservation: {obs}\\n"
```

**四大核心基础设施组件：**
1. **<dfn title="包含系统指令与Few-Shot交替格式示例的提示词构造器">Prompt Synthesizer</dfn>**：注入规范，约束输出 `Thought -> Action -> Observation` 结构。
2. **<dfn title="通过正则表达式捕获Action指令并提取工具名与参数的提取器">Action Parser & Dispatcher</dfn>**：捕获 `Action: tool[arg]` 并分发给 Python 本地函数。
3. **<dfn title="维护历史对话并在末尾追加 Observation 反馈的上下文管理器">Context Accumulator</dfn>**：追加 `Observation:` 到历史对话末尾。
4. **<dfn title="解析 Finish 指令并打破 while 循环的终止状态判别器">Loop Termination Gate</dfn>**：检测到 `Action: Finish[answer]` 时打破循环返回答案。"""
    return data

def optimize_js_async():
    path = Path("skill/references/examples/js-async.json")
    data = json.loads(path.read_text(encoding="utf-8"))
    comps = data[1]["updateComponents"]["components"]
    
    # Check if detailed-explanation already exists
    has_detail = any(c.get("id") == "detailed-explanation-promise-all" for c in comps)
    if not has_detail:
        detail_comp = {
          "id": "detailed-explanation-promise-all",
          "component": "DetailedExplanation",
          "title": "深入代码实现：手写 Promise.all 核心逻辑与微任务链",
          "icon": "📝",
          "estimatedReadTime": "3 分钟代码实现拆解",
          "content": """要彻底弄懂 Promise 的协同并发与链式调用，最直观的方法就是亲自手写一个 `Promise.all` 伪代码实现：

```javascript
// 极简手写 Promise.all 代码实现
function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    let results = [];
    let completedCount = 0;
    
    promises.forEach((p, index) => {
      // 保证传入的每一个项都被包裹为 Promise
      Promise.resolve(p).then(res => {
        results[index] = res; // 保持原始数组顺序
        completedCount++;
        if (completedCount === promises.length) {
          resolve(results);   # 全部成功才触发 resolve
        }
      }).catch(reject);       # 只要有一个失败立即 reject
    });
  });
}
```

> 💡 **核心注意点**：`Promise.all` 在并行发送网络请求时极其高效，但要注意它的「短路特性」——任何一个 Promise 抛出错误都会立即触发整体的 `reject`。理解其内部计数器与结果索引绑定机制是前端面试与异步调优的基本功。"""
        }
        # Insert before quiz
        quiz_idx = next(i for i, c in enumerate(comps) if c.get("id") == "quiz")
        comps.insert(quiz_idx, detail_comp)
        
        root = next(c for c in comps if c.get("id") == "root")
        if "detailed-explanation-promise-all" not in root["children"]:
            r_quiz_idx = root["children"].index("quiz")
            root["children"].insert(r_quiz_idx, "detailed-explanation-promise-all")
    return data

def optimize_non_linear():
    path = Path("skill/references/examples/non-linear.json")
    data = json.loads(path.read_text(encoding="utf-8"))
    comps = data[1]["updateComponents"]["components"]
    
    has_detail = any(c.get("id") == "detailed-explanation-grid-magic" for c in comps)
    if not has_detail:
        detail_comp = {
          "id": "detailed-explanation-grid-magic",
          "component": "DetailedExplanation",
          "title": "深入 CSS 代码：自适应响应式网格魔幻公式 (auto-fit + minmax)",
          "icon": "📐",
          "estimatedReadTime": "3 分钟 CSS 代码拆解",
          "content": """在传统媒体查询（Media Queries）中，我们需要为手机、平板、桌面端编写大量 `@media (max-width: 768px)` 调试代码。而 CSS Grid 提供了零媒体查询的响应式卡片网格公式：

```css
/* 零 Media Query 响应式卡片网格魔幻公式 */
.card-grid {
  display: grid;
  /* auto-fit 自动填充 + minmax 设定列宽上下限 */
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}
```

> 💡 **公式机制拆解**：
> 1. **`minmax(280px, 1fr)`**：规定每一列卡片最小宽度不低于 `280px`，空间充足时等分拉伸（`1fr`）；
> 2. **`auto-fit`**：当屏幕变窄容不下更多 280px 的列时，自动将空列收缩并促使下方卡片换行；
> 3. **结果**：从 320px 的 iPhone 到 4K 显示器，网格卡片自动无缝响应折叠，无需一行 `@media` 条件句！"""
        }
        quiz_idx = next(i for i, c in enumerate(comps) if c.get("id") == "quiz")
        comps.insert(quiz_idx, detail_comp)
        
        root = next(c for c in comps if c.get("id") == "root")
        if "detailed-explanation-grid-magic" not in root["children"]:
            r_quiz_idx = root["children"].index("quiz")
            root["children"].insert(r_quiz_idx, "detailed-explanation-grid-magic")
    return data

def optimize_conversational():
    path = Path("skill/references/examples/conversational.json")
    data = json.loads(path.read_text(encoding="utf-8"))
    comps = data[1]["updateComponents"]["components"]
    
    has_detail = any(c.get("id") == "detailed-explanation-closure-pattern" for c in comps)
    if not has_detail:
        detail_comp = {
          "id": "detailed-explanation-closure-pattern",
          "component": "DetailedExplanation",
          "title": "深入代码实现：手写闭包模块模式 (Module Pattern) 与私有变量",
          "icon": "🔒",
          "estimatedReadTime": "3 分钟 JS 代码拆解",
          "content": """在 JavaScript 原生引入 `#private` 私有字段之前，社区长期使用闭包来实现封装与私有状态保护（如 Redux store、防抖函数 `debounce` 等）：

```javascript
// 手写闭包模块模式 (Module Pattern)
const UserStore = (function() {
  // 私有变量，保存在闭包词法环境中，外部无法直接访问
  let _token = "secret_bearer_token_999";
  let _user = { name: "Alice", role: "admin" };

  return {
    // 仅暴露安全的 Getter 和 Setter 接口
    getUser() {
      return { ..._user }; // 返回浅拷贝防止引用污染
    },
    setToken(newToken) {
      if (typeof newToken === "string") _token = newToken;
    }
  };
})();

console.log(UserStore.getUser()); // { name: "Alice", role: "admin" }
console.log(UserStore._token);     // undefined (私有变量安全保护)
```

> 💡 **架构意义**：防抖 (Debounce)、节流 (Throttle) 以及现代框架 Hooks (如 React `useState`) 的底层原理完全建立在这一闭包模式之上！"""
        }
        quiz_idx = next(i for i, c in enumerate(comps) if c.get("id") == "quiz")
        comps.insert(quiz_idx, detail_comp)
        
        root = next(c for c in comps if c.get("id") == "root")
        if "detailed-explanation-closure-pattern" not in root["children"]:
            r_quiz_idx = root["children"].index("quiz")
            root["children"].insert(r_quiz_idx, "detailed-explanation-closure-pattern")
    return data

# Apply all optimizations
examples = {
    "agent-react": optimize_agent_react(),
    "js-async": optimize_js_async(),
    "non-linear": optimize_non_linear(),
    "conversational": optimize_conversational()
}

for name, content in examples.items():
    for base in [
        f"packages/a2learn-catalog/examples/Website/{name}.json",
        f"skill/references/examples/{name}.json",
        f"apps/viewer/public/examples/{name}.json"
    ]:
        p = Path(base)
        p.write_text(json.dumps(content, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"OPTIMIZED: {p}")

print("ALL_OPTIMIZATIONS_SUCCESS")
