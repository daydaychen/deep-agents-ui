---
name: network-request-analyzer
description: 专家级网络请求分析技能，识别 XHR/Fetch 数据源、分析 API 响应结构、生成 JSONPath 表达式、逆向动态参数生成逻辑，优先使用 API 采集而非 HTML 解析。
---

# Network Request Analyzer - 网络请求分析专家

## ⚠️ 安全考虑

### 凭证处理

**禁止硬编码真实凭证**：
- ❌ 错误：`Authorization: "Bearer eyJhbGciOiJIUzI1NiIs..."`（真实 Token）
- ✅ 正确：`Authorization: "Bearer YOUR_TOKEN_HERE"`（占位符）
- ✅ 推荐：`Authorization: "${CREDENTIALS.authorization_token}"`（环境变量引用）

### 代码注入防护

**在获取和执行 JS 代码时**：
- 验证 URL 是否同源或来自可信 CDN
- 验证响应 Content-Type 为 `application/javascript`
- 避免直接执行来自未知来源的代码

### 日志脱敏

```python
def sanitize_for_logging(headers):
    """脱敏敏感 Header"""
    sensitive = ['Authorization', 'Cookie', 'X-Auth-Token', 'X-API-Key', 'X-Signature']
    sanitized = headers.copy()
    for key in sensitive:
        if key in sanitized:
            sanitized[key] = '[REDACTED]'
    return sanitized
```

### 合规性检查

- 检查目标网站的 robots.txt
- 遵守服务条款和使用限制
- 尊重数据隐私和知识产权
- 实现速率限制避免激进抓取

## 概述

本技能提供专家级网络请求分析能力：
- **XHR/Fetch 识别** - 监听并识别数据加载 API
- **JSON 响应分析** - 分析 API 返回的数据结构
- **JSONPath 生成** - 生成精确的数据提取路径
- **动态参数逆向** - 分析请求参数的生成逻辑
- **加密算法识别** - 识别常见加密和签名机制
- **安全合规** - 遵循凭证处理和日志脱敏最佳实践

## 错误处理与容错

### 异常处理最佳实践

**所有浏览器操作和网络请求都必须包含错误处理**：

```python
import json
from json import JSONDecodeError
from typing import Dict, Any, Optional
import time


def get_api_response(request_id: str, timeout: int = 30) -> Dict[str, Any]:
    """
    获取 API 响应，包含完整的错误处理

    Args:
        request_id: 请求 ID
        timeout: 超时时间（秒）

    Returns:
        dict: {'success': bool, 'data': Optional[dict], 'error': Optional[str]}
    """
    try:
        # 获取网络响应，设置超时
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

        # 解析 JSON，捕获解析错误
        try:
            json_data = json.loads(body)
        except JSONDecodeError as e:
            return {
                'success': False,
                'error': f'Invalid JSON: {str(e)}',
                'error_type': 'JSON_PARSE_ERROR',
                'raw_body': body[:500]  # 保留前 500 字符用于调试
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Unexpected error parsing JSON: {type(e).__name__}: {str(e)}',
                'error_type': 'UNKNOWN_ERROR'
            }

        return {
            'success': True,
            'data': json_data,
            'headers': response.get('responseHeaders', {}),
            'status_code': status_code
        }

    except TimeoutError as e:
        return {
            'success': False,
            'error': f'Request timed out after {timeout}s',
            'error_type': 'TIMEOUT'
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'Unexpected error: {type(e).__name__}: {str(e)}',
            'error_type': 'UNKNOWN_ERROR'
        }
```

### 重试机制

**对于瞬态错误（网络波动、5xx 错误），实现指数退避重试**：

```python
def get_api_response_with_retry(
    request_id: str,
    max_retries: int = 3,
    initial_delay: float = 1.0,
    backoff_factor: float = 2.0,
    timeout: int = 30
) -> Dict[str, Any]:
    """
    带重试机制的 API 响应获取

    Args:
        request_id: 请求 ID
        max_retries: 最大重试次数
        initial_delay: 初始延迟（秒）
        backoff_factor: 退避因子
        timeout: 超时时间（秒）

    Returns:
        dict: {'success': bool, 'data': Optional[dict], 'error': Optional[str], 'retries': int}
    """
    last_error = None
    delay = initial_delay

    for attempt in range(max_retries + 1):
        result = get_api_response(request_id, timeout=timeout)

        # 成功则直接返回
        if result['success']:
            result['retries'] = attempt
            return result

        # 检查是否应该重试
        error_type = result.get('error_type', '')
        should_retry = error_type in ['NETWORK_ERROR', 'HTTP_ERROR', 'TIMEOUT']

        if not should_retry or attempt >= max_retries:
            last_error = result
            break

        # 指数退避等待
        print(f"Attempt {attempt + 1} failed, retrying in {delay}s...")
        time.sleep(delay)
        delay *= backoff_factor

    # 所有重试失败
    last_error['retries'] = max_retries
    last_error['error'] = f"All {max_retries + 1} attempts failed: {last_error.get('error', 'Unknown')}"
    return last_error
```

