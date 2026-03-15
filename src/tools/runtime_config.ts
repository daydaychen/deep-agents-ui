/**
 * Runtime Config Agent Tools
 * 
 * 提供 Agent 工具集用于控制 UI 运行时配置
 * 包括：Auth Mode、Thinking Toggle、Model Switcher、Interrupts 配置
 */

"use client";

import { Client } from "@langchain/langgraph-sdk";
import { getInterruptBefore, isValidAuthMode, type AuthMode } from "@/lib/auth-mode-utils";

/**
 * 工具执行结果类型
 */
export interface ToolResult {
  success: boolean;
  message: string;
  data?: unknown;
}

/**
 * 模型配置类型
 */
export interface ModelConfig {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  presence_penalty?: number;
}

/**
 * 中断配置类型
 */
export interface InterruptConfig {
  interruptBefore?: string[];
  interruptAfter?: string[];
}

/**
 * 设置认证模式
 * 
 * @param threadId - 线程 ID
 * @param mode - 认证模式：'ask' | 'read' | 'auto'
 * @returns 执行结果
 * 
 * @example
 * // 在 React 组件中：
 * const client = useClient();
 * const result = await setAuthMode(client, threadId, 'read');
 */
export async function setAuthMode(
  client: Client,
  threadId: string,
  mode: AuthMode
): Promise<ToolResult> {
  try {
    if (!isValidAuthMode(mode)) {
      return {
        success: false,
        message: `无效的认证模式：${mode}。有效值为：'ask', 'read', 'auto'`
      };
    }

    // 更新线程状态中的 authMode
    await client.threads.updateState(threadId, {
      values: {
        ui: {
          authMode: mode
        }
      }
    });

    const interruptConfig = getInterruptBefore(mode);
    
    return {
      success: true,
      message: `认证模式已设置为 ${mode}`,
      data: {
        mode,
        interruptBefore: interruptConfig
      }
    };
  } catch (error) {
    console.error("设置认证模式失败:", error);
    return {
      success: false,
      message: `设置认证模式失败：${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * 设置思考模式
 * 
 * @param client - LangGraph 客户端
 * @param threadId - 线程 ID
 * @param enabled - 是否启用思考模式
 * @returns 执行结果
 */
export async function setThinkingMode(
  client: Client,
  threadId: string,
  enabled: boolean
): Promise<ToolResult> {
  try {
    // 更新线程状态中的 thinking 配置
    await client.threads.updateState(threadId, {
      values: {
        ui: {
          thinking: enabled
        }
      }
    });

    return {
      success: true,
      message: `思考模式已${enabled ? '启用' : '禁用'}`,
      data: {
        thinking: enabled
      }
    };
  } catch (error) {
    console.error("设置思考模式失败:", error);
    return {
      success: false,
      message: `设置思考模式失败：${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * 配置中断点
 * 
 * @param client - LangGraph 客户端
 * @param threadId - 线程 ID
 * @param config - 中断配置
 * @returns 执行结果
 */
export async function configureInterrupts(
  client: Client,
  threadId: string,
  config: InterruptConfig
): Promise<ToolResult> {
  try {
    // 更新线程状态中的中断配置
    await client.threads.updateState(threadId, {
      values: {
        ui: {
          interruptBefore: config.interruptBefore,
          interruptAfter: config.interruptAfter
        }
      }
    });

    return {
      success: true,
      message: "中断配置已更新",
      data: config
    };
  } catch (error) {
    console.error("配置中断点失败:", error);
    return {
      success: false,
      message: `配置中断点失败：${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * 设置模型配置
 * 
 * @param client - LangGraph 客户端
 * @param threadId - 线程 ID
 * @param agentType - Agent 类型：'model', 'small_model', 'analyst', 'config_validator', 'databus_specialist'
 * @param config - 模型配置
 * @returns 执行结果
 */
export async function setModelConfig(
  client: Client,
  threadId: string,
  agentType: 'model' | 'small_model' | 'analyst' | 'config_validator' | 'databus_specialist',
  config: ModelConfig
): Promise<ToolResult> {
  try {
    // 更新线程状态中的模型配置
    await client.threads.updateState(threadId, {
      values: {
        ui: {
          modelConfig: {
            [agentType]: config
          }
        }
      }
    });

    return {
      success: true,
      message: `${agentType} 模型配置已更新`,
      data: {
        agentType,
        config
      }
    };
  } catch (error) {
    console.error("设置模型配置失败:", error);
    return {
      success: false,
      message: `设置模型配置失败：${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * 获取当前运行时配置
 * 
 * @param client - LangGraph 客户端
 * @param threadId - 线程 ID
 * @returns 当前配置或错误信息
 */
export async function getRuntimeConfig(
  client: Client,
  threadId: string
): Promise<ToolResult & { config?: unknown }> {
  try {
    const state = await client.threads.getState(threadId);
    
    return {
      success: true,
      message: "成功获取运行时配置",
      config: state.values?.ui
    };
  } catch (error) {
    console.error("获取运行时配置失败:", error);
    return {
      success: false,
      message: `获取运行时配置失败：${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * 工具定义 - 用于注册到 Agent 系统
 */
export const runtimeConfigTools = {
  setAuthMode: {
    name: "set_auth_mode",
    description: "设置 Agent 的认证模式（ask/read/auto）",
    parameters: {
      type: "object",
      properties: {
        mode: {
          type: "string",
          enum: ["ask", "read", "auto"],
          description: "认证模式：ask=所有操作需审批，read=仅高危操作需审批，auto=自动执行"
        }
      },
      required: ["mode"]
    }
  },
  setThinkingMode: {
    name: "set_thinking_mode",
    description: "启用或禁用 Agent 的思考模式",
    parameters: {
      type: "object",
      properties: {
        enabled: {
          type: "boolean",
          description: "是否启用思考模式"
        }
      },
      required: ["enabled"]
    }
  },
  configureInterrupts: {
    name: "configure_interrupts",
    description: "配置 Agent 的中断点（interruptBefore/interruptAfter）",
    parameters: {
      type: "object",
      properties: {
        interruptBefore: {
          type: "array",
          items: { type: "string" },
          description: "在这些节点之前中断"
        },
        interruptAfter: {
          type: "array",
          items: { type: "string" },
          description: "在这些节点之后中断"
        }
      }
    }
  },
  setModelConfig: {
    name: "set_model_config",
    description: "设置特定 Agent 类型的模型配置",
    parameters: {
      type: "object",
      properties: {
        agentType: {
          type: "string",
          enum: ["model", "small_model", "analyst", "config_validator", "databus_specialist"],
          description: "Agent 类型"
        },
        model: {
          type: "string",
          description: "模型名称"
        },
        temperature: {
          type: "number",
          description: "温度参数"
        },
        max_tokens: {
          type: "number",
          description: "最大 token 数"
        }
      },
      required: ["agentType"]
    }
  },
  getRuntimeConfig: {
    name: "get_runtime_config",
    description: "获取当前线程的运行时配置",
    parameters: {
      type: "object",
      properties: {}
    }
  }
};
