import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface WukongConfig {
  tianshu_api_url?: string;
  wukong_owner_id?: string;
  /** 审批状态轮询间隔（毫秒），FR3 */
  approval_poll_interval_ms?: number;
  /** 审批状态最大轮询次数，0=不轮询 */
  approval_poll_max_attempts?: number;
  /** 启用任务挂起模式：审批时挂起任务而不是阻塞等待 */
  suspend_mode?: boolean;
}

const CONFIG_DIR = path.join(os.homedir(), '.wukong');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * Load config from ~/.wukong/config.json.
 * Env vars (TIANSHU_API_URL, WUKONG_OWNER_ID) override file values.
 */
export async function loadConfig(): Promise<WukongConfig> {
  let fileConfig: WukongConfig = {};
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    fileConfig = JSON.parse(data) as WukongConfig;
  } catch (err: any) {
    if (err.code !== 'ENOENT') throw err;
  }
  const interval = process.env.WUKONG_APPROVAL_POLL_INTERVAL_MS ?? fileConfig.approval_poll_interval_ms;
  const maxAttempts = process.env.WUKONG_APPROVAL_POLL_MAX_ATTEMPTS ?? fileConfig.approval_poll_max_attempts;
  const suspendMode = process.env.WUKONG_SUSPEND_MODE ?? fileConfig.suspend_mode;
  return {
    ...fileConfig,
    tianshu_api_url: process.env.TIANSHU_API_URL ?? fileConfig.tianshu_api_url,
    wukong_owner_id: process.env.WUKONG_OWNER_ID ?? fileConfig.wukong_owner_id,
    approval_poll_interval_ms: interval != null ? Number(interval) : undefined,
    approval_poll_max_attempts: maxAttempts != null ? Number(maxAttempts) : undefined,
    suspend_mode: suspendMode != null ? (suspendMode === 'true' || suspendMode === true) : undefined,
  };
}
