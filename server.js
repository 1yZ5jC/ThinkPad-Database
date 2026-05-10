const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

// 解析 JSON 请求体
app.use(express.json());

// 托管当前目录下的所有静态文件（包括 generator.html, modeldata 等）
app.use(express.static(__dirname));

// API: 添加新 CPU
app.post('/api/cpu/add', (req, res) => {
    try {
        const { cpuDetail, indexEntry } = req.body;

        // 验证必要字段
        if (!indexEntry || !indexEntry.file || !indexEntry.name) {
            return res.status(400).json({ error: '缺少索引信息（file, name）' });
        }

        const cpuName = indexEntry.name;
        const safeFileName = indexEntry.file.replace(/[<>:"/\\|?*]/g, '_'); // 安全文件名

        // ===== 1. 更新 CPU.json（索引文件） =====
        const cpuIndexPath = path.join(__dirname, 'modeldata', 'CPU', 'CPU.json');
        let cpuList = [];
        if (fs.existsSync(cpuIndexPath)) {
            try {
                const raw = fs.readFileSync(cpuIndexPath, 'utf-8');
                cpuList = JSON.parse(raw);
            } catch (e) {
                console.error('CPU.json 解析失败，将创建新文件', e);
            }
        }

        // 避免重复（按 file 检查）
        const exists = cpuList.some(item => item.file === indexEntry.file);
        if (exists) {
            // 你可以根据需求决定是否覆盖，这里选择返回错误
            return res.status(409).json({ error: `CPU ${cpuName} 已存在于索引中` });
        }

        // 追加新条目
        cpuList.push({
            file: indexEntry.file,
            name: indexEntry.name,
            family: indexEntry.family || '未分类',
            Architecture: indexEntry.Architecture || '未知',
            generation: indexEntry.generation || '未知'
        });

        // 写入 CPU.json
        fs.writeFileSync(cpuIndexPath, JSON.stringify(cpuList, null, 4), 'utf-8');
        console.log(`✓ 更新索引文件: ${cpuIndexPath}`);

        // ===== 2. 生成详细的 CPU 配置文件（型号.json） =====
        const cpuDir = path.join(__dirname, 'modeldata', 'CPU');
        if (!fs.existsSync(cpuDir)) {
            fs.mkdirSync(cpuDir, { recursive: true });
        }

        const detailFilePath = path.join(cpuDir, safeFileName);
        // 写入详细的 CPU 参数（来自 cpuDetail 对象）
        fs.writeFileSync(detailFilePath, JSON.stringify(cpuDetail, null, 4), 'utf-8');
        console.log(`✓ 创建详细文件: ${detailFilePath}`);

        res.json({ success: true, message: `CPU ${cpuName} 添加成功，索引及详细文件已更新` });
    } catch (err) {
        console.error('添加 CPU 出错:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// API: 添加新 GPU
app.post('/api/gpu/add', (req, res) => {
    try {
        const { gpuDetail, indexEntry } = req.body;

        // 验证必要字段
        if (!indexEntry || !indexEntry.file || !indexEntry.name) {
            return res.status(400).json({ error: '缺少索引信息（file, name）' });
        }

        const gpuName = indexEntry.name;
        const safeFileName = indexEntry.file.replace(/[<>:"/\\|?*]/g, '_');

        // ===== 1. 更新 GPU.json（索引文件） =====
        const gpuIndexPath = path.join(__dirname, 'modeldata', 'Graphics', 'GPU.json');
        let gpuList = [];
        if (fs.existsSync(gpuIndexPath)) {
            try {
                const raw = fs.readFileSync(gpuIndexPath, 'utf-8');
                gpuList = JSON.parse(raw);
            } catch (e) {
                console.error('GPU.json 解析失败，将创建新文件', e);
            }
        }

        // 避免重复
        const exists = gpuList.some(item => item.file === indexEntry.file);
        if (exists) {
            return res.status(409).json({ error: `GPU ${gpuName} 已存在于索引中` });
        }

        gpuList.push({
            file: indexEntry.file,
            name: indexEntry.name,
            family: indexEntry.family || '未分类',
            Architecture: indexEntry.Architecture || '未知',
            generation: indexEntry.generation || '未知'
        });

        // 确保目录存在
        const gpuDir = path.dirname(gpuIndexPath);
        if (!fs.existsSync(gpuDir)) {
            fs.mkdirSync(gpuDir, { recursive: true });
        }
        fs.writeFileSync(gpuIndexPath, JSON.stringify(gpuList, null, 4), 'utf-8');
        console.log(`✓ 更新 GPU 索引文件: ${gpuIndexPath}`);

        // ===== 2. 生成详细的 GPU 配置文件（型号.json） =====
        const detailFilePath = path.join(__dirname, 'modeldata', 'Graphics', safeFileName);
        // 写入详细配置（前端传来的 gpuDetail 对象）
        fs.writeFileSync(detailFilePath, JSON.stringify(gpuDetail, null, 4), 'utf-8');
        console.log(`✓ 创建 GPU 详细文件: ${detailFilePath}`);

        res.json({ success: true, message: `GPU ${gpuName} 添加成功，索引及详细文件已更新` });
    } catch (err) {
        console.error('添加 GPU 出错:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 服务器已启动: http://localhost:${PORT}`);
    console.log(`📁 静态文件目录: ${__dirname}`);
});