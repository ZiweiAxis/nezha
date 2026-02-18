# 紫微 (Ziwei) 产品网站

> 紫微 - 多智能体治理平台官方网站

![紫微](https://img.shields.io/badge/紫微-多智能体治理平台-6366f1)
![Astro](https://img.shields.io/badge/Astro-4.0-ff5f1f)
![License](https://img.shields.io/badge/License-MIT-blue)

## 概述

紫微 (Ziwei) 是一个功能强大的多智能体治理平台，提供消息枢纽、策略服务、拦截器和 Python SDK，帮助开发者快速构建和部署 AI Agent 应用。

## 核心组件

- **天枢** - 消息枢纽：统一的消息路由和分发中心
- **谛听** - 策略服务：智能策略引擎
- **悟空** - 拦截器：请求拦截与过滤中间件
- **太白** - Python SDK：简洁易用的 Python 开发套件

## 技术栈

- [Astro](https://astro.build/) - 静态网站生成器
- 纯 CSS (无框架依赖)
- 响应式设计

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:4321 查看网站。

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist` 目录。

### 预览构建结果

```bash
npm run preview
```

## 项目结构

```
product-site/
├── src/
│   ├── layouts/
│   │   └── Layout.astro      # 主布局
│   ├── pages/
│   │   ├── index.astro       # 首页
│   │   ├── docs.astro       # 文档页
│   │   └── about.astro      # 关于页
│   └── components/          # 组件目录
├── public/
│   └── favicon.svg          # 网站图标
├── astro.config.mjs         # Astro 配置
└── package.json             # 项目依赖
```

## 部署

### GitHub Pages

1. 在 GitHub 上创建仓库
2. 将代码推送到仓库
3. 进入 Settings > Pages
4. Source 选择 "Deploy from a branch"
5. Branch 选择 "gh-pages" / "main" 并设置目录为 "dist"

或者使用 Actions 自动部署，详见 [.github/workflows/deploy.yml](.github/workflows/deploy.yml)

### Vercel

```bash
# 使用 Vercel CLI
npm i -g vercel
vercel

# 或通过 Git 集成
# 将代码推送到 GitHub，连接 Vercel 即可自动部署
```

### 手动部署

```bash
npm run build
# 将 dist 目录内容上传到您的服务器
```

## 自定义配置

### 修改网站标题和描述

在 `src/layouts/Layout.astro` 中修改：

```html
<title>{title} | 紫微 - 多智能体治理平台</title>
<meta name="description" content="紫微 (Ziwei) - 下一代多智能体治理平台...">
```

### 修改网站地址

在 `astro.config.mjs` 中修改：

```javascript
export default defineConfig({
  site: 'https://your-domain.com',
});
```

## 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 打开 Pull Request

## 许可证

MIT License - 详见 [LICENSE](LICENSE)

## 链接

- [GitHub](https://github.com/ziwei-ai)
- [文档](https://ziwei-ai.github.io/docs)
