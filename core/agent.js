/**
 * Phone Agent 核心
 * 任务编排和执行控制
 */

var ModelClient = require('./model_client');
var MessageBuilder = require('./message_builder');
var ActionHandler = require('./action_handler');
var screenCapture = require('../accessibility/screen_capture');
var appDetector = require('../accessibility/app_detector');
var xmlParser = require('../accessibility/xml_parser');
var SYSTEM_PROMPTS = require('../config/system_prompt');
var logger = require('../utils/logger');

function PhoneAgent(modelConfig, agentConfig) {
    // 模型配置
    this.modelClient = new ModelClient(modelConfig);

    // Function Call 配置
    // 默认启用 function call 模式，可通过 modelConfig.useFunctionCall = false 禁用
    this.useFunctionCall = modelConfig.useFunctionCall !== false;

    // Agent 配置
    this.maxSteps = agentConfig.maxSteps || 100;
    this.verbose = agentConfig.verbose !== false;
    this.lang = agentConfig.lang || 'cn';
    this.systemPrompt = SYSTEM_PROMPTS[this.lang];
    
    // 屏幕解析模式: "screenshot"(截图) 或 "xml"(XML解析)
    // 默认为截图模式
    this.screenMode = agentConfig.screenMode || 'screenshot';

    // 动作处理器
    this.actionHandler = new ActionHandler();

    // 上下文和状态
    this.context = [];
    this.stepCount = 0;
    this.isRunning = false;
}

/**
 * 运行任务
 * @param {string} task - 任务描述
 * @param {Function} onStep - 步骤回调 (可选)
 * @returns {string} 最终消息
 */
PhoneAgent.prototype.run = function (task, onStep) {
    try {
        this.isRunning = true;
        this.context = [];
        this.stepCount = 0;

        logger.info("开始任务: " + task);

        // 第一步 (带用户任务)
        var result = this.executeStep(task, true);

        if (onStep) {
            onStep(result);
        }

        if (result.finished) {
            return result.message || "任务完成";
        }

        // 继续执行直到完成或达到最大步数
        while (this.stepCount < this.maxSteps && this.isRunning) {
            result = this.executeStep(null, false);

            if (onStep) {
                onStep(result);
            }

            if (result.finished) {
                return result.message || "任务完成";
            }
        }

        if (!this.isRunning) {
            return "任务已取消";
        }

        return "达到最大步数限制";

    } catch (e) {
        logger.error("任务执行失败: " + e);
        return "任务失败: " + e;
    } finally {
        this.isRunning = false;
    }
};

/**
 * 执行单步
 * @param {string} userPrompt - 用户提示 (仅第一步)
 * @param {boolean} isFirst - 是否第一步
 * @returns {Object} {success, finished, action, thinking, message}
 */
