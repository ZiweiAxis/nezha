/**
 * E2E 冒烟：主流程可加载、list 可调用（6.1 至少 1 条 E2E）
 */
import { describe, it, expect } from 'vitest';
import { createWukong } from '../../src/index';

describe('E2E smoke', () => {
  it('createWukong and listAgents', async () => {
    const wukong = await createWukong();
    const list = await wukong.listAgents();
    expect(Array.isArray(list)).toBe(true);
  });
});
