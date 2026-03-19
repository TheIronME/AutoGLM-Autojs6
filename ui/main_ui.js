/**
 * 主界面
 * 任务输入和执行控制
 */

"ui";

var PhoneAgent = require(files.cwd() + '/core/agent');
var storage = require(files.cwd() + '/config/storage');
var logger = require(files.cwd() + '/utils/logger');
var screenCapture = require(files.cwd() + '/accessibility/screen_capture');

// UI 布局
ui.layout(
    <vertical>
        <appbar>
            <toolbar id="toolbar" title="AutoGLM Phone Agent" />
        </appbar>

        <ScrollView>
            <vertical padding="16">

                {/* 任务输入 */}
                <card w="*" h="auto" margin="8 16" cardCornerRadius="8dp" cardElevation="4dp">
                    <vertical padding="16">
                        <text text="输入任务" textSize="18sp" textStyle="bold" />
                        <input id="task_input"
                            hint="例如: 打开微信并发送消息给张三"
                            minLines="3"
                            gravity="top" />
                        <horizontal marginTop="8">
                            <button id="run_btn" text="执行任务" layout_weight="1" style="Widget.AppCompat.Button.Colored" />
                            <button id="stop_btn" text="停止" layout_weight="1" marginLeft="8" enabled="false" />
                        </horizontal>
                    </vertical>
                </card>

                {/* 状态显示 */}
                <card w="*" h="auto" margin="8 16" cardCornerRadius="8dp" cardElevation="4dp">
                    <vertical padding="16">
                        <text text="执行状态" textSize="18sp" textStyle="bold" />
                        <text id="status_text" text="就绪" textColor="#4CAF50" textSize="16sp" marginTop="8" />
                        <text id="step_text" text="步数: 0/100" textSize="14sp" marginTop="4" />
                        <ProgressBar id="progress"
                            style="@style/Widget.AppCompat.ProgressBar.Horizontal"
                            w="*"
                            marginTop="8" />
                    </vertical>
                </card>

                {/* 日志输出 */}
                <card w="*" h="auto" margin="8 16" cardCornerRadius="8dp" cardElevation="4dp">
                    <vertical padding="16">
                        <horizontal>
                            <text text="执行日志" textSize="18sp" textStyle="bold" w="*" />
                            <button id="clear_log_btn" text="清空" w="auto" style="Widget.AppCompat.Button.Borderless" />
                        </horizontal>
                        <ScrollView id="log_scroll" h="200dp" marginTop="8" scrollbars="vertical">
                            <vertical w="*" padding="4">
                                <text id="log_text" textSize="12sp" textColor="#333333" w="*" />
                            </vertical>
                        </ScrollView>
                    </vertical>
                </card>

                {/* 流程历史 */}
                <card w="*" h="auto" margin="8 16" cardCornerRadius="8dp" cardElevation="4dp">
                    <vertical padding="16">
                        <horizontal>
                            <text text="流程历史" textSize="18sp" textStyle="bold" w="*" />
                            <button id="refresh_history_btn" text="刷新" w="auto" style="Widget.AppCompat.Button.Borderless" />
                            <button id="clear_history_btn" text="清空" w="auto" style="Widget.AppCompat.Button.Borderless" />
                        </horizontal>
                        <ScrollView id="history_scroll" h="150dp" marginTop="8" scrollbars="vertical">
                            <vertical id="history_container" w="*" padding="4">
                                <text id="history_empty_text" text="暂无流程历史" textSize="14sp" textColor="#999999" gravity="center" w="*" />
                            </vertical>
                        </ScrollView>
                    </vertical>
                </card>

                {/* 设置按钮 */}
                <button id="settings_btn"
                    text="设置"
                    w="*"
                    margin="16 8"
                    style="Widget.AppCompat.Button.Borderless.Colored" />

            </vertical>
        </ScrollView>
    </vertical>
);

// 全局变量
var agent = null;
var isRunning = false;

