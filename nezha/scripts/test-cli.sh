#!/bin/bash

# 悟空功能测试脚本

set -e

echo "🧪 Testing Wukong CLI..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数
TESTS_PASSED=0
TESTS_FAILED=0

# 测试函数
test_command() {
    local description=$1
    local command=$2

    echo -n "Testing: $description... "

    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

# 清理函数
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."

    # 停止所有测试 Agent
    for agent in test-agent-1 test-agent-2; do
        node dist/cli.js stop $agent 2>/dev/null || true
    done

    # 清理测试数据
    rm -rf ~/.wukong-test 2>/dev/null || true
}

# 设置清理钩子
trap cleanup EXIT

echo "=== Basic Commands ==="
test_command "CLI version" "node dist/cli.js --version"
test_command "CLI help" "node dist/cli.js --help"

echo ""
echo "=== Identity Management ==="
test_command "List identities (empty)" "node dist/cli.js identity --list"
test_command "Register identity" "node dist/cli.js identity --register test-agent-1 --type claude"
test_command "List identities (with data)" "node dist/cli.js identity --list"

echo ""
echo "=== Agent Management ==="
# 注意：这些测试可能会失败，因为需要实际的 Claude CLI
echo -e "${YELLOW}Note: Agent start tests may fail without Claude CLI installed${NC}"

# test_command "Start agent" "node dist/cli.js claude --name test-agent-1 --mode local"
# test_command "List agents" "node dist/cli.js list"
# test_command "Get agent status" "node dist/cli.js status test-agent-1"
# test_command "Stop agent" "node dist/cli.js stop test-agent-1"

echo ""
echo "=== Summary ==="
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed${NC}"
    exit 1
fi
