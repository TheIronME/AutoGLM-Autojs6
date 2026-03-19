/**
 * 本地存储封装
 * 支持两种存储方式：
 * 1. AutoJS6 内部 storages 模块
 * 2. config.json 文件
 */

var STORAGE_NAME = "autoglm_config";
var CONFIG_FILE = files.cwd() + "/config.json";

function Storage() {
    this.storage = storages.create(STORAGE_NAME);
    this.configData = null;
    this.useConfigFile = false;
}

/**
 * 读取 config.json 文件
 */
Storage.prototype.readConfigFile = function () {
    try {
        if (files.exists(CONFIG_FILE)) {
            var content = files.read(CONFIG_FILE);
            this.configData = JSON.parse(content);
            return this.configData;
        }
    } catch (e) {
        console.error("读取 config.json 失败: " + e);
    }
    return null;
};

/**
 * 写入 config.json 文件
 */
Storage.prototype.writeConfigFile = function () {
    try {
        files.write(CONFIG_FILE, JSON.stringify(this.configData, null, 4));
        return true;
    } catch (e) {
        console.error("写入 config.json 失败: " + e);
        return false;
    }
};

/**
 * 获取存储方式配置
 */
Storage.prototype.getStorageConfig = function () {
    // 首先尝试从 config.json 读取
    if (this.configData === null) {
        this.readConfigFile();
    }

    // 如果 config.json 存在且有 storage 配置
    if (this.configData && this.configData.storage) {
        this.useConfigFile = this.configData.storage.useConfigFile || false;
    } else {
        this.useConfigFile = this.get("use_config_file", false);
    }

    return {
        useConfigFile: this.useConfigFile
    };
};

/**
 * 设置存储方式配置
 */
Storage.prototype.setStorageConfig = function (config) {
    this.useConfigFile = config.useConfigFile;

    if (this.configData === null) {
        this.readConfigFile();
    }

    // 如果 config.json 存在，更新它
    if (this.configData) {
        this.configData.storage = {
            useConfigFile: config.useConfigFile
        };
        this.writeConfigFile();
    }

    // 同时保存到内部存储以保持一致
    this.set("use_config_file", config.useConfigFile);
};

/**
 * 获取配置值
 * @param {string} key - 配置键
 * @param {*} defaultValue - 默认值
 * @returns {*} 配置值
 */
Storage.prototype.get = function (key, defaultValue) {
    if (defaultValue === undefined) defaultValue = null;
    return this.storage.get(key) || defaultValue;
};

/**
 * 设置配置值
 * @param {string} key - 配置键
 * @param {*} value - 配置值
 */
Storage.prototype.set = function (key, value) {
    this.storage.put(key, value);
};

/**
 * 删除配置
 * @param {string} key - 配置键
 */
Storage.prototype.remove = function (key) {
    this.storage.remove(key);
};

/**
 * 清空所有配置
 */
Storage.prototype.clear = function () {
    this.storage.clear();
};

/**
 * 获取模型配置
 */
Storage.prototype.getModelConfig = function () {
    // 获取存储方式
    this.getStorageConfig();

    if (this.useConfigFile && this.configData && this.configData.model) {
        return {
            baseUrl: this.configData.model.baseUrl || "https://open.bigmodel.cn/api/paas/v4",
            modelName: this.configData.model.modelName || "autoglm-phone",
            apiKey: this.configData.model.apiKey || "EMPTY",
            lang: this.configData.model.lang || "cn"
        };
    }

    return {
        baseUrl: this.get("model_base_url", "https://open.bigmodel.cn/api/paas/v4"),
        modelName: this.get("model_name", "autoglm-phone"),
        apiKey: this.get("api_key", "EMPTY"),
        lang: this.get("lang", "cn")
    };
};

/**
 * 保存模型配置
 */
Storage.prototype.setModelConfig = function (config) {
    if (this.useConfigFile) {
        if (this.configData === null) {
            this.readConfigFile();
        }
        if (this.configData) {
            this.configData.model = {
                baseUrl: config.baseUrl,
                modelName: config.modelName,
                apiKey: config.apiKey,
                lang: config.lang
            };
            this.writeConfigFile();
        }
    }

    // 同时保存到内部存储
    this.set("model_base_url", config.baseUrl);
    this.set("model_name", config.modelName);
    this.set("api_key", config.apiKey);
    this.set("lang", config.lang);
};

/**
 * 获取 Agent 配置
 */
Storage.prototype.getAgentConfig = function () {
    // 获取存储方式
    this.getStorageConfig();

    if (this.useConfigFile && this.configData && this.configData.agent) {
        return {
            maxSteps: this.configData.agent.maxSteps || 100,
            verbose: this.configData.agent.verbose !== false,
            screenMode: this.configData.agent.screenMode || "screenshot"
        };
    }

    return {
        maxSteps: this.get("max_steps", 100),
        verbose: this.get("verbose", true),
        screenMode: this.get("screen_mode", "screenshot")
    };
};