### 超时配置

**所有浏览器操作都应该设置合理的超时时间**：

```python
# 导航超时
browser_navigate(url="https://target-site.com", timeout=30000)  # 30 秒

# 等待超时
browser_wait_for_load_state(state="networkidle", timeout=10000)  # 10 秒

# 元素查找超时
browser_get_elements_by_xpath(xpath="//div[@class='item']", timeout=5000)  # 5 秒

# 函数执行超时
browser_evaluate("() => {...}", timeout=10000)  # 10 秒
```

### 错误分类处理

```python
def handle_browser_error(error: Exception) -> Dict[str, Any]:
    """
    统一处理浏览器操作错误

    Returns:
        dict: 错误报告
    """
    error_map = {
        TimeoutError: {
            'type': 'TIMEOUT',
            'severity': 'warning',
            'suggestion': '增加超时时间或检查网络连接'
        },
        ConnectionError: {
            'type': 'CONNECTION_ERROR',
            'severity': 'error',
            'suggestion': '检查目标网站是否可访问'
        },
        ValueError: {
            'type': 'INVALID_INPUT',
            'severity': 'error',
            'suggestion': '检查输入参数是否正确'
        }
    }

    error_class = type(error)
    error_info = error_map.get(error_class, {
        'type': 'UNKNOWN_ERROR',
        'severity': 'error',
        'suggestion': '检查日志并联系技术支持'
    })

    return {
        'success': False,
        'error': str(error),
        'error_type': error_info['type'],
        'severity': error_info['severity'],
        'suggestion': error_info['suggestion'],
        'exception_type': error_class.__name__
    }
```

## 核心原则

### 1. API 优先

**如果数据通过 API 加载，优先使用 API 而非 HTML 解析**：
- ✅ API 采集：直接、高效、稳定
- ❌ HTML 解析：间接、低效、易变

### 2. 实证主义

**所有结论必须基于实际网络请求**：
```python
# 监听网络请求
requests = browser_get_network_requests()

# 获取完整响应
response = browser_get_network_response(request_id)
```

### 3. 完整记录

**必须完整记录所有请求头和参数**：
- 鉴权 Header: `Authorization`, `Cookie`, `X-Auth-Token`
- 签名 Header: `X-Signature`, `X-Timestamp`, `X-Nonce`
- 业务参数：URL 参数、POST 请求体

## 网络监听工作流

### 步骤 1: 开始监听

```python
# 导航前清空网络日志
browser_navigate(url="about:blank")

# 导航到目标页面并开始监听
browser_navigate(url="https://target-site.com/list")
browser_wait_for_load_state(state="networkidle")

# 获取所有网络请求
requests = browser_get_network_requests()
```

### 步骤 2: 识别数据 API

```python
def identify_data_api(requests):
    """
    从网络请求中识别数据 API
    """
    data_requests = []
    
    for req in requests:
        # 筛选 XHR/Fetch 请求
        if req.get('type') not in ['xhr', 'fetch']:
            continue
        
        # 筛选 JSON 响应
        content_type = req.get('responseHeaders', {}).get('Content-Type', '')
        if 'application/json' not in content_type:
            continue
        
        # 分析 URL 是否可能包含数据
        url = req.get('url', '')
        if any(keyword in url.lower() for keyword in [
            'api', 'data', 'list', 'items', 'products', 
            'articles', 'search', 'query', 'graphql'
        ]):
            data_requests.append(req)
    
    # 按响应大小排序（数据 API 通常返回较大响应）
    data_requests.sort(
        key=lambda r: len(r.get('responseBody', '')), 
        reverse=True
    )
    
    return data_requests
```

### 步骤 3: 分析 API 响应结构

