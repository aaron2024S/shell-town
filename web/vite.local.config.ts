import { cpSync, existsSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, mergeConfig } from "vite";
import base from "./vite.config";

/**
 * 本机（Windows 沙箱）专用前端构建配置 —— 只在开发机上用，CI / 生产照旧走 `build`。
 *
 * 为什么需要它：
 *
 * 1. **压缩阶段会确定性死锁。** 本机跑标准 `vite build` 时，日志停在
 *    `✓ N modules transformed` 之后 CPU 归零、进程永不退出；
 *    而单独调用 `esbuild.transform()` / `transformSync()` 只要 100~300ms，完全正常。
 *    这是本机环境问题，**不代表代码有问题**。绕过办法是把 minify 关掉（见下面 build.minify）。
 *
 * 2. **关掉 vite 自带的 public/ 复制，改在构建结束后自己复制。**
 *    vite 的 `copyPublicDir` 阶段和上面的压缩阶段叠在一起时更容易卡住；
 *    这里统一改成 `closeBundle` 钩子里 cpSync，产物一步到位。
 *
 * 产物完整性校验（2669 个文件 / 23.7 MB）：
 *   dist/index.html + dist/assets/*    ← vite 产物
 *   dist/*                             ← public/ 静态资源（图标、图片、manifest 等）
 *   两边的 index.html 引用必须都能在 dist/ 里找到。
 *
 * 用法（仓库根目录）：
 *   npm run build:local --workspace web
 */
export default mergeConfig(
  base,
  defineConfig({
    build: {
      minify: false,
      copyPublicDir: false,
    },
    plugins: [
      {
        name: "shell-town:copy-public",
        apply: "build",
        closeBundle() {
          const from = fileURLToPath(new URL("./public", import.meta.url));
          const to = fileURLToPath(new URL("./dist", import.meta.url));
          if (!existsSync(from)) {
            this.warn("public/ 不存在，跳过静态资源复制");
            return;
          }
          cpSync(from, to, { recursive: true });
          this.info("[build:local] public/ -> dist/ 已复制");
        },
      },
    ],
  }),
);