// 日志回调
logger.setCallback(function (message) {
    ui.run(function () {
        var currentLog = ui.log_text.text();
        var newLog = currentLog + message + "\n";
        // 限制日志长度
        var lines = newLog.split("\n");
        if (lines.length > 100) {
            ui.log_text.setText(lines.slice(-100).join("\n"));
        } else {
            ui.log_text.setText(newLog);
        }

        // 自动滚动到底部
        setTimeout(function () {
            ui.run(function () {
                try {
                    ui.log_scroll.fullScroll(android.widget.ScrollView.FOCUS_DOWN);
                } catch (e) {
                    // 忽略滚动错误
                }
            });
        }, 50);
    });
});

// 更新状态
function updateStatus(status, color) {
    if (color === undefined) color = "#4CAF50";
    ui.run(function () {
        ui.status_text.setText(status);
        ui.status_text.setTextColor(colors.parseColor(color));
    });
}

// 更新步数
function updateStep(current, max) {
    ui.run(function () {
        ui.step_text.setText("步数: " + current + "/" + max);
        ui.progress.setProgress((current / max) * 100);
    });
}

// 执行任务
function runTask() {
    var task = ui.task_input.text().trim();

    if (!task) {
        toast("请输入任务");
        return;
    }

    // 检查无障碍权限
    if (!auto.service) {
        toast("请先开启无障碍服务");
        app.startActivity({
            action: "android.settings.ACCESSIBILITY_SETTINGS"
        });
        return;
    }

    // 请求截图权限
    if (!screenCapture.requestPermission()) {
        toast("请授予截图权限");
        return;
    }

    try {
        isRunning = true;
        ui.run(function () {
            ui.run_btn.setEnabled(false);
            ui.stop_btn.setEnabled(true);
            ui.task_input.setEnabled(false);
        });

        updateStatus("正在执行...", "#FF9800");
        logger.info("==================================================");
        logger.info("任务: " + task);
        logger.info("==================================================");

        // 加载配置
        var modelConfig = storage.getModelConfig();
        var agentConfig = storage.getAgentConfig();

        // 创建 Agent
        agent = new PhoneAgent(modelConfig, agentConfig);

        // 执行任务
        var result = agent.run(task, function (stepResult) {
            // 步骤回调
            updateStep(stepResult.stepCount, agentConfig.maxSteps);

            if (stepResult.thinking) {
                logger.info("💭 " + stepResult.thinking);
            }

            if (stepResult.message) {
                logger.info("📝 " + stepResult.message);
            }
        });

        updateStatus("完成", "#4CAF50");
        logger.info("==================================================");
        logger.info("✅ " + result.message);
        logger.info("==================================================");
        
        // 显示总结信息
        if (result.summary) {
            logger.info("📊 任务流程总结:");
            logger.info("  目标: " + result.summary.taskGoal);
            logger.info("  结果: " + (result.summary.success ? "成功" : "失败"));
            logger.info("  步骤: " + result.summary.validSteps + "/" + result.summary.totalSteps + " 有效");
            if (result.summary.standardFlow) {
                logger.info("  标准流程:\n" + result.summary.standardFlow);
            }
        }
        
        ui.run(function () {
            toast(result.message);
        });

    } catch (e) {
        updateStatus("失败", "#F44336");
        logger.error("任务执行失败: " + e);
        ui.run(function () {
            toast("任务执行失败: " + e);
        });
    } finally {
        isRunning = false;
        ui.run(function () {
            ui.run_btn.setEnabled(true);
            ui.stop_btn.setEnabled(false);
            ui.task_input.setEnabled(true);
            // 刷新流程历史列表
            refreshFlowHistory();
        });
    }
}

// 停止任务
function stopTask() {
    if (agent && isRunning) {
        agent.stop();
        updateStatus("已停止", "#F44336");
        logger.info("用户停止任务");
    }
}

// 清空日志
function clearLog() {
    ui.run(function () {
        ui.log_text.setText("");
    });
}

// 打开设置
function openSettings() {
    engines.execScriptFile("ui/settings.js");
}

// 事件监听
ui.run_btn.on("click", function () {
    threads.start(runTask);
    // runTask()
});

ui.stop_btn.on("click", function () {
    stopTask();
});

