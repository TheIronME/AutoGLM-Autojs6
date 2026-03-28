/**
 * Phone Agent 核心
 * 任务编排和执行控制
 */

var ModelClient = require('./model_client');
var MessageBuilder = require('./message_builder');
var ActionHandler = require('./action_handler');
var FlowSummarizer = require('./flow_summarizer');
var screenCapture = require('../accessibility/screen_capture');
var appDetector = require('../accessibility/app_detector');
var xmlParser = require('../accessibility/xml_parser');
var SYSTEM_PROMPTS = require('../config/system_prompt');
var timing = require('../config/timing');
var logger = require('../utils/logger');
var storage = require('../config/storage');

function PhoneAgent(modelConfig, agentConfig) {
    // Agent 配置
    this.maxSteps = agentConfig.maxSteps || 100;
    this.verbose = agentConfig.verbose !== false;
    this.lang = agentConfig.lang || 'cn';
    
    // 屏幕解析模式: "screenshot"(截图) 或 "xml"(XML解析)
    // 默认为截图模式
    this.screenMode = agentConfig.screenMode || 'screenshot';
    
    // 休息间隔（毫秒）- 从 timing 配置读取
    var timingConfig = timing.getTimingConfig();
    this.restInterval = timingConfig.agentRestInterval;

    // 模型配置 - 传入 screenMode
    modelConfig.screenMode = this.screenMode;
    this.modelClient = new ModelClient(modelConfig);
    
    // 保存模型配置（用于总结器）
    this.modelConfig = modelConfig;

    // Function Call 配置
    // 默认启用 function call 模式，可通过 modelConfig.useFunctionCall = false 禁用
    this.useFunctionCall = modelConfig.useFunctionCall !== false;
    
    // 系统提示词 - 根据屏幕模式和语言获取
    this.systemPrompt = SYSTEM_PROMPTS.getPrompt(this.screenMode, this.lang);

    // 动作处理器
    this.actionHandler = new ActionHandler(this.screenMode);

    // 上下文和状态
    this.context = [];
    this.stepCount = 0;
    this.isRunning = false;
    
    // 总结功能配置
    this.summaryConfig = agentConfig.summary || {};
    this.summaryEnabled = this.summaryConfig.enabled !== false;
    this.summaryTrigger = this.summaryConfig.trigger || 'on_success';
    
    // 流程总结器（延迟初始化）
    this.flowSummarizer = null;
}

/**
 * 捕获当前屏幕状态
 * @returns {Object} 屏幕状态数据
 */
PhoneAgent.prototype.captureScreenState = function() {
    var screenshot = null;
    var uiDescription = null;
    var screenWidth = device.width;
    var screenHeight = device.height;
    
    if (this.screenMode === 'xml') {
        // XML解析模式
        uiDescription = xmlParser.getUiDescription();
        logger.debug("使用XML解析模式, UI元素信息: " + (uiDescription ? uiDescription.substring(0, 10000) + "..." : "获取失败"));
    } else {
        // 截图模式(默认)
        screenshot = screenCapture.captureScreen();
        if (screenshot) {
            screenWidth = screenshot.width;
            screenHeight = screenshot.height;
        }
        logger.debug("使用截图模式, 屏幕尺寸: " + screenWidth + "x" + screenHeight);
    }
    
    var currentApp = appDetector.getCurrentApp();
    logger.debug("当前应用: " + currentApp);
    
    return {
        screenshot: screenshot,
        uiDescription: uiDescription,
        currentApp: currentApp,
        screenWidth: screenWidth,
        screenHeight: screenHeight
    };
};

/**
 * 构建用户消息
 * @param {string} prompt - 用户提示
 * @param {Object} screenData - 屏幕数据
 * @param {boolean} isFirst - 是否第一步
 * @returns {Object} 用户消息对象
 */
