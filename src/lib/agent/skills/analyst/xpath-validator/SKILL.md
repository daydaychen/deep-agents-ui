---
name: xpath-validator
description: XPath 验证专家，使用 browser_get_elements_by_xpath 强制验证所有 XPath 表达式，提供验证报告、稳定性评估和优化建议，确保 XPath 在实际采集中可靠工作。
---

# XPath Validator - XPath 验证专家

## 概述

本技能提供专家级 XPath 验证能力：
- **强制验证** - 所有 XPath 必须通过 `browser_get_elements_by_xpath` 验证
- **稳定性评估** - 评估 XPath 在页面更新后的稳定性
- **优化建议** - 为脆弱的 XPath 提供更稳定的替代方案
- **批量验证** - 同时验证多个 XPath 表达式

## 错误处理与容错

### XPath 验证错误处理

**所有 XPath 验证操作都必须包含完整的错误处理**：

```python
from typing import Dict, Any, List, Optional


def validate_xpath(
    xpath: str,
    description: str = "",
    timeout: int = 5000,
    expected_count: Optional[int] = None
) -> Dict[str, Any]:
    """
    基础 XPath 验证，包含完整的错误处理

    Args:
        xpath: XPath 表达式
        description: 字段描述
        timeout: 超时时间（毫秒）
        expected_count: 期望匹配的元素数量（可选）

    Returns:
        dict: {'status': str, 'matched_count': int, 'error': Optional[str]}
    """
    try:
        # 验证输入
        if not xpath or not isinstance(xpath, str):
            return {
                'xpath': xpath,
                'description': description,
                'status': 'failed',
                'matched_count': 0,
                'elements': [],
                'error': 'Invalid XPath: must be a non-empty string',
                'error_type': 'INVALID_INPUT'
            }

        # 执行 XPath 查询，设置超时
        elements = browser_get_elements_by_xpath(xpath=xpath, timeout=timeout)

        result = {
            'xpath': xpath,
            'description': description,
            'status': 'passed',
            'matched_count': len(elements),
            'elements': elements[:3],  # 仅返回前 3 个样本
            'error': None
        }

        # 检查是否匹配元素
        if len(elements) == 0:
            result['status'] = 'failed'
            result['error'] = 'XPath 未匹配任何元素'
            result['error_type'] = 'NO_MATCH'

        # 检查期望数量
        elif expected_count and len(elements) != expected_count:
            result['status'] = 'failed'
            result['error'] = f'期望匹配 {expected_count} 个元素，实际匹配 {len(elements)} 个'
            result['error_type'] = 'COUNT_MISMATCH'

        return result

    except TimeoutError as e:
        return {
            'xpath': xpath,
            'description': description,
            'status': 'failed',
            'matched_count': 0,
            'elements': [],
            'error': f'XPath validation timed out after {timeout}ms',
            'error_type': 'TIMEOUT'
        }
    except Exception as e:
        return {
            'xpath': xpath,
            'description': description,
            'status': 'failed',
            'matched_count': 0,
            'elements': [],
            'error': f'XPath validation failed: {type(e).__name__}: {str(e)}',
            'error_type': 'VALIDATION_ERROR'
        }
```

### 重试机制

**验证失败时尝试替代方案**：

```python
def validate_with_retry(
    xpath: str,
    max_retries: int = 3,
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
    import re

    last_result = None
    timeout = initial_timeout
    current_xpath = xpath

    for attempt in range(max_retries + 1):
        result = validate_xpath(current_xpath, timeout=timeout)

        # 成功则直接返回
        if result['status'] == 'passed':
            result['retries'] = attempt
            return result

        last_result = result

        # 重试策略
        if attempt < max_retries:
            alternative_xpath = generate_alternative_xpath(current_xpath, attempt)
            if alternative_xpath:
                current_xpath = alternative_xpath
                # 增加超时
                timeout = int(timeout * 1.5)
                print(f"Attempt {attempt + 1} failed, trying alternative XPath: {current_xpath}")

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
                f"contains(@class, '{class_value.split()[0]}')"
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
# 基础验证超时（默认 5 秒）
validate_xpath(xpath="//div[@class='item']", timeout=5000)

# 复杂页面增加超时
validate_xpath(xpath="//div[@class='dynamic-content']", timeout=10000)

# 批量验证使用较短超时
for xpath in xpath_list:
    validate_xpath(xpath, timeout=3000)
```

