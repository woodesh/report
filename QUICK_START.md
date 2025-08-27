# 🚀 快速开始指南

选择最适合您的部署方式，快速上线网页镜像展示系统。

## 📋 部署选项对比

| 方式 | 难度 | 成本 | 性能 | 适用场景 |
|------|------|------|------|----------|
| **Vercel** | ⭐ 简单 | 💰 免费/低成本 | ⚡ 中等 | 演示/测试 |
| **云服务器** | ⭐⭐⭐ 中等 | 💰💰 中等成本 | ⚡⚡⚡ 高性能 | 生产环境 |
| **Docker** | ⭐⭐ 简单 | 💰 本地免费 | ⚡⚡ 良好 | 开发/内网 |

---

## 🔥 方式一：Vercel (推荐新手)

**⏱️ 预计时间**: 5-10 分钟

### 1. 准备代码
```bash
# 推送到 GitHub
git init
git add .
git commit -m "网页镜像展示系统"
git remote add origin https://github.com/YOUR_USERNAME/webpage-mirror.git
git push -u origin main
```

### 2. 一键部署
```bash
# 使用自动化脚本
./scripts/deploy.sh vercel
```

### 3. 访问应用
部署完成后，Vercel 会提供一个 `.vercel.app` 域名，直接访问即可。

**⚠️ 注意**: Vercel 不支持 Playwright，如需完整功能请选择其他方式。

---

## 🖥️ 方式二：云服务器 (推荐生产)

**⏱️ 预计时间**: 20-30 分钟

### 1. 服务器准备
选择任意云服务商 (阿里云/腾讯云/AWS 等)，配置：
- **系统**: Ubuntu 20.04+
- **配置**: 2GB RAM, 1 CPU
- **带宽**: 1Mbps+

### 2. 一键部署
```bash
# 设置服务器信息
export SERVER_HOST=your-server-ip
export SERVER_USER=ubuntu

# 执行部署
./scripts/deploy.sh server
```

### 3. 配置域名 (可选)
```bash
# 在服务器上配置 Nginx + SSL
sudo certbot --nginx -d your-domain.com
```

---

## 🐳 方式三：Docker (推荐开发)

**⏱️ 预计时间**: 5 分钟

### 1. 启动服务
```bash
# 一键启动
./scripts/deploy.sh docker
```

### 2. 访问应用
打开浏览器访问: http://localhost:3000

### 3. 停止服务
```bash
docker-compose -f docker/docker-compose.yml down
```

---

## ⚙️ 环境配置

### 创建配置文件
```bash
# 复制环境变量模板
cp env.example .env

# 编辑配置 (可选)
vim .env
```

### 关键配置项
```bash
# 基础配置
NODE_ENV=production
PORT=3000

# 安全配置 (重要!)
BLOCKED_DOMAINS=localhost,127.0.0.1,192.168.0.0/16

# 性能配置
MAX_CONCURRENT_REQUESTS=5
BROWSER_TIMEOUT=30000
```

---

## 🔧 功能验证

部署完成后，访问以下路径验证功能：

1. **主页**: `/` - 创建镜像界面
2. **健康检查**: `/health` - 服务状态
3. **API 测试**: `/fetch?u=https://httpbin.org/html` - 抓取测试

---

## 📊 性能优化

### 服务器优化 (生产环境)
```bash
# 启用 Nginx 缓存
# 配置 CDN 加速
# 添加负载均衡
```

### 应用优化
```bash
# 调整并发数
MAX_CONCURRENT_REQUESTS=10

# 增加超时时间
BROWSER_TIMEOUT=60000

# 启用缓存
ENABLE_MEMORY_CACHE=true
```

---

## 🔐 安全建议

### 必需配置
```bash
# 1. 配置防火墙
sudo ufw enable
sudo ufw allow 80,443/tcp

# 2. 设置域名白名单
ALLOWED_DOMAINS=your-trusted-domains.com

# 3. 启用 API 密钥 (可选)
API_SECRET=your-random-secret-key
```

### SSL 证书
```bash
# 使用 Let's Encrypt (免费)
sudo certbot --nginx -d your-domain.com
```

---

## 🆘 常见问题

### Q: Playwright 无法启动浏览器
```bash
# 安装系统依赖
sudo apt-get install -y libnss3 libatk-bridge2.0-0

# 重新安装浏览器
npx playwright install chromium
```

### Q: 内存不足
```bash
# 添加交换空间
sudo fallocate -l 2G /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Q: 端口被占用
```bash
# 查看端口占用
sudo netstat -tulpn | grep 3000

# 修改端口
export PORT=8080
```

---

## 📞 获取帮助

- **查看详细文档**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **部署脚本帮助**: `./scripts/deploy.sh help`
- **日志查看**: `sudo journalctl -u webpage-mirror -f`

---

## 🎯 下一步

部署成功后，您可以：

1. **配置自定义域名**
2. **设置 CDN 加速**
3. **添加监控告警**
4. **扩展功能定制**

祝您使用愉快！ 🎉
