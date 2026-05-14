const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

// 解析 JSON 请求体
app.use(express.json());

// ---------- 工具函数 ----------
function safeFileName(name) {
    return String(name || 'unknown').replace(/[<>:"/\\|?*]/g, '_');
}

function saveComponentItem(res, componentDir, indexFileName, detail, indexEntry) {
    try {
        if (!indexEntry || !indexEntry.file || !indexEntry.name) {
            return res.status(400).json({ error: '缺少索引信息（file, name）' });
        }
        const safeFile = safeFileName(indexEntry.file);
        const dir = path.join(__dirname, 'modeldata', componentDir);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const detailPath = path.join(dir, safeFile);
        fs.writeFileSync(detailPath, JSON.stringify(detail, null, 4), 'utf-8');
        console.log(`✓ 已保存详细文件: ${detailPath}`);

        const indexPath = path.join(dir, indexFileName);
        let list = [];
        if (fs.existsSync(indexPath)) {
            try {
                const raw = fs.readFileSync(indexPath, 'utf-8');
                list = JSON.parse(raw);
            } catch (e) {
                console.error(`${indexFileName} 解析失败，将创建新文件`, e);
            }
        }

        const exists = list.some(item => item.file === indexEntry.file);
        if (exists) {
            return res.status(409).json({ error: `${indexEntry.name} 已存在于索引中` });
        }

        list.push({ ...indexEntry, file: safeFile });
        fs.writeFileSync(indexPath, JSON.stringify(list, null, 4), 'utf-8');
        console.log(`✓ 更新索引文件: ${indexPath}`);

        res.json({ success: true, message: `${indexEntry.name} 添加成功` });
    } catch (err) {
        console.error('保存组件出错:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
}

// ---------- API: 添加新 CPU ----------
app.post('/api/cpu/add', (req, res) => {
    const { cpuDetail, indexEntry } = req.body;
    saveComponentItem(res, 'CPU', 'CPU.json', cpuDetail, indexEntry);
});

// ---------- API: 添加新 GPU ----------
app.post('/api/gpu/add', (req, res) => {
    const { gpuDetail, indexEntry } = req.body;
    saveComponentItem(res, 'Graphics', 'GPU.json', gpuDetail, indexEntry);
});

// ---------- API: 添加屏幕 ----------
app.post('/api/display/add', (req, res) => {
    const { displayDetail, indexEntry } = req.body;
    saveComponentItem(res, 'Display', 'Display.json', displayDetail, indexEntry);
});

// ---------- API: 添加有线网卡 ----------
app.post('/api/ethernet/add', (req, res) => {
    const { ethernetDetail, indexEntry } = req.body;
    saveComponentItem(res, 'Ethernet', 'Ethernet.json', ethernetDetail, indexEntry);
});

// ---------- API: 添加 WiFi ----------
app.post('/api/wifi/add', (req, res) => {
    const { wifiDetail, indexEntry } = req.body;
    saveComponentItem(res, 'WLAN', 'WLAN.json', wifiDetail, indexEntry);
});

// ---------- API: 添加 WWAN ----------
app.post('/api/wwan/add', (req, res) => {
    const { wwanDetail, indexEntry } = req.body;
    saveComponentItem(res, 'WWAN', 'WWAN.json', wwanDetail, indexEntry);
});

// ---------- API: 添加扩展坞 ----------
app.post('/api/dock/add', (req, res) => {
    const { dockDetail, indexEntry } = req.body;
    saveComponentItem(res, 'Dock', 'Dock.json', dockDetail, indexEntry);
});

// ---------- API: 添加机型配置 ----------
app.post('/api/model/add', (req, res) => {
    try {
        const { modelDetail, indexEntry } = req.body;
        if (!indexEntry || !indexEntry.file || !indexEntry.name) {
            return res.status(400).json({ error: '缺少索引信息（file, name）' });
        }
        const safeFile = safeFileName(indexEntry.file);

        const detailPath = path.join(__dirname, 'modeldata', safeFile);
        fs.writeFileSync(detailPath, JSON.stringify(modelDetail, null, 4), 'utf-8');
        console.log(`✓ 已保存机型文件: ${detailPath}`);

        const indexPath = path.join(__dirname, 'modeldata', 'index.json');
        let list = [];
        if (fs.existsSync(indexPath)) {
            try {
                const raw = fs.readFileSync(indexPath, 'utf-8');
                list = JSON.parse(raw);
            } catch (e) {
                console.error('index.json 解析失败，将创建新文件', e);
            }
        }
        const exists = list.some(item => item.file === indexEntry.file);
        if (exists) {
            return res.status(409).json({ error: `${indexEntry.name} 已存在于索引中` });
        }
        list.push({ ...indexEntry, file: safeFile });
        fs.writeFileSync(indexPath, JSON.stringify(list, null, 4), 'utf-8');
        console.log(`✓ 更新 index.json`);

        res.json({ success: true, message: `机型 ${indexEntry.name} 添加成功` });
    } catch (err) {
        console.error('保存机型出错:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// ---------- API: 获取 CPU 图标列表 ----------
app.get('/api/list/cpu_icons', (req, res) => {
    const iconsDir = path.join(__dirname, 'modeldata', 'CPU', 'cpu_icon');
    if (!fs.existsSync(iconsDir)) {
        return res.json([]);
    }
    fs.readdir(iconsDir, (err, files) => {
        if (err) {
            console.error('读取 cpu_icon 目录失败:', err);
            return res.status(500).json({ error: '读取图标目录失败' });
        }
        const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'];
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return imageExts.includes(ext);
        });
        res.json(imageFiles);
    });
});

// ---------- API: 获取 GPU 图标列表 ----------
app.get('/api/list/gpu_icons', (req, res) => {
    const iconsDir = path.join(__dirname, 'modeldata', 'Graphics', 'Graphics_icons');
    if (!fs.existsSync(iconsDir)) {
        return res.json([]);
    }
    fs.readdir(iconsDir, (err, files) => {
        if (err) {
            console.error('读取 Graphics_icons 目录失败:', err);
            return res.status(500).json({ error: '读取图标目录失败' });
        }
        const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'];
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return imageExts.includes(ext);
        });
        res.json(imageFiles);
    });
});

// ---------- 重建索引 API ----------
app.post('/api/rebuild-index/:type', (req, res) => {
    const type = req.params.type;
    const validTypes = ['cpu', 'gpu', 'display', 'ethernet', 'wifi', 'wwan', 'dock', 'model'];
    if (!validTypes.includes(type)) {
        return res.status(400).json({ error: '无效的类型' });
    }

    try {
        let result;
        switch (type) {
            case 'cpu':
                result = rebuildCpuIndex();
                break;
            case 'gpu':
                result = rebuildGpuIndex();
                break;
            case 'display':
                result = rebuildDisplayIndex();
                break;
            case 'ethernet':
                result = rebuildEthernetIndex();
                break;
            case 'wifi':
                result = rebuildWlanIndex();
                break;
            case 'wwan':
                result = rebuildWwanIndex();
                break;
            case 'dock':
                result = rebuildDockIndex();
                break;
            case 'model':
                result = rebuildModelIndex();
                break;
        }
        res.json({ success: true, message: `${type} 索引重建完成`, count: result.count });
    } catch (err) {
        console.error(`重建 ${type} 索引失败:`, err);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// ---------- 重建索引具体实现 ----------
function rebuildCpuIndex() {
    const dir = path.join(__dirname, 'modeldata', 'CPU');
    const indexPath = path.join(dir, 'CPU.json');
    const excludeDirs = ['cpu_icon'];
    const files = fs.readdirSync(dir);
    const entries = [];

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (excludeDirs.includes(file)) continue;
            continue;
        }
        if (!file.endsWith('.json') || file === 'CPU.json') continue;
        try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            let data = JSON.parse(content);
            if (data.thinkpad_database && Array.isArray(data.thinkpad_database)) {
                data = data.thinkpad_database[0];
            }
            const id = file.replace(/\.json$/i, '');
            const name = data.model || data.name || id;
            const family = data.family || '未分类';
            const Architecture = data.Architecture || data.architecture || '未知';
            const generation = data.generation || data.Generation || '未知';
            entries.push({
                file: file,
                name: name,
                family: family,
                Architecture: Architecture,
                generation: generation
            });
        } catch (e) {
            console.warn(`跳过无效文件 ${file}:`, e.message);
        }
    }
    fs.writeFileSync(indexPath, JSON.stringify(entries, null, 4), 'utf-8');
    return { count: entries.length };
}

function rebuildGpuIndex() {
    const dir = path.join(__dirname, 'modeldata', 'Graphics');
    const indexPath = path.join(dir, 'GPU.json');
    const excludeDirs = ['Graphics_icons'];
    const files = fs.readdirSync(dir);
    const entries = [];

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (excludeDirs.includes(file)) continue;
            continue;
        }
        if (!file.endsWith('.json') || file === 'GPU.json') continue;
        try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            let data = JSON.parse(content);
            if (data.thinkpad_database && Array.isArray(data.thinkpad_database)) {
                data = data.thinkpad_database[0];
            }
            const id = file.replace(/\.json$/i, '');
            const name = data.model || data.name || id;
            const family = data.family || '未分类';
            const Architecture = data.Architecture || data.architecture || '未知';
            const generation = data.generation || data.Generation || '未知';
            entries.push({
                file: file,
                name: name,
                family: family,
                Architecture: Architecture,
                generation: generation
            });
        } catch (e) {
            console.warn(`跳过无效文件 ${file}:`, e.message);
        }
    }
    fs.writeFileSync(indexPath, JSON.stringify(entries, null, 4), 'utf-8');
    return { count: entries.length };
}

function rebuildDisplayIndex() {
    const dir = path.join(__dirname, 'modeldata', 'Display');
    const indexPath = path.join(dir, 'Display.json');
    const files = fs.readdirSync(dir);
    const entries = [];

    for (const file of files) {
        if (!file.endsWith('.json') || file === 'Display.json') continue;
        const fullPath = path.join(dir, file);
        try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            let data = JSON.parse(content);
            if (data.thinkpad_database && Array.isArray(data.thinkpad_database)) {
                data = data.thinkpad_database[0];
            }
            const id = file.replace(/\.json$/i, '');
            const name = data.type || data.name || id;
            const tech = data.tech || '';
            entries.push({
                file: file,
                name: name,
                tech: tech
            });
        } catch (e) {
            console.warn(`跳过无效文件 ${file}:`, e.message);
        }
    }
    fs.writeFileSync(indexPath, JSON.stringify(entries, null, 4), 'utf-8');
    return { count: entries.length };
}

