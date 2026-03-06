---
name: jsonpath-validator
description: JSONPath 验证专家，验证 API 响应中的 JSONPath 表达式，分析 JSON 结构，提供路径优化建议，确保 JSONPath 在动态 JSON 结构中的稳定性。
---

# JSONPath Validator - JSONPath 验证专家

## 概述

本技能提供专家级 JSONPath 验证能力：
- **JSONPath 验证** - 验证 JSONPath 在 API 响应中的正确性
- **JSON 结构分析** - 分析嵌套结构、数组位置、字段类型
- **路径优化** - 为脆弱的 JSONPath 提供更稳定的替代方案
- **动态结构处理** - 处理 JSON 结构变化的情况

## 错误处理与容错

### API 响应错误处理

**获取和解析 API 响应时必须包含完整的错误处理**：

```python
import json
from json import JSONDecodeError
from typing import Dict, Any, Optional
import time


def get_api_response(
    request_id: str,
    timeout: int = 30,
    max_retries: int = 3
) -> Dict[str, Any]:
    """
    获取 API 响应数据，包含完整的错误处理和重试机制

    Args:
        request_id: 请求 ID
        timeout: 超时时间（秒）
        max_retries: 最大重试次数

    Returns:
        dict: {'success': bool, 'data': Optional[dict], 'error': Optional[str]}
    """
    last_error = None
    delay = 1.0

    for attempt in range(max_retries + 1):
        try:
            # 获取网络响应
            response = browser_get_network_response(request_id=request_id)

            # 检查响应是否存在
            if not response:
                return {
                    'success': False,
                    'error': 'No response received',
                    'error_type': 'NETWORK_ERROR'
                }

            # 检查响应状态码
            status_code = response.get('status_code', 0)
            if status_code >= 400:
                # 5xx 错误可以重试
                if 500 <= status_code < 600 and attempt < max_retries:
                    time.sleep(delay)
                    delay *= 2
                    continue

                return {
                    'success': False,
                    'error': f'HTTP Error: {status_code}',
                    'error_type': 'HTTP_ERROR',
                    'status_code': status_code
                }

            # 获取响应体
            body = response.get('body', '')
            if not body:
                return {
                    'success': False,
                    'error': 'Empty response body',
                    'error_type': 'EMPTY_RESPONSE'
                }

            # 解析 JSON
            try:
                json_data = json.loads(body)
            except JSONDecodeError as e:
                return {
                    'success': False,
                    'error': f'Invalid JSON: {str(e)}',
                    'error_type': 'JSON_PARSE_ERROR',
                    'raw_body': body[:500]
                }

            return {
                'success': True,
                'data': json_data,
                'headers': response.get('responseHeaders', {}),
                'status_code': status_code,
                'retries': attempt
            }

        except TimeoutError as e:
            last_error = {
                'success': False,
                'error': f'Request timed out after {timeout}s',
                'error_type': 'TIMEOUT'
            }
        except Exception as e:
            last_error = {
                'success': False,
                'error': f'Unexpected error: {type(e).__name__}: {str(e)}',
                'error_type': 'UNKNOWN_ERROR'
            }

        # 重试前等待
        if attempt < max_retries:
            time.sleep(delay)
            delay *= 2

    # 所有重试失败
    if last_error:
        last_error['retries'] = max_retries
    return last_error
```

### 安全提取函数

**处理缺失字段和空值**：

