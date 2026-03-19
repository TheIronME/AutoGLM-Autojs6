/**
 * 设置界面
 * 配置模型 API 和 Agent 参数
 */

"ui";

var storage = require(files.cwd() + '/config/storage');
var timing = require(files.cwd() + '/config/timing');
var logger = require(files.cwd() + '/utils/logger');

// UI 布局
ui.layout(
    <vertical>
        <appbar>
            <toolbar id="toolbar" title="设置" />
        </appbar>

        <ScrollView>
            <vertical padding="16">

                {/* 模型配置 */}
                <card w="*" h="auto" margin="8 16" cardCornerRadius="8dp" cardElevation="4dp">
                    <vertical padding="16">
                        <text text="模型配置" textSize="18sp" textStyle="bold" marginBottom="8" />

                        <text text="API 地址:" textSize="14sp" marginTop="8" />
                        <input id="base_url" hint="https://open.bigmodel.cn/api/paas/v4" singleLine="true" />

                        <text text="模型名称:" textSize="14sp" marginTop="8" />
                        <input id="model_name" hint="autoglm-phone" singleLine="true" />

                        <text text="API Key:" textSize="14sp" marginTop="8" />
                        <input id="api_key" hint="EMPTY" inputType="textPassword" singleLine="true" />

                        <text text="语言:" textSize="14sp" marginTop="8" />
                        <spinner id="lang_spinner" entries="中文|English" />
                    </vertical>
                </card>

                {/* 存储配置 */}
                <card w="*" h="auto" margin="8 16" cardCornerRadius="8dp" cardElevation="4dp">
                    <vertical padding="16">
                        <text text="存储配置" textSize="18sp" textStyle="bold" marginBottom="8" />

                        <text text="优先使用:" textSize="14sp" marginTop="8" />
                        <spinner id="storage_spinner" entries="内部存储(app)|配置文件(config.json)" />

                        <text text="配置文件路径: config.json" textSize="12sp" marginTop="8" textColor="#888888" />
                    </vertical>
                </card>

                {/* Agent 配置 */}
                <card w="*" h="auto" margin="8 16" cardCornerRadius="8dp" cardElevation="4dp">
                    <vertical padding="16">
                        <text text="Agent 配置" textSize="18sp" textStyle="bold" marginBottom="8" />

                        <text text="最大步数:" textSize="14sp" marginTop="8" />
                        <input id="max_steps" hint="100" inputType="number" singleLine="true" />

                        <text text="详细日志:" textSize="14sp" marginTop="8" />
                        <Switch id="verbose_switch" checked="true" />

                        <text text="屏幕模式:" textSize="14sp" marginTop="8" />
                        <spinner id="screen_mode_spinner" entries="截图模式(screenshot)|XML模式(xml)" />
                    </vertical>
                </card>

                {/* 延迟设置 */}
                <card w="*" h="auto" margin="8 16" cardCornerRadius="8dp" cardElevation="4dp">
                    <vertical padding="16">
                        <text text="延迟设置" textSize="18sp" textStyle="bold" marginBottom="8" />
                        <text text="单位: 毫秒(ms)" textSize="12sp" textColor="#888888" marginBottom="8" />

                        <text text="点击延迟:" textSize="14sp" marginTop="8" />
                        <input id="tap_delay" hint="500" inputType="number" singleLine="true" />

                        <text text="双击间隔:" textSize="14sp" marginTop="8" />
                        <input id="double_tap_interval" hint="150" inputType="number" singleLine="true" />

                        <text text="双击延迟:" textSize="14sp" marginTop="8" />
                        <input id="double_tap_delay" hint="500" inputType="number" singleLine="true" />

                        <text text="长按延迟:" textSize="14sp" marginTop="8" />
                        <input id="long_press_delay" hint="500" inputType="number" singleLine="true" />

                        <text text="滑动延迟:" textSize="14sp" marginTop="8" />
                        <input id="swipe_delay" hint="500" inputType="number" singleLine="true" />

                        <text text="返回键延迟:" textSize="14sp" marginTop="8" />
                        <input id="back_delay" hint="500" inputType="number" singleLine="true" />

                        <text text="主页键延迟:" textSize="14sp" marginTop="8" />
                        <input id="home_delay" hint="500" inputType="number" singleLine="true" />

                        <text text="启动应用延迟:" textSize="14sp" marginTop="8" />
                        <input id="launch_delay" hint="2000" inputType="number" singleLine="true" />

                        <text text="文本输入延迟:" textSize="14sp" marginTop="8" />
                        <input id="type_delay" hint="300" inputType="number" singleLine="true" />

                        <text text="清空文本延迟:" textSize="14sp" marginTop="8" />
                        <input id="clear_delay" hint="300" inputType="number" singleLine="true" />

                        <text text="按压延迟:" textSize="14sp" marginTop="8" />
                        <input id="press_delay" hint="500" inputType="number" singleLine="true" />

                        <text text="粘贴延迟:" textSize="14sp" marginTop="8" />
                        <input id="paste_delay" hint="300" inputType="number" singleLine="true" />

                        <text text="输入框点击延迟:" textSize="14sp" marginTop="8" />
                        <input id="input_click_delay" hint="300" inputType="number" singleLine="true" />

                        <text text="Agent休息间隔:" textSize="14sp" marginTop="8" />
                        <input id="agent_rest_interval" hint="1200" inputType="number" singleLine="true" />
                    </vertical>
                </card>

                {/* 日志配置 */}
                <card w="*" h="auto" margin="8 16" cardCornerRadius="8dp" cardElevation="4dp">
                    <vertical padding="16">
                        <text text="日志配置" textSize="18sp" textStyle="bold" marginBottom="8" />

                        <text text="日志等级:" textSize="14sp" marginTop="8" />
                        <spinner id="log_level_spinner" entries="DEBUG(调试)|INFO(信息)|WARN(警告)|ERROR(错误)" />
                    </vertical>
                </card>

                {/* 按钮 */}
                <horizontal margin="16">
                    <button id="save_btn" text="保存设置" w="*" style="Widget.AppCompat.Button.Colored" />
                    <button id="cancel_btn" text="取消" w="*" marginLeft="8" />
                </horizontal>

            </vertical>
        </ScrollView>
    </vertical>
);