PhoneAgent.prototype.buildUserMessage = function(prompt, screenData, isFirst) {
    var screenInfo = MessageBuilder.buildScreenInfo(screenData.currentApp);
    var textContent = isFirst 
        ? prompt + "\n\n** Screen Info **\n\n" + screenInfo
        : "** Screen Info **\n\n" + screenInfo;

    if (this.screenMode === 'xml' && screenData.uiDescription) {
        textContent += "\n\n** UI Elements (XML) **\n\n" + screenData.uiDescription;
    }

    var imageData = (this.screenMode === 'xml') ? null 
        : (screenData.screenshot ? screenData.screenshot.base64Data : null);

    return MessageBuilder.createUserMessage(textContent, imageData);
};

/**
 * 构建增强的工具结果（包含屏幕状态）
 * @param {string} toolCallId - 工具调用 ID
 * @param {Object} actionResult - 动作执行结果
 * @param {Object} screenData - 屏幕数据
 * @returns {Object} 增强的工具结果
 */
PhoneAgent.prototype.buildEnhancedToolResult = function(toolCallId, actionResult, screenData) {
    var result = {
        success: actionResult.success,
        message: actionResult.message,
        currentApp: screenData.currentApp
    };

    // XML 模式：返回 UI 元素描述
    if (this.screenMode === 'xml' && screenData.uiDescription) {
        // 限制长度避免消息过长
        result.uiElements = screenData.uiDescription.length > 3000 
            ? screenData.uiDescription.substring(0, 3000) + "\n... (内容已截断)"
            : screenData.uiDescription;
    }

    // 截图模式：提示屏幕已更新
    if (this.screenMode === 'screenshot') {
        result.screenUpdated = true;
        result.screenWidth = screenData.screenWidth;
        result.screenHeight = screenData.screenHeight;
    }

    return result;
};

/**
 * 处理模型响应
 * @param {Object} response - 模型响应
 * @param {Object} screenData - 当前屏幕数据
 * @returns {Object} 处理结果 {success, finished, thinking, message, stepCount}
 */
