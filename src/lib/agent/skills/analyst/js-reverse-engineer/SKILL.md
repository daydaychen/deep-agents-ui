---
name: js-reverse-engineer
description: 专家级 JavaScript 逆向工程技能，识别并还原动态参数生成逻辑、破解常见加密算法（MD5/AES/RSA/HMAC）、处理代码混淆和反调试，输出 Python hook 代码供抓取平台配置人员使用。
---

# JS Reverse Engineer - JavaScript 逆向专家

## ⚠️ 安全警告

### 法律合规声明

**本技能仅可用于以下合法场景**：
- ✅ 您拥有或管理的网站
- ✅ 已获得明确书面授权的目标
- ✅ 合法的数据采集和研究目的

**禁止用于**：
- ❌ 未授权的数据抓取
- ❌ 绕过付费墙或访问控制
- ❌ 违反服务条款或 robots.txt 的行为
- ❌ 侵犯知识产权或数据隐私

### 凭证安全

- **永远不要**在代码中硬编码真实密钥
- 使用环境变量：`os.environ.get('SECRET_KEY')`
- 使用密钥管理服务（如 AWS Secrets Manager、HashiCorp Vault）
- 在配置文件中使用占位符：`your_secret_key_here`

### 代码执行风险

- Hook 代码在抓取平台执行，确保无恶意代码
- 避免使用 `eval()`, `exec()` 等危险函数
- 审查所有第三方依赖
- 在生产环境前进行代码审计

## 概述

本技能提供专家级 JS 逆向工程能力，专为 DataBus 抓取平台设计：
- **动态参数识别** - 时间戳、随机数、自增 ID
- **加密算法破解** - MD5、SHA、AES、RSA、HMAC
- **代码混淆还原** - 反混淆、AST 分析、控制流还原
- **反调试绕过** - 检测并绕过调试器陷阱
- **Hook 代码生成** - 输出可直接用于平台的 Python hook 代码
- **安全合规** - 遵循法律合规和凭证安全最佳实践

## 输出说明

本技能的输出供**配置人员**翻译为抓取平台 hook：
- 加密算法识别报告
- 参数生成逻辑分析
- JS 源码关键片段
- **Python hook 代码建议**（配置人员可在此基础上修改）

## 核心能力

### 能力层级

| 层级 | 能力 | 描述 |
|------|------|------|
| **基础** | 简单动态参数 | 时间戳、随机数、自增序列 |
| **进阶** | 常见加密算法 | MD5、SHA1、SHA256、HMAC |
| **专家** | 高级加密 | AES、DES、RSA 加密解密 |
| **大师** | 混淆代码还原 | 反混淆、AST 分析、控制流平坦化还原 |

## 动态参数识别

### 时间戳参数

```python
def identify_timestamp_param(requests):
    """
    识别时间戳类型的动态参数
    """
    patterns = []
    
    for req in requests:
        params = req.get('url_params', {})
        
        for key, value in params.items():
            # 检测时间戳特征
            if is_timestamp(value):
                patterns.append({
                    'param_name': key,
                    'type': 'timestamp',
                    'unit': detect_timestamp_unit(value),  # seconds, milliseconds
                    'generation': 'int(time.time() * multiplier)'
                })
    
    return patterns


def is_timestamp(value):
    """
    判断值是否为时间戳
    """
    try:
        val = int(value)
        # 10 位时间戳（秒）
        if len(str(val)) == 10 and 1000000000 < val < 2000000000:
            return True
        # 13 位时间戳（毫秒）
        if len(str(val)) == 13 and 1000000000000 < val < 2000000000000:
            return True
    except:
        pass
    return False


def detect_timestamp_unit(value):
    """
    检测时间戳单位
    """
    if len(str(value)) == 13:
        return 'milliseconds'
    return 'seconds'
```

### 随机数/Nonce 参数

