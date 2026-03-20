/**
 * HTTP 客户端模块
 * 封装 HTTP 请求功能，支持自动重试、错误分类、指数退避
 * 
 * 优化内容：
 * - 更精细的错误分类（网络错误、超时、服务器错误等）
 * - 完善的指数退避策略（带抖动和上限）
 * - 详细的错误日志和请求耗时统计
 * - 灵活的超时配置
 * - HTTP/2 连接问题处理
 */

var logger = require('./logger');

/**
 * 错误类型枚举
 */
var ErrorType = {
    NETWORK: 'NETWORK',           // 网络连接错误
    TIMEOUT: 'TIMEOUT',           // 超时错误
    SERVER: 'SERVER',             // 服务器错误 (5xx)
    CLIENT: 'CLIENT',             // 客户端错误 (4xx)
    SSL: 'SSL',                   // SSL/TLS 错误
    HTTP2: 'HTTP2',               // HTTP/2 协议错误
    UNKNOWN: 'UNKNOWN'            // 未知错误
};

/**
 * 错误分类配置
 * 包含错误类型、关键字匹配、是否可重试
 */
var ErrorClassification = {
    // 超时相关错误
    TIMEOUT: {
        keywords: [
            'sockettimeoutexception',
            'sockettimeout',
            'connecttimeout',
            'readtimeout',
            'writetimeout',
            'timeout'
        ],
        type: ErrorType.TIMEOUT,
        retryable: true
    },
    // 网络连接错误
    NETWORK: {
        keywords: [
            'interruptedioexception',
            'connection',
            'connectexception',
            'unknownhostexception',
            'networkunreachable',
            'eofexception',
            'reset',
            'refused',
            'broken pipe',
            'no route to host',
            'network is unreachable',
            'connection reset',
            'connection refused',
            'connection closed',
            'pipe broken'
        ],
        type: ErrorType.NETWORK,
        retryable: true
    },
    // SSL/TLS 错误
    SSL: {
        keywords: [
            'sslhandshakeexception',
            'sslexception',
            'sslexception',
            'certificate',
            'handshake failed',
            'tls'
        ],
        type: ErrorType.SSL,
        retryable: false  // SSL 错误通常需要配置修复，重试无意义
    },
    // HTTP/2 协议错误
    HTTP2: {
        keywords: [
            'http2',
            'http/2',
            'stream error',
            'protocol error',
            'frame size error',
            'flow control',
            'rst_stream',
            'goaway'
        ],
        type: ErrorType.HTTP2,
        retryable: true  // HTTP/2 错误通常可以通过新建连接解决
    }
};

/**
 * 默认配置
 */
var DefaultConfig = {
    // 超时配置（毫秒）
    timeout: {
        connect: 10000,      // 连接超时：10秒
        read: 60000,         // 读取超时：60秒
        write: 30000,        // 写入超时：30秒
        request: 90000      // 整体请求超时：90秒
    },
    // 重试配置
    retry: {
        maxRetries: 3,                    // 最大重试次数
        initialDelay: 1000,               // 初始重试延迟：1秒
        maxDelay: 30000,                  // 最大重试延迟：30秒
        multiplier: 2,                     // 退避乘数
        jitter: true,                      // 是否添加抖动
        jitterFactor: 0.3                  // 抖动因子（±30%）
    },
    // HTTP 状态码重试配置
    statusRetry: {
        // 5xx 服务器错误重试配置
        serverError: {
            retryable: [500, 502, 503, 504],  // 可重试的状态码
            maxRetries: 3                      // 额外重试次数
        },
        // 4xx 客户端错误（一般不重试，但 429 例外）
        clientError: {
            retryable: [429],  // 429 Too Many Requests 可重试
            maxRetries: 2
        }
    }
};

function HttpClient() {
    // 实例配置
    this.config = {
        timeout: Object.assign({}, DefaultConfig.timeout),
        retry: Object.assign({}, DefaultConfig.retry),
        statusRetry: Object.assign({}, DefaultConfig.statusRetry)
    };
    
    // 统计信息
    this.stats = {
        totalRequests: 0,
        successRequests: 0,
        failedRequests: 0,
        retriedRequests: 0,
        totalRetries: 0
    };
}

/**
 * 更新配置
 * @param {Object} config - 配置对象
 */
