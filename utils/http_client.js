/**
 * HTTP 客户端模块
 * 封装 HTTP 请求功能，支持自动重试
 */

var logger = require('./logger');

function HttpClient() { }

/**
 * 判断错误是否可重试
 * @param {Error|string} error - 错误对象或错误信息
 * @param {number} statusCode - HTTP 状态码（可选）
 * @returns {boolean} 是否可重试
 */
HttpClient.prototype._isRetryableError = function (error, statusCode) {
    // 5xx 服务器错误可重试
    if (statusCode && statusCode >= 500 && statusCode < 600) {
        return true;
    }
    
    var errorMsg = typeof error === 'string' ? error : (error.message || error.toString());
    errorMsg = errorMsg.toLowerCase();
    
    // 可重试的错误类型关键字
    var retryableKeywords = [
        'interruptedioexception',   // 网络中断
        'sockettimeoutexception',   // 超时
        'sockettimeout',            // 超时
        'connection',               // 连接相关错误
        'connectexception',         // 连接异常
        'connecttimeout',           // 连接超时
        'unknownhostexception',     // 主机解析失败
        'networkunreachable',       // 网络不可达
        'eofexception',             // 连接意外关闭
        'sslhandshakeexception',    // SSL 握手失败
        'sslException',             // SSL 异常
        'timeout',                  // 超时
        'reset',                    // 连接重置
        'refused',                  // 连接被拒绝
        'broken pipe'               // 管道破裂
    ];
    
    for (var i = 0; i < retryableKeywords.length; i++) {
        if (errorMsg.indexOf(retryableKeywords[i]) !== -1) {
            return true;
        }
    }
    
    return false;
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
    
    var timeout = options.timeout || 60000; // 默认 60 秒超时
    
    var response = http.postJson(url, data, {
        headers: headers,
        timeout: timeout
    });
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
        return {
            success: true,
            data: response.body.json(),
            statusCode: response.statusCode
        };
    } else {
        return {
            success: false,
            error: "HTTP " + response.statusCode,
            statusCode: response.statusCode
        };
    }
};

/**
 * 发送 POST 请求 (JSON)，支持自动重试
 * @param {string} url - 请求 URL
 * @param {Object} data - 请求数据
 * @param {Object} options - 请求选项 (headers, timeout, maxRetries, retryDelay 等)
 * @returns {Object} 响应对象 {success, data, error, retries}
 */
HttpClient.prototype.postJson = function (url, data, options) {
    options = options || {};
    
    // 重试配置
    var maxRetries = options.maxRetries !== undefined ? options.maxRetries : 3;
    var initialRetryDelay = options.retryDelay || 1000; // 默认 1 秒
    var retryDelay = initialRetryDelay;
    var useExponentialBackoff = options.exponentialBackoff !== false; // 默认启用指数退避
    
    var lastError = null;
    var lastStatusCode = null;
    var totalRetries = 0;
    
    for (var attempt = 0; attempt < maxRetries; attempt++) {
        try {
            logger.debug("POST " + url + " (尝试 " + (attempt + 1) + "/" + maxRetries + ")");
            
            var result = this._doPostJson(url, data, options);
            
            if (result.success) {
                logger.debug("请求成功: " + result.statusCode);
                if (totalRetries > 0) {
                    result.retries = totalRetries;
                    logger.info("请求成功（经过 " + totalRetries + " 次重试）");
                }
                return result;
            }
            
            // HTTP 错误响应
            lastError = result.error;
            lastStatusCode = result.statusCode;
            
            // 判断是否可重试
            if (this._isRetryableError(lastError, lastStatusCode) && attempt < maxRetries - 1) {
                totalRetries++;
                logger.warn("请求失败 (" + result.error + ")，" + retryDelay + "ms 后重试 (" + totalRetries + "/" + maxRetries + ")");
                
                // 等待后重试
                sleep(retryDelay);
                
                // 指数退避
                if (useExponentialBackoff) {
                    retryDelay = retryDelay * 2;
                }
                continue;
            }
            
            // 不可重试或已达到最大重试次数
            logger.error("请求失败: " + result.error);
            result.retries = totalRetries;
            return result;
            
        } catch (e) {
            lastError = e;
            lastStatusCode = null;
            
            logger.error("HTTP 请求异常: " + e);
            
            // 判断是否可重试
            if (this._isRetryableError(e, null) && attempt < maxRetries - 1) {
                totalRetries++;
                logger.warn("请求异常 (" + e.toString() + ")，" + retryDelay + "ms 后重试 (" + totalRetries + "/" + maxRetries + ")");
                
                // 等待后重试
                sleep(retryDelay);
                
                // 指数退避
                if (useExponentialBackoff) {
                    retryDelay = retryDelay * 2;
                }
                continue;
            }
            
            // 不可重试或已达到最大重试次数
            return {
                success: false,
                error: e.toString(),
                retries: totalRetries
            };
        }
    }
    
    // 所有重试都失败
    return {
        success: false,
        error: lastError ? lastError.toString() : "达到最大重试次数",
        retries: totalRetries
    };
};