```python
def analyze_json_structure(response_json):
    """
    分析 JSON 响应结构，识别列表位置
    """
    analysis = {
        'root_keys': list(response_json.keys()) if isinstance(response_json, dict) else [],
        'list_path': None,
        'list_path_confidence': 0,
        'total_path': None,
        'pagination_info': {}
    }
    
    # 递归查找数组
    def find_arrays(obj, path='$'):
        paths = []
        if isinstance(obj, dict):
            for key, value in obj.items():
                current_path = f"{path}.{key}"
                if isinstance(value, list):
                    paths.append({
                        'path': current_path,
                        'length': len(value),
                        'sample': value[0] if value else None
                    })
                else:
                    paths.extend(find_arrays(value, current_path))
        elif isinstance(obj, list):
            paths.append({
                'path': f"{path}[*]",
                'length': len(obj),
                'sample': obj[0] if obj else None
            })
        return paths
    
    arrays = find_arrays(response_json)
    
    # 选择最可能是数据列表的数组
    if arrays:
        # 优先选择长度适中、有对象元素的数组
        best_array = max(
            arrays,
            key=lambda a: (
                a['length'] if isinstance(a.get('sample'), dict) else 0
            )
        )
        analysis['list_path'] = best_array['path']
        analysis['list_path_confidence'] = 0.9 if isinstance(best_array.get('sample'), dict) else 0.5
    
    # 查找总数字段
    total_keywords = ['total', 'count', 'totalCount', 'total_count', 'size']
    for key in total_keywords:
        if key in response_json:
            analysis['total_path'] = f"$.{key}"
            break
    
    return analysis
```

### 步骤 4: 生成 JSONPath

```python
def generate_jsonpaths(response_json, list_path):
    """
    基于 JSON 结构生成字段 JSONPath
    """
    fields = {}
    
    # 获取列表项样本
    def get_by_path(obj, path):
        parts = path.replace('$', '').strip('.').split('.')
        for part in parts:
            if part == '*':
                return obj[0] if obj else None
            if isinstance(obj, dict):
                obj = obj.get(part)
            elif isinstance(obj, list):
                idx = int(part)
                obj = obj[idx] if idx < len(obj) else None
            else:
                return None
        return obj
    
    sample_item = get_by_path(response_json, list_path)
    
    if not sample_item or not isinstance(sample_item, dict):
        return fields
    
    # 分析字段
    for key, value in sample_item.items():
        jsonpath = f"{list_path}.{key}"
        
        # 判断字段类型
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
            'jsonpath': jsonpath,
            'extract_type': extract_type,
            'sample_value': value
        }
    
    return fields
```

### 步骤 5: 分析请求参数

```python
from typing import Dict, Any
from urllib.parse import urlparse, parse_qs
from json import JSONDecodeError
import json


def analyze_request_params(request: Dict[str, Any]) -> Dict[str, Any]:
    """
    分析 API 请求参数，识别翻页、筛选、排序参数

    Args:
        request: 请求字典，包含 url, method, headers, body 等

    Returns:
        dict: 参数分析报告
    """
    try:
        url = request.get('url', '')
        method = request.get('method', 'GET')
        headers = request.get('requestHeaders', {})
        body = request.get('requestBody', None)

        analysis = {
            'url': url,
            'method': method,
            'url_params': {},
            'body_params': {},
            'headers': {},
            'pagination_params': {},
            'filter_params': {},
            'sort_params': {},
            'analysis_success': True
        }

        # 解析 URL 参数
        try:
            parsed = urlparse(url)
            params = parse_qs(parsed.query)

            for key, values in params.items():
                analysis['url_params'][key] = values[0] if values else ''

                # 识别翻页参数
                if key.lower() in ['page', 'pageno', 'pagenum', 'offset', 'skip']:
                    analysis['pagination_params']['page'] = key
                elif key.lower() in ['size', 'limit', 'pagesize', 'page_size']:
                    analysis['pagination_params']['size'] = key
                elif key.lower() in ['cursor', 'next', 'continuation']:
                    analysis['pagination_params']['cursor'] = key
                # 识别排序参数
                elif key.lower() in ['sort', 'order', 'orderby', 'sort_by']:
                    analysis['sort_params']['field'] = key
                elif key.lower() in ['dir', 'direction', 'order_direction']:
                    analysis['sort_params']['direction'] = key
                # 识别筛选参数
                elif key.lower() in ['filter', 'filters', 'query', 'keyword', 'search']:
                    analysis['filter_params']['query'] = key
                elif key.endswith('_id') or key.endswith('Id'):
                    analysis['filter_params']['category'] = key

        except Exception as e:
            analysis['url_params_error'] = f'Failed to parse URL params: {str(e)}'

        # 解析请求体
        if body:
            try:
                body_data = json.loads(body)
                analysis['body_params'] = flatten_dict(body_data) if 'flatten_dict' in globals() else body_data
            except JSONDecodeError as e:
                # JSON 解析失败，保留原始 body
                analysis['body_params'] = {'raw': body[:500]}
                analysis['body_params_error'] = f'Invalid JSON: {str(e)}'
            except Exception as e:
                analysis['body_params'] = {'raw': body[:500]}
                analysis['body_params_error'] = f'Unexpected error: {str(e)}'

        # 提取重要 Headers
        important_headers = [
            'Authorization', 'Cookie', 'X-Auth-Token', 'X-API-Key',
            'X-Signature', 'X-Timestamp', 'X-Nonce', 'X-Request-Id',
            'Content-Type', 'Accept', 'User-Agent', 'Referer', 'Origin'
        ]

        for header in important_headers:
            if header in headers:
                analysis['headers'][header] = headers[header]

        return analysis

    except Exception as e:
        # 函数级错误处理
        return {
            'analysis_success': False,
            'error': f'Failed to analyze request: {type(e).__name__}: {str(e)}',
            'error_type': 'ANALYSIS_ERROR'
        }
```

