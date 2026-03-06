---
name: element-extractor
description: 专家级元素抽取技能，基于 DOM 分析生成稳定的 XPath 1.0 表达式，支持列表区域、翻页区域、详情页字段的精确抽取，所有 XPath 必须经过验证才能输出。
---

# Element Extractor - 元素抽取专家

## 概述

本技能提供专家级 XPath 生成与验证能力：
- **列表区域抽取** - 识别列表容器、生成列表项 XPath
- **翻页区域抽取** - 识别翻页按钮、生成翻页逻辑 XPath
- **详情页字段抽取** - 生成稳定字段 XPath
- **强制验证机制** - 所有 XPath 必须通过 `browser_get_elements_by_xpath` 验证

## 错误处理与容错

### XPath 验证错误处理

**所有 XPath 验证操作都必须包含错误处理**：

```python
from typing import Dict, Any, List, Optional


def validate_xpath(
    xpath: str,
    expected_count: Optional[int] = None,
    description: str = "",
    timeout: int = 5000
) -> Dict[str, Any]:
    """
    验证 XPath 表达式，包含完整的错误处理

    Args:
        xpath: XPath 表达式
        expected_count: 期望匹配的元素数量（可选）
        description: 字段描述
        timeout: 超时时间（毫秒）

    Returns:
        dict: {'success': bool, 'count': int, 'error': Optional[str]}
    """
    try:
        # 验证 XPath 语法
        if not xpath or not isinstance(xpath, str):
            return {
                'success': False,
                'error': 'Invalid XPath: must be a non-empty string',
                'error_type': 'INVALID_INPUT'
            }

        # 执行 XPath 查询，设置超时
        elements = browser_get_elements_by_xpath(xpath=xpath, timeout=timeout)

        result = {
            'xpath': xpath,
            'description': description,
            'success': True,
            'count': len(elements),
            'elements': elements[:3],  # 仅返回前 3 个用于检查
            'error': None
        }

        # 检查是否匹配元素
        if len(elements) == 0:
            result['success'] = False
            result['error'] = 'XPath 未匹配任何元素'
            result['error_type'] = 'NO_MATCH'

        # 检查期望数量
        elif expected_count and len(elements) != expected_count:
            result['success'] = False
            result['error'] = f'期望匹配 {expected_count} 个元素，实际匹配 {len(elements)} 个'
            result['error_type'] = 'COUNT_MISMATCH'

        return result

    except TimeoutError as e:
        return {
            'success': False,
            'error': f'XPath validation timed out after {timeout}ms',
            'error_type': 'TIMEOUT',
            'xpath': xpath
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'XPath validation failed: {type(e).__name__}: {str(e)}',
            'error_type': 'VALIDATION_ERROR',
            'xpath': xpath
        }
```

### 重试机制

**验证失败时尝试替代方案**：

```python
def validate_with_retry(
    xpath: str,
    max_retries: int = 2,
    initial_timeout: int = 5000
) -> Dict[str, Any]:
    """
    验证失败时重试，调整 XPath 策略

    Args:
        xpath: XPath 表达式
        max_retries: 最大重试次数
        initial_timeout: 初始超时（毫秒）

    Returns:
        dict: 验证结果
    """
    last_result = None
    timeout = initial_timeout

    for attempt in range(max_retries + 1):
        result = validate_xpath(xpath, timeout=timeout)

        # 成功则直接返回
        if result['success']:
            result['retries'] = attempt
            return result

        last_result = result

        # 重试策略
        if attempt < max_retries:
            alternative_xpath = generate_alternative_xpath(xpath, attempt)
            if alternative_xpath:
                xpath = alternative_xpath
                # 增加超时
                timeout = int(timeout * 1.5)
                print(f"Attempt {attempt + 1} failed, trying alternative XPath: {xpath}")

    # 所有重试失败
    last_result['retries'] = max_retries
    last_result['error'] = f"All {max_retries + 1} attempts failed: {last_result.get('error', 'Unknown')}"
    return last_result


def generate_alternative_xpath(xpath: str, attempt: int) -> Optional[str]:
    """
    生成替代 XPath 策略

    Args:
        xpath: 原始 XPath
        attempt: 重试次数

    Returns:
        str or None: 替代 XPath
    """
    import re

    if attempt == 0:
        # 策略 1: 使用 contains() 替代精确匹配
        match = re.search(r"@class\s*=\s*['\"]([^'\"]+)['\"]", xpath)
        if match:
            class_value = match.group(1)
            return xpath.replace(
                f"@class='{class_value}'",
                f"contains(@class, '{class_value.split()[0]}')"  # 使用第一个 class
            )

    elif attempt == 1:
        # 策略 2: 移除索引
        return re.sub(r'\[\d+\]', '', xpath)

    elif attempt == 2:
        # 策略 3: 使用更宽松的选择器
        return xpath.replace('//div[@', '//')

    return None
```

