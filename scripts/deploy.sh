#!/bin/bash

# 网页镜像展示系统部署脚本
# 使用方法: ./scripts/deploy.sh [vercel|server|docker]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    local deps=("$@")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            log_error "$dep 未安装，请先安装此依赖"
            exit 1
        fi
    done
}

# Vercel 部署
deploy_vercel() {
    log_info "开始 Vercel 部署..."
    
    # 检查依赖
    check_dependencies "npm" "git"
    
    # 检查是否已安装 Vercel CLI
    if ! command -v vercel &> /dev/null; then
        log_info "安装 Vercel CLI..."
        npm install -g vercel
    fi
    
    # 检查 vercel.json 是否存在
    if [ ! -f "vercel.json" ]; then
        log_error "vercel.json 文件不存在，请确保在项目根目录运行此脚本"
        exit 1
    fi
    
    # 安装依赖
    log_info "安装项目依赖..."
    npm install
    
    # 部署到 Vercel
    log_info "部署到 Vercel..."
    vercel --prod
    
    log_success "Vercel 部署完成！"
}

# 服务器部署
deploy_server() {
    log_info "开始服务器部署..."
    
    # 检查环境变量
    if [ -z "$SERVER_HOST" ] || [ -z "$SERVER_USER" ]; then
        log_error "请设置环境变量 SERVER_HOST 和 SERVER_USER"
        log_info "例如: export SERVER_HOST=your-server.com && export SERVER_USER=ubuntu"
        exit 1
    fi
    
    local SERVER_PATH="${SERVER_PATH:-/var/www/webpage-mirror}"
    
    log_info "服务器: $SERVER_HOST"
    log_info "用户: $SERVER_USER"
    log_info "路径: $SERVER_PATH"
    
    # 同步代码到服务器
    log_info "同步代码到服务器..."
    rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'content' \
        ./ "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/"
    
    # 在服务器上执行部署命令
    log_info "在服务器上安装依赖并重启服务..."
    ssh "$SERVER_USER@$SERVER_HOST" << EOF
        cd $SERVER_PATH
        npm install --production
        npx playwright install chromium
        sudo systemctl restart webpage-mirror
        sudo systemctl status webpage-mirror
EOF
    
    log_success "服务器部署完成！"
}

# Docker 部署
deploy_docker() {
    log_info "开始 Docker 部署..."
    
    # 检查依赖
    check_dependencies "docker" "docker-compose"
    
    # 检查 Docker 是否运行
    if ! docker info &> /dev/null; then
        log_error "Docker 未运行，请先启动 Docker"
        exit 1
    fi
    
    # 构建并启动容器
    log_info "构建 Docker 镜像..."
    docker-compose -f docker/docker-compose.yml build
    
    log_info "启动服务..."
    docker-compose -f docker/docker-compose.yml up -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    if curl -f http://localhost:3000/health &> /dev/null; then
        log_success "Docker 部署完成！服务运行在 http://localhost:3000"
    else
        log_error "服务启动失败，请检查日志: docker-compose -f docker/docker-compose.yml logs"
        exit 1
    fi
}

# 显示帮助信息
show_help() {
    echo "网页镜像展示系统部署脚本"
    echo ""
    echo "使用方法:"
    echo "  ./scripts/deploy.sh [vercel|server|docker]"
    echo ""
    echo "部署选项:"
    echo "  vercel  - 部署到 Vercel 平台"
    echo "  server  - 部署到云服务器"
    echo "  docker  - 本地 Docker 部署"
    echo ""
    echo "环境变量 (服务器部署):"
    echo "  SERVER_HOST  - 服务器地址"
    echo "  SERVER_USER  - SSH 用户名"
    echo "  SERVER_PATH  - 部署路径 (默认: /var/www/webpage-mirror)"
    echo ""
    echo "示例:"
    echo "  ./scripts/deploy.sh vercel"
    echo "  SERVER_HOST=example.com SERVER_USER=ubuntu ./scripts/deploy.sh server"
    echo "  ./scripts/deploy.sh docker"
}

# 主函数
main() {
    case "${1:-}" in
        "vercel")
            deploy_vercel
            ;;
        "server")
            deploy_server
            ;;
        "docker")
            deploy_docker
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        "")
            log_error "请指定部署类型"
            show_help
            exit 1
            ;;
        *)
            log_error "未知的部署类型: $1"
            show_help
            exit 1
            ;;
    esac
}

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    log_error "请在项目根目录运行此脚本"
    exit 1
fi

# 执行主函数
main "$@"
