export interface Tutorial {
  slug: string;
  topic: string;
  title: string;
  summary: string;
  signals: string[];
  steps: string[];
  complexity: string;
  pitfalls: string[];
  pseudocode: string;
  practiceSlugs: string[];
}

export const tutorials: Tutorial[] = [
  {
    slug: 'array',
    topic: '数组',
    title: '数组遍历与状态维护',
    summary: '数组题的基础是明确“遍历到当前位置时，需要记住什么”。很多题只需一趟遍历和少量状态。',
    signals: ['要求计数、最大值、最小值或第一次出现的位置', '答案可以随着从左到右扫描逐步更新', '每个元素只需要处理一次'],
    steps: ['先写出当前元素对答案的贡献', '确定需要跨位置保存的状态', '逐个更新状态与答案', '单独检查空数组和单元素数组'],
    complexity: '通常为时间 O(n)，额外空间 O(1)；保存额外结果时可能为 O(n)。',
    pitfalls: ['下标与元素值混淆', '最大值初始化为 0，导致全负数组出错', '修改数组时跳过移动后的元素'],
    pseudocode: `answer = 初始值
state = 初始状态
for value in nums:
    更新 state
    更新 answer
return answer`,
    practiceSlugs: ['first-occurrence-0', 'contains-duplicate', 'max-profit'],
  },
  {
    slug: 'hash-table',
    topic: '哈希表',
    title: '哈希表：用空间换查询速度',
    summary: '当题目反复询问“某个值是否出现、出现几次、上次在哪里”时，哈希表通常能把线性查询降为均摊 O(1)。',
    signals: ['需要快速判断元素是否出现过', '需要统计频率或保存值到下标的映射', '题目出现配对、去重、分组等关键词'],
    steps: ['先明确 key 和 value 分别保存什么', '遍历时先查询还是先写入要根据“能否使用当前元素”决定', '更新计数或位置', '确认是否需要处理重复元素'],
    complexity: '通常为时间 O(n)，空间 O(n)。哈希操作按均摊 O(1) 计算。',
    pitfalls: ['两数之和先写入当前元素会重复使用同一下标', '只保存是否出现，丢失了题目需要的次数', '把有序输出错误地交给无序映射'],
    pseudocode: `seen = 空哈希表
for index, value in nums:
    need = target - value
    if need in seen:
        return [seen[need], index]
    seen[value] = index`,
    practiceSlugs: ['occurrence-count-0', 'two-sum', 'pair-count-sum-0', 'subarray-sum-equals-k'],
  },
  {
    slug: 'two-pointers',
    topic: '双指针',
    title: '双指针：缩小搜索范围',
    summary: '双指针使用两个位置共同描述当前搜索区间，适合有序数组、首尾夹逼、原地修改和快慢移动。',
    signals: ['数组有序，要求寻找一对元素', '需要从两端逐步缩小范围', '要求原地删除、移动或分区', '链表中需要快慢指针'],
    steps: ['定义两个指针各自的含义', '写清楚循环不变量', '根据当前结果只移动能够排除答案的一侧', '确认指针相遇时是否还要处理'],
    complexity: '多数双指针算法时间 O(n)，空间 O(1)。',
    pitfalls: ['移动了错误的一侧，无法保证排除的区间没有答案', '使用 left < right 还是 left <= right 不明确', '原地写入指针和读取指针混淆'],
    pseudocode: `left = 0
right = len(nums) - 1
while left < right:
    根据 nums[left], nums[right] 更新答案
    if 应移动左侧:
        left += 1
    else:
        right -= 1`,
    practiceSlugs: ['middle-linked-list', 'rotate-right-1', 'container-most-water'],
  },
  {
    slug: 'sliding-window',
    topic: '滑动窗口',
    title: '滑动窗口：维护连续区间',
    summary: '滑动窗口用于连续子数组或子串。右端扩展获取新信息，条件不满足时移动左端恢复合法性。',
    signals: ['题目要求连续子数组或连续子串', '寻找最长、最短或固定长度区间', '区间是否合法可以增量更新'],
    steps: ['定义窗口 [left, right]', '右端加入新元素并更新窗口状态', '使用 while 移动左端直到窗口重新合法', '在正确时机更新答案'],
    complexity: '左右指针各自最多移动 n 次，因此通常为时间 O(n)，空间取决于窗口状态。',
    pitfalls: ['把收缩窗口的 while 写成 if', '在收缩前后错误的时机更新答案', '忘记移除左端元素对计数的贡献'],
    pseudocode: `left = 0
for right in range(len(nums)):
    加入 nums[right]
    while 窗口不合法:
        移除 nums[left]
        left += 1
    answer = max(answer, right - left + 1)`,
    practiceSlugs: ['max-window-sum-3', 'longest-substring', 'minimum-window-substring'],
  },
  {
    slug: 'stack',
    topic: '栈',
    title: '栈：处理最近未完成的任务',
    summary: '栈遵循后进先出，适合括号匹配、路径简化、表达式求值，以及寻找左右第一个更大或更小元素。',
    signals: ['需要与最近出现但尚未匹配的元素配对', '存在嵌套结构', '要求撤销、回退或维护单调关系'],
    steps: ['明确栈中保存值、下标还是状态', '判断当前元素是入栈、匹配还是触发出栈', '循环结束后检查栈内剩余元素', '单调栈要明确递增还是递减'],
    complexity: '普通栈操作 O(1)；每个元素至多进出栈一次时总时间 O(n)。',
    pitfalls: ['读取栈顶前未检查空栈', '括号类型匹配错误', '单调栈保存值却在答案中需要距离'],
    pseudocode: `stack = []
for item in items:
    while stack and 栈顶需要被处理:
        top = stack.pop()
        更新答案
    stack.append(item)`,
    practiceSlugs: ['valid-brackets', 'daily-temperatures', 'largest-rectangle-histogram'],
  },
  {
    slug: 'binary-search',
    topic: '二分查找',
    title: '二分查找：利用单调性排除一半',
    summary: '二分查找的本质不是“数组有序”，而是存在一个单调判断，使每次判断都能安全排除一半候选范围。',
    signals: ['有序数组中查找值或边界', '答案越大越容易或越难满足条件', '题目要求最小可行值或最大不可行值'],
    steps: ['定义搜索区间是否包含两端', '明确 mid 满足条件后保留哪一半', '保证每轮区间严格缩小', '用极小输入检查循环与返回值'],
    complexity: '时间 O(log n)，空间 O(1)。对答案二分还要乘以一次可行性检查的复杂度。',
    pitfalls: ['闭区间和半开区间写法混用', '边界题找到一个答案就立即返回', 'left = mid 导致区间无法缩小'],
    pseudocode: `left, right = 搜索边界
while left <= right:
    mid = left + (right - left) // 2
    if value(mid) < target:
        left = mid + 1
    elif value(mid) > target:
        right = mid - 1
    else:
        return mid
return -1`,
    practiceSlugs: ['search-insert-position', 'binary-search', 'first-last-position'],
  },
  {
    slug: 'prefix-sum',
    topic: '前缀和',
    title: '前缀和：把区间求和变成相减',
    summary: '前缀和保存从开头到当前位置之前的累计结果，使任意连续区间和可以由两个前缀值相减得到。',
    signals: ['多次查询连续区间和', '寻找和等于某个目标的子数组', '需要统计满足特定区间和的数量'],
    steps: ['令 prefix[0] = 0', '计算 prefix[i + 1] = prefix[i] + nums[i]', '区间 [left, right] 的和是 prefix[right + 1] - prefix[left]', '计数题可结合哈希表保存此前前缀和'],
    complexity: '预处理 O(n)，每次区间查询 O(1)，空间 O(n)。',
    pitfalls: ['前缀数组没有多留一个 0 导致边界复杂', '区间左右端点发生偏移错误', '和可能超过 32 位整数范围'],
    pseudocode: `prefix = [0]
for value in nums:
    prefix.append(prefix[-1] + value)

range_sum = prefix[right + 1] - prefix[left]`,
    practiceSlugs: ['pivot-index', 'range-sum-queries', 'subarray-sum-equals-k'],
  },
  {
    slug: 'linked-list',
    topic: '链表',
    title: '链表：先保存 next，再修改连接',
    summary: '链表题的关键是节点连接关系。画出少量节点并明确每个指针指向哪里，通常比在脑中模拟可靠。',
    signals: ['反转、合并、删除节点', '寻找中点、倒数位置或环', '不能通过下标随机访问'],
    steps: ['考虑使用 dummy 虚拟头节点统一头部操作', '修改连接前保存下一节点', '每次移动后检查指针含义是否仍成立', '处理空链表和单节点链表'],
    complexity: '大多数链表遍历时间 O(n)，额外空间 O(1)；递归通常使用 O(n) 调用栈。',
    pitfalls: ['先覆盖 current.next，导致后续链表丢失', '返回了原头节点而不是新头节点', '快指针访问 next.next 前没有判空'],
    pseudocode: `previous = None
current = head
while current:
    next_node = current.next
    current.next = previous
    previous = current
    current = next_node
return previous`,
    practiceSlugs: ['reverse-linked-list', 'middle-linked-list', 'add-two-numbers'],
  },
  {
    slug: 'binary-tree',
    topic: '二叉树',
    title: '二叉树：递归定义与遍历顺序',
    summary: '树题先决定每个递归函数“接收什么、返回什么”。前序适合自顶向下传状态，后序适合汇总子树结果。',
    signals: ['需要处理每个节点及其左右子树', '路径、深度、高度或子树统计', '按层处理节点'],
    steps: ['写出空节点的返回值', '递归获取左、右子树结果', '根据题意组合当前节点结果', '需要按层时改用队列 BFS'],
    complexity: '访问每个节点一次通常为 O(n)；递归空间为树高 O(h)。',
    pitfalls: ['混淆节点深度与树高度', '需要后序结果却在递归前更新答案', '退化链状树可能造成递归过深'],
    pseudocode: `def dfs(node):
    if node is None:
        return 空节点结果
    left = dfs(node.left)
    right = dfs(node.right)
    return 组合(node, left, right)`,
    practiceSlugs: ['maximum-depth-tree', 'invert-binary-tree', 'binary-tree-level-sums'],
  },
  {
    slug: 'matrix',
    topic: '矩阵',
    title: '矩阵遍历：坐标、方向与边界',
    summary: '矩阵题需要把位置表示为 (row, col)，将四个方向和边界判断写成统一结构，避免复制四段相似代码。',
    signals: ['二维网格中的搜索、计数或路径', '需要访问上下左右相邻单元格', '岛屿、连通块、最短路径等关键词'],
    steps: ['确认行数和列数，处理空矩阵', '使用方向数组生成邻居坐标', '访问前统一检查边界与是否已访问', 'DFS 求连通块，BFS 求无权最短步数'],
    complexity: '完整遍历通常为 O(rows × cols)，visited 空间同阶。',
    pitfalls: ['把 rows 和 cols 混用', '入队后才标记访问，导致同一格重复入队', '不规则矩阵仍假设每行长度相同'],
    pseudocode: `directions = [(1,0), (-1,0), (0,1), (0,-1)]
for dr, dc in directions:
    nr, nc = row + dr, col + dc
    if 0 <= nr < rows and 0 <= nc < cols:
        处理 matrix[nr][nc]`,
    practiceSlugs: ['matrix-multiples-2', 'matrix-diagonal-sum'],
  },
  {
    slug: 'dynamic-programming',
    topic: '动态规划',
    title: '动态规划：定义状态，而不是背公式',
    summary: '动态规划适合具有重复子问题和最优子结构的问题。最重要的是用一句完整的话定义 dp 状态。',
    signals: ['求最大、最小、方案数或是否可行', '当前选择影响后续，但相同剩余状态会反复出现', '暴力递归存在大量重复计算'],
    steps: ['写出 dp[i] 或 dp[i][j] 的完整含义', '根据最后一步选择推导转移', '确定基础状态和遍历顺序', '先写正确版本，再考虑压缩空间'],
    complexity: '通常等于“状态数量 × 每个状态的转移数量”。',
    pitfalls: ['状态定义含糊，导致初始化和答案位置不一致', '遍历顺序早于依赖状态', '一开始就压缩空间，难以发现转移错误'],
    pseudocode: `dp = 初始化所有状态
设置基础状态
for state in 正确顺序:
    for choice in 可选决策:
        dp[state] = 合并(dp[state], 前驱状态 + 当前贡献)
return 目标状态`,
    practiceSlugs: ['longest-run-above-0', 'max-profit', 'house-robber'],
  },
  {
    slug: 'greedy',
    topic: '贪心',
    title: '贪心：证明局部选择不会损害全局最优',
    summary: '贪心每一步选择当前最有利的方案，但必须说明这个选择可以通过交换或单调性保留某个全局最优解。',
    signals: ['区间选择、排序后安排、每次舍弃一侧', '目标是最大数量、最小代价或最早结束', '局部选择后剩余问题结构不变'],
    steps: ['提出局部选择规则', '用交换论证或反证法验证规则', '确定是否需要先排序', '扫描并维护当前可行状态'],
    complexity: '若需要排序通常为 O(n log n)，排序后扫描为 O(n)。',
    pitfalls: ['只凭直觉选择最大或最小，没有证明', '忽略相同关键字时的排序规则', '实际需要保留多个状态却强行使用单一贪心状态'],
    pseudocode: `按关键规则排序 candidates
state = 初始状态
for candidate in candidates:
    if candidate 与 state 兼容:
        选择 candidate
        更新 state
return answer`,
    practiceSlugs: ['assign-cookies', 'maximum-nonoverlapping-intervals', 'merge-intervals', 'container-most-water'],
  },
];

