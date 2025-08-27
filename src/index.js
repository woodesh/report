import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { chromium } from 'playwright'
import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = new Hono()

// 存储目录
const CONTENT_DIR = path.join(__dirname, '../content')

// 确保内容目录存在
await fs.mkdir(CONTENT_DIR, { recursive: true })

// 生成唯一标识码
function generateCode() {
  return crypto.randomBytes(6).toString('hex')
}

// 检查URL是否安全（简单的安全检查）
function isUrlSafe(url) {
  try {
    const urlObj = new URL(url)
    // 基本的安全检查：只允许http和https协议
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false
    }
    // 防止访问内网地址
    const hostname = urlObj.hostname
    if (hostname === 'localhost' || 
        hostname.startsWith('127.') || 
        hostname.startsWith('192.168.') || 
        hostname.startsWith('10.') ||
        (hostname.startsWith('172.') && parseInt(hostname.split('.')[1]) >= 16 && parseInt(hostname.split('.')[1]) <= 31)) {
      return false
    }
    return true
  } catch {
    return false
  }
}

// 处理资源路径，转换为绝对路径
function processResourceUrls(html, baseUrl) {
  try {
    const base = new URL(baseUrl)
    
    // 处理各种资源标签
    const patterns = [
      { regex: /(<img[^>]+src=["'])([^"']+)(["'][^>]*>)/gi, group: 2 },
      { regex: /(<link[^>]+href=["'])([^"']+)(["'][^>]*>)/gi, group: 2 },
      { regex: /(<script[^>]+src=["'])([^"']+)(["'][^>]*>)/gi, group: 2 },
      { regex: /(url\(["']?)([^"')]+)(["']?\))/gi, group: 2 }
    ]
    
    let processedHtml = html
    
    patterns.forEach(pattern => {
      processedHtml = processedHtml.replace(pattern.regex, (match, prefix, url, suffix) => {
        try {
          if (url.startsWith('http') || url.startsWith('//')) {
            return match // 已经是绝对路径
          }
          const absoluteUrl = new URL(url, base).href
          return prefix + absoluteUrl + suffix
        } catch {
          return match // 如果处理失败，保持原样
        }
      })
    })
    
    return processedHtml
  } catch {
    return html // 如果处理失败，返回原始HTML
  }
}