### 批量验证错误处理

```python
def batch_validate_xpaths(xpath_list: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    批量验证多个 XPath

    Args:
        xpath_list: XPath 列表 [{'name': 'title', 'xpath': '...'}, ...]

    Returns:
        dict: 批量验证结果
    """
    results = {
        'total': len(xpath_list),
        'passed': 0,
        'failed': 0,
        'warnings': 0,
        'details': [],
        'all_passed': True
    }

    for item in xpath_list:
        result = validate_with_retry(
            xpath=item['xpath'],
            max_retries=2
        )

        # 添加稳定性评估
        result['stability'] = evaluate_stability(item['xpath'])

        # 统计
        if result['status'] == 'passed':
            results['passed'] += 1
        elif result['status'] == 'warning':
            results['warnings'] += 1
        else:
            results['failed'] += 1
            results['all_passed'] = False

        results['details'].append(result)

    return results
```

## 核心原则

### 1. 验证优先

**任何 XPath 在输出前必须验证**：
```python
# 强制验证
result = browser_get_elements_by_xpath(xpath="//div[@class='item']")

if len(result) == 0:
    # 验证失败，必须重新分析
    raise XPathValidationError(f"XPath 未匹配任何元素：{xpath}")
```

### 2. 失败重试

**验证失败时尝试替代方案**：
```python
# 重试策略
if validation_failed:
    # 尝试 1: 使用 contains() 替代精确匹配
    # 尝试 2: 移除索引
    # 尝试 3: 使用更宽松的选择器
```

### 3. 详细报告

**记录所有验证结果**：
```yaml
verification_status:
  all_verified: true
  failed_xpaths: []
  verification_details:
    - xpath: "//div[@class='item']"
      status: "passed"
      matched_count: 20
```

## 验证流程

### 步骤 1: 基础验证

```python
from typing import Dict, Any, List, Optional


def validate_xpath(
    xpath: str,
    description: str = "",
    timeout: int = 5000,
    expected_count: Optional[int] = None
) -> Dict[str, Any]:
    """
    基础 XPath 验证，包含完整的错误处理

    Args:
        xpath: XPath 表达式
        description: 字段描述
        timeout: 超时时间（毫秒）
        expected_count: 期望匹配的元素数量（可选）

    Returns:
        dict: {'status': str, 'matched_count': int, 'error': Optional[str]}
    """
    try:
        # 验证输入
        if not xpath or not isinstance(xpath, str):
            return {
                'xpath': xpath,
                'description': description,
                'status': 'failed',
                'matched_count': 0,
                'elements': [],
                'error': 'Invalid XPath: must be a non-empty string',
                'error_type': 'INVALID_INPUT'
            }

        # 执行 XPath 查询，设置超时
        elements = browser_get_elements_by_xpath(xpath=xpath, timeout=timeout)

        result = {
            'xpath': xpath,
            'description': description,
            'status': 'passed',
            'matched_count': len(elements),
            'elements': elements[:3],  # 仅返回前 3 个样本
            'error': None
        }

        # 检查是否匹配元素
        if len(elements) == 0:
            result['status'] = 'failed'
            result['error'] = 'XPath 未匹配任何元素'
            result['error_type'] = 'NO_MATCH'

        # 检查期望数量
        elif expected_count and len(elements) != expected_count:
            result['status'] = 'failed'
            result['error'] = f'期望匹配 {expected_count} 个元素，实际匹配 {len(elements)} 个'
            result['error_type'] = 'COUNT_MISMATCH'

        return result

    except TimeoutError as e:
        return {
            'xpath': xpath,
            'description': description,
            'status': 'failed',
            'matched_count': 0,
            'elements': [],
            'error': f'XPath validation timed out after {timeout}ms',
            'error_type': 'TIMEOUT'
        }
    except Exception as e:
        return {
            'xpath': xpath,
            'description': description,
            'status': 'failed',
            'matched_count': 0,
            'elements': [],
            'error': f'XPath validation failed: {type(e).__name__}: {str(e)}',
            'error_type': 'VALIDATION_ERROR'
        }
```