### 超时配置

**所有浏览器操作都应该设置合理的超时时间**：

```python
# XPath 验证超时（默认 5 秒）
validate_xpath(xpath="//div[@class='item']", timeout=5000)

# 元素查找超时（根据页面复杂度调整）
browser_get_elements_by_xpath(xpath="//ul/li", timeout=3000)

# 复杂页面可以增加超时
browser_get_elements_by_xpath(xpath="//div[@class='dynamic-content']", timeout=10000)
```

### DOM 分析错误处理

```python
def safe_browser_evaluate(js_code: str, timeout: int = 10000) -> Dict[str, Any]:
    """
    安全执行浏览器 JavaScript 评估，包含错误处理

    Args:
        js_code: JavaScript 代码
        timeout: 超时时间（毫秒）

    Returns:
        dict: {'success': bool, 'result': Any, 'error': Optional[str]}
    """
    try:
        result = browser_evaluate(js_code, timeout=timeout)
        return {
            'success': True,
            'result': result,
            'error': None
        }
    except TimeoutError:
        return {
            'success': False,
            'error': f'JavaScript evaluation timed out after {timeout}ms',
            'error_type': 'TIMEOUT'
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'JavaScript evaluation failed: {type(e).__name__}: {str(e)}',
            'error_type': 'EVALUATION_ERROR',
            'js_code_preview': js_code[:100]
        }
```

## 使用场景

- 从列表页抽取商品/文章/数据项
- 识别并验证翻页按钮
- 从详情页抽取结构化字段
- 验证 XPath 表达式的准确性和稳定性

## 核心原则

### 1. 验证优先

**任何 XPath 在输出前必须验证**：
```python
# 验证 XPath 是否匹配预期元素
result = browser_get_elements_by_xpath(xpath="//div[@class='item']")
assert len(result) > 0, "XPath 未匹配任何元素"
```

### 2. 稳定性优先

**优先级顺序**：
1. 稳定 ID: `@id='submit-btn'`
2. Data 属性：`@data-testid='product-card'`
3. 语义化 Class: `contains(@class, 'main-nav')`
4. 文本内容：`contains(text(), '提交')`
5. 结构位置：`//ul/li[1]` (最后选择)

### 3. 相对路径原则

**列表项内部必须使用相对路径**：
```xpath
# ✅ 正确 - 相对于列表项容器
contain_path: "//ul[@class='list']/li"
fields:
  - name: "title"
    xpath: ".//h3/text()"  # 相对路径，以 . 开头
  - name: "url"
    xpath: ".//a/@href"

# ❌ 错误 - 绝对路径
fields:
  - name: "title"
    xpath: "//div/h3/text()"  # 不是相对于列表项
```

## XPath 生成工作流

### 步骤 1: 获取页面快照

```python
# 导航并等待加载
browser_navigate(url="https://target-site.com/list")
browser_wait_for_load_state(state="networkidle")

# 获取页面结构
snapshot = browser_snapshot()
```

### 步骤 2: 识别列表容器