// 保存页面内容
async function savePageContent(code, data) {
  const filePath = path.join(CONTENT_DIR, `${code}.json`)
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

// 获取页面内容
async function getPageContent(code) {
  try {
    const filePath = path.join(CONTENT_DIR, `${code}.json`)
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

// 页面抓取API
app.get('/fetch', async (c) => {
  const url = c.req.query('u')
  
  if (!url) {
    return c.json({ error: '缺少URL参数' }, 400)
  }
  
  if (!isUrlSafe(url)) {
    return c.json({ error: '不安全的URL' }, 400)
  }
  
  let browser = null
  try {
    // 启动浏览器
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    const page = await browser.newPage()
    
    // 设置用户代理
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    })
    
    // 访问页面
    console.log(`正在访问: ${url}`)
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    
    // 检查是否存在iframe
    const iframes = await page.$$('iframe')
    let finalUrl = url
    let htmlContent = await page.content()
    
    if (iframes.length > 0) {
      console.log(`发现 ${iframes.length} 个iframe，获取第一个`)
      
      // 获取第一个iframe的src
      const iframeSrc = await iframes[0].getAttribute('src')
      
      if (iframeSrc) {
        try {
          // 处理相对路径
          const iframeUrl = new URL(iframeSrc, url).href
          console.log(`iframe URL: ${iframeUrl}`)
          
          if (isUrlSafe(iframeUrl)) {
            // 访问iframe页面
            await page.goto(iframeUrl, { waitUntil: 'networkidle', timeout: 30000 })
            htmlContent = await page.content()
            finalUrl = iframeUrl
            console.log('成功获取iframe内容')
          }
        } catch (error) {
          console.log('iframe访问失败，使用原页面内容:', error.message)
        }
      }
    }
    
    // 处理资源路径
    const processedHtml = processResourceUrls(htmlContent, finalUrl)
    
    // 生成标识码
    const code = generateCode()
    
    // 保存数据
    const pageData = {
      code,
      originalUrl: url,
      finalUrl,
      iframeUrl: finalUrl !== url ? finalUrl : null,
      content: processedHtml,
      timestamp: new Date().toISOString()
    }
    
    await savePageContent(code, pageData)
    
    // 构建预览URL
    const previewUrl = `${c.req.url.split('/fetch')[0]}/${code}`
    
    console.log(`页面保存成功，代码: ${code}`)
    
    return c.json({
      code,
      iframe_url: pageData.iframeUrl,
      preview_url: previewUrl
    })
    
  } catch (error) {
    console.error('抓取失败:', error)
    return c.json({ 
      error: '页面抓取失败', 
      details: error.message 
    }, 500)
  } finally {
    if (browser) {
      await browser.close()
    }
  }
})

// 健康检查
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 页面展示路由
app.get('/:code', async (c) => {
  const code = c.req.param('code')
  
  if (!code || !/^[a-f0-9]{12}$/.test(code)) {
    return c.html('<h1>无效的页面代码</h1>', 400)
  }
  
  const pageData = await getPageContent(code)
  
  if (!pageData) {
    return c.html('<h1>页面不存在</h1>', 404)
  }
  
  // 添加固定页头
  const mirrorHeader = `
    <!-- 款世镜像页头 -->
    <style>.toc-fixed{top:3rem!important;}@media (max-width: 1280px) {
    .toc-fixed {left:0!important;}}</style>
    <div id="kuanshi-header" style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 40px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <div style="display: flex; align-items: center;">
        <div style="
          font-size: 16px;
          font-weight: bold;
          background: linear-gradient(45deg, #fff, #e0e7ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-right: 15px;
        ">款世</div>
      </div>
    </div>
    
  `;
  
  // 在body标签开始后插入页头
  let modifiedContent = pageData.content;
  
  // 寻找body标签开始位置
  const bodyStartMatch = modifiedContent.match(/<body[^>]*>/i);
  if (bodyStartMatch) {
    const bodyStartIndex = bodyStartMatch.index + bodyStartMatch[0].length;
    modifiedContent = 
      modifiedContent.slice(0, bodyStartIndex) + 
      mirrorHeader + 
      modifiedContent.slice(bodyStartIndex);
  } else {
    // 如果没有找到body标签，在开头添加
    modifiedContent = mirrorHeader + modifiedContent;
  }
  
  // 返回修改后的HTML内容
  return c.html(modifiedContent)
})

// 根路径
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>网页镜像展示系统</title>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .container { background: #f5f5f5; padding: 30px; border-radius: 10px; }
            h1 { color: #333; }
            .form-group { margin: 20px 0; }
            label { display: block; margin-bottom: 5px; font-weight: bold; }
            input[type="url"] { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
            button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
            button:hover { background: #0056b3; }
            .result { margin-top: 20px; padding: 15px; background: white; border-radius: 5px; }
            .error { background: #f8d7da; color: #721c24; }
            .success { background: #d4edda; color: #155724; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>网页镜像展示系统</h1>
            <p>输入网页URL来创建镜像页面</p>
            
            <form id="fetchForm">
                <div class="form-group">
                    <label for="url">网页URL:</label>
                    <input type="url" id="url" name="url" placeholder="https://example.com" required>
                </div>
                <button type="submit">创建镜像</button>
            </form>
            
            <div id="result" style="display: none;"></div>
        </div>
        
        <script>
            document.getElementById('fetchForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const url = document.getElementById('url').value;
                const resultDiv = document.getElementById('result');
                
                resultDiv.style.display = 'block';
                resultDiv.className = 'result';
                resultDiv.innerHTML = '正在处理...';
                
                try {
                    const response = await fetch('/fetch?u=' + encodeURIComponent(url));
                    const data = await response.json();
                    
                    if (response.ok) {
                        resultDiv.className = 'result success';
                        resultDiv.innerHTML = \`
                            <h3>镜像创建成功！</h3>
                            <p><strong>代码:</strong> \${data.code}</p>
                            \${data.iframe_url ? \`<p><strong>iframe URL:</strong> \${data.iframe_url}</p>\` : ''}
                            <p><strong>预览链接:</strong> <a href="\${data.preview_url}" target="_blank">\${data.preview_url}</a></p>
                        \`;
                    } else {
                        resultDiv.className = 'result error';
                        resultDiv.innerHTML = \`<h3>错误</h3><p>\${data.error}</p>\`;
                    }
                } catch (error) {
                    resultDiv.className = 'result error';
                    resultDiv.innerHTML = \`<h3>请求失败</h3><p>\${error.message}</p>\`;
                }
            });
        </script>
    </body>
    </html>
  `)
})

const port = 3000
console.log(`网页镜像展示系统启动中...`)
console.log(`服务器将在 http://localhost:${port} 启动`)

serve({
  fetch: app.fetch,
  port
})