HttpClient.prototype.updateConfig = function (config) {
    if (config.timeout) {
        Object.assign(this.config.timeout, config.timeout);
    }
    if (config.retry) {
        Object.assign(this.config.retry, config.retry);
    }
    if (config.statusRetry) {
        Object.assign(this.config.statusRetry, config.statusRetry);
    }
};

/**
 * 获取当前配置
 * @returns {Object} 配置对象
 */
HttpClient.prototype.getConfig = function () {
    return this.config;
};

/**
 * 获取统计信息
 * @returns {Object} 统计信息
 */
HttpClient.prototype.getStats = function () {
    return this.stats;
};

/**
 * 重置统计信息
 */
HttpClient.prototype.resetStats = function () {
    this.stats = {
        totalRequests: 0,
        successRequests: 0,
        failedRequests: 0,
        retriedRequests: 0,
        totalRetries: 0
    };
};

/**
 * 分类错误
 * @param {Error|string} error - 错误对象或错误信息
 * @param {number} statusCode - HTTP 状态码（可选）
 * @returns {Object} 错误分类结果 {type, retryable, message}
 */
HttpClient.prototype._classifyError = function (error, statusCode) {
    var errorMsg = '';
    var errorStr = '';
    
    if (error) {
        if (typeof error === 'string') {
            errorMsg = error;
            errorStr = error.toLowerCase();
        } else if (error.message) {
            errorMsg = error.message;
            errorStr = error.message.toLowerCase();
        } else {
            errorMsg = error.toString();
            errorStr = errorMsg.toLowerCase();
        }
    }
    
    // 优先检查 HTTP 状态码
    if (statusCode) {
        if (statusCode >= 500 && statusCode < 600) {
            // 服务器错误
            var serverRetryable = this.config.statusRetry.serverError.retryable;
            var isRetryable = serverRetryable.indexOf(statusCode) !== -1;
            return {
                type: ErrorType.SERVER,
                retryable: isRetryable,
                message: 'HTTP ' + statusCode + ' 服务器错误',
                statusCode: statusCode,
                detail: errorMsg
            };
        } else if (statusCode >= 400 && statusCode < 500) {
            // 客户端错误
            var clientRetryable = this.config.statusRetry.clientError.retryable;
            var isRetryable = clientRetryable.indexOf(statusCode) !== -1;
            return {
                type: ErrorType.CLIENT,
                retryable: isRetryable,
                message: 'HTTP ' + statusCode + ' 客户端错误',
                statusCode: statusCode,
                detail: errorMsg
            };
        }
    }
    
    // 检查错误关键字分类
    for (var category in ErrorClassification) {
        var classification = ErrorClassification[category];
        for (var i = 0; i < classification.keywords.length; i++) {
            if (errorStr.indexOf(classification.keywords[i]) !== -1) {
                return {
                    type: classification.type,
                    retryable: classification.retryable,
                    message: this._getErrorMessage(classification.type, errorMsg),
                    detail: errorMsg
                };
            }
        }
    }
    
    // 未知错误
    return {
        type: ErrorType.UNKNOWN,
        retryable: false,
        message: errorMsg || '未知错误',
        detail: errorMsg
    };
};

/**
 * 获取友好的错误消息
 * @param {string} type - 错误类型
 * @param {string} detail - 详细错误信息
 * @returns {string} 友好的错误消息
 */
HttpClient.prototype._getErrorMessage = function (type, detail) {
    var messages = {};
    messages[ErrorType.TIMEOUT] = '请求超时';
    messages[ErrorType.NETWORK] = '网络连接错误';
    messages[ErrorType.SSL] = 'SSL/TLS 握手失败';
    messages[ErrorType.HTTP2] = 'HTTP/2 协议错误';
    messages[ErrorType.SERVER] = '服务器错误';
    messages[ErrorType.CLIENT] = '客户端请求错误';
    messages[ErrorType.UNKNOWN] = '未知错误';
    
    return messages[type] || detail;
};

/**
 * 判断错误是否可重试（兼容旧接口）
 * @param {Error|string} error - 错误对象或错误信息
 * @param {number} statusCode - HTTP 状态码（可选）
 * @returns {boolean} 是否可重试
 */
HttpClient.prototype._isRetryableError = function (error, statusCode) {
    var classification = this._classifyError(error, statusCode);
    return classification.retryable;
};

/**
 * 计算重试延迟（带指数退避和抖动）
 * @param {number} attempt - 当前尝试次数（从0开始）
 * @param {Object} retryConfig - 重试配置
 * @returns {number} 延迟时间（毫秒）
 */
