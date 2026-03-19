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

## 屏幕模式详解

AutoGLM-Autojs6 实现了两种读取屏幕内容的模式，用于 AI 模型理解当前屏幕状态。两种模式各有优劣，适用于不同场景。

### 截图模式 (screenshot)

#### 工作原理
通过 [`accessibility/screen_capture.js`](accessibility/screen_capture.js) 获取屏幕截图，转换为 Base64 编码后发送给模型。

#### 数据流
```
屏幕捕获 → images.captureScreen() → Image 对象
         → images.toBase64() → Base64 字符串
         → 构建多模态消息 → 发送给 AI 模型
```

#### 坐标系统
使用相对坐标 0-999（左上角 0,0；右下角 999,999），与屏幕分辨率无关。

#### 优点
- 保留完整视觉信息（图片、图标、颜色、布局）
- 适合需要视觉判断的场景
- 可识别游戏界面、自定义绘制控件

#### 缺点
- Token 消耗较大（约 1000-4000 tokens）
- 数据传输量较大（约 500KB-2MB Base64）
- 可能泄露敏感信息（如银行账号）

#### 适用场景
- 游戏自动化（识别游戏元素、血条、道具）
- 社交媒体应用（小红书、抖音等图片/视频内容）
- 需要识别验证码的场景
- 自定义绘制的 UI 控件（Canvas、游戏引擎）

---

### XML 解析模式 (xml)

#### 工作原理
通过 [`accessibility/xml_parser.js`](accessibility/xml_parser.js) 解析 UI 元素树，提取结构化信息后生成文本描述发送给模型。

#### 数据流
```
无障碍服务 → auto.rootInActiveWindow → UI 节点树
           → 递归遍历提取属性 → 过滤和分类
           → 格式化为文本描述 → 发送给 AI 模型
```

#### 坐标系统
使用绝对像素坐标，与屏幕分辨率直接相关。

#### 优点
- Token 消耗低（约 100-1000 tokens）
- 数据传输量小（约 5-50KB 文本）
- 文本信息准确（直接获取控件文本）
- 隐私友好（不包含视觉敏感信息）

#### 缺点
- 无法获取视觉信息（图片、颜色、图标）
- 依赖无障碍服务
- 对自定义绘制控件支持有限

#### 适用场景
- 表单自动填写
- 系统设置操作
- 联系人/短信管理
- 文件管理器操作
- 需要精确文本匹配的任务

---

### 模式对比

| 维度 | 截图模式 | XML 解析模式 |
|------|----------|--------------|
| **信息完整性** | 保留所有视觉信息 | 仅保留结构化信息 |
| **视觉理解** | 可识别图片、图标、颜色 | 无法获取视觉信息 |
| **文本准确性** | 依赖 OCR 或模型识别 | 直接获取准确文本 |
| **坐标系统** | 相对坐标 0-999 | 绝对像素坐标 |
| **Token 消耗** | 约 1000-4000 tokens | 约 100-1000 tokens |
| **数据大小** | 约 500KB-2MB | 约 5-50KB |
| **隐私保护** | 可能泄露敏感信息 | 仅结构化数据 |
| **依赖条件** | 截图权限 | 无障碍服务 |

---

### 模式选择建议

| 场景类型 | 推荐模式 | 原因 |
|----------|----------|------|
| 游戏自动化 | 截图 | 需要视觉识别游戏元素 |
| 社交媒体浏览 | 截图 | 图片/视频内容需要视觉理解 |
| 电商购物 | 截图 | 需要识别商品图片 |
| 表单填写 | XML | 文本精确、成本低 |
| 系统设置操作 | XML | 原生控件、结构清晰 |
| 文档处理 | XML | 文本内容为主 |
| 银行/支付应用 | XML | 隐私保护、避免敏感信息泄露 |

---

### 配置方式

在 `config.json` 中配置：

```json
{
    "agent": {
        "screenMode": "screenshot"  // 或 "xml"
    }
}
```

代码中的模式选择逻辑位于 [`core/agent.js`](core/agent.js:22-24)：

```javascript
// 屏幕解析模式: "screenshot"(截图) 或 "xml"(XML解析)
// 默认为截图模式
this.screenMode = agentConfig.screenMode || 'screenshot';
```

---

### 关键实现文件

| 文件 | 职责 |
|------|------|
| [`accessibility/screen_capture.js`](accessibility/screen_capture.js) | 截图捕获、Base64 编码、权限管理 |
| [`accessibility/xml_parser.js`](accessibility/xml_parser.js) | UI 树解析、元素提取、文本格式化 |
| [`core/agent.js`](core/agent.js) | 模式选择、状态捕获调度 |
| [`core/message_builder.js`](core/message_builder.js) | 构建多模态/纯文本消息 |
| [`config/system_prompt.js`](config/system_prompt.js) | 不同模式的系统提示词（含坐标系统说明） |

## 配置

### 必需配置
复制 `config.example.json` 为 `config.json`，配置以下项：
- `model.apiKey` - AI 模型 API Key
- `model.baseUrl` - API 地址
- `model.modelName` - 模型名称
- `agent.screenMode` - 屏幕模式（`xml` 或 `screenshot`）

### 时间延迟配置 (config/timing.js)

延迟参数已参数化，可在 `config.json` 的 `timing` 节点配置，或通过设置界面调整。

#### 设备操作延迟（单位：毫秒）
| 参数 | 默认值 | 说明 |
|------|--------|------|
| tapDelay | 500 | 点击操作后等待时间 |
| doubleTapInterval | 150 | 双击两次点击间隔 |
| doubleTapDelay | 500 | 双击操作后等待时间 |
| longPressDelay | 500 | 长按操作后等待时间 |
| swipeDelay | 500 | 滑动操作后等待时间 |
| backDelay | 500 | 返回键操作后等待时间 |
| homeDelay | 500 | 主页键操作后等待时间 |
| launchDelay | 2000 | 启动应用后等待时间 |

#### 输入操作延迟（单位：毫秒）
| 参数 | 默认值 | 说明 |
|------|--------|------|
| typeDelay | 300 | 文本输入后等待时间 |
| clearDelay | 300 | 清空输入框后等待时间 |
| pressDelay | 500 | 按压坐标后等待时间 |
| pasteDelay | 300 | 粘贴操作后等待时间 |
| inputClickDelay | 300 | 点击输入框后等待时间 |

#### Agent 延迟（单位：毫秒）
| 参数 | 默认值 | 说明 |
|------|--------|------|
| agentRestInterval | 1200 | Agent 每步执行后等待界面稳定的时间 |

#### API
- `getTimingConfig()` - 读取延迟配置
- `setTimingConfig(config)` - 保存延迟配置

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