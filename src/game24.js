import { ChatOpenAI } from "@langchain/openai";
import { config } from "dotenv";

import { proposePrompt, evaluatePrompt } from "./prompts.js";
import { EvaluationCache } from "./cache.js";

config({ path: ".env.local" });

class Game24Solver {
  constructor() {
    this.llm = new ChatOpenAI(
      {
        modelName: "claude-3-5-sonnet-20241022",
        temperature: 0,
        openAIApiKey: process.env.OPENAI_API_KEY,
      },
      { baseURL: process.env.OPENAI_BASE_URL }
    );
    this.cache = new EvaluationCache();
  }

  async init() {
    await this.cache.load();
  }

  async solve(numbers) {
    console.log(`\n开始求解 24 点：${numbers.join(" ")}`);
    const queue = [
      {
        numbers: numbers,
        steps: [],
      },
    ];
    const visited = new Set();

    while (queue.length > 0) {
      const current = queue.shift();
      const numbersKey = current.numbers.sort().join(",");

      if (visited.has(numbersKey)) {
        console.log(`跳过重复组合：${numbersKey}`);
        continue;
      }
      visited.add(numbersKey);

      console.log(`\n当前处理数字：${current.numbers.join(" ")}`);
      if (current.steps.length > 0) {
        console.log(`已执行步骤：${current.steps.join(" -> ")}`);
      }

      // 如果只剩2-3个数字，评估是否可能达到24
      if (current.numbers.length <= 3) {
        console.log("进行可行性评估...");
        // 检查缓存
        const cachedResult = this.cache.get(current.numbers);
        let reason;
        if (cachedResult) {
          console.log("使用缓存的评估结果");
          reason = cachedResult;
        } else {
          const evaluate = await evaluatePrompt.format({
            input: current.numbers.join(" "),
          });
          const evaluation = await this.llm.invoke(evaluate);
          reason = evaluation.content;
          // 保存到缓存
          this.cache.set(current.numbers, reason);
        }

        console.log(`评估原因：${reason}`);

        if (reason.toUpperCase().includes("BINGO")) {
          console.log("😄 找到确定解法！");
          await this.cache.save(); // 保存缓存
          return {
            success: true,
            steps: current.steps,
            reason,
            final: current.numbers,
          };
        }

        if (reason.toUpperCase().includes("IMPOSSIBLE")) {
          console.log("该组合无法得到24，跳过");
          continue;
        }
      }

      console.log("生成下一步可能的操作...");
      const propose = await proposePrompt.format({
        input: current.numbers.join(" "),
      });
      const proposals = await this.llm.invoke(propose);
      const nextSteps = this.parseProposals(proposals.content);
      console.log(`获得 ${nextSteps.length} 个可能的操作：`);
      nextSteps.forEach((step, index) => {
        console.log(
          `  ${index + 1}. ${step.operation} = ${
            step.result
          } (剩余: ${step.remaining.join(" ")})`
        );
      });

      for (const step of nextSteps) {
        queue.push({
          numbers: step.remaining,
          steps: [...current.steps, step.operation],
        });
      }
    }

    console.log("\n搜索完毕，未找到解法");
    await this.cache.save(); // 保存缓存
    return {
      success: false,
      message: "No solution found",
    };
  }

  parseProposals(proposalText) {
    const steps = [];
    const lines = proposalText.split("\n");

    for (const line of lines) {
      // 匹配格式: "<step_number>. <operation> = <result> (left: <remaining_numbers>)"
      // 例如: "1. 2 + 8 = 10 (left: 8 10 14)"
      const match = line.match(
        /^\d+\.\s*([\d\s+\-*/()]+?)\s*=\s*(\d+)\s*\(left:\s*([\d\s]+)\)/
      );

      if (match) {
        steps.push({
          operation: match[1].trim(),
          result: parseInt(match[2]),
          remaining: match[3]
            .trim()
            .split(/\s+/)
            .map((n) => parseInt(n)),
        });
      }
    }

    return steps;
  }
}

export default Game24Solver;
