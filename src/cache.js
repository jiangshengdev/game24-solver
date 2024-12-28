import fs from "fs/promises";

export class EvaluationCache {
  constructor(cacheFile = "evaluation_cache.json") {
    this.cacheFile = cacheFile;
    this.cache = new Map();
    this.dirty = false;
  }

  // 生成缓存键
  generateKey(numbers) {
    // 对数字进行排序以确保相同组合生成相同的键
    return Array.from(numbers)
      .sort((a, b) => a - b)
      .join(",");
  }

  // 获取缓存结果
  get(numbers) {
    const key = this.generateKey(numbers);
    const result = this.cache.get(key);
    return result;
  }

  // 设置缓存结果
  set(numbers, result) {
    const key = this.generateKey(numbers);
    this.cache.set(key, result);
    this.dirty = true;
  }

  // 从文件加载缓存
  async load() {
    try {
      const data = await fs.readFile(this.cacheFile, "utf-8");
      const entries = JSON.parse(data);
      this.cache = new Map(entries);
    } catch (error) {
      if (error.code === "ENOENT") {
        console.log("\n缓存文件不存在，将创建新的缓存\n");
      } else {
        console.error("加载缓存文件失败:", error);
      }
      this.cache = new Map();
    }
  }

  // 保存缓存到文件
  async save() {
    if (!this.dirty) return;

    try {
      const entries = Array.from(this.cache.entries());
      await fs.writeFile(this.cacheFile, JSON.stringify(entries, null, 2));
      this.dirty = false;
    } catch (error) {
      console.error("保存缓存文件失败:", error);
    }
  }
}
