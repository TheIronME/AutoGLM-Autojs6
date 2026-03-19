# AutoJs6 API 文档索引

欢迎使用 AutoJs6 API 文档。AutoJs6 是一款 Android 平台上的自动化脚本工具，支持 JavaScript 脚本编写，提供丰富的 API 接口用于实现各种自动化操作。

---

## 目录

- [基础模块](#基础模块)
- [自动化模块](#自动化模块)
- [图像处理模块](#图像处理模块)
- [网络模块](#网络模块)
- [系统交互模块](#系统交互模块)
- [界面模块](#界面模块)
- [多媒体模块](#多媒体模块)
- [数据处理模块](#数据处理模块)
- [扩展模块](#扩展模块)
- [类型定义](#类型定义)
- [术语表和参考](#术语表和参考)

---

## 基础模块

### Global - 全局对象

**功能概述**：提供全局可用的变量、方法和构造器，包括休眠、消息提示、随机数、等待、退出等核心函数。

**文档链接**：[global.md](global.md)

#### 主要函数

| 函数名 | 输入参数 | 返回值 | 简要描述 |
|--------|----------|--------|----------|
| sleep | millis: number | void | 使当前线程休眠指定毫秒数 |
| toast | text: string | void | 显示短暂消息提示 |
| toastLog | text: string | void | 显示消息提示并在控制台打印 |
| random | - | number | 返回 [0, 1) 区间的随机数 |
| random | min, max: number | number | 返回 [min, max] 区间的随机整数 |
| wait | condition: Function | boolean | 阻塞等待直到条件满足 |
| exit | - | void | 停止脚本运行 |
| currentPackage | - | string | 获取当前应用包名 |
| currentActivity | - | string | 获取当前活动名称 |
| setClip | text: string | void | 设置剪贴板内容 |
| getClip | - | string | 获取剪贴板内容 |

---

### Console - 控制台

**功能概述**：提供控制台日志输出、浮动窗口管理等功能，支持多种日志级别和自定义样式。

**文档链接**：[console.md](console.md)

#### 主要函数

| 函数名 | 输入参数 | 返回值 | 简要描述 |
|--------|----------|--------|----------|
| show | - | this | 显示控制台浮动窗口 |
| hide | - | this | 隐藏控制台浮动窗口 |
| log | data: string | void | 输出普通日志消息 |
| info | data: string | void | 输出重要信息消息 |
| warn | data: string | void | 输出警告消息 |
| error | data: string | void | 输出错误消息 |
| verbose | data: string | void | 输出详细调试消息 |
| assert | bool: boolean | void | 断言检查 |
| clear | - | this | 清空控制台日志 |
| time | label: string | void | 启动计时器 |
| timeEnd | label: string | void | 停止计时器并输出时间 |

---

### Shell - Shell命令执行

**功能概述**：提供 Shell 命令执行功能，支持普通模式和 Root 模式。

**文档链接**：[shell.md](shell.md)

#### 主要函数

| 函数名 | 输入参数 | 返回值 | 简要描述 |
|--------|----------|--------|----------|
| shell | command: string | ShellResult | 执行 Shell 命令 |
| Shell | - | Shell | 创建 Shell 实例 |

---

### Timers - 定时器

**功能概述**：提供定时执行任务的功能，包括 setTimeout、setInterval 等。

**文档链接**：[timers.md](timers.md)

#### 主要函数

| 函数名 | 输入参数 | 返回值 | 简要描述 |
|--------|----------|--------|----------|
| setTimeout | callback, delay | number | 设置一次性定时器 |
| setInterval | callback, delay | number | 设置循环定时器 |
| setImmediate | callback | number | 设置立即执行的定时器 |
| clearTimeout | id: number | void | 清除 setTimeout 定时器 |
| clearInterval | id: number | void | 清除 setInterval 定时器 |

---

### Threads - 线程

**功能概述**：提供多线程支持，可以创建和管理子线程。

**文档链接**：[threads.md](threads.md)

#### 主要函数

| 函数名 | 输入参数 | 返回值 | 简要描述 |
|--------|----------|--------|----------|
| start | action: Function | Thread | 启动新线程 |
| shutDownAll | - | void | 关闭所有子线程 |
| currentThread | - | Thread | 获取当前线程对象 |

---

### Engines - 引擎

**功能概述**：提供脚本引擎管理功能，可以执行脚本文件、字符串代码等。

**文档链接**：[engines.md](engines.md)

#### 主要函数

| 函数名 | 输入参数 | 返回值 | 简要描述 |
|--------|----------|--------|----------|
| execScript | script: string | ScriptEngine | 执行脚本字符串 |
| execScriptFile | path: string | ScriptEngine | 执行脚本文件 |
| myEngine | - | ScriptEngine | 获取当前脚本引擎 |
| stopAll | - | void | 停止所有脚本引擎 |

---

## 自动化模块

### Automator - 自动化操作

**功能概述**：提供基于坐标和控件的自动化操作，包括点击、滑动、手势等。

**文档链接**：[automator.md](automator.md)

#### 主要函数

| 函数名 | 输入参数 | 返回值 | 简要描述 |
|--------|----------|--------|----------|
| click | x, y: number | boolean | 点击指定坐标 |
| longClick | x, y: number | boolean | 长按指定坐标 |
| swipe | x1, y1, x2, y2, duration | boolean | 从起点滑动到终点 |
| gesture | duration, [...coordinates] | void | 执行手势操作 |
| press | x, y, duration | boolean | 按压指定位置 |
| auto | - | void | 检查并启用无障碍服务 |
| auto.waitFor | - | void | 等待无障碍服务启用 |

---

### UiSelector - 控件选择器

**功能概述**：用于通过条件筛选屏幕上的控件节点，支持多种选择条件。

**文档链接**：[uiSelectorType.md](uiSelectorType.md)

#### 主要函数

| 函数名 | 输入参数 | 返回值 | 简要描述 |
|--------|----------|--------|----------|
| text | text: string | UiSelector | 选择指定文本的控件 |
| textContains | text: string | UiSelector | 选择包含指定文本的控件 |
| id | id: string | UiSelector | 选择指定 ID 的控件 |
| className | className: string | UiSelector | 选择指定类名的控件 |
| desc | desc: string | UiSelector | 选择指定描述的控件 |
| clickable | b: boolean | UiSelector | 选择可点击的控件 |
| find | - | UiObjectCollection | 查找所有匹配的控件 |
| findOne | - | UiObject | 查找第一个匹配的控件 |
| exists | - | boolean | 判断是否存在匹配的控件 |

---

### UiObject - 控件节点

**功能概述**：代表一个屏幕上的控件节点，可以获取控件信息或执行控件操作。

**文档链接**：[uiObjectType.md](uiObjectType.md)

#### 主要函数

| 函数名 | 输入参数 | 返回值 | 简要描述 |
|--------|----------|--------|----------|
| parent | - | UiObject | 获取父控件 |
| child | i: number | UiObject | 获取指定索引的子控件 |
| children | - | UiObjectCollection | 获取所有子控件 |
| click | - | boolean | 点击控件 |
| longClick | - | boolean | 长按控件 |
| setText | text: string | boolean | 设置控件文本 |
| text | - | string | 获取控件文本 |
| bounds | - | Rect | 获取控件边界 |
| boundsInParent | - | Rect | 获取控件在父控件中的边界 |

---

### UiObjectCollection - 控件集合

**功能概述**：代表控件节点的集合，支持批量操作。

**文档链接**：[uiObjectCollectionType.md](uiObjectCollectionType.md)

#### 主要函数

| 函数名 | 输入参数 | 返回值 | 简要描述 |
|--------|----------|--------|----------|
| isEmpty | - | boolean | 判断集合是否为空 |
| size | - | number | 获取集合大小 |
| get | i: number | UiObject | 获取指定索引的控件 |
| find | - | UiObjectCollection | 在集合中查找控件 |
| click | - | boolean | 点击集合中所有控件 |

---

### UiObjectActions - 控件行为接口

**功能概述**：定义控件可执行的行为集合，如点击、长按、滚动等。

**文档链接**：[uiObjectActionsType.md](uiObjectActionsType.md)

---

## 图像处理模块

### Image - 图像处理

**功能概述**：提供图像读取、保存、截图、找色、找图等功能。

**文档链接**：[image.md](image.md)

#### 主要函数

| 函数名 | 输入参数 | 返回值 | 简要描述 |
|--------|----------|--------|----------|
| read | path: string | Image | 读取图片文件 |
| load | url: string | Image | 从网络加载图片 |
| save | image, path, format, quality | void | 保存图片到文件 |
| captureScreen | - | Image | 截取当前屏幕 |
| findColor | image, color, options | Point | 在图片中查找颜色 |
| findImage | image, template, options | Point | 在图片中查找模板图片 |
| pixel | image, x, y | number | 获取指定位置的像素值 |
| clip | img, x, y, w, h | Image | 剪切图片 |
| requestScreenCapture | landscape: boolean | boolean | 请求截图权限 |

---

### Color - 颜色处理

**功能概述**：提供颜色转换、比较等功能，支持多种颜色格式。

**文档链接**：[color.md](color.md)

#### 主要函数

| 函数名 | 输入参数 | 返回值 | 简要描述 |
|--------|----------|--------|----------|
| toInt | color: string | number | 将颜色转换为整数 |
| toHex | color: number | string | 将颜色转换为十六进制字符串 |
| rgb | r, g, b: number | number | 创建 RGB 颜色值 |
| argb | a, r, g, b: number | number | 创建 ARGB 颜色值 |
| isSimilar | color1, color2, threshold | boolean | 判断两个颜色是否相似 |
| equals | color1, color2 | boolean | 判断两个颜色是否相等 |

---

### ColorType - Color 类

**功能概述**：支持链式调用的颜色实例，提供丰富的颜色操作方法。

**文档链接**：[colorType.md](colorType.md)

---

### OCR - 光学字符识别

**功能概述**：提供文字识别功能，支持从图片中提取文字。

**文档链接**：[ocr.md](ocr.md)

#### 主要函数

| 函数名 | 输入参数 | 返回值 | 简要描述 |
|--------|----------|--------|----------|
| ocr | image, options | Array | 识别图片中的文字 |
| detect | image, options | Array | 检测图片中的文字区域 |

---

### Barcode - 条码识别

**功能概述**：提供条形码识别功能。

**文档链接**：[barcode.md](barcode.md)

---

### QRCode - 二维码识别

**功能概述**：提供二维码识别和生成功能。

**文档链接**：[qrcode.md](qrcode.md)

---

## 网络模块

### HTTP - HTTP请求

**功能概述**：提供 HTTP 请求功能，支持 GET、POST 等请求方法。

**文档链接**：[http.md](http.md)

#### 主要函数

| 函数名 | 输入参数 | 返回值 | 简要描述 |
|--------|----------|--------|----------|
| get | url, options | HttpResponse | 发送 GET 请求 |
| post | url, data, options | HttpResponse | 发送 POST 请求 |
| postJson | url, data, options | HttpResponse | 发送 JSON 格式的 POST 请求 |
| postMultipart | url, files, options | HttpResponse | 发送 multipart 请求 |
| request | url, options | HttpResponse | 发送自定义请求 |

---

### Web - WebView操作

**功能概述**：提供 WebView 注入和客户端构建功能。

**文档链接**：[web.md](web.md)

---

### WebSocket - WebSocket连接

**功能概述**：提供 WebSocket 连接支持，实现实时双向通信。

**文档链接**：[webSocketType.md](webSocketType.md)

---

## 系统交互模块

### Device - 设备信息

**功能概述**：提供设备信息获取和硬件控制功能。

**文档链接**：[device.md](device.md)

#### 主要属性和函数

| 名称 | 类型 | 简要描述 |
|------|------|----------|
| width | number | 设备屏幕宽度 |
| height | number | 设备屏幕高度 |
| brand | string | 设备品牌 |
| model | string | 设备型号 |
| sdkInt | number | Android SDK 版本 |
| release | string | Android 系统版本 |
| getIMEI | - | 获取设备 IMEI |
| getAndroidId | - | 获取 Android ID |
| getBattery | - | 获取电量百分比 |
| isCharging | - | 判断是否正在充电 |
| vibrate | millis: number | 使设备振动 |
| wakeUp | - | 唤醒设备 |
| keepScreenOn | timeout | 保持屏幕常亮 |

---

### App - 应用操作

**功能概述**：提供应用启动、卸载、文件打开等功能。

**文档链接**：[app.md](app.md)

#### 主要函数

| 函数名 | 输入参数 | 返回值 | 简要描述 |
|--------|----------|--------|----------|
| launchApp | appName: string | boolean | 通过应用名称启动应用 |
| launch | packageName: string | boolean | 通过包名启动应用 |
| launchPackage | packageName: string | boolean | 通过包名启动应用 |
| getPackageName | appName: string | string | 获取应用包名 |
| getAppName | packageName: string | string | 获取应用名称 |
| openAppSetting | packageName: string | boolean | 打开应用设置页 |
| viewFile | path: string | void | 用其他应用查看文件 |
| uninstall | packageName: string | void | 卸载应用 |
| openUrl | url: string | void | 用浏览器打开网址 |
| sendEmail | options: Object | void | 发送邮件 |

---

### Files - 文件操作

**功能概述**：提供文件读写、复制、移动、删除等操作。

**文档链接**：[files.md](files.md)

#### 主要函数

| 函数名 | 输入参数 | 返回值 | 简要描述 |
|--------|----------|--------|----------|
| isFile | path: string | boolean | 判断是否为文件 |
| isDir | path: string | boolean | 判断是否为目录 |
| exists | path: string | boolean | 判断文件是否存在 |
| read | path, encoding | string | 读取文本文件 |
| write | path, text, encoding | void | 写入文本文件 |
| append | path, text, encoding | void | 追加文本到文件 |
| copy | fromPath, toPath | boolean | 复制文件 |
| move | fromPath, toPath | boolean | 移动文件 |
| remove | path: string | boolean | 删除文件 |
| listDir | path, filter | Array | 列出目录内容 |

---

### Keys - 按键模拟

**功能概述**：提供按键常量和按键模拟功能。

**文档链接**：[keys.md](keys.md)

#### 主要按键常量

| 名称 | 描述 |
|------|------|
| back | 返回键 |
| home | 主页键 |
| recents | 最近任务键 |
| menu | 菜单键 |
| volumeUp | 音量加键 |
| volumeDown | 音量减键 |
| power | 电源键 |

---

## 界面模块

### UI - 用户界面

**功能概述**：提供用户界面构建支持，支持 XML 布局和各种控件。

**文档链接**：[ui.md](ui.md)

#### 主要函数

| 函数名 | 输入参数 | 返回值 | 简要描述 |
|--------|----------|--------|----------|
| layout | xml | void | 设置界面布局 |
| inflate | xml, parent | View | 将 XML 渲染为视图对象 |
| findView | id: string | View | 根据 ID 查找视图 |
| finish | - | void | 结束当前界面 |
| post | callback, delay | void | 在 UI 线程执行回调 |
| run | callback | any | 在 UI 线程同步执行回调 |

#### 主要控件

| 控件名 | 描述 |
|--------|------|
| text | 文本控件 |
| button | 按钮控件 |
| input | 输入框控件 |
| img | 图片控件 |
| checkbox | 复选框控件 |
| switch | 开关控件 |
| vertical | 垂直布局 |
| horizontal | 水平布局 |
| frame | 帧布局 |
| linear | 线性布局 |

---

### Floaty - 悬浮窗

**功能概述**：提供悬浮窗创建和管理功能。

**文档链接**：[floaty.md](floaty.md)

#### 主要函数

| 函数名 | 输入参数 | 返回值 | 简要描述 |
|--------|----------|--------|----------|
| window | layout | FloatyWindow | 创建带控制按钮的悬浮窗 |
| rawWindow | layout | FloatyRawWindow | 创建原始悬浮窗 |
| closeAll | - | void | 关闭所有悬浮窗 |

---

### Dialogs - 对话框

**功能概述**：提供各种对话框，包括提示框、确认框、输入框、选择框等。

**文档链接**：[dialogs.md](dialogs.md)

#### 主要函数

| 函数名 | 输入参数 | 返回值 | 简要描述 |
|--------|----------|--------|----------|
| alert | title, content | void | 显示提示对话框 |
| confirm | title, content | boolean | 显示确认对话框 |
| rawInput | title, prefill | string | 显示输入对话框 |
| input | title, prefill | any | 显示输入对话框并计算结果 |
| select | title, items | number | 显示选择对话框 |
| singleChoice | title, items, index | number | 显示单选对话框 |
| multiChoice | title, items, indices | Array | 显示多选对话框 |
| build | properties | Dialog | 构建自定义对话框 |

---

## 多媒体模块

### Media - 媒体播放

**功能概述**：提供音频播放、录音等多媒体功能。

**文档链接**：[media.md](media.md)

---

### Sensors - 传感器

**功能概述**：提供设备传感器数据获取功能。

**文档链接**：[sensors.md](sensors.md)

#### 主要传感器类型

| 类型 | 描述 |
|------|------|
| ACCELEROMETER | 加速度传感器 |
| ORIENTATION | 方向传感器 |
| GYROSCOPE | 陀螺仪传感器 |
| MAGNETIC_FIELD | 磁场传感器 |
| LIGHT | 光线传感器 |
| PROXIMITY | 距离传感器 |

---

## 数据处理模块

### Storage - 本地存储

**功能概述**：提供简单的键值对本地存储功能。

**文档链接**：[storages.md](storages.md)

#### 主要函数

| 函数名 | 输入参数 | 返回值 | 简要描述 |
|--------|----------|--------|----------|
| create | name: string | Storage | 创建或获取存储实例 |
| remove | name: string | boolean | 删除存储 |

#### Storage 实例方法

| 方法名 | 输入参数 | 返回值 | 简要描述 |
|--------|----------|--------|----------|
| put | key, value | void | 存储键值对 |
| get | key, defaultValue | any | 获取存储的值 |
| remove | key: string | void | 删除指定键 |
| contains | key: string | boolean | 判断键是否存在 |
| clear | - | void | 清空所有存储 |

---

### Crypto - 加密

**功能概述**：提供对称加密、非对称加密、消息摘要等加密功能。

**文档链接**：[crypto.md](crypto.md)

#### 主要函数

| 函数名 | 输入参数 | 返回值 | 简要描述 |
|--------|----------|--------|----------|
| digest | message, algorithm | string | 计算消息摘要 |
| encrypt | data, key, transformation | string/bytes | 加密数据 |
| decrypt | data, key, transformation | string/bytes | 解密数据 |
| generateKeyPair | algorithm, length | CryptoKeyPair | 生成密钥对 |

---

### Base64 - Base64编解码

**功能概述**：提供 Base64 编码和解码功能。

**文档链接**：[base64.md](base64.md)

#### 主要函数

| 函数名 | 输入参数 | 返回值 | 简要描述 |
|--------|----------|--------|----------|
| encode | data: string/bytes | string | Base64 编码 |
| decode | data: string | bytes | Base64 解码 |

---

## 扩展模块

### Arrayx - Array扩展

**功能概述**：提供数组扩展方法，包括集合运算、去重等。

**文档链接**：[arrayx.md](arrayx.md)

#### 主要函数

| 函数名 | 输入参数 | 返回值 | 简要描述 |
|--------|----------|--------|----------|
| intersect | array | Array | 求交集 |
| union | array | Array | 求并集 |
| difference | array | Array | 求差集 |
| distinct | - | Array | 去重 |
| flatten | - | Array | 扁平化数组 |

---

### Numberx - Number扩展

**功能概述**：提供数字扩展方法。

**文档链接**：[numberx.md](numberx.md)

#### 主要函数

| 函数名 | 输入参数 | 返回值 | 简要描述 |
|--------|----------|--------|----------|
| clamp | min, max | number | 限制数值范围 |
| toFixedNum | digits | number | 保留指定小数位 |

---

### Mathx - Math扩展

**功能概述**：提供数学扩展方法，包括随机数、统计函数等。

**文档链接**：[mathx.md](mathx.md)

#### 主要函数

| 函数名 | 输入参数 | 返回值 | 简要描述 |
|--------|----------|--------|----------|
| randInt | min, max | number | 生成随机整数 |
| sum | array | number | 求和 |
| avg | array | number | 求平均值 |
| median | array | number | 求中位数 |
| variance | array | number | 求方差 |
| stddev | array | number | 求标准差 |

---

## 类型定义

AutoJs6 提供了丰富的类型定义文件，用于描述各种数据类型和接口：

| 类型文件 | 描述 |
|----------|------|
| [dataTypes.md](dataTypes.md) | 基本数据类型定义 |
| [uiSelectorType.md](uiSelectorType.md) | UiSelector 类型定义 |
| [uiObjectType.md](uiObjectType.md) | UiObject 类型定义 |
| [uiObjectCollectionType.md](uiObjectCollectionType.md) | UiObjectCollection 类型定义 |
| [uiObjectActionsType.md](uiObjectActionsType.md) | UiObjectActions 类型定义 |
| [httpResponseType.md](httpResponseType.md) | HTTP 响应类型定义 |
| [cryptoKeyType.md](cryptoKeyType.md) | 加密密钥类型定义 |
| [storageType.md](storageType.md) | 存储类型定义 |
| [versionType.md](versionType.md) | 版本类型定义 |

---

## 术语表和参考

### 术语表

**文档链接**：[glossaries.md](glossaries.md)

包含 AutoJs6 开发中常用的术语解释，如：
- 无障碍服务 (Accessibility Service)
- 控件层级 (View Hierarchy)
- 包名 (Package Name)
- 活动 (Activity)
- 意图 (Intent)

### 颜色参考表

**文档链接**：[colorTable.md](colorTable.md)

提供常用颜色名称与十六进制值的对照表。

### HTTP 参考

| 文档 | 描述 |
|------|------|
| [httpHeaderGlossary.md](httpHeaderGlossary.md) | HTTP 头部术语表 |
| [httpRequestMethodsGlossary.md](httpRequestMethodsGlossary.md) | HTTP 请求方法术语表 |
| [mimeTypeGlossary.md](mimeTypeGlossary.md) | MIME 类型术语表 |

### Android 参考

| 文档 | 描述 |
|------|------|
| [apiLevel.md](apiLevel.md) | Android API 级别参考 |
| [intentType.md](intentType.md) | Intent 类型定义 |

---

## 其他资源

- [更新日志](changelog.md) - AutoJs6 版本更新记录
- [常见问题](qa.md) - 常见问题解答
- [示例脚本](examples/) - 示例脚本目录
- [项目主页](https://github.com/SuperMonster003/AutoJs6) - GitHub 项目主页

---

> **提示**：点击各模块名称可跳转到详细文档页面。