ui.clear_log_btn.on("click", function () {
    clearLog();
});

ui.settings_btn.on("click", function () {
    openSettings();
});

// 初始化
updateStatus("就绪", "#4CAF50");
updateStep(0, 100);
logger.info("AutoGLM Phone Agent 已启动");
logger.info("请输入任务并点击执行");

// ==================== 流程历史功能 ====================

/**
 * 格式化时间戳
 * @param {string} isoString - ISO 时间字符串
 * @returns {string} 格式化后的时间
 */
function formatTime(isoString) {
    try {
        var date = new Date(isoString);
        var year = date.getFullYear();
        var month = (date.getMonth() + 1).toString().padStart(2, '0');
        var day = date.getDate().toString().padStart(2, '0');
        var hour = date.getHours().toString().padStart(2, '0');
        var minute = date.getMinutes().toString().padStart(2, '0');
        return year + "-" + month + "-" + day + " " + hour + ":" + minute;
    } catch (e) {
        return isoString;
    }
}

/**
 * 截断文本
 * @param {string} text - 原始文本
 * @param {number} maxLen - 最大长度
 * @returns {string} 截断后的文本
 */
function truncateText(text, maxLen) {
    if (!text) return "";
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + "...";
}

/**
 * 刷新流程历史列表
 */
function refreshFlowHistory() {
    ui.run(function() {
        var history = storage.getFlowHistory();
        var container = ui.history_container;
        
        // 清空容器
        container.removeAllViews();
        
        if (history.length === 0) {
            // 显示空状态
            var emptyText = ui.inflate(
                <text text="暂无流程历史" textSize="14sp" textColor="#999999" gravity="center" w="*" padding="16" />,
                container
            );
            container.addView(emptyText);
            return;
        }
        
        // 添加历史记录
        for (var i = 0; i < history.length; i++) {
            var flow = history[i];
            var success = flow.success;
            var statusColor = success ? "#4CAF50" : "#F44336";
            var statusText = success ? "成功" : "失败";
            
            var cardView = ui.inflate(
                <card w="*" h="auto" margin="4 4" cardCornerRadius="4dp" cardElevation="2dp" cardBackgroundColor="#FAFAFA">
                    <vertical padding="12" w="*">
                        <horizontal w="*" gravity="center_vertical">
                            <text id="flow_task" textSize="14sp" textStyle="bold" w="*" maxLines="1" ellipsize="end" />
                        </horizontal>
                        <horizontal w="*" marginTop="4">
                            <text id="flow_time" textSize="12sp" textColor="#666666" />
                            <text text=" | " textSize="12sp" textColor="#999999" />
                            <text id="flow_status" textSize="12sp" />
                            <text text=" | " textSize="12sp" textColor="#999999" />
                            <text id="flow_steps" textSize="12sp" textColor="#666666" />
                        </horizontal>
                        <horizontal w="*" marginTop="8">
                            <button id="detail_btn" text="详情" w="auto" h="32dp" textSize="12sp" style="Widget.AppCompat.Button.Borderless.Colored" />
                            <button id="reuse_btn" text="复用" w="auto" h="32dp" textSize="12sp" style="Widget.AppCompat.Button.Borderless.Colored" marginLeft="8" />
                            <button id="delete_btn" text="删除" w="auto" h="32dp" textSize="12sp" style="Widget.AppCompat.Button.Borderless" marginLeft="8" textColor="#F44336" />
                        </horizontal>
                    </vertical>
                </card>,
                container
            );
            
            // 设置数据
            cardView.flow_task.setText(truncateText(flow.task, 30));
            cardView.flow_time.setText(formatTime(flow.createdAt));
            cardView.flow_status.setText(statusText);
            cardView.flow_status.setTextColor(colors.parseColor(statusColor));
            
            var stepsInfo = "";
            if (flow.summary) {
                stepsInfo = flow.summary.validSteps + "/" + flow.summary.totalSteps + " 步";
            } else {
                stepsInfo = "--";
            }
            cardView.flow_steps.setText(stepsInfo);
            
            // 绑定事件（使用闭包保存 flow 引用）
            (function(f) {
                cardView.detail_btn.on("click", function() {
                    showFlowDetailDialog(f);
                });
                
                cardView.reuse_btn.on("click", function() {
                    reuseFlow(f);
                });
                
                cardView.delete_btn.on("click", function() {
                    deleteFlowWithConfirm(f.id);
                });
            })(flow);
            
            container.addView(cardView);
        }
    });
}