/**
 * 保存 Agent 配置
 */
Storage.prototype.setAgentConfig = function (config) {
    if (this.useConfigFile) {
        if (this.configData === null) {
            this.readConfigFile();
        }
        if (this.configData) {
            this.configData.agent = {
                maxSteps: config.maxSteps,
                verbose: config.verbose,
                screenMode: config.screenMode
            };
            this.writeConfigFile();
        }
    }

    // 同时保存到内部存储
    this.set("max_steps", config.maxSteps);
    this.set("verbose", config.verbose);
    this.set("screen_mode", config.screenMode);
};

/**
 * 获取日志配置
 */
Storage.prototype.getLogConfig = function () {
    // 获取存储方式
    this.getStorageConfig();

    if (this.useConfigFile && this.configData && this.configData.log) {
        return {
            level: this.configData.log.level || "INFO"
        };
    }

    return {
        level: this.get("log_level", "INFO")
    };
};

/**
 * 保存日志配置
 */
Storage.prototype.setLogConfig = function (config) {
    if (this.useConfigFile) {
        if (this.configData === null) {
            this.readConfigFile();
        }
        if (this.configData) {
            this.configData.log = {
                level: config.level
            };
            this.writeConfigFile();
        }
    }

    // 同时保存到内部存储
    this.set("log_level", config.level);
};

// ==================== 流程历史存储功能 ====================

/**
 * 流程历史存储名称
 */
var FLOW_STORAGE_NAME = "autoglm_flow_history";

/**
 * 生成唯一 ID
 * @returns {string} 唯一 ID
 */
function generateFlowId() {
    var timestamp = Date.now();
    var random = Math.floor(Math.random() * 10000);
    return timestamp + "_" + random;
}

/**
 * 获取流程历史存储
 * @returns {Object} storages 对象
 */
function getFlowStorage() {
    return storages.create(FLOW_STORAGE_NAME);
}

/**
 * 保存流程总结
 * @param {string} task - 原始任务描述
 * @param {Object} summary - 总结对象
 * @returns {Object} 保存的流程记录
 */
Storage.prototype.saveFlowSummary = function(task, summary) {
    try {
        var flowStorage = getFlowStorage();
        var history = flowStorage.get("history") || [];
        
        var flowRecord = {
            id: generateFlowId(),
            task: task,
            summary: summary,
            createdAt: new Date().toISOString(),
            success: summary ? summary.success : false
        };
        
        // 添加到历史开头（最新的在前）
        history.unshift(flowRecord);
        
        // 限制历史记录数量（最多保存 50 条）
        if (history.length > 50) {
            history = history.slice(0, 50);
        }
        
        flowStorage.put("history", history);
        console.log("流程总结已保存, ID: " + flowRecord.id);
        
        return flowRecord;
    } catch (e) {
        console.error("保存流程总结失败: " + e);
        return null;
    }
};

/**
 * 获取所有流程历史
 * @returns {Array} 流程历史列表
 */
Storage.prototype.getFlowHistory = function() {
    try {
        var flowStorage = getFlowStorage();
        var history = flowStorage.get("history") || [];
        return history;
    } catch (e) {
        console.error("获取流程历史失败: " + e);
        return [];
    }
};

/**
 * 根据 ID 获取流程
 * @param {string} id - 流程 ID
 * @returns {Object|null} 流程记录或 null
 */
Storage.prototype.getFlowById = function(id) {
    try {
        var history = this.getFlowHistory();
        for (var i = 0; i < history.length; i++) {
            if (history[i].id === id) {
                return history[i];
            }
        }
        return null;
    } catch (e) {
        console.error("获取流程失败: " + e);
        return null;
    }
};

/**
 * 删除流程
 * @param {string} id - 流程 ID
 * @returns {boolean} 是否删除成功
 */
Storage.prototype.deleteFlow = function(id) {
    try {
        var flowStorage = getFlowStorage();
        var history = flowStorage.get("history") || [];
        
        var newHistory = [];
        for (var i = 0; i < history.length; i++) {
            if (history[i].id !== id) {
                newHistory.push(history[i]);
            }
        }
        
        flowStorage.put("history", newHistory);
        console.log("流程已删除, ID: " + id);
        return true;
    } catch (e) {
        console.error("删除流程失败: " + e);
        return false;
    }
};

/**
 * 清空流程历史
 * @returns {boolean} 是否清空成功
 */
Storage.prototype.clearFlowHistory = function() {
    try {
        var flowStorage = getFlowStorage();
        flowStorage.put("history", []);
        console.log("流程历史已清空");
        return true;
    } catch (e) {
        console.error("清空流程历史失败: " + e);
        return false;
    }
};

module.exports = new Storage();