```python
from typing import Any, Optional
import jsonpath_ng


def safe_extract(
    json_data: Dict[str, Any],
    jsonpath: str,
    default: Any = None,
    first_only: bool = True
) -> Any:
    """
    安全提取 JSONPath，处理缺失字段和错误

    Args:
        json_data: JSON 数据
        jsonpath: JSONPath 表达式
        default: 默认值（当路径不存在时）
        first_only: 是否只返回第一个匹配值

    Returns:
        Any: 提取的值或默认值
    """
    try:
        # 验证输入
        if json_data is None:
            return default

        # 解析并执行 JSONPath
        expr = jsonpath_ng.parse(jsonpath)
        results = expr.find(json_data)

        # 没有匹配结果
        if not results:
            return default

        # 返回第一个或所有匹配值
        if first_only:
            return results[0].value
        else:
            return [r.value for r in results]

    except Exception as e:
        # 记录错误但返回默认值
        print(f"Warning: Failed to extract {jsonpath}: {str(e)}")
        return default
```

### JSONPath 验证错误处理

```python
def validate_jsonpath_safe(
    json_data: Dict[str, Any],
    jsonpath: str,
    description: str = "",
    expected_type: Optional[str] = None
) -> Dict[str, Any]:
    """
    安全的 JSONPath 验证，包含类型检查

    Args:
        json_data: JSON 数据
        jsonpath: JSONPath 表达式
        description: 字段描述
        expected_type: 期望的类型（string, number, boolean, object, array）

    Returns:
        dict: {'success': bool, 'values': list, 'error': Optional[str]}
    """
    try:
        # 验证输入
        if not isinstance(json_data, (dict, list)):
            return {
                'success': False,
                'error': 'Invalid JSON data: must be dict or list',
                'error_type': 'INVALID_INPUT'
            }

        # 解析并执行 JSONPath
        expr = jsonpath_ng.parse(jsonpath)
        results = expr.find(json_data)

        # 没有匹配结果
        if not results:
            return {
                'success': False,
                'error': 'JSONPath 未匹配任何数据',
                'error_type': 'NO_MATCH',
                'jsonpath': jsonpath
            }

        # 提取值
        values = [r.value for r in results[:5]]  # 只返回前 5 个样本

        # 类型检查
        if expected_type:
            first_value = values[0]
            type_checks = {
                'string': lambda v: isinstance(v, str),
                'number': lambda v: isinstance(v, (int, float)),
                'boolean': lambda v: isinstance(v, bool),
                'object': lambda v: isinstance(v, dict),
                'array': lambda v: isinstance(v, list),
            }

            check_func = type_checks.get(expected_type)
            if check_func and not check_func(first_value):
                return {
                    'success': False,
                    'error': f'期望类型 {expected_type}，实际类型 {type(first_value).__name__}',
                    'error_type': 'TYPE_MISMATCH',
                    'values': values
                }

        return {
            'success': True,
            'jsonpath': jsonpath,
            'description': description,
            'matched_count': len(results),
            'values': values,
            'error': None
        }

    except Exception as e:
        return {
            'success': False,
            'error': f'JSONPath validation failed: {type(e).__name__}: {str(e)}',
            'error_type': 'VALIDATION_ERROR',
            'jsonpath': jsonpath
        }
```

## 核心原则

### 1. 实证验证

**所有 JSONPath 必须基于实际 API 响应验证**：
```python
# 获取实际响应
response = browser_get_network_response(request_id)
json_data = json.loads(response['body'])

# 验证 JSONPath
results = jsonpath_ng.parse(jsonpath).find(json_data)
assert len(results) > 0, f"JSONPath 未匹配任何数据：{jsonpath}"
```

### 2. 结构感知

**理解 JSON 结构层次**：
```
$                      # 根节点
├── data               # 数据容器
│   ├── items[*]       # 列表数组
│   │   ├── id         # 字段
│   │   ├── title      # 字段
│   │   └── price      # 字段
│   └── total          # 总数
└── meta               # 元数据
    └── page           # 页码
```

### 3. 容错处理

**处理缺失字段和空值**：
```python
def safe_extract(json_data, jsonpath, default=None):
    """
    安全提取 JSONPath，处理缺失字段
    """
    try:
        results = jsonpath_ng.parse(jsonpath).find(json_data)
        return results[0].value if results else default
    except:
        return default
```

## JSONPath 基础

### 语法规范

