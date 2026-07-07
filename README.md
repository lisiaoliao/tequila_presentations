# tequila_presentations

千问试用期转正答辩 PPT 生成代码与资源。

## 内容

- `scripts/build-qwen-defense.mjs`：复刻当前已确认版 PPT，输出文件与原始效果保持一致。
- `scripts/build-qwen-defense-editable.mjs`：实验性的可编辑元素重建脚本，便于后续继续程序化改版。
- `assets/`：生成 PPT 所需的 Qwen、人大、腾讯广告 logo，以及从文档中抽取的图片素材。
- `templates/转正答辩_千问模板_原始效果.pptx`：当前已确认视觉效果的基准文件。
- `output/转正答辩_千问模板.pptx`：当前可直接打开的生成结果。
- `preview/`：运行脚本后导出的每页 PNG 与总览图，便于快速检查排版。

## 运行

默认构建会复制已确认的基准 PPT，确保效果稳定：

```bash
npm run build:qwen
```

默认输出：

```text
output/转正答辩_千问模板.pptx
```

可通过环境变量指定输出位置：

```bash
PPTX_OUT=/path/to/deck.pptx npm run build:qwen
```

如果需要继续调试程序化可编辑重建版本，它依赖 Codex primary runtime 内置的 `@oai/artifact-tool`。在本机首次运行：

```bash
npm run bootstrap:codex
npm run build:qwen:editable
```

## 说明

默认构建用于稳定复刻当前 PPT 效果；可编辑重建脚本已去除临时目录硬编码，资源路径均相对仓库根目录解析。PPT 叙事线按当前 Markdown 文档重排版本组织，包含个人介绍、背景与目标、工作产出与案例、主要工作、效果与复盘和附录。