/**
 * 发送 GET 请求，支持自动重试
 * @param {string} url - 请求 URL
 * @param {Object} options - 请求选项 (headers, timeout, maxRetries, retryDelay 等)
 * @returns {Object} 响应对象
 */
HttpClient.prototype.get = function (url, options) {
    options = options || {};
    
    // 重试配置
    var maxRetries = options.maxRetries !== undefined ? options.maxRetries : 3;
    var initialRetryDelay = options.retryDelay || 1000;
    var retryDelay = initialRetryDelay;
    var useExponentialBackoff = options.exponentialBackoff !== false;
    
    var lastError = null;
    var lastStatusCode = null;
    var totalRetries = 0;
    
    for (var attempt = 0; attempt < maxRetries; attempt++) {
        try {
            logger.debug("GET " + url + " (尝试 " + (attempt + 1) + "/" + maxRetries + ")");
            
            var headers = options.headers || {};
            var timeout = options.timeout || 30000;
            
            var response = http.get(url, {
                headers: headers,
                timeout: timeout
            });
            
            if (response.statusCode >= 200 && response.statusCode < 300) {
                logger.debug("请求成功: " + response.statusCode);
                var result = {
                    success: true,
                    data: response.body.string(),
                    statusCode: response.statusCode
                };
                if (totalRetries > 0) {
                    result.retries = totalRetries;
                    logger.info("请求成功（经过 " + totalRetries + " 次重试）");
                }
                return result;
            } else {
                lastError = "HTTP " + response.statusCode;
                lastStatusCode = response.statusCode;
                
                if (this._isRetryableError(lastError, lastStatusCode) && attempt < maxRetries - 1) {
                    totalRetries++;
                    logger.warn("请求失败 (" + lastError + ")，" + retryDelay + "ms 后重试 (" + totalRetries + "/" + maxRetries + ")");
                    
                    sleep(retryDelay);
                    
                    if (useExponentialBackoff) {
                        retryDelay = retryDelay * 2;
                    }
                    continue;
                }
                
                logger.error("请求失败: " + response.statusCode);
                return {
                    success: false,
                    error: "HTTP " + response.statusCode,
                    statusCode: response.statusCode,
                    retries: totalRetries
                };
            }
            
        } catch (e) {
            lastError = e;
            lastStatusCode = null;
            
            logger.error("HTTP 请求异常: " + e);
            
            if (this._isRetryableError(e, null) && attempt < maxRetries - 1) {
                totalRetries++;
                logger.warn("请求异常 (" + e.toString() + ")，" + retryDelay + "ms 后重试 (" + totalRetries + "/" + maxRetries + ")");
                
                sleep(retryDelay);
                
                if (useExponentialBackoff) {
                    retryDelay = retryDelay * 2;
                }
                continue;
            }
            
            return {
                success: false,
                error: e.toString(),
                retries: totalRetries
            };
        }
    }
    
    return {
        success: false,
        error: lastError ? lastError.toString() : "达到最大重试次数",
        retries: totalRetries
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
    
    try {
        logger.debug(method + " " + url);
        
        var headers = options.headers || {};
        var timeout = options.timeout || 60000;
        
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
        
        if (response.statusCode >= 200 && response.statusCode < 300) {
            return {
                success: true,
                data: method.toUpperCase() === 'POST' ? response.body.json() : response.body.string(),
                statusCode: response.statusCode
            };
        } else {
            return {
                success: false,
                error: "HTTP " + response.statusCode,
                statusCode: response.statusCode
            };
        }
        
    } catch (e) {
        logger.error("HTTP 请求异常: " + e);
        return {
            success: false,
            error: e.toString()
        };
    }
};

module.exports = new HttpClient();