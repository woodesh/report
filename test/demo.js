// 使用 Node.js 18+ 内置的 fetch

const BASE_URL = 'http://localhost:3000'

async function testSystem() {
  console.log('🚀 开始测试网页镜像展示系统...\n')
  
  try {
    // 1. 测试健康检查
    console.log('1. 测试健康检查...')
    const healthResponse = await fetch(`${BASE_URL}/health`)
    const healthData = await healthResponse.json()
    console.log('✅ 健康检查通过:', healthData)
    console.log('')
    
    // 2. 测试页面抓取 - 使用一个简单的测试页面
    console.log('2. 测试页面抓取...')
    const testUrl = 'https://httpbin.org/html'  // 简单的HTML测试页面
    
    console.log(`正在抓取: ${testUrl}`)
    const fetchResponse = await fetch(`${BASE_URL}/fetch?u=${encodeURIComponent(testUrl)}`)
    
    if (!fetchResponse.ok) {
      const errorData = await fetchResponse.json()
      console.log('❌ 抓取失败:', errorData)
      return
    }
    
    const fetchData = await fetchResponse.json()
    console.log('✅ 抓取成功!')
    console.log('📋 返回数据:', {
      code: fetchData.code,
      iframe_url: fetchData.iframe_url,
      preview_url: fetchData.preview_url
    })
    console.log('')
    
    // 3. 测试页面展示
    console.log('3. 测试页面展示...')
    const previewResponse = await fetch(`${BASE_URL}/${fetchData.code}`)
    
    if (!previewResponse.ok) {
      console.log('❌ 页面展示失败')
      return
    }
    
    const htmlContent = await previewResponse.text()
    console.log('✅ 页面展示成功!')
    console.log('📄 HTML长度:', htmlContent.length, '字符')
    console.log('🔗 预览链接:', fetchData.preview_url)
    console.log('')
    
    // 4. 测试带iframe的页面（模拟测试）
    console.log('4. 测试带iframe的页面...')
    const iframeTestUrl = 'https://www.w3schools.com/html/html_iframe.asp'
    
    console.log(`正在抓取带iframe的页面: ${iframeTestUrl}`)
    const iframeResponse = await fetch(`${BASE_URL}/fetch?u=${encodeURIComponent(iframeTestUrl)}`)
    
    if (iframeResponse.ok) {
      const iframeData = await iframeResponse.json()
      console.log('✅ iframe页面抓取成功!')
      console.log('📋 返回数据:', {
        code: iframeData.code,
        iframe_url: iframeData.iframe_url,
        preview_url: iframeData.preview_url
      })
    } else {
      const errorData = await iframeResponse.json()
      console.log('⚠️ iframe页面抓取失败（这是正常的，可能是网络限制）:', errorData.error)
    }
    console.log('')
    
    // 5. 测试错误情况
    console.log('5. 测试错误处理...')
    
    // 测试无效URL
    const invalidResponse = await fetch(`${BASE_URL}/fetch?u=invalid-url`)
    console.log('测试无效URL:', invalidResponse.status === 400 ? '✅ 正确返回400' : '❌ 错误处理失败')
    
    // 测试缺少URL参数
    const noUrlResponse = await fetch(`${BASE_URL}/fetch`)
    console.log('测试缺少URL参数:', noUrlResponse.status === 400 ? '✅ 正确返回400' : '❌ 错误处理失败')
    
    // 测试无效代码
    const invalidCodeResponse = await fetch(`${BASE_URL}/invalid-code`)
    console.log('测试无效页面代码:', invalidCodeResponse.status === 400 ? '✅ 正确返回400' : '❌ 错误处理失败')
    
    console.log('')
    console.log('🎉 所有测试完成!')
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message)
    console.log('')
    console.log('💡 请确保服务器正在运行: npm start')
  }
}

// 检查是否直接运行此文件
if (process.argv[1] && process.argv[1].endsWith('test/demo.js')) {
  testSystem()
}

export { testSystem }
