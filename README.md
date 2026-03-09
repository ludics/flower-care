# Flower Care

前端静态项目，运行在 16515 端口，通过 nginx 反向代理对外提供服务。

## 本地开发

```bash
npm install
npm start
```

服务启动后访问 http://localhost:16515

## 项目结构

```
flower-care/
├── index.html        # 主页面
├── css/
│   └── style.css     # 全局样式
├── js/
│   └── main.js       # 主逻辑
└── package.json
```

## 部署

### 服务器要求

- Node.js（用于运行 `serve`）
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