```python
def identify_nonce_param(requests):
    """
    识别随机数类型的参数
    """
    patterns = []
    
    for req in requests:
        params = req.get('url_params', {})
        
        for key, value in params.items():
            if 'nonce' in key.lower() or 'random' in key.lower():
                patterns.append({
                    'param_name': key,
                    'type': 'nonce',
                    'pattern': analyze_random_pattern(value),
                    'generation': generate_nonce_code(value)
                })
    
    return patterns


def analyze_random_pattern(value):
    """
    分析随机数的生成模式
    """
    val_str = str(value)
    
    # UUID 格式
    import re
    if re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', val_str, re.I):
        return {'format': 'uuid', 'version': 'v4'}
    
    # 纯数字
    if val_str.isdigit():
        return {'format': 'numeric', 'length': len(val_str)}
    
    # 十六进制
    if all(c in '0123456789abcdefABCDEF' for c in val_str):
        return {'format': 'hex', 'length': len(val_str)}
    
    # Base64
    if re.match(r'^[A-Za-z0-9+/]+=*$', val_str):
        return {'format': 'base64', 'length': len(val_str)}
    
    return {'format': 'unknown', 'raw': val_str}


def generate_nonce_code(value):
    """
    生成随机数生成代码
    """
    pattern = analyze_random_pattern(value)
    
    if pattern['format'] == 'uuid':
        return """
import uuid
nonce = str(uuid.uuid4())
"""
    elif pattern['format'] == 'numeric':
        length = pattern['length']
        return f"""
import random
import string
nonce = ''.join(random.choices(string.digits, k={length}))
"""
    elif pattern['format'] == 'hex':
        length = pattern['length']
        return f"""
import secrets
nonce = secrets.token_hex({length // 2})
"""
    else:
        return """
import secrets
import string
nonce = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
"""
```

### 自增序列参数

```python
def identify_sequence_param(requests_history):
    """
    识别自增序列参数
    """
    if len(requests_history) < 2:
        return None
    
    first_params = requests_history[0].get('url_params', {})
    last_params = requests_history[-1].get('url_params', {})
    
    for key in first_params:
        if key in last_params:
            try:
                first_val = int(first_params[key])
                last_val = int(last_params[key])
                
                if last_val > first_val:
                    step = last_val - first_val
                    return {
                        'param_name': key,
                        'type': 'sequence',
                        'step': step,
                        'generation': f'current_value += {step}'
                    }
            except:
                pass
    
    return None
```

## 加密算法识别与破解

### MD5 签名识别

```python
def identify_md5_signature(request, js_source):
    """
    识别 MD5 签名机制
    """
    result = {
        'detected': False,
        'param_name': None,
        'signature_input': None,
        'generation_code': None
    }
    
    # 查找 MD5 特征参数
    headers = request.get('headers', {})
    params = request.get('params', {})
    
    for source in [headers, params]:
        for key, value in source.items():
            # MD5 特征：32 位十六进制
            if len(str(value)) == 32 and all(c in '0123456789abcdef' for c in str(value).lower()):
                if any(kw in key.lower() for kw in ['sign', 'sig', 'hash', 'md5']):
                    result['detected'] = True
                    result['param_name'] = key
                    
                    # 在 JS 中查找 MD5 调用
                    md5_usage = find_md5_usage_in_js(js_source)
                    if md5_usage:
                        result['signature_input'] = md5_usage['input']
                        result['generation_code'] = generate_md5_code(md5_usage)
    
    return result


def find_md5_usage_in_js(js_source):
    """
    在 JS 源码中查找 MD5 使用
    """
    import re
    
    patterns = [
        # MD5(...) 调用
        r'MD5\s*\(\s*([^)]+)\s*\)',
        r'md5\s*\(\s*([^)]+)\s*\)',
        # crypto.createHash('md5')
        r"crypto\.createHash\s*\(\s*['\"]md5['\"]\s*\)\.update\s*\(\s*([^)]+)\s*\)",
        # CryptoJS.MD5(...)
        r'CryptoJS\.MD5\s*\(\s*([^)]+)\s*\)',
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, js_source, re.IGNORECASE)
        if matches:
            return {
                'function': 'MD5',
                'input': matches[0],
                'context': extract_context(js_source, matches[0])
            }
    
    return None


def generate_md5_code(md5_usage):
    """
    生成 MD5 签名代码
    """
    return f"""
import hashlib
import json

def generate_sign(params):
    # 参数排序
    sorted_params = sorted(params.items())
    # 拼接字符串
    sign_string = '&'.join(f'{{k}}={{v}}' for k, v in sorted_params)
    # 计算 MD5
    sign_hash = hashlib.md5(sign_string.encode()).hexdigest()
    return sign_hash

# 使用示例
params = {{'page': 1, 'size': 20}}
sign = generate_sign(params)
"""
```