HttpClient.prototype._calculateRetryDelay = function (attempt, retryConfig) {
    var config = retryConfig || this.config.retry;
    var baseDelay = config.initialDelay || 1000;
    var maxDelay = config.maxDelay || 30000;
    var multiplier = config.multiplier || 2;
    
    // 指数退避
    var delay = baseDelay * Math.pow(multiplier, attempt);
    
    // 限制最大延迟
    delay = Math.min(delay, maxDelay);
    
    // 添加抖动
    if (config.jitter !== false) {
        var jitterFactor = config.jitterFactor || 0.3;
        var jitter = delay * jitterFactor * (Math.random() * 2 - 1);
        delay = Math.max(0, delay + jitter);
    }
    
    return Math.floor(delay);
};

/**
 * 记录请求日志
 * @param {string} method - 请求方法
 * @param {string} url - 请求 URL
 * @param {number} attempt - 尝试次数
 * @param {number} maxAttempts - 最大尝试次数
 * @param {number} startTime - 开始时间
 */
HttpClient.prototype._logRequest = function (method, url, attempt, maxAttempts, startTime) {
    var elapsed = startTime ? ' (准备中)' : '';
    logger.debug(method + " " + url + " (尝试 " + (attempt + 1) + "/" + maxAttempts + ")" + elapsed);
};

/**
 * 记录响应日志
 * @param {string} method - 请求方法
 * @param {string} url - 请求 URL
 * @param {Object} result - 响应结果
 * @param {number} startTime - 开始时间
 */
HttpClient.prototype._logResponse = function (method, url, result, startTime) {
    var elapsed = Date.now() - startTime;
    var statusStr = result.success ? '成功' : '失败';
    var retryStr = result.retries > 0 ? ' (重试 ' + result.retries + ' 次)' : '';
    
    if (result.success) {
        logger.debug(method + " " + url + " " + statusStr + " - " + result.statusCode + " (" + elapsed + "ms)" + retryStr);
    } else {
        logger.error(method + " " + url + " " + statusStr + " - " + (result.statusCode || 'N/A') + " (" + elapsed + "ms)" + retryStr + ": " + result.message);
    }
};

/**
 * 记录重试日志
 * @param {string} method - 请求方法
 * @param {string} url - 请求 URL
 * @param {Object} errorInfo - 错误信息
 * @param {number} retryDelay - 重试延迟
 * @param {number} attempt - 当前尝试次数
 * @param {number} maxAttempts - 最大尝试次数
 */
HttpClient.prototype._logRetry = function (method, url, errorInfo, retryDelay, attempt, maxAttempts) {
    var typeStr = '[' + errorInfo.type + ']';
    logger.warn(method + " " + url + " " + typeStr + " " + errorInfo.message + "，" + retryDelay + "ms 后重试 (" + (attempt + 1) + "/" + maxAttempts + ")");
};

/**
 * 执行单次 POST 请求（内部方法）
 * @param {string} url - 请求 URL
 * @param {Object} data - 请求数据
 * @param {Object} options - 请求选项
 * @returns {Object} 响应对象
 */
HttpClient.prototype._doPostJson = function (url, data, options) {
    var headers = options.headers || {};
    headers['Content-Type'] = 'application/json';
    
    // 优先使用 options.timeout，其次使用配置的超时
    var timeout = options.timeout || this.config.timeout.request;
    
    var startTime = Date.now();
    try {
        var response = http.postJson(url, data, {
            headers: headers,
            timeout: timeout
        });
        
        var elapsed = Date.now() - startTime;
        
        if (response.statusCode >= 200 && response.statusCode < 300) {
            return {
                success: true,
                data: response.body.json(),
                statusCode: response.statusCode,
                elapsed: elapsed
            };
        } else {
            var errorInfo = this._classifyError(null, response.statusCode);
            return {
                success: false,
                error: errorInfo.message,
                message: errorInfo.message,
                type: errorInfo.type,
                retryable: errorInfo.retryable,
                statusCode: response.statusCode,
                elapsed: elapsed
            };
        }
    } catch (e) {
        var elapsed = Date.now() - startTime;
        var errorInfo = this._classifyError(e, null);
        return {
            success: false,
            error: e.toString(),
            message: errorInfo.message,
            type: errorInfo.type,
            retryable: errorInfo.retryable,
            detail: errorInfo.detail,
            elapsed: elapsed
        };
    }
};