```python
# JSONPath 语法示例
syntax_examples = {
    # 基础路径
    '$.data': '访问 data 字段',
    '$.data.items': '访问 data.items 路径',
    
    # 数组访问
    '$.data.items[0]': '访问第一个元素',
    '$.data.items[-1]': '访问最后一个元素',
    '$.data.items[*]': '访问所有元素（通配符）',
    
    # 递归下降
    '$..title': '递归查找所有 title 字段',
    
    # 数组切片
    '$.data.items[0:10]': '访问前 10 个元素',
    '$.data.items[::2]': '访问偶数索引元素',
    
    # 过滤器
    '$.data.items[?(@.price > 100)]': '过滤价格>100 的元素',
    '$.data.items[?(@.category == "electronics")]' '过滤分类',
    
    # 多路径
    '$.data.items[*].title, $.data.items[*].price': '多个字段',
}
```

### 常用库

```python
# Python JSONPath 库
# 1. jsonpath-ng (推荐)
import jsonpath_ng
import jsonpath_ng.ext

# 2. jsonpath-rw
import jsonpath_rw

# 3. jsonpath (纯 Python 实现)
import jsonpath
```

## 验证流程

### 步骤 1: 获取 API 响应

```python
def get_api_response(request_id):
    """
    获取 API 响应数据
    """
    response = browser_get_network_response(request_id=request_id)
    
    # 解析 JSON
    try:
        json_data = json.loads(response['body'])
        return {
            'success': True,
            'data': json_data,
            'headers': response.get('headers', {}),
            'status_code': response.get('status_code', 200)
        }
    except json.JSONDecodeError as e:
        return {
            'success': False,
            'error': f"JSON 解析失败：{str(e)}",
            'raw_body': response.get('body', '')
        }
```

### 步骤 2: 基础验证

```python
from typing import Dict, Any, Optional, List
import jsonpath_ng


def validate_jsonpath(
    json_data: Dict[str, Any],
    jsonpath: str,
    description: str = ""
) -> Dict[str, Any]:
    """
    基础 JSONPath 验证，包含完整的错误处理

    Args:
        json_data: JSON 数据（dict 或 list）
        jsonpath: JSONPath 表达式
        description: 字段描述

    Returns:
        dict: {'status': str, 'matched_count': int, 'values': list, 'error': Optional[str]}
    """
    try:
        # 验证输入
        if not isinstance(json_data, (dict, list)):
            return {
                'jsonpath': jsonpath,
                'description': description,
                'status': 'failed',
                'matched_count': 0,
                'values': [],
                'error': 'Invalid JSON data: must be dict or list',
                'error_type': 'INVALID_INPUT'
            }

        # 验证 JSONPath 语法
        if not jsonpath or not isinstance(jsonpath, str):
            return {
                'jsonpath': jsonpath,
                'description': description,
                'status': 'failed',
                'matched_count': 0,
                'values': [],
                'error': 'Invalid JSONPath: must be a non-empty string',
                'error_type': 'INVALID_INPUT'
            }

        # 解析并执行 JSONPath
        expr = jsonpath_ng.parse(jsonpath)
        results = expr.find(json_data)

        status_result = {
            'jsonpath': jsonpath,
            'description': description,
            'status': 'passed' if results else 'failed',
            'matched_count': len(results),
            'values': [r.value for r in results[:5]],  # 返回前 5 个样本
            'error': None
        }

        # 没有匹配结果
        if not results:
            status_result['error'] = 'JSONPath 未匹配任何数据'
            status_result['error_type'] = 'NO_MATCH'

        return status_result

    except jsonpath_ng.exceptions.JsonPathParserError as e:
        return {
            'jsonpath': jsonpath,
            'description': description,
            'status': 'failed',
            'matched_count': 0,
            'values': [],
            'error': f'JSONPath syntax error: {str(e)}',
            'error_type': 'SYNTAX_ERROR'
        }
    except Exception as e:
        return {
            'jsonpath': jsonpath,
            'description': description,
            'status': 'failed',
            'matched_count': 0,
            'values': [],
            'error': f'Unexpected error: {type(e).__name__}: {str(e)}',
            'error_type': 'UNKNOWN_ERROR'
        }
```

