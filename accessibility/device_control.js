/**
 * 设备控制模块
 * 使用 AutoJS6 的无障碍服务进行设备操作
 */

var timing = require('../config/timing');
var AppInfo = require('../config/app_info');
var logger = require('../utils/logger');

var DeviceControl = {};

/**
 * 点击指定坐标
 * @param {number} x - X 坐标
 * @param {number} y - Y 坐标
 * @param {number} delay - 延迟时间(毫秒)
 */
DeviceControl.tap = function (x, y, delay) {
    var startTime = Date.now();
    var config = timing.getTimingConfig();
    if (delay === null || delay === undefined) {
        delay = config.tapDelay;
    }

    try {
        logger.debug("点击: (" + x + ", " + y + ")");
        var clickStartTime = Date.now();
        click(x, y);
        var clickElapsed = Date.now() - clickStartTime;
        sleep(delay);
        var totalElapsed = Date.now() - startTime;
        logger.debug("点击操作耗时: " + totalElapsed + "ms (click: " + clickElapsed + "ms, 延迟: " + delay + "ms)");
        return true;
    } catch (e) {
        var elapsed = Date.now() - startTime;
        logger.error("点击失败: " + e + " (耗时: " + elapsed + "ms)");
        return false;
    }
};

/**
 * 双击指定坐标
 * @param {number} x - X 坐标
 * @param {number} y - Y 坐标
 * @param {number} delay - 延迟时间(毫秒)
 */
DeviceControl.doubleTap = function (x, y, delay) {
    var startTime = Date.now();
    var config = timing.getTimingConfig();
    if (delay === null || delay === undefined) {
        delay = config.doubleTapDelay;
    }

    try {
        logger.debug("双击: (" + x + ", " + y + ")");
        var click1Start = Date.now();
        click(x, y);
        var click1Elapsed = Date.now() - click1Start;
        sleep(config.doubleTapInterval);
        var click2Start = Date.now();
        click(x, y);
        var click2Elapsed = Date.now() - click2Start;
        sleep(delay);
        var totalElapsed = Date.now() - startTime;
        logger.debug("双击操作耗时: " + totalElapsed + "ms (click1: " + click1Elapsed + "ms, click2: " + click2Elapsed + "ms)");
        return true;
    } catch (e) {
        var elapsed = Date.now() - startTime;
        logger.error("双击失败: " + e + " (耗时: " + elapsed + "ms)");
        return false;
    }
};

/**
 * 长按指定坐标
 * @param {number} x - X 坐标
 * @param {number} y - Y 坐标
 * @param {number} durationMs - 长按时长(毫秒)
 * @param {number} delay - 延迟时间(毫秒)
 */
DeviceControl.longPress = function (x, y, durationMs, delay) {
    var startTime = Date.now();
    var config = timing.getTimingConfig();
    if (durationMs === undefined) durationMs = 3000;
    if (delay === null || delay === undefined) {
        delay = config.longPressDelay;
    }

    try {
        logger.debug("长按: (" + x + ", " + y + "), 时长: " + durationMs + "ms");
        var pressStartTime = Date.now();
        press(x, y, durationMs);
        var pressElapsed = Date.now() - pressStartTime;
        sleep(delay);
        var totalElapsed = Date.now() - startTime;
        logger.debug("长按操作耗时: " + totalElapsed + "ms (press: " + pressElapsed + "ms, 延迟: " + delay + "ms)");
        return true;
    } catch (e) {
        var elapsed = Date.now() - startTime;
        logger.error("长按失败: " + e + " (耗时: " + elapsed + "ms)");
        return false;
    }
};

/**
 * 滑动操作
 * @param {number} x1 - 起点 X
 * @param {number} y1 - 起点 Y
 * @param {number} x2 - 终点 X
 * @param {number} y2 - 终点 Y
 * @param {number} durationMs - 滑动时长(毫秒)
 * @param {number} delay - 延迟时间(毫秒)
 */
