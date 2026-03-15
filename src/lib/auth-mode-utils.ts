/**
 * Auth Mode 工具函数
 * 用于管理 Agent 的认证模式和中断配置
 */

export type AuthMode = 'ask' | 'read' | 'auto';

/**
 * Read Mode 下需要中断的节点列表
 * 这些是高危操作，需要用户审批
 */
export const READ_MODE_NODES = [
  "task",
  "shell",
  "write_file",
  "edit_file",
  "delete_file",
  "click",
  "navigate",
  "fill",
  "upsert_task",
  "run_shell_command"
];

/**
 * 根据认证模式获取中断前配置
 * @param mode - 认证模式
 * @returns 需要中断的节点列表，undefined 表示不中断
 */
export function getInterruptBefore(mode: AuthMode): string[] | undefined {
  switch (mode) {
    case 'ask':
      return ['*']; // 所有操作都需要审批
    case 'read':
      return READ_MODE_NODES; // 仅高危操作需要审批
    case 'auto':
      return undefined; // 自动执行所有操作
    default:
      console.warn(`Unknown auth mode: ${mode}, defaulting to "ask"`);
      return ['*'];
  }
}

/**
 * 获取认证模式的描述信息
 * @param mode - 认证模式
 * @returns 模式描述字符串
 */
export function getModeDescription(mode: AuthMode): string {
  const descriptions: Record<AuthMode, string> = {
    ask: "Ask Mode - 所有操作需审批（最安全）",
    read: "Read Mode - 仅高危操作需审批（平衡）",
    auto: "Auto Mode - 自动执行所有操作（最快，谨慎使用）"
  };
  return descriptions[mode];
}

/**
 * 验证是否为有效的 AuthMode
 * @param mode - 待验证的值
 * @returns 是否为有效的 AuthMode
 */
export function isValidAuthMode(mode: unknown): mode is AuthMode {
  return mode === 'ask' || mode === 'read' || mode === 'auto';
}
