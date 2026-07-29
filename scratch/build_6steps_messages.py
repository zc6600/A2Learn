import json
from pathlib import Path

steps_config = [
    {"id": "1", "title": "查找效率危机 (O(1)计算)", "targetSurfaceId": "surface-module-1"},
    {"id": "2", "title": "散列碰撞困境 (冲突解决)", "targetSurfaceId": "surface-module-2"},
    {"id": "3", "title": "空间性能妥协 (负载因子/Rehash)", "targetSurfaceId": "surface-module-3"},
    {"id": "4", "title": "工业安全防御 (HashDoS/红黑树)", "targetSurfaceId": "surface-module-4"}
]

messages = [
    # =========================================================================
    # MODULE 1: 查找效率危机 —— 如何在海量数据中实现 O(1) 定位？
    # =========================================================================
    {
        "version": "v0.9",
        "createSurface": {
            "surfaceId": "surface-module-1",
            "catalogId": "https://a2learn.ai/spec/v1/catalog.json"
        }
    },
    {
        "version": "v0.9",
        "updateComponents": {
            "surfaceId": "surface-module-1",
            "components": [
                {
                    "id": "root",
                    "component": "Column",
                    "children": [
                        "header-1",
                        "learning-path-1",
                        "step1-background",
                        "step1-chat",
                        "step2-naive",
                        "step3-mindset",
                        "step4-implementation",
                        "step4-sandbox",
                        "step5-summary",
                        "step6-anchors"
                    ]
                },
                {
                    "id": "header-1",
                    "component": "Text",
                    "variant": "h1",
                    "text": "如何在海量数据中实现 O(1) 极速定位？"
                },
                {
                    "id": "learning-path-1",
                    "component": "LearningPath",
                    "title": "哈希表四阶渐进学习路径",
                    "activeStepId": "1",
                    "steps": steps_config
                },
                {
                    "id": "step1-background",
                    "component": "AnalogyCard",
                    "title": "海量数据检索的吞吐量瓶颈",
                    "analogy": "<b>背景</b>：现代软件系统（如用户中心、路由表、数据库索引）需要频繁检索数据。<br><b>现实痛点</b>：当数据量达到 100 万条甚至上亿条时，如何在不耗费几百毫秒的前提下，瞬间找到特定记录？"
                },
                {
                    "id": "step1-chat",
                    "component": "ScenarioDialogue",
                    "topic": "💬 微信技术群：为什么遍历 100 万条数据会把服务器卡死？",
                    "characters": {
                        "alice": {"name": "小白程序员 (Alice)", "avatar": "👩‍💻", "alignment": "left"},
                        "boss_zhang": {"name": "架构师老张", "avatar": "👨‍💼", "alignment": "right"}
                    },
                    "messages": [
                        {
                            "characterId": "alice",
                            "content": "张老大！我写了个用户查询，在 100 万条数据里用数组循环找人，CPU 直接飙到 100%，耗时 800 毫秒！怎么才能像秒杀一样快啊？"
                        },
                        {
                            "characterId": "boss_zhang",
                            "content": "你这是在用 <dfn title=\"按顺序一个个比对数据的线性查找方式\">顺序查找 O(N)</dfn>！数据量翻倍，耗时就翻倍。必须改掉‘挨个比对’的逻辑！"
                        }
                    ]
                },
                {
                    "id": "step2-naive",
                    "component": "MentalModel",
                    "title": "物理内存本质与节点搬迁分析",
                    "description": "计算机物理内存 (RAM) 本质是一个支持根据数字地址直接访问的连续字节数组。所有数据存取最终都建立在这个硬件特性上。",
                    "icon": "🧠",
                    "diagramTitle": "📊 物理内存数据流动演推",
                    "diagram": "初始内存: [0:10 | 1:20 | 2:30 | 3:50 | 4:60]\n目标: 插入数字 25 到有序位置 (下标 2)\n步骤1 右移: 60->5, 50->4, 30->3  ==> [0:10 | 1:20 | 2:空 | 3:30 | 4:50 | 5:60]\n步骤2 写入: 25 写入下标 2      ==> [0:10 | 1:20 | 2:25 | 3:30 | 4:50 | 5:60]",
                    "pillarsTitle": "物理特性与缺陷",
                    "pillars": [
                        {"title": "硬件存取特性", "description": "内存数组天然支持按物理数字下标 O(1) 随机存取。", "icon": "⚡"},
                        {"title": "内存搬迁缺陷", "description": "有序数组插入或删除会导致后续大量内存节点移动。", "icon": "❌"}
                    ],
                    "analogyTitle": "💡 真实数据搬迁开销分析",
                    "analogy": "<b>向已排序数组 [ 10, 20, 30, 50, 60 ] 中插入数字 25 的开销分析：</b><br><br>1. <b>定位</b>：对比发现 25 应该插在 20 和 30 之间（即下标 2）；<br>2. <b>搬迁</b>：为给 25 腾出空位，60、50、30 必须在内存物理地址里<b>整体右移 1 位</b>（60->5, 50->4, 30->3）；<br>3. <b>写入</b>：将 25 写入已腾空的下标 2。<br><br>💥 <b>结论直击</b>：仅插入 1 个数字，就导致内存中 3 个元素被迫搬家！若数组存有 100 万个数据，插入一次将在 RAM 中搬迁 50 万个内存块！"
                },
                {
                    "id": "step3-mindset",
                    "component": "ConceptCard",
                    "title": "计算范式：让 Key 的名称直接算出内存下标",
                    "tags": ["计算代替比对", "O(1)寻址", "范式突破"],
                    "definition": "<b>突破思路</b>：放弃‘遍历比对键值’，改用<b>‘直接计算内存地址’</b>！<br>不要去数据库里搜数据在哪，而是设计一个计算公式，让 Key 的名称直接算出它应该藏在哪个内存下标中！",
                    "example": "<pre><code>// 传统比对 (搜索范式): 寻找 'Alice' -> 比对 1000 次\n// 哈希突破 (计算范式): 计算 'Alice' -> 直接得出 下标 5 -> 一步读取 arr[5]</code></pre>",
                    "relatedConcepts": ["哈希函数", "O(1)复杂度", "散列映射"]
                },
                {
                    "id": "step4-implementation",
                    "component": "DetailedExplanation",
                    "title": "哈希函数与槽位数组",
                    "icon": "⚙️",
                    "estimatedReadTime": "3 分钟阅读",
                    "content": "为了将“计算范式”落地，工程上引入了两个核心组件：\n\n1. **<dfn title=\"将任意长度输入Key转换为固定范围整数索引的算法\">哈希函数 (Hash Function)</dfn>**：负责接收 Key（如字符串、身份证号），输出一个无符号整数。\n2. **<dfn title=\"存储数据真实值的连续内存数组\">槽位数组 (Bucket Array / Hash Table)</dfn>**：将算出的整数对数组容量取模，得到具体的内存下标。`index = hash(key) % capacity`。\n\n只要哈希函数计算极快，无论存储 10 条还是 1,000,000 条数据，定位时间都固定为常数级别（即 **<dfn title=\"执行开销与数据总量规模无关的极致性能\">常数时间复杂度 O(1)</dfn>**）。"
                },
                {
                    "id": "step4-sandbox",
                    "component": "InteractiveSandbox",
                    "title": "代码演示：观察内存数组挪动与哈希直接定位的区别",
                    "description": "点击运行代码，对比在有序数组中插入元素（需搬迁后续内存）与哈希计算直接定位的执行开销：",
                    "language": "javascript",
                    "code": """// 演示：在有序数组 [10, 20, 30, 50, 60] 中插入 25
let arr = [10, 20, 30, 50, 60];
let insertVal = 25;
let shiftCount = 0;

// 模拟物理内存右移
arr.push(undefined);
for (let i = arr.length - 1; i > 2; i--) {
  arr[i] = arr[i - 1];
  shiftCount++;
}
arr[2] = insertVal;

console.log("插入后数组:", arr);
console.log("被迫搬迁的内存块数量:", shiftCount, "次");
console.log("------------------------------");

// 哈希定位示例
function simpleHash(key, capacity = 10) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) % capacity;
  return hash;
}
console.log("'Alice' 直接算出的槽位号:", simpleHash('Alice'));""",
                    "runLocally": True
                },
                {
                    "id": "step5-summary",
                    "component": "AnalogyCard",
                    "title": "总结：从搜索比对到公式计算",
                    "analogy": "实现 O(1) 极速查找的关键，在于利用物理内存可直接按数字下标存取的特性，将<b>‘挨个搜索比对’</b>替换为<b>‘公式直接计算’</b>。"
                },
                {
                    "id": "step6-anchors",
                    "component": "ConceptCard",
                    "title": "术语总结",
                    "tags": ["术语总结"],
                    "definition": "要彻底破解海量数据检索的效率危机，核心在于从传统的 <dfn title=\"按顺序逐个比对元素的基准方案，耗时随数据量成正比\"><strong>顺序查找 O(N)</strong></dfn> 转向计算思想。通过精心设计的 <dfn title=\"将任意格式Key映射转换为固定范围整数索引的散列计算公式\"><strong>哈希函数 (Hash Function)</strong></dfn>，将任意 Key 直接转换为内存下标，从而将数据存取性能提升至与规模完全无关的 <dfn title=\"数据检索耗时与数据总量规模完全无关的极致性能表现\"><strong>常数时间复杂度 O(1)</strong></dfn>。",
                    "example": "",
                    "relatedConcepts": ["顺序查找", "哈希函数", "O(1)复杂度"]
                }
            ]
        }
    },

    # =========================================================================
    # MODULE 2: 🔀 散列碰撞困境 —— 当不同的 Key 产生了相同的索引？
    # =========================================================================
    {
        "version": "v0.9",
        "createSurface": {
            "surfaceId": "surface-module-2",
            "catalogId": "https://a2learn.ai/spec/v1/catalog.json"
        }
    },
    {
        "version": "v0.9",
        "updateComponents": {
            "surfaceId": "surface-module-2",
            "components": [
                {
                    "id": "root",
                    "component": "Column",
                    "children": [
                        "header-2",
                        "learning-path-2",
                        "step1-background-2",
                        "step1-chat-2",
                        "step2-naive-2",
                        "step3-mindset-2",
                        "step4-implementation-2",
                        "step5-summary-2",
                        "step6-anchors-2",
                        "quiz-2"
                    ]
                },
                {
                    "id": "header-2",
                    "component": "Text",
                    "variant": "h1",
                    "text": "当不同的 Key 产生了相同的索引？"
                },
                {
                    "id": "learning-path-2",
                    "component": "LearningPath",
                    "title": "哈希表四阶渐进学习路径",
                    "activeStepId": "2",
                    "steps": steps_config
                },
                {
                    "id": "step1-background-2",
                    "component": "AnalogyCard",
                    "title": "散列重号引发的数据覆盖危机",
                    "analogy": "<b>背景</b>：我们在 Module 1 中用哈希函数算出了数组下标。<br><b>衍生新问题</b>：当系统存入多个不同用户时（如 'Alice' 与 'David'），哈希函数竟然算出了<b>完全相同的下标 5</b>！后存入的数据会直接把前面的数据覆盖抹掉！"
                },
                {
                    "id": "step1-chat-2",
                    "component": "ScenarioDialogue",
                    "topic": "💬 微信技术群：老大！两个人算出了同一个下标，数据被覆盖了！",
                    "characters": {
                        "alice": {"name": "小白程序员 (Alice)", "avatar": "👩‍💻", "alignment": "left"},
                        "boss_zhang": {"name": "架构师老张", "avatar": "👨‍💼", "alignment": "right"}
                    },
                    "messages": [
                        {
                            "characterId": "alice",
                            "content": "张老大！不好了！用户 'Alice' 和 'David' 存入时算出了相同的下标 5，David 把 Alice 的数据覆盖掉了！这怎么解决啊？"
                        },
                        {
                            "characterId": "boss_zhang",
                            "content": "这就是必然发生的“哈希碰撞”！因为输出的槽位有限，而输入的名字是无限的。"
                        }
                    ]
                },
                {
                    "id": "step2-naive-2",
                    "component": "MentalModel",
                    "title": "鸽巢原理与冲突解决流派",
                    "description": "根据数学上的鸽巢原理 (Pigeonhole Principle)，当钥匙数量大于箱子数量时，必然存在至少两个钥匙指向同一个箱子。",
                    "icon": "🐦",
                    "diagramTitle": "📊 输入映射冲突图示",
                    "diagram": "Alice映射: [0:空 | 1:空 | 5:Alice | 6:空]\nDavid冲突: [0:空 | 1:空 | 5:冲突! | 6:空]",
                    "pillarsTitle": "原理与缺陷",
                    "pillars": [
                        {"title": "鸽巢原理", "description": "无限输入映射到有限槽位，碰撞在数学上不可避免。", "icon": "📐"},
                        {"title": "直接覆写缺陷", "description": "覆盖旧数据会导致致命的数据丢失灾难。", "icon": "💥"}
                    ],
                    "analogyTitle": "💡 碰撞后覆写的灾难剖析",
                    "analogy": "当发生索引重号时，如果采用直接用新值覆盖旧值的逻辑，会导致前面存入的数据彻底丢失，引发严重计算 Bug。"
                },
                {
                    "id": "step3-mindset-2",
                    "component": "ConceptCard",
                    "title": "多节点挂载与规则顺延",
                    "tags": ["容忍碰撞", "多维存储", "空间解耦"],
                    "definition": "<b>突破思路</b>：承认碰撞必然发生，不再追求‘一个槽位只能存一个值’。<br>转而在槽位内部建立<b>多节点挂载机制</b>，或者当槽位被占时允许数据<b>按既定规则去附近寻址闲置槽位</b>！",
                    "example": "<pre><code>// 突破思路 1 (挂载): 槽位 5 里面放一条链表 -> [Alice] -> [David]\n// 突破思路 2 (顺延): 槽位 5 被占 -> 按规则看 6号槽位 -> 空闲则存入 6号</code></pre>",
                    "relatedConcepts": ["链地址法", "开放寻址法", "碰撞解决"]
                },
                {
                    "id": "step4-implementation-2",
                    "component": "DetailedExplanation",
                    "title": "链地址法 vs 开放寻址法及 CPU 缓存效应",
                    "icon": "⚙️",
                    "estimatedReadTime": "4 分钟阅读",
                    "content": "工程上对碰撞处理有两种主流落地方案：\n\n1. **<dfn title=\"每个槽位维护一条单链表，冲突节点追加到链表末尾\">链地址法 (Separate Chaining)</dfn>**：Java HashMap 采用此法。优点是简单高容错；缺点是链表节点在内存中随机分散，<dfn title=\"CPU预取连续内存数据的硬件加速机制\">CPU 缓存局部性</dfn> 较差。\n2. **<dfn title=\"不建链表，冲突时按线性或二次探测规则去检查数组相邻闲置槽位\">开放寻址法 (Open Addressing)</dfn>**：Python dict 采用此法。优点是所有数据紧密挨在数组里，充分利用 CPU 缓存线 (Cache Line)，读取速度极快；缺点是接近满载时效率剧降。\n\n> 💡 落地权衡：追求高容错选链地址法；追求极致内存与 CPU 缓存性能选开放寻址法。"
                },
                {
                    "id": "step5-summary-2",
                    "component": "AnalogyCard",
                    "title": "总结：纵向链表 vs 横向连续槽位",
                    "analogy": "碰撞不可消除。链地址法通过纵向扩展链表解决冲突，开放寻址法通过横向寻找连续空槽解决冲突。"
                },
                {
                    "id": "step6-anchors-2",
                    "component": "ConceptCard",
                    "title": "术语总结",
                    "tags": ["术语总结"],
                    "definition": "在有限槽位中，不同 Key 映射到同一下标的 <dfn title=\"不同Key映射到完全相同数组下标的必然现象\"><strong>哈希碰撞 (Hash Collision)</strong></dfn> 在数学上不可避免。工程上，Java 采用在槽位后挂载单链表容纳冲突节点的 <dfn title=\"在槽位后挂载单链表容纳多冲突节点的解决技术\"><strong>链地址法 (Separate Chaining)</strong></dfn>；而 Python 字典则采用 <dfn title=\"在连续数组空间内探测寻找闲置槽位的缓存友好型技术\"><strong>开放寻址法 (Open Addressing)</strong></dfn>，通过紧密连续的内存布局充分触发硬件的 <dfn title=\"连续内存布局触发硬件 Cache Line 预取加速的性能特性\"><strong>CPU 缓存局部性 (Cache Locality)</strong></dfn> 加速。",
                    "example": "",
                    "relatedConcepts": ["哈希碰撞", "链地址法", "开放寻址法", "CPU缓存局部性"]
                },
                {
                    "id": "quiz-2",
                    "component": "QuizCard",
                    "title": "🧠 碰撞处理策略选择",
                    "question": "当希望所有数据都紧密挨在连续内存中、获得最佳 CPU 缓存效率时，应该优先选择哪种方案？",
                    "options": [
                        {"id": "opt1", "text": "A. 链地址法 (Separate Chaining)"},
                        {"id": "opt2", "text": "B. 开放寻址法 (Open Addressing)"},
                        {"id": "opt3", "text": "C. 放弃存储"},
                        {"id": "opt4", "text": "D. 重新排序数组"}
                    ],
                    "correctOptionId": "opt2",
                    "explanation": "开放寻址法将所有数据直接连续存放在数组中，没有链表指针开销，因此具有极佳的 CPU 缓存局部性。"
                }
            ]
        }
    },

    # =========================================================================
    # MODULE 3: 📈 空间与性能妥协 —— 负载因子与动态重散列 (Rehash)
    # =========================================================================
    {
        "version": "v0.9",
        "createSurface": {
            "surfaceId": "surface-module-3",
            "catalogId": "https://a2learn.ai/spec/v1/catalog.json"
        }
    },
    {
        "version": "v0.9",
        "updateComponents": {
            "surfaceId": "surface-module-3",
            "components": [
                {
                    "id": "root",
                    "component": "Column",
                    "children": [
                        "header-3",
                        "learning-path-3",
                        "step1-background-3",
                        "step1-chat-3",
                        "step2-naive-3",
                        "step3-mindset-3",
                        "step4-implementation-3",
                        "step5-summary-3",
                        "step6-anchors-3",
                        "cloze-3"
                    ]
                },
                {
                    "id": "header-3",
                    "component": "Text",
                    "variant": "h1",
                    "text": "负载因子与动态重散列 (Rehash)"
                },
                {
                    "id": "learning-path-3",
                    "component": "LearningPath",
                    "title": "哈希表四阶渐进学习路径",
                    "activeStepId": "3",
                    "steps": steps_config
                },
                {
                    "id": "step1-background-3",
                    "component": "AnalogyCard",
                    "title": "满载情况下的性能滑坡",
                    "analogy": "<b>背景</b>：我们在 Module 2 中用链地址法和开放寻址法解决了碰撞。<br><b>衍生新问题</b>：随着数据不断写入，槽位利用率接近 100%，无论是链表变长还是找空槽困难，查找性能都急剧下滑！"
                },
                {
                    "id": "step1-chat-3",
                    "component": "ScenarioDialogue",
                    "topic": "💬 微信技术群：数组满了，查找速度又变慢了！",
                    "characters": {
                        "alice": {"name": "小白程序员 (Alice)", "avatar": "👩‍💻", "alignment": "left"},
                        "boss_zhang": {"name": "架构师老张", "avatar": "👨‍💼", "alignment": "right"}
                    },
                    "messages": [
                        {
                            "characterId": "alice",
                            "content": "张老大！我们的数组容量是 100，现在存了 80 个数据后，每次存取都频繁发生碰撞，速度又慢下来了！"
                        },
                        {
                            "characterId": "boss_zhang",
                            "content": "因为你的负载因子太高了！数组越满，碰撞概率越高。必须做动态扩容！"
                        }
                    ]
                },
                {
                    "id": "step2-naive-3",
                    "component": "MentalModel",
                    "title": "拥挤度对碰撞率的指数级影响",
                    "description": "哈希表的冲突概率与闲置空间比例成反比。要维持低碰撞率，必须保证足够的闲置槽位。",
                    "icon": "📈",
                    "diagramTitle": "📊 满载分布与扩容演推",
                    "diagram": "拥挤度90%: [0:占用 | 1:占用 | 2:占用 | 3:占用 | 4:空闲]\n扩容倍增:   [0:占用 | 1:空闲 | 2:占用 | 3:空闲 | ... | 9:空闲]",
                    "pillarsTitle": "核心原则",
                    "pillars": [
                        {"title": "拥挤度第一性原理", "description": "闲置槽位越少，碰撞率越呈指数级上升。", "icon": "📊"},
                        {"title": "预分配缺陷", "description": "静态预分配大内存会造成极大的空间浪费。", "icon": "⚠️"}
                    ],
                    "analogyTitle": "💡 静态大内存预分配分析",
                    "analogy": "一开始就申请巨大内存空间（如 100 GB）会严重浪费内存资源，且无法预估应用实际需要存多少数据。"
                },
                {
                    "id": "step3-mindset-3",
                    "component": "ConceptCard",
                    "title": "按需监控与容量翻倍",
                    "tags": ["动态平衡", "按需扩容", "空间杠杆"],
                    "definition": "<b>突破思路</b>：不静态死扣内存，而是设置一个<b>拥挤度监控指标</b>。<br>平时保持小内存，一旦拥挤度达到警戒线，立即<b>申请双倍新空间并重新映射</b>！",
                    "example": "<pre><code>// 监控拥挤度指标: size / capacity > 阈值\n// 一旦超标: capacity = capacity * 2，并重新分布原有数据</code></pre>",
                    "relatedConcepts": ["负载因子", "重散列", "动态扩容"]
                },
                {
                    "id": "step4-implementation-3",
                    "component": "DetailedExplanation",
                    "title": "0.75 负载因子、位运算加速与渐进式 Rehash",
                    "icon": "⚙️",
                    "estimatedReadTime": "4 分钟阅读",
                    "content": "工程上对动态扩容的具体落地细节：\n\n1. **<dfn title=\"已存元素总数与当前数组容量的比值 (size / capacity)\">负载因子 (Load Factor)</dfn>**：监控指标。Java HashMap 默认阈值选为 `0.75`（空间与时间的黄金折中）。\n2. **<dfn title=\"容量翻倍为2的幂，用按位与运算替代慢速取模\">位运算优化 (Bitwise And)</dfn>**：容量总是保持为 2 的幂（如 16, 32, 64），取模 `hash % capacity` 被硬件极速指令 `<dfn title=\"位运算替代取模硬件加速\">hash & (capacity - 1)</dfn>` 替代！\n3. **<dfn title=\"将大规模数据搬迁平摊到日常读写中的高并发优化\">渐进式 Rehash (Incremental Rehash)</dfn>**：Redis 采用此法，避免一次性搬迁几百万数据导致系统瞬间卡顿死锁。\n\n> 💡 总结：负载因子是空间与时间杠杆；2 的幂让位运算取代除法；渐进式 Rehash 消除卡顿。"
                },
                {
                    "id": "step5-summary-3",
                    "component": "AnalogyCard",
                    "title": "总结：拥挤度监控与平摊搬迁",
                    "analogy": "负载因子是监控指标，动态 Rehash 是扩容手段，位运算是性能加速器。"
                },
                {
                    "id": "step6-anchors-3",
                    "component": "ConceptCard",
                    "title": "术语总结",
                    "tags": ["术语总结"],
                    "definition": "当数组逐渐填满，系统通过监控 <dfn title=\"已存元素总数与当前容量的比值 (size / capacity)\"><strong>负载因子 (Load Factor)</strong></dfn> 来评估拥挤程度。一旦超越警戒线，便触发容量翻倍与全量映射的 <dfn title=\"申请新容量空间后重新计算全量数据新下标的映射过程\"><strong>重散列 (Rehash)</strong></dfn>。为了防止高并发下大搬迁导致系统卡死，工业级实现常结合 <dfn title=\"将大规模扩容搬迁分批平摊到日常读写中的高并发优化技术\"><strong>渐进式 Rehash</strong></dfn> 将搬迁开销平摊到每次日常读写中。",
                    "example": "",
                    "relatedConcepts": ["负载因子", "重散列", "渐进式 Rehash"]
                },
                {
                    "id": "cloze-3",
                    "component": "ClozeTest",
                    "title": "动态扩容机制巩固",
                    "instruction": "根据刚学到的知识，补全句子：",
                    "passage": "哈希表用 [blank1] 来表示拥挤程度。当已存元素比例超过阈值时会触发 [blank2]。为了用极速的位运算替代昂贵的取模，哈希表的容量通常保持为 [blank3]。",
                    "options": ["负载因子", "动态重散列 (Rehash)", "2 的幂", "二分查找"],
                    "correctAnswers": {"blank1": "负载因子", "blank2": "动态重散列 (Rehash)", "blank3": "2 的幂"}
                }
            ]
        }
    },

    # =========================================================================
    # MODULE 4: 🛡️ 最坏情况退化与安全防御 —— HashDoS 攻击与红黑树树化
    # =========================================================================
    {
        "version": "v0.9",
        "createSurface": {
            "surfaceId": "surface-module-4",
            "catalogId": "https://a2learn.ai/spec/v1/catalog.json"
        }
    },
    {
        "version": "v0.9",
        "updateComponents": {
            "surfaceId": "surface-module-4",
            "components": [
                {
                    "id": "root",
                    "component": "Column",
                    "children": [
                        "header-4",
                        "learning-path-4",
                        "step1-background-4",
                        "step1-chat-4",
                        "step2-naive-4",
                        "step3-mindset-4",
                        "step4-implementation-4",
                        "step5-summary-4",
                        "step6-anchors-4",
                        "quiz-4"
                    ]
                },
                {
                    "id": "header-4",
                    "component": "Text",
                    "variant": "h1",
                    "text": "HashDoS 攻击与红黑树树化"
                },
                {
                    "id": "learning-path-4",
                    "component": "LearningPath",
                    "title": "哈希表四阶渐进学习路径",
                    "activeStepId": "4",
                    "steps": steps_config
                },
                {
                    "id": "step1-background-4",
                    "component": "AnalogyCard",
                    "title": "最坏散列分布与安全攻击",
                    "analogy": "<b>背景</b>：我们在 Module 1~3 建立了完备的哈希表。<br><b>极端新问题</b>：黑客故意发送成千上万个经过精心构造的碰撞 Key，全部挤在同一个槽位里！O(1) 暴跌为 O(N)，导致服务器 CPU 100% 瘫痪！"
                },
                {
                    "id": "step1-chat-4",
                    "component": "ScenarioDialogue",
                    "topic": "💬 微信技术群：预警！有人利用哈希碰撞攻击了我们的服务器！",
                    "characters": {
                        "alice": {"name": "小白程序员 (Alice)", "avatar": "👩‍💻", "alignment": "left"},
                        "boss_zhang": {"name": "架构师老张", "avatar": "👨‍💼", "alignment": "right"}
                    },
                    "messages": [
                        {
                            "characterId": "alice",
                            "content": "老张！不好了！刚才接口突然收到了几万个精心构造的请求，结果槽位 5 下面的链表长达 1 万个节点，O(1) 变成了 O(N)，整个服务被卡死了！"
                        },
                        {
                            "characterId": "boss_zhang",
                            "content": "这是经典的 <dfn title=\"黑客故意发送大量同哈希值的Key使哈希表退化为链表以瘫痪服务器的攻击\">HashDoS 攻击</dfn>！必须从算法与数据结构做双重防御。"
                        }
                    ]
                },
                {
                    "id": "step2-naive-4",
                    "component": "MentalModel",
                    "title": "最坏情况下的复杂度退化",
                    "description": "哈希表的 O(1) 性能依赖于均匀散列假设。当输入分布被恶心操纵时，性能界限面临最坏情况考验。",
                    "icon": "⚠️",
                    "diagramTitle": "📊 恶劣散列退化示意",
                    "diagram": "均匀分布: [0:Node | 1:Node | 2:Node | 3:Node]\n退化倾斜: [0:Node->Node->Node...10000个! | 1:空 | 2:空 | 3:空]",
                    "pillarsTitle": "性能界限",
                    "pillars": [
                        {"title": "最坏复杂度", "description": "算法必须考虑最坏情况下的渐进性能界限。", "icon": "📉"},
                        {"title": "盲信风险", "description": "盲目假设输入均匀会导致系统极易被拒绝服务攻击瘫痪。", "icon": "❌"}
                    ],
                    "analogyTitle": "💡 盲目信任输入随机性的风险",
                    "analogy": "黑客可以事先在本地计算好几万个哈希值相同的 Key（HashDoS），一秒击垮防线。"
                },
                {
                    "id": "step3-mindset-4",
                    "component": "ConceptCard",
                    "title": "算法随机化与底层结构升级",
                    "tags": ["SipHash随机化", "最坏情况保底", "安全防御"],
                    "definition": "<b>突破思路</b>：双重兜底！<br>入口层使用<b>随机 Seed 散列算法</b>让黑客无法预测；底层在节点过长时<b>自动升级为高级数据结构</b>，硬性锁死最坏时间复杂度！",
                    "example": "<pre><code>// 防御 1 (算法随机化): 每次启动进程注入随机种子 SipHash(Key, Seed)\n// 防御 2 (结构升级): 当单链表长度 >= 8 时，链表 -> 自平衡红黑树 (最坏 O(log N))</code></pre>",
                    "relatedConcepts": ["HashDoS", "红黑树树化", "SipHash"]
                },
                {
                    "id": "step4-implementation-4",
                    "component": "DetailedExplanation",
                    "title": "Java 8 红黑树树化与 SipHash 随机种子",
                    "icon": "⚙️",
                    "estimatedReadTime": "4 分钟阅读",
                    "content": "工业级哈希表的两大防线：\n\n1. **<dfn title=\"链表长度达到阈值8时自动升级为自平衡二叉查找树的机制\">红黑树树化 (Treeify)</dfn>**：Java 8+ HashMap 规定，当单槽位链表长度 ≥ 8 且容量 ≥ 64 时，链表转换为红黑树。哪怕挂了 1,000,000 个碰撞节点，最坏查找步数也只需 log(1000000) ≈ 20 次，强行锁定在 **O(log N)**！\n2. **<dfn title=\"采用随机密钥防预测的工业级安全散列算法\">SipHash 随机加盐</dfn>**：Python 3.4+ 和 Rust 默认采用 SipHash，每次启动随机生成哈希 Seed，使外部黑客完全无法预测碰撞 Key。\n\n> 💡 总结：数据结构树化解决极端退化；随机 SipHash 解决攻击预测。"
                },
                {
                    "id": "step5-summary-4",
                    "component": "AnalogyCard",
                    "title": "总结：算法随机化与自适应兜底",
                    "analogy": "工业级哈希表通过算法随机化和数据结构自适应兜底，彻底封死了黑客攻击与最坏退化的漏洞。"
                },
                {
                    "id": "step6-anchors-4",
                    "component": "ConceptCard",
                    "title": "术语总结",
                    "tags": ["术语总结"],
                    "definition": "面对黑客故意构造同哈希 Key 瘫痪服务器的 <dfn title=\"黑客构造同哈希Key使哈希表退化为链表以瘫痪服务器的攻击\"><strong>HashDoS 攻击</strong></dfn>，工业级系统构建了两道硬核防线：入口层采用带随机 Seed 的 <dfn title=\"利用进程随机Seed阻止外部预测哈希值的工业级安全散列算法\"><strong>SipHash 算法</strong></dfn> 阻止黑客预测；数据结构层则引入 <dfn title=\"单槽位链表长度达到阈值8时升级为自平衡红黑树的兜底防御\"><strong>树化机制 (Treeify)</strong></dfn>，在冲突过多时将单链表自动升级为自平衡红黑树，强行把最坏查找复杂度锁死在 O(log N)。",
                    "example": "",
                    "relatedConcepts": ["HashDoS", "树化机制", "SipHash"]
                },
                {
                    "id": "quiz-4",
                    "component": "QuizCard",
                    "title": "🧠 工业级哈希表安全理解",
                    "question": "Java 8 HashMap 为什么选择在单个槽位链表长度达到 8 时将其转换为红黑树？",
                    "options": [
                        {"id": "opt1", "text": "A. 因为 8 是幸运数字"},
                        {"id": "opt2", "text": "B. 防止 HashDoS 攻击或极罕见碰撞导致查找退化为 O(N)"},
                        {"id": "opt3", "text": "C. 为了节省内存"},
                        {"id": "opt4", "text": "D. 红黑树占用的空间比链表更小"}
                    ],
                    "correctOptionId": "opt2",
                    "explanation": "当碰撞节点过多时，链表查找复杂度为 O(N)。转换为红黑树能将最坏查找复杂度锁定在 O(log N)，有效防止性能剧烈退化和 HashDoS 攻击。"
                }
            ]
        }
    }
]

out_path = Path("apps/viewer/public/generated/site_messages.json")
out_path.write_text(json.dumps(messages, ensure_ascii=False, indent=2), encoding="utf-8")
print("SUCCESSFULLY_UPDATED_VISUAL_MEMORY_DIAGRAM_SITE_MESSAGES")
