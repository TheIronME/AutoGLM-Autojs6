/**
 * 应用信息动态获取模块
 * 优先使用 app.getInstalledApps() API 动态获取已安装应用列表
 * 当 API 不可用或找不到时，回退到静态映射表 APP_PACKAGES
 */

var APP_PACKAGES = require('./apps');
var logger = require('../utils/logger');

var AppInfo = {};

/**
 * 已安装应用缓存
 * 结构: { appName: packageName, ... }
 */
var installedAppsCache = null;

/**
 * 缓存是否已初始化
 */
var cacheInitialized = false;

/**
 * 获取已安装应用列表（使用 app.getInstalledApps API）
 * @returns {Array|null} ApplicationInfo 数组，API 不可用时返回 null
 */
function getInstalledAppsList() {
    try {
        // 检查 API 是否可用
        if (typeof app !== 'undefined' && typeof app.getInstalledApps === 'function') {
            var apps = app.getInstalledApps();
            logger.debug("app.getInstalledApps() 返回 " + (apps ? apps.length : 0) + " 个应用");
            return apps;
        }
        logger.debug("app.getInstalledApps API 不可用");
        return null;
    } catch (e) {
        logger.warn("调用 app.getInstalledApps 失败: " + e);
        return null;
    }
}

/**
 * 构建已安装应用的名称到包名映射缓存
 * 从 ApplicationInfo 数组中提取应用名称和包名
 */
function buildInstalledAppsCache() {
    var apps = getInstalledAppsList();
    var cache = {};
    
    if (!apps || apps.length === 0) {
        logger.debug("无法获取已安装应用列表，将使用静态映射表");
        cacheInitialized = true;
        return;
    }
    
    // 遍历已安装应用，构建名称到包名的映射
    for (var i = 0; i < apps.length; i++) {
        var appInfo = apps[i];
        if (appInfo && appInfo.packageName) {
            var packageName = appInfo.packageName;
            
            // 尝试获取应用名称
            // ApplicationInfo 可能包含 name 或 label 属性
            var appName = appInfo.name || appInfo.label || null;
            
            if (appName) {
                // 添加原始名称映射
                cache[appName] = packageName;
                
                // 添加小写版本用于模糊匹配
                cache[appName.toLowerCase()] = packageName;
            }
            
            // 从包名提取可能的应用名称（最后一部分）
            var parts = packageName.split('.');
            if (parts.length > 0) {
                var lastPart = parts[parts.length - 1];
                cache[lastPart] = packageName;
                cache[lastPart.toLowerCase()] = packageName;
            }
        }
    }
    
    installedAppsCache = cache;
    cacheInitialized = true;
    logger.debug("已构建应用缓存，共 " + Object.keys(cache).length + " 条记录");
}

/**
 * 标准化应用名称（去除空格、转小写等）
 * @param {string} appName - 应用名称
 * @returns {string} 标准化后的名称
 */
function normalizeAppName(appName) {
    if (!appName) return '';
    // 去除首尾空格，转小写
    return appName.trim().toLowerCase();
}

/**
 * 根据应用名称获取包名
 * 优先使用 app.getInstalledApps() 动态获取
 * 找不到时回退到静态映射表 APP_PACKAGES
 * 
 * @param {string} appName - 应用名称（支持中英文名称、大小写模糊匹配）
 * @returns {string|null} 包名，找不到时返回 null
 */