### 步骤 3: 内容验证

```python
def validate_with_content(
    json_data: Dict[str, Any],
    jsonpath: str,
    expected_type: Optional[str] = None,
    min_count: Optional[int] = None
) -> Dict[str, Any]:
    """
    带内容检查的验证

    Args:
        json_data: JSON 数据
        jsonpath: JSONPath 表达式
        expected_type: 期望的内容类型 (text, url, image, number)
        min_count: 最小匹配数量
    """
    # 先进行基础验证
    result = validate_jsonpath(json_data, jsonpath)

    if result['status'] == 'failed':
        return result

    # 检查匹配数量
    if min_count and result['matched_count'] < min_count:
        result['status'] = 'warning'
        result['warning'] = f"仅匹配 {result['matched_count']} 个元素，期望至少 {min_count} 个"

    # 检查内容类型
    if expected_type and result['values']:
        first_value = result['values'][0]
        type_checks = {
            'string': lambda v: isinstance(v, str),
            'number': lambda v: isinstance(v, (int, float)),
            'boolean': lambda v: isinstance(v, bool),
            'object': lambda v: isinstance(v, dict),
            'array': lambda v: isinstance(v, list),
            'url': lambda v: isinstance(v, str) and v.startswith(('http://', 'https://', '/')),
            'image': lambda v: isinstance(v, str) and any(ext in v.lower() for ext in ['.jpg', '.png', '.gif', '.webp']),
        }

        check_func = type_checks.get(expected_type)
        if check_func and not check_func(first_value):
            result['status'] = 'failed'
            result['error'] = f"期望类型 {expected_type}，实际类型 {type(first_value).__name__}"
            result['error_type'] = 'TYPE_MISMATCH'

    return result
```

### 步骤 4: 结构分析

```python
def analyze_json_structure(json_data):
    """
    分析 JSON 结构，识别列表位置和字段
    
    Returns:
        dict: 结构分析报告
    """
    analysis = {
        'root_type': type(json_data).__name__,
        'root_keys': list(json_data.keys()) if isinstance(json_data, dict) else [],
        'arrays': [],
        'nested_objects': [],
        'suggested_list_path': None,
        'suggested_total_path': None
    }
    
    def traverse(obj, path='$', depth=0):
        if depth > 10:  # 限制深度
            return
        
        if isinstance(obj, dict):
            for key, value in obj.items():
                current_path = f"{path}.{key}"
                
                if isinstance(value, list):
                    analysis['arrays'].append({
                        'path': current_path,
                        'length': len(value),
                        'item_type': type(value[0]).__name__ if value else 'empty',
                        'sample_keys': list(value[0].keys()) if value and isinstance(value[0], dict) else []
                    })
                    
                    # 判断是否可能是数据列表
                    if len(value) > 0 and isinstance(value[0], dict):
                        if analysis['suggested_list_path'] is None:
                            analysis['suggested_list_path'] = f"{current_path}[*]"
                
                elif isinstance(value, dict):
                    analysis['nested_objects'].append({
                        'path': current_path,
                        'keys': list(value.keys())
                    })
                    traverse(value, current_path, depth + 1)
                
                # 检测总数字段
                if key.lower() in ['total', 'count', 'totalcount', 'total_count']:
                    analysis['suggested_total_path'] = current_path
        
        elif isinstance(obj, list):
            if path == '$':
                analysis['suggested_list_path'] = "$[*]"
            
            for i, item in enumerate(obj[:1]):  # 只分析第一个元素
                traverse(item, f"{path}[*]", depth + 1)
    
    traverse(json_data)
    
    return analysis
```