### 步骤 6: 逆向动态参数

```python
from typing import Dict, Any, List


def reverse_engineer_params(url: str, requests_history: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    逆向动态生成的请求参数

    Args:
        url: 请求 URL
        requests_history: 请求历史列表

    Returns:
        dict: 参数分析报告
    """
    try:
        analysis = {
            'static_params': {},
            'dynamic_params': {},
            'generation_logic': {},
            'analysis_success': True
        }

        # 检查请求历史数量
        if len(requests_history) < 2:
            analysis['warning'] = 'Need at least 2 requests to analyze patterns'
            return analysis

        first_request = requests_history[0]
        last_request = requests_history[-1]

        first_params = first_request.get('url_params', {})
        last_params = last_request.get('url_params', {})

        # 找出变化的参数
        all_keys = set(first_params.keys()) | set(last_params.keys())
        for key in all_keys:
            first_val = first_params.get(key)
            last_val = last_params.get(key)

            if first_val != last_val:
                # 动态参数
                analysis['dynamic_params'][key] = {
                    'first_value': first_val,
                    'last_value': last_val,
                    'pattern': detect_pattern(first_val, last_val)
                }
            else:
                # 静态参数
                analysis['static_params'][key] = first_val

        return analysis

    except Exception as e:
        return {
            'analysis_success': False,
            'error': f'Failed to reverse engineer params: {type(e).__name__}: {str(e)}',
            'error_type': 'ANALYSIS_ERROR'
        }


def detect_pattern(val1: Any, val2: Any) -> Dict[str, Any]:
    """
    检测参数值的变化模式

    Args:
        val1: 第一个值
        val2: 第二个值

    Returns:
        dict: 模式识别结果
    """
    import re

    # 数字递增
    try:
        n1, n2 = int(val1), int(val2)
        if n2 > n1:
            return {'type': 'increment', 'step': n2 - n1, 'confidence': 0.9}
        elif n2 == n1 + 1:
            return {'type': 'page_number', 'confidence': 0.95}
    except (ValueError, TypeError):
        # 不是数字，继续检查其他模式
        pass

    # 时间戳检测
    if val1 and val2:
        try:
            str_val1, str_val2 = str(val1), str(val2)
            # 10 位或 13 位时间戳
            if len(str_val1) in [10, 13] and len(str_val2) in [10, 13]:
                t1, t2 = int(str_val1), int(str_val2)
                # 检查是否为合理的时间戳范围
                if 1000000000 <= t1 <= 2000000000 or 1000000000000 <= t1 <= 2000000000000:
                    if abs(t2 - t1) < 86400:  # 相差小于一天（秒或毫秒）
                        return {'type': 'timestamp', 'unit': 'milliseconds' if len(str_val1) == 13 else 'seconds', 'confidence': 0.9}
        except (ValueError, TypeError):
            pass

    # UUID/随机字符串检测
    try:
        uuid_pattern = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.I)
        if uuid_pattern.match(str(val1)):
            return {'type': 'uuid', 'generation': 'browser_evaluate to generate', 'confidence': 0.95}
    except re.error:
        pass

    # Base64 检测
    try:
        base64_pattern = re.compile(r'^[A-Za-z0-9+/]+=*$')
        if base64_pattern.match(str(val1)) and len(str(val1)) % 4 == 0:
            return {'type': 'base64', 'confidence': 0.7}
    except re.error:
        pass

    # 默认未知类型
    return {
        'type': 'unknown',
        'needs_analysis': True,
        'value_sample': str(val1)[:50],
        'confidence': 0.5
    }
```