/**
 * 显示流程详情对话框
 * @param {Object} flow - 流程记录
 */
function showFlowDetailDialog(flow) {
    var summary = flow.summary || {};
    
    // 构建详情内容
    var content = "";
    
    // 任务目标
    content += "【任务目标】\n" + (summary.taskGoal || flow.task) + "\n\n";
    
    // 执行结果
    var resultText = summary.success ? "成功 ✓" : "失败 ✗";
    content += "【执行结果】" + resultText + "\n\n";
    
    // 步骤统计
    content += "【步骤统计】\n";
    content += "有效步骤: " + (summary.validSteps || 0) + "\n";
    content += "无效步骤: " + (summary.invalidSteps || 0) + "\n";
    content += "总步骤数: " + (summary.totalSteps || 0) + "\n\n";
    
    // 标准流程
    if (summary.standardFlow) {
        content += "【标准流程】\n" + summary.standardFlow + "\n\n";
    }
    
    // 关键决策点
    if (summary.keyDecisions && summary.keyDecisions.length > 0) {
        content += "【关键决策点】\n";
        for (var i = 0; i < summary.keyDecisions.length; i++) {
            content += (i + 1) + ". " + summary.keyDecisions[i] + "\n";
        }
        content += "\n";
    }
    
    // 注意事项
    if (summary.tips && summary.tips.length > 0) {
        content += "【注意事项】\n";
        for (var j = 0; j < summary.tips.length; j++) {
            content += "• " + summary.tips[j] + "\n";
        }
        content += "\n";
    }
    
    // 无效步骤分析
    if (summary.invalidStepAnalysis && summary.invalidStepAnalysis.length > 0) {
        content += "【无效步骤分析】\n";
        for (var k = 0; k < summary.invalidStepAnalysis.length; k++) {
            content += "• " + summary.invalidStepAnalysis[k] + "\n";
        }
    }
    
    // 显示对话框
    dialogs.build({
        title: "流程详情",
        content: content,
        positive: "关闭",
        neutral: "复用流程",
        negative: "删除"
    }).on("positive", function() {
        // 关闭对话框
    }).on("neutral", function() {
        reuseFlow(flow);
    }).on("negative", function() {
        deleteFlowWithConfirm(flow.id);
    }).show();
}

/**
 * 复用流程（将标准流程填充到任务输入框）
 * @param {Object} flow - 流程记录
 */
function reuseFlow(flow) {
    var summary = flow.summary || {};
    var standardFlow = summary.standardFlow || flow.task;
    
    ui.run(function() {
        ui.task_input.setText(standardFlow);
        toast("已填充标准流程到任务输入框");
    });
}

/**
 * 删除流程（带确认）
 * @param {string} flowId - 流程 ID
 */
function deleteFlowWithConfirm(flowId) {
    dialogs.confirm("确认删除", "确定要删除这条流程记录吗？", function(ok) {
        if (ok) {
            storage.deleteFlow(flowId);
            toast("已删除");
            refreshFlowHistory();
        }
    });
}

/**
 * 清空所有流程历史
 */
function clearAllFlowHistory() {
    dialogs.confirm("确认清空", "确定要清空所有流程历史吗？此操作不可恢复。", function(ok) {
        if (ok) {
            storage.clearFlowHistory();
            toast("已清空流程历史");
            refreshFlowHistory();
        }
    });
}

// 流程历史相关事件监听
ui.refresh_history_btn.on("click", function() {
    refreshFlowHistory();
    toast("已刷新");
});

ui.clear_history_btn.on("click", function() {
    clearAllFlowHistory();
});

// 初始化时加载流程历史
refreshFlowHistory();