AppInfo.getPackageName = function(appName) {
    if (!appName) {
        return null;
    }
    
    // 如果输入已经是包名格式（包含点号），直接返回
    if (appName.indexOf('.') !== -1 && appName.indexOf(' ') === -1) {
        logger.debug("输入已是包名格式: " + appName);
        return appName;
    }
    
    // 初始化缓存（延迟初始化）
    if (!cacheInitialized) {
        buildInstalledAppsCache();
    }
    
    // 1. 尝试精确匹配（原始名称）
    if (installedAppsCache && installedAppsCache[appName]) {
        logger.debug("从缓存精确匹配: " + appName + " -> " + installedAppsCache[appName]);
        return installedAppsCache[appName];
    }
    
    // 2. 尝试静态映射表精确匹配
    if (APP_PACKAGES[appName]) {
        logger.debug("从静态映射表精确匹配: " + appName + " -> " + APP_PACKAGES[appName]);
        return APP_PACKAGES[appName];
    }
    
    // 3. 尝试标准化名称匹配（小写、去空格）
    var normalizedName = normalizeAppName(appName);
    
    // 3.1 在缓存中查找
    if (installedAppsCache && installedAppsCache[normalizedName]) {
        logger.debug("从缓存标准化匹配: " + appName + " -> " + installedAppsCache[normalizedName]);
        return installedAppsCache[normalizedName];
    }
    
    // 3.2 在静态映射表中查找
    for (var name in APP_PACKAGES) {
        if (APP_PACKAGES.hasOwnProperty(name)) {
            if (normalizeAppName(name) === normalizedName) {
                logger.debug("从静态映射表标准化匹配: " + appName + " -> " + APP_PACKAGES[name]);
                return APP_PACKAGES[name];
            }
        }
    }
    
    // 4. 尝试模糊匹配（包含关系）
    // 4.1 在缓存中模糊匹配
    if (installedAppsCache) {
        for (var cachedName in installedAppsCache) {
            if (installedAppsCache.hasOwnProperty(cachedName)) {
                if (cachedName.toLowerCase().indexOf(normalizedName) !== -1 ||
                    normalizedName.indexOf(cachedName.toLowerCase()) !== -1) {
                    logger.debug("从缓存模糊匹配: " + appName + " -> " + installedAppsCache[cachedName]);
                    return installedAppsCache[cachedName];
                }
            }
        }
    }
    
    // 4.2 在静态映射表中模糊匹配
    for (var staticName in APP_PACKAGES) {
        if (APP_PACKAGES.hasOwnProperty(staticName)) {
            var staticNormalizedName = normalizeAppName(staticName);
            if (staticNormalizedName.indexOf(normalizedName) !== -1 ||
                normalizedName.indexOf(staticNormalizedName) !== -1) {
                logger.debug("从静态映射表模糊匹配: " + appName + " -> " + APP_PACKAGES[staticName]);
                return APP_PACKAGES[staticName];
            }
        }
    }
    
    logger.warn("未找到应用包名: " + appName);
    return null;
};

/**
 * 根据包名获取应用名称
 * 优先使用 app.getInstalledApps() 动态获取
 * 找不到时回退到静态映射表 APP_PACKAGES
 * 
 * @param {string} packageName - 应用包名
 * @returns {string|null} 应用名称，找不到时返回 null
 */
AppInfo.getAppName = function(packageName) {
    if (!packageName) {
        return null;
    }
    
    // 初始化缓存（延迟初始化）
    if (!cacheInitialized) {
        buildInstalledAppsCache();
    }
    
    // 1. 尝试从缓存中查找
    if (installedAppsCache) {
        for (var name in installedAppsCache) {
            if (installedAppsCache.hasOwnProperty(name)) {
                if (installedAppsCache[name] === packageName) {
                    // 返回原始名称（非小写版本）
                    if (name === name.toLowerCase() && name !== name.toUpperCase()) {
                        // 如果是小写版本，继续查找原始版本
                        continue;
                    }
                    logger.debug("从缓存找到应用名称: " + packageName + " -> " + name);
                    return name;
                }
            }
        }
    }
    
    // 2. 尝试从静态映射表中查找
    for (var appName in APP_PACKAGES) {
        if (APP_PACKAGES.hasOwnProperty(appName)) {
            if (APP_PACKAGES[appName] === packageName) {
                logger.debug("从静态映射表找到应用名称: " + packageName + " -> " + appName);
                return appName;
            }
        }
    }
    
    logger.debug("未找到应用名称: " + packageName);
    return null;
};

/**
 * 清除应用缓存（用于强制刷新）
 */
AppInfo.clearCache = function() {
    installedAppsCache = null;
    cacheInitialized = false;
    logger.debug("应用缓存已清除");
};

/**
 * 刷新应用缓存
 */
AppInfo.refreshCache = function() {
    AppInfo.clearCache();
    buildInstalledAppsCache();
};

/**
 * 获取所有已知的应用映射（合并动态和静态）
 * @returns {Object} 应用名称到包名的映射对象
 */
AppInfo.getAllApps = function() {
    // 初始化缓存
    if (!cacheInitialized) {
        buildInstalledAppsCache();
    }
    
    var result = {};
    
    // 先添加静态映射
    for (var name in APP_PACKAGES) {
        if (APP_PACKAGES.hasOwnProperty(name)) {
            result[name] = APP_PACKAGES[name];
        }
    }
    
    // 再添加动态映射（会覆盖同名的静态映射）
    if (installedAppsCache) {
        for (var cachedName in installedAppsCache) {
            if (installedAppsCache.hasOwnProperty(cachedName)) {
                result[cachedName] = installedAppsCache[cachedName];
            }
        }
    }
    
    return result;
};

module.exports = AppInfo;