PhoneAgent.prototype.executeStep = function (userPrompt, isFirst) {
    try {
        this.stepCount++;
        logger.info("执行第 " + this.stepCount + " 步");

        // 1. 根据screenMode获取屏幕信息
        var screenshot = null;
        var uiDescription = null;

        // 获取屏幕尺寸 (无论哪种模式都需要)
        var screenWidth = device.width;
        var screenHeight = device.height;

        if (this.screenMode === 'xml') {
            // XML解析模式
            uiDescription = xmlParser.getUiDescription();
            logger.debug("使用XML解析模式, UI元素信息: " + (uiDescription ? uiDescription.substring(0, 100) + "..." : "获取失败"));
        } else {
            // 截图模式(默认)
            screenshot = screenCapture.captureScreen();
            if (!screenshot) {
                throw new Error("截图失败");
            }
            // 使用截图的尺寸
            screenWidth = screenshot.width;
            screenHeight = screenshot.height;
            logger.debug("使用截图模式, 屏幕尺寸: " + screenWidth + "x" + screenHeight);
        }

        // 2. 检测当前应用
        var currentApp = appDetector.getCurrentApp();
        logger.debug("当前应用: " + currentApp);

        // 4. 构建消息 (根据screenMode选择截图或XML)
        if (isFirst) {
            // 添加系统消息
            this.context.push(MessageBuilder.createSystemMessage(this.systemPrompt));

            // 添加用户消息 (根据screenMode选择)
            var screenInfo = MessageBuilder.buildScreenInfo(currentApp);
            var textContent = userPrompt + "\n\n** Screen Info **\n\n" + screenInfo;
            
            if (this.screenMode === 'xml') {
                textContent += "\n\n** UI Elements (XML) **\n\n" + uiDescription;
            }

            // 根据screenMode决定是否添加图片
            var imageData = (this.screenMode === 'xml') ? null : screenshot.base64Data;
            this.context.push(
                MessageBuilder.createUserMessage(textContent, imageData)
            );
        } else {
            // 添加屏幕信息 (根据screenMode选择)
            var screenInfo = MessageBuilder.buildScreenInfo(currentApp);
            var textContent = "** Screen Info **\n\n" + screenInfo;
            
            if (this.screenMode === 'xml') {
                textContent += "\n\n** UI Elements (XML) **\n\n" + uiDescription;
            }

            // 根据screenMode决定是否添加图片
            var imageData = (this.screenMode === 'xml') ? null : screenshot.base64Data;
            this.context.push(
                MessageBuilder.createUserMessage(textContent, imageData)
            );
        }

        // 5. 请求模型
        logger.info("💭 正在思考...");
        var response = this.modelClient.request(this.context, this.useFunctionCall);

        // 7. 移除图片节省空间
        this.context[this.context.length - 1] = MessageBuilder.removeImagesFromMessage(
            this.context[this.context.length - 1]
        );

        // 8. 处理响应 - 区分 Function Call 模式和文本模式
        var action;
        var actionResult;
        var finished = false;
        var thinking = response.thinking || "";

        if (this.useFunctionCall && response.toolCalls && response.toolCalls.length > 0) {
            // Function Call 模式
            logger.info("模型返回 " + response.toolCalls.length + " 个工具调用");

            // 解析工具调用
            var parsedCalls = this.modelClient.parseToolCall(response.toolCalls);

            // 构建助手消息（包含 tool_calls）
            this.context.push(this.buildToolCallsAssistantMessage(response.toolCalls));

            // 处理每个工具调用
            for (var i = 0; i < parsedCalls.length; i++) {
                var toolCall = parsedCalls[i];
                logger.info("执行工具: " + toolCall.name + ", 参数: " + JSON.stringify(toolCall.arguments));

                // 转换为 action 对象
                action = this.modelClient.convertToolCallToAction(toolCall);
                if (!action) {
                    logger.error("工具转换失败: " + toolCall.name);
                    continue;
                }

                // 执行动作
                actionResult = this.actionHandler.execute(
                    action,
                    screenWidth,
                    screenHeight
                );

                // 构建工具结果消息
                var toolResult = {
                    success: actionResult.success,
                    message: actionResult.message
                };
                this.context.push(this.buildToolResultMessage(toolCall.id, toolResult));

                // 检查是否完成
                if (actionResult.shouldFinish) {
                    finished = true;
                    break;
                }
            }

        } else {
            // 文本模式（传统模式或模型未返回 tool_calls）
            logger.info("模型响应: " + response.action);

            // 6. 解析动作
            action = ActionHandler.parseAction(response.action);

            // 8. 执行动作
            actionResult = this.actionHandler.execute(
                action,
                screenWidth,
                screenHeight
            );

            // 9. 添加助手响应到上下文
            this.context.push(
                MessageBuilder.createAssistantMessage(
                    "<tool_call>" + response.thinking + "经济技术开发区\n<answer>" + response.action + "</answer>"
                )
            );

            // 检查是否完成
            finished = actionResult.shouldFinish;
        }

        // 10. 检查是否完成
        if (finished && this.verbose) {
            logger.info("✅ 任务完成: " + (actionResult ? actionResult.message : ""));
        } else {
            sleep(1200);
            logger.info("休息一会: 1200ms");
        }

        return {
            success: actionResult ? actionResult.success : false,
            finished: finished,
            action: action,
            thinking: thinking,
            message: actionResult ? actionResult.message : "",
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
 * @param {Object} result - 执行结果 {success, message}
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

module.exports = PhoneAgent;