### HMAC 签名识别

```python
def identify_hmac_signature(request, js_source):
    """
    识别 HMAC 签名机制
    """
    result = {
        'detected': False,
        'algorithm': None,
        'secret_source': None,
        'generation_code': None
    }
    
    # 查找 HMAC 特征
    import re
    
    hmac_patterns = [
        r'HMACSHA256\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)',
        r'hmac_sha256\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)',
        r'CryptoJS\.HmacSHA256\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)',
    ]
    
    for pattern in hmac_patterns:
        matches = re.findall(pattern, js_source, re.IGNORECASE)
        if matches:
            result['detected'] = True
            result['algorithm'] = 'HMAC-SHA256'
            result['secret_source'] = matches[0][1]  # 密钥参数
            result['generation_code'] = generate_hmac_code('sha256')
            break
    
    return result


def generate_hmac_code(algorithm='sha256'):
    """
    生成 HMAC 签名代码
    """
    return f"""
import hmac
import hashlib
import base64
import os

def generate_hmac(message, secret_key):
    # 创建 HMAC 对象
    h = hmac.new(
        secret_key.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.{algorithm}
    )
    # 返回十六进制或 Base64
    return h.hexdigest()  # 或 base64.b64encode(h.digest()).decode()

# 使用示例 - 从环境变量获取密钥
secret = os.environ.get('HMAC_SECRET_KEY')
if not secret:
    raise ValueError("HMAC_SECRET_KEY environment variable not set")
message = 'page=1&size=20'
sign = generate_hmac(message, secret)
"""
```

### AES 加密识别

```python
def identify_aes_encryption(request, js_source):
    """
    识别 AES 加密机制
    """
    result = {
        'detected': False,
        'mode': None,
        'padding': None,
        'key_source': None,
        'iv_source': None,
        'generation_code': None
    }
    
    import re
    
    # AES 特征
    aes_patterns = [
        r'AES\.encrypt\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*\{([^}]+)\}\s*\)',
        r'crypto\.createCipher\s*\(\s*['\"]aes-([^'\"]+)['\"]',
    ]
    
    for pattern in aes_patterns:
        matches = re.findall(pattern, js_source, re.IGNORECASE)
        if matches:
            result['detected'] = True
            
            # 提取模式和填充
            if len(matches[0]) > 2:
                config = matches[0][2]
                if 'mode' in config.lower():
                    result['mode'] = extract_mode(config)
                if 'padding' in config.lower():
                    result['padding'] = extract_padding(config)
            
            result['generation_code'] = generate_aes_code(
                result['mode'] or 'CBC',
                result['padding'] or 'PKCS7'
            )
            break
    
    return result


def generate_aes_code(mode='CBC', padding='PKCS7'):
    """
    生成 AES 加密代码
    """
    return f"""
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad
import base64

def aes_encrypt(plaintext, key, iv=None):
    # 创建 AES Cipher
    cipher = AES.new(
        key.encode('utf-8')[:32].ljust(32),  # 密钥长度：16/24/32 bytes
        AES.MODE_{mode},
        iv.encode('utf-8')[:16].ljust(16) if iv else None
    )
    
    # 加密并填充
    encrypted = cipher.encrypt(pad(
        plaintext.encode('utf-8'),
        AES.block_size,
        style='{padding}'
    ))
    
    return base64.b64encode(encrypted).decode()

# 使用示例
key = 'your_32_byte_key_here'
iv = 'your_16_byte_iv'
plaintext = '{{"page": 1}}'
encrypted = aes_encrypt(plaintext, key, iv)
"""
```

### RSA 加密识别

