/**
 * 模型客户端
 * 调用 OpenAI 兼容的 API 进行 AI 推理
 */

var httpClient = require('../utils/http_client');
var logger = require('../utils/logger');

/**
 * Function Call 工具定义
 * 符合 OpenAI API 的 tools 格式
 */
var FUNCTION_TOOLS = [
    {
        type: "function",
        function: {
            name: "do_launch",
            description: "启动指定的应用程序。【重要】这是启动应用的唯一方式，必须使用此工具来启动或切换应用。优先使用 package_name 参数（包名）以确保准确性。",
            parameters: {
                type: "object",
                properties: {
                    package_name: {
                        type: "string",
                        description: "应用的包名（优先使用），如 com.tencent.mm（微信）、com.ss.android.ugc.aweme（抖音）、com.jingdong.app.mall（京东）"
                    },
                    app_name: {
                        type: "string",
                        description: "应用的名称（当不知道包名时使用），如 微信、抖音、京东"
                    }
                },
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "do_tap",
            description: "在指定坐标位置执行点击操作。坐标使用相对值 (0-999)。",
            parameters: {
                type: "object",
                properties: {
                    coordinate: {
                        type: "array",
                        items: { type: "integer" },
                        description: "点击坐标 [x, y]，范围 0-999，如 [500, 300]"
                    }
                },
                required: ["coordinate"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "do_double_tap",
            description: "在指定坐标位置执行双击操作。坐标使用相对值 (0-999)。",
            parameters: {
                type: "object",
                properties: {
                    coordinate: {
                        type: "array",
                        items: { type: "integer" },
                        description: "双击坐标 [x, y]，范围 0-999"
                    }
                },
                required: ["coordinate"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "do_long_press",
            description: "在指定坐标位置执行长按操作。坐标使用相对值 (0-999)。",
            parameters: {
                type: "object",
                properties: {
                    coordinate: {
                        type: "array",
                        items: { type: "integer" },
                        description: "长按坐标 [x, y]，范围 0-999"
                    }
                },
                required: ["coordinate"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "do_type",
            description: "在当前输入框中输入文本内容。",
            parameters: {
                type: "object",
                properties: {
                    text: {
                        type: "string",
                        description: "要输入的文本内容"
                    }
                },
                required: ["text"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "do_type_name",
            description: "输入联系人姓名，用于搜索或选择联系人场景。",
            parameters: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                        description: "联系人姓名"
                    }
                },
                required: ["name"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "do_swipe",
            description: "执行滑动操作，从一个坐标滑动到另一个坐标。",
            parameters: {
                type: "object",
                properties: {
                    start_coordinate: {
                        type: "array",
                        items: { type: "integer" },
                        description: "起始坐标 [x, y]，范围 0-999"
                    },
                    end_coordinate: {
                        type: "array",
                        items: { type: "integer" },
                        description: "结束坐标 [x, y]，范围 0-999"
                    },
                    duration_ms: {
                        type: "integer",
                        description: "滑动时长（毫秒），范围 300-800ms。不提供时根据滑动距离自动计算。"
                    }
                },
                required: ["start_coordinate", "end_coordinate"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "do_back",
            description: "按下返回键，返回上一页面。",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "do_home",
            description: "按下 Home 键，返回主屏幕。",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "do_wait",
            description: "等待指定时间，用于页面加载或动画完成。",
            parameters: {
                type: "object",
                properties: {
                    duration_ms: {
                        type: "integer",
                        description: "等待时间（毫秒），默认 1000ms"
                    }
                },
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "do_takeover",
            description: "请求用户接管控制，用于无法自动完成的操作。",
            parameters: {
                type: "object",
                properties: {
                    message: {
                        type: "string",
                        description: "向用户说明需要接管的原因"
                    }
                },
                required: ["message"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "do_note",
            description: "记录当前状态或观察结果，不执行实际操作。",
            parameters: {
                type: "object",
                properties: {
                    message: {
                        type: "string",
                        description: "要记录的观察或状态信息"
                    }
                },
                required: ["message"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "do_call_api",
            description: "调用外部 API 接口。",
            parameters: {
                type: "object",
                properties: {
                    url: {
                        type: "string",
                        description: "API 接口 URL"
                    },
                    method: {
                        type: "string",
                        enum: ["GET", "POST", "PUT", "DELETE"],
                        description: "HTTP 请求方法"
                    },
                    body: {
                        type: "object",
                        description: "请求体数据"
                    }
                },
                required: ["url"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "do_interact",
            description: "与屏幕上的元素进行交互，支持多种交互类型。",
            parameters: {
                type: "object",
                properties: {
                    interaction_type: {
                        type: "string",
                        enum: ["tap", "double_tap", "long_press", "swipe"],
                        description: "交互类型"
                    },
                    coordinate: {
                        type: "array",
                        items: { type: "integer" },
                        description: "目标坐标 [x, y]"
                    },
                    text: {
                        type: "string",
                        description: "输入文本（当交互类型需要时）"
                    }
                },
                required: ["interaction_type"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "finish",
            description: "任务完成，结束执行流程。当用户任务已完成或无法继续时调用。",
            parameters: {
                type: "object",
                properties: {
                    message: {
                        type: "string",
                        description: "任务完成信息或失败原因"
                    }
                },
                required: ["message"]
            }
        }
    }
];

/**
 * 工具名称到 ActionHandler 方法名的映射
 * 注意：值必须与 action_handler.js 中 actionHandlers 的键完全一致
 */
var TOOL_ACTION_MAP = {
    "do_launch": "Launch",
    "do_tap": "Tap",
    "do_double_tap": "Double Tap",
    "do_long_press": "Long Press",
    "do_type": "Type",
    "do_type_name": "Type_Name",
    "do_swipe": "Swipe",
    "do_back": "Back",
    "do_home": "Home",
    "do_wait": "Wait",
    "do_takeover": "Take_over",
    "do_note": "Note",
    "do_call_api": "Call_API",
    "do_interact": "Interact",
    "finish": "finish"
};

function ModelClient(config) {
    this.baseUrl = config.baseUrl || "https://open.bigmodel.cn/api/paas/v4";
    this.modelName = config.modelName || "autoglm-phone";
    this.apiKey = config.apiKey || "EMPTY";
    this.maxTokens = config.maxTokens || 3000;
    this.temperature = config.temperature || 0.0;
    this.topP = config.topP || 0.85;
    this.frequencyPenalty = config.frequencyPenalty || 0.2;
    this.screenMode = config.screenMode || 'screenshot';
}

/**
 * 动态生成工具定义
 * 根据屏幕模式调整坐标描述
 * @returns {Array} 工具定义数组
 */
ModelClient.prototype.buildTools = function () {
    var self = this;
    var isXmlMode = this.screenMode === 'xml';
    
    // 坐标描述根据模式不同
    var coordDesc = isXmlMode
        ? "点击坐标 [x, y]，使用绝对像素值，如 [540, 1170]"
        : "点击坐标 [x, y]，范围 0-999，如 [500, 300]";
    
    var startCoordDesc = isXmlMode
        ? "起始坐标 [x, y]，使用绝对像素值"
        : "起始坐标 [x, y]，范围 0-999";
    
    var endCoordDesc = isXmlMode
        ? "结束坐标 [x, y]，使用绝对像素值"
        : "结束坐标 [x, y]，范围 0-999";
    
    // 返回完整的工具定义数组
    // 复制 FUNCTION_TOOLS 并替换坐标描述
    return FUNCTION_TOOLS.map(function(tool) {
        // 深拷贝工具对象
        var newTool = JSON.parse(JSON.stringify(tool));
        
        // 根据工具类型更新坐标描述
        if (newTool.function.name === 'do_tap' ||
            newTool.function.name === 'do_double_tap' ||
            newTool.function.name === 'do_long_press') {
            if (newTool.function.parameters.properties.coordinate) {
                newTool.function.parameters.properties.coordinate.description = coordDesc;
            }
        }
        
        if (newTool.function.name === 'do_swipe') {
            if (newTool.function.parameters.properties.start_coordinate) {
                newTool.function.parameters.properties.start_coordinate.description = startCoordDesc;
            }
            if (newTool.function.parameters.properties.end_coordinate) {
                newTool.function.parameters.properties.end_coordinate.description = endCoordDesc;
            }
        }
        
        if (newTool.function.name === 'do_interact') {
            if (newTool.function.parameters.properties.coordinate) {
                newTool.function.parameters.properties.coordinate.description = coordDesc;
            }
        }
        
        return newTool;
    });
};

/**
 * 设置屏幕模式
 * @param {string} mode - 屏幕模式 ('xml' 或 'screenshot')
 */
ModelClient.prototype.setScreenMode = function (mode) {
    this.screenMode = mode || 'screenshot';
};

/**
 * 发送请求到模型
 * @param {Array} messages - 消息列表
 * @param {boolean} useFunctionCall - 是否使用 function call 模式，默认 true
 * @returns {Object} 模型响应 {thinking, action, rawContent, toolCalls}
 */
ModelClient.prototype.request = function (messages, useFunctionCall) {
    try {
        logger.info("正在请求模型...");

        // 默认使用 function call 模式
        if (useFunctionCall === undefined || useFunctionCall === null) {
            useFunctionCall = true;
        }

        var url = this.baseUrl + "/chat/completions";

        var requestData = {
            model: this.modelName,
            messages: messages,
            max_tokens: this.maxTokens,
            temperature: this.temperature,
            top_p: this.topP,
            frequency_penalty: this.frequencyPenalty,
            stream: false
        };

        // 如果启用 function call，添加 tools 参数
        if (useFunctionCall) {
            requestData.tools = this.buildTools();
            requestData.tool_choice = "auto";
        }

        var response = httpClient.postJson(url, requestData, {
            headers: {
                'Authorization': "Bearer " + this.apiKey,
                'Content-Type': 'application/json'
            },
            timeout: 120000 // 120 秒超时
        });

        if (!response.success) {
            throw new Error("API 请求失败: " + response.error);
        }

        var data = response.data;

        if (!data.choices || data.choices.length === 0) {
            throw new Error("API 返回空响应");
        }

        var message = data.choices[0].message;
        var content = message.content || "";
        logger.debug("模型响应: " + content.substring(0, 100) + "...");

        // 检查是否有 tool_calls
        var toolCalls = null;
        if (useFunctionCall && message.tool_calls && message.tool_calls.length > 0) {
            toolCalls = message.tool_calls;
            logger.info("模型返回 " + toolCalls.length + " 个工具调用");
        }

        // 解析响应（兼容文本模式）
        var parsed = this.parseResponse(content);

        return {
            thinking: parsed.thinking,
            action: parsed.action,
            rawContent: content,
            toolCalls: toolCalls
        };

    } catch (e) {
        logger.error("模型请求失败: " + e);
        throw e;
    }
};

/**
 * 解析模型响应
 * @param {string} content - 原始响应内容
 * @returns {Object} {thinking, action}
 */
ModelClient.prototype.parseResponse = function (content) {
    try {
        // 规则1: 如果包含 'finish(message=', 之前是 thinking, 之后是 action
        if (content.indexOf('finish(message=') !== -1) {
            var finishIndex = content.indexOf('finish(message=');
            return {
                thinking: content.substring(0, finishIndex).trim(),
                action: content.substring(finishIndex).trim()
            };
        }

        // 规则2: 如果包含 <think> 和 <answer> 标签
        var thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
        var answerMatch = content.match(/<answer>([\s\S]*?)<\/answer>/);

        if (thinkMatch && answerMatch) {
            return {
                thinking: thinkMatch[1].trim(),
                action: answerMatch[1].trim()
            };
        }

        // 规则3: 如果包含 'do(' 或 'finish(', 之前是 thinking
        var doIndex = content.indexOf('do(');
        var finishIndex2 = content.indexOf('finish(');

        if (doIndex !== -1) {
            return {
                thinking: content.substring(0, doIndex).trim(),
                action: content.substring(doIndex).trim()
            };
        }

        if (finishIndex2 !== -1) {
            return {
                thinking: content.substring(0, finishIndex2).trim(),
                action: content.substring(finishIndex2).trim()
            };
        }

        // 规则4: 默认情况,整个内容作为 action
        return {
            thinking: "",
            action: content.trim()
        };

    } catch (e) {
        logger.error("解析响应失败: " + e);
        return {
            thinking: "",
            action: content
        };
    }
};

/**
 * 解析模型返回的 tool_calls
 * @param {Array} toolCalls - 模型返回的 tool_calls 数组
 * @returns {Array} 解析后的工具调用列表 [{name, arguments}]
 */
ModelClient.prototype.parseToolCall = function (toolCalls) {
    if (!toolCalls || !Array.isArray(toolCalls)) {
        return [];
    }

    var parsedCalls = [];

    for (var i = 0; i < toolCalls.length; i++) {
        var toolCall = toolCalls[i];

        // 检查是否是 function 类型的工具调用
        if (toolCall.type !== "function" || !toolCall.function) {
            logger.warn("跳过非 function 类型的工具调用: " + JSON.stringify(toolCall));
            continue;
        }

        var functionName = toolCall.function.name;
        var argumentsStr = toolCall.function.arguments;

        // 解析参数 JSON
        var args = {};
        try {
            if (typeof argumentsStr === "string") {
                args = JSON.parse(argumentsStr);
            } else if (typeof argumentsStr === "object") {
                args = argumentsStr;
            }
        } catch (e) {
            logger.error("解析工具参数失败: " + e + ", 原始参数: " + argumentsStr);
            continue;
        }

        parsedCalls.push({
            id: toolCall.id,
            name: functionName,
            arguments: args
        });

        logger.debug("解析工具调用: " + functionName + ", 参数: " + JSON.stringify(args));
    }

    return parsedCalls;
};

/**
 * 将 tool_call 转换为 ActionHandler 可执行的格式
 * @param {Object} toolCall - 单个工具调用 {name, arguments}
 * @returns {Object} ActionHandler 可执行的 action 对象
 */
ModelClient.prototype.convertToolCallToAction = function (toolCall) {
    if (!toolCall || !toolCall.name) {
        return null;
    }

    var toolName = toolCall.name;
    var args = toolCall.arguments || {};

    // 获取对应的 ActionHandler 方法名
    var actionName = TOOL_ACTION_MAP[toolName];
    if (!actionName) {
        logger.error("未知的工具名称: " + toolName);
        return null;
    }

    // 构建 action 对象
    // 注意：
    // 1. 必须添加 _metadata 字段，action_handler.js 依赖此字段判断动作类型
    // 2. 参数必须直接放在 action 对象上，而不是 params 子对象
    //    因为 action_handler.js 的处理函数直接从 action 获取参数（如 action.app, action.element）
    var action = {
        _metadata: toolName === "finish" ? "finish" : "do",
        action: actionName
    };

    // 根据不同的工具类型转换参数
    // 注意：参数名必须与 action_handler.js 中期望的参数名一致
    switch (toolName) {
        case "do_launch":
            // action_handler 期望 app 参数（包名或应用名）
            action.app = args.package_name || args.app_name || null;
            break;

        case "do_tap":
        case "do_double_tap":
        case "do_long_press":
            // action_handler 期望 element 参数（坐标数组）
            action.element = args.coordinate || [0, 0];
            break;

        case "do_type":
            action.text = args.text || "";
            break;

        case "do_type_name":
            action.text = args.name || "";
            break;

        case "do_swipe":
            // action_handler 期望 start 和 end 参数
            action.start = args.start_coordinate || [0, 0];
            action.end = args.end_coordinate || [0, 0];
            action.duration_ms = args.duration_ms || null;
            break;

        case "do_back":
        case "do_home":
            // 无参数
            break;

        case "do_wait":
            // action_handler 期望 duration 参数（字符串格式如 "2 seconds"）
            var durationValue = args.duration_ms || 1000;
            var seconds = Math.floor(durationValue / 1000);
            action.duration = seconds + " seconds";
            break;

        case "do_takeover":
        case "do_note":
            action.message = args.message || "";
            break;

        case "do_call_api":
            // action_handler 期望 instruction 参数
            var instruction = args.url || "";
            if (args.method) {
                instruction = args.method + " " + instruction;
            }
            if (args.body) {
                instruction += " " + JSON.stringify(args.body);
            }
            action.instruction = instruction;
            break;

        case "do_interact":
            action.interaction_type = args.interaction_type || "tap";
            action.element = args.coordinate || null;
            action.text = args.text || null;
            break;

        case "finish":
            action.message = args.message || "";
            break;

        default:
            // 对于未知工具，将所有参数复制到 action
            for (var key in args) {
                if (args.hasOwnProperty(key)) {
                    action[key] = args[key];
                }
            }
    }

    logger.info("转换工具调用为 action: " + JSON.stringify(action));
    return action;
};

/**
 * 获取所有可用的工具定义
 * @returns {Array} 工具定义列表
 */
ModelClient.prototype.getTools = function () {
    return FUNCTION_TOOLS;
};

/**
 * 获取工具名称到 action 的映射表
 * @returns {Object} 映射表
 */
ModelClient.prototype.getToolActionMap = function () {
    return TOOL_ACTION_MAP;
};

module.exports = ModelClient;
