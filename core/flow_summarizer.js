/**
 * 任务流程总结器
 * 分析任务执行历史，生成标准化流程
 */

var ModelClient = require('./model_client');
var MessageBuilder = require('./message_builder');
var summaryPrompts = require('../config/summary_prompts');
var logger = require('../utils/logger');

function FlowSummarizer(modelConfig) {
    // 模型配置
    this.modelConfig = modelConfig || {};
    this.lang = modelConfig.lang || 'cn';
    
    // 创建模型客户端（总结不需要 tools）
    this.modelClient = new ModelClient({
        baseUrl: modelConfig.baseUrl,
        modelName: modelConfig.modelName,
        apiKey: modelConfig.apiKey,
        maxTokens: 4000,  // 总结需要更多 token
        temperature: 0.3  // 稍高的温度增加创造性
    });
}

/**
 * 生成任务流程总结
 * @param {string} task - 任务描述
 * @param {Array} context - 对话历史
 * @param {string} lang - 语言 ('cn' 或 'en')，可选，默认使用构造时的配置
 * @returns {Object} 总结结果
 */
FlowSummarizer.prototype.summarize = function(task, context, lang) {
    var useLang = lang || this.lang;
    
    logger.info("开始生成任务流程总结...");
    logger.debug("任务: " + task);
    logger.debug("上下文长度: " + (context ? context.length : 0));
    
    try {
        // 1. 构建总结请求消息
        var summaryContext = this.buildSummaryContext(task, context, useLang);
        
        // 2. 调用模型生成总结（不使用 function call）
        var response = this.modelClient.request(summaryContext, false);
        
        // 3. 解析总结结果
        var summary = this.parseSummaryResponse(response);
        
        logger.info("任务流程总结完成: " + summary.validSteps + "/" + summary.totalSteps + " 有效步骤");
        
        return {
            success: true,
            summary: summary
        };
        
    } catch (e) {
        logger.error("生成总结失败: " + e);
        return {
            success: false,
            error: e.toString(),
            summary: this.getDefaultSummary()
        };
    }
};

/**
 * 构建总结请求的上下文
 * @param {string} task - 任务描述
 * @param {Array} context - 原始对话历史
 * @param {string} lang - 语言
 * @returns {Array} 总结请求上下文
 */
FlowSummarizer.prototype.buildSummaryContext = function(task, context, lang) {
    // 获取系统提示词
    var systemPrompt = summaryPrompts.getPrompt(lang);
    
    // 构建精简的对话历史
    var conversationHistory = this.extractConversationHistory(context);
    
    // 构建用户消息
    var userMessage = lang === 'cn'
        ? "请分析以下任务执行历史，生成流程总结：\n\n**任务描述**: " + task + "\n\n**执行历史**:\n" + conversationHistory
        : "Please analyze the following task execution history and generate a flow summary:\n\n**Task Description**: " + task + "\n\n**Execution History**:\n" + conversationHistory;
    
    return [
        MessageBuilder.createSystemMessage(systemPrompt),
        MessageBuilder.createUserMessage(userMessage)
    ];
};

/**
 * 提取对话历史（精简版）
 * @param {Array} context - 原始上下文
 * @returns {string} 精简的对话历史文本
 */
FlowSummarizer.prototype.extractConversationHistory = function(context) {
    if (!context || context.length === 0) {
        return "无执行历史";
    }
    
    var history = [];
    var stepNumber = 0;
    
    for (var i = 0; i < context.length; i++) {
        var msg = context[i];
        
        if (msg.role === 'assistant' && msg.tool_calls) {
            // 提取工具调用
            for (var j = 0; j < msg.tool_calls.length; j++) {
                var tc = msg.tool_calls[j];
                stepNumber++;
                var args = "";
                try {
                    args = typeof tc.function.arguments === 'string' 
                        ? tc.function.arguments 
                        : JSON.stringify(tc.function.arguments);
                } catch (e) {
                    args = String(tc.function.arguments);
                }
                history.push("[步骤 " + stepNumber + "] 调用工具: " + tc.function.name + ", 参数: " + args);
            }
        } else if (msg.role === 'tool') {
            // 提取工具结果
            try {
                var result = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
                var successStr = result.success ? "成功" : "失败";
                var messageStr = result.message || "";
                history.push("[工具结果] " + successStr + ": " + messageStr);
            } catch (e) {
                history.push("[工具结果] " + msg.content);
            }
        } else if (msg.role === 'user' && typeof msg.content === 'string') {
            // 提取用户消息（屏幕状态），截取前 300 字符
            var content = msg.content;
            if (content.length > 300) {
                content = content.substring(0, 300) + "...";
            }
            history.push("[屏幕状态] " + content);
        }
    }
    
    return history.join("\n");
};

