/**
 * 测试 app.getInstalledApps API 是否可用
 * 
 * AutoJS Pro 8.0.0+ 版本才有 app.getInstalledApps() API
 * 免费版本需要使用 shell 命令作为替代
 */

// 日志分隔线
function logSeparator(title) {
    console.log("\n" + "=".repeat(50));
    console.log(" " + title);
    console.log("=".repeat(50));
}

// 主测试函数
function main() {
    logSeparator("测试 app.getInstalledApps API");

    // 测试 1: 检查 app.getInstalledApps 函数是否存在
    console.log("\n[测试 1] 检查 app.getInstalledApps 函数是否存在...");
    
    if (typeof app !== 'undefined' && typeof app.getInstalledApps === 'function') {
        console.log("✓ app.getInstalledApps 函数存在");
        
        // 测试 2: 调用 app.getInstalledApps 并输出结果
        console.log("\n[测试 2] 调用 app.getInstalledApps()...");
        try {
            var apps = app.getInstalledApps();
            
            if (apps && Array.isArray(apps)) {
                console.log("✓ 调用成功，返回应用数量: " + apps.length);
                
                // 输出前 10 个应用的信息
                console.log("\n前 10 个应用信息:");
                var displayCount = Math.min(10, apps.length);
                for (var i = 0; i < displayCount; i++) {
                    var appInfo = apps[i];
                    console.log("  [" + (i + 1) + "] " + 
                        "包名: " + (appInfo.packageName || "N/A") + 
                        ", 名称: " + (appInfo.name || appInfo.label || "N/A"));
                }
                
                if (apps.length > 10) {
                    console.log("  ... 还有 " + (apps.length - 10) + " 个应用未显示");
                }
            } else {
                console.log("✗ 返回值异常: " + typeof apps);
                console.log("  返回值: " + JSON.stringify(apps));
            }
        } catch (e) {
            console.log("✗ 调用失败: " + e.message);
            console.log("  错误堆栈: " + e.stack);
        }
    } else {
        console.log("✗ app.getInstalledApps 函数不存在");
        console.log("  可能原因: 当前 AutoJS 版本不支持此 API (需要 Pro 8.0.0+)");
    }

    // 测试 3: 使用 shell 命令作为替代方案
    logSeparator("测试替代方案: shell 命令");
    
    console.log("\n[测试 3] 使用 shell('pm list packages') 获取应用列表...");
    try {
        var result = shell("pm list packages", true);
        
        if (result && result.code === 0) {
            console.log("✓ shell 命令执行成功");
            
            var output = result.result;
            var lines = output.split("\n");
            var packages = [];
            
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (line.indexOf("package:") === 0) {
                    packages.push(line.substring(8)); // 去掉 "package:" 前缀
                }
            }
            
            console.log("  找到 " + packages.length + " 个已安装应用包");
            
            // 输出前 10 个包名
            console.log("\n前 10 个包名:");
            var displayCount = Math.min(10, packages.length);
            for (var j = 0; j < displayCount; j++) {
                console.log("  [" + (j + 1) + "] " + packages[j]);
            }
            
            if (packages.length > 10) {
                console.log("  ... 还有 " + (packages.length - 10) + " 个包未显示");
            }
        } else {
            console.log("✗ shell 命令执行失败");
            console.log("  返回码: " + (result ? result.code : "unknown"));
            console.log("  错误信息: " + (result ? result.error : "unknown"));
        }
    } catch (e) {
        console.log("✗ shell 命令执行异常: " + e.message);
    }

    // 测试 4: 获取第三方应用（非系统应用）
    logSeparator("测试替代方案: 获取第三方应用");
    
    console.log("\n[测试 4] 使用 shell('pm list packages -3') 获取第三方应用...");
    try {
        var result3rd = shell("pm list packages -3", true);
        
        if (result3rd && result3rd.code === 0) {
            console.log("✓ shell 命令执行成功");
            
            var output3rd = result3rd.result;
            var lines3rd = output3rd.split("\n");
            var packages3rd = [];
            
            for (var k = 0; k < lines3rd.length; k++) {
                var line3rd = lines3rd[k].trim();
                if (line3rd.indexOf("package:") === 0) {
                    packages3rd.push(line3rd.substring(8));
                }
            }
            
            console.log("  找到 " + packages3rd.length + " 个第三方应用包");
            
            // 输出前 10 个包名
            console.log("\n前 10 个第三方应用包名:");
            var displayCount3rd = Math.min(10, packages3rd.length);
            for (var m = 0; m < displayCount3rd; m++) {
                console.log("  [" + (m + 1) + "] " + packages3rd[m]);
            }
            
            if (packages3rd.length > 10) {
                console.log("  ... 还有 " + (packages3rd.length - 10) + " 个包未显示");
            }
        } else {
            console.log("✗ shell 命令执行失败");
        }
    } catch (e) {
        console.log("✗ shell 命令执行异常: " + e.message);
    }

    // 测试 5: 使用 Java API 获取已安装应用
    logSeparator("测试替代方案: Java API");
    
    console.log("\n[测试 5] 使用 Java API (PackageManager) 获取应用列表...");
    try {
        var pm = context.getPackageManager();
        var appList = pm.getInstalledApplications(0);
        var appArray = appList.toArray();
        
        console.log("✓ Java API 调用成功，返回应用数量: " + appArray.length);
        
        // 输出前 10 个应用的包名和应用名称
        console.log("\n前 10 个应用信息 (包名 + 应用名称):");
        var displayCountJava = Math.min(10, appArray.length);
        for (var n = 0; n < displayCountJava; n++) {
            var appInfo = appArray[n];
            var packageName = appInfo.packageName;
            var appLabel = appInfo.loadLabel(pm);
            console.log("  [" + (n + 1) + "] 包名: " + packageName + ", 名称: " + appLabel);
        }
        
        if (appArray.length > 10) {
            console.log("  ... 还有 " + (appArray.length - 10) + " 个应用未显示");
        }
        
        // 存储结果用于对比
        javaAppsCount = appArray.length;
        javaAppsSuccess = true;
    } catch (e) {
        console.log("✗ Java API 调用失败: " + e.message);
        console.log("  错误堆栈: " + e.stack);
        javaAppsSuccess = false;
    }

    // 测试总结
    logSeparator("测试总结");
    
    var hasGetInstalledApps = (typeof app !== 'undefined' && typeof app.getInstalledApps === 'function');
    
    console.log("\nAPI 可用性:");
    console.log("  app.getInstalledApps: " + (hasGetInstalledApps ? "✓ 可用" : "✗ 不可用"));
    console.log("  shell('pm list packages'): ✓ 可用 (替代方案)");
    console.log("  shell('pm list packages -3'): ✓ 可用 (替代方案)");
    console.log("  Java API (PackageManager): " + (javaAppsSuccess ? "✓ 可用" : "✗ 不可用"));
    
    // 方案对比
    console.log("\n方案对比:");
    console.log("┌─────────────────────┬────────────┬────────────┬────────────┐");
    console.log("│ 方案                │ 应用名称   │ 包名       │ 详细信息   │");
    console.log("├─────────────────────┼────────────┼────────────┼────────────┤");
    console.log("│ app.getInstalledApps│    ✓       │    ✓       │    ✓       │");
    console.log("│ shell pm list       │    ✗       │    ✓       │    ✗       │");
    console.log("│ Java API (PM)       │    ✓       │    ✓       │    ✓       │");
    console.log("└─────────────────────┴────────────┴────────────┴────────────┘");
    
    console.log("\n建议:");
    if (hasGetInstalledApps) {
        console.log("  当前环境支持 app.getInstalledApps API，推荐使用此 API");
        console.log("  可获取更详细的应用信息（名称、图标、权限等）");
    } else if (javaAppsSuccess) {
        console.log("  当前环境支持 Java API (PackageManager)，推荐使用此方案");
        console.log("  可获取包名和应用名称，是 app.getInstalledApps 的最佳替代方案");
    } else {
        console.log("  当前环境不支持 app.getInstalledApps API 和 Java API");
        console.log("  请使用 shell('pm list packages') 作为替代方案");
        console.log("  注意: shell 方案只能获取包名，无法获取应用名称等详细信息");
    }
    
    logSeparator("测试完成");
}

// 执行测试
main();