/**
 * 发送 POST 请求 (JSON)，支持自动重试
 * @param {string} url - 请求 URL
 * @param {Object} data - 请求数据
 * @param {Object} options - 请求选项
 * @param {Object} options.headers - 请求头
 * @param {number} options.timeout - 请求超时（毫秒）
 * @param {number} options.maxRetries - 最大重试次数
 * @param {number} options.retryDelay - 初始重试延迟（毫秒）
 * @param {boolean} options.exponentialBackoff - 是否启用指数退避
 * @param {number} options.maxDelay - 最大重试延迟（毫秒）
 * @param {boolean} options.jitter - 是否添加抖动
 * @returns {Object} 响应对象 {success, data, error, message, type, retries, elapsed}
 */
HttpClient.prototype.postJson = function (url, data, options) {
    options = options || {};
    var self = this;
    
    // 更新统计
    this.stats.totalRequests++;
    
    // 合并重试配置
    var retryConfig = Object.assign({}, this.config.retry, {
        maxRetries: options.maxRetries !== undefined ? options.maxRetries : this.config.retry.maxRetries,
        initialDelay: options.retryDelay !== undefined ? options.retryDelay : this.config.retry.initialDelay,
        maxDelay: options.maxDelay !== undefined ? options.maxDelay : this.config.retry.maxDelay,
        jitter: options.jitter !== undefined ? options.jitter : this.config.retry.jitter
    });
    
    var maxAttempts = retryConfig.maxRetries;
    var lastError = null;
    var lastErrorInfo = null;
    var totalRetries = 0;
    var startTime = Date.now();
    
    for (var attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            this._logRequest('POST', url, attempt, maxAttempts, startTime);
            
            var result = this._doPostJson(url, data, options);
            
            if (result.success) {
                result.retries = totalRetries;
                this._logResponse('POST', url, result, startTime);
                
                // 更新统计
                this.stats.successRequests++;
                if (totalRetries > 0) {
                    this.stats.retriedRequests++;
                    this.stats.totalRetries += totalRetries;
                }
                
                return result;
            }
            
            // 请求失败
            lastError = result.error;
            lastErrorInfo = {
                type: result.type || ErrorType.UNKNOWN,
                message: result.message || result.error,
                retryable: result.retryable !== undefined ? result.retryable : false,
                detail: result.detail
            };
            
            // 判断是否可重试
            if (lastErrorInfo.retryable && attempt < maxAttempts - 1) {
                totalRetries++;
                var retryDelay = this._calculateRetryDelay(attempt, retryConfig);
                this._logRetry('POST', url, lastErrorInfo, retryDelay, attempt, maxAttempts);
                
                // 等待后重试
                sleep(retryDelay);
                continue;
            }
            
            // 不可重试或已达到最大重试次数
            result.retries = totalRetries;
            this._logResponse('POST', url, result, startTime);
            
            // 更新统计
            this.stats.failedRequests++;
            if (totalRetries > 0) {
                this.stats.retriedRequests++;
                this.stats.totalRetries += totalRetries;
            }
            
            return result;
            
        } catch (e) {
            lastError = e;
            lastErrorInfo = this._classifyError(e, null);
            
            logger.error("POST " + url + " 请求异常: " + e.toString());
            
            // 判断是否可重试
            if (lastErrorInfo.retryable && attempt < maxAttempts - 1) {
                totalRetries++;
                var retryDelay = this._calculateRetryDelay(attempt, retryConfig);
                this._logRetry('POST', url, lastErrorInfo, retryDelay, attempt, maxAttempts);
                
                // 等待后重试
                sleep(retryDelay);
                continue;
            }
            
            // 不可重试或已达到最大重试次数
            var elapsed = Date.now() - startTime;
            
            // 更新统计
            this.stats.failedRequests++;
            if (totalRetries > 0) {
                this.stats.retriedRequests++;
                this.stats.totalRetries += totalRetries;
            }
            
            return {
                success: false,
                error: e.toString(),
                message: lastErrorInfo.message,
                type: lastErrorInfo.type,
                detail: lastErrorInfo.detail,
                retries: totalRetries,
                elapsed: elapsed
            };
        }
    }
    
    // 所有重试都失败
    var elapsed = Date.now() - startTime;
    
    // 更新统计
    this.stats.failedRequests++;
    if (totalRetries > 0) {
        this.stats.retriedRequests++;
        this.stats.totalRetries += totalRetries;
    }
    
    return {
        success: false,
        error: lastError ? lastError.toString() : "达到最大重试次数",
        message: lastErrorInfo ? lastErrorInfo.message : "达到最大重试次数",
        type: lastErrorInfo ? lastErrorInfo.type : ErrorType.UNKNOWN,
        retries: totalRetries,
        elapsed: elapsed
    };
};

