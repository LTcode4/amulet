const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 建立images資料夾（如果不存在）
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
}

// 中介軟體設定
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 詳細的 CORS 設定 - 限制特定網域
const allowedOrigins = [
    'https://preview-amulet.web-interactive.org',
    'https://amulet.web-interactive.org'
];

// 在開發環境中加入 localhost
if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:3000', 'http://localhost:9000');
}

app.use(cors({
    origin: function (origin, callback) {
        // 允許沒有 origin 的請求（例如行動應用程式）
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('不允許的 CORS 來源'), false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar']
}));

// 額外的 CORS 標頭設定
app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // 只為允許的來源設定 CORS 標頭
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
    
    // 處理預檢請求
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use(express.json({ limit: '50mb' })); // 支援大型base64圖片
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 靜態檔案服務（可選，用於直接存取圖片）
app.use('/images', express.static(imagesDir));

// 健康檢查端點
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 根路徑
app.get('/', (req, res) => {
    res.json({
        message: 'Image Processing API Server',
        version: '1.0.1',
        endpoints: {
            health: '/health',
            upload: 'POST /api/upload-image',
            cleanup: 'POST /api/cleanup-images'
        },
        features: {
            autoCleanup: '每月1號凌晨2:00自動清理30天以上的圖片',
            manualCleanup: '可透過 /api/cleanup-images 手動觸發清理'
        }
    });
});

// Base64轉PNG圖片上傳API
app.post('/api/upload-image', async (req, res) => {
    try {
        const { image } = req.body;

        // 驗證base64資料
        if (!image) {
            return res.status(400).json({
                success: false,
                message: '缺少圖片資料'
            });
        }

        // 移除base64前綴（如果存在）
        let base64Data = image;
        if (image.includes(',')) {
            base64Data = image.split(',')[1];
        }

        // 驗證base64格式
        if (!isValidBase64(base64Data)) {
            return res.status(400).json({
                success: false,
                message: '無效的base64格式'
            });
        }

        // 轉換base64為buffer
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // 產生唯一檔名
        const timestamp = Date.now();
        const uniqueId = uuidv4();
        const filename = `${timestamp}_${uniqueId}.png`;
        const filepath = path.join(imagesDir, filename);

        // 使用Sharp處理圖片：轉換為PNG並壓縮
        await sharp(imageBuffer)
            .png({
                quality: 80,           // 標準壓縮品質
                compressionLevel: 6,   // PNG壓縮等級
                progressive: false
            })
            .toFile(filepath);

        // 回傳成功結果
        res.status(200).json({
            success: true,
            filename: filename,
            message: '圖片上傳成功',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('圖片處理錯誤:', error);
        
        // 根據錯誤類型回傳適當的錯誤訊息
        if (error.message.includes('Input buffer contains unsupported image format')) {
            return res.status(400).json({
                success: false,
                message: '不支援的圖片格式'
            });
        }

        res.status(500).json({
            success: false,
            message: '伺服器內部錯誤',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 驗證base64格式的輔助函數
function isValidBase64(str) {
    try {
        // 在Node.js中使用Buffer來驗證base64
        const buffer = Buffer.from(str, 'base64');
        return buffer.toString('base64') === str;
    } catch (err) {
        // 使用正規表達式作為備用驗證
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        return base64Regex.test(str) && str.length % 4 === 0;
    }
}

// 圖片清理函數
async function cleanupOldImages() {
    try {
        console.log('🧹 開始執行圖片清理...');
        
        const files = await fs.promises.readdir(imagesDir);
        const now = Date.now();
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000; // 30天的毫秒數
        
        let deletedCount = 0;
        let totalSize = 0;
        
        for (const file of files) {
            const filePath = path.join(imagesDir, file);
            
            try {
                const stats = await fs.promises.stat(filePath);
                
                // 檢查檔案是否超過30天
                if (now - stats.mtime.getTime() > thirtyDaysInMs) {
                    totalSize += stats.size;
                    await fs.promises.unlink(filePath);
                    deletedCount++;
                    console.log(`🗑️  已刪除過期圖片: ${file}`);
                }
            } catch (fileError) {
                console.error(`❌ 無法處理檔案 ${file}:`, fileError.message);
            }
        }
        
        const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
        console.log(`✅ 清理完成！刪除了 ${deletedCount} 個檔案，釋放了 ${sizeInMB} MB 空間`);
        
        return {
            deletedCount,
            totalSize,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('❌ 圖片清理過程中發生錯誤:', error);
        throw error;
    }
}

// 設定每月清理任務 - 每月1號凌晨2:00執行
cron.schedule('0 2 1 * *', async () => {
    console.log('📅 觸發每月圖片清理任務');
    try {
        await cleanupOldImages();
    } catch (error) {
        console.error('❌ 定時清理任務失敗:', error);
    }
}, {
    timezone: "Asia/Taipei"
});

// 手動清理API端點（可選，用於測試或緊急清理）
app.post('/api/cleanup-images', async (req, res) => {
    try {
        const result = await cleanupOldImages();
        res.status(200).json({
            success: true,
            message: '圖片清理完成',
            ...result
        });
    } catch (error) {
        console.error('手動清理失敗:', error);
        res.status(500).json({
            success: false,
            message: '清理過程中發生錯誤',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 錯誤處理中介軟體
app.use((error, req, res, next) => {
    console.error('未處理的錯誤:', error);
    res.status(500).json({
        success: false,
        message: '伺服器發生錯誤'
    });
});


// 啟動伺服器
app.listen(PORT, () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const serverUrl = isProduction ? `運行於 port ${PORT}` : `http://localhost:${PORT}`;
    const healthUrl = isProduction ? '/health' : `http://localhost:${PORT}/health`;
    
    console.log(`🚀 伺服器${serverUrl}`);
    console.log(`📁 圖片儲存路徑: ${imagesDir}`);
    console.log(`🏥 健康檢查: ${healthUrl}`);
    console.log(`🧹 自動清理: 每月1號凌晨2:00清理30天以上的圖片`);
    console.log(`🔧 手動清理: POST ${isProduction ? '' : 'http://localhost:' + PORT}/api/cleanup-images`);
});

module.exports = app;
