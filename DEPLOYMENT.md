# 网页镜像展示系统 - 部署指南

本文档提供了将网页镜像展示系统部署到 Vercel 和云服务器的完整指南。

## 📋 目录

- [Vercel 部署](#vercel-部署)
- [云服务器部署](#云服务器部署)
- [环境变量配置](#环境变量配置)
- [域名配置](#域名配置)
- [故障排除](#故障排除)

---

## 🚀 Vercel 部署

Vercel 是最简单的部署方式，适合快速上线和测试。

### 准备工作

1. **注册 Vercel 账号**
   - 访问 [vercel.com](https://vercel.com)
   - 使用 GitHub 账号登录

2. **推送代码到 GitHub**
   ```bash
   # 初始化 git 仓库
   git init
   
   # 添加所有文件
   git add .
   
   # 提交代码
   git commit -m "Initial commit: 网页镜像展示系统"
   
   # 添加远程仓库
   git remote add origin https://github.com/YOUR_USERNAME/webpage-mirror-system.git
   
   # 推送到 GitHub
   git push -u origin main
   ```

### 配置 Vercel

1. **创建 vercel.json 配置文件**
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "src/index.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "src/index.js"
       }
     ],
     "functions": {
       "src/index.js": {
         "maxDuration": 30
       }
     }
   }
   ```

2. **修改 package.json**
   ```json
   {
     "name": "webpage-mirror-system",
     "version": "1.0.0",
     "type": "module",
     "main": "src/index.js",
     "scripts": {
       "start": "node src/index.js",
       "dev": "node --watch src/index.js",
       "build": "echo 'No build step required'",
       "vercel-build": "npm install"
     },
     "dependencies": {
       "hono": "^4.0.0",
       "playwright": "^1.40.0",
       "@hono/node-server": "^1.19.0"
     }
   }
   ```

### 部署步骤

1. **连接 GitHub 仓库**
   - 登录 Vercel Dashboard
   - 点击 "New Project"
   - 选择你的 GitHub 仓库
   - 点击 "Import"

2. **配置环境变量**
   - 在项目设置中添加环境变量：
     ```
     NODE_ENV=production
     VERCEL=1
     ```

3. **修改代码适配 Vercel**
   
   创建 `src/vercel-adapter.js`：
   ```javascript
   import { Hono } from 'hono'
   import { handle } from '@hono/node-server/vercel'
   
   // 导入你的应用
   import app from './index.js'
   
   export default handle(app)
   ```

4. **部署**
   - Vercel 会自动检测配置并开始部署
   - 部署完成后会提供一个 `.vercel.app` 域名

### ⚠️ Vercel 限制

- **Serverless 函数限制**: 执行时间最长 10 秒（Pro 版 30 秒）
- **内存限制**: 1024MB
- **Playwright 限制**: Vercel 不支持 Playwright，需要使用替代方案

### Vercel 替代方案

由于 Playwright 不兼容 Vercel，建议使用 Puppeteer：

```javascript
// 替换 playwright 为 puppeteer
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

// 修改浏览器启动代码
const browser = await puppeteer.launch({
  args: chromium.args,
  defaultViewport: chromium.defaultViewport,
  executablePath: await chromium.executablePath(),
  headless: chromium.headless,
})
```

---

## 🖥️ 云服务器部署

云服务器部署提供更多控制和更好的性能，适合生产环境。

### 服务器要求

- **操作系统**: Ubuntu 20.04 LTS 或更高版本
- **内存**: 最少 2GB RAM
- **存储**: 至少 20GB 可用空间
- **CPU**: 1 核心以上

### 部署步骤

#### 1. 服务器初始化

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装基础工具
sudo apt install -y curl wget git vim htop
```

#### 2. 安装 Node.js

```bash
# 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

#### 3. 安装 Playwright 依赖

```bash
# 安装系统依赖
sudo apt-get install -y \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libxss1 \
    libasound2
```

#### 4. 部署应用

```bash
# 创建应用目录
sudo mkdir -p /var/www/webpage-mirror
cd /var/www/webpage-mirror

# 克隆代码
sudo git clone https://github.com/YOUR_USERNAME/webpage-mirror-system.git .

# 设置权限
sudo chown -R $USER:$USER /var/www/webpage-mirror

# 安装依赖
npm install

# 安装 Playwright 浏览器
npx playwright install chromium
```

#### 5. 创建 systemd 服务

```bash
# 创建服务文件
sudo vim /etc/systemd/system/webpage-mirror.service
```

添加以下内容：

```ini
[Unit]
Description=网页镜像展示系统
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/webpage-mirror
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

# 日志配置
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=webpage-mirror

[Install]
WantedBy=multi-user.target
```

#### 6. 启动服务

```bash
# 重新加载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start webpage-mirror

# 设置开机自启
sudo systemctl enable webpage-mirror

# 查看状态
sudo systemctl status webpage-mirror
```

#### 7. 配置 Nginx 反向代理

```bash
# 安装 Nginx
sudo apt install -y nginx

# 创建配置文件
sudo vim /etc/nginx/sites-available/webpage-mirror
```

添加以下配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 客户端最大请求体大小
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/webpage-mirror /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

#### 8. 配置 SSL (Let's Encrypt)

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com

# 测试自动续期
sudo certbot renew --dry-run
```

### 监控和维护

#### 日志查看

```bash
# 查看应用日志
sudo journalctl -u webpage-mirror -f

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

#### 更新应用

```bash
# 进入应用目录
cd /var/www/webpage-mirror

# 拉取最新代码
sudo git pull origin main

# 安装新依赖
npm install

# 重启服务
sudo systemctl restart webpage-mirror
```

---

## 🔧 环境变量配置

创建 `.env` 文件（不要提交到 git）：

```bash
# 服务器配置
NODE_ENV=production
PORT=3000

# 存储配置
CONTENT_DIR=./content

# 安全配置
MAX_CONTENT_SIZE=10485760  # 10MB

# Playwright 配置
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
```

---

## 🌐 域名配置

### DNS 设置

1. **A 记录**: 指向服务器 IP
   ```
   Type: A
   Name: @
   Value: YOUR_SERVER_IP
   TTL: 300
   ```

2. **CNAME 记录**: www 子域名
   ```
   Type: CNAME
   Name: www
   Value: your-domain.com
   TTL: 300
   ```

### Cloudflare 配置（推荐）

1. **添加域名到 Cloudflare**
2. **配置 DNS 记录**
3. **启用 SSL/TLS**
4. **配置缓存规则**：
   ```
   Page Rules:
   *.your-domain.com/content/* 
   Cache Level: Cache Everything
   Edge Cache TTL: 1 month
   ```

---

## ⚠️ 故障排除

### 常见问题

#### 1. Playwright 浏览器启动失败

```bash
# 检查依赖
npx playwright install-deps chromium

# 如果是无头服务器
export DISPLAY=:99
Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
```

#### 2. 权限问题

```bash
# 设置正确的文件权限
sudo chown -R www-data:www-data /var/www/webpage-mirror
sudo chmod -R 755 /var/www/webpage-mirror
```

#### 3. 内存不足

```bash
# 添加交换空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 永久启用
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

#### 4. 端口被占用

```bash
# 查看端口占用
sudo netstat -tulpn | grep 3000

# 杀死进程
sudo kill -9 PID
```

### 性能优化

#### 1. 启用 Gzip 压缩

在 Nginx 配置中添加：

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1000;
gzip_types
    text/plain
    text/css
    text/xml
    text/javascript
    application/xml+rss
    application/javascript
    application/json;
```

#### 2. 配置缓存

```nginx
# 静态资源缓存
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

#### 3. 限制并发连接

```nginx
# 限制每个 IP 的连接数
limit_conn_zone $binary_remote_addr zone=conn_limit_per_ip:10m;
limit_conn conn_limit_per_ip 10;

# 限制请求频率
limit_req_zone $binary_remote_addr zone=req_limit_per_ip:10m rate=5r/s;
limit_req zone=req_limit_per_ip burst=10 nodelay;
```

---

## 📊 监控建议

### 系统监控

推荐安装以下监控工具：

1. **htop**: 系统资源监控
2. **iotop**: 磁盘 I/O 监控  
3. **netstat**: 网络连接监控

### 应用监控

可以集成以下服务：

1. **Sentry**: 错误监控
2. **New Relic**: 性能监控
3. **Grafana + Prometheus**: 自建监控

---

## 🔐 安全建议

1. **防火墙配置**
   ```bash
   sudo ufw enable
   sudo ufw allow ssh
   sudo ufw allow 80
   sudo ufw allow 443
   ```

2. **定期更新**
   ```bash
   # 设置自动安全更新
   sudo apt install -y unattended-upgrades
   sudo dpkg-reconfigure -plow unattended-upgrades
   ```

3. **SSH 安全**
   - 禁用 root 登录
   - 使用密钥登录
   - 修改默认端口

4. **应用安全**
   - 定期更新依赖
   - 启用 HTTPS
   - 配置 CORS 策略

---

## 📞 技术支持

如遇到部署问题，请：

1. 检查服务状态：`sudo systemctl status webpage-mirror`
2. 查看错误日志：`sudo journalctl -u webpage-mirror -n 50`
3. 验证配置文件语法
4. 确认防火墙和端口设置

---

**祝您部署顺利！** 🎉