```python
# 分析可能的列表容器
list_containers = browser_evaluate("""
    () => {
        const candidates = [];
        
        // 常见列表容器选择器
        const selectors = [
            'ul', 'ol', 
            '.list', '.items', 
            '[role="list"]',
            '.products', '.articles',
            '[data-testid="list"]'
        ];
        
        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                const children = Array.from(el.children);
                // 至少 3 个子元素且结构相似
                if (children.length >= 3 && hasSimilarStructure(children)) {
                    candidates.push({
                        tag: el.tagName,
                        class: el.className,
                        id: el.id,
                        itemCount: children.length,
                        xpath: getXPath(el)
                    });
                }
            });
        });
        
        return candidates.sort((a, b) => b.itemCount - a.itemCount);
    }
    
    function hasSimilarStructure(elements) {
        if (elements.length < 3) return false;
        const firstTags = Array.from(elements[0].children).map(el => el.tagName);
        const matchCount = elements.slice(1).filter(el => {
            const tags = Array.from(el.children).map(e => e.tagName);
            return JSON.stringify(tags) === JSON.stringify(firstTags);
        }).length;
        return matchCount >= elements.length * 0.8;
    }
    
    function getXPath(element) {
        if (!element) return null;
        if (element.id) return `//*[@id="${element.id}"]`;
        
        const parts = [];
        let current = element;
        
        while (current && current.nodeType === Node.ELEMENT_NODE) {
            let index = 1;
            let sibling = current.previousElementSibling;
            while (sibling) {
                if (sibling.nodeName === current.nodeName) index++;
                sibling = sibling.previousElementSibling;
            }
            
            const tagName = current.nodeName.toLowerCase();
            const className = current.className ? `[@class="${current.className}"]` : '';
            parts.unshift(`${tagName}${className}[${index}]`);
            current = current.parentNode;
        }
        
        return '//' + parts.join('/');
    }
""")
```

### 步骤 3: 生成列表项 XPath

```python
# 对每个候选容器生成列表项 XPath
for container in list_containers:
    item_xpath = f"{container['xpath']}/li"
    
    # 验证 XPath
    items = browser_get_elements_by_xpath(xpath=item_xpath)
    
    if len(items) >= 3:
        print(f"✓ 找到列表项：{item_xpath}, 数量：{len(items)}")
        break
```

### 步骤 4: 分析列表项结构

```python
# 分析列表项内部结构
item_structure = browser_evaluate("""
    (itemXpath) => {
        const items = document.evaluate(
            itemXpath, 
            document, 
            null, 
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, 
            null
        );
        
        if (items.snapshotLength === 0) return null;
        
        const firstItem = items.snapshotItem(0);
        const structure = {
            children: [],
            links: [],
            images: [],
            textElements: []
        };
        
        // 分析子元素
        firstItem.querySelectorAll('*').forEach(el => {
            structure.children.push({
                tag: el.tagName,
                class: el.className,
                id: el.id,
                text: el.textContent.trim().substring(0, 50),
                xpath: getRelativeXPath(firstItem, el)
            });
            
            if (el.tagName === 'A') {
                structure.links.push({
                    class: el.className,
                    text: el.textContent.trim(),
                    href: el.href,
                    xpath: getRelativeXPath(firstItem, el)
                });
            }
            
            if (el.tagName === 'IMG') {
                structure.images.push({
                    class: el.className,
                    src: el.src,
                    alt: el.alt,
                    xpath: getRelativeXPath(firstItem, el)
                });
            }
        });
        
        return structure;
    }
    
    function getRelativeXPath(root, target) {
        const parts = [];
        let current = target;
        
        while (current && current !== root && current.parentNode) {
            let index = 1;
            let sibling = current.previousElementSibling;
            
            while (sibling) {
                if (sibling.nodeName === current.nodeName) index++;
                sibling = sibling.previousElementSibling;
            }
            
            const tagName = current.nodeName.toLowerCase();
            const className = current.className ? `[@class="${current.className}"]` : '';
            parts.unshift(`${tagName}${className}[${index}]`);
            current = current.parentNode;
        }
        
        return '.' + (parts.length > 0 ? '/' + parts.join('/') : '');
    }