### 步骤 2: 内容验证

```python
def validate_with_content(
    xpath: str,
    expected_type: Optional[str] = None,
    min_count: Optional[int] = None,
    timeout: int = 5000
) -> Dict[str, Any]:
    """
    带内容检查的验证

    Args:
        xpath: XPath 表达式
        expected_type: 期望的内容类型 (text, url, image, number)
        min_count: 最小匹配数量
        timeout: 超时时间（毫秒）

    Returns:
        dict: 验证结果
    """
    # 先进行基础验证
    result = validate_xpath(xpath, timeout=timeout)

    if result['status'] == 'failed':
        return result

    # 检查匹配数量
    if min_count and result['matched_count'] < min_count:
        result['status'] = 'warning'
        result['warning'] = f"仅匹配 {result['matched_count']} 个元素，期望至少 {min_count} 个"

    # 检查内容类型
    if expected_type and result['elements']:
        content_check = check_content_type(xpath, expected_type)
        if not content_check['valid']:
            result['status'] = 'failed'
            result['error'] = content_check['error']
            result['error_type'] = 'TYPE_MISMATCH'

    return result


def check_content_type(xpath: str, expected_type: str) -> Dict[str, Any]:
    """
    检查提取的内容类型是否符合预期

    Args:
        xpath: XPath 表达式
        expected_type: 期望的类型

    Returns:
        dict: {'valid': bool, 'error': Optional[str]}
    """
    try:
        elements = browser_get_elements_by_xpath(xpath=xpath)

        if not elements:
            return {'valid': False, 'error': 'XPath 未匹配任何元素'}

        # 获取第一个元素的内容
        first_element = elements[0]
        content = first_element.get('text', '')

        # 检查内容
        if expected_type == 'text':
            if not content or not content.strip():
                return {'valid': False, 'error': '提取的内容为空'}

        elif expected_type == 'url':
            href = first_element.get('attr', {}).get('href', '')
            if not href or not href.startswith(('http://', 'https://', '/')):
                return {'valid': False, 'error': '提取的内容不是有效的 URL'}

        elif expected_type == 'image':
            src = first_element.get('attr', {}).get('src', '')
            if not src:
                return {'valid': False, 'error': '提取的内容不是有效的图片 URL'}

        elif expected_type == 'number':
            import re
            if not re.search(r'\d+', content):
                return {'valid': False, 'error': '提取的内容不包含数字'}

        return {'valid': True}

    except Exception as e:
        return {'valid': False, 'error': f'Content check failed: {str(e)}'}
```

### 步骤 3: 稳定性评估

