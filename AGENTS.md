# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## 项目概述
AutoGLM-Autojs6 是一个 AI 驱动的 Android 手机自动化助手，基于 AutoJS 6 框架运行。

## 核心架构

### 入口和主循环
- `main.js` - 应用入口，初始化 UI 和权限检查
- `core/agent.js` - Agent 主循环：获取屏幕 → 调用模型 → 执行动作
  - `PhoneAgent(modelConfig, agentConfig)` - Agent 主类
  - `run(task, callback)` - 执行任务主方法
  - `step()` - 单步执行

### 核心模块
- `core/model_client.js` - AI 模型客户端（默认 MiniMax API）
  - `chat(messages, tools)` - 发送聊天请求
  - `buildTools()` - 构建工具定义（JSON Schema 格式）
- `core/action_handler.js` - 执行点击、滑动、输入等操作
- `core/message_builder.js` - 构建发送给模型的消息格式

### 无障碍服务模块 (accessibility/)
- `device_control.js` - 设备控制：tap, swipe, longPress, launchApp, pressBack, pressHome
- `screen_capture.js` - 截图功能，支持 Base64 编码
- `xml_parser.js` - 解析屏幕 UI 元素树
- `app_detector.js` - 检测当前运行的应用
- `text_input.js` - 文本输入（三种备选方案）

### 配置模块 (config/)
- `apps.js` - 100+ 常用应用的中英文名称到包名映射表
- `system_prompt.js` - 系统提示词（中英文双语）
- `storage.js` - 存储封装（storages 模块或 config.json）
- `timing.js` - 时间延迟配置

### UI 模块 (ui/)
- `main_ui.js` - 主界面：任务输入、执行控制、日志显示
- `settings.js` - 设置界面：模型配置、Agent 配置

### 工具模块 (utils/)
- `logger.js` - 日志工具（DEBUG, INFO, WARN, ERROR）
- `http_client.js` - HTTP 客户端封装

## 关键约定

### 代码规范
- 使用 CommonJS 模块：`require()` / `module.exports`
- 使用 `var` 声明变量（AutoJS 兼容 ES5，非 `let`/`const`）
- UI 布局使用 XML (QI) 格式

### 坐标系统
- 使用相对坐标 0-999（左上角 0,0；右下角 999,999）
- 从 XML boundsInScreen 转换：`(原值 / 屏幕分辨率) * 999`

### 屏幕模式
- `screenshot` - 截图模式，发送 Base64 图片给模型
- `xml` - XML 解析模式，发送 UI 元素树描述给模型

## 配置

### 必需配置
复制 `config.example.json` 为 `config.json`，配置以下项：
- `model.apiKey` - AI 模型 API Key
- `model.baseUrl` - API 地址
- `model.modelName` - 模型名称
- `agent.screenMode` - 屏幕模式（`xml` 或 `screenshot`）

### 时间延迟配置 (config/timing.js)
```javascript
device: {
  default_tap_delay: 0.5,      // 点击延迟（秒）
  default_launch_delay: 2.0,   // 启动应用延迟
  screenshot_timeout: 10        // 截图超时
}
agent: {
  step_delay: 0.5,              // 步骤间延迟
  max_wait_time: 30             // 最大等待时间
}
```

## 工具函数

定义在 `config/system_prompt.js`，用于 AI 模型调用：

| 工具名 | 用途 | 参数 |
|--------|------|------|
| do_launch | 启动应用 | appName, delay |
| do_tap | 点击 | x, y, delay |
| do_double_tap | 双击 | x, y, delay |
| do_long_press | 长按 | x, y, durationMs, delay |
| do_type | 输入文本 | text, delay |
| do_swipe | 滑动 | x1, y1, x2, y2, durationMs, delay |
| do_back | 返回键 | delay |
| do_home | 主页键 | delay |
| do_wait | 等待 | seconds |
| finish | 完成任务 | message |

## 非显而易见的实现细节

### 截图失败处理
截图失败时自动创建黑屏占位图，避免流程中断（`screen_capture.js`）

### 三阶段文本输入
输入失败时自动尝试三种备选方案（`text_input.js`）：
1. `setText()` - 最快
2. 剪贴板粘贴 - 中等
3. `input()` 模拟键盘 - 最慢但最可靠

### XML 节点资源释放
每个 XML 节点使用后必须调用 `recycle()` 释放资源（`xml_parser.js`）

### 双存储策略
同时支持 storages 模块和 config.json 文件，避免配置丢失（`storage.js`）

### 线程执行
UI 操作使用 `threads.start()` 在新线程执行，避免阻塞主线程（`main_ui.js`）

### 应用名智能识别
支持应用名、中英文名、多种空格格式变体匹配（`app_detector.js`）

## API 文档查询
使用 `.agents/skills/autojs-api-docs-lookup/SKILL.md` 技能查询 AutoJS API 文档（位于 `autojs_api_docs/`）

## 模块依赖关系

```
main_ui.js
    └── agent.js
        ├── model_client.js → http_client.js
        ├── action_handler.js → device_control.js, text_input.js
        ├── message_builder.js
        ├── screen_capture.js
        ├── xml_parser.js
        ├── app_detector.js
        ├── storage.js
        └── logger.js