# tequila_presentations

千问试用期转正答辩 PPT 生成代码与资源。

## 内容

- `scripts/build-qwen-defense.mjs`：总入口，先构建 5 个 section，再合并输出最终 PPT。
- `scripts/build-sections.mjs`：只构建 5 个 section，不合并。
- `scripts/combine-sections.mjs`：只合并已有 section 输出，不重新构建 section。
- `scripts/sections/`：5 个章节独立构建脚本，适合分配给不同线程修改。
- `scripts/lib/qwen-deck.mjs`：公共的基准导入、分节页、切片、预览和合并入口。
- `scripts/lib/pptx-package-merge.mjs`：PPTX 包级合并器，直接拼接各 section 的 slide XML 和媒体资源，避免图片坐标/裁剪在二次重绘中漂移。
- `scripts/build-qwen-defense-editable.mjs`：实验性的可编辑元素重建脚本，便于后续继续程序化改版。
- `assets/`：生成 PPT 所需的 Qwen、人大、腾讯广告 logo，以及从文档中抽取的图片素材。
- `templates/转正答辩_千问模板_原始效果.pptx`：当前已确认视觉效果的基准文件。
- `output/转正答辩_千问模板.pptx`：当前可直接打开的生成结果。
- `preview/`：运行脚本后导出的每页 PNG 与总览图，便于快速检查排版。

## 快速运行

完整生成最终版：

```bash
npm run build:qwen
```

默认输出：

```text
output/转正答辩_千问模板.pptx
```

可通过环境变量指定最终输出位置：

```bash
PPTX_OUT=/path/to/deck.pptx npm run build:qwen
```

## 并行修改方式

可以开 5 个线程，每个线程只改自己负责的 section 脚本。每个 section 脚本都能独立生成一份局部 PPT，输出到 `output/sections/`，预览输出到 `preview/sections/`。

| 章节 | 负责脚本 | 独立运行命令 | 输出文件 | 覆盖范围 |
| --- | --- | --- | --- | --- |
| 01 个人介绍 | `scripts/sections/build-01-intro.mjs` | `npm run build:section:01` | `output/sections/01-个人介绍.pptx` | 标题页、目录页、个人介绍/试用期主线 |
| 02 背景与目标 | `scripts/sections/build-02-background.mjs` | `npm run build:section:02` | `output/sections/02-背景与目标.pptx` | 02 分节页、优化背景、目标与挑战 |
| 03 工作产出与案例 | `scripts/sections/build-03-cases.mjs` | `npm run build:section:03` | `output/sections/03-工作产出与案例.pptx` | 03 分节页、五个差异点、Demo overview、6 个 case |
| 04 主要工作 | `scripts/sections/build-04-main-work.mjs` | `npm run build:section:04` | `output/sections/04-主要工作.pptx` | 04 分节页、pipeline、Tokenizer、训练、下游任务、限制性解码 |
| 05 效果与复盘 | `scripts/sections/build-05-review.mjs` | `npm run build:section:05` | `output/sections/05-效果与复盘.pptx` | 05 分节页、复盘、附录、Thanks |

单个线程修改时，只在对应脚本里的 `Section-specific edits ... go here` 注释下面加本章节逻辑，不要改其他 section 脚本。改完后先运行自己的命令检查局部 PPT。

5 个线程都完成后，执行：

```bash
npm run combine:qwen
```

这个命令会读取 `output/sections/*.pptx`，按 01 到 05 的顺序合并成最终版。合并器不会回退到基准 PPT，也不会重新生成页面布局；它会把每个 section PPTX 里的页面、图片和依赖资源原样拼进最终 PPT，所以各线程改完并运行本章节命令后，结果会同步进入最终合并版：

```text
output/转正答辩_千问模板.pptx
```

如果希望从零开始完整生成所有 section 并合并，执行：

```bash
npm run build:qwen
```

如果只想重新生成所有 section，不合并，执行：

```bash
npm run build:sections
```

## 可编辑重建脚本

如果需要继续调试程序化可编辑重建版本，它依赖 Codex primary runtime 内置的 `@oai/artifact-tool`。在本机首次运行：

```bash
npm run bootstrap:codex
npm run build:qwen:editable
```

## 说明

默认构建用于稳定复刻当前 PPT 效果，并在章节切换处补充中间页。5 个 section 脚本都从同一个基准 PPT 和同一套分节逻辑生成，便于并行修改后再统一合并。可编辑重建脚本已去除临时目录硬编码，资源路径均相对仓库根目录解析。