```python
def evaluate_stability(xpath):
    """
    评估 XPath 的稳定性
    
    稳定性评分标准：
    - 100: 使用稳定 ID 或 data-* 属性
    - 80: 使用语义化 class
    - 60: 使用文本内容
    - 40: 使用结构位置
    - 20: 使用绝对路径或动态 class
    """
    import re
    
    score = 0
    issues = []
    suggestions = []
    
    # 检查是否使用稳定 ID
    if re.search(r'@\s*id\s*=', xpath):
        id_match = re.search(r'@\s*id\s*=\s*[\'"]([^\'"]+)[\'"]', xpath)
        if id_match:
            id_value = id_match.group(1)
            if is_stable_id(id_value):
                score = 100
                suggestions.append("✓ 使用稳定 ID")
            else:
                score = 40
                issues.append(f"ID 可能不稳定：{id_value}")
                suggestions.append("考虑使用 data-* 属性")
    
    # 检查是否使用 data-* 属性
    elif re.search(r'@\s*data-[\w-]+\s*=', xpath):
        score = 90
        suggestions.append("✓ 使用 data-* 属性")
    
    # 检查是否使用语义化 class
    elif re.search(r'contains\s*\(\s*@class', xpath):
        class_match = re.search(r"contains\s*\(\s*@class,\s*['\"]([^'\"]+)['\"]", xpath)
        if class_match:
            class_value = class_match.group(1)
            if is_semantic_class(class_value):
                score = 80
                suggestions.append("✓ 使用语义化 class")
            else:
                score = 50
                issues.append(f"class 可能不稳定：{class_value}")
    
    # 检查是否使用精确 class 匹配（不稳定）
    elif re.search(r'@class\s*=\s*[\'"][^\'"]+[\'"]', xpath):
        score = 30
        issues.append("精确 class 匹配可能不稳定")
        suggestions.append("改用 contains(@class, 'value')")
    
    # 检查是否使用绝对路径
    elif xpath.startswith('/html/body'):
        score = 20
        issues.append("绝对路径非常脆弱")
        suggestions.append("使用 // 后代选择器")
    
    # 检查是否使用动态索引
    elif re.search(r'\[\d+\]', xpath):
        score = max(score, 40)
        issues.append("索引可能随页面变化")
        suggestions.append("使用属性选择器替代索引")
    
    return {
        'xpath': xpath,
        'stability_score': score,
        'level': get_stability_level(score),
        'issues': issues,
        'suggestions': suggestions
    }


def is_stable_id(id_value):
    """
    判断 ID 是否稳定
    """
    # 稳定 ID 模式
    stable_patterns = [
        r'^[a-z][a-z0-9-]*$',  # 语义化 ID
        r'^[\w-]+-list$',  # xxx-list
        r'^[\w-]+-container$',  # xxx-container
        r'^[\w-]+-item$',  # xxx-item
    ]
    
    # 不稳定 ID 模式
    unstable_patterns = [
        r'^comp-',  # 组件 ID
        r'^id-uuid-',  # UUID
        r'^[a-z0-9]{32}$',  # MD5
        r'^css-',  # CSS 生成
    ]
    
    for pattern in unstable_patterns:
        if re.match(pattern, id_value):
            return False
    
    for pattern in stable_patterns:
        if re.match(pattern, id_value):
            return True
    
    return True  # 默认认为稳定


def is_semantic_class(class_value):
    """
    判断 class 是否语义化
    """
    # 语义化 class 关键词
    semantic_keywords = [
        'header', 'footer', 'nav', 'main', 'content',
        'list', 'item', 'card', 'grid', 'container',
        'title', 'name', 'price', 'image', 'link',
        'button', 'form', 'input', 'submit'
    ]
    
    class_lower = class_value.lower()
    
    for keyword in semantic_keywords:
        if keyword in class_lower:
            return True
    
    return False


def get_stability_level(score):
    """
    获取稳定性等级
    """
    if score >= 90:
        return 'excellent'
    elif score >= 70:
        return 'good'
    elif score >= 50:
        return 'fair'
    elif score >= 30:
        return 'poor'
    else:
        return 'critical'
```

### 步骤 4: 优化建议

```python
def suggest_optimization(xpath, validation_result):
    """
    为失败的 XPath 提供优化建议
    """
    suggestions = []
    
    # 如果未匹配任何元素
    if validation_result['matched_count'] == 0:
        suggestions.append({
            'type': 'expand_search',
            'description': '扩大搜索范围',
            'alternatives': [
                xpath.replace('@class=', "contains(@class, '"),
                xpath.replace('[1]', ''),  # 移除索引
                xpath.replace('/text()', ''),  # 匹配元素而非文本
            ]
        })
    
    # 如果匹配太多元素
    elif validation_result['matched_count'] > 100:
        suggestions.append({
            'type': 'narrow_search',
            'description': '缩小搜索范围',
            'alternatives': [
                xpath.replace('//', '//div[@id="main"]//'),  # 添加容器限制
            ]
        })
    
    # 检查是否可以使用更稳定的选择器
    stability = evaluate_stability(xpath)
    if stability['stability_score'] < 70:
        suggestions.append({
            'type': 'improve_stability',
            'description': '提高稳定性',
            'suggestions': stability['suggestions']
        })
    
    return suggestions
```

## 批量验证