PhoneAgent.prototype.handleModelResponse = function(response, screenData) {
    var handleStartTime = Date.now();
    var finished = false;
    var thinking = response.thinking || "";
    var lastResult = null;

    logger.debug("处理模型响应 - thinking长度: " + thinking.length + ", 有toolCalls: " + (response.toolCalls ? response.toolCalls.length : 0));

    if (this.useFunctionCall && response.toolCalls && response.toolCalls.length > 0) {
        // Function Call 模式
        logger.info("模型返回 " + response.toolCalls.length + " 个工具调用");

        // 解析工具调用
        var parseStartTime = Date.now();
        var parsedCalls = this.modelClient.parseToolCall(response.toolCalls);
        logger.debug("解析工具调用耗时: " + (Date.now() - parseStartTime) + "ms");

        // 构建助手消息（包含 tool_calls）
        this.context.push(this.buildToolCallsAssistantMessage(response.toolCalls));

        // 处理每个工具调用
        for (var i = 0; i < parsedCalls.length; i++) {
            var toolCall = parsedCalls[i];
            logger.info("执行工具: " + toolCall.name + ", 参数: " + JSON.stringify(toolCall.arguments));

            // 转换为 action 对象
            var convertStartTime = Date.now();
            var action = this.modelClient.convertToolCallToAction(toolCall);
            logger.debug("工具转换耗时: " + (Date.now() - convertStartTime) + "ms");

            if (!action) {
                logger.error("工具转换失败: " + toolCall.name);
                continue;
            }

            // 执行动作
            var execStartTime = Date.now();
            var actionResult = this.actionHandler.execute(
                action,
                screenData.screenWidth,
                screenData.screenHeight
            );
            var execElapsed = Date.now() - execStartTime;
            logger.debug("动作执行耗时: " + execElapsed + "ms - " + (actionResult.actionName || toolCall.name));

            lastResult = actionResult;

            // 如果任务未完成，等待界面稳定后获取屏幕状态
            if (!actionResult.shouldFinish) {
                sleep(this.restInterval);
                logger.debug("等待界面稳定: " + this.restInterval + "ms");
            }

            // 获取执行后的屏幕状态
            var postScreenStartTime = Date.now();
            var postScreenData = this.captureScreenState();
            logger.debug("后置屏幕捕获耗时: " + (Date.now() - postScreenStartTime) + "ms");

            // 构建包含屏幕状态的工具结果
            var toolResult = this.buildEnhancedToolResult(
                toolCall.id,
                actionResult,
                postScreenData
            );
            this.context.push(this.buildToolResultMessage(toolCall.id, toolResult));

            // 更新屏幕数据供下一个工具使用
            screenData = postScreenData;

            // 检查是否完成
            if (actionResult.shouldFinish) {
                finished = true;
                break;
            }
        }

    } else {
        // 文本模式（传统模式或模型未返回 tool_calls）
        logger.info("模型响应: " + response.action);

        // 解析动作
        var parseStartTime = Date.now();
        var action = ActionHandler.parseAction(response.action);
        logger.debug("解析动作耗时: " + (Date.now() - parseStartTime) + "ms");

        // 执行动作
        var execStartTime = Date.now();
        var actionResult = this.actionHandler.execute(
            action,
            screenData.screenWidth,
            screenData.screenHeight
        );
        var execElapsed = Date.now() - execStartTime;
        logger.debug("动作执行耗时: " + execElapsed + "ms");

        lastResult = actionResult;

        // 添加助手响应到上下文
        this.context.push(
            MessageBuilder.createAssistantMessage(
                "<tool_call>" + response.thinking + "\n<answer>" + response.action + "</answer>"
            )
        );

        // 如果任务未完成，获取执行后的屏幕状态并添加到上下文
        if (!actionResult.shouldFinish) {
            sleep(this.restInterval);
            logger.debug("等待界面稳定: " + this.restInterval + "ms");

            var postScreenData = this.captureScreenState();
            var screenInfo = MessageBuilder.buildScreenInfo(postScreenData.currentApp);
            var textContent = "** Screen Info **\n\n" + screenInfo;

            if (this.screenMode === 'xml' && postScreenData.uiDescription) {
                textContent += "\n\n** UI Elements (XML) **\n\n" + postScreenData.uiDescription;
            }

            var imageData = (this.screenMode === 'xml') ? null
                : (postScreenData.screenshot ? postScreenData.screenshot.base64Data : null);

            this.context.push(MessageBuilder.createUserMessage(textContent, imageData));

            // 更新屏幕数据
            screenData = postScreenData;
        }

        // 检查是否完成
        finished = actionResult.shouldFinish;
    }

    // 日志输出
    if (finished && this.verbose) {
        logger.info("✅ 任务完成: " + (lastResult ? lastResult.message : ""));
    }

    logger.debug("处理模型响应总耗时: " + (Date.now() - handleStartTime) + "ms");

    return {
        success: lastResult ? lastResult.success : false,
        finished: finished,
        thinking: thinking,
        message: lastResult ? lastResult.message : "",
        stepCount: this.stepCount
    };
};

/**
 * 运行任务 - 优化后的主循环
 * @param {string} task - 任务描述
 * @param {Function} onStep - 步骤回调 (可选)
 * @returns {Object} 结果对象 {message, summary, success, stepCount}
 */