```python
def identify_rsa_encryption(request, js_source):
    """
    识别 RSA 加密机制
    """
    result = {
        'detected': False,
        'key_source': None,
        'public_key': None,
        'generation_code': None
    }
    
    import re
    
    # RSA 特征
    rsa_patterns = [
        r'RSA\.encrypt\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)',
        r'new JSEncrypt\s*\(\)\.setPublicKey\s*\(\s*([^)]+)\s*\)',
        r'encrypt\s*\(\s*([^,]+)\s*,\s*pubKey\s*\)',
    ]
    
    for pattern in rsa_patterns:
        matches = re.findall(pattern, js_source, re.IGNORECASE)
        if matches:
            result['detected'] = True
            result['key_source'] = matches[0][1] if len(matches[0]) > 1 else matches[0][0]
            result['generation_code'] = generate_rsa_code()
            break
    
    return result


def generate_rsa_code():
    """
    生成 RSA 加密代码
    """
    return f"""
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5
import base64

def rsa_encrypt(plaintext, public_key_pem):
    # 导入公钥
    key = RSA.import_key(public_key_pem)
    
    # 创建加密器
    cipher = PKCS1_v1_5.new(key)
    
    # 加密
    encrypted = cipher.encrypt(plaintext.encode('utf-8'))
    
    return base64.b64encode(encrypted).decode()

# 使用示例
public_key = '''-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQE...
-----END PUBLIC KEY-----'''

plaintext = '{{"password": "secret"}}'
encrypted = rsa_encrypt(plaintext, public_key)
"""
```

## 代码混淆还原

### 混淆检测

```python
def detect_obfuscation(js_source):
    """
    检测 JS 代码是否被混淆
    """
    indicators = {
        'eval_usage': False,
        'string_array': False,
        'control_flow': False,
        'dead_code': False,
        'variable_renaming': False
    }
    
    import re
    
    # eval/Function 使用
    if re.search(r'\beval\s*\(|new\s+Function\s*\(', js_source):
        indicators['eval_usage'] = True
    
    # 字符串数组混淆
    if re.search(r'var\s+_0x[a-f0-9]+\s*=\s*\[', js_source):
        indicators['string_array'] = True
    
    # 控制流平坦化
    if re.search(r'switch\s*\(\s*\w+\s*\)\s*\{.*case\s+\d+:', js_source, re.DOTALL):
        indicators['control_flow'] = True
    
    # 死代码
    if re.search(r'if\s*\(\s*false\s*\)\s*\{', js_source):
        indicators['dead_code'] = True
    
    # 变量重命名（_0x123 模式）
    if re.search(r'var\s+_0x[a-f0-9]+\s*=', js_source):
        indicators['variable_renaming'] = True
    
    return {
        'is_obfuscated': any(indicators.values()),
        'indicators': indicators,
        'obfuscation_type': identify_obfuscation_type(indicators)
    }


def identify_obfuscation_type(indicators):
    """
    识别混淆类型
    """
    if indicators['string_array'] and indicators['eval_usage']:
        return 'javascript-obfuscator'
    elif indicators['control_flow']:
        return 'control_flow_flattening'
    elif indicators['variable_renaming']:
        return 'variable_renaming'
    else:
        return 'unknown'
```

### 字符串数组还原

```python
def deobfuscate_string_array(js_source):
    """
    还原字符串数组混淆
    """
    import re
    
    # 查找字符串数组定义
    array_match = re.search(
        r'var\s+(_0x[a-f0-9]+)\s*=\s*\[([^\]]+)\]',
        js_source
    )
    
    if not array_match:
        return js_source
    
    array_name = array_match.group(1)
    array_content = array_match.group(2)
    
    # 解析字符串数组
    strings = re.findall(r"['\"]([^'\"]*)['\"]", array_content)
    
    # 查找数组访问函数
    func_match = re.search(
        r'function\s+(\w+)\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)\s*\{[^}]*' + array_name,
        js_source
    )
    
    if func_match:
        func_name = func_match.group(1)
        
        # 替换所有函数调用
        def replace_call(match):
            idx = int(match.group(1))
            if 0 <= idx < len(strings):
                return f'"{strings[idx]}"'
            return match.group(0)
        
        js_source = re.sub(
            rf'{func_name}\s*\(\s*(\d+)\s*\)',
            replace_call,
            js_source
        )
    
    return js_source
```

## 反调试绕过

### 调试器检测