DeviceControl.swipe = function (x1, y1, x2, y2, durationMs, delay) {
    var startTime = Date.now();
    var config = timing.getTimingConfig();
    if (delay === null || delay === undefined) {
        delay = config.swipeDelay;
    }

    if (durationMs === null || durationMs === undefined) {
        // 根据距离计算时长
        var distSq = Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2);
        durationMs = Math.floor(distSq / 1000);
        durationMs = Math.max(300, Math.min(durationMs, 800)); // 限制在 300-800ms
    }

    try {
        logger.debug("滑动: (" + x1 + ", " + y1 + ") -> (" + x2 + ", " + y2 + "), 时长: " + durationMs + "ms");
        var swipeStartTime = Date.now();
        swipe(x1, y1, x2, y2, durationMs);
        var swipeElapsed = Date.now() - swipeStartTime;
        sleep(delay);
        var totalElapsed = Date.now() - startTime;
        logger.debug("滑动操作耗时: " + totalElapsed + "ms (swipe: " + swipeElapsed + "ms, 延迟: " + delay + "ms)");
        return true;
    } catch (e) {
        var elapsed = Date.now() - startTime;
        logger.error("滑动失败: " + e + " (耗时: " + elapsed + "ms)");
        return false;
    }
};

/**
 * 按返回键
 * @param {number} delay - 延迟时间(毫秒)
 */
DeviceControl.pressBack = function (delay) {
    var startTime = Date.now();
    var config = timing.getTimingConfig();
    if (delay === null || delay === undefined) {
        delay = config.backDelay;
    }

    try {
        logger.debug("按返回键");
        var backStartTime = Date.now();
        back();
        var backElapsed = Date.now() - backStartTime;
        sleep(delay);
        var totalElapsed = Date.now() - startTime;
        logger.debug("返回键操作耗时: " + totalElapsed + "ms (back: " + backElapsed + "ms, 延迟: " + delay + "ms)");
        return true;
    } catch (e) {
        var elapsed = Date.now() - startTime;
        logger.error("返回键失败: " + e + " (耗时: " + elapsed + "ms)");
        return false;
    }
};

/**
 * 按主页键
 * @param {number} delay - 延迟时间(毫秒)
 */
DeviceControl.pressHome = function (delay) {
    var startTime = Date.now();
    var config = timing.getTimingConfig();
    if (delay === null || delay === undefined) {
        delay = config.homeDelay;
    }

    try {
        logger.debug("按主页键");
        var homeStartTime = Date.now();
        home();
        var homeElapsed = Date.now() - homeStartTime;
        sleep(delay);
        var totalElapsed = Date.now() - startTime;
        logger.debug("主页键操作耗时: " + totalElapsed + "ms (home: " + homeElapsed + "ms, 延迟: " + delay + "ms)");
        return true;
    } catch (e) {
        var elapsed = Date.now() - startTime;
        logger.error("主页键失败: " + e + " (耗时: " + elapsed + "ms)");
        return false;
    }
};

/**
 * 启动应用
 * @param {string} appName - 应用名称或包名
 * @param {number} delay - 延迟时间(毫秒)
 */
DeviceControl.launchApp = function (appName, delay) {
    var startTime = Date.now();
    var config = timing.getTimingConfig();
    if (delay === null || delay === undefined) {
        delay = config.launchDelay;
    }

    try {
        // 使用 AppInfo 模块获取包名（优先动态获取，回退到静态映射表）
        var packageName = AppInfo.getPackageName(appName);

        // 如果找不到包名，使用原始输入（可能是包名格式）
        if (!packageName) {
            packageName = appName;
        }

        logger.info("启动应用: " + appName + " (" + packageName + ")");

        var launchStartTime = Date.now();
        var success = app.launch(packageName);
        var launchElapsed = Date.now() - launchStartTime;

        if (success) {
            sleep(delay);
            var totalElapsed = Date.now() - startTime;
            logger.debug("启动应用耗时: " + totalElapsed + "ms (launch: " + launchElapsed + "ms, 延迟: " + delay + "ms)");
            return true;
        } else {
            var elapsed = Date.now() - startTime;
            logger.error("应用启动失败: " + appName + " (耗时: " + elapsed + "ms)");
            return false;
        }
    } catch (e) {
        var elapsed = Date.now() - startTime;
        logger.error("启动应用异常: " + e + " (耗时: " + elapsed + "ms)");
        return false;
    }
};

/**
 * 等待指定时间
 * @param {number} seconds - 等待秒数
 */
DeviceControl.wait = function (seconds) {
    var startTime = Date.now();
    logger.debug("等待 " + seconds + " 秒");
    sleep(seconds * 1000);
    var elapsed = Date.now() - startTime;
    logger.debug("等待操作耗时: " + elapsed + "ms");
};

module.exports = DeviceControl;