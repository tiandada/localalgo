import type { Problem } from './types.js';
import { generatedProblems } from './generated-catalog.js';
import { curatedProblems } from './curated-catalog.js';

const coreProblems: Problem[] = [
  {
    slug: 'two-sum',
    title: '两数之和',
    difficulty: 'easy',
    tags: ['数组', '哈希表'],
    summary:
      '给定整数数组 nums 和整数 target，返回两个不同元素的下标，使它们的和等于 target。每组输入恰好有一个答案，返回下标顺序不限。',
    constraints: [
      '2 ≤ nums.length ≤ 10⁴',
      '-10⁹ ≤ nums[i], target ≤ 10⁹',
      '每组输入恰好存在一个有效答案，同一元素不能使用两次。',
    ],
    hints: [
      '暴力枚举两个下标可以解决问题，但时间复杂度是 O(n²)。',
      '遍历数组时，思考如何快速判断 target - nums[i] 是否已经出现。',
      '使用哈希表保存“数值 → 下标”，每个元素只需处理一次。',
    ],
    examples: [
      { input: 'nums = [2, 7, 11, 15], target = 9', output: '[0, 1]' },
      { input: 'nums = [3, 2, 4], target = 6', output: '[1, 2]' },
    ],
    functionName: 'two_sum',
    cppArgumentTypes: ['vector<int>', 'int'],
    unorderedResult: true,
    starters: {
      python: `def two_sum(nums, target):
    """Return the indices of two values whose sum equals target."""
    pass
`,
      cpp: `#include <vector>
using namespace std;

vector<int> two_sum(const vector<int>& nums, int target) {
    // Write your solution here.
    return {};
}
`,
    },
    sampleTests: [
      { input: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { input: [[3, 2, 4], 6], expected: [1, 2] },
    ],
    hiddenTests: [
      { input: [[3, 3], 6], expected: [0, 1] },
      { input: [[-3, 4, 3, 90], 0], expected: [0, 2] },
      { input: [[0, 4, 3, 0], 0], expected: [0, 3] },
    ],
  },
  {
    slug: 'valid-brackets',
    title: '有效括号',
    difficulty: 'easy',
    tags: ['字符串', '栈'],
    summary:
      '给定只包含 ()、[]、{} 的字符串 s，判断括号是否成对闭合，并且闭合顺序正确。空字符串视为有效。',
    constraints: [
      '0 ≤ s.length ≤ 10⁴',
      's 只包含字符 ()[]{}。',
      '左括号必须由相同类型的右括号闭合，并且闭合顺序必须正确。',
    ],
    hints: [
      '遇到左括号时，需要记住它，直到遇到对应的右括号。',
      '后出现的左括号必须先闭合，这是一种后进先出的关系。',
      '使用栈；遇到右括号时检查栈顶，最后栈必须为空。',
    ],
    examples: [
      { input: 's = "()[]{}"', output: 'true' },
      { input: 's = "([)]"', output: 'false' },
    ],
    functionName: 'valid_brackets',
    cppArgumentTypes: ['string'],
    starters: {
      python: `def valid_brackets(s):
    """Return True when every bracket is correctly matched."""
    pass
`,
      cpp: `#include <string>
using namespace std;

bool valid_brackets(const string& s) {
    // Write your solution here.
    return false;
}
`,
    },
    sampleTests: [
      { input: ['()[]{}'], expected: true },
      { input: ['([)]'], expected: false },
    ],
    hiddenTests: [
      { input: [''], expected: true },
      { input: ['{[]}'], expected: true },
      { input: [']'], expected: false },
      { input: ['((('], expected: false },
    ],
  },
  {
    slug: 'max-profit',
    title: '一次交易的最大收益',
    difficulty: 'easy',
    tags: ['数组', '动态规划'],
    summary:
      'prices[i] 表示第 i 天的价格。你最多进行一次先买后卖的交易，返回能够获得的最大收益；没有正收益时返回 0。',
    constraints: [
      '0 ≤ prices.length ≤ 10⁵',
      '0 ≤ prices[i] ≤ 10⁴',
      '必须先买入后卖出，并且最多只能完成一笔交易。',
    ],
    hints: [
      '卖出发生在当前天时，最佳买入点一定来自此前的某一天。',
      '遍历时同时维护“截至目前的最低价格”和“最佳收益”。',
      '对每个价格计算 price - lowest，然后更新 lowest 与 best。',
    ],
    examples: [
      { input: 'prices = [7, 1, 5, 3, 6, 4]', output: '5' },
      { input: 'prices = [7, 6, 4, 3, 1]', output: '0' },
    ],
    functionName: 'max_profit',
    cppArgumentTypes: ['vector<int>'],
    starters: {
      python: `def max_profit(prices):
    """Return the best profit obtainable from one buy and one sell."""
    pass
`,
      cpp: `#include <vector>
using namespace std;

int max_profit(const vector<int>& prices) {
    // Write your solution here.
    return 0;
}
`,
    },
    sampleTests: [
      { input: [[7, 1, 5, 3, 6, 4]], expected: 5 },
      { input: [[7, 6, 4, 3, 1]], expected: 0 },
    ],
    hiddenTests: [
      { input: [[]], expected: 0 },
      { input: [[1]], expected: 0 },
      { input: [[2, 4, 1]], expected: 2 },
      { input: [[3, 2, 6, 5, 0, 3]], expected: 4 },
    ],
  },
  {
    slug: 'contains-duplicate',
    title: '存在重复元素',
    difficulty: 'easy',
    tags: ['数组', '哈希表'],
    summary: '给定整数数组 nums，如果任意一个值在数组中至少出现两次，返回 true；如果每个元素都互不相同，返回 false。',
    constraints: ['1 ≤ nums.length ≤ 10⁵', '-10⁹ ≤ nums[i] ≤ 10⁹'],
    hints: ['排序后相同元素会相邻。', '使用哈希集合可以在一次遍历中判断元素是否出现过。'],
    examples: [
      { input: 'nums = [1, 2, 3, 1]', output: 'true' },
      { input: 'nums = [1, 2, 3, 4]', output: 'false' },
    ],
    functionName: 'contains_duplicate',
    cppArgumentTypes: ['vector<int>'],
    starters: {
      python: `def contains_duplicate(nums):
    pass
`,
      cpp: `#include <vector>
using namespace std;

bool contains_duplicate(const vector<int>& nums) {
    return false;
}
`,
    },
    sampleTests: [
      { input: [[1, 2, 3, 1]], expected: true },
      { input: [[1, 2, 3, 4]], expected: false },
    ],
    hiddenTests: [
      { input: [[1]], expected: false },
      { input: [[1, 1]], expected: true },
      { input: [[-1, -2, -1]], expected: true },
    ],
  },
  {
    slug: 'binary-search',
    title: '二分查找',
    difficulty: 'easy',
    tags: ['数组', '二分查找'],
    summary: '给定一个按升序排列且元素互不相同的整数数组 nums 和目标值 target，返回 target 的下标；不存在时返回 -1。',
    constraints: ['1 ≤ nums.length ≤ 10⁴', 'nums 严格升序排列', '-10⁴ ≤ nums[i], target ≤ 10⁴'],
    hints: ['利用数组有序这一条件，每次排除一半搜索范围。', '注意左右边界更新以及循环终止条件。'],
    examples: [
      { input: 'nums = [-1, 0, 3, 5, 9, 12], target = 9', output: '4' },
      { input: 'nums = [-1, 0, 3, 5, 9, 12], target = 2', output: '-1' },
    ],
    functionName: 'binary_search',
    cppArgumentTypes: ['vector<int>', 'int'],
    starters: {
      python: `def binary_search(nums, target):
    pass
`,
      cpp: `#include <vector>
using namespace std;

int binary_search(const vector<int>& nums, int target) {
    return -1;
}
`,
    },
    sampleTests: [
      { input: [[-1, 0, 3, 5, 9, 12], 9], expected: 4 },
      { input: [[-1, 0, 3, 5, 9, 12], 2], expected: -1 },
    ],
    hiddenTests: [
      { input: [[5], 5], expected: 0 },
      { input: [[5], -5], expected: -1 },
      { input: [[1, 3, 7, 9], 1], expected: 0 },
      { input: [[1, 3, 7, 9], 9], expected: 3 },
    ],
  },
  {
    slug: 'palindrome-number',
    title: '回文数',
    difficulty: 'easy',
    tags: ['数学'],
    summary: '给定整数 x，如果从左向右和从右向左读完全相同，返回 true，否则返回 false。负数不是回文数。',
    constraints: ['-2³¹ ≤ x ≤ 2³¹ - 1', '尝试在不把整数完整转换为字符串的情况下解决。'],
    hints: ['负数和以 0 结尾的非零整数可以立即排除。', '只反转数字的后一半，可以避免整数溢出。'],
    examples: [
      { input: 'x = 121', output: 'true' },
      { input: 'x = -121', output: 'false' },
    ],
    functionName: 'palindrome_number',
    cppArgumentTypes: ['int'],
    starters: {
      python: `def palindrome_number(x):
    pass
`,
      cpp: `bool palindrome_number(int x) {
    return false;
}
`,
    },
    sampleTests: [
      { input: [121], expected: true },
      { input: [-121], expected: false },
    ],
    hiddenTests: [
      { input: [0], expected: true },
      { input: [10], expected: false },
      { input: [1221], expected: true },
      { input: [2147483647], expected: false },
    ],
  },
  {
    slug: 'majority-element',
    title: '多数元素',
    difficulty: 'easy',
    tags: ['数组', '哈希表', '分治'],
    summary: '给定长度为 n 的数组 nums，返回出现次数超过 ⌊n / 2⌋ 的多数元素。可以假设多数元素一定存在。',
    constraints: ['1 ≤ nums.length ≤ 5 × 10⁴', '-10⁹ ≤ nums[i] ≤ 10⁹', '多数元素一定存在。'],
    hints: ['哈希计数能够直接解决问题。', 'Boyer–Moore 投票算法只需要 O(1) 额外空间。'],
    examples: [
      { input: 'nums = [3, 2, 3]', output: '3' },
      { input: 'nums = [2, 2, 1, 1, 1, 2, 2]', output: '2' },
    ],
    functionName: 'majority_element',
    cppArgumentTypes: ['vector<int>'],
    starters: {
      python: `def majority_element(nums):
    pass
`,
      cpp: `#include <vector>
using namespace std;

int majority_element(const vector<int>& nums) {
    return 0;
}
`,
    },
    sampleTests: [
      { input: [[3, 2, 3]], expected: 3 },
      { input: [[2, 2, 1, 1, 1, 2, 2]], expected: 2 },
    ],
    hiddenTests: [
      { input: [[1]], expected: 1 },
      { input: [[-1, -1, 2]], expected: -1 },
      { input: [[6, 5, 5]], expected: 5 },
    ],
  },
  {
    slug: 'longest-substring',
    title: '无重复字符的最长子串',
    difficulty: 'medium',
    tags: ['字符串', '哈希表', '滑动窗口'],
    summary: '给定字符串 s，返回其中不含重复字符的最长连续子串的长度。子串必须由原字符串中连续的字符组成。',
    constraints: ['0 ≤ s.length ≤ 5 × 10⁴', 's 可以包含英文字母、数字、符号和空格。'],
    hints: ['维护一个始终不包含重复字符的窗口。', '记录字符最近出现的位置，可以让左边界直接跳过重复字符。'],
    examples: [
      { input: 's = "abcabcbb"', output: '3' },
      { input: 's = "bbbbb"', output: '1' },
    ],
    functionName: 'longest_substring',
    cppArgumentTypes: ['string'],
    starters: {
      python: `def longest_substring(s):
    pass
`,
      cpp: `#include <string>
using namespace std;

int longest_substring(const string& s) {
    return 0;
}
`,
    },
    sampleTests: [
      { input: ['abcabcbb'], expected: 3 },
      { input: ['bbbbb'], expected: 1 },
    ],
    hiddenTests: [
      { input: [''], expected: 0 },
      { input: ['pwwkew'], expected: 3 },
      { input: [' '], expected: 1 },
      { input: ['dvdf'], expected: 3 },
    ],
  },
  {
    slug: 'container-most-water',
    title: '盛最多水的容器',
    difficulty: 'medium',
    tags: ['数组', '双指针', '贪心'],
    summary: '给定非负整数数组 height，第 i 个数表示位于 i 的竖线高度。选择两条线与 x 轴组成容器，返回能够容纳的最大水量。',
    constraints: ['2 ≤ height.length ≤ 10⁵', '0 ≤ height[i] ≤ 10⁴', '容器不能倾斜。'],
    hints: ['容量由两条线中较短的一条和它们的距离决定。', '从两端开始，每次移动较短的那条线。'],
    examples: [
      { input: 'height = [1, 8, 6, 2, 5, 4, 8, 3, 7]', output: '49' },
      { input: 'height = [1, 1]', output: '1' },
    ],
    functionName: 'container_most_water',
    cppArgumentTypes: ['vector<int>'],
    starters: {
      python: `def container_most_water(height):
    pass
`,
      cpp: `#include <vector>
using namespace std;

int container_most_water(const vector<int>& height) {
    return 0;
}
`,
    },
    sampleTests: [
      { input: [[1, 8, 6, 2, 5, 4, 8, 3, 7]], expected: 49 },
      { input: [[1, 1]], expected: 1 },
    ],
    hiddenTests: [
      { input: [[4, 3, 2, 1, 4]], expected: 16 },
      { input: [[1, 2, 1]], expected: 2 },
      { input: [[0, 2]], expected: 0 },
    ],
  },
  {
    slug: 'product-except-self',
    title: '除自身以外数组的乘积',
    difficulty: 'medium',
    tags: ['数组', '前缀积'],
    summary: '给定整数数组 nums，返回数组 answer，其中 answer[i] 等于 nums 中除 nums[i] 之外其余所有元素的乘积。不要使用除法。',
    constraints: ['2 ≤ nums.length ≤ 10⁵', '-30 ≤ nums[i] ≤ 30', '任意前缀或后缀乘积都在 32 位整数范围内。'],
    hints: ['分别考虑每个位置左侧元素的乘积与右侧元素的乘积。', '输出数组可以先保存前缀积，再用一个变量累积后缀积。'],
    examples: [
      { input: 'nums = [1, 2, 3, 4]', output: '[24, 12, 8, 6]' },
      { input: 'nums = [-1, 1, 0, -3, 3]', output: '[0, 0, 9, 0, 0]' },
    ],
    functionName: 'product_except_self',
    cppArgumentTypes: ['vector<int>'],
    starters: {
      python: `def product_except_self(nums):
    pass
`,
      cpp: `#include <vector>
using namespace std;

vector<int> product_except_self(const vector<int>& nums) {
    return {};
}
`,
    },
    sampleTests: [
      { input: [[1, 2, 3, 4]], expected: [24, 12, 8, 6] },
      { input: [[-1, 1, 0, -3, 3]], expected: [0, 0, 9, 0, 0] },
    ],
    hiddenTests: [
      { input: [[2, 3]], expected: [3, 2] },
      { input: [[0, 0]], expected: [0, 0] },
      { input: [[1, -1, 1, -1]], expected: [1, -1, 1, -1] },
    ],
  },
  {
    slug: 'subarray-sum-equals-k',
    title: '和为 K 的子数组',
    difficulty: 'medium',
    tags: ['数组', '哈希表', '前缀和'],
    summary: '给定整数数组 nums 和整数 k，返回和恰好等于 k 的连续非空子数组数量。不同起止位置视为不同子数组。',
    constraints: ['1 ≤ nums.length ≤ 2 × 10⁴', '-1000 ≤ nums[i] ≤ 1000', '-10⁷ ≤ k ≤ 10⁷'],
    hints: ['计算前缀和后，子数组和可以表示为两个前缀和之差。', '遍历时统计此前出现过多少个 current_sum - k。'],
    examples: [
      { input: 'nums = [1, 1, 1], k = 2', output: '2' },
      { input: 'nums = [1, 2, 3], k = 3', output: '2' },
    ],
    functionName: 'subarray_sum_equals_k',
    cppArgumentTypes: ['vector<int>', 'int'],
    starters: {
      python: `def subarray_sum_equals_k(nums, k):
    pass
`,
      cpp: `#include <vector>
using namespace std;

int subarray_sum_equals_k(const vector<int>& nums, int k) {
    return 0;
}
`,
    },
    sampleTests: [
      { input: [[1, 1, 1], 2], expected: 2 },
      { input: [[1, 2, 3], 3], expected: 2 },
    ],
    hiddenTests: [
      { input: [[1], 0], expected: 0 },
      { input: [[-1, -1, 1], 0], expected: 1 },
      { input: [[0, 0, 0], 0], expected: 6 },
    ],
  },
  {
    slug: 'house-robber',
    title: '打家劫舍',
    difficulty: 'medium',
    tags: ['数组', '动态规划'],
    summary: '给定非负整数数组 nums，nums[i] 表示第 i 间房屋的金额。相邻房屋不能在同一晚被选择，返回能够取得的最大金额。',
    constraints: ['1 ≤ nums.length ≤ 100', '0 ≤ nums[i] ≤ 400'],
    hints: ['对每间房屋，都可以选择跳过它，或选择它并放弃前一间。', '状态只依赖前两个位置，因此可以把额外空间降到 O(1)。'],
    examples: [
      { input: 'nums = [1, 2, 3, 1]', output: '4' },
      { input: 'nums = [2, 7, 9, 3, 1]', output: '12' },
    ],
    functionName: 'house_robber',
    cppArgumentTypes: ['vector<int>'],
    starters: {
      python: `def house_robber(nums):
    pass
`,
      cpp: `#include <vector>
using namespace std;

int house_robber(const vector<int>& nums) {
    return 0;
}
`,
    },
    sampleTests: [
      { input: [[1, 2, 3, 1]], expected: 4 },
      { input: [[2, 7, 9, 3, 1]], expected: 12 },
    ],
    hiddenTests: [
      { input: [[0]], expected: 0 },
      { input: [[2, 1, 1, 2]], expected: 4 },
      { input: [[10, 1, 1, 10]], expected: 20 },
    ],
  },
  {
    slug: 'add-two-numbers',
    title: '链表两数相加',
    difficulty: 'medium',
    tags: ['链表', '数学', '递归'],
    summary: '两个非空链表以逆序保存两个非负整数，每个节点保存一位数字。将两个数相加，并以相同的逆序链表形式返回结果。',
    constraints: ['每个链表包含 1 到 100 个节点', '0 ≤ Node.val ≤ 9', '除数字 0 外，输入数字没有前导零。'],
    hints: ['从两个链表头部开始逐位相加。', '使用 carry 保存上一位产生的进位；链表结束后仍需检查进位。'],
    examples: [
      { input: 'l1 = [2, 4, 3], l2 = [5, 6, 4]', output: '[7, 0, 8]' },
      { input: 'l1 = [0], l2 = [0]', output: '[0]' },
    ],
    functionName: 'add_two_numbers',
    cppArgumentTypes: ['ListNode', 'ListNode'],
    starters: {
      python: `def add_two_numbers(l1, l2):
    # ListNode is provided by LocalAlgo.
    pass
`,
      cpp: `// ListNode is provided by LocalAlgo.
ListNode* add_two_numbers(ListNode* l1, ListNode* l2) {
    return nullptr;
}
`,
    },
    sampleTests: [
      { input: [[2, 4, 3], [5, 6, 4]], expected: [7, 0, 8] },
      { input: [[0], [0]], expected: [0] },
    ],
    hiddenTests: [
      { input: [[9, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9]], expected: [8, 9, 9, 9, 0, 0, 0, 1] },
      { input: [[1], [9, 9]], expected: [0, 0, 1] },
      { input: [[5], [5]], expected: [0, 1] },
    ],
  },
  {
    slug: 'invert-binary-tree',
    title: '翻转二叉树',
    difficulty: 'easy',
    tags: ['树', '二叉树', '深度优先搜索', '广度优先搜索'],
    summary: '给定一棵二叉树的根节点，交换每个节点的左右子树，并返回翻转后的根节点。输入和输出均以层序数组展示。',
    constraints: ['树中节点数范围为 0 到 100', '-100 ≤ Node.val ≤ 100'],
    hints: ['当前节点的左右子树交换后，两个子树内部也需要执行相同操作。', '递归 DFS 与使用队列的 BFS 都可以完成。'],
    examples: [
      { input: 'root = [4, 2, 7, 1, 3, 6, 9]', output: '[4, 7, 2, 9, 6, 3, 1]' },
      { input: 'root = [2, 1, 3]', output: '[2, 3, 1]' },
    ],
    functionName: 'invert_binary_tree',
    cppArgumentTypes: ['TreeNode'],
    starters: {
      python: `def invert_binary_tree(root):
    # TreeNode is provided by LocalAlgo.
    pass
`,
      cpp: `// TreeNode is provided by LocalAlgo.
TreeNode* invert_binary_tree(TreeNode* root) {
    return nullptr;
}
`,
    },
    sampleTests: [
      { input: [[4, 2, 7, 1, 3, 6, 9]], expected: [4, 7, 2, 9, 6, 3, 1] },
      { input: [[2, 1, 3]], expected: [2, 3, 1] },
    ],
    hiddenTests: [
      { input: [null], expected: null },
      { input: [[1]], expected: [1] },
      { input: [[1, 2, null, 3]], expected: [1, null, 2, null, 3] },
    ],
  },
  {
    slug: 'matrix-diagonal-sum',
    title: '矩阵对角线元素之和',
    difficulty: 'easy',
    tags: ['数组', '矩阵'],
    summary: '给定一个 n × n 整数矩阵，返回主对角线和副对角线上所有元素的和。位于中心且同时属于两条对角线的元素只能计算一次。',
    constraints: ['1 ≤ n ≤ 100', 'mat.length = mat[i].length = n', '1 ≤ mat[i][j] ≤ 100'],
    hints: ['第 i 行的主对角线列号是 i，副对角线列号是 n - 1 - i。', '当两个列号相同时不要重复累加。'],
    examples: [
      { input: 'mat = [[1,2,3],[4,5,6],[7,8,9]]', output: '25' },
      { input: 'mat = [[5]]', output: '5' },
    ],
    functionName: 'matrix_diagonal_sum',
    cppArgumentTypes: ['vector<vector<int>>'],
    starters: {
      python: `def matrix_diagonal_sum(mat):
    pass
`,
      cpp: `#include <vector>
using namespace std;

int matrix_diagonal_sum(const vector<vector<int>>& mat) {
    return 0;
}
`,
    },
    sampleTests: [
      { input: [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], expected: 25 },
      { input: [[[5]]], expected: 5 },
    ],
    hiddenTests: [
      { input: [[[1, 1], [1, 1]]], expected: 4 },
      { input: [[[7, 3, 1], [2, 4, 6], [9, 8, 5]]], expected: 26 },
    ],
  },
  {
    slug: 'longest-common-prefix',
    title: '最长公共前缀',
    difficulty: 'easy',
    tags: ['字符串', '字典树'],
    summary: '给定一个字符串数组，返回所有字符串共有的最长前缀。如果不存在公共前缀，返回空字符串。',
    constraints: ['1 ≤ strs.length ≤ 200', '0 ≤ strs[i].length ≤ 200', 'strs[i] 仅包含小写英文字母。'],
    hints: ['可以先把第一个字符串作为候选前缀，再逐步缩短。', '也可以逐列比较所有字符串的同一位置。'],
    examples: [
      { input: 'strs = ["flower", "flow", "flight"]', output: '"fl"' },
      { input: 'strs = ["dog", "racecar", "car"]', output: '""' },
    ],
    functionName: 'longest_common_prefix',
    cppArgumentTypes: ['vector<string>'],
    starters: {
      python: `def longest_common_prefix(strs):
    pass
`,
      cpp: `#include <string>
#include <vector>
using namespace std;

string longest_common_prefix(const vector<string>& strs) {
    return "";
}
`,
    },
    sampleTests: [
      { input: [['flower', 'flow', 'flight']], expected: 'fl' },
      { input: [['dog', 'racecar', 'car']], expected: '' },
    ],
    hiddenTests: [
      { input: [['a']], expected: 'a' },
      { input: [['', 'abc']], expected: '' },
      { input: [['interview', 'internet', 'internal']], expected: 'inter' },
    ],
  },
];

export const problems: Problem[] = [...coreProblems, ...curatedProblems, ...generatedProblems];

export function findProblem(slug: string): Problem | undefined {
  return problems.find((problem) => problem.slug === slug);
}