PhoneAgent.prototype.run = function (task, onStep) {
    var taskResult = {
        message: "",
        summary: null,
        success: false,
        stepCount: 0
    };
    
    try {
        this.isRunning = true;
        this.context = [];
        this.stepCount = 0;

        logger.info("开始任务: " + task);

        // 1. 初始化：添加系统消息
        this.context.push(MessageBuilder.createSystemMessage(this.systemPrompt));

        // 2. 获取初始屏幕状态
        var screenData = this.captureScreenState();
        
        // 3. 构建初始用户消息
        var initialMessage = this.buildUserMessage(task, screenData, true);
        this.context.push(initialMessage);

        // 4. 主循环
        while (this.stepCount < this.maxSteps && this.isRunning) {
            var stepStartTime = Date.now();
            this.stepCount++;
            logger.info("执行第 " + this.stepCount + " 步");
            logger.debug("===== 步骤 " + this.stepCount + " 开始 =====");

            // 4.1 请求模型
            logger.info("💭 正在思考...");
            var llmStartTime = Date.now();
            var response = this.modelClient.request(this.context, this.useFunctionCall);
            var llmElapsed = Date.now() - llmStartTime;
            logger.debug("LLM请求耗时: " + llmElapsed + "ms");

            // 4.2 移除最后一条消息中的图片以节省空间
            var removeImageStartTime = Date.now();
            this.context[this.context.length - 1] = MessageBuilder.removeImagesFromMessage(
                this.context[this.context.length - 1]
            );
            logger.debug("移除图片耗时: " + (Date.now() - removeImageStartTime) + "ms");

            // 4.3 处理响应
            var actionStartTime = Date.now();
            var result = this.handleModelResponse(response, screenData);
            var actionElapsed = Date.now() - actionStartTime;
            logger.debug("动作处理耗时: " + actionElapsed + "ms");

            // 4.4 记录步骤总耗时
            var stepElapsed = Date.now() - stepStartTime;
            logger.debug("===== 步骤 " + this.stepCount + " 完成, 总耗时: " + stepElapsed + "ms (LLM: " + llmElapsed + "ms, 动作: " + actionElapsed + "ms) =====");

            // 4.5 回调通知
            if (onStep) {
                onStep(result);
            }

            // 4.6 检查是否完成
            if (result.finished) {
                taskResult.message = result.message || "任务完成";
                taskResult.success = result.success;
                taskResult.stepCount = this.stepCount;

                // 生成任务流程总结
                if (this.shouldGenerateSummary(result)) {
                    var summaryStartTime = Date.now();
                    taskResult.summary = this.generateSummary(task);
                    logger.debug("生成总结耗时: " + (Date.now() - summaryStartTime) + "ms");

                    // 保存流程总结到存储
                    if (taskResult.summary) {
                        var savedFlow = storage.saveFlowSummary(task, taskResult.summary);
                        if (savedFlow) {
                            logger.info("流程总结已保存, ID: " + savedFlow.id);
                        }
                    }
                }

                return taskResult;
            }

            // 4.7 更新屏幕状态用于下一轮
            var captureStartTime = Date.now();
            screenData = this.captureScreenState();
            logger.debug("屏幕捕获耗时: " + (Date.now() - captureStartTime) + "ms");

            // 4.8 构建下一轮的用户消息（包含最新屏幕状态）
            var buildMsgStartTime = Date.now();
            var nextMessage = this.buildUserMessage("", screenData, false);
            this.context.push(nextMessage);
            logger.debug("构建消息耗时: " + (Date.now() - buildMsgStartTime) + "ms");
        }

        if (!this.isRunning) {
            taskResult.message = "任务已取消";
            taskResult.stepCount = this.stepCount;
            return taskResult;
        }

        taskResult.message = "达到最大步数限制";
        taskResult.stepCount = this.stepCount;
        return taskResult;

    } catch (e) {
        logger.error("任务执行失败: " + e);
        taskResult.message = "任务失败: " + e;
        taskResult.stepCount = this.stepCount;
        return taskResult;
    } finally {
        this.isRunning = false;
    }
};

/**
 * 执行单步（保留用于兼容）
 * @param {string} userPrompt - 用户提示 (仅第一步)
 * @param {boolean} isFirst - 是否第一步
 * @returns {Object} {success, finished, action, thinking, message}
 */
PhoneAgent.prototype.executeStep = function (userPrompt, isFirst) {
    try {
        this.stepCount++;
        logger.info("执行第 " + this.stepCount + " 步");

        // 1. 获取屏幕状态
        var screenData = this.captureScreenState();

        // 2. 构建消息
        if (isFirst) {
            // 添加系统消息
            this.context.push(MessageBuilder.createSystemMessage(this.systemPrompt));
            // 添加用户消息
            this.context.push(this.buildUserMessage(userPrompt, screenData, true));
        } else {
            // 添加屏幕信息
            this.context.push(this.buildUserMessage("", screenData, false));
        }

        // 3. 请求模型
        logger.info("💭 正在思考...");
        var response = this.modelClient.request(this.context, this.useFunctionCall);

        // 4. 移除图片节省空间
        this.context[this.context.length - 1] = MessageBuilder.removeImagesFromMessage(
            this.context[this.context.length - 1]
        );

        // 5. 处理响应
        var result = this.handleModelResponse(response, screenData);

        return {
            success: result.success,
            finished: result.finished,
            action: null,
            thinking: result.thinking,
            message: result.message,
            stepCount: this.stepCount
        };

    } catch (e) {
        logger.error("步骤执行失败: " + e);
        return {
            success: false,
            finished: true,
            action: null,
            thinking: "",
            message: "执行失败: " + e,
            stepCount: this.stepCount
        };
    }
};