### 步骤 5: 生成 JSONPath

```python
def generate_jsonpaths(json_data, list_path=None):
    """
    基于 JSON 结构生成字段 JSONPath
    
    Args:
        json_data: JSON 数据
        list_path: 列表路径（如 $.data.items[*]）
    
    Returns:
        dict: 字段 JSONPath 映射
    """
    fields = {}
    
    # 如果没有指定列表路径，使用建议的路径
    if not list_path:
        analysis = analyze_json_structure(json_data)
        list_path = analysis.get('suggested_list_path', '$[*]')
    
    # 获取列表项样本
    list_expr = jsonpath_ng.parse(list_path)
    list_results = list_expr.find(json_data)
    
    if not list_results:
        return fields
    
    # 取第一个元素分析字段
    sample_item = list_results[0].value
    
    if not isinstance(sample_item, dict):
        return fields
    
    # 为每个字段生成 JSONPath
    for key, value in sample_item.items():
        # 构建字段 JSONPath
        field_path = f"{list_path}.{key}"
        
        # 判断提取类型
        if isinstance(value, str):
            extract_type = 'text'
        elif isinstance(value, (int, float)):
            extract_type = 'number'
        elif isinstance(value, bool):
            extract_type = 'boolean'
        elif isinstance(value, dict):
            extract_type = 'object'
        elif isinstance(value, list):
            extract_type = 'array'
        else:
            extract_type = 'text'
        
        fields[key] = {
            'jsonpath': field_path,
            'extract_type': extract_type,
            'sample_value': value,
            'verified': False  # 待验证
        }
    
    return fields
```

### 步骤 6: 稳定性评估

```python
def evaluate_jsonpath_stability(jsonpath, json_data):
    """
    评估 JSONPath 的稳定性
    
    稳定性评分标准：
    - 100: 直接路径，无通配符
    - 80: 使用 [*] 通配符
    - 60: 使用递归下降 ..
    - 40: 使用过滤器 [?()]
    - 20: 使用绝对索引 [0]
    """
    import re
    
    score = 100
    issues = []
    suggestions = []
    
    # 检查绝对索引
    if re.search(r'\[\d+\]', jsonpath):
        score -= 30
        issues.append("使用绝对索引，结构变化时会失效")
        suggestions.append("考虑使用 [*] 通配符")
    
    # 检查递归下降
    if '..' in jsonpath:
        score -= 20
        issues.append("递归下降可能匹配意外节点")
        suggestions.append("使用明确的路径")
    
    # 检查过滤器
    if '[?(' in jsonpath:
        score -= 15
        issues.append("过滤器依赖特定值")
        suggestions.append("确保过滤条件稳定")
    
    # 检查切片
    if re.search(r'\[\d+:\d+\]', jsonpath):
        score -= 10
        issues.append("切片可能遗漏数据")
    
    # 验证路径存在
    try:
        expr = jsonpath_ng.parse(jsonpath)
        results = expr.find(json_data)
        if not results:
            score = 0
            issues.append("JSONPath 未匹配任何数据")
    except Exception as e:
        score = 0
        issues.append(f"JSONPath 语法错误：{str(e)}")
    
    return {
        'jsonpath': jsonpath,
        'stability_score': max(0, score),
        'level': get_stability_level(score),
        'issues': issues,
        'suggestions': suggestions
    }


def get_stability_level(score):
    """获取稳定性等级"""
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

## 批量验证

```python
def batch_validate_jsonpaths(json_data, jsonpath_list):
    """
    批量验证多个 JSONPath
    
    Args:
        json_data: JSON 数据
        jsonpath_list: JSONPath 列表
    
    Returns:
        dict: 批量验证结果
    """
    results = {
        'total': len(jsonpath_list),
        'passed': 0,
        'failed': 0,
        'warnings': 0,
        'details': []
    }
    
    for item in jsonpath_list:
        result = validate_with_content(
            json_data=json_data,
            jsonpath=item['jsonpath'],
            expected_type=item.get('extract_type'),
            min_count=item.get('min_count', 1)
        )
        
        # 添加稳定性评估
        result['stability'] = evaluate_jsonpath_stability(
            item['jsonpath'],
            json_data
        )
        
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
jsonpath_verification_report:
  url: "https://api.target-site.com/products"
  verification_time: "2026-03-03T10:30:00Z"
  
  # JSON 结构分析
  json_structure:
    root_keys:
      - "data"
      - "meta"
      - "total"
    
    arrays:
      - path: "$.data.items"
        length: 20
        item_type: "object"
        sample_keys:
          - "id"
          - "title"
          - "price"
    
    suggested_list_path: "$.data.items[*]"
    suggested_total_path: "$.total"
  
  # 总体状态
  summary:
    total_jsonpaths: 8
    passed: 8
    failed: 0
    warnings: 0
    all_verified: true
  
  # 详细验证结果
  details:
    - field: "id"
      jsonpath: "$.data.items[*].id"
      status: "passed"
      matched_count: 20
      sample_values:
        - 1
        - 2
        - 3
      stability:
        score: 100
        level: "excellent"
    
    - field: "title"
      jsonpath: "$.data.items[*].title"
      status: "passed"
      matched_count: 20
      sample_values:
        - "商品标题 1"
        - "商品标题 2"
      stability:
        score: 100
        level: "excellent"
    
    - field: "price"
      jsonpath: "$.data.items[*].price"
      status: "passed"
      matched_count: 20
      sample_values:
        - 99.00
        - 158.00
      stability:
        score: 100
        level: "excellent"
  
  # 失败处理（如果有）
  failed_jsonpaths: []
  
  # 优化建议
  recommendations:
    - "所有 JSONPath 验证通过，结构稳定"
    - "建议监控 API 响应结构变化"