```python
def detect_anti_debug(js_source):
    """
    检测反调试机制
    """
    import re
    
    patterns = [
        # debugger 语句
        r'\bdebugger\b',
        # setInterval 检测
        r'setInterval\s*\(\s*function\s*\(\)\s*\{\s*debugger',
        # 检测 DevTools
        r'window\.open\s*\(\s*[\'\"]\'[\'\"]\s*,\s*[\'\"]\'[\'\"]\s*,\s*[\'\"]\'[\'\"]',
        # 检测控制台
        r'console\.log\s*\(\s*\)\s*===\s*undefined',
    ]
    
    detected = []
    
    for pattern in patterns:
        if re.search(pattern, js_source):
            detected.append(pattern)
    
    return {
        'has_anti_debug': len(detected) > 0,
        'techniques': detected,
        'bypass_strategy': generate_bypass_strategy(detected)
    }


def generate_bypass_strategy(techniques):
    """
    生成反调试绕过策略
    """
    strategies = []
    
    for tech in techniques:
        if 'debugger' in tech:
            strategies.append({
                'technique': 'debugger_statement',
                'bypass': 'Use browser_evaluate to remove debugger statements',
                'code': """
// 在浏览器中执行，移除所有 debugger 语句
const source = document.querySelector('script').textContent;
const cleaned = source.replace(/debugger/g, '// debugger removed');
const script = document.createElement('script');
script.textContent = cleaned;
document.head.appendChild(script);
"""
            })
    
    return strategies
```

## 完整逆向流程

```python
def complete_reverse_workflow(url):
    """
    完整的 JS 逆向工作流程
    """
    workflow = {
        'steps': [
            {
                'step': 1,
                'name': '网络请求分析',
                'action': 'browser_get_network_requests()',
                'output': '识别动态参数和加密特征'
            },
            {
                'step': 2,
                'name': 'JS 源码获取',
                'action': 'Download all JS files from page',
                'output': '完整的 JS 源码'
            },
            {
                'step': 3,
                'name': '加密算法识别',
                'action': 'Analyze JS for crypto patterns',
                'output': '识别 MD5/SHA/AES/RSA/HMAC'
            },
            {
                'step': 4,
                'name': '混淆检测与还原',
                'action': 'Detect and deobfuscate',
                'output': '还原后的可读代码'
            },
            {
                'step': 5,
                'name': '参数生成逻辑提取',
                'action': 'Extract parameter generation logic',
                'output': '完整的参数生成代码'
            },
            {
                'step': 6,
                'name': '验证与测试',
                'action': 'Test generated parameters',
                'output': '验证通过的采集配置'
            }
        ]
    }
    
    return workflow
```

## 输出格式

```yaml
js_reverse_report:
  url: "https://target-site.com"
  
  # 动态参数
  dynamic_parameters:
    - name: "timestamp"
      type: "timestamp"
      unit: "milliseconds"
      generation: "int(time.time() * 1000)"
    
    - name: "nonce"
      type: "uuid_v4"
      generation: "str(uuid.uuid4())"
    
    - name: "page_token"
      type: "sequence"
      source: "API response field: $.nextPageToken"
      generation: "Extract from previous response"
  
  # 加密机制
  encryption:
    - type: "md5_signature"
      param_name: "sign"
      input: "params + secret_key"
      generation: |
        import hashlib
        def sign(params, secret):
            s = '&'.join(f'{k}={v}' for k, v in sorted(params.items()))
            return hashlib.md5((s + secret).encode()).hexdigest()
    
    - type: "aes_encryption"
      mode: "CBC"
      padding: "PKCS7"
      key_source: "Hardcoded in JS"
      iv_source: "Random 16 bytes"
      generation: |
        from Crypto.Cipher import AES
        from Crypto.Util.Padding import pad
        cipher = AES.new(key, AES.MODE_CBC, iv)
        encrypted = cipher.encrypt(pad(data, AES.block_size))
  
  # 混淆状态
  obfuscation:
    detected: true
    type: "javascript-obfuscator"
    deobfuscated: true
    deobfuscation_method: "String array restoration"
  
  # 反调试
  anti_debug:
    detected: false
    techniques: []
  
  # 完整参数生成代码
  parameter_generation_code: |
    import time
    import uuid
    import hashlib
    import requests

    class TargetSiteAPI:
        def __init__(self):
            self.secret_key = "hardcoded_secret"
            self.session = requests.Session()

        def generate_timestamp(self):
            return int(time.time() * 1000)

        def generate_nonce(self):
            return str(uuid.uuid4())

        def generate_sign(self, params):
            s = '&'.join(f'{k}={v}' for k, v in sorted(params.items()))
            return hashlib.md5((s + self.secret_key).encode()).hexdigest()

        def get_products(self, page=1):
            params = {
                'page': page,
                'size': 20,
                'timestamp': self.generate_timestamp(),
                'nonce': self.generate_nonce(),
            }
            params['sign'] = self.generate_sign(params)

            response = self.session.get(
                'https://api.target-site.com/products',
                params=params
            )
            return response.json()

## DataBus Hook 代码生成

### Hook 模板

```python
# DataBus 抓取平台 Hook 模板
# 用途：在请求前动态生成参数