function rebuildEthernetIndex() {
    const dir = path.join(__dirname, 'modeldata', 'Ethernet');
    const indexPath = path.join(dir, 'Ethernet.json');
    const files = fs.readdirSync(dir);
    const entries = [];

    for (const file of files) {
        if (!file.endsWith('.json') || file === 'Ethernet.json') continue;
        const fullPath = path.join(dir, file);
        try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            let data = JSON.parse(content);
            if (data.thinkpad_database && Array.isArray(data.thinkpad_database)) {
                data = data.thinkpad_database[0];
            }
            const id = file.replace(/\.json$/i, '');
            const name = data.type || data.name || id;
            entries.push({
                file: file,
                name: name
            });
        } catch (e) {
            console.warn(`跳过无效文件 ${file}:`, e.message);
        }
    }
    fs.writeFileSync(indexPath, JSON.stringify(entries, null, 4), 'utf-8');
    return { count: entries.length };
}

function rebuildWlanIndex() {
    const dir = path.join(__dirname, 'modeldata', 'WLAN');
    const indexPath = path.join(dir, 'WLAN.json');
    const files = fs.readdirSync(dir);
    const entries = [];

    for (const file of files) {
        if (!file.endsWith('.json') || file === 'WLAN.json') continue;
        const fullPath = path.join(dir, file);
        try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            let data = JSON.parse(content);
            if (data.thinkpad_database && Array.isArray(data.thinkpad_database)) {
                data = data.thinkpad_database[0];
            }
            const id = file.replace(/\.json$/i, '');
            const name = data.type || data.name || id;
            entries.push({
                file: file,
                name: name
            });
        } catch (e) {
            console.warn(`跳过无效文件 ${file}:`, e.message);
        }
    }
    fs.writeFileSync(indexPath, JSON.stringify(entries, null, 4), 'utf-8');
    return { count: entries.length };
}