export function findTutorial(value: string): Tutorial | undefined {
  const normalized = value.toLowerCase();
  return tutorials.find((tutorial) =>
    tutorial.slug === normalized || tutorial.topic.toLowerCase() === normalized);
}

export function formatTutorial(tutorial: Tutorial): string {
  const section = (title: string, values: string[]) =>
    `${title}\n${values.map((value, index) => `  ${index + 1}. ${value}`).join('\n')}`;
  return [
    `${tutorial.title} · ${tutorial.topic}`,
    tutorial.summary,
    section('识别信号', tutorial.signals),
    section('标准步骤', tutorial.steps),
    `复杂度\n  ${tutorial.complexity}`,
    section('常见错误', tutorial.pitfalls),
    `套路模板\n${tutorial.pseudocode.split('\n').map((line) => `  ${line}`).join('\n')}`,
    `推荐题单\n${tutorial.practiceSlugs.map((slug, index) => `  ${index + 1}. ${slug}`).join('\n')}`,
    `开始练习\n  /next ${tutorial.topic}\n  /list ${tutorial.topic}\n  /topic ${tutorial.topic}`,
  ].join('\n\n');
}

export function formatRoadmap(): string {
  const order = [
    ['1', '数组 → 哈希表', '先熟悉遍历、状态维护和快速查询'],
    ['2', '双指针 → 栈 → 二分查找', '掌握常见的一维数据处理套路'],
    ['3', '滑动窗口 → 前缀和', '处理连续区间和子串问题'],
    ['4', '链表 → 二叉树 → 矩阵', '适应指针、递归和二维搜索'],
    ['5', '动态规划 → 贪心', '学习状态转移和正确性证明'],
  ];
  return `初学者学习路线\n\n${order
    .map(([index, topics, description]) => `${index}. ${topics}\n   ${description}`)
    .join('\n\n')}\n\n建议每类先使用 /learn 学习套路，再用 /topic 选择 3～5 道 Easy，最后尝试 Medium。`;
}