""", item_xpath)
```

### 步骤 5: 生成字段 XPath

```python
# 基于列表项结构生成字段 XPath
def generate_field_xpaths(item_structure, item_xpath):
    fields = {}
    
    # 标题字段 - 优先查找 h1-h6, .title, 第一个文本元素
    title_candidates = [
        f"{item_xpath}//h1/text()",
        f"{item_xpath}//h2/text()",
        f"{item_xpath}//h3/text()",
        f"{item_xpath}//*[contains(@class, 'title')]/text()",
        f"{item_xpath}//*[contains(@class, 'name')]/text()",
    ]
    
    for xpath in title_candidates:
        result = browser_get_elements_by_xpath(xpath=xpath)
        if len(result) > 0:
            fields['title'] = {
                'xpath': get_relative_xpath(item_xpath, xpath),
                'verified': True
            }
            break
    
    # URL 字段 - 查找第一个链接
    url_xpath = f"{item_xpath}//a/@href"
    result = browser_get_elements_by_xpath(xpath=url_xpath)
    if len(result) > 0:
        fields['url'] = {
            'xpath': './/a/@href',
            'verified': True
        }
    
    # 图片字段
    img_xpath = f"{item_xpath}//img/@src"
    result = browser_get_elements_by_xpath(xpath=img_xpath)
    if len(result) > 0:
        fields['image'] = {
            'xpath': './/img/@src',
            'verified': True
        }
    
    return fields
```

### 步骤 6: 识别翻页区域

```python
# 翻页按钮识别
pagination_patterns = [
    # 文本模式
    "//a[contains(text(), '下一页')]",
    "//a[contains(text(), '下一项')]",
    "//button[contains(text(), '加载更多')]",
    "//span[contains(text(), '>')]",
    
    # Class 模式
    "//a[contains(@class, 'next')]",
    "//li[contains(@class, 'next')]//a",
    "//a[contains(@class, 'pagination-next')]",
    
    # 属性模式
    "//a[@rel='next']",
    "//link[@rel='next']/@href",
]

for xpath in pagination_patterns:
    result = browser_get_elements_by_xpath(xpath=xpath)
    if len(result) > 0:
        print(f"✓ 找到翻页按钮：{xpath}")
        pagination_xpath = xpath
        break
```

## XPath 验证流程

### 强制验证机制

```python
from typing import Dict, Any, List, Optional


def validate_xpath(
    xpath: str,
    expected_count: Optional[int] = None,
    description: str = "",
    timeout: int = 5000
) -> Dict[str, Any]:
    """
    验证 XPath 表达式，包含完整的错误处理

    Args:
        xpath: XPath 表达式
        expected_count: 期望匹配的元素数量（可选）
        description: 字段描述
        timeout: 超时时间（毫秒）

    Returns:
        dict: {'success': bool, 'count': int, 'error': Optional[str]}
    """
    try:
        # 验证 XPath 语法
        if not xpath or not isinstance(xpath, str):
            return {
                'success': False,
                'error': 'Invalid XPath: must be a non-empty string',
                'error_type': 'INVALID_INPUT'
            }

        # 执行 XPath 查询，设置超时
        elements = browser_get_elements_by_xpath(xpath=xpath, timeout=timeout)

        result = {
            'xpath': xpath,
            'description': description,
            'success': True,
            'count': len(elements),
            'elements': elements[:3],  # 仅返回前 3 个用于检查
            'error': None
        }

        # 检查是否匹配元素
        if len(elements) == 0:
            result['success'] = False
            result['error'] = 'XPath 未匹配任何元素'
            result['error_type'] = 'NO_MATCH'

        # 检查期望数量
        elif expected_count and len(elements) != expected_count:
            result['success'] = False
            result['error'] = f'期望匹配 {expected_count} 个元素，实际匹配 {len(elements)} 个'
            result['error_type'] = 'COUNT_MISMATCH'

        return result

    except TimeoutError as e:
        return {
            'success': False,
            'error': f'XPath validation timed out after {timeout}ms',
            'error_type': 'TIMEOUT',
            'xpath': xpath
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'XPath validation failed: {type(e).__name__}: {str(e)}',
            'error_type': 'VALIDATION_ERROR',
            'xpath': xpath
        }
```

### 验证重试机制

```python
def validate_with_retry(
    xpath: str,
    max_retries: int = 2,
    initial_timeout: int = 5000
) -> Dict[str, Any]:
    """
    验证失败时重试，调整 XPath 策略

    Args:
        xpath: XPath 表达式
        max_retries: 最大重试次数
        initial_timeout: 初始超时（毫秒）

    Returns:
        dict: 验证结果
    """
    last_result = None
    timeout = initial_timeout

    for attempt in range(max_retries + 1):
        result = validate_xpath(xpath, timeout=timeout)

        # 成功则直接返回
        if result['success']:
            result['retries'] = attempt
            return result

        last_result = result

        # 重试策略
        if attempt < max_retries:
            alternative_xpath = generate_alternative_xpath(xpath, attempt)
            if alternative_xpath:
                xpath = alternative_xpath
                # 增加超时
                timeout = int(timeout * 1.5)
                print(f"Attempt {attempt + 1} failed, trying alternative XPath: {xpath}")

    # 所有重试失败
    last_result['retries'] = max_retries
    last_result['error'] = f"All {max_retries + 1} attempts failed: {last_result.get('error', 'Unknown')}"
    return last_result


def generate_alternative_xpath(xpath: str, attempt: int) -> Optional[str]:
    """
    生成替代 XPath 策略

    Args:
        xpath: 原始 XPath
        attempt: 重试次数

    Returns:
        str or None: 替代 XPath
    """
    import re

    if attempt == 0:
        # 策略 1: 使用 contains() 替代精确匹配
        match = re.search(r"@class\s*=\s*['\"]([^'\"]+)['\"]", xpath)
        if match:
            class_value = match.group(1)
            return xpath.replace(
                f"@class='{class_value}'",
                f"contains(@class, '{class_value.split()[0]}')"  # 使用第一个 class
            )

    elif attempt == 1:
        # 策略 2: 移除索引
        return re.sub(r'\[\d+\]', '', xpath)

    elif attempt == 2:
        # 策略 3: 使用更宽松的选择器
        return xpath.replace('//div[@', '//')

    return None
```

## 输出格式

```yaml
element_extraction_report:
  url: "https://target-site.com/list"
  
  # 列表区域
  list_region:
    container:
      xpath: "//ul[@class='product-list']"
      verified: true
      item_count: 20
    
    item:
      xpath: "//ul[@class='product-list']/li"
      verified: true
    
    fields:
      - name: "title"
        xpath: ".//h3[@class='product-title']/text()"
        verified: true
        sample_value: "商品标题示例"
      
      - name: "url"
        xpath: ".//a[@class='product-link']/@href"
        verified: true
        sample_value: "https://target-site.com/product/123"
      
      - name: "price"
        xpath: ".//span[@class='price']/text()"
        verified: true
        sample_value: "¥99.00"
      
      - name: "image"
        xpath: ".//img[@class='product-image']/@src"
        verified: true
        sample_value: "https://cdn.example.com/img.jpg"
  
  # 翻页区域
  pagination:
    detected: true
    
    next_button:
      xpath: "//a[contains(text(), '下一页')]"
      verified: true
      type: "text_link"
    
    total_pages:
      xpath: "//span[@class='total-pages']/text()"
      verified: true
      sample_value: "50"
  
  # 验证状态
  verification_status:
    all_verified: true
    failed_xpaths: []
```

## 常见问题

### Q1: XPath 匹配多个元素怎么办？

**A**: 这是正常行为！列表项 XPath 应该匹配多个元素（每个列表项一个）。

```yaml
# ✅ 正确 - 列表项 XPath 匹配多个元素
item:
  xpath: "//ul[@class='list']/li"
  count: 20  # 匹配 20 个列表项
```

### Q2: 如何处理动态 Class 名？

**A**: 使用 `contains()` 或部分匹配：

```xpath
# ❌ 脆弱 - 精确匹配动态 class
//div[@class='css-1a2b3c-product-card']

# ✅ 稳定 - 部分匹配
//div[contains(@class, 'product-card')]
//div[contains(@class, 'product')]
```

### Q3: 如何提取相对路径？

**A**: 相对于列表项容器：

```yaml
contain_path: "//ul[@class='list']/li"
fields:
  - name: "title"
    xpath: ".//h3/text()"  # 注意开头的 .
```

## 最佳实践

### 1. 使用稳定属性

```python
# 优先级顺序
# 1. 稳定 ID
"//*[@id='product-list']"

# 2. Data 属性
"//*[@data-testid='product-card']"
"//*[@data-role='list-item']"

# 3. 语义化 Class
"//div[contains(@class, 'product-card')]"

# 4. 文本内容
"//a[contains(text(), '查看详情')]"
```

### 2. 避免的模式

```python
# ❌ 避免绝对路径
"/html/body/div[1]/div[2]/ul/li[1]/a"

# ✅ 使用后代选择器
"//ul[@class='list']//a"

# ❌ 避免动态内容
"//span[text()='价格：¥99']"  # 价格会变

# ✅ 使用稳定文本
"//button[contains(text(), '提交')]"  # 按钮文本通常稳定
```

### 3. 验证每个字段

```python
# 每个字段都必须单独验证
for field in fields:
    result = validate_xpath(field['xpath'])
    if not result['success']:
        # 重新生成 XPath
        field['xpath'] = regenerate_xpath(field['name'])
```

## 相关 Skills

- [`browser-dom-analyzer`](../browser-dom-analyzer/SKILL.md) - DOM 结构分析
- [`xpath-validator`](../xpath-validator/SKILL.md) - XPath 验证专家
- [`network-request-analyzer`](../network-request-analyzer/SKILL.md) - 网络请求分析
