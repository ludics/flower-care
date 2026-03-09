# Flower Care - AI 上下文

## 项目概况

纯 HTML/JS 前端项目，无构建工具，无框架依赖。使用 `serve` 包在本地静态文件服务器上运行。

## 技术栈

- 纯 HTML + CSS + JS（无框架）
- `serve` 作为开发/生产服务器
- nginx 反向代理
- Cloudflare DNS 代理（Flexible SSL 模式）

## 关键配置

| 项目 | 值 |
|------|-----|
| 监听端口 | 16515 |
| 域名 | flower.ludi.dev |
| nginx 配置 | /etc/nginx/sites-available/flower.ludi.dev |
| 启动命令 | `npm start` |

## 文件职责

- `index.html`：页面入口，所有页面内容的起点
- `css/style.css`：全局样式
- `js/main.js`：主逻辑入口

## 开发约定

- 不引入构建工具（Webpack、Vite 等），保持零构建复杂度
- 样式统一写在 `css/style.css`，避免内联样式
- JS 保持模块化，功能拆分到 `js/` 目录下独立文件

## 部署注意

- 服务器必须部署在**境外**（如腾讯云新加坡），国内服务器会因未备案被阿里云拦截
- nginx 需要 sudo 权限操作，配置文件由用户手动创建
