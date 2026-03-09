# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概况

纯 HTML/CSS/JS 前端静态项目，无框架、无构建工具。使用 `serve` 包提供静态文件服务。

## 常用命令

```bash
npm install          # 安装依赖
npm start            # 启动开发服务器（端口 16515），访问 http://localhost:16515
```

无构建、无 lint、无测试命令。项目不使用任何构建工具。

## 架构

请求链路：浏览器 → Cloudflare（HTTPS 终止，Flexible SSL）→ nginx（端口 80）→ serve（端口 16515）→ 静态文件

- `index.html` 是唯一入口，引用 `css/style.css` 和 `js/main.js`
- `etc/flower.ludi.dev.conf` 是 nginx 反向代理配置的参考副本

## 开发约定

- 暂时未引入构建工具（Webpack、Vite 等），保持零构建复杂度；后续可以根据项目情况考虑是否引入
- 样式统一写在 `css/style.css`，不使用内联样式
- JS 保持模块化，按功能拆分到 `js/` 目录下独立文件
- 页面语言为中文（`lang="zh-CN"`）

## 关键配置

| 项目 | 值 |
|------|-----|
| 监听端口 | 16515 |
| 域名 | flower.ludi.dev |
| nginx 配置路径 | /etc/nginx/sites-available/flower.ludi.dev |

## 部署注意

- 服务器必须部署在**境外**（如腾讯云新加坡），国内服务器会因未备案被拦截
- nginx 配置需要 sudo 权限，由用户手动操作
- 生产环境建议用 `pm2` 管理进程：`pm2 start "npm start" --name flower-care`