## 加密算法识别

### 常见加密模式

```python
def identify_encryption(request):
    """
    识别请求中的加密/签名机制
    """
    headers = request.get('headers', {})
    params = request.get('url_params', {})
    body = request.get('body_params', {})
    
    encryption_info = {
        'detected': False,
        'type': None,
        'parameters': {},
        'reverse_strategy': None
    }
    
    # 检查签名相关参数
    signature_keywords = [
        'sign', 'signature', 'sig', 'hash', 'token', 'auth'
    ]
    
    all_params = {**headers, **params, **body}
    
    for key, value in all_params.items():
        key_lower = key.lower()
        
        # MD5 签名（32 位十六进制）
        if any(kw in key_lower for kw in signature_keywords):
            encryption_info['detected'] = True
            
            if len(str(value)) == 32 and all(c in '0123456789abcdef' for c in str(value).lower()):
                encryption_info['type'] = 'md5_signature'
                encryption_info['reverse_strategy'] = 'Analyze signature generation in JS source'
            
            # SHA256 签名（64 位十六进制）
            elif len(str(value)) == 64 and all(c in '0123456789abcdef' for c in str(value).lower()):
                encryption_info['type'] = 'sha256_signature'
                encryption_info['reverse_strategy'] = 'Analyze signature generation in JS source'
            
            # HMAC 签名
            elif 'hmac' in key_lower:
                encryption_info['type'] = 'hmac'
                encryption_info['reverse_strategy'] = 'Find secret key in JS source'
            
            # AES 加密
            elif 'aes' in key_lower or len(str(value)) % 16 == 0:
                encryption_info['type'] = 'aes_encryption'
                encryption_info['reverse_strategy'] = 'Extract key and IV from JS'
            
            # RSA 加密
            elif 'rsa' in key_lower:
                encryption_info['type'] = 'rsa_encryption'
                encryption_info['reverse_strategy'] = 'Extract public key from JS or network'
            
            # 时间戳防重放
            if 'timestamp' in key_lower or 'time' in key_lower:
                encryption_info['parameters']['timestamp'] = key
            
            # 随机数防重放
            if 'nonce' in key_lower or 'random' in key_lower:
                encryption_info['parameters']['nonce'] = key
    
    return encryption_info
```

### JS 逆向分析

```python
def analyze_js_for_signature(url, browser):
    """
    分析 JS 源码查找签名生成逻辑
    """
    # 获取页面所有 JS 文件
    js_files = browser_evaluate("""
        () => {
            const scripts = document.querySelectorAll('script[src]');
            return Array.from(scripts).map(s => s.src);
        }
    """)
    
    # 分析每个 JS 文件
    signature_patterns = []
    
    for js_url in js_files:
        # 下载并分析 JS 内容
        js_content = fetch_js(js_url)
        
        # 查找签名相关函数
        import re
        
        # MD5 调用
        md5_calls = re.findall(r'MD5\([^)]+\)|md5\([^)]+\)', js_content)
        if md5_calls:
            signature_patterns.append({
                'type': 'md5',
                'source': js_url,
                'patterns': md5_calls
            })
        
        # SHA256 调用
        sha256_calls = re.findall(r'SHA256\([^)]+\)|sha256\([^)]+\)', js_content)
        if sha256_calls:
            signature_patterns.append({
                'type': 'sha256',
                'source': js_url,
                'patterns': sha256_calls
            })
        
        # 查找签名函数定义
        sign_func = re.findall(
            r'function\s+(\w*sign\w*)\s*\([^)]*\)\s*\{([^}]+)\}',
            js_content,
            re.IGNORECASE
        )
        if sign_func:
            signature_patterns.append({
                'type': 'signature_function',
                'source': js_url,
                'function_name': sign_func[0][0],
                'function_body': sign_func[0][1]
            })
    
    return signature_patterns
```

## 输出格式