/**
 * 构建包含 tool_calls 的助手消息
 * 符合 OpenAI API 消息格式
 * @param {Array} toolCalls - 原始 tool_calls 数组
 * @returns {Object} 助手消息对象
 */
PhoneAgent.prototype.buildToolCallsAssistantMessage = function (toolCalls) {
    return {
        role: "assistant",
        content: null,
        tool_calls: toolCalls
    };
};

/**
 * 构建工具调用结果消息
 * 符合 OpenAI API 消息格式
 * @param {string} toolCallId - 工具调用 ID
 * @param {Object} result - 执行结果
 * @returns {Object} 工具结果消息对象
 */
PhoneAgent.prototype.buildToolResultMessage = function (toolCallId, result) {
    return {
        role: "tool",
        tool_call_id: toolCallId,
        content: JSON.stringify(result)
    };
};

/**
 * 停止任务
 */
PhoneAgent.prototype.stop = function () {
    logger.info("停止任务");
    this.isRunning = false;
};

/**
 * 重置状态
 */
PhoneAgent.prototype.reset = function () {
    this.context = [];
    this.stepCount = 0;
    this.isRunning = false;
};

/**
 * 获取上下文
 */
PhoneAgent.prototype.getContext = function () {
    return this.context.slice(); // 返回副本
};

/**
 * 获取步数
 */
PhoneAgent.prototype.getStepCount = function () {
    return this.stepCount;
};

/**
 * 判断是否需要生成总结
 * @param {Object} result - 任务执行结果
 * @returns {boolean} 是否需要生成总结
 */
PhoneAgent.prototype.shouldGenerateSummary = function(result) {
    if (!this.summaryEnabled) {
        return false;
    }
    
    if (this.summaryTrigger === 'on_success') {
        return result.success === true;
    } else if (this.summaryTrigger === 'on_complete') {
        return true;
    } else if (this.summaryTrigger === 'manual') {
        return false;
    }
    
    return false;
};

/**
 * 生成任务流程总结
 * @param {string} task - 任务描述
 * @returns {Object|null} 总结结果
 */
PhoneAgent.prototype.generateSummary = function(task) {
    try {
        logger.info("正在生成任务流程总结...");
        
        // 延迟初始化总结器
        if (!this.flowSummarizer) {
            this.flowSummarizer = new FlowSummarizer({
                apiKey: this.modelConfig.apiKey,
                baseUrl: this.modelConfig.baseUrl,
                modelName: this.modelConfig.modelName,
                lang: this.lang
            });
        }
        
        var result = this.flowSummarizer.summarize(task, this.context, this.lang);
        
        if (result.success) {
            logger.info("任务流程总结生成成功");
            return result.summary;
        } else {
            logger.error("任务流程总结生成失败: " + result.error);
            return null;
        }
    } catch (e) {
        logger.error("生成总结失败: " + e);
        return null;
    }
};

/**
 * 手动触发总结（用于 trigger='manual' 场景）
 * @param {string} task - 任务描述
 * @returns {Object|null} 总结结果
 */
PhoneAgent.prototype.summarize = function(task) {
    return this.generateSummary(task);
};

/**
 * 设置总结配置
 * @param {Object} config - 总结配置
 */
PhoneAgent.prototype.setSummaryConfig = function(config) {
    this.summaryConfig = config || {};
    this.summaryEnabled = this.summaryConfig.enabled !== false;
    this.summaryTrigger = this.summaryConfig.trigger || 'on_success';
};

/**
 * 获取总结配置
 * @returns {Object} 总结配置
 */
PhoneAgent.prototype.getSummaryConfig = function() {
    return {
        enabled: this.summaryEnabled,
        trigger: this.summaryTrigger
    };
};

module.exports = PhoneAgent;