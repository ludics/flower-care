# Flower Care

家庭花卉管理应用，支持花卉照片上传、浇水提醒追踪和留言板功能。

## 本地开发

```bash
npm install
npm start
```

服务启动后访问 http://localhost:16515

## 项目结构

```
flower-care/
├── server.mjs            # Express 服务端入口
├── index.html            # 前端主页面
├── css/
│   └── style.css         # 全局样式
├── js/
│   ├── api.js            # API 客户端
│   └── main.js           # 前端逻辑
├── etc/
│   └── flower.ludi.dev.conf  # nginx 配置参考
├── data/                 # DuckDB 数据库（自动创建，git 忽略）
├── uploads/              # 上传的花卉照片（自动创建，git 忽略）
└── package.json
```

## 技术栈

- **前端**：纯 HTML + CSS + JavaScript（无框架、无构建工具）
- **后端**：Express（静态文件服务 + REST API）
- **数据库**：DuckDB（嵌入式，数据文件存放在 `data/` 目录）
- **文件上传**：multer（照片保存到 `uploads/` 目录）

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/flowers | 获取花卉列表 |
| POST | /api/flowers | 添加花卉（multipart/form-data，含照片文件） |
| PUT | /api/flowers/:id/water | 记录浇水 |
| DELETE | /api/flowers/:id | 删除花卉及关联照片 |
| GET | /api/comments | 获取评论列表 |
| POST | /api/comments | 添加评论（JSON：nickname + content） |

## 部署

### 服务器要求

- Node.js
- nginx

### nginx 配置

在 `/etc/nginx/sites-available/flower.ludi.dev` 中配置反向代理，将 `flower.ludi.dev` 的请求转发到 `127.0.0.1:16515`，然后创建 symlink 到 `sites-enabled/`：

```bash
ln -s /etc/nginx/sites-available/flower.ludi.dev /etc/nginx/sites-enabled/
nginx -t && nginx -s reload
```

nginx 配置内容参考：

```nginx
server {
    listen 80;
    server_name flower.ludi.dev;

    location / {
        proxy_pass http://127.0.0.1:16515;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 启动服务

```bash
npm start
```

建议使用 `pm2` 管理进程：

```bash
pm2 start "npm start" --name flower-care
pm2 save
```

## DNS

域名 `flower.ludi.dev` 通过 Cloudflare 代理，DNS A 记录指向服务器 IP。

- SSL 模式：Flexible（Cloudflare → 源站走 HTTP，浏览器 → Cloudflare 走 HTTPS）
- 服务器需部署在**境外**（如腾讯云新加坡），避免触发国内 ICP 备案拦截
