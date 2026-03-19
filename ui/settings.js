/**
 * 设置界面
 * 配置模型 API 和 Agent 参数
 */

"ui";

var storage = require(files.cwd() + '/config/storage');
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

                        <text text="休息间隔(ms)" textSize="14sp" marginTop="8" />
                        <input id="rest_interval"
                            inputType="number"
                            hint="每步操作后的休息时间，默认1200ms" />
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

    // 设置休息间隔
    ui.rest_interval.setText(String(agentConfig.restInterval || 1200));
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
        screenMode: ui.screen_mode_spinner.getSelectedItemPosition() === 0 ? "screenshot" : "xml",
        restInterval: parseInt(ui.rest_interval.text()) || 1200
    };

    storage.setStorageConfig(storageConfig);
    storage.setModelConfig(modelConfig);
    storage.setAgentConfig(agentConfig);

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