```

## 常见问题

### Q1: JSONPath 匹配不到数据怎么办？

**A**: 按以下步骤排查：
1. 检查 JSONPath 语法是否正确
2. 使用 `analyze_json_structure` 重新分析 JSON 结构
3. 确认列表路径是否正确
4. 检查字段名是否匹配

### Q2: 如何处理嵌套 JSON？

**A**: 使用点号访问嵌套字段：
```python
# 嵌套 JSON
{
    "data": {
        "user": {
            "profile": {
                "name": "John"
            }
        }
    }
}

# JSONPath
"$.data.user.profile.name"  # 访问嵌套字段
```

### Q3: 如何提取数组中的特定元素？

**A**: 使用索引或过滤器：
```python
# 第一个元素
"$.items[0].name"

# 最后一个元素
"$.items[-1].name"

# 符合条件的元素
"$.items[?(@.status == 'active')].name"
```

## 最佳实践

### 1. 使用通配符而非绝对索引

```python
# ✅ 正确 - 通配符
"$.data.items[*].title"

# ❌ 错误 - 绝对索引
"$.data.items[0].title"  # 只能获取第一个
```

### 2. 验证每个字段

```python
# ✅ 正确 - 每个字段都验证
for field in fields:
    result = validate_jsonpath(json_data, field['jsonpath'])
    assert result['status'] == 'passed'

# ❌ 错误 - 不验证直接使用
```

### 3. 处理缺失字段

```python
def safe_extract(json_data, jsonpath, default=None):
    """
    安全提取，处理缺失字段
    """
    try:
        results = jsonpath_ng.parse(jsonpath).find(json_data)
        return results[0].value if results else default
    except:
        return default

# 使用
title = safe_extract(json_data, "$.data.title", default="未知标题")
```

## 相关 Skills

- [`network-request-analyzer`](../network-request-analyzer/SKILL.md) - 网络请求分析
- [`xpath-validator`](../xpath-validator/SKILL.md) - XPath 验证专家
