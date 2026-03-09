# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概况

家庭花卉管理应用。前端纯 HTML/CSS/JS（无框架、无构建工具），后端 Express + DuckDB 提供 REST API 和数据持久化，照片通过 multer 上传保存到服务器磁盘。

## 常用命令

```bash
npm install          # 安装依赖
npm start            # 启动服务器（端口 16515），访问 http://localhost:16515
```

无构建、无 lint、无测试命令。项目不使用任何构建工具。

## 架构

```
浏览器 → Cloudflare（HTTPS 终止，Flexible SSL）→ nginx（端口 80）→ Express（端口 16515）→ 静态文件 + REST API
                                                                          ↓
                                                                    DuckDB (data/flower-care.db)
                                                                    上传文件 (uploads/)
```

- `server.mjs` 是服务端入口，Express 同时提供静态文件服务和 API
- `index.html` 是前端唯一入口，引用 `css/style.css`、`js/api.js` 和 `js/main.js`
- `etc/flower.ludi.dev.conf` 是 nginx 反向代理配置的参考副本

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/flowers | 获取花卉列表 |
| POST | /api/flowers | 添加花卉（multipart，含照片文件） |
| PUT | /api/flowers/:id/water | 记录浇水 |
| DELETE | /api/flowers/:id | 删除花卉及照片 |
| GET | /api/comments | 获取评论列表 |
| POST | /api/comments | 添加评论（JSON：nickname + content） |

## 开发约定

- 暂时未引入构建工具（Webpack、Vite 等），保持零构建复杂度；后续可以根据项目情况考虑是否引入
- 样式统一写在 `css/style.css`，不使用内联样式
- JS 保持模块化，按功能拆分到 `js/` 目录下独立文件
- 页面语言为中文（`lang="zh-CN"`）
- `data/` 和 `uploads/` 目录已在 `.gitignore` 中排除

## 关键配置

| 项目 | 值 |
|------|-----|
| 监听端口 | 16515 |
| 域名 | flower.ludi.dev |
| 数据库路径 | data/flower-care.db |
| 上传目录 | uploads/ |
| nginx 配置路径 | /etc/nginx/sites-available/flower.ludi.dev |

## 部署注意

- 服务器必须部署在**境外**（如腾讯云新加坡），国内服务器会因未备案被拦截
- nginx 配置需要 sudo 权限，由用户手动操作
- 生产环境建议用 `pm2` 管理进程：`pm2 start "npm start" --name flower-care`