function rebuildWwanIndex() {
    const dir = path.join(__dirname, 'modeldata', 'WWAN');
    const indexPath = path.join(dir, 'WWAN.json');
    const files = fs.readdirSync(dir);
    const entries = [];

    for (const file of files) {
        if (!file.endsWith('.json') || file === 'WWAN.json') continue;
        const fullPath = path.join(dir, file);
        try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            let data = JSON.parse(content);
            if (data.thinkpad_database && Array.isArray(data.thinkpad_database)) {
                data = data.thinkpad_database[0];
            }
            const id = file.replace(/\.json$/i, '');
            const name = data.type || data.name || id;
            entries.push({
                file: file,
                name: name
            });
        } catch (e) {
            console.warn(`跳过无效文件 ${file}:`, e.message);
        }
    }
    fs.writeFileSync(indexPath, JSON.stringify(entries, null, 4), 'utf-8');
    return { count: entries.length };
}

function rebuildDockIndex() {
    const dir = path.join(__dirname, 'modeldata', 'Dock');
    const indexPath = path.join(dir, 'Dock.json');
    const files = fs.readdirSync(dir);
    const entries = [];

    for (const file of files) {
        if (!file.endsWith('.json') || file === 'Dock.json') continue;
        const fullPath = path.join(dir, file);
        try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            let data = JSON.parse(content);
            if (data.thinkpad_database && Array.isArray(data.thinkpad_database)) {
                data = data.thinkpad_database[0];
            }
            const id = file.replace(/\.json$/i, '');
            const name = data.model || data.name || id;
            entries.push({
                file: file,
                name: name
            });
        } catch (e) {
            console.warn(`跳过无效文件 ${file}:`, e.message);
        }
    }
    fs.writeFileSync(indexPath, JSON.stringify(entries, null, 4), 'utf-8');
    return { count: entries.length };
}

