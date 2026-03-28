/**
 * XML元素解析模块
 * 使用AutoJS6的无障碍服务API获取窗口UI元素信息
 * 类似于droidrun项目的AccessibilityTreeBuilder功能
 */
// TODO: 1.自定义过滤规则和文本提取策略，适应不同应用的UI结构和命名习惯
//       2. 通过实机测试和用户反馈不断优化过滤规则和文本提取策略，确保生成的UI描述既准确又有用，能够满足AI理解和交互的需求。
var logger = require('../utils/logger');

function XmlParser() {
    // 最小元素尺寸阈值(像素)
    this.MIN_ELEMENT_SIZE = 5;
    // 可见性阈值(1%)
    this.VISIBILITY_THRESHOLD = 0.01;
    
    // 无意义元素ID黑名单（这些ID通常是无意义的布局框架）
    this.MEANINGLESS_IDS = [
        // 布局框架
        'icon_frame', 'text_frame', 'icon', 'image_frame', 'text_container',
        'icon_container', 'image_container', 'content_frame', 'content_container',
        // 通用容器
        'container', 'container_material', 'list_container', 'scroll_container',
        'wrapper', 'inner_wrapper', 'outer_wrapper', 'root', 'root_view',
        // 应用栏相关
        'app_bar', 'app_bar_container', 'app_bar_layout', 'toolbar_container',
        'action_bar', 'action_bar_container', 'action_bar_layout',
        // 列表相关
        'recycler_view', 'list_view', 'grid_view', 'list_item_container',
        'scroll_view', 'nested_scroll_view', 'horizontal_scroll',
        // 导航相关
        'nav_container', 'nav_bar', 'nav_bar_container', 'bottom_nav_container',
        'tab_container', 'tab_bar', 'tab_layout',
        // 其他无意义ID
        'background', 'foreground', 'overlay', 'divider', 'spacer',
        'padding', 'margin', 'shadow', 'gradient', 'mask', 'mask_view',
        // 编号类ID（通常是无意义的自动生成ID）
        'view1', 'view2', 'view3', 'view4', 'view5',
        'layout1', 'layout2', 'layout3', 'layout4', 'layout5',
        'container1', 'container2', 'container3', 'container4', 'container5'
    ];
    
    // 无意义类名后缀黑名单
    this.MEANINGLESS_CLASS_SUFFIXES = [
        'Layout', 'Layout2', 'Layout3', 'Layout4', 'Layout5',
        'Container', 'Container2', 'Container3', 'Container4', 'Container5',
        'Wrapper', 'Wrapper2', 'Wrapper3', 'Wrapper4', 'Wrapper5'
    ];
    
    // 有意义的ID关键词（这些ID通常包含有用信息）
    this.MEANINGFUL_ID_KEYWORDS = [
        'title', 'summary', 'subtitle', 'description', 'text', 'label',
        'button', 'btn', 'action', 'menu', 'item', 'option',
        'edit', 'input', 'field', 'search', 'query',
        'checkbox', 'radio', 'switch', 'toggle', 'check',
        'icon_', 'img_', 'image_', 'avatar', 'logo', 'thumbnail',
        'name', 'value', 'content', 'message', 'info', 'detail',
        'confirm', 'cancel', 'ok', 'yes', 'no', 'accept', 'reject',
        'submit', 'send', 'receive', 'download', 'upload', 'share',
        'play', 'pause', 'stop', 'next', 'prev', 'previous', 'forward', 'backward',
        'add', 'remove', 'delete', 'edit', 'update', 'create', 'save',
        'close', 'open', 'expand', 'collapse', 'show', 'hide',
        'settings', 'preference', 'config', 'option',
        'user', 'profile', 'account', 'login', 'logout', 'signin', 'signout',
        'email', 'phone', 'address', 'location', 'date', 'time',
        'price', 'amount', 'quantity', 'total', 'subtotal', 'discount',
        'cart', 'order', 'product', 'item', 'goods', 'service',
        'notification', 'alert', 'warning', 'error', 'success', 'status',
        'progress', 'loading', 'refresh', 'reload', 'sync',
        'like', 'favorite', 'bookmark', 'follow', 'subscribe', 'comment',
        'home', 'back', 'forward', 'up', 'down', 'left', 'right'
    ];
    
    // 过滤配置
    this.filterConfig = {
        strictFilter: true,          // 是否启用严格过滤
        keepClickable: true,         // 是否保留所有可点击元素
        keepTextContent: true,       // 是否保留有文本内容的元素
        keepMeaningfulIds: true,     // 是否保留有意义的ID
        filterContainers: true,      // 是否过滤纯容器元素
        filterLayouts: true          // 是否过滤纯布局元素
    };
}