def before_request(request, context):
    """
    请求前钩子 - 动态生成参数
    
    Args:
        request: 请求对象 (包含 url, method, headers, params, data)
        context: 上下文对象 (可存储跨请求的状态)
    
    Returns:
        None (直接修改 request 对象)
    """
    import time
    import hashlib
    import uuid
    
    # 示例 1: 时间戳参数
    request.params['timestamp'] = int(time.time() * 1000)
    
    # 示例 2: 随机数/Nonce
    request.params['nonce'] = str(uuid.uuid4())
    
    # 示例 3: MD5 签名
    secret_key = context.get('secret_key', 'default_secret')
    sign_params = {k: v for k, v in request.params.items() if k != 'sign'}
    sign_string = '&'.join(f'{k}={v}' for k, v in sorted(sign_params.items()))
    request.params['sign'] = hashlib.md5((sign_string + secret_key).encode()).hexdigest()
```

### 常见 Hook 场景

#### 场景 1: 时间戳 + 随机数

```python
def before_request(request, context):
    import time
    import random
    import string
    
    # 毫秒级时间戳
    request.params['_timestamp'] = int(time.time() * 1000)
    
    # 16 位随机字符串
    request.params['_random'] = ''.join(
        random.choices(string.ascii_lowercase + string.digits, k=16)
    )
```

#### 场景 2: MD5/HMAC 签名

```python
def before_request(request, context):
    import hashlib
    import hmac
    
    secret = context.get('api_secret', 'your_secret_key')
    
    # 构建待签名字符串
    params_to_sign = {
        'page': request.params.get('page', 1),
        'size': request.params.get('size', 20),
        'timestamp': int(time.time() * 1000)
    }
    sign_string = '&'.join(f'{k}={params_to_sign[k]}' for k in sorted(params_to_sign.keys()))
    
    # MD5 签名
    request.params['sign'] = hashlib.md5(sign_string.encode()).hexdigest()
    
    # 或 HMAC-SHA256 签名
    # request.params['sign'] = hmac.new(
    #     secret.encode(), sign_string.encode(), hashlib.sha256
    # ).hexdigest()
```

#### 场景 3: AES 加密请求体

```python
def before_request(request, context):
    from Crypto.Cipher import AES
    from Crypto.Util.Padding import pad
    import base64
    
    key = context.get('aes_key', '0123456789abcdef').encode()[:16]
    iv = context.get('aes_iv', 'fedcba9876543210').encode()[:16]
    
    # 加密请求体
    cipher = AES.new(key, AES.MODE_CBC, iv)
    plaintext = request.data or '{}'
    encrypted = cipher.encrypt(pad(plaintext.encode(), AES.block_size))
    
    request.data = base64.b64encode(encrypted).decode()
    request.headers['Content-Type'] = 'application/octet-stream'
```

#### 场景 4: 从响应中提取参数供下次请求使用

```python
def after_response(response, context):
    """
    响应后钩子 - 提取参数供下次请求使用
    """
    import json
    
    try:
        data = json.loads(response.text)
        # 提取 token 供下次请求使用
        context['next_token'] = data.get('data', {}).get('nextToken')
        context['session_id'] = data.get('sessionId')
    except:
        pass

def before_request(request, context):
    # 使用上次响应中获取的 token
    if context.get('next_token'):
        request.params['token'] = context['next_token']
    if context.get('session_id'):
        request.headers['X-Session-Id'] = context['session_id']
```

### Hook 配置说明

在 DataBus 平台配置时：

1. **全局 Hook**：适用于所有请求
   - 在采集器配置中设置 `before_request` 和 `after_response`

2. **请求级 Hook**：仅适用于特定请求
   - 在页面节点的 `hook_file` 中指定 Python 文件路径

3. **上下文传递**：
   - `context` 字典在多次请求间共享
   - 可用于存储 token、session_id 等状态

## 相关 Skills

- [`network-request-analyzer`](../network-request-analyzer/SKILL.md) - 网络请求分析
- [`browser-dom-analyzer`](../browser-dom-analyzer/SKILL.md) - DOM 结构分析