function rebuildModelIndex() {
    const modelsDir = path.join(__dirname, 'modeldata');
    const indexPath = path.join(modelsDir, 'index.json');
    const files = fs.readdirSync(modelsDir);
    const entries = [];
    // 需要忽略的文件名列表
    const excludeFiles = ['index.json', 'index_old.json', 'tricks.json'];

    for (const file of files) {
        if (!file.endsWith('.json')) continue;
        if (excludeFiles.includes(file)) continue;

        const fullPath = path.join(modelsDir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) continue;
        try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            let data = JSON.parse(content);
            if (data.thinkpad_database && Array.isArray(data.thinkpad_database)) {
                data = data.thinkpad_database[0];
            }
            const name = data.model_name || data.name || file.replace(/\.json$/i, '');
            const family = data.model_family || '未指定系列';
            const generation = data.model_generation || '未指定代数';
            entries.push({
                file: file,
                name: name,
                family: family,
                generation: generation
            });
        } catch (e) {
            console.warn(`跳过无效机型文件 ${file}:`, e.message);
        }
    }
    fs.writeFileSync(indexPath, JSON.stringify(entries, null, 4), 'utf-8');
    return { count: entries.length };
}

// ---------- 最后托管静态文件（必须放在所有 API 路由之后） ----------
app.use(express.static(__dirname));

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 服务器已启动: http://localhost:${PORT}`);
    console.log(`📁 静态文件目录: ${__dirname}`);
});