/**
 * 设置过滤配置
 * @param {Object} config - 过滤配置对象
 */
XmlParser.prototype.setFilterConfig = function (config) {
    if (config) {
        for (var key in config) {
            if (config.hasOwnProperty(key)) {
                this.filterConfig[key] = config[key];
            }
        }
    }
};

/**
 * 检查ID是否无意义
 * @param {string} resourceId - 资源ID
 * @returns {boolean} 是否无意义
 */
XmlParser.prototype.isMeaninglessId = function (resourceId) {
    if (!resourceId) {
        return false;
    }
    
    // 提取ID的最后一部分（去除包名）
    var parts = resourceId.split('/');
    var idName = parts[parts.length - 1].toLowerCase();
    
    // 检查是否在无意义ID黑名单中
    if (this.MEANINGLESS_IDS.indexOf(idName) !== -1) {
        return true;
    }
    
    // 检查是否匹配无意义ID模式
    // 如: view123, layout123, container123 等
    if (/^(view|layout|container|wrapper|frame|item|row|cell)\d+$/i.test(idName)) {
        return true;
    }
    
    return false;
};

/**
 * 检查ID是否有意义
 * @param {string} resourceId - 资源ID
 * @returns {boolean} 是否有意义
 */
XmlParser.prototype.isMeaningfulId = function (resourceId) {
    if (!resourceId) {
        return false;
    }
    
    // 提取ID的最后一部分（去除包名）
    var parts = resourceId.split('/');
    var idName = parts[parts.length - 1].toLowerCase();
    
    // 检查是否包含有意义的关键词
    for (var i = 0; i < this.MEANINGFUL_ID_KEYWORDS.length; i++) {
        if (idName.indexOf(this.MEANINGFUL_ID_KEYWORDS[i]) !== -1) {
            return true;
        }
    }
    
    return false;
};

/**
 * 检查类名是否为纯布局容器
 * @param {string} className - 类名
 * @returns {boolean} 是否为纯布局容器
 */
XmlParser.prototype.isLayoutContainer = function (className) {
    if (!className) {
        return false;
    }
    
    var classParts = className.split('.');
    var simpleClassName = classParts[classParts.length - 1];
    
    // 布局容器类名列表
    var layoutClasses = [
        'FrameLayout', 'LinearLayout', 'RelativeLayout',
        'ConstraintLayout', 'CoordinatorLayout', 'DrawerLayout',
        'GridLayout', 'TableLayout', 'AbsoluteLayout',
        'ViewPager', 'ViewPager2', 'RecyclerView', 'ScrollView',
        'NestedScrollView', 'HorizontalScrollView', 'ListView',
        'GridView', 'ViewStub', 'ViewSwitcher', 'ViewFlipper',
        'TabHost', 'TabWidget', 'ActionMenuView', 'Toolbar',
        'AppBarLayout', 'BottomNavigationView', 'NavigationView',
        'CardView', 'SwipeRefreshLayout', 'Merge', 'View'
    ];
    
    return layoutClasses.indexOf(simpleClassName) !== -1;
};

/**
 * 判断元素是否应该被过滤掉
 * @param {Object} nodeData - 节点数据
 * @returns {boolean} 是否应该过滤
 */
