/**
 * 应用检测模块
 * 检测当前运行的应用
 */

var AppInfo = require('../config/app_info');
var logger = require('../utils/logger');

var AppDetector = {};

/**
 * 获取当前应用名称
 * @returns {string} 应用名称,未识别则返回 "Unknown App"
 */
AppDetector.getCurrentApp = function () {
    try {
        // 获取当前包名
        var packageName = currentPackage();

        if (!packageName) {
            logger.warn("无法获取当前包名");
            return "Unknown App";
        }

        logger.debug("当前包名: " + packageName);

        // 使用 AppInfo 模块获取应用名称（优先动态获取，回退到静态映射表）
        var appName = AppInfo.getAppName(packageName);
        
        if (appName) {
            logger.debug("识别应用: " + appName);
            return appName;
        }

        // 未识别的应用,返回包名
        logger.debug("未识别的应用: " + packageName);
        return packageName;

    } catch (e) {
        logger.error("获取当前应用失败: " + e);
        return "Unknown App";
    }
};

/**
 * 获取当前应用的包名
 * @returns {string} 包名
 */
AppDetector.getCurrentPackage = function () {
    try {
        return currentPackage() || "";
    } catch (e) {
        logger.error("获取包名失败: " + e);
        return "";
    }
};

/**
 * 检查应用是否在运行
 * @param {string} appName - 应用名称或包名
 * @returns {boolean} 是否在运行
 */
AppDetector.isAppRunning = function (appName) {
    try {
        var currentPkg = AppDetector.getCurrentPackage();

        // 检查是否是包名
        if (currentPkg === appName) {
            return true;
        }

        // 使用 AppInfo 模块获取包名，检查是否是应用名称
        var packageName = AppInfo.getPackageName(appName);
        if (packageName && packageName === currentPkg) {
            return true;
        }

        return false;
    } catch (e) {
        logger.error("检查应用运行状态失败: " + e);
        return false;
    }
};

module.exports = AppDetector;
