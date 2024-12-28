import Game24Solver from "./game24.js";

async function test() {
  const solver = new Game24Solver();
  await solver.init(); // 初始化缓存

  // 测试用例
  const testCases = [
    [4, 4, 6, 8],
    // [2, 9, 10, 12],
    // [4, 9, 10, 13],
  ];

  for (const numbers of testCases) {
    const result = await solver.solve(numbers);

    if (result.success) {
      console.log("Steps:", result.steps);
      console.log("最终数字:", result.final);
      console.log("理由:", result.reason);
    } else {
      console.log(result.message);
    }
  }
}

test().catch(console.error);