```python
def batch_validate_xpaths(xpath_list):
    """
    批量验证多个 XPath
    
    Args:
        xpath_list: XPath 列表 [{'name': 'title', 'xpath': '...'}, ...]
    
    Returns:
        dict: 批量验证结果
    """
    results = {
        'total': len(xpath_list),
        'passed': 0,
        'failed': 0,
        'warnings': 0,
        'details': []
    }
    
    for item in xpath_list:
        result = validate_with_content(
            xpath=item['xpath'],
            expected_type=item.get('extract_type'),
            min_count=item.get('min_count', 1)
        )
        
        # 添加稳定性评估
        result['stability'] = evaluate_stability(item['xpath'])
        
        # 统计
        if result['status'] == 'passed':
            results['passed'] += 1
        elif result['status'] == 'warning':
            results['warnings'] += 1
        else:
            results['failed'] += 1
        
        results['details'].append(result)
    
    results['all_passed'] = results['failed'] == 0
    
    return results
```

## 输出格式

```yaml
xpath_verification_report:
  url: "https://target-site.com/list"
  verification_time: "2026-03-03T10:30:00Z"
  
  # 总体状态
  summary:
    total_xpaths: 10
    passed: 10
    failed: 0
    warnings: 0
    all_verified: true
  
  # 详细验证结果
  details:
    - field: "title"
      xpath: ".//h3[@class='product-title']/text()"
      status: "passed"
      matched_count: 20
      sample_values:
        - "商品标题 1"
        - "商品标题 2"
        - "商品标题 3"
      stability:
        score: 80
        level: "good"
        suggestions:
          - "✓ 使用语义化 class"
    
    - field: "url"
      xpath: ".//a[@class='product-link']/@href"
      status: "passed"
      matched_count: 20
      sample_values:
        - "https://target-site.com/product/1"
        - "https://target-site.com/product/2"
      stability:
        score: 80
        level: "good"
    
    - field: "price"
      xpath: ".//span[@class='price']/text()"
      status: "passed"
      matched_count: 20
      sample_values:
        - "¥99.00"
        - "¥158.00"
      stability:
        score: 80
        level: "good"
  
  # 失败处理（如果有）
  failed_xpaths: []
  
  # 优化建议
  recommendations:
    - "所有 XPath 验证通过，稳定性良好"
    - "建议定期重新验证以确保稳定性"
```

## 常见问题

### Q1: XPath 验证失败怎么办？

**A**: 按以下步骤处理：
1. 检查 XPath 语法是否正确
2. 使用 `browser_snapshot` 重新分析页面结构
3. 尝试使用 `contains()` 替代精确匹配
4. 移除索引使用属性选择器

### Q2: 如何验证相对 XPath？

**A**: 相对于列表项容器验证：
```python
# 先验证容器
container = validate_xpath("//ul[@class='list']/li")

# 再验证相对路径
title = validate_xpath(".//h3/text()", context=container['elements'][0])
```

### Q3: 如何处理动态加载内容？

**A**: 等待内容加载后再验证：
```python
# 等待动态内容
browser_wait_for_function("""
    () => document.querySelectorAll('.product-item').length > 0
""")

# 然后验证
result = validate_xpath("//div[@class='product-item']")
```

## 最佳实践

### 1. 验证每个字段

```python
# ✅ 正确 - 每个字段都验证
for field in fields:
    result = validate_xpath(field['xpath'])
    assert result['status'] == 'passed'

# ❌ 错误 - 不验证直接输出
for field in fields:
    print(field['xpath'])  # 未验证
```

### 2. 记录验证样本

```yaml
# ✅ 正确 - 记录样本值
verification:
  status: "passed"
  sample_values:
    - "样本 1"
    - "样本 2"

# ❌ 错误 - 仅记录状态
verification:
  status: "passed"
```

### 3. 定期重新验证

```python
# 在采集前重新验证关键 XPath
def pre_scrape_validation():
    critical_xpaths = [
        {'name': 'list_container', 'xpath': '//ul[@class="list"]'},
        {'name': 'next_button', 'xpath': '//a[contains(text(), "下一页")]'}
    ]
    return batch_validate_xpaths(critical_xpaths)
```

## 相关 Skills

- [`element-extractor`](../element-extractor/SKILL.md) - 元素抽取专家
- [`browser-dom-analyzer`](../browser-dom-analyzer/SKILL.md) - DOM 结构分析