/**
 * 解析总结响应
 * @param {Object} response - 模型响应
 * @returns {Object} 解析后的总结对象
 */
FlowSummarizer.prototype.parseSummaryResponse = function(response) {
    try {
        // 获取响应内容
        var content = response.rawContent || response.action || "";
        
        // 尝试提取 JSON
        var jsonStr = this.extractJson(content);
        
        if (jsonStr) {
            var summary = JSON.parse(jsonStr);
            
            // 验证必要字段
            return this.validateSummary(summary);
        }
    } catch (e) {
        logger.error("解析总结响应失败: " + e);
    }
    
    // 返回默认结构
    return this.getDefaultSummary();
};

/**
 * 从内容中提取 JSON
 * @param {string} content - 响应内容
 * @returns {string|null} JSON 字符串或 null
 */
FlowSummarizer.prototype.extractJson = function(content) {
    // 尝试多种方式提取 JSON
    
    // 方式1: 查找 ```json ... ``` 代码块
    var jsonBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
        return jsonBlockMatch[1].trim();
    }
    
    // 方式2: 查找 ``` ... ``` 代码块
    var codeBlockMatch = content.match(/```\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
        var blockContent = codeBlockMatch[1].trim();
        if (blockContent.startsWith('{')) {
            return blockContent;
        }
    }
    
    // 方式3: 查找最外层的 {...}
    var startIndex = content.indexOf('{');
    var endIndex = content.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        return content.substring(startIndex, endIndex + 1);
    }
    
    return null;
};

/**
 * 验证并补全总结对象
 * @param {Object} summary - 原始总结对象
 * @returns {Object} 验证后的总结对象
 */
FlowSummarizer.prototype.validateSummary = function(summary) {
    var result = {
        taskGoal: summary.taskGoal || "",
        success: summary.success === true,
        totalSteps: summary.totalSteps || 0,
        validSteps: summary.validSteps || 0,
        invalidSteps: summary.invalidSteps || 0,
        flowSummary: Array.isArray(summary.flowSummary) ? summary.flowSummary : [],
        keyDecisions: Array.isArray(summary.keyDecisions) ? summary.keyDecisions : [],
        standardFlow: summary.standardFlow || "",
        tips: Array.isArray(summary.tips) ? summary.tips : [],
        invalidStepAnalysis: Array.isArray(summary.invalidStepAnalysis) ? summary.invalidStepAnalysis : []
    };
    
    // 确保 totalSteps = validSteps + invalidSteps
    if (result.totalSteps === 0 && result.flowSummary.length > 0) {
        result.totalSteps = result.flowSummary.length;
    }
    
    // 计算有效/无效步骤数
    if (result.validSteps === 0 && result.invalidSteps === 0) {
        var valid = 0;
        var invalid = 0;
        for (var i = 0; i < result.flowSummary.length; i++) {
            if (result.flowSummary[i].isValid) {
                valid++;
            } else {
                invalid++;
            }
        }
        result.validSteps = valid;
        result.invalidSteps = invalid;
    }
    
    return result;
};

/**
 * 获取默认的总结结构
 * @returns {Object} 默认总结对象
 */
FlowSummarizer.prototype.getDefaultSummary = function() {
    return {
        taskGoal: "",
        success: false,
        totalSteps: 0,
        validSteps: 0,
        invalidSteps: 0,
        flowSummary: [],
        keyDecisions: [],
        standardFlow: "总结生成失败",
        tips: [],
        invalidStepAnalysis: []
    };
};

module.exports = FlowSummarizer;