---
name: autojs-api-docs-lookup
description: 查询项目下 ./autojs_api_docs/ 目录中的 AutoJS API 文档。始终先完整读取 index.md 来查找用户请求的函数名及其对应的 Markdown 文件路径，然后定位到具体文档中提取详细的使用方法、参数、示例、返回值和注意事项。当用户询问任何 AutoJS API 函数、方法、类、参数、示例时使用此技能，包括"如何使用 xxx"、"xxx 函数用法"、"AutoJS xxx 示例"、"查找 xxx API"、"AutoJS 脚本功能"等中文表述。
---

# AutoJS API 文档查阅技能

## 使用时机
任何与 `./autojs_api_docs/` 目录中 AutoJS API 相关的查询都使用此技能，包括：
- "如何使用 xxx 函数"
- "xxx 的参数是什么"
- "AutoJS xxx 示例代码"
- "查找 xxx API 用法"
- 任何提到 AutoJS 脚本功能的查询（即使没有明确说"API"）

## 操作步骤
1. **始终先读取 index.md**  
   使用文件读取工具完整读取 `./autojs_api_docs/index.md` 的全部内容。

2. **定位函数**  
   在 index.md 中搜索用户提供的函数名（或最接近的关键词），找到对应的 Markdown 文件路径（例如 `functions/xxx.md`、`modules/xxx.md` 等）。

3. **读取目标文档**  
   根据 index.md 中找到的路径，完整读取对应的 Markdown 文件内容。

4. **提取关键信息**  
   重点提取以下部分：
   - 函数功能描述
   - 参数列表及类型
   - 返回值说明
   - 代码示例
   - 注意事项 / 警告 / 最佳实践

5. **未找到时**  
   明确告知用户该函数未在 index.md 中找到，并询问更精确的关键词或备选名称。

## 输出格式
始终使用以下清晰结构回复：

**函数名称**：`xxx`

**文档来源**：`./autojs_api_docs/xxx.md`

**功能描述**：  
（直接引用或简洁翻译文档中的说明）

**参数**：
- param1 (type): 描述
- ...

**返回值**：...

**使用示例**：
```javascript
// 从文档中直接复制或适当调整的示例代码
```

**注意事项**：
（文档中的警告、最佳实践等）