```yaml
network_analysis_report:
  url: "https://target-site.com/list"
  
  # 数据源类型
  data_source_type: "api"
  
  # API 请求配置
  api_request:
    url: "https://api.target-site.com/v1/products"
    method: "GET"
    
    headers:
      Authorization: "Bearer eyJhbGciOiJIUzI1NiIs..."
      Content-Type: "application/json"
      X-Request-Id: "uuid-1234-5678"
      X-Signature: "abc123def456..."
      X-Timestamp: "1704326400"
    
    params:
      page: 1
      size: 20
      category: "electronics"
      sort: "created_at"
      order: "desc"
  
  # JSONPath 配置
  jsonpath_config:
    list_path: "$.data.items[*]"
    
    fields:
      - name: "id"
        jsonpath: "$.data.items[*].id"
        sample_value: 12345
      
      - name: "title"
        jsonpath: "$.data.items[*].title"
        sample_value: "商品标题"
      
      - name: "price"
        jsonpath: "$.data.items[*].price"
        sample_value: 99.00
      
      - name: "url"
        jsonpath: "$.data.items[*].detailUrl"
        sample_value: "https://target-site.com/product/12345"
  
  # 翻页配置
  pagination:
    type: "config"
    
    page_param: "page"
    size_param: "size"
    
    total_path: "$.data.total"
    
    page_path:
      status: true
      type: "config"
      total:
        ref: "{{ resp_content.jsonpath('$.data.total')[0] }}"
        default: 100
      step: 1
      current:
        from: "{{ requests_data.params.page }}"
        to:
          - value: "$.params.page"
            format:
              type: "add_value"
              value: 1
  
  # 加密/签名信息
  encryption:
    detected: true
    type: "sha256_signature"
    
    parameters:
      signature: "X-Signature"
      timestamp: "X-Timestamp"
      nonce: "X-Nonce"
    
    reverse_strategy: |
      1. 在 JS 源码中搜索 'sha256' 或 'SHA256' 关键词
      2. 定位签名生成函数
      3. 提取密钥和生成逻辑
      4. 使用 browser_evaluate 重现生成过程
  
  # 技术建议
  technical_recommendations:
    downloader_type: "requests"
    notes: |
      - 数据通过 API 加载，优先使用 API 采集
      - 需要处理签名验证，建议逆向 JS 源码
      - 翻页通过 page 参数控制
```

## 常见问题

### Q1: 如何识别 GraphQL API？

**A**: 查找以下特征：
```python
# GraphQL 特征
- URL 包含 /graphql 或 /api/graphql
- POST 方法
- Content-Type: application/json
- 请求体包含 { "query": "...", "variables": {...} }
```

### Q2: 如何处理加密参数？

**A**: 
1. 在 JS 源码中查找加密函数
2. 使用 `browser_evaluate` 调用 JS 函数生成参数
3. 或在采集配置中记录加密逻辑

### Q3: API 需要登录怎么办？

**A**: 
1. 提取登录后的 Cookie/Token
2. 在配置中记录鉴权 Header
3. 实现登录流程或使用已有凭证

## 最佳实践

### 1. 优先使用 API

```yaml
# ✅ API 采集 - 高效稳定
data_source_type: "api"
jsonpath: "$.data.items[*]"

# ❌ HTML 解析 - 低效易变
data_source_type: "html"
xpath: "//div[@class='item']"
```

### 2. 完整记录 Headers

```yaml
headers:
  # 鉴权相关（必须完整记录）
  Authorization: "Bearer token_here"
  Cookie: "session_id=xxx; token=yyy"
  X-Auth-Token: "xxx"
  
  # 签名防护（必须完整记录）
  X-Signature: "hmac_sha256_signature"
  X-Timestamp: "1704326400"
  X-Nonce: "random_string"
  
  # 标准 Header（按需记录）
  Content-Type: "application/json"
  Accept: "application/json"
  User-Agent: "Mozilla/5.0..."
```

### 3. 验证 JSONPath

```python
# 验证 JSONPath
def validate_jsonpath(json_data, jsonpath):
    import jsonpath_ng
    results = jsonpath_ng.parse(jsonpath).find(json_data)
    return len(results) > 0
```

## 相关 Skills

- [`browser-dom-analyzer`](../browser-dom-analyzer/SKILL.md) - DOM 结构分析
- [`jsonpath-validator`](../jsonpath-validator/SKILL.md) - JSONPath 验证专家
- [`js-reverse-engineer`](../js-reverse-engineer/SKILL.md) - JS 逆向专家
