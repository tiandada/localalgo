import type { Difficulty, Problem, TestCase } from './types.js';

interface CuratedProblem {
  slug: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  summary: string;
  constraints: string[];
  hints: string[];
  examples: Problem['examples'];
  functionName: string;
  cppArgumentTypes: Problem['cppArgumentTypes'];
  pythonArguments: string;
  cppArguments: string;
  cppReturnType: string;
  cppDefault: string;
  sampleTests: TestCase[];
  hiddenTests: TestCase[];
}

function problem(options: CuratedProblem): Problem {
  return {
    ...options,
    starters: {
      python: `def ${options.functionName}(${options.pythonArguments}):\n    pass\n`,
      cpp: `#include <string>\n#include <vector>\nusing namespace std;\n\n${options.cppReturnType} ${options.functionName}(${options.cppArguments}) {\n    return ${options.cppDefault};\n}\n`,
    },
  };
}

export const curatedProblems: Problem[] = [
  problem({
    slug: 'daily-temperatures', title: '每日温度', difficulty: 'medium', tags: ['数组', '栈', '单调栈'],
    summary: '给定每日温度数组，返回每一天需要等待多少天才会出现更高温度；之后没有更高温度时填写 0。',
    constraints: ['1 ≤ temperatures.length ≤ 10⁵', '0 ≤ temperatures[i] ≤ 100'],
    hints: ['栈中保存仍未找到更高温度的下标。', '维持栈内温度单调不增。'],
    examples: [{ input: 'temperatures = [73,74,75,71,69,72,76,73]', output: '[1,1,4,2,1,1,0,0]' }],
    functionName: 'daily_temperatures', cppArgumentTypes: ['vector<int>'], pythonArguments: 'temperatures',
    cppArguments: 'const vector<int>& temperatures', cppReturnType: 'vector<int>', cppDefault: '{}',
    sampleTests: [{ input: [[73, 74, 75, 71, 69, 72, 76, 73]], expected: [1, 1, 4, 2, 1, 1, 0, 0] }],
    hiddenTests: [{ input: [[30, 40, 50, 60]], expected: [1, 1, 1, 0] }, { input: [[30, 60, 90]], expected: [1, 1, 0] }, { input: [[90]], expected: [0] }],
  }),
  problem({
    slug: 'largest-rectangle-histogram', title: '柱状图中的最大矩形', difficulty: 'hard', tags: ['数组', '栈', '单调栈'],
    summary: '给定非负整数柱高数组，选择若干根连续柱子形成矩形，返回能够得到的最大矩形面积。',
    constraints: ['0 ≤ heights.length ≤ 10⁵', '0 ≤ heights[i] ≤ 10⁴'],
    hints: ['维护单调递增下标栈。', '遇到更矮柱子时结算以被弹出柱高为高度的矩形。'],
    examples: [{ input: 'heights = [2,1,5,6,2,3]', output: '10' }],
    functionName: 'largest_rectangle_area', cppArgumentTypes: ['vector<int>'], pythonArguments: 'heights',
    cppArguments: 'const vector<int>& heights', cppReturnType: 'int', cppDefault: '0',
    sampleTests: [{ input: [[2, 1, 5, 6, 2, 3]], expected: 10 }, { input: [[2, 4]], expected: 4 }],
    hiddenTests: [{ input: [[]], expected: 0 }, { input: [[1]], expected: 1 }, { input: [[2, 1, 2]], expected: 3 }, { input: [[0, 0]], expected: 0 }],
  }),
  problem({
    slug: 'search-insert-position', title: '搜索插入位置', difficulty: 'easy', tags: ['数组', '二分查找'],
    summary: '在严格递增数组中查找目标值；若不存在，返回它按顺序插入后应处于的下标。',
    constraints: ['0 ≤ nums.length ≤ 10⁵', 'nums 严格递增'], hints: ['寻找第一个大于或等于 target 的位置。'],
    examples: [{ input: 'nums = [1,3,5,6], target = 5', output: '2' }],
    functionName: 'search_insert', cppArgumentTypes: ['vector<int>', 'int'], pythonArguments: 'nums, target',
    cppArguments: 'const vector<int>& nums, int target', cppReturnType: 'int', cppDefault: '0',
    sampleTests: [{ input: [[1, 3, 5, 6], 5], expected: 2 }, { input: [[1, 3, 5, 6], 2], expected: 1 }],
    hiddenTests: [{ input: [[1, 3, 5, 6], 7], expected: 4 }, { input: [[1, 3, 5, 6], 0], expected: 0 }, { input: [[], 3], expected: 0 }],
  }),
  problem({
    slug: 'first-last-position', title: '有序数组中目标的首尾位置', difficulty: 'medium', tags: ['数组', '二分查找'],
    summary: '给定非递减数组和目标值，返回目标第一次和最后一次出现的下标，不存在时返回 [-1,-1]。',
    constraints: ['0 ≤ nums.length ≤ 10⁵', 'nums 非递减'], hints: ['分别二分第一个不小于 target 和第一个大于 target 的位置。'],
    examples: [{ input: 'nums = [5,7,7,8,8,10], target = 8', output: '[3,4]' }],
    functionName: 'search_range', cppArgumentTypes: ['vector<int>', 'int'], pythonArguments: 'nums, target',
    cppArguments: 'const vector<int>& nums, int target', cppReturnType: 'vector<int>', cppDefault: '{-1, -1}',
    sampleTests: [{ input: [[5, 7, 7, 8, 8, 10], 8], expected: [3, 4] }],
    hiddenTests: [{ input: [[5, 7, 7, 8, 8, 10], 6], expected: [-1, -1] }, { input: [[], 0], expected: [-1, -1] }, { input: [[2, 2], 2], expected: [0, 1] }],
  }),
  problem({
    slug: 'pivot-index', title: '寻找数组中心下标', difficulty: 'easy', tags: ['数组', '前缀和'],
    summary: '返回最左侧中心下标，使其左侧元素和等于右侧元素和；不存在时返回 -1。',
    constraints: ['0 ≤ nums.length ≤ 10⁵', '-10⁴ ≤ nums[i] ≤ 10⁴'], hints: ['用总和减去左侧和与当前值，得到右侧和。'],
    examples: [{ input: 'nums = [1,7,3,6,5,6]', output: '3' }],
    functionName: 'pivot_index', cppArgumentTypes: ['vector<int>'], pythonArguments: 'nums', cppArguments: 'const vector<int>& nums', cppReturnType: 'int', cppDefault: '-1',
    sampleTests: [{ input: [[1, 7, 3, 6, 5, 6]], expected: 3 }],
    hiddenTests: [{ input: [[1, 2, 3]], expected: -1 }, { input: [[2, 1, -1]], expected: 0 }, { input: [[]], expected: -1 }],
  }),
  problem({
    slug: 'range-sum-queries', title: '多次区间求和', difficulty: 'medium', tags: ['数组', '前缀和'],
    summary: '给定整数数组和若干闭区间 [left,right]，按查询顺序返回每个区间的元素和。',
    constraints: ['1 ≤ nums.length ≤ 10⁵', '0 ≤ queries.length ≤ 10⁵', '每个查询均为合法闭区间'], hints: ['构造长度为 n+1 且首项为 0 的前缀和。'],
    examples: [{ input: 'nums = [1,2,3,4], queries = [[0,1],[1,3]]', output: '[3,9]' }],
    functionName: 'range_sums', cppArgumentTypes: ['vector<int>', 'vector<vector<int>>'], pythonArguments: 'nums, queries',
    cppArguments: 'const vector<int>& nums, const vector<vector<int>>& queries', cppReturnType: 'vector<int>', cppDefault: '{}',
    sampleTests: [{ input: [[1, 2, 3, 4], [[0, 1], [1, 3]]], expected: [3, 9] }],
    hiddenTests: [{ input: [[5], [[0, 0]]], expected: [5] }, { input: [[-2, 0, 3, -1], [[0, 3], [2, 2]]], expected: [0, 3] }, { input: [[1, 2], []], expected: [] }],
  }),
  problem({
    slug: 'reverse-linked-list', title: '反转链表', difficulty: 'easy', tags: ['链表'],
    summary: '给定单链表头节点，反转所有 next 指针并返回新的头节点。', constraints: ['0 ≤ 节点数 ≤ 10⁵'], hints: ['修改 current.next 前先保存原来的 next。'],
    examples: [{ input: 'head = [1,2,3,4,5]', output: '[5,4,3,2,1]' }],
    functionName: 'reverse_list', cppArgumentTypes: ['ListNode'], pythonArguments: 'head', cppArguments: 'ListNode* head', cppReturnType: 'ListNode*', cppDefault: 'head',
    sampleTests: [{ input: [[1, 2, 3, 4, 5]], expected: [5, 4, 3, 2, 1] }], hiddenTests: [{ input: [[]], expected: [] }, { input: [[1]], expected: [1] }, { input: [[1, 2]], expected: [2, 1] }],
  }),
  problem({
    slug: 'middle-linked-list', title: '链表的中间节点', difficulty: 'easy', tags: ['链表', '双指针'],
    summary: '返回链表的中间节点；节点数为偶数时返回两个中间节点中的第二个。返回值表现为从该节点开始的链表。',
    constraints: ['1 ≤ 节点数 ≤ 10⁵'], hints: ['慢指针走一步，快指针走两步。'], examples: [{ input: 'head = [1,2,3,4,5]', output: '[3,4,5]' }],
    functionName: 'middle_node', cppArgumentTypes: ['ListNode'], pythonArguments: 'head', cppArguments: 'ListNode* head', cppReturnType: 'ListNode*', cppDefault: 'head',
    sampleTests: [{ input: [[1, 2, 3, 4, 5]], expected: [3, 4, 5] }], hiddenTests: [{ input: [[1, 2, 3, 4, 5, 6]], expected: [4, 5, 6] }, { input: [[1]], expected: [1] }, { input: [[1, 2]], expected: [2] }],
  }),
  problem({
    slug: 'maximum-depth-tree', title: '二叉树的最大深度', difficulty: 'easy', tags: ['二叉树', '深度优先搜索'],
    summary: '返回二叉树从根节点到最远叶子节点所经过的节点数量；空树深度为 0。', constraints: ['0 ≤ 节点数 ≤ 10⁵'], hints: ['当前树深度是左右子树最大深度加一。'],
    examples: [{ input: 'root = [3,9,20,null,null,15,7]', output: '3' }], functionName: 'max_depth', cppArgumentTypes: ['TreeNode'], pythonArguments: 'root', cppArguments: 'TreeNode* root', cppReturnType: 'int', cppDefault: '0',
    sampleTests: [{ input: [[3, 9, 20, null, null, 15, 7]], expected: 3 }], hiddenTests: [{ input: [null], expected: 0 }, { input: [[1]], expected: 1 }, { input: [[1, null, 2, null, 3]], expected: 3 }],
  }),
  problem({
    slug: 'binary-tree-level-sums', title: '二叉树每层节点和', difficulty: 'medium', tags: ['二叉树', '广度优先搜索'],
    summary: '按从上到下的顺序，返回二叉树每一层所有节点值之和组成的数组；空树返回空数组。', constraints: ['0 ≤ 节点数 ≤ 10⁵', '-10⁴ ≤ Node.val ≤ 10⁴'], hints: ['队列每轮开始时的长度就是当前层节点数。'],
    examples: [{ input: 'root = [1,2,3,4,5,null,6]', output: '[1,5,15]' }], functionName: 'level_sums', cppArgumentTypes: ['TreeNode'], pythonArguments: 'root', cppArguments: 'TreeNode* root', cppReturnType: 'vector<int>', cppDefault: '{}',
    sampleTests: [{ input: [[1, 2, 3, 4, 5, null, 6]], expected: [1, 5, 15] }], hiddenTests: [{ input: [null], expected: [] }, { input: [[7]], expected: [7] }, { input: [[1, -2, 3]], expected: [1, 1] }],
  }),
  problem({
    slug: 'assign-cookies', title: '分发饼干', difficulty: 'easy', tags: ['数组', '贪心', '排序'],
    summary: '每个孩子有最低饼干尺寸要求，每块饼干最多分给一个孩子，返回最多能满足的孩子数量。', constraints: ['0 ≤ g.length,s.length ≤ 10⁵'], hints: ['排序后总是用当前最小可行饼干满足要求最小的孩子。'],
    examples: [{ input: 'g = [1,2,3], s = [1,1]', output: '1' }], functionName: 'find_content_children', cppArgumentTypes: ['vector<int>', 'vector<int>'], pythonArguments: 'g, s', cppArguments: 'vector<int> g, vector<int> s', cppReturnType: 'int', cppDefault: '0',
    sampleTests: [{ input: [[1, 2, 3], [1, 1]], expected: 1 }, { input: [[1, 2], [1, 2, 3]], expected: 2 }], hiddenTests: [{ input: [[], [1]], expected: 0 }, { input: [[2], []], expected: 0 }, { input: [[10, 9, 8, 7], [5, 6, 7, 8]], expected: 2 }],
  }),
  problem({
    slug: 'maximum-nonoverlapping-intervals', title: '最多不重叠区间', difficulty: 'medium', tags: ['数组', '贪心', '排序'],
    summary: '给定若干闭开区间 [start,end)，选择尽可能多的两两不重叠区间并返回最大数量。', constraints: ['0 ≤ intervals.length ≤ 10⁵', 'start < end'], hints: ['按结束位置升序排列，并优先选择最早结束的可行区间。'],
    examples: [{ input: 'intervals = [[1,3],[2,4],[3,5],[5,7]]', output: '3' }], functionName: 'max_nonoverlapping', cppArgumentTypes: ['vector<vector<int>>'], pythonArguments: 'intervals', cppArguments: 'vector<vector<int>> intervals', cppReturnType: 'int', cppDefault: '0',
    sampleTests: [{ input: [[[1, 3], [2, 4], [3, 5], [5, 7]]], expected: 3 }], hiddenTests: [{ input: [[]], expected: 0 }, { input: [[[1, 2], [1, 2], [1, 2]]], expected: 1 }, { input: [[[1, 100], [2, 3], [3, 4], [4, 5]]], expected: 3 }],
  }),
  problem({
    slug: 'merge-intervals', title: '合并重叠区间', difficulty: 'medium', tags: ['数组', '排序', '贪心'],
    summary: '给定若干闭区间，合并所有互相重叠或端点相接的区间，按起点升序返回结果。', constraints: ['0 ≤ intervals.length ≤ 10⁵', 'start ≤ end'], hints: ['按起点排序后，只需与结果中的最后一个区间比较。'],
    examples: [{ input: 'intervals = [[1,3],[2,6],[8,10],[15,18]]', output: '[[1,6],[8,10],[15,18]]' }], functionName: 'merge_intervals', cppArgumentTypes: ['vector<vector<int>>'], pythonArguments: 'intervals', cppArguments: 'vector<vector<int>> intervals', cppReturnType: 'vector<vector<int>>', cppDefault: '{}',
    sampleTests: [{ input: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expected: [[1, 6], [8, 10], [15, 18]] }], hiddenTests: [{ input: [[]], expected: [] }, { input: [[[1, 4], [4, 5]]], expected: [[1, 5]] }, { input: [[[1, 4], [0, 2], [3, 5]]], expected: [[0, 5]] }],
  }),
  problem({
    slug: 'minimum-window-substring', title: '最小覆盖子串', difficulty: 'hard', tags: ['字符串', '哈希表', '滑动窗口'],
    summary: '返回字符串 s 中覆盖字符串 t 全部字符及其重复次数的最短连续子串；不存在时返回空字符串。答案保证唯一。', constraints: ['1 ≤ s.length,t.length ≤ 10⁵'], hints: ['右端扩展直到覆盖需求，再移动左端寻找最短合法窗口。', '分别维护所需计数和窗口计数。'],
    examples: [{ input: 's = "ADOBECODEBANC", t = "ABC"', output: '"BANC"' }], functionName: 'min_window', cppArgumentTypes: ['string', 'string'], pythonArguments: 's, t', cppArguments: 'const string& s, const string& t', cppReturnType: 'string', cppDefault: '""',
    sampleTests: [{ input: ['ADOBECODEBANC', 'ABC'], expected: 'BANC' }], hiddenTests: [{ input: ['a', 'a'], expected: 'a' }, { input: ['a', 'aa'], expected: '' }, { input: ['aa', 'aa'], expected: 'aa' }, { input: ['bba', 'ab'], expected: 'ba' }],
  }),
];