/**
 * 执行单次 GET 请求（内部方法）
 * @param {string} url - 请求 URL
 * @param {Object} options - 请求选项
 * @returns {Object} 响应对象
 */
HttpClient.prototype._doGet = function (url, options) {
    var headers = options.headers || {};
    var timeout = options.timeout || this.config.timeout.request;
    
    var startTime = Date.now();
    try {
        var response = http.get(url, {
            headers: headers,
            timeout: timeout
        });
        
        var elapsed = Date.now() - startTime;
        
        if (response.statusCode >= 200 && response.statusCode < 300) {
            return {
                success: true,
                data: response.body.string(),
                statusCode: response.statusCode,
                elapsed: elapsed
            };
        } else {
            var errorInfo = this._classifyError(null, response.statusCode);
            return {
                success: false,
                error: errorInfo.message,
                message: errorInfo.message,
                type: errorInfo.type,
                retryable: errorInfo.retryable,
                statusCode: response.statusCode,
                elapsed: elapsed
            };
        }
    } catch (e) {
        var elapsed = Date.now() - startTime;
        var errorInfo = this._classifyError(e, null);
        return {
            success: false,
            error: e.toString(),
            message: errorInfo.message,
            type: errorInfo.type,
            retryable: errorInfo.retryable,
            detail: errorInfo.detail,
            elapsed: elapsed
        };
    }
};

/**
 * 发送 GET 请求，支持自动重试
 * @param {string} url - 请求 URL
 * @param {Object} options - 请求选项
 * @returns {Object} 响应对象
 */
HttpClient.prototype.get = function (url, options) {
    options = options || {};
    var self = this;
    
    // 更新统计
    this.stats.totalRequests++;
    
    // 合并重试配置
    var retryConfig = Object.assign({}, this.config.retry, {
        maxRetries: options.maxRetries !== undefined ? options.maxRetries : this.config.retry.maxRetries,
        initialDelay: options.retryDelay !== undefined ? options.retryDelay : this.config.retry.initialDelay,
        maxDelay: options.maxDelay !== undefined ? options.maxDelay : this.config.retry.maxDelay,
        jitter: options.jitter !== undefined ? options.jitter : this.config.retry.jitter
    });
    
    var maxAttempts = retryConfig.maxRetries;
    var lastError = null;
    var lastErrorInfo = null;
    var totalRetries = 0;
    var startTime = Date.now();
    
    for (var attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            this._logRequest('GET', url, attempt, maxAttempts, startTime);
            
            var result = this._doGet(url, options);
            
            if (result.success) {
                result.retries = totalRetries;
                this._logResponse('GET', url, result, startTime);
                
                // 更新统计
                this.stats.successRequests++;
                if (totalRetries > 0) {
                    this.stats.retriedRequests++;
                    this.stats.totalRetries += totalRetries;
                }
                
                return result;
            }
            
            // 请求失败
            lastError = result.error;
            lastErrorInfo = {
                type: result.type || ErrorType.UNKNOWN,
                message: result.message || result.error,
                retryable: result.retryable !== undefined ? result.retryable : false,
                detail: result.detail
            };
            
            // 判断是否可重试
            if (lastErrorInfo.retryable && attempt < maxAttempts - 1) {
                totalRetries++;
                var retryDelay = this._calculateRetryDelay(attempt, retryConfig);
                this._logRetry('GET', url, lastErrorInfo, retryDelay, attempt, maxAttempts);
                
                // 等待后重试
                sleep(retryDelay);
                continue;
            }
            
            // 不可重试或已达到最大重试次数
            result.retries = totalRetries;
            this._logResponse('GET', url, result, startTime);
            
            // 更新统计
            this.stats.failedRequests++;
            if (totalRetries > 0) {
                this.stats.retriedRequests++;
                this.stats.totalRetries += totalRetries;
            }
            
            return result;
            
        } catch (e) {
            lastError = e;
            lastErrorInfo = this._classifyError(e, null);
            
            logger.error("GET " + url + " 请求异常: " + e.toString());
            
            // 判断是否可重试
            if (lastErrorInfo.retryable && attempt < maxAttempts - 1) {
                totalRetries++;
                var retryDelay = this._calculateRetryDelay(attempt, retryConfig);
                this._logRetry('GET', url, lastErrorInfo, retryDelay, attempt, maxAttempts);
                
                // 等待后重试
                sleep(retryDelay);
                continue;
            }
            
            // 不可重试或已达到最大重试次数
            var elapsed = Date.now() - startTime;
            
            // 更新统计
            this.stats.failedRequests++;
            if (totalRetries > 0) {
                this.stats.retriedRequests++;
                this.stats.totalRetries += totalRetries;
            }
            
            return {
                success: false,
                error: e.toString(),
                message: lastErrorInfo.message,
                type: lastErrorInfo.type,
                detail: lastErrorInfo.detail,
                retries: totalRetries,
                elapsed: elapsed
            };
        }
    }
    
    // 所有重试都失败
    var elapsed = Date.now() - startTime;
    
    // 更新统计
    this.stats.failedRequests++;
    if (totalRetries > 0) {
        this.stats.retriedRequests++;
        this.stats.totalRetries += totalRetries;
    }
    
    return {
        success: false,
        error: lastError ? lastError.toString() : "达到最大重试次数",
        message: lastErrorInfo ? lastErrorInfo.message : "达到最大重试次数",
        type: lastErrorInfo ? lastErrorInfo.type : ErrorType.UNKNOWN,
        retries: totalRetries,
        elapsed: elapsed
    };
};