XmlParser.prototype.shouldFilterElement = function (nodeData) {
    // 如果未启用严格过滤，不过滤任何元素
    if (!this.filterConfig.strictFilter) {
        return false;
    }
    
    // 保留所有可点击元素（如果配置要求）
    if (this.filterConfig.keepClickable && nodeData.clickable) {
        return false;
    }
    
    // 保留有文本内容的元素（如果配置要求）
    if (this.filterConfig.keepTextContent && (nodeData.text || nodeData.contentDescription)) {
        return false;
    }
    
    // 保留有意义的ID（如果配置要求）
    if (this.filterConfig.keepMeaningfulIds && this.isMeaningfulId(nodeData.resourceId)) {
        return false;
    }
    
    // 过滤无意义的ID
    if (this.isMeaninglessId(nodeData.resourceId)) {
        return true;
    }
    
    // 过滤纯布局容器（如果配置要求）
    if (this.filterConfig.filterLayouts && this.isLayoutContainer(nodeData.className)) {
        // 如果是纯布局容器且没有文本内容，过滤掉
        if (!nodeData.text && !nodeData.contentDescription && !nodeData.clickable) {
            return true;
        }
    }
    
    return false;
};

/**
 * 获取当前窗口的完整UI元素树
 * @returns {Object|null} UI元素树JSON对象,失败返回null
 */
XmlParser.prototype.getUiTree = function () {
    try {
        // 获取当前窗口的根元素
        var root = auto.rootInActiveWindow;
        
        if (!root) {
            logger.warn("无法获取窗口根元素");
            return null;
        }
        
        // 构建完整的UI树
        var tree = this.buildTree(root, 0);
        
        // 释放根元素资源
        if (root.recycle) {
            root.recycle();
        }
        
        return tree;
        
    } catch (e) {
        logger.error("获取UI树失败: " + e);
        return null;
    }
};

/**
 * 递归构建UI元素树
 * @param {UiObject} node - 当前节点
 * @param {number} depth - 深度
 * @returns {Object} 节点JSON对象
 */
XmlParser.prototype.buildTree = function (node, depth) {
    if (!node) {
        return null;
    }
    
    // 获取边界矩形
    var bounds = node.bounds();
    var boundsInScreen = node.boundsInScreen();
    
    // 几何过滤 - 过滤掉太小的元素
    if (bounds) {
        var width = bounds.width();
        var height = bounds.height();
        if (width < this.MIN_ELEMENT_SIZE || height < this.MIN_ELEMENT_SIZE) {
            return null;
        }
    }
    
    // 计算中心坐标
    var centerX = Math.round((boundsInScreen.left + boundsInScreen.right) / 2);
    var centerY = Math.round((boundsInScreen.top + boundsInScreen.bottom) / 2);
    
    // 提取节点属性
    var nodeData = {
        // 基本标识
        resourceId: node.id(),
        className: node.className(),
        packageName: node.packageName(),
        depth: node.depth(),
        
        // 文本内容 - 优先级: contentDescription > text > 空
        text: node.text() || "",
        contentDescription: node.desc() || "",
        
        // 坐标边界
        boundsInScreen: {
            left: boundsInScreen.left,
            top: boundsInScreen.top,
            right: boundsInScreen.right,
            bottom: boundsInScreen.bottom
        },
        
        // 中心坐标
        center: {
            x: centerX,
            y: centerY
        },
        
        // 布尔状态
        clickable: node.clickable(),
        longClickable: node.longClickable(),
        focusable: node.focusable(),
        focused: node.focused(),
        selected: node.selected(),
        checkable: node.checkable(),
        checked: node.checked(),
        enabled: node.enabled(),
        scrollable: node.scrollable(),
        editable: node.editable(),
        visibleToUser: node.visibleToUser(),
        
        // 子节点
        children: []
    };
    
    // 获取子节点
    var childCount = node.childCount();
    if (childCount > 0) {
        for (var i = 0; i < childCount; i++) {
            var child = node.child(i);
            if (child) {
                var childData = this.buildTree(child, depth + 1);
                if (childData) {
                    nodeData.children.push(childData);
                }
                // 释放子节点资源
                if (child.recycle) {
                    child.recycle();
                }
            }
        }
    }
    
    return nodeData;
};

/**
 * 获取简化版的UI元素列表(用于AI理解)
 * 只包含可见的、有内容的元素
 * @returns {Array} 元素列表
 */
