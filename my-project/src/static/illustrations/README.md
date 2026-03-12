# Illustrations Spec

该目录用于首页与结果页的正式插画资源，统一由前端按路径约定自动加载。

## 目录结构

- `home/`
  - `home-hero.svg` 首页主视觉插画（推荐比例 4:3 或 3:2）
- `result/groups/`
  - `analyst.svg` 分析师组占位图（NT）
  - `diplomat.svg` 外交官组占位图（NF）
  - `sentinel.svg` 守护者组占位图（SJ）
  - `explorer.svg` 探险家组占位图（SP）
  - `default.svg` 结果页兜底图
- `result/types/`
  - `INTJ.svg` ~ `ESFP.svg`（可选）
  - 如果存在对应类型文件，优先使用类型图；否则回退到 group 图

## 命名规则

1. 文件名必须为大写 MBTI 类型（如 `ENFP.svg`），仅 4 位字母。
2. 推荐格式：`svg`（体积小、清晰度高）；也支持 `png`/`webp`。
3. 如果一个类型有多语言版本，建议在插画内部处理，不在文件名区分语言。

## 渲染策略

- 首页固定读取：`/static/illustrations/home/home-hero.svg`
- 结果页按顺序读取：
  1. `/static/illustrations/result/types/{TYPE}.svg`
  2. `/static/illustrations/result/groups/{GROUP}.svg`
  3. `/static/illustrations/result/groups/default.svg`

## 设计建议

- 风格：16Personalities 风格的扁平插画，柔和阴影，治愈配色。
- 画布尺寸建议：
  - 首页：1200x900
  - 结果页：800x800（透明背景）
- 安全边距：四周预留至少 8% 空白，避免在圆角容器中裁切。
