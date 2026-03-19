/**
 * 时间延迟配置
 * 控制各种操作后的等待时间 (单位: 毫秒)
 * 从配置文件读取，支持默认值后备
 */

var storage = require('./storage');

// 默认延迟配置 (单位: 毫秒)
var DEFAULT_TIMING = {
    tapDelay: 500,
    doubleTapInterval: 150,
    doubleTapDelay: 500,
    longPressDelay: 500,
    swipeDelay: 500,
    backDelay: 500,
    homeDelay: 500,
    launchDelay: 2000,
    typeDelay: 300,
    clearDelay: 300,
    pressDelay: 500,
    pasteDelay: 300,
    inputClickDelay: 300,
    agentRestInterval: 1200
};

/**
 * 获取延迟配置
 * @returns {Object} 延迟配置对象
 */
function getTimingConfig() {
    var storageConfig = storage.getStorageConfig();
    
    // 尝试从配置文件读取
    if (storageConfig.useConfigFile && storage.configData && storage.configData.timing) {
        var configTiming = storage.configData.timing;
        return {
            tapDelay: configTiming.tapDelay || DEFAULT_TIMING.tapDelay,
            doubleTapInterval: configTiming.doubleTapInterval || DEFAULT_TIMING.doubleTapInterval,
            doubleTapDelay: configTiming.doubleTapDelay || DEFAULT_TIMING.doubleTapDelay,
            longPressDelay: configTiming.longPressDelay || DEFAULT_TIMING.longPressDelay,
            swipeDelay: configTiming.swipeDelay || DEFAULT_TIMING.swipeDelay,
            backDelay: configTiming.backDelay || DEFAULT_TIMING.backDelay,
            homeDelay: configTiming.homeDelay || DEFAULT_TIMING.homeDelay,
            launchDelay: configTiming.launchDelay || DEFAULT_TIMING.launchDelay,
            typeDelay: configTiming.typeDelay || DEFAULT_TIMING.typeDelay,
            clearDelay: configTiming.clearDelay || DEFAULT_TIMING.clearDelay,
            pressDelay: configTiming.pressDelay || DEFAULT_TIMING.pressDelay,
            pasteDelay: configTiming.pasteDelay || DEFAULT_TIMING.pasteDelay,
            inputClickDelay: configTiming.inputClickDelay || DEFAULT_TIMING.inputClickDelay,
            agentRestInterval: configTiming.agentRestInterval || DEFAULT_TIMING.agentRestInterval
        };
    }
    
    // 从内部存储读取
    return {
        tapDelay: storage.get("timing_tap_delay", DEFAULT_TIMING.tapDelay),
        doubleTapInterval: storage.get("timing_double_tap_interval", DEFAULT_TIMING.doubleTapInterval),
        doubleTapDelay: storage.get("timing_double_tap_delay", DEFAULT_TIMING.doubleTapDelay),
        longPressDelay: storage.get("timing_long_press_delay", DEFAULT_TIMING.longPressDelay),
        swipeDelay: storage.get("timing_swipe_delay", DEFAULT_TIMING.swipeDelay),
        backDelay: storage.get("timing_back_delay", DEFAULT_TIMING.backDelay),
        homeDelay: storage.get("timing_home_delay", DEFAULT_TIMING.homeDelay),
        launchDelay: storage.get("timing_launch_delay", DEFAULT_TIMING.launchDelay),
        typeDelay: storage.get("timing_type_delay", DEFAULT_TIMING.typeDelay),
        clearDelay: storage.get("timing_clear_delay", DEFAULT_TIMING.clearDelay),
        pressDelay: storage.get("timing_press_delay", DEFAULT_TIMING.pressDelay),
        pasteDelay: storage.get("timing_paste_delay", DEFAULT_TIMING.pasteDelay),
        inputClickDelay: storage.get("timing_input_click_delay", DEFAULT_TIMING.inputClickDelay),
        agentRestInterval: storage.get("timing_agent_rest_interval", DEFAULT_TIMING.agentRestInterval)
    };
}

/**
 * 保存延迟配置
 * @param {Object} timing - 延迟配置对象
 */
function setTimingConfig(timing) {
    var storageConfig = storage.getStorageConfig();
    
    // 保存到配置文件
    if (storageConfig.useConfigFile) {
        if (storage.configData === null) {
            storage.readConfigFile();
        }
        if (storage.configData) {
            storage.configData.timing = {
                tapDelay: timing.tapDelay,
                doubleTapInterval: timing.doubleTapInterval,
                doubleTapDelay: timing.doubleTapDelay,
                longPressDelay: timing.longPressDelay,
                swipeDelay: timing.swipeDelay,
                backDelay: timing.backDelay,
                homeDelay: timing.homeDelay,
                launchDelay: timing.launchDelay,
                typeDelay: timing.typeDelay,
                clearDelay: timing.clearDelay,
                pressDelay: timing.pressDelay,
                pasteDelay: timing.pasteDelay,
                inputClickDelay: timing.inputClickDelay,
                agentRestInterval: timing.agentRestInterval
            };
            storage.writeConfigFile();
        }
    }
    
    // 同时保存到内部存储
    storage.set("timing_tap_delay", timing.tapDelay);
    storage.set("timing_double_tap_interval", timing.doubleTapInterval);
    storage.set("timing_double_tap_delay", timing.doubleTapDelay);
    storage.set("timing_long_press_delay", timing.longPressDelay);
    storage.set("timing_swipe_delay", timing.swipeDelay);
    storage.set("timing_back_delay", timing.backDelay);
    storage.set("timing_home_delay", timing.homeDelay);
    storage.set("timing_launch_delay", timing.launchDelay);
    storage.set("timing_type_delay", timing.typeDelay);
    storage.set("timing_clear_delay", timing.clearDelay);
    storage.set("timing_press_delay", timing.pressDelay);
    storage.set("timing_paste_delay", timing.pasteDelay);
    storage.set("timing_input_click_delay", timing.inputClickDelay);
    storage.set("timing_agent_rest_interval", timing.agentRestInterval);
}

// 导出配置对象（兼容旧代码）和函数
var TIMING_CONFIG = {
    // 设备操作延迟（兼容旧接口，单位转换：毫秒 -> 秒）
    get device() {
        var config = getTimingConfig();
        return {
            default_tap_delay: config.tapDelay / 1000,
            default_double_tap_delay: config.doubleTapDelay / 1000,
            double_tap_interval: config.doubleTapInterval / 1000,
            default_long_press_delay: config.longPressDelay / 1000,
            default_swipe_delay: config.swipeDelay / 1000,
            default_back_delay: config.backDelay / 1000,
            default_home_delay: config.homeDelay / 1000,
            default_launch_delay: config.launchDelay / 1000,
            default_type_delay: config.typeDelay / 1000,
            default_clear_delay: config.clearDelay / 1000,
            screenshot_timeout: 10
        };
    },
    
    // Agent 延迟（兼容旧接口）
    get agent() {
        var config = getTimingConfig();
        return {
            step_delay: 0.5,
            max_wait_time: 30
        };
    }
};

module.exports = TIMING_CONFIG;
module.exports.getTimingConfig = getTimingConfig;
module.exports.setTimingConfig = setTimingConfig;
module.exports.DEFAULT_TIMING = DEFAULT_TIMING;