// 加载配置
function loadConfig() {
    var storageConfig = storage.getStorageConfig();
    var modelConfig = storage.getModelConfig();
    var agentConfig = storage.getAgentConfig();
    var logConfig = storage.getLogConfig();
    var timingConfig = timing.getTimingConfig();

    // 设置存储方式
    ui.storage_spinner.setSelection(storageConfig.useConfigFile ? 1 : 0);

    ui.base_url.setText(modelConfig.baseUrl);
    ui.model_name.setText(modelConfig.modelName);
    ui.api_key.setText(modelConfig.apiKey);
    ui.lang_spinner.setSelection(modelConfig.lang === 'cn' ? 0 : 1);

    ui.max_steps.setText(agentConfig.maxSteps.toString());
    ui.verbose_switch.setChecked(agentConfig.verbose);

    // 设置屏幕模式
    var screenMode = agentConfig.screenMode || "screenshot";
    if (screenMode === "screenshot") {
        ui.screen_mode_spinner.setSelection(0);
    } else {
        ui.screen_mode_spinner.setSelection(1);
    }

    // 设置日志等级
    var logLevelMap = { "DEBUG": 0, "INFO": 1, "WARN": 2, "ERROR": 3 };
    var logLevel = logConfig.level || "INFO";
    ui.log_level_spinner.setSelection(logLevelMap[logLevel] !== undefined ? logLevelMap[logLevel] : 1);

    // 设置延迟配置
    ui.tap_delay.setText(String(timingConfig.tapDelay));
    ui.double_tap_interval.setText(String(timingConfig.doubleTapInterval));
    ui.double_tap_delay.setText(String(timingConfig.doubleTapDelay));
    ui.long_press_delay.setText(String(timingConfig.longPressDelay));
    ui.swipe_delay.setText(String(timingConfig.swipeDelay));
    ui.back_delay.setText(String(timingConfig.backDelay));
    ui.home_delay.setText(String(timingConfig.homeDelay));
    ui.launch_delay.setText(String(timingConfig.launchDelay));
    ui.type_delay.setText(String(timingConfig.typeDelay));
    ui.clear_delay.setText(String(timingConfig.clearDelay));
    ui.press_delay.setText(String(timingConfig.pressDelay));
    ui.paste_delay.setText(String(timingConfig.pasteDelay));
    ui.input_click_delay.setText(String(timingConfig.inputClickDelay));
    ui.agent_rest_interval.setText(String(timingConfig.agentRestInterval));
}

// 保存配置
function saveConfig() {
    var storageConfig = {
        useConfigFile: ui.storage_spinner.getSelectedItemPosition() === 1
    };

    var modelConfig = {
        baseUrl: ui.base_url.text(),
        modelName: ui.model_name.text(),
        apiKey: ui.api_key.text(),
        lang: ui.lang_spinner.getSelectedItemPosition() === 0 ? 'cn' : 'en'
    };

    var agentConfig = {
        maxSteps: parseInt(ui.max_steps.text()) || 100,
        verbose: ui.verbose_switch.isChecked(),
        screenMode: ui.screen_mode_spinner.getSelectedItemPosition() === 0 ? "screenshot" : "xml"
    };

    var logLevelMap = ["DEBUG", "INFO", "WARN", "ERROR"];
    var logConfig = {
        level: logLevelMap[ui.log_level_spinner.getSelectedItemPosition()] || "INFO"
    };

    // 延迟配置
    var timingConfig = {
        tapDelay: parseInt(ui.tap_delay.text()) || 500,
        doubleTapInterval: parseInt(ui.double_tap_interval.text()) || 150,
        doubleTapDelay: parseInt(ui.double_tap_delay.text()) || 500,
        longPressDelay: parseInt(ui.long_press_delay.text()) || 500,
        swipeDelay: parseInt(ui.swipe_delay.text()) || 500,
        backDelay: parseInt(ui.back_delay.text()) || 500,
        homeDelay: parseInt(ui.home_delay.text()) || 500,
        launchDelay: parseInt(ui.launch_delay.text()) || 2000,
        typeDelay: parseInt(ui.type_delay.text()) || 300,
        clearDelay: parseInt(ui.clear_delay.text()) || 300,
        pressDelay: parseInt(ui.press_delay.text()) || 500,
        pasteDelay: parseInt(ui.paste_delay.text()) || 300,
        inputClickDelay: parseInt(ui.input_click_delay.text()) || 300,
        agentRestInterval: parseInt(ui.agent_rest_interval.text()) || 1200
    };

    storage.setStorageConfig(storageConfig);
    storage.setModelConfig(modelConfig);
    storage.setAgentConfig(agentConfig);
    storage.setLogConfig(logConfig);
    timing.setTimingConfig(timingConfig);

    // 更新日志等级
    logger.setLevel(logConfig.level);

    toast("设置已保存");
    logger.info("配置已保存, 存储方式: " + (storageConfig.useConfigFile ? "config.json" : "内部存储"));
}

// 初始化
loadConfig();

// 事件监听
ui.save_btn.on("click", function () {
    saveConfig();
    ui.finish();
});

ui.cancel_btn.on("click", function () {
    ui.finish();
});

ui.toolbar.on("click", function () {
    ui.finish();
});