XmlParser.prototype.getSimplifiedElements = function () {
    try {
        var root = auto.rootInActiveWindow;
        
        if (!root) {
            logger.warn("无法获取窗口根元素");
            return [];
        }
        
        var elements = [];
        // 使用对象传递索引计数器，以便在递归中正确更新
        var indexCounter = { value: 0 };
        this.extractSimplifiedElements(root, elements, indexCounter);
        
        // 释放根元素资源
        if (root.recycle) {
            root.recycle();
        }
        
        return elements;
        
    } catch (e) {
        logger.error("获取简化元素列表失败: " + e);
        return [];
    }
};

/**
 * 递归提取简化元素（优化版）
 * @param {UiObject} node - 当前节点
 * @param {Array} elements - 元素列表
 * @param {number} indexCounter - 索引计数器对象 {value: number}
 */
XmlParser.prototype.extractSimplifiedElements = function (node, elements, indexCounter) {
    if (!node) {
        return;
    }
    
    // 获取边界
    var bounds = node.bounds();
    
    // 几何过滤
    if (bounds) {
        var width = bounds.width();
        var height = bounds.height();
        if (width < this.MIN_ELEMENT_SIZE || height < this.MIN_ELEMENT_SIZE) {
            return;
        }
    }
    
    // 提取基本属性
    var text = node.text() || "";
    var contentDesc = node.desc() || "";
    var className = node.className() || "";
    var resourceId = node.id() || "";
    var isClickable = node.clickable();
    var isLongClickable = node.longClickable();
    var isCheckable = node.checkable();
    var isEditable = node.editable();
    var isScrollable = node.scrollable();
    
    // 构建节点数据用于过滤判断
    var nodeData = {
        text: text,
        contentDescription: contentDesc,
        className: className,
        resourceId: resourceId,
        clickable: isClickable
    };
    
    // 应用过滤规则
    if (this.shouldFilterElement(nodeData)) {
        // 即使过滤了当前元素，仍需递归处理子节点
        var childCount = node.childCount();
        for (var i = 0; i < childCount; i++) {
            var child = node.child(i);
            if (child) {
                this.extractSimplifiedElements(child, elements, indexCounter);
                if (child.recycle) {
                    child.recycle();
                }
            }
        }
        return;
    }
    
    // 智能文本提取策略（优化版）
    // 优先级: contentDescription > text > 有意义的resourceId > 有意义的className
    var displayText = "";
    
    if (contentDesc) {
        // 优先使用 contentDescription
        displayText = contentDesc;
    } else if (text) {
        // 其次使用 text
        displayText = text;
    } else if (resourceId && !this.isMeaninglessId(resourceId)) {
        // 只有当 resourceId 有意义时才使用
        var parts = resourceId.split('/');
        var idName = parts[parts.length - 1];
        // 如果 ID 有意义关键词，使用它
        if (this.isMeaningfulId(resourceId)) {
            displayText = idName;
        }
    }
    
    // 如果仍然没有 displayText，尝试从类名提取（仅对特定类型）
    if (!displayText && className && !this.isLayoutContainer(className)) {
        var classParts = className.split('.');
        var simpleClassName = classParts[classParts.length - 1];
        
        // 只保留有实际意义的控件类名
        var meaningfulClasses = [
            'Button', 'ImageButton', 'CheckBox', 'RadioButton', 'Switch', 'Toggle',
            'EditText', 'TextView', 'AutoCompleteTextView', 'TextInputLayout',
            'ImageView', 'ProgressBar', 'SeekBar', 'RatingBar', 'Spinner',
            'DatePicker', 'TimePicker', 'CalendarView', 'Chronometer',
            'SearchView', 'VideoView', 'WebView', 'SurfaceView', 'TextureView',
            'CardView', 'Chip', 'FloatingActionButton', 'Snackbar', 'BottomSheet'
        ];
        
        if (meaningfulClasses.indexOf(simpleClassName) !== -1) {
            displayText = simpleClassName;
        }
    }
    
    // 元素类型分类（优化版）
    var elementType = "View";
    if (isClickable) {
        elementType = "Clickable";
    } else if (isCheckable) {
        elementType = "Checkable";
    } else if (isEditable) {
        elementType = "Input";
    } else if (displayText) {
        elementType = "Text";
    } else if (isScrollable) {
        // 可滚动容器只在没有其他类型时才标记为 Container
        elementType = "Container";
    }
    
    // 决定是否添加元素
    // 保留条件：有文本内容、可交互、或有实际意义
    var shouldAdd = false;
    
    if (displayText) {
        shouldAdd = true;
    } else if (isClickable) {
        // 可点击元素即使没有文本也保留（对用户交互有意义）
        shouldAdd = true;
    } else if (isEditable) {
        // 可编辑元素保留
        shouldAdd = true;
    } else if (isCheckable) {
        // 可选中元素保留
        shouldAdd = true;
    } else if (isScrollable && this.filterConfig.filterContainers) {
        // 如果不过滤容器，则保留可滚动元素
        shouldAdd = !this.filterConfig.filterContainers;
    }
    
    if (shouldAdd) {
        var boundsInScreen = node.boundsInScreen();
        // 计算中心坐标
        var centerX = Math.round((boundsInScreen.left + boundsInScreen.right) / 2);
        var centerY = Math.round((boundsInScreen.top + boundsInScreen.bottom) / 2);
        
        elements.push({
            index: indexCounter.value++,
            type: elementType,
            text: displayText,
            resourceId: resourceId,
            className: className,
            clickable: isClickable,
            longClickable: isLongClickable,
            checkable: isCheckable,
            editable: isEditable,
            scrollable: isScrollable,
            bounds: {
                left: boundsInScreen.left,
                top: boundsInScreen.top,
                right: boundsInScreen.right,
                bottom: boundsInScreen.bottom
            },
            center: {
                x: centerX,
                y: centerY
            }
        });
    }
    
    // 递归处理子节点
    var childCount = node.childCount();
    for (var i = 0; i < childCount; i++) {
        var child = node.child(i);
        if (child) {
            this.extractSimplifiedElements(child, elements, indexCounter);
            if (child.recycle) {
                child.recycle();
            }
        }
    }
};

/**
 * 将UI树转换为适合AI理解的文本描述
 * @returns {string} 格式化的UI描述文本
 */
XmlParser.prototype.getUiDescription = function () {
    var elements = this.getSimplifiedElements();
    
    if (!elements || elements.length === 0) {
        return "无法获取UI元素信息";
    }
    
    var description = "屏幕元素列表 (共 " + elements.length + " 个元素):\n\n";
    
    for (var i = 0; i < elements.length; i++) {
        var el = elements[i];
        var boundsStr = el.bounds ?
            "[" + el.bounds.left + ", " + el.bounds.top + ", " + el.bounds.right + ", " + el.bounds.bottom + "]" : "[]";
        var centerStr = el.center ?
            "(" + el.center.x + ", " + el.center.y + ")" : "()";
        
        description += "[" + el.index + "] " + el.type + ": \"" + el.text + "\"";
        
        if (el.resourceId) {
            description += " (id: " + el.resourceId + ")";
        }
        
        description += " at " + boundsStr;
        description += " center: " + centerStr;
        
        // 添加交互状态标签
        var tags = [];
        if (el.clickable) {
            tags.push("可点击");
        }
        if (el.longClickable) {
            tags.push("可长按");
        }
        if (el.editable) {
            tags.push("可输入");
        }
        if (el.checkable) {
            tags.push("可选中");
        }
        if (el.scrollable) {
            tags.push("可滚动");
        }
        
        if (tags.length > 0) {
            description += " [" + tags.join(", ") + "]";
        }
        
        description += "\n";
    }
    
    return description;
};

/**
 * 获取当前过滤配置
 * @returns {Object} 过滤配置对象
 */
XmlParser.prototype.getFilterConfig = function () {
    return this.filterConfig;
};

/**
 * 重置过滤配置为默认值
 */
XmlParser.prototype.resetFilterConfig = function () {
    this.filterConfig = {
        strictFilter: true,
        keepClickable: true,
        keepTextContent: true,
        keepMeaningfulIds: true,
        filterContainers: true,
        filterLayouts: true
    };
};

module.exports = new XmlParser();
