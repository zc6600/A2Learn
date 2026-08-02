import json
from pathlib import Path

# =============================================================================
# CHINESE VERSION (ZH) - ALL 4 MODULES RICH, SUBSTANTIAL & MULTI-PARAGRAPH
# =============================================================================
steps_config_zh = [
    {"id": "1", "title": "1. 查找效率危机 (O(1)计算)", "targetSurfaceId": "surface-module-1"},
    {"id": "2", "title": "2. 散列碰撞困境 (冲突解决)", "targetSurfaceId": "surface-module-2"},
    {"id": "3", "title": "3. 空间性能妥协 (负载因子/Rehash)", "targetSurfaceId": "surface-module-3"},
    {"id": "4", "title": "4. 工业安全防御 (HashDoS/红黑树)", "targetSurfaceId": "surface-module-4"}
]

messages_zh = [
    # MODULE 1 (ZH)
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
                        "step5-summary"
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
                    "steps": steps_config_zh
                },
                {
                    "id": "step1-background",
                    "component": "AnalogyCard",
                    "title": "海量数据检索的吞吐量瓶颈",
                    "analogy": "<b>现实背景</b>：在现代分布式系统、高并发 Web 框架或数据库内核中，数据检索是最频繁的操作之一。无论是根据 Token 校验用户身份、在缓存中查找 Key，还是路由 HTTP 请求，都面临巨大的吞吐量压力。<br><br><b>核心痛点</b>：当内存中的数据规模增长到 100 万甚至 1 亿条时，传统的查找方式效率会极剧恶化。如果每次查询都需要扫描成千上万个数据节点，服务器 CPU 将迅速被无意义的比对指令占满，导致系统响应耗时飙升至数百毫秒甚至卡死瘫痪。如何才能实现不受数据总量规模影响的毫秒级极速定位？"
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
                            "content": "张老大！我在线上写了个用户查询功能，在内存的 100 万条数组里循环比对用户名。平时几百条数据挺快的，今天上线大促，CPU 瞬间飙到了 100%，一次查询居然耗时 800ms！"
                        },
                        {
                            "characterId": "boss_zhang",
                            "content": "你这是典型的 <dfn title=\"按顺序逐个比对数据的线性查找方式，最坏需要比对N次\">顺序查找 O(N)</dfn>！当数据规模 N 扩大 1000 倍，你的比较次数和 CPU 指令数也跟着翻了 1000 倍。海量数据下必须彻底改掉‘挨个比对’的直觉思路！"
                        },
                        {
                            "characterId": "alice",
                            "content": "那我如果先把数组按字母排序，用二分查找 O(log N) 呢？查找只需要 20 次，是不是就解决问题了？"
                        },
                        {
                            "characterId": "boss_zhang",
                            "content": "二分查找虽然查得快，但在内存里保持有序的代价极其昂贵！每次新用户注册插入数据时，你都得把后续几十万个节点在内存里整体平移，写性能会直接崩溃。我们需要的是一种兼顾读写且速度达到 O(1) 的全新范式！"
                        }
                    ]
                },
                {
                    "id": "step2-naive",
                    "component": "MentalModel",
                    "title": "物理内存本质与节点搬迁开销",
                    "description": "计算机物理内存 (RAM) 在硬件层面本质是一个连续的字节数组。RAM 硬件天生支持根据数字物理下标在常数时间内直接读取任意内存地址。所有高级数据结构的存取最终都建立在这个硬件特性上。",
                    "icon": "🧠",
                    "diagramTitle": "📊 物理内存数据流动与搬迁演推",
                    "diagram": "初始内存: [0:10 | 1:20 | 2:30 | 3:50 | 4:60]\n目标操作: 插入数字 25 到有序位置 (下标 2)\n步骤1 右移: 60->下标5, 50->下标4, 30->下标3  ==> [0:10 | 1:20 | 2:空 | 3:30 | 4:50 | 5:60]\n步骤2 写入: 25 写入已腾空的下标 2           ==> [0:10 | 1:20 | 2:25 | 3:30 | 4:50 | 5:60]",
                    "pillarsTitle": "硬件特性与传统方案缺陷",
                    "pillars": [
                        {"title": "硬件存取特性", "description": "RAM 物理总线天然支持按数字下标 O(1) 随机存取，耗时只与电信号传输有关，与数据总量无关。", "icon": "⚡"},
                        {"title": "无序数组缺陷", "description": "顺序遍历最坏比对 N 次，数据量越大耗时呈线性成倍剧增。", "icon": "❌"},
                        {"title": "有序数组缺陷", "description": "查找需 O(log N)，但插入与删除需要搬迁大量后续内存节点，内存总线开销达到 O(N)。", "icon": "⚠️"}
                    ],
                    "analogyTitle": "💡 真实数据搬迁开销步步演推",
                    "analogy": "<b>向已排序数组 [ 10, 20, 30, 50, 60 ] 中插入数字 25 的内存演推：</b><br><br>1. <b>定位槽位</b>：经过对比发现数字 25 应该插入到 20 和 30 之间（即目标下标 2）；<br>2. <b>内存搬迁</b>：由于物理数组内存空间必须连续，为了给 25 腾出物理空位，节点 60、50、30 必须在物理地址上整体右移 1 位（60 移动到下标 5，50 移动到 4，30 移动到 3）；<br>3. <b>数据写入</b>：将数字 25 写入已经腾空的物理下标 2。<br><br>💥 <b>痛感直击</b>：仅仅插入 1 个数字，就导致内存中 3 个元素被迫平移搬家！如果数组存有 100 万个数据，插入一次将在物理内存总线上搬迁 50 万个节点，性能极其低下！"
                },
                {
                    "id": "step3-mindset",
                    "component": "ConceptCard",
                    "title": "计算范式突破：让 Key 的名称直接算出内存下标",
                    "tags": ["计算代替比对", "O(1)寻址", "范式突破"],
                    "definition": "彻底放弃‘逐个遍历比对 Key 值’的旧思维，转向<b>‘直接计算物理内存地址’</b>的新范式！<br><br>不要去遍历内存询问数据藏在哪里，而是设计一个高效的数学计算公式，传入 Key 的名称（如用户 ID），公式直接计算出该数据应该保存在数组的哪个物理下标中！",
                    "example": "// 传统搜索范式 (遍历比对): 查找 'Alice' -> 遍历比对 1,000,000 次\n// 哈希计算范式 (直接计算): 计算 'Alice' -> 算法直接得出 下标 5 -> 一步读取 arr[5]",
                    "relatedConcepts": ["哈希函数", "O(1)复杂度", "散列映射"]
                },
                {
                    "id": "step4-implementation",
                    "component": "DetailedExplanation",
                    "title": "哈希函数与槽位数组实现 (含 Python 伪代码示例)",
                    "icon": "⚙️",
                    "estimatedReadTime": "4 分钟深度解析",
                    "content": "为了将“用计算代替比对”的思路落地到工程实践中，数据结构引入了两个核心基础设施：\n\n1. **<dfn title=\"将任意长度输入 Key 映射转换为固定范围无符号整数的数学算法\">哈希函数 (Hash Function)</dfn>**：负责接收任意格式的 Key（如字符串、身份证号、对象引用），计算出一个无符号整数。比如 `hash('Alice') = 154829`。\n2. **<dfn title=\"在物理内存中连续开辟的存储槽位数组\">槽位数组 (Bucket Array / Hash Table)</dfn>**：开辟容量为 `capacity` 的物理数组，将算出的哈希值对容量取模，得到物理下标：`index = hash(key) % capacity`。\n\n🐍 **Python 调库与伪代码示例**：\n```python\n# 方式 A：调用 Python 内置 hash()，先把任意 Key 转成整数；随后再用取模把这个整数压缩到 0~9 的槽位范围，便于观察‘Key 如何定位到数组位置’\nkey = \"Alice\"\ncapacity = 10\nslot_index = abs(hash(key)) % capacity  # 算出 0~9 槽位号\n\n# 方式 B：手写一个更容易读懂的哈希函数；逐个累加字符编码，让学习者可以追踪每个字符如何参与最终槽位计算\ndef simple_hash(key: str, capacity: int = 10) -> int:\n    return sum(ord(char) for char in key) % capacity\n```\n\n**常数时间复杂度 O(1) 的物理保障**：\n无论数组里当前保存的是 10 条数据还是 1,000,000 条数据，只要哈希函数的计算过程极快，定位特定 Key 所在内存地址的总耗时都是固定的！这就是 **<dfn title=\"执行耗时与数据总量规模完全无关的极致性能界限\">常数时间复杂度 O(1)</dfn>** 的物理来源。"
                },
                {
                    "id": "step4-sandbox",
                    "component": "InteractiveSandbox",
                    "title": "代码演示：观察内存数组挪动与哈希直接定位的区别",
                    "description": "点击运行代码，对比在有序数组中插入元素（需搬迁后续内存）与哈希计算直接定位的执行开销：",
                    "language": "javascript",
                    "code": """// 演示 1：在有序数组 [10, 20, 30, 50, 60] 中插入 25；目标是把它放到 20 和 30 之间，因此后面的元素都必须先向右搬迁
let arr = [10, 20, 30, 50, 60];
let insertVal = 25;
let shiftCount = 0;

// 模拟连续数组的物理搬迁：必须从最后一个元素开始向右移动，避免前面的值覆盖还没有搬走的数据；每次循环都代表一次实际的槽位复制
arr.push(undefined);
for (let i = arr.length - 1; i > 2; i--) {
  arr[i] = arr[i - 1];
  shiftCount++;
}
arr[2] = insertVal;

console.log("插入后数组:", arr);
console.log("被迫平移搬迁的内存块数量:", shiftCount, "次");
console.log("------------------------------------------");

// 演示 2：让哈希函数直接计算槽位；这里不遍历整个数组，而是把 Key 的字符逐个混入一个整数，最后得到可直接访问的下标
function simpleHash(key, capacity = 10) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) % capacity;
  }
  return hash;
}

console.log("Key 'Alice' 直接算出的槽位号:", simpleHash('Alice'));
console.log("Key 'Bob'   直接算出的槽位号:", simpleHash('Bob'));""",
                    "runLocally": True
                },
                {
                    "id": "step5-summary",
                    "component": "AnalogyCard",
                    "title": "总结：从搜索比对到公式计算",
                    "analogy": "实现 O(1) 极速查找的关键，在于利用物理内存可直接按数字下标存取的硬件特性，将<b>‘挨个搜索比对’</b>替换为<b>‘公式直接计算’</b>。<hr><div class=\"terms-section\"><h5 class=\"terms-section-title\">📌 术语总结</h5><p>要彻底破解海量数据检索的效率危机，核心在于从传统的 <dfn title=\"按顺序逐个比对元素的基准方案，耗时随数据量成正比\"><strong>顺序查找 O(N)</strong></dfn> 转向计算思想。通过精心设计的 <dfn title=\"将任意格式Key映射转换为固定范围整数索引的散列计算公式\"><strong>哈希函数 (Hash Function)</strong></dfn>，将任意 Key 直接转换为内存下标，从而将数据存取性能提升至与规模完全无关的 <dfn title=\"数据检索耗时与数据总量规模完全无关的极致性能表现\"><strong>常数时间复杂度 O(1)</strong></dfn>。</p></div>"
                }
            ]
        }
    },

    # MODULE 2 (ZH)
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
                    "steps": steps_config_zh
                },
                {
                    "id": "step1-background-2",
                    "component": "AnalogyCard",
                    "title": "散列重号引发的数据覆盖危机",
                    "analogy": "<b>衍生新问题</b>：在 Module 1 中，我们利用哈希函数算出了数组下标。但在实际业务中，输入的 Key 组合是无限的（如无数的用户姓名），而开辟的数组槽位容量永远是有限的。<br><br><b>覆写灾难</b>：当系统存入多个不同 Key 时（如 'Alice' 与 'David'），哈希函数不可避免地算出了<b>完全相同的物理下标 5</b>！如果直接把数据写入 5 号槽位，后存入的 David 会把 Alice 的数据彻底覆盖抹掉，引发致命的数据丢失错误！"
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
                            "content": "张老大！不好了！用户 'Alice' 和 'David' 存入系统时，哈希函数居然算出了相同的下标 5！David 的数据直接把 Alice 覆盖掉了，线上出现了严重的数据覆盖 Bug！"
                        },
                        {
                            "characterId": "boss_zhang",
                            "content": "这就是必然发生的“哈希碰撞”！因为输出的数组槽位是有限的，而输入的 Key 是无限的。数学上早就证明了碰撞绝对无法被彻底避免。"
                        },
                        {
                            "characterId": "alice",
                            "content": "那能不能设计一个完美不碰撞的哈希函数？"
                        },
                        {
                            "characterId": "boss_zhang",
                            "content": "不可能的！鸽巢原理告诉我们，只要苹果数量大于抽屉数量，就必定有至少两个苹果挤在同一个抽屉里。工程上必须学会‘容忍碰撞’并建立冲突处理机制！"
                        }
                    ]
                },
                {
                    "id": "step2-naive-2",
                    "component": "MentalModel",
                    "title": "鸽巢原理与冲突解决流派",
                    "description": "根据数学上的鸽巢原理 (Pigeonhole Principle)，当 Key 的取值空间远大于数组容量 `capacity` 时，必定存在至少两个不同的 Key 映射到相同的物理下标。这是数学规律，而非代码 Bug。",
                    "icon": "🐦",
                    "diagramTitle": "📊 输入映射冲突与节点覆写示意",
                    "diagram": "Alice 映射: [0:空 | 1:空 | 5:Alice | 6:空]\nDavid 冲突: [0:空 | 1:空 | 5:冲突!  | 6:空]\n\n直接覆写: 5号槽位 Alice 数据丢失！ ❌",
                    "pillarsTitle": "数学原理与方案对比",
                    "pillars": [
                        {"title": "鸽巢原理", "description": "无限输入映射到有限槽位，哈希碰撞在数学逻辑上绝对不可避免。", "icon": "📐"},
                        {"title": "直接覆写缺陷", "description": "覆盖旧数据将导致致命的数据破坏与业务灾难。", "icon": "💥"}
                    ],
                    "analogyTitle": "💡 碰撞后覆写的灾难剖析",
                    "analogy": "当发生索引重号时，如果采用了直接用新值覆盖旧值的简单逻辑，会导致前面存入的数据彻底消失。用户在登录 Alice 账号时居然查到了 David 的信息！"
                },
                {
                    "id": "step3-mindset-2",
                    "component": "ConceptCard",
                    "title": "多节点挂载与规则顺延",
                    "tags": ["容忍碰撞", "多维存储", "空间解耦"],
                    "definition": "承认碰撞必然发生，不再追求‘一个槽位只能存一个元素’。<br><br><b>两大流派思维</b>：<br>1. <b>纵向挂载 (Chaining)</b>：在槽位内部建立多节点挂载链表，同一个槽位挂载多个碰撞数据！<br>2. <b>横向探测 (Open Addressing)</b>：当槽位被占时，允许新数据按既定探测规则去附近寻址闲置槽位！",
                    "example": "// 思路 1 (链地址法): 槽位 5 内部挂载链表 -> [Alice] -> [David]\n// 思路 2 (开放寻址法): 槽位 5 被占 -> 顺延检查 6号槽位 -> 若空闲则存入 6号",
                    "relatedConcepts": ["链地址法", "开放寻址法", "碰撞解决"]
                },
                {
                    "id": "step4-implementation-2",
                    "component": "DetailedExplanation",
                    "title": "链地址法 vs 开放寻址法及 Python dict 调库示例",
                    "icon": "⚙️",
                    "estimatedReadTime": "4 分钟深度解析",
                    "content": "工程实现中对碰撞处理形成了两大主流解法：\n\n1. **<dfn title=\"每个槽位维护一条单链表，冲突节点追加到链表末尾\">链地址法 (Separate Chaining)</dfn>**：Java HashMap 采用此法。每个数组槽位指向一条单向链表。发生碰撞时将新节点追加到链表末尾。缺点是链表节点在物理内存中随机分布，<dfn title=\"CPU预取连续内存数据的硬件加速机制\">CPU 缓存局部性</dfn> 较差。\n2. **<dfn title=\"不建链表，冲突时按线性或二次探测规则检查数组相邻闲置槽位\">开放寻址法 (Open Addressing)</dfn>**：Python dict 采用此法。所有数据都紧密平铺在连续数组空间里。当发生碰撞时，寻找下一个空闲槽位。\n\n🐍 **Python 原生字典 (dict) O(1) 调库与伪代码示例**：\n```python\n# 方式 1: 直接使用 Python 原生 dict (底层已自动处理冲突与扩展)\nuser_scores = {}\nuser_scores[\"Alice\"] = 95  # 内部自动通过 hash(\"Alice\") 找到槽位存入\nprint(user_scores[\"Alice\"])  # 极速 O(1) 查找\n\n# 方式 2: 开放寻址冲突顺延伪代码\ndef get_with_probe(buckets, key, capacity):\n    index = abs(hash(key)) % capacity\n    while buckets[index] is not None and buckets[index][0] != key:\n        index = (index + 1) % capacity  # 冲突时平滑顺延检查下一槽位\n    return buckets[index]\n```\n\n> 💡 工业权衡：Java HashMap 选链地址法求高容错；Python dict 选开放寻址法求极致物理内存与 CPU 缓存性能。"
                },
                {
                    "id": "step5-summary-2",
                    "component": "AnalogyCard",
                    "title": "总结：纵向链表 vs 横向连续槽位",
                    "analogy": "碰撞不可消除。链地址法通过纵向扩展链表解决冲突，开放寻址法通过横向寻找连续空槽解决冲突。<hr><div class=\"terms-section\"><h5 class=\"terms-section-title\">📌 术语总结</h5><p>在有限槽位中，不同 Key 映射到同一下标的 <dfn title=\"不同Key映射到完全相同数组下标的必然现象\"><strong>哈希碰撞 (Hash Collision)</strong></dfn> 在数学上不可避免。工程上，Java 采用在槽位后挂载单链表容纳冲突节点的 <dfn title=\"在槽位后挂载单链表容纳多冲突节点的解决技术\"><strong>链地址法 (Separate Chaining)</strong></dfn>；而 Python 字典则采用 <dfn title=\"在连续数组空间内探测寻找闲置槽位的缓存友好型技术\"><strong>开放寻址法 (Open Addressing)</strong></dfn>，通过紧密连续的内存布局充分触发硬件的 <dfn title=\"连续内存布局触发硬件 Cache Line 预取加速的性能特性\"><strong>CPU 缓存局部性 (Cache Locality)</strong></dfn> 加速。</p></div>"
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

    # MODULE 3 (ZH)
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
                    "steps": steps_config_zh
                },
                {
                    "id": "step1-background-3",
                    "component": "AnalogyCard",
                    "title": "满载情况下的性能滑坡",
                    "analogy": "<b>衍生新问题</b>：在 Module 2 中，我们用链地址法和开放寻址法解决了碰撞问题。但随着系统运行，存入的数据量越来越多，物理数组的利用率渐渐接近 100%。<br><br><b>性能滑坡危机</b>：当槽位几乎被填满时，链地址法的单链表变得越来越长，查找退化为遍历链表；开放寻址法则很难找到闲置空槽，探测寻找步数剧增！哈希表原本引以为傲的 O(1) 性能迅速滑坡坍塌。"
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
                            "content": "张老大！我们的哈希表初始容量设了 100。现在写入了 90 个元素，结果每次读写都频繁碰撞，速度又慢成狗了！"
                        },
                        {
                            "characterId": "boss_zhang",
                            "content": "因为你的负载因子太高了！哈希表就像一个停车场，空位越少，找车位的耗时越长。必须引入拥挤度监控与动态扩容！"
                        }
                    ]
                },
                {
                    "id": "step2-naive-3",
                    "component": "MentalModel",
                    "title": "拥挤度对碰撞率的指数级影响",
                    "description": "哈希表的冲突概率与闲置槽位比例成反比。要维持低碰撞率与 O(1) 检索，必须保证足够的闲置空间比例。",
                    "icon": "📈",
                    "diagramTitle": "📊 满载分布与容量翻倍 Rehash 演推",
                    "diagram": "拥挤度90%: [0:占用 | 1:占用 | 2:占用 | 3:占用 | 4:空闲]\n容量翻倍:   [0:占用 | 1:空闲 | 2:占用 | 3:空闲 | ... | 9:空闲]",
                    "pillarsTitle": "核心原则",
                    "pillars": [
                        {"title": "拥挤度与动态扩容", "description": "闲置槽位越少，冲突概率呈指数级上升，必须动态维持安全水位。", "icon": "📊"},
                        {"title": "静态大内存缺陷", "description": "一开始就申请巨大的物理内存会造成极大的内存资源浪费。", "icon": "⚠️"}
                    ],
                    "analogyTitle": "💡 静态大内存预分配分析",
                    "analogy": "一开始就申请巨大内存空间（如 100 GB）会严重浪费内存资源，且无法预估应用实际需要存多少数据。"
                },
                {
                    "id": "step3-mindset-3",
                    "component": "ConceptCard",
                    "title": "按需监控与容量翻倍重散列",
                    "tags": ["动态平衡", "按需扩容", "空间杠杆"],
                    "definition": "不静态死扣内存，而是设置一个<b>拥挤度监控指标</b>。<br><br>平时保持小内存，一旦拥挤度超过设定的安全警戒线，立即<b>申请双倍新数组空间，并将全量数据重新计算下标分布</b>！",
                    "example": "// 监控拥挤度指标: size / capacity > 0.75\n// 一旦超标: capacity = capacity * 2，并重新分布全量数据",
                    "relatedConcepts": ["负载因子", "重散列", "动态扩容"]
                },
                {
                    "id": "step4-implementation-3",
                    "component": "DetailedExplanation",
                    "title": "0.75 负载因子、位运算加速与渐进式 Rehash",
                    "icon": "⚙️",
                    "estimatedReadTime": "4 分钟深度解析",
                    "content": "动态扩容的三大精妙设计：\n\n1. **<dfn title=\"已存元素总数与当前数组容量的比值 (size / capacity)\">负载因子 (Load Factor)</dfn>**：监控指标。Java HashMap 默认阈值选为 `0.75`（空间利用率与时间性能的最佳数学折中）。\n2. **<dfn title=\"容量保持为2的幂，用按位与运算替代慢速取模\">位运算优化 (Bitwise And)</dfn>**：容量总是保持为 2 的幂（如 16, 32, 64），取模 `hash % capacity` 被硬件极速指令 `<dfn title=\"位运算替代取模硬件加速\">hash & (capacity - 1)</dfn>` 替代！\n3. **<dfn title=\"将大规模数据搬迁平摊到日常读写中的高并发优化\">渐进式 Rehash (Incremental Rehash)</dfn>**：Redis 采用此法，维护 `ht[0]` 与 `ht[1]` 两个哈希表，避免一次性搬迁几百万数据导致系统瞬间卡死。"
                },
                {
                    "id": "step5-summary-3",
                    "component": "AnalogyCard",
                    "title": "总结：拥挤度监控与平摊搬迁",
                    "analogy": "负载因子是监控指标，动态 Rehash 是扩容手段，位运算是性能加速器。<hr><div class=\"terms-section\"><h5 class=\"terms-section-title\">📌 术语总结</h5><p>当数组逐渐填满，系统通过监控 <dfn title=\"已存元素总数与当前容量的比值 (size / capacity)\"><strong>负载因子 (Load Factor)</strong></dfn> 来评估拥挤程度。一旦超越警戒线，便触发容量翻倍与全量映射的 <dfn title=\"申请新容量空间后重新计算全量数据新下标的映射过程\"><strong>重散列 (Rehash)</strong></dfn>。为了防止高并发下大搬迁导致系统卡死，工业级实现常结合 <dfn title=\"将大规模扩容搬迁分批平摊到日常读写中的高并发优化技术\"><strong>渐进式 Rehash</strong></dfn> 将搬迁开销平摊到每次日常读写中。</p></div>"
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

    # MODULE 4 (ZH)
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
                    "steps": steps_config_zh
                },
                {
                    "id": "step1-background-4",
                    "component": "AnalogyCard",
                    "title": "最坏散列分布与安全攻击",
                    "analogy": "<b>衍生极端问题</b>：在 Module 1~3 中，我们构建了完备的动态哈希表。<br><br><b>最坏情况危机</b>：然而，黑客可以恶意利用哈希函数的公开确定性规则，事先在本地构造几万个哈希值完全相等的 Key 并一次性发送给服务器！所有的 Key 全部挤在同一个槽位里，单链表长达几万节点，O(1) 暴跌退化为 O(N)，导致线上服务器 CPU 100% 瘫痪！"
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
                            "content": "老张！不好了！刚才线上 API 突然收到几万个精心构造的请求，结果槽位 5 下面的链表居然挂了 1 万个节点，O(1) 变成了 O(N)，整个服务全卡死了！"
                        },
                        {
                            "characterId": "boss_zhang",
                            "content": "这是经典的 <dfn title=\"黑客故意发送大量同哈希值的Key使哈希表退化为链表以瘫痪服务器的攻击\">HashDoS 攻击</dfn>！必须从算法散列随机化与底层数据结构双重防御！"
                        }
                    ]
                },
                {
                    "id": "step2-naive-4",
                    "component": "MentalModel",
                    "title": "最坏情况下的复杂度退化",
                    "description": "哈希表的 O(1) 性能依赖于“输入随机分布”假设。当输入分布被恶心操纵时，性能界限面临最坏情况考验。",
                    "icon": "⚠️",
                    "diagramTitle": "📊 恶劣散列退化示意",
                    "diagram": "均匀分布: [0:Node | 1:Node | 2:Node | 3:Node]\n退化倾斜: [0:Node->Node->Node...10000个! | 1:空 | 2:空 | 3:空]",
                    "pillarsTitle": "性能界限",
                    "pillars": [
                        {"title": "最坏复杂度", "description": "算法设计必须考虑最坏情况下的渐进性能界限。", "icon": "📉"},
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
                    "definition": "双重保底！<br><br>1. <b>入口随机化</b>：使用带随机 Seed 的散列算法，让黑客在本地无法预测线上哈希值！<br>2. <b>底层结构升级</b>：当单槽位节点数过多时，自动将单链表升级为高级平衡树，强行锁死最坏查找复杂度！",
                    "example": "// 防御 1 (算法随机化): 每次启动进程注入随机种子 SipHash(Key, Seed)\n// 防御 2 (结构升级): 当单链表长度 >= 8 时，链表 -> 自平衡红黑树 (最坏 O(log N))",
                    "relatedConcepts": ["HashDoS", "红黑树树化", "SipHash"]
                },
                {
                    "id": "step4-implementation-4",
                    "component": "DetailedExplanation",
                    "title": "Java 8 红黑树树化与 SipHash 随机种子",
                    "icon": "⚙️",
                    "estimatedReadTime": "4 分钟深度解析",
                    "content": "工业级哈希表的两大防线：\n\n1. **<dfn title=\"链表长度达到阈值8时自动升级为自平衡二叉查找树的机制\">红黑树树化 (Treeify Threshold)</dfn>**：Java 8+ HashMap 规定，当单槽位链表长度 ≥ 8 且容量 ≥ 64 时，链表自动转换为红黑树。哪怕挂了 1,000,000 个碰撞节点，最坏查找步数也只需 log(1000000) ≈ 20 次，强行锁定在 **O(log N)**！\n2. **<dfn title=\"采用随机密钥防预测的工业级安全散列算法\">SipHash 随机加盐</dfn>**：Python 3.4+ 和 Rust 默认采用 SipHash，每次启动随机生成哈希 Seed，使外部黑客完全无法预测碰撞 Key。\n\n> 💡 工业总结：数据结构树化解决极端退化；随机 SipHash 解决攻击预测。"
                },
                {
                    "id": "step5-summary-4",
                    "component": "AnalogyCard",
                    "title": "总结：算法随机化与自适应兜底",
                    "analogy": "工业级哈希表通过算法随机化和数据结构自适应兜底，彻底封死了黑客攻击与最坏退化的漏洞。<hr><div class=\"terms-section\"><h5 class=\"terms-section-title\">📌 术语总结</h5><p>面对黑客故意构造同哈希 Key 瘫痪服务器的 <dfn title=\"黑客构造同哈希Key使哈希表退化为链表以瘫痪服务器的攻击\"><strong>HashDoS 攻击</strong></dfn>，工业级系统构建了两道硬核防线：入口层采用带随机 Seed 的 <dfn title=\"利用进程随机Seed阻止外部预测哈希值的工业级安全散列算法\"><strong>SipHash 算法</strong></dfn> 阻止黑客预测；数据结构层则引入 <dfn title=\"单槽位链表长度达到阈值8时升级为自平衡红黑树的兜底防御\"><strong>树化机制 (Treeify)</strong></dfn>，在冲突过多时将单链表自动升级为自平衡红黑树，强行把最坏查找复杂度锁死在 O(log N)。</p></div>"
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


# =============================================================================
# ENGLISH VERSION (EN) - ALL 4 MODULES FULLY POPULATED & RICH
# =============================================================================
steps_config_en = [
    {"id": "1", "title": "1. Search Crisis (O(1) Direct Access)", "targetSurfaceId": "surface-module-1"},
    {"id": "2", "title": "2. Collision Dilemma (Conflict Resolution)", "targetSurfaceId": "surface-module-2"},
    {"id": "3", "title": "3. Space vs Speed (Load Factor & Rehash)", "targetSurfaceId": "surface-module-3"},
    {"id": "4", "title": "4. Security Defense (HashDoS & Treeify)", "targetSurfaceId": "surface-module-4"}
]

messages_en = [
    # MODULE 1 (EN)
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
                        "step5-summary"
                    ]
                },
                {
                    "id": "header-1",
                    "component": "Text",
                    "variant": "h1",
                    "text": "How to Achieve O(1) Instant Lookup in Massive Data?"
                },
                {
                    "id": "learning-path-1",
                    "component": "LearningPath",
                    "title": "Hash Table 4-Stage Progressive Path",
                    "activeStepId": "1",
                    "steps": steps_config_en
                },
                {
                    "id": "step1-background",
                    "component": "AnalogyCard",
                    "title": "Throughput Bottlenecks in Large-Scale Search",
                    "analogy": "<b>Real-World Context</b>: In modern distributed systems, web frameworks, and database kernels, data retrieval is one of the most frequent operations.<br><br><b>Core Pain Point</b>: When in-memory data scales to 1,000,000 or 100,000,000 items, traditional search algorithms severely degrade. Scanning thousands of nodes per query exhausts CPU cycles, spiking query latency to hundreds of milliseconds. How can we achieve instant millisecond lookups completely independent of dataset size?"
                },
                {
                    "id": "step1-chat",
                    "component": "ScenarioDialogue",
                    "topic": "💬 Tech Group: Why does traversing 1M items freeze the server?",
                    "characters": {
                        "alice": {"name": "Alice (Junior Dev)", "avatar": "👩‍💻", "alignment": "left"},
                        "boss_zhang": {"name": "Architect Zhang", "avatar": "👨‍💼", "alignment": "right"}
                    },
                    "messages": [
                        {
                            "characterId": "alice",
                            "content": "Boss! I deployed a user lookup feature that loops over a 1M array in memory. It ran fast locally, but today during peak traffic CPU hit 100% and lookups took 800ms!"
                        },
                        {
                            "characterId": "boss_zhang",
                            "content": "You are using <dfn title=\"Linear search comparing items one by one, worst case O(N)\">Linear Search O(N)</dfn>! As dataset N grows 1000x, comparisons and CPU instructions grow 1000x. We must abandon the 'compare one by one' mindset!"
                        },
                        {
                            "characterId": "alice",
                            "content": "What if I keep the array sorted and use Binary Search O(log N)? That takes only ~20 comparisons!"
                        },
                        {
                            "characterId": "boss_zhang",
                            "content": "Binary search is fast for reading, but keeping an array sorted in RAM is extremely costly! Every insert requires shifting hundreds of thousands of items right. We need a paradigm shift that achieves O(1) for both reads and writes!"
                        }
                    ]
                },
                {
                    "id": "step2-naive",
                    "component": "MentalModel",
                    "title": "Physical RAM Nature & Memory Shift Overhead",
                    "description": "Physical Random Access Memory (RAM) is hardware-wise a contiguous byte array. RAM hardware natively supports O(1) random access by numerical memory address.",
                    "icon": "🧠",
                    "diagramTitle": "📊 Physical RAM Data Movement Trace",
                    "diagram": "Initial RAM: [0:10 | 1:20 | 2:30 | 3:50 | 4:60]\nTarget: Insert 25 into sorted index 2\nStep 1 Shift Right: 60->idx 5, 50->idx 4, 30->idx 3  ==> [0:10 | 1:20 | 2:Empty | 3:30 | 4:50 | 5:60]\nStep 2 Write Value: Write 25 to freed index 2      ==> [0:10 | 1:20 | 2:25    | 3:30 | 4:50 | 5:60]",
                    "pillarsTitle": "Hardware Nature & Naive Flaws",
                    "pillars": [
                        {"title": "Hardware Access", "description": "RAM bus natively supports O(1) random access by numeric index regardless of array size.", "icon": "⚡"},
                        {"title": "Unsorted Array Flaw", "description": "Sequential scan takes O(N) worst case, latency scales linearly with dataset size.", "icon": "❌"},
                        {"title": "Sorted Array Flaw", "description": "Search takes O(log N), but inserts/deletes force shifting memory blocks with O(N) cost.", "icon": "⚠️"}
                    ],
                    "analogyTitle": "💡 Concrete Memory Shift Trace",
                    "analogy": "<b>Trace of inserting 25 into sorted array [ 10, 20, 30, 50, 60 ]:</b><br><br>1. <b>Locate Index</b>: Number 25 belongs between 20 and 30 (target index 2);<br>2. <b>Shift Memory</b>: Because array RAM must be contiguous, items 60, 50, 30 must shift right by 1 index (60->5, 50->4, 30->3);<br>3. <b>Write Value</b>: Write 25 into freed slot 2.<br><br>💥 <b>Real Impact</b>: Inserting just 1 item forced 3 memory shifts! In a 1,000,000 array, inserting 1 item forces 500,000 RAM block shifts!"
                },
                {
                    "id": "step3-mindset",
                    "component": "ConceptCard",
                    "title": "Paradigm Shift: Calculate Memory Address Directly from Key",
                    "tags": ["Computation Over Comparison", "O(1) Addressing", "Paradigm Shift"],
                    "definition": "Stop searching through memory! Switch to <b>'Direct Computation of Memory Addresses'</b>!<br><br>Do not iterate to compare key values. Instead, design a mathematical formula where Key string directly calculates its target array index!",
                    "example": "// Search Paradigm (Comparison): Find 'Alice' -> Compare 1,000,000 times\n// Hash Paradigm (Computation): Compute 'Alice' -> Directly get Index 5 -> Read arr[5]",
                    "relatedConcepts": ["Hash Function", "O(1) Complexity", "Hash Mapping"]
                },
                {
                    "id": "step4-implementation",
                    "component": "DetailedExplanation",
                    "title": "Hash Function & Bucket Array Engineering (with Python Example)",
                    "icon": "⚙️",
                    "estimatedReadTime": "4 min read",
                    "content": "To implement the 'Computation over Comparison' mindset into code, engineering introduces two core components:\n\n1. **<dfn title=\"Mathematical algorithm converting arbitrary length Key into fixed unsigned integer\">Hash Function</dfn>**: Takes arbitrary Key input and computes an integer index.\n2. **<dfn title=\"Contiguous memory array holding actual data values\">Bucket Array (Hash Table)</dfn>**: Allocates an array of size `capacity`, mapping hash integer to index: `index = hash(key) % capacity`.\n\n🐍 **Python Direct Library & Pseudocode Example**:\n```python\n# Method A: Direct Python built-in hash() library call\nkey = \"Alice\"\ncapacity = 10\nslot_index = abs(hash(key)) % capacity  # Gets slot 0~9\n\n# Method B: Simple Python Pseudocode Hash Function\ndef simple_hash(key: str, capacity: int = 10) -> int:\n    return sum(ord(char) for char in key) % capacity\n```\n\n**O(1) Hardware Guarantee**:\nWhether the hash table contains 10 items or 1,000,000 items, as long as the hash calculation executes in a few CPU instructions, lookup time is constant! This is the physical foundation of **<dfn title=\"Constant time performance independent of dataset size\">O(1) Complexity</dfn>**."
                },
                {
                    "id": "step4-sandbox",
                    "component": "InteractiveSandbox",
                    "title": "Code Demo: Array Memory Shifts vs O(1) Hash Direct Access",
                    "description": "Run the code to compare array element shifts vs O(1) direct hash calculation:",
                    "language": "javascript",
                    "code": """// Demo 1: Inserting 25 into sorted array [10, 20, 30, 50, 60]
let arr = [10, 20, 30, 50, 60];
let insertVal = 25;
let shiftCount = 0;

// Simulate physical memory shift right
arr.push(undefined);
for (let i = arr.length - 1; i > 2; i--) {
  arr[i] = arr[i - 1];
  shiftCount++;
}
arr[2] = insertVal;

console.log("Array after insert:", arr);
console.log("RAM memory blocks forced to shift:", shiftCount);
console.log("------------------------------------------");

// Demo 2: Hash function calculating direct slot index (O(1))
function simpleHash(key, capacity = 10) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) % capacity;
  }
  return hash;
}

console.log("Key 'Alice' calculated slot index:", simpleHash('Alice'));
console.log("Key 'Bob'   calculated slot index:", simpleHash('Bob'));""",
                    "runLocally": True
                },
                {
                    "id": "step5-summary",
                    "component": "AnalogyCard",
                    "title": "Summary: From Searching to Computation",
                    "analogy": "The key to O(1) speed is leveraging physical RAM's native numeric addressing to replace <b>'comparing items one by one'</b> with <b>'direct formula computation'</b>.<hr><div class=\"terms-section\"><h5 class=\"terms-section-title\">📌 Terminology Summary</h5><p>To solve the search efficiency crisis, we shift from <dfn title=\"Linear scan comparing items sequentially with O(N) cost\"><strong>Linear Search O(N)</strong></dfn> to computation. A <dfn title=\"Algorithm converting arbitrary Keys into integer array indexes\"><strong>Hash Function</strong></dfn> converts Key names directly into array indexes, achieving <dfn title=\"Constant time performance independent of dataset size\"><strong>O(1) Time Complexity</strong></dfn>.</p></div>"
                }
            ]
        }
    },

    # MODULE 2 (EN)
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
                        "quiz-2"
                    ]
                },
                {
                    "id": "header-2",
                    "component": "Text",
                    "variant": "h1",
                    "text": "When Different Keys Compute the Same Index?"
                },
                {
                    "id": "learning-path-2",
                    "component": "LearningPath",
                    "title": "Hash Table 4-Stage Progressive Path",
                    "activeStepId": "2",
                    "steps": steps_config_en
                },
                {
                    "id": "step1-background-2",
                    "component": "AnalogyCard",
                    "title": "Data Overwrite Disaster from Index Collisions",
                    "analogy": "<b>Emerging Problem</b>: In Module 1, we calculated array indices using hash functions. But in production, input Keys (e.g. user names) are infinite, whereas array slot capacities are always finite.<br><br><b>Overwrite Crisis</b>: When storing different keys ('Alice' and 'David'), the hash function inevitably calculates the <b>exact same index 5</b>! If written directly into slot 5, David overwrites Alice, causing catastrophic data loss!"
                },
                {
                    "id": "step1-chat-2",
                    "component": "ScenarioDialogue",
                    "topic": "💬 Tech Group: Help! Two keys produced the same index and data was overwritten!",
                    "characters": {
                        "alice": {"name": "Alice (Junior Dev)", "avatar": "👩‍💻", "alignment": "left"},
                        "boss_zhang": {"name": "Architect Zhang", "avatar": "👨‍💼", "alignment": "right"}
                    },
                    "messages": [
                        {
                            "characterId": "alice",
                            "content": "Boss! Disaster! User 'Alice' and 'David' got the same index 5 from the hash function! David's data wiped out Alice's in production!"
                        },
                        {
                            "characterId": "boss_zhang",
                            "content": "This is an inevitable 'Hash Collision'! Because output slots are finite while input keys are infinite. Mathematics proves collisions cannot be completely prevented."
                        },
                        {
                            "characterId": "alice",
                            "content": "Can't we design a perfect hash function with zero collisions?"
                        },
                        {
                            "characterId": "boss_zhang",
                            "content": "Impossible! The Pigeonhole Principle proves that if you have more pigeons than holes, at least two pigeons share a hole. Engineering must learn to tolerate collisions!"
                        }
                    ]
                },
                {
                    "id": "step2-naive-2",
                    "component": "MentalModel",
                    "title": "Pigeonhole Principle & Conflict Resolution",
                    "description": "According to the Pigeonhole Principle, when Key space is larger than array capacity, at least two keys must map to the same index. This is math, not a software bug.",
                    "icon": "🐦",
                    "diagramTitle": "📊 Index Collision & Overwrite Diagram",
                    "diagram": "Alice Maps: [0:Empty | 1:Empty | 5:Alice | 6:Empty]\nDavid Collision: [0:Empty | 1:Empty | 5:Collision! | 6:Empty]\n\nDirect Overwrite: Slot 5 Alice data destroyed! ❌",
                    "pillarsTitle": "Principles & Approaches",
                    "pillars": [
                        {"title": "Pigeonhole Principle", "description": "Mapping infinite inputs to finite slots makes collisions mathematically inevitable.", "icon": "📐"},
                        {"title": "Direct Overwrite Flaw", "description": "Overwriting existing data causes severe data corruption.", "icon": "💥"}
                    ],
                    "analogyTitle": "💡 Overwrite Disaster Breakdown",
                    "analogy": "Overwriting old data when index collision occurs means previous entries disappear completely. A user logging into Alice's account sees David's profile!"
                },
                {
                    "id": "step3-mindset-2",
                    "component": "ConceptCard",
                    "title": "Multi-Node Attachment & Probing",
                    "tags": ["Tolerate Collisions", "Multi-Dimensional Storage", "Decoupling"],
                    "definition": "Accept collisions as inevitable. Stop expecting 'one slot stores only one item'.<br><br><b>Two Main Approaches</b>:<br>1. <b>Vertical Attachment (Separate Chaining)</b>: Store a linked list inside each bucket slot to attach multiple colliding items!<br>2. <b>Horizontal Probing (Open Addressing)</b>: When a slot is occupied, probe neighboring slots according to a fixed sequence rule!",
                    "example": "// Approach 1 (Chaining): Slot 5 holds linked list -> [Alice] -> [David]\n// Approach 2 (Open Addressing): Slot 5 occupied -> Probe slot 6 -> Store in 6 if free",
                    "relatedConcepts": ["Separate Chaining", "Open Addressing", "Collision Resolution"]
                },
                {
                    "id": "step4-implementation-2",
                    "component": "DetailedExplanation",
                    "title": "Separate Chaining vs Open Addressing & Python Dict Example",
                    "icon": "⚙️",
                    "estimatedReadTime": "4 min read",
                    "content": "Engineering has converged on two dominant collision resolution strategies:\n\n1. **<dfn title=\"Each bucket maintains a singly linked list appending colliding nodes\">Separate Chaining</dfn>**: Used by Java HashMap. Each array slot holds a linked list.\n2. **<dfn title=\"No linked lists; probes neighboring array slots on collision\">Open Addressing</dfn>**: Used by Python dict. All data elements lie contiguously in the array.\n\n🐍 **Python Native Dict Library & Pseudocode Example**:\n```python\n# Method 1: Direct Python dict library usage (O(1) under the hood)\nuser_scores = {}\nuser_scores[\"Alice\"] = 95  # Automatically hashes and stores in O(1)\nprint(user_scores[\"Alice\"])  # O(1) instant read\n\n# Method 2: Open Addressing Probing Pseudocode\ndef get_with_probe(buckets, key, capacity):\n    index = abs(hash(key)) % capacity\n    while buckets[index] is not None and buckets[index][0] != key:\n        index = (index + 1) % capacity  # Smoothly probe next slot on collision\n    return buckets[index]\n```\n\n> 💡 Engineering Tradeoff: Java uses Chaining for resilience; Python uses Open Addressing for raw CPU cache performance."
                },
                {
                    "id": "step5-summary-2",
                    "component": "AnalogyCard",
                    "title": "Summary: Vertical Chains vs Horizontal Array Probing",
                    "analogy": "Collisions are inevitable. Chaining extends vertically with linked lists; Open Addressing probes horizontally for free slots.<hr><div class=\"terms-section\"><h5 class=\"terms-section-title\">📌 Terminology Summary</h5><p>Index collisions represent <dfn title=\"Different keys mapping to identical array indexes\"><strong>Hash Collisions</strong></dfn>. Java uses <dfn title=\"Linked lists attached to array buckets for colliding items\"><strong>Separate Chaining</strong></dfn>, while Python dict uses <dfn title=\"Probing contiguous array memory for open slots\"><strong>Open Addressing</strong></dfn> to maximize <dfn title=\"Hardware prefetching of contiguous memory blocks\"><strong>CPU Cache Locality</strong></dfn>.</p></div>"
                },
                {
                    "id": "quiz-2",
                    "component": "QuizCard",
                    "title": "🧠 Collision Resolution Choice",
                    "question": "Which collision resolution strategy keeps all elements contiguous in memory for maximum CPU cache efficiency?",
                    "options": [
                        {"id": "opt1", "text": "A. Separate Chaining"},
                        {"id": "opt2", "text": "B. Open Addressing"},
                        {"id": "opt3", "text": "C. Discard new data"},
                        {"id": "opt4", "text": "D. Sort the array"}
                    ],
                    "correctOptionId": "opt2",
                    "explanation": "Open Addressing stores all key-value pairs contiguously in array RAM without pointer indirection, achieving optimal CPU cache locality."
                }
            ]
        }
    },

    # MODULE 3 (EN)
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
                        "cloze-3"
                    ]
                },
                {
                    "id": "header-3",
                    "component": "Text",
                    "variant": "h1",
                    "text": "Load Factor & Incremental Rehash"
                },
                {
                    "id": "learning-path-3",
                    "component": "LearningPath",
                    "title": "Hash Table 4-Stage Progressive Path",
                    "activeStepId": "3",
                    "steps": steps_config_en
                },
                {
                    "id": "step1-background-3",
                    "component": "AnalogyCard",
                    "title": "Performance Degradation Under High Occupancy",
                    "analogy": "<b>Emerging Problem</b>: Module 2 solved collisions with Chaining and Open Addressing. But as millions of keys are inserted, array occupancy approaches 100%.<br><br><b>Performance Collapse</b>: Near full capacity, linked lists grow long and Open Addressing probing steps explode. The proud O(1) performance degrades back into slow linear scanning!"
                },
                {
                    "id": "step1-chat-3",
                    "component": "ScenarioDialogue",
                    "topic": "💬 Tech Group: Array is almost full, lookups are slowing down again!",
                    "characters": {
                        "alice": {"name": "Alice (Junior Dev)", "avatar": "👩‍💻", "alignment": "left"},
                        "boss_zhang": {"name": "Architect Zhang", "avatar": "👨‍💼", "alignment": "right"}
                    },
                    "messages": [
                        {
                            "characterId": "alice",
                            "content": "Boss! Our hash table initial capacity was 100. We stored 90 items and now collisions are skyrocketing, lookups are slow again!"
                        },
                        {
                            "characterId": "boss_zhang",
                            "content": "Your Load Factor is too high! Like a parking lot, fewer empty spots mean longer time finding a park. We must monitor load factor and trigger dynamic resizing!"
                        }
                    ]
                },
                {
                    "id": "step2-naive-3",
                    "component": "MentalModel",
                    "title": "Occupancy Rate & Exponential Collision Growth",
                    "description": "Collision probability is inversely proportional to free slot ratio. O(1) speed requires maintaining a minimum free slot margin.",
                    "icon": "📈",
                    "diagramTitle": "📊 High Occupancy & Doubling Rehash",
                    "diagram": "Occupancy 90%: [0:Full | 1:Full | 2:Full | 3:Full | 4:Free]\nCapacity Double: [0:Full | 1:Free | 2:Full | 3:Free | ... | 9:Free]",
                    "pillarsTitle": "Core Principles",
                    "pillars": [
                        {"title": "Occupancy First Principle", "description": "Fewer free slots cause exponential collision growth.", "icon": "📊"},
                        {"title": "Static Huge Memory Flaw", "description": "Pre-allocating giant memory wastes memory RAM resources.", "icon": "⚠️"}
                    ],
                    "analogyTitle": "💡 Static Memory Pre-allocation Flaw",
                    "analogy": "Allocating 100 GB RAM upfront wastes massive memory resources when storing small datasets."
                },
                {
                    "id": "step3-mindset-3",
                    "component": "ConceptCard",
                    "title": "Dynamic Monitoring & Capacity Doubling",
                    "tags": ["Dynamic Balance", "On-Demand Resizing", "Space Leverage"],
                    "definition": "Maintain small initial RAM. Monitor occupancy metrics. Once threshold is breached, <b>allocate double capacity and re-map all items</b>!",
                    "example": "// Monitor threshold: size / capacity > 0.75\n// When breached: capacity = capacity * 2, rehash all items",
                    "relatedConcepts": ["Load Factor", "Rehash", "Dynamic Resizing"]
                },
                {
                    "id": "step4-implementation-3",
                    "component": "DetailedExplanation",
                    "title": "0.75 Load Factor, Bitwise AND & Incremental Rehash",
                    "icon": "⚙️",
                    "estimatedReadTime": "4 min read",
                    "content": "Three key engineering optimizations in dynamic resizing:\n\n1. **<dfn title=\"Ratio of total items to capacity (size / capacity)\">Load Factor</dfn>**: Threshold metric. Java HashMap uses `0.75` as optimal tradeoff between space efficiency and lookup speed.\n2. **<dfn title=\"Capacity kept power of 2 to replace slow modulo with fast bitwise AND\">Bitwise AND Optimization</dfn>**: Capacity kept as power of 2 (16, 32, 64), replacing modulo `hash % capacity` with fast hardware instruction `<dfn title=\"Bitwise AND replacing modulo operation\">hash & (capacity - 1)</dfn>`!\n3. **<dfn title=\"Amortizing rehash work across daily reads/writes to prevent spikes\">Incremental Rehash</dfn>**: Redis maintains two hash tables (`ht[0]`, `ht[1]`), migrating items incrementally to prevent latency spikes."
                },
                {
                    "id": "step5-summary-3",
                    "component": "AnalogyCard",
                    "title": "Summary: Occupancy Monitoring & Amortized Migration",
                    "analogy": "Load factor measures occupancy, Rehash doubles capacity, Bitwise AND accelerates indexing.<hr><div class=\"terms-section\"><h5 class=\"terms-section-title\">📌 Terminology Summary</h5><p>Monitoring the <dfn title=\"Ratio of stored elements to array capacity\"><strong>Load Factor</strong></dfn> triggers dynamic <dfn title=\"Allocating double space and re-mapping all keys\"><strong>Rehash</strong></dfn>. High-throughput systems employ <dfn title=\"Migrating data incrementally across routine writes\"><strong>Incremental Rehash</strong></dfn> to prevent blocking server threads.</p></div>"
                },
                {
                    "id": "cloze-3",
                    "component": "ClozeTest",
                    "title": "Dynamic Resizing Practice",
                    "instruction": "Fill in the missing blanks:",
                    "passage": "Hash tables monitor occupancy via [blank1]. Exceeding the threshold triggers [blank2]. Array capacities are kept as [blank3] to enable fast bitwise AND indexing.",
                    "options": ["Load Factor", "Rehash", "Powers of 2", "Binary Search"],
                    "correctAnswers": {"blank1": "Load Factor", "blank2": "Rehash", "blank3": "Powers of 2"}
                }
            ]
        }
    },

    # MODULE 4 (EN)
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
                        "quiz-4"
                    ]
                },
                {
                    "id": "header-4",
                    "component": "Text",
                    "variant": "h1",
                    "text": "HashDoS Attacks & Red-Black Tree Treeify"
                },
                {
                    "id": "learning-path-4",
                    "component": "LearningPath",
                    "title": "Hash Table 4-Stage Progressive Path",
                    "activeStepId": "4",
                    "steps": steps_config_en
                },
                {
                    "id": "step1-background-4",
                    "component": "AnalogyCard",
                    "title": "Worst-Case Collision Attack Vectors",
                    "analogy": "<b>Emerging Threat</b>: Attackers can exploit predictable deterministic hash algorithms by pre-computing thousands of keys that hash to the exact same bucket slot!<br><br><b>HashDoS Attack</b>: Forcing tens of thousands of items into a single bucket list degrades O(1) performance to O(N), spiking server CPU to 100% and causing Denial of Service!"
                },
                {
                    "id": "step1-chat-4",
                    "component": "ScenarioDialogue",
                    "topic": "💬 Tech Group: Alert! Server CPU 100% hit by a Hash Collision Attack!",
                    "characters": {
                        "alice": {"name": "Alice (Junior Dev)", "avatar": "👩‍💻", "alignment": "left"},
                        "boss_zhang": {"name": "Architect Zhang", "avatar": "👨‍💼", "alignment": "right"}
                    },
                    "messages": [
                        {
                            "characterId": "alice",
                            "content": "Boss! Emergency! Our API received crafted requests and slot 5 list grew 10,000 nodes long! O(1) became O(N) and server froze!"
                        },
                        {
                            "characterId": "boss_zhang",
                            "content": "That is a classic <dfn title=\"Malicious attack sending colliding keys to degrade hash tables into linear lists\">HashDoS Attack</dfn>! We need randomized hash seeds and treeified data structure fallbacks!"
                        }
                    ]
                },
                {
                    "id": "step2-naive-4",
                    "component": "MentalModel",
                    "title": "Worst-Case Algorithmic Complexity Bounds",
                    "description": "O(1) average lookup relies on uniform distribution assumptions. Malicious inputs challenge worst-case complexity bounds.",
                    "icon": "⚠️",
                    "diagramTitle": "📊 Skewed Hash Degradation Diagram",
                    "diagram": "Uniform: [0:Node | 1:Node | 2:Node | 3:Node]\nSkewed:  [0:Node->Node...10000 nodes! | 1:Empty | 2:Empty | 3:Empty]",
                    "pillarsTitle": "Complexity Bounds",
                    "pillars": [
                        {"title": "Worst-Case Bound", "description": "Algorithms must guarantee upper bound bounds against adversarial inputs.", "icon": "📉"},
                        {"title": "Uniform Trust Risk", "description": "Assuming random input leaves systems vulnerable to Denial of Service.", "icon": "❌"}
                    ],
                    "analogyTitle": "💡 Risk of Trusting Input Randomness",
                    "analogy": "Attackers pre-calculate colliding keys offline (HashDoS) to instantly paralyze online servers."
                },
                {
                    "id": "step3-mindset-4",
                    "component": "ConceptCard",
                    "title": "Algorithm Randomization & Tree Structures",
                    "tags": ["SipHash Randomization", "Worst-Case Guarantee", "Security"],
                    "definition": "Dual Defense System!<br><br>1. <b>Input Randomization</b>: Use random seed hashing (SipHash) so attackers cannot predict online hashes!<br>2. <b>Structure Upgrade</b>: Automatically convert long bucket linked lists into self-balancing search trees to hard-cap worst-case lookup bounds!",
                    "example": "// Defense 1 (SipHash): Random seed per process SipHash(Key, Seed)\n// Defense 2 (Treeify): When list length >= 8, convert to Red-Black Tree (O(log N) worst case)",
                    "relatedConcepts": ["HashDoS", "Treeify Threshold", "SipHash"]
                },
                {
                    "id": "step4-implementation-4",
                    "component": "DetailedExplanation",
                    "title": "Java 8 Treeify & SipHash Security Seeds",
                    "icon": "⚙️",
                    "estimatedReadTime": "4 min read",
                    "content": "Industrial-grade hash table security defenses:\n\n1. **<dfn title=\"Converting bucket linked lists to self-balancing Red-Black trees when length exceeds 8\">Treeify Threshold</dfn>**: Java 8+ HashMap converts bucket lists to Red-Black Trees when length ≥ 8 and capacity ≥ 64. Even with 1,000,000 colliding nodes, worst-case search takes log(1000000) ≈ 20 steps, hard-capped at **O(log N)**!\n2. **<dfn title=\"Cryptographically strong hash algorithm with random seed to prevent prediction\">SipHash Algorithm</dfn>**: Python 3.4+ and Rust use SipHash with random per-process seeds, rendering offline collision pre-computation impossible."
                },
                {
                    "id": "step5-summary-4",
                    "component": "AnalogyCard",
                    "title": "Summary: Algorithmic Randomization & Tree Fallbacks",
                    "analogy": "Industrial hash tables pair random seeding with tree fallbacks to neutralize HashDoS attacks.<hr><div class=\"terms-section\"><h5 class=\"terms-section-title\">📌 Terminology Summary</h5><p>Defending against <dfn title=\"Crafting colliding keys to force linear lookup degradation\"><strong>HashDoS Attacks</strong></dfn> relies on randomized <dfn title=\"Random per-process keyed hashing algorithm\"><strong>SipHash</strong></dfn> and automatic <dfn title=\"Converting long bucket lists to self-balancing Red-Black Trees\"><strong>Treeify Thresholds</strong></dfn> capping worst-case lookups at O(log N).</p></div>"
                },
                {
                    "id": "quiz-4",
                    "component": "QuizCard",
                    "title": "🧠 Industrial Hash Table Security Quiz",
                    "question": "Why does Java 8 HashMap convert bucket linked lists into Red-Black Trees when list length reaches 8?",
                    "options": [
                        {"id": "opt1", "text": "A. Because 8 is a lucky number"},
                        {"id": "opt2", "text": "B. To cap worst-case lookup at O(log N) and defend against HashDoS attacks"},
                        {"id": "opt3", "text": "C. To save memory"},
                        {"id": "opt4", "text": "D. Red-Black trees take less memory than linked lists"}
                    ],
                    "correctOptionId": "opt2",
                    "explanation": "When severe collisions occur, linked lists degrade to O(N). Treeifying to Red-Black Trees caps worst-case search at O(log N), neutralizing HashDoS attacks."
                }
            ]
        }
    }
]

# Write JSON files
Path("apps/viewer/public/generated/site_messages.json").write_text(json.dumps(messages_zh, ensure_ascii=False, indent=2), encoding="utf-8")
Path("apps/viewer/public/generated/site_messages_en.json").write_text(json.dumps(messages_en, ensure_ascii=False, indent=2), encoding="utf-8")

print("SUCCESSFULLY_GENERATED_CLEAN_PYTHON_HASH_MESSAGES")