/**
 * 发送请求（不重试），用于需要手动控制重试的场景
 * @param {string} method - 请求方法 (GET, POST 等)
 * @param {string} url - 请求 URL
 * @param {Object} data - 请求数据（仅 POST 等需要）
 * @param {Object} options - 请求选项
 * @returns {Object} 响应对象
 */
HttpClient.prototype.requestOnce = function (method, url, data, options) {
    options = options || {};
    var self = this;
    
    // 更新统计
    this.stats.totalRequests++;
    
    var startTime = Date.now();
    
    try {
        logger.debug(method + " " + url);
        
        var headers = options.headers || {};
        var timeout = options.timeout || this.config.timeout.request;
        
        var response;
        if (method.toUpperCase() === 'POST') {
            headers['Content-Type'] = 'application/json';
            response = http.postJson(url, data, {
                headers: headers,
                timeout: timeout
            });
        } else {
            response = http.get(url, {
                headers: headers,
                timeout: timeout
            });
        }
        
        var elapsed = Date.now() - startTime;
        
        if (response.statusCode >= 200 && response.statusCode < 300) {
            // 更新统计
            this.stats.successRequests++;
            
            return {
                success: true,
                data: method.toUpperCase() === 'POST' ? response.body.json() : response.body.string(),
                statusCode: response.statusCode,
                elapsed: elapsed
            };
        } else {
            var errorInfo = this._classifyError(null, response.statusCode);
            
            // 更新统计
            this.stats.failedRequests++;
            
            return {
                success: false,
                error: "HTTP " + response.statusCode,
                message: errorInfo.message,
                type: errorInfo.type,
                retryable: errorInfo.retryable,
                statusCode: response.statusCode,
                elapsed: elapsed
            };
        }
        
    } catch (e) {
        var elapsed = Date.now() - startTime;
        var errorInfo = this._classifyError(e, null);
        
        logger.error(method + " " + url + " 请求异常: " + e.toString());
        
        // 更新统计
        this.stats.failedRequests++;
        
        return {
            success: false,
            error: e.toString(),
            message: errorInfo.message,
            type: errorInfo.type,
            retryable: errorInfo.retryable,
            detail: errorInfo.detail,
            elapsed: elapsed
        };
    }
};

/**
 * 创建带有预配置选项的客户端实例
 * @param {Object} config - 配置选项
 * @returns {HttpClient} 新的客户端实例
 */
HttpClient.prototype.createClient = function (config) {
    var client = new HttpClient();
    if (config) {
        client.updateConfig(config);
    }
    return client;
};

// 导出错误类型枚举供外部使用
HttpClient.ErrorType = ErrorType;

module.exports = new HttpClient();