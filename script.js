// ========== 全局状态 ==========
let masterModelList = [];
let currentFilterType = 'family';
let currentFamilyValue = '';
let currentGenValue = '';
let selectedModels = [];
let menuCounter = 0;
let currentDeviceParts = null;
let favorites = JSON.parse(localStorage.getItem('tp_favs') || '[]');
const loadedFiles = new Set();
const partsCache = {};
let MAX_CONCURRENT = 6;
let secretTipsEnabled = false;
let lastEnterTime = 0;

// 页面状态
let currentPage = 'detail'; // 'detail' | 'compare' | 'favorites'
let compareModels = [];
let comparePending = true;

// ========== 协议检测 ==========
(function () {
    try {
        const p = performance.getEntriesByType('navigation')[0]?.nextHopProtocol;
        if (p === 'h2' || p === 'h3') MAX_CONCURRENT = 255;
    } catch (e) { }
})();

// ========== DOM 快捷选择 ==========
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const $menu = $('#modelMenu');
const $display = $('#specDisplay');
const $count = $('#modelCount');
const $favCount = $('#favCount');
const $familySel = $('#familySelect');
const $genSel = $('#generationSelect');
const $familyBtn = $('#filterFamilyBtn');
const $genBtn = $('#filterGenBtn');
const $searchInput = $('#searchModalInput');
const $searchResults = $('#searchModalResults');
const $compareInput = $('#compareSearchInput');
const $compareList = $('#compareSelectList');
const $themeBtn = $('#themeToggleSidebar');
const $mobileBtn = $('#mobileMenuBtn');
const $overlay = $('#sidebarOverlayBg');
const $compareModalBody = $('#compareModalBody');
const $fruModalBody = $('#fruModalBody');
const $filterCollapseHeader = $('#filterCollapseHeader');
const $filterCollapseBody = $('#filterCollapseBody');
const $filterSummary = $('#filterSummary');
const $filterArrow = $filterCollapseHeader.querySelector('.filter-collapse-arrow');
const $sidebarSearchInput = $('#sidebarSearchInput');

// 页面切换
const $detailPage = $('#detailPage');
const $comparePage = $('#comparePage');
const $comparePageSearch = $('#comparePageSearch');
const $comparePageGrid = $('#comparePageGrid');
const $comparePageResult = $('#comparePageResult');
const $sidebarCompare = $('#sidebarCompare');
const $sidebarFavorites = $('#sidebarFavorites');
const $favoritesPage = $('#favoritesPage');
const $favoritesPageGrid = $('#favoritesPageGrid');
const $favoritesPageSubtitle = $('#favoritesPageSubtitle');

// ========== 侧边栏 ==========
function closeSidebar() { document.body.classList.add('sidebar-hidden'); }
function toggleSidebar() { document.body.classList.toggle('sidebar-hidden'); }

$mobileBtn.addEventListener('click', toggleSidebar);
$overlay.addEventListener('click', closeSidebar);

function setActiveSidebarItem(id) {
    $$('.sidebar-item').forEach(el => el.classList.remove('active'));
    $sidebarCompare.classList.remove('compare-active');
    if (id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('active');
    }
}

function handleResponsive() {
    if (window.innerWidth <= 900) {
        document.body.classList.add('sidebar-hidden');
        $mobileBtn.style.display = 'flex';
    } else {
        document.body.classList.remove('sidebar-hidden');
        $mobileBtn.style.display = 'none';
    }
}
window.addEventListener('resize', handleResponsive);
handleResponsive();

// ========== 筛选面板折叠 ==========
// 默认折叠
let filterCollapsed = true;
$filterCollapseBody.classList.add('collapsed');
$filterCollapseHeader.classList.add('collapsed');
$filterCollapseBody.style.maxHeight = '0px';

$filterCollapseHeader.addEventListener('click', () => {
    filterCollapsed = !filterCollapsed;
    if (filterCollapsed) {
        $filterCollapseBody.style.maxHeight = '0px';
        $filterCollapseBody.classList.add('collapsed');
        $filterCollapseHeader.classList.add('collapsed');
    } else {
        $filterCollapseBody.style.maxHeight = $filterCollapseBody.scrollHeight + 'px';
        $filterCollapseBody.classList.remove('collapsed');
        $filterCollapseHeader.classList.remove('collapsed');
    }
});

// 初始计算高度
$filterCollapseBody.style.maxHeight = '0px';

function updateFilterSummary() {
    if (currentFilterType === 'family') {
        $filterSummary.textContent = currentFamilyValue ? `系列 · ${currentFamilyValue}` : '系列 · 全部';
    } else {
        $filterSummary.textContent = currentGenValue ? `代数 · ${currentGenValue}` : '代数 · 全部';
    }
}

// ========== 主题 ==========
const theme = localStorage.getItem('theme') || 'dark';
if (theme === 'light') {
    document.body.classList.add('light-mode');
    $themeBtn.textContent = '☀️';
}
$themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    $themeBtn.textContent = isLight ? '☀️' : '🌙';
});

// ========== 页面切换 ==========
window.showDetailPage = function () {
    currentPage = 'detail';
    $detailPage.classList.remove('hidden');
    $comparePage.classList.remove('active');
    $favoritesPage.classList.remove('active');
    setActiveSidebarItem('sidebarHome');
    const activeModel = document.querySelector('.nav-item.active')?.dataset?.modelId;
    if (activeModel) {
        const model = masterModelList.find(m => m.model_name === activeModel);
        if (model) renderSpecs(model);
    }
};

window.showHome = function () {
    showDetailPage();
};

window.showComparePage = function () {
    currentPage = 'compare';
    $detailPage.classList.add('hidden');
    $comparePage.classList.add('active');
    $favoritesPage.classList.remove('active');
    setActiveSidebarItem(null);
    $sidebarCompare.classList.add('compare-active');
    closeSearchModal();
    if (comparePending) {
        $comparePageResult.innerHTML = '';
        renderComparePageGrid($comparePageSearch.value.trim());
    }
    updateCompareActionBtn();
};

$sidebarCompare.addEventListener('click', () => {
    if (currentPage === 'compare') return;
    showComparePage();
});

window.openCompareSelectModal = function () {
    showComparePage();
};

// ========== 收藏页面 ==========
window.showFavoritesPage = function () {
    currentPage = 'favorites';
    $detailPage.classList.add('hidden');
    $comparePage.classList.remove('active');
    $favoritesPage.classList.add('active');
    setActiveSidebarItem('sidebarFavorites');
    closeSearchModal();
    renderFavoritesPage();
};

function renderFavoritesPage() {
    const list = masterModelList.filter(m => favorites.includes(m.model_name));
    $favoritesPageSubtitle.textContent = `已收藏 ${list.length} 个型号`;

    if (list.length === 0) {
        $favoritesPageGrid.innerHTML = '<div class="loading-text" style="grid-column:1/-1;">暂无收藏型号</div>';
    } else {
        $favoritesPageGrid.innerHTML = list.map(m => `
            <div class="compare-card" onclick="selectFavoriteFromPage('${m.model_name.replace(/'/g, "\\'")}')">
                <div class="compare-card-info">
                    <div class="compare-card-name">${m.model_name}</div>
                    <div class="compare-card-meta">
                        <span>${m.model_family || '系列未知'}</span>
                        <span class="compare-part-arch" style="margin-left:6px;">${m.model_generation || '代数未知'}</span>
                    </div>
                </div>
                <button class="favorite-remove" onclick="event.stopPropagation(); removeFavoriteFromPage('${m.model_name.replace(/'/g, "\\'")}')" title="取消收藏">×</button>
            </div>
        `).join('');
    }
}

window.selectFavoriteFromPage = async function (name) {
    showDetailPage();
    let model = masterModelList.find(m => m.model_name === name);
    if (model && model._isLight) {
        await loadModelFile(model.filename);
        model = masterModelList.find(m => m.model_name === name);
    }
    if (model) {
        $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.modelId === name));
        renderSpecs(model);
    }
};

window.removeFavoriteFromPage = function (name) {
    toggleFavorite(name);
    renderFavoritesPage();
    const btn = $('#favToggleBtn');
    if (btn && btn.dataset.model === name) {
        btn.textContent = '☆ 收藏';
    }
};

// 侧边栏收藏按钮
$sidebarFavorites.addEventListener('click', () => {
    if (currentPage === 'favorites') return;
    showFavoritesPage();
});

// 向后兼容旧的弹窗入口
window.openFavoritesModal = function () {
    showFavoritesPage();
};

// ========== 数据加载 ==========
async function loadModelFile(filename) {
    if (loadedFiles.has(filename)) return;
    try {
        const resp = await fetch(`modeldata/${filename}`);
        if (!resp.ok) throw new Error(`无法加载: ${filename}`);
        const json = await resp.json();
        let items = json.thinkpad_database || (Array.isArray(json) ? json : [json]);
        if (!Array.isArray(items)) items = [items];

        items.forEach(laptop => {
            if (!laptop.model_name) return;
            const full = {
                filename,
                model_family: laptop.model_family || '未指定系列',
                model_generation: laptop.model_generation || '未指定代数',
                _isLight: false,
                ...laptop
            };
            const idx = masterModelList.findIndex(m => m.model_name === full.model_name);
            if (idx >= 0) masterModelList[idx] = full;
            else masterModelList.push(full);

            if (laptop.nickname && typeof laptop.nickname === 'string' && laptop.nickname.trim() !== '') {
                const nick = {
                    ...full,
                    model_name: laptop.nickname.trim(),
                    _isNickname: true,
                    _originalName: laptop.model_name
                };
                if (laptop.nickfamily && typeof laptop.nickfamily === 'string' && laptop.nickfamily.trim() !== '') {
                    nick.model_family = laptop.nickfamily.trim();
                }
                delete nick.addons;
                const nidx = masterModelList.findIndex(m => m.model_name === nick.model_name);
                if (nidx >= 0) masterModelList[nidx] = nick;
                else masterModelList.push(nick);
            }
        });
        loadedFiles.add(filename);
        populateFilters();
    } catch (e) {
        console.error('加载型号文件失败:', e);
    }
}

async function loadIndex() {
    $display.innerHTML = '<div class="loading-text">加载数据中...</div>';
    try {
        const resp = await fetch('modeldata/index.json');
        if (!resp.ok) throw new Error('无法加载 index.json');
        const data = await resp.json();
        if (!Array.isArray(data)) throw new Error('格式错误');

        masterModelList = data.map(item => ({
            model_name: item.name,
            model_family: item.family || '未指定系列',
            model_generation: item.generation || '未指定代数',
            filename: item.file,
            _isLight: true
        }));
        data.forEach(item => {
            if (item.nickname && typeof item.nickname === 'string' && item.nickname.trim() !== '') {
                masterModelList.push({
                    model_name: item.nickname.trim(),
                    model_family: item.nickfamily || item.family || '未指定系列',
                    model_generation: item.generation || '未指定代数',
                    filename: item.file,
                    _isLight: true,
                    _isNickname: true,
                    _originalName: item.name
                });
            }
        });
        populateFilters();
        applyFilter();
        updateFavCount();
    } catch (e) {
        console.error('加载索引失败:', e);
        $display.innerHTML = '<div class="loading-text">加载数据失败</div>';
    }
}

// ========== 筛选 ==========
function populateFilters() {
    const families = [...new Set(masterModelList.map(m => m.model_family).filter(Boolean))].sort();
    $familySel.innerHTML = '<option value="">全部系列</option>';
    families.forEach(f => {
        const o = document.createElement('option');
        o.value = f;
        o.textContent = f;
        $familySel.appendChild(o);
    });

    const gens = [...new Set(masterModelList.map(m => m.model_generation).filter(Boolean))].sort((a, b) => {
        const getPriority = (s) => {
            if (s.length === 3) return 1;
            if (s.length === 4) return 2;
            if (s.toLowerCase().startsWith('gen')) return 3;
            return 4;
        };
        const pa = getPriority(a);
        const pb = getPriority(b);
        if (pa !== pb) return pa - pb;
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    $genSel.innerHTML = '<option value="">全部代数</option>';
    gens.forEach(g => {
        const o = document.createElement('option');
        o.value = g;
        o.textContent = g;
        $genSel.appendChild(o);
    });
}

function getFiltered() {
    let list = masterModelList;
    if (currentFilterType === 'family' && currentFamilyValue) {
        list = list.filter(m => m.model_family === currentFamilyValue);
    } else if (currentFilterType === 'generation' && currentGenValue) {
        list = list.filter(m => m.model_generation === currentGenValue);
    }
    return list;
}

function renderMenu(list) {
    $menu.innerHTML = '';
    list.forEach(model => {
        const div = document.createElement('div');
        div.className = 'nav-item';
        div.dataset.modelId = model.model_name;
        div.textContent = model.model_name;
        div.onclick = () => {
            $$('.nav-item').forEach(n => n.classList.remove('active'));
            div.classList.add('active');
            renderSpecs(model);
        };
        $menu.appendChild(div);
    });
    $count.textContent = list.length;
}

function applyFilter() {
    const list = getFiltered();
    $sidebarSearchInput.value = ''; // 切换筛选时清空搜索
    renderMenu(list);
    if (list.length === 0) {
        $display.innerHTML = '<div class="loading-text">没有符合筛选条件的型号</div>';
        return;
    }
    const active = document.querySelector('.nav-item.active');
    let target = active ? list.find(m => m.model_name === active.dataset.modelId) : list[0];
    if (!target) target = list[0];
    if (currentPage === 'detail') {
        renderSpecs(target);
    }
    $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.modelId === target.model_name));
}

// ========== 筛选事件 ==========
$familyBtn.addEventListener('click', () => {
    currentFilterType = 'family';
    $familyBtn.classList.add('filter-active');
    $genBtn.classList.remove('filter-active');
    $familySel.style.display = 'block';
    $genSel.style.display = 'none';
    updateFilterSummary();
    applyFilter();
});

$genBtn.addEventListener('click', () => {
    currentFilterType = 'generation';
    $genBtn.classList.add('filter-active');
    $familyBtn.classList.remove('filter-active');
    $genSel.style.display = 'block';
    $familySel.style.display = 'none';
    updateFilterSummary();
    applyFilter();
});

$familySel.addEventListener('change', e => {
    currentFamilyValue = e.target.value;
    updateFilterSummary();
    applyFilter();
});

$genSel.addEventListener('change', e => {
    currentGenValue = e.target.value;
    updateFilterSummary();
    applyFilter();
});

// ========== 侧边栏搜索（嵌入型号列表） ==========
$sidebarSearchInput.addEventListener('input', e => {
    const query = e.target.value.toLowerCase();
    const baseList = getFiltered();
    const filtered = query ? baseList.filter(m => m.model_name.toLowerCase().includes(query)) : baseList;
    renderMenu(filtered);
    $modelCount.textContent = filtered.length;
});

$('#resetFilterBtn').addEventListener('click', () => {
    $familySel.value = '';
    $genSel.value = '';
    currentFamilyValue = '';
    currentGenValue = '';
    selectedModels = [];
    updateFilterSummary();
    applyFilter();
});

// ========== 卡片折叠 ==========
window.toggleCard = function (el) {
    const card = el.closest('.card');
    if (card) card.classList.toggle('folded');
};

// ========== 菜单悬停 ==========
window.menuTimers = {};

window.menuEnter = function (menuId) {
    if (window.menuTimers[menuId]) {
        clearTimeout(window.menuTimers[menuId]);
        delete window.menuTimers[menuId];
    }
    const menu = document.getElementById(menuId);
    if (menu) menu.classList.remove('hidden');
};

window.menuLeave = function (menuId) {
    window.menuTimers[menuId] = setTimeout(() => {
        const menu = document.getElementById(menuId);
        if (menu) menu.classList.add('hidden');
        delete window.menuTimers[menuId];
    }, 150);
};

// ========== FRU ==========
window.closeFruModal = function () {
    $('#fruModal').classList.remove('show');
};

function showFruModal(data) {
    const frus = (data && (data.FRUs || data.frus || data.Frus)) || null;
    let html = '<div class="loading-text">无 FRU 信息</div>';
    if (frus) {
        let items = [];
        if (Array.isArray(frus)) {
            items = frus.map(f => typeof f === 'object' ? Object.entries(f).map(([k, v]) => `${k}: ${v}`).join('<br>') : String(f));
        } else if (typeof frus === 'object') {
            items = Object.entries(frus).map(([k, v]) => `${k}: ${v}`);
        } else {
            items = [String(frus)];
        }
        html = items.map(t => `<div class="fru-item">${t}</div>`).join('');
    }
    $fruModalBody.innerHTML = html;
    $('#fruModal').classList.add('show');
}

window.showFruModalByPart = function (partData) {
    showFruModal(partData);
};

window.showFruModalByPartId = function (partId) {
    if (!currentDeviceParts) return;
    const [type, index] = partId.split('_');
    const part = currentDeviceParts[type]?.[parseInt(index)];
    if (part) showFruModal(part.data);
};

// ========== 搜索 ==========
window.closeSearchModal = function () { $('#searchModal').classList.remove('show'); };

window.openSearchModal = function () {
    $('#searchModal').classList.add('show');
    $searchInput.focus();
    $searchInput.value = '';
    $searchResults.innerHTML = '';
};

$searchInput.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    const results = masterModelList.filter(m => m.model_name.toLowerCase().includes(q)).slice(0, 30);
    if (results.length === 0) {
        $searchResults.innerHTML = '<div class="loading-text">未找到匹配的型号</div>';
    } else {
        $searchResults.innerHTML = results.map(m => `
            <div class="search-result" onclick="window.selectFromSearch('${m.model_name.replace(/'/g, "\\'")}')">
                <div class="name">${m.model_name}</div>
                <div class="meta">${m.model_family || ''} · ${m.model_generation || ''}</div>
            </div>
        `).join('');
    }
});

window.selectFromSearch = async function (name) {
    let model = masterModelList.find(m => m.model_name === name);
    if (model && model._isLight) {
        await loadModelFile(model.filename);
        model = masterModelList.find(m => m.model_name === name);
    }
    if (model) {
        if (currentPage !== 'detail') showDetailPage();
        $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.modelId === name));
        renderSpecs(model);
    }
    closeSearchModal();
};

$('#searchModal').addEventListener('click', function (e) {
    if (e.target === this) closeSearchModal();
});

// ========== 秘密提示 ==========
$searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        const now = Date.now();
        if ($searchInput.value.trim() === '我也不知道写点啥') {
            if (now - lastEnterTime < 500) {
                secretTipsEnabled = true;
                const activeItem = document.querySelector('.nav-item.active');
                if (activeItem) {
                    const model = masterModelList.find(m => m.model_name === activeItem.dataset.modelId);
                    if (model) renderSpecs(model);
                }
                closeSearchModal();
                lastEnterTime = 0;
            } else {
                lastEnterTime = now;
            }
        } else {
            lastEnterTime = 0;
        }
    }
});

// ========== 旧版对比选择弹窗（保留向后兼容） ==========
window.closeCompareSelectModal = function () { $('#compareSelectModal').classList.remove('show'); };

window.toggleSelectModel = function (name, checked) {
    const model = masterModelList.find(m => m.model_name === name);
    if (!model) return;
    if (checked) {
        if (!selectedModels.some(m => m.model_name === name)) selectedModels.push(model);
    } else {
        selectedModels = selectedModels.filter(m => m.model_name !== name);
    }
};

window.clearSelectedModels = function () {
    selectedModels = [];
};

// ========== 对比页面逻辑 ==========
function resetComparePage() {
    compareModels = [];
    comparePending = true;
    selectedModels = [];
    $comparePageSearch.value = '';
    $comparePageResult.innerHTML = '';
    renderComparePageGrid('');
    updateCompareActionBtn();
}

function updateCompareActionBtn() {
    const btn = $('#runCompareBtn');
    if (comparePending) {
        btn.textContent = compareModels.length >= 2 ? '开始对比' : `已选 ${compareModels.length} 个`;
        btn.classList.add('btn-accent');
        btn.disabled = compareModels.length < 2;
    } else {
        btn.textContent = '重新选择';
        btn.classList.remove('btn-accent');
        btn.disabled = false;
    }
}

function renderComparePageGrid(q) {
    q = (q || '').toLowerCase();
    const filtered = masterModelList.filter(m => m.model_name.toLowerCase().includes(q));

    if (filtered.length === 0) {
        $comparePageGrid.innerHTML = '<div class="loading-text">未找到匹配的型号</div>';
        return;
    }

    $comparePageGrid.innerHTML = filtered.map(m => {
        const selected = compareModels.includes(m.model_name);
        return `
            <div class="compare-card ${selected ? 'selected' : ''}" onclick="toggleComparePageModel('${m.model_name.replace(/'/g, "\\'")}')">
                <input type="checkbox" ${selected ? 'checked' : ''} onclick="event.stopPropagation(); toggleComparePageModel('${m.model_name.replace(/'/g, "\\'")}')">
                <div class="compare-card-info">
                    <div class="compare-card-name">${m.model_name}</div>
                    <div class="compare-card-meta">${m.model_family || ''} · ${m.model_generation || ''}</div>
                </div>
            </div>
        `;
    }).join('');
}

window.toggleComparePageModel = function (name) {
    if (!comparePending) return;
    const idx = compareModels.indexOf(name);
    if (idx >= 0) {
        compareModels.splice(idx, 1);
    } else {
        if (compareModels.length >= 5) {
            alert('最多选择 5 个型号进行对比');
            return;
        }
        compareModels.push(name);
    }
    renderComparePageGrid($comparePageSearch.value.trim());
    $comparePageResult.innerHTML = '';
    updateCompareActionBtn();
};

$comparePageSearch.addEventListener('input', e => {
    if (!comparePending) return;
    renderComparePageGrid(e.target.value);
});

$('#clearComparePageBtn').addEventListener('click', () => {
    compareModels = [];
    comparePending = true;
    selectedModels = [];
    $comparePageSearch.value = '';
    $comparePageResult.innerHTML = '';
    renderComparePageGrid('');
    updateCompareActionBtn();
});

$('#runCompareBtn').addEventListener('click', async () => {
    if (comparePending) {
        if (compareModels.length < 2) {
            alert('请至少选择两个型号');
            return;
        }

        $comparePageResult.innerHTML = '<div class="loading-text">加载型号数据中...</div>';
        $comparePageGrid.innerHTML = '';

        try {
            const modelsToLoad = compareModels.map(name => {
                return masterModelList.find(x => x.model_name === name);
            }).filter(Boolean);

            for (const m of modelsToLoad) {
                if (m._isLight) {
                    await loadModelFile(m.filename);
                }
            }

            const loadedModels = compareModels.map(name => {
                return masterModelList.find(x => x.model_name === name);
            }).filter(Boolean);

            selectedModels = loadedModels;

            const devicesWithParts = await Promise.all(loadedModels.map(async model => {
                const parts = await loadDeviceParts(model);
                return { model, parts };
            }));

            renderCompareResultTable(devicesWithParts);
            comparePending = false;
            updateCompareActionBtn();
        } catch (e) {
            console.error('对比失败:', e);
            $comparePageResult.innerHTML = '<div class="loading-text">加载对比数据失败，请重试</div>';
        }
    } else {
        resetComparePage();
    }
});

function renderCompareResultTable(devicesWithParts) {
    function formatMemory(model) {
        if (!model.memory) return 'N/A';
        let html = '';
        if (model.memory.max_capacity) html += `${model.memory.max_capacity}`;
        if (model.memory.type) html += ` ${model.memory.type}`;
        if (model.memory.slots) html += ` (${model.memory.slots}插槽)`;
        return html.trim() || 'N/A';
    }

    function formatStorage(model) {
        if (!model.storage) return 'N/A';
        const labels = { ssd_sata: 'SATA', ssd_pcie: 'PCIe', hdd: 'HDD', sshd: 'SSHD', optical: '光驱', floppy: '软驱', optane: '傲腾', emmc: 'eMMC' };
        return Object.entries(model.storage)
            .filter(([, v]) => v && typeof v === 'string' && v.trim() !== '')
            .map(([k, v]) => `<div>${labels[k] || k}: ${v}</div>`)
            .join('') || 'N/A';
    }

    function formatBattery(model) {
        const bats = model.Battary || model.battery || [];
        if (bats.length === 0) return 'N/A';
        return bats.map(b => `${b.type || ''} ${b.capacity || b.cap || ''}`).join('<br>');
    }

    function checkAllSame(getter) {
        const values = devicesWithParts.map(d => getter(d.model));
        return values.every(v => v === values[0]) ? values[0] : null;
    }

    function checkPartsAllSame(type) {
        const signatures = devicesWithParts.map(d => {
            const parts = d.parts?.[type] || [];
            return parts.map(p => {
                const data = p.data?.thinkpad_database?.[0] || p.data;
                return data.model || p.name;
            }).sort().join('|');
        });
        return signatures.every(s => s === signatures[0]) ? signatures[0] : null;
    }

    function renderIfSame(title, getter) {
        const sameValue = checkAllSame(getter);
        if (sameValue !== null) {
            return `<div class="compare-row compare-merged">
                <div class="compare-merged-label">${title}</div>
                <div class="compare-merged-value">${sameValue}</div>
            </div>`;
        }
        return null;
    }

    function renderPartSummary(partsArr, type, model) {
        if (!partsArr || partsArr.length === 0) return '<span style="color:var(--text-muted);">-</span>';
        return partsArr.map((part, idx) => {
            const d = part.data?.thinkpad_database?.[0] || part.data;
            const name = d.model || d.type || part.name || '未知';
            const arch = d.Architecture || d.Generation || d.generation || '';
            const detailId = `detail-${type}-${model.model_name.replace(/[^a-zA-Z0-9]/g, '_')}-${idx}`;
            const filename = part.name;
            
            return `
                <div class="compare-part-summary" id="${detailId}-summary">
                    <div>
                        <span class="compare-part-name">${name}</span>
                        ${arch ? `<span class="compare-part-arch">${arch}</span>` : ''}
                    </div>
                    <button class="btn btn-sm compare-detail-btn" onclick="togglePartDetail('${detailId}', '${type}', '${filename.replace(/'/g, "\\'")}')">展开详情</button>
                </div>
                <div class="compare-part-detail hidden" id="${detailId}-detail">
                    <div class="loading-text" style="padding:12px;">加载中...</div>
                </div>
            `;
        }).join('');
    }

    function buildPartCard(title, type, devicesWithParts, renderFn) {
        let html = `<div class="card"><div class="card-title"><span>${title}</span></div><div class="card-body compare-card-body">`;
        devicesWithParts.forEach((d, i) => {
            html += `<div class="compare-model-col">`;
            html += renderFn(d.parts?.[type], type, d.model);
            html += '</div>';
        });
        html += '</div></div>';
        return html;
    }

    function renderPartsIfSame(title, type) {
        const same = checkPartsAllSame(type);
        if (same !== null) {
            const firstParts = devicesWithParts[0].parts?.[type] || [];
            if (firstParts.length === 0) {
                return `<div class="compare-row compare-merged">
                    <div class="compare-merged-label">${title}</div>
                    <div class="compare-merged-value" style="color:var(--text-muted);">无</div>
                </div>`;
            }
            const itemsHtml = firstParts.map((part, idx) => {
                const d = part.data?.thinkpad_database?.[0] || part.data;
                const name = d.model || d.type || part.name || '未知';
                const arch = d.Architecture || d.Generation || d.generation || '';
                const detailId = `detail-merged-${type}-${idx}`;
                const filename = part.name;
                return `
                    <div class="compare-part-summary" id="${detailId}-summary">
                        <div>
                            <span class="compare-part-name">${name}</span>
                            ${arch ? `<span class="compare-part-arch">${arch}</span>` : ''}
                        </div>
                        <button class="btn btn-sm compare-detail-btn" onclick="togglePartDetail('${detailId}', '${type}', '${filename.replace(/'/g, "\\'")}')">展开详情</button>
                    </div>
                    <div class="compare-part-detail hidden" id="${detailId}-detail">
                        <div class="loading-text" style="padding:12px;">加载中...</div>
                    </div>
                `;
            }).join('');
            return `<div class="compare-row compare-merged">
                <div class="compare-merged-label">${title}</div>
                <div class="compare-merged-value">${itemsHtml}</div>
            </div>`;
        }
        return null;
    }

    let mergedHtml = '';

    const cpuMerged = renderPartsIfSame('处理器 (CPU)', 'cpu');
    if (cpuMerged) mergedHtml += cpuMerged;
    else mergedHtml += buildPartCard('处理器 (CPU)', 'cpu', devicesWithParts, renderPartSummary);

    const gpuMerged = renderPartsIfSame('显卡', 'graphics');
    if (gpuMerged) mergedHtml += gpuMerged;
    else mergedHtml += buildPartCard('显卡', 'graphics', devicesWithParts, renderPartSummary);

    const dispSame = renderPartsIfSame('显示屏', 'display');
    if (dispSame) mergedHtml += dispSame;
    else mergedHtml += buildPartCard('显示屏', 'display', devicesWithParts, (partsArr, type, model) => {
        if (!partsArr || partsArr.length === 0) return '<span style="color:var(--text-muted);">-</span>';
        return partsArr.map(part => {
            const d = part.data?.thinkpad_database?.[0] || part.data;
            const name = d.type || part.name || '未知';
            const info = [d.tech, d.brightness, d.refresh_rate].filter(Boolean).join(' · ');
            return `<div><b>${name}</b>${info ? `<br>${info}` : ''}</div>`;
        }).join('<br>');
    });

    const ethSame = renderPartsIfSame('有线网卡', 'ethernet');
    if (ethSame) mergedHtml += ethSame;
    else mergedHtml += buildPartCard('有线网卡', 'ethernet', devicesWithParts, (partsArr, type, model) => {
        if (!partsArr || partsArr.length === 0) return '<span style="color:var(--text-muted);">-</span>';
        return partsArr.map(part => {
            const d = part.data?.thinkpad_database?.[0] || part.data;
            const name = d.type || d['model-type'] || part.name || '未知';
            return `<div>${name}</div>`;
        }).join('');
    });

    const wlanSame = renderPartsIfSame('无线网卡', 'wlan');
    if (wlanSame) mergedHtml += wlanSame;
    else mergedHtml += buildPartCard('无线网卡', 'wlan', devicesWithParts, (partsArr, type, model) => {
        if (!partsArr || partsArr.length === 0) return '<span style="color:var(--text-muted);">-</span>';
        return partsArr.map(part => {
            const d = part.data?.thinkpad_database?.[0] || part.data;
            const name = d.model || d.type || part.name || '未知';
            return `<div>${name}</div>`;
        }).join('');
    });

    const wwanSame = renderPartsIfSame('WWAN', 'wwan');
    if (wwanSame) mergedHtml += wwanSame;
    else mergedHtml += buildPartCard('WWAN', 'wwan', devicesWithParts, (partsArr, type, model) => {
        if (!partsArr || partsArr.length === 0) return '<span style="color:var(--text-muted);">-</span>';
        return partsArr.map(part => {
            const d = part.data?.thinkpad_database?.[0] || part.data;
            const name = d.model || d.type || part.name || '未知';
            return `<div>${name}</div>`;
        }).join('');
    });

    const dockSame = renderPartsIfSame('扩展坞', 'dock');
    if (dockSame) mergedHtml += dockSame;
    else mergedHtml += buildPartCard('扩展坞', 'dock', devicesWithParts, (partsArr, type, model) => {
        if (!partsArr || partsArr.length === 0) return '<span style="color:var(--text-muted);">-</span>';
        return partsArr.map(part => {
            const d = part.data?.thinkpad_database?.[0] || part.data;
            const name = d.model || d.type || part.name || '未知';
            return `<div>${name}</div>`;
        }).join('');
    });

        const memSame = renderIfSame('内存', m => formatMemory(m));
    if (memSame) mergedHtml += memSame;
    else {
        mergedHtml += `<div class="compare-row compare-merged">`;
        mergedHtml += `<div class="compare-merged-label">内存</div>`;
        mergedHtml += `<div class="compare-merged-value compare-inline-items">`;
        devicesWithParts.forEach(d => {
            mergedHtml += `<div class="compare-inline-item">${formatMemory(d.model)}</div>`;
        });
        mergedHtml += `</div></div>`;
    }

    const storSame = renderIfSame('储存', m => formatStorage(m));
    if (storSame) mergedHtml += storSame;
    else {
        mergedHtml += `<div class="compare-row compare-merged">`;
        mergedHtml += `<div class="compare-merged-label">储存</div>`;
        mergedHtml += `<div class="compare-merged-value compare-inline-items">`;
        devicesWithParts.forEach(d => {
            mergedHtml += `<div class="compare-inline-item">${formatStorage(d.model)}</div>`;
        });
        mergedHtml += `</div></div>`;
    }

    const battSame = renderIfSame('电池', m => formatBattery(m));
    if (battSame) mergedHtml += battSame;
    else {
        mergedHtml += `<div class="compare-row compare-merged">`;
        mergedHtml += `<div class="compare-merged-label">电池</div>`;
        mergedHtml += `<div class="compare-merged-value compare-inline-items">`;
        devicesWithParts.forEach(d => {
            mergedHtml += `<div class="compare-inline-item">${formatBattery(d.model)}</div>`;
        });
        mergedHtml += `</div></div>`;
    }

    let diffHtml = `<div class="card"><div class="card-title"><span>接口与其他</span></div><div class="card-body card-body-flow" style="overflow-x:auto;"><table class="compare-table"><thead><tr><th>规格</th>`;
    devicesWithParts.forEach(d => diffHtml += `<th>${d.model.model_name}</th>`);
    diffHtml += '</tr></thead><tbody>';

    const miscRows = [
        { label: '接口', getValue: m => Array.isArray(m.ports) ? m.ports.join('、') : (m.ports || '-') },
        { label: '尺寸', getValue: m => m.physical?.dimensions || '-' },
        { label: '重量', getValue: m => m.physical?.weight || '-' },
        { label: '材质', getValue: m => m.physical?.case_material || m.case_material || '-' },
        { label: '安全特性', getValue: m => Array.isArray(m.security) ? m.security.join('、') : (m.security || '-') },
        { label: '预装系统', getValue: m => Array.isArray(m.system) ? m.system.join('<br>') : (m.system || '-') },
    ];

    miscRows.forEach(row => {
        const sameValue = checkAllSame(row.getValue);
        if (sameValue !== null) {
            diffHtml += `<tr><td><b>${row.label}</b></td><td colspan="${devicesWithParts.length}" style="color:var(--accent);">${sameValue}</td></tr>`;
        } else {
            diffHtml += '<tr>';
            diffHtml += `<td><b>${row.label}</b></td>`;
            devicesWithParts.forEach(d => diffHtml += `<td>${row.getValue(d.model)}</td>`);
            diffHtml += '</tr>';
        }
    });
    diffHtml += '</tbody></table></div></div>';

    let headerHtml = `<div class="compare-header"><div class="compare-header-models">`;
    devicesWithParts.forEach(d => {
        headerHtml += `<div class="compare-header-model">${d.model.model_name}</div>`;
    });
    headerHtml += '</div></div>';

    let finalHtml = headerHtml;
    if (mergedHtml) {
        finalHtml += `<div class="card"><div class="card-title"><span>配置对比</span></div><div class="card-body card-body-flow">${mergedHtml}</div></div>`;
    }
    finalHtml += diffHtml;

    $comparePageResult.innerHTML = finalHtml;
    $comparePageResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ========== 字段名中英文映射表 ==========
const PART_FIELD_LABELS = {
    'model': '型号',
    'type': '类型',
    'Architecture': '架构',
    'generation': '代数',
    'family': '系列',
    'cores_threads': '核心/线程',
    'base_freq': '基础频率',
    'turbo_freq': '睿频',
    'cache': '缓存',
    'TDP': 'TDP',
    'graphics': '集成显卡',
    'socket': '插槽',
    'process': '制程',
    'VRAM': '显存',
    'Generation': '架构',
    'Shading Units': '着色单元',
    'tech': '面板技术',
    'brightness': '亮度',
    'contrast': '对比度',
    'viewing_angle': '视角',
    'touch': '触摸',
    'refresh_rate': '刷新率',
    'color_gamut': '色域',
    'model-type': '型号/类型',
    'form': '形态',
    'feature': '特性',
    'ports': '端口',
    'power': '供电',
};

function getFieldLabel(key) {
    return PART_FIELD_LABELS[key] || key.replace(/_/g, ' ');
}

// ========== 加载完整零件详情 ==========
async function loadFullPartDetails(type, filename) {
    if (!filename) return null;
    let fullName = filename.endsWith('.json') ? filename : filename + '.json';
    
    const folderMap = { cpu: 'CPU', graphics: 'Graphics' };
    const folder = folderMap[type] || type;
    
    try {
        const resp = await fetch(`modeldata/${folder}/${fullName}`);
        if (!resp.ok) return null;
        return await resp.json();
    } catch (e) {
        console.error(`加载完整零件失败: ${type}/${filename}`, e);
        return null;
    }
}

// ========== 对比页展开零件详情 ==========
// ========== 对比页展开零件详情 ==========
window.togglePartDetail = async function (detailId, type, filename) {
    const summaryEl = document.getElementById(`${detailId}-summary`);
    const detailEl = document.getElementById(`${detailId}-detail`);

    if (!detailEl.classList.contains('hidden')) {
        detailEl.classList.add('hidden');
        const btn = summaryEl.querySelector('.compare-detail-btn');
        if (btn) btn.textContent = '展开详情';
        return;
    }

    detailEl.classList.remove('hidden');
    const btn = summaryEl.querySelector('.compare-detail-btn');
    if (btn) btn.textContent = '收起详情';

    if (detailEl.querySelector('.loading-text')) {
        const fullData = await loadFullPartDetails(type, filename);
        if (fullData) {
            const d = fullData.thinkpad_database?.[0] || fullData;
            const lines = [];

            // 不同零件类型排除不同的字段
            const excludeKeys = ['FRUs', 'frus', 'Frus', 'iconfamily', 'ark'];
            if (type === 'cpu' || type === 'graphics') {
                excludeKeys.push('model');
            }
            if (type === 'display') {
                excludeKeys.push('model', 'type');
            }
            // 网卡、扩展坞等保留 type

            for (const [k, v] of Object.entries(d)) {
                if (excludeKeys.includes(k)) continue;
                if (v == null || v === '') continue;
                if (typeof v === 'object') continue;
                const label = getFieldLabel(k);
                lines.push(`<div class="part-field"><span class="field-name">${label}</span><span class="field-value">${v}</span></div>`);
            }
            detailEl.innerHTML = lines.join('') || '<span style="color:var(--text-muted);">无详细信息</span>';
        } else {
            detailEl.innerHTML = '<span style="color:var(--text-muted);">加载失败</span>';
        }
    }
};

// ========== 旧的对比弹窗逻辑（保留兼容） ==========
window.closeCompareModal = function () { $('#compareModal').classList.remove('show'); };

$('#confirmCompareBtn').addEventListener('click', async () => {
    if (selectedModels.length === 0) return;
    for (const m of selectedModels) {
        if (m._isLight) await loadModelFile(m.filename);
    }
    $('#compareSelectModal').classList.remove('show');
    showCompareModalLegacy();
});

$('#compareSelectModal').addEventListener('click', function (e) {
    if (e.target === this) closeCompareSelectModal();
});

async function showCompareModalLegacy() {
    $compareModalBody.innerHTML = '<div class="loading-text">加载对比数据中...</div>';
    $('#compareModal').classList.add('show');

    try {
        const devicesWithParts = await Promise.all(selectedModels.map(async model => {
            const parts = await loadDeviceParts(model);
            return { model, parts };
        }));

        function formatMemory(model) {
            if (!model.memory) return 'N/A';
            let html = '';
            if (model.memory.max_capacity) html += `容量: ${model.memory.max_capacity}<br>`;
            if (model.memory.type) html += `类型: ${model.memory.type}<br>`;
            if (model.memory.slots) html += `插槽: ${model.memory.slots}`;
            return html || 'N/A';
        }

        function formatStorage(model) {
            if (!model.storage) return 'N/A';
            const labels = { ssd_sata: 'SATA SSD', ssd_pcie: 'PCIe SSD', hdd: 'HDD', sshd: 'SSHD', optical: '光驱', floppy: '软驱', optane: '傲腾', emmc: 'eMMC' };
            return Object.entries(model.storage)
                .filter(([, v]) => v && typeof v === 'string' && v.trim() !== '')
                .map(([k, v]) => `<b>${labels[k] || k}:</b> ${v}`)
                .join('<br>') || 'N/A';
        }

        function formatBattery(model) {
            const bats = model.Battary || model.battery || [];
            if (bats.length === 0) return 'N/A';
            return bats.map(b => `${b.type || '电池'}: ${b.capacity || b.cap || ''}${b.tech ? ` (${b.tech})` : ''}`).join('<br>');
        }

        function formatPorts(model) {
            if (!model.ports) return 'N/A';
            return Array.isArray(model.ports) ? model.ports.join('、') : String(model.ports);
        }

        function formatOther(model) {
            const items = [];
            if (model.physical?.dimensions) items.push(`尺寸: ${model.physical.dimensions}`);
            if (model.physical?.weight) items.push(`重量: ${model.physical.weight}`);
            if (model.physical?.case_material || model.case_material) items.push(`材质: ${model.physical?.case_material || model.case_material}`);
            if (model.security) items.push(`安全: ${Array.isArray(model.security) ? model.security.join('、') : model.security}`);
            return items.join('<br>') || 'N/A';
        }

        const rows = [
            { label: '处理器 (CPU)', getValue: (m, p) => p.cpu?.map(x => formatPartFullInfo(x.data, 'cpu')).join('<hr style="border:0;border-top:1px dashed var(--border);margin:6px 0;">') || '无' },
            { label: '显卡', getValue: (m, p) => p.graphics?.map(x => formatPartFullInfo(x.data, 'graphics')).join('<hr style="border:0;border-top:1px dashed var(--border);margin:6px 0;">') || '无' },
            { label: '内存', getValue: m => formatMemory(m) },
            { label: '显示屏', getValue: (m, p) => p.display?.map(x => formatPartFullInfo(x.data, 'display')).join('<hr style="border:0;border-top:1px dashed var(--border);margin:6px 0;">') || '无' },
            { label: '储存', getValue: m => formatStorage(m) },
            { label: '电池', getValue: m => formatBattery(m) },
            { label: '有线网卡', getValue: (m, p) => p.ethernet?.map(x => formatPartFullInfo(x.data, 'ethernet')).join('<hr style="border:0;border-top:1px dashed var(--border);margin:6px 0;">') || '无' },
            { label: '无线网卡', getValue: (m, p) => p.wlan?.map(x => formatPartFullInfo(x.data, 'wlan')).join('<hr style="border:0;border-top:1px dashed var(--border);margin:6px 0;">') || '无' },
            { label: 'WWAN', getValue: (m, p) => p.wwan?.map(x => formatPartFullInfo(x.data, 'wwan')).join('<hr style="border:0;border-top:1px dashed var(--border);margin:6px 0;">') || '无' },
            { label: '物理接口', getValue: m => formatPorts(m) },
            { label: '其他', getValue: m => formatOther(m) },
        ];

        let html = '<table class="compare-table"><thead><tr><th>规格</th>';
        devicesWithParts.forEach(d => html += `<th>${d.model.model_name}</th>`);
        html += '</tr></thead><tbody>';
        rows.forEach(row => {
            html += '<tr>';
            html += `<td><b>${row.label}</b></td>`;
            devicesWithParts.forEach(d => html += `<td>${row.getValue(d.model, d.parts)}</td>`);
            html += '</tr>';
        });
        html += '</tbody></table>';
        $compareModalBody.innerHTML = html;
    } catch (e) {
        console.error('对比失败:', e);
        $compareModalBody.innerHTML = '<div class="loading-text">加载对比数据失败</div>';
    }
}

$('#compareModal').addEventListener('click', function (e) {
    if (e.target === this) closeCompareModal();
});

function formatPartFullInfo(data, type) {
    if (!data) return '无信息';
    const d = data.thinkpad_database?.[0] || data;
    const lines = [];

    if (type === 'cpu') {
        if (d.model) lines.push(`<b>${d.model}</b>`);
        if (d.cores_threads) lines.push(`${d.cores_threads}`);
        if (d.base_freq) lines.push(`基础: ${d.base_freq}`);
        if (d.turbo_freq && d.turbo_freq !== 'null') lines.push(`睿频: ${d.turbo_freq}`);
        if (d.cache) lines.push(`缓存: ${d.cache}`);
        if (d.graphics) lines.push(`集显: ${d.graphics}`);
    } else if (type === 'display') {
        if (d.type) lines.push(`<b>${d.type}</b>`);
        if (d.tech) lines.push(`${d.tech}`);
        if (d.brightness) lines.push(`亮度: ${d.brightness}`);
        if (d.refresh_rate) lines.push(`刷新率: ${d.refresh_rate}`);
        if (d.color_gamut) lines.push(`色域: ${d.color_gamut}`);
        if (d.touch) lines.push(`触摸: ${d.touch}`);
    } else if (type === 'graphics') {
        if (d.model) lines.push(`<b>${d.model}</b>`);
        if (d.VRAM) lines.push(`显存: ${d.VRAM}`);
        if (d.Generation) lines.push(`架构: ${d.Generation}`);
        if (d['Shading Units']) lines.push(`着色单元: ${d['Shading Units']}`);
        if (d.base_freq) lines.push(`基础频率: ${d.base_freq}`);
    } else if (type === 'ethernet') {
        if (d.type) lines.push(`<b>${d.type}</b>`);
        if (d['model-type']) lines.push(d['model-type']);
        for (const [k, v] of Object.entries(d)) {
            if (['type', 'model-type'].includes(k)) continue;
            if (v && typeof v !== 'object') lines.push(`${k.replace(/_/g, ' ')}: ${v}`);
        }
    } else if (type === 'wlan' || type === 'wwan') {
        if (d.model) lines.push(`<b>${d.model}</b>`);
        else if (d.type) lines.push(`<b>${d.type}</b>`);
        for (const [k, v] of Object.entries(d)) {
            if (['model', 'type', 'FRUs', 'frus', 'Frus'].includes(k)) continue;
            if (v && typeof v !== 'object') lines.push(`${k.replace(/_/g, ' ')}: ${v}`);
        }
    } else if (type === 'dock') {
        if (d.model) lines.push(`<b>${d.model}</b>`);
        if (d.ports) {
            const portsStr = Array.isArray(d.ports) ? d.ports.join(', ') : d.ports;
            lines.push(`端口: ${portsStr}`);
        }
        if (d.power) lines.push(`供电: ${d.power}`);
    } else {
        if (d.model) lines.push(`<b>${d.model}</b>`);
        else if (d.type) lines.push(`<b>${d.type}</b>`);
    }

    return lines.join('<br>') || 'N/A';
}

// ========== 零件加载 ==========
async function loadPartData(type, filename) {
    if (!filename) return null;
    let fullName = filename.endsWith('.json') ? filename : filename + '.json';
    if (partsCache[type] && partsCache[type][fullName]) return partsCache[type][fullName];

    const folderMap = { cpu: 'CPU', ethernet: 'Ethernet', wlan: 'WLAN', wwan: 'WWAN', display: 'Display', graphics: 'Graphics', dock: 'Dock' };
    const folder = folderMap[type] || type;

    try {
        const resp = await fetch(`modeldata/${folder}/${fullName}`);
        if (!resp.ok && fullName.endsWith('.json')) {
            const altResp = await fetch(`modeldata/${folder}/${filename}`);
            if (altResp.ok) {
                const data = await altResp.json();
                if (!partsCache[type]) partsCache[type] = {};
                partsCache[type][fullName] = data;
                return data;
            }
        }
        if (!resp.ok) return null;
        const data = await resp.json();
        if (!partsCache[type]) partsCache[type] = {};
        partsCache[type][fullName] = data;
        return data;
    } catch (e) {
        console.error(`加载零件失败: ${type}/${filename}`, e);
        return null;
    }
}

async function loadDeviceParts(device) {
    const tasks = [];

    if (device.processor_options?.length) device.processor_options.forEach(f => tasks.push({ type: 'cpu', file: f }));
    if (device.display_options?.length) device.display_options.forEach(f => tasks.push({ type: 'display', file: f }));
    if (device.graphics_options?.length) device.graphics_options.forEach(f => tasks.push({ type: 'graphics', file: f }));

    if (device.Ethernet) {
        const items = Array.isArray(device.Ethernet) ? device.Ethernet : device.Ethernet.split(',').map(s => s.trim()).filter(Boolean);
        items.forEach(f => tasks.push({ type: 'ethernet', file: f }));
    }
    if (device.WLAN) {
        const items = Array.isArray(device.WLAN) ? device.WLAN : [device.WLAN];
        items.forEach(f => tasks.push({ type: 'wlan', file: f }));
    }
    if (device.WWAN) {
        const items = Array.isArray(device.WWAN) ? device.WWAN : [device.WWAN];
        items.forEach(f => tasks.push({ type: 'wwan', file: f }));
    }
    if (device.dock_support) {
        const items = Array.isArray(device.dock_support) ? device.dock_support : [device.dock_support];
        items.forEach(f => tasks.push({ type: 'dock', file: f }));
    }

    const results = [];
    for (let i = 0; i < tasks.length; i += MAX_CONCURRENT) {
        const batch = tasks.slice(i, i + MAX_CONCURRENT);
        const batchResults = await Promise.all(batch.map(async t => {
            const data = await loadPartData(t.type, t.file);
            return { type: t.type, name: t.file, data: data || { model: t.file, note: '等待补充' } };
        }));
        results.push(...batchResults);
    }

    const parts = { cpu: [], ethernet: [], wlan: [], wwan: [], display: [], graphics: [], dock: [] };
    results.forEach(r => { if (parts[r.type]) parts[r.type].push({ data: r.data, name: r.name, type: r.type }); });
    return parts;
}

// ========== 收藏（数据层） ==========
function isFavorite(name) { return favorites.includes(name); }

function toggleFavorite(name) {
    const idx = favorites.indexOf(name);
    if (idx >= 0) favorites.splice(idx, 1);
    else favorites.push(name);
    localStorage.setItem('tp_favs', JSON.stringify(favorites));
    updateFavCount();
    const btn = $('#favToggleBtn');
    if (btn && btn.dataset.model === name) {
        btn.textContent = isFavorite(name) ? '★ 已收藏' : '☆ 收藏';
    }
}

function updateFavCount() {
    $favCount.textContent = favorites.length;
    if (currentPage === 'favorites') {
        $favoritesPageSubtitle.textContent = `已收藏 ${favorites.length} 个型号`;
    }
}

// ========== 切换型号 ==========
window.switchToModel = async function (name) {
    let model = masterModelList.find(m => m.model_name === name);
    if (model && model._isLight) {
        await loadModelFile(model.filename);
        model = masterModelList.find(m => m.model_name === name);
    }
    if (model) {
        $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.modelId === name));
        renderSpecs(model);
    }
};

// ========== 渲染详情 ==========
async function renderSpecs(data) {
    if (!data) return;

    if (currentPage !== 'detail') showDetailPage();

    if (data._isLight) {
        $display.innerHTML = '<div class="loading-text">加载型号数据中...</div>';
        await loadModelFile(data.filename);
        data = masterModelList.find(m => m.model_name === data.model_name) || data;
    }

    $display.innerHTML = '<div class="loading-text">加载规格数据中...</div>';

    try {
        const parts = await loadDeviceParts(data);
        currentDeviceParts = parts;

        const codeField = data._isNickname ? data.addon_model_code : data.model_code;
        const codeHtml = codeField ? `<span class="chip">${Array.isArray(codeField) ? codeField.join(' / ') : codeField}</span>` : '';

        const counterpart = data._isNickname
            ? masterModelList.find(m => m.model_name === data._originalName && !m._isNickname)
            : masterModelList.find(m => m._isNickname && m._originalName === data.model_name);
        const switchBtn = counterpart
            ? `<button class="btn" onclick="window.switchToModel('${counterpart.model_name.replace(/'/g, "\\'")}')">${data._isNickname ? '切换到原始型号' : '切换到别名'}</button>`
            : '';

        const favBtn = `<button class="btn" id="favToggleBtn" data-model="${data.model_name.replace(/'/g, "\\'")}" onclick="toggleFavorite('${data.model_name.replace(/'/g, "\\'")}')">${isFavorite(data.model_name) ? '★ 已收藏' : '☆ 收藏'}</button>`;

        const getUrl = u => Array.isArray(u) ? u[0] : u;
        const psref = getUrl(data.PSREF_link);
        const guide = getUrl(data.user_guide_link);
        const hmm = getUrl(data.HMM_link);

        const addonsHtml = data.addons ? `<p style="color:var(--text-muted);font-size:12px;margin-top:4px;">${data.addons}</p>` : '';

        function makeCard(title, contentHtml, useFlow = false) {
            const bodyClass = useFlow ? 'card-body card-body-flow' : 'card-body';
            return `
                <div class="card">
                    <div class="card-title" onclick="toggleCard(this)"><span>${title}</span><span class="card-chevron">▼</span></div>
                    <div class="${bodyClass}">${contentHtml}</div>
                </div>`;
        }

        function renderPartCard(partsArr, title, type, useFlow = false) {
            if (!partsArr || partsArr.length === 0) return makeCard(title, '<span style="color:var(--text-muted);">无</span>', useFlow);
            const itemsHtml = partsArr.map((part, idx) => {
                const d = part.data?.thinkpad_database?.[0] || part.data;
                const menuId = `card-menu-${menuCounter++}`;
                const hasFru = d && (d.FRUs || d.frus || d.Frus);

                let fruMenuItem = '';
                if (hasFru) {
                    const jsonPart = JSON.stringify(part.data).replace(/"/g, '&quot;').replace(/'/g, "&#39;");
                    fruMenuItem = `<div class="card-menu-item" onclick="event.stopPropagation();window.showFruModalByPart(${jsonPart})">可能使用的 FRU</div>`;
                }

                let arkMenuItem = '';
                if (type === 'cpu' && d.ark) {
                    arkMenuItem = `<div class="card-menu-item" onclick="event.stopPropagation();window.open('${encodeURI(d.ark)}','_blank');">查看 ARK</div>`;
                }

                let iconHtml = '';
                if ((type === 'cpu' || type === 'graphics') && d.iconfamily) {
                    const iconFolder = type === 'cpu' ? 'CPU/cpu_icon' : 'Graphics/Graphics_icons';
                    const iconBase = `modeldata/${iconFolder}/${encodeURIComponent(d.iconfamily)}`;
                    iconHtml = `<img src="${iconBase}.webp" class="cpu-icon-bg" alt="" loading="lazy" onerror="this.style.display='none';">`;
                }

                const menuItems = fruMenuItem + arkMenuItem;
                const menuHtml = menuItems ? `
                    <div class="card-menu-container">
                        <button class="card-menu-btn" onmouseenter="menuEnter('${menuId}')" onmouseleave="menuLeave('${menuId}')">⋮</button>
                        <div id="${menuId}" class="card-menu-dropdown hidden" onmouseenter="menuEnter('${menuId}')" onmouseleave="menuLeave('${menuId}')">
                            ${fruMenuItem}${arkMenuItem}
                        </div>
                    </div>
                ` : '';

                const infoLines = [];
                if (type === 'cpu') {
                    if (d.model) infoLines.push(`<div class="part-title-text">${d.model}</div>`);
                    if (d.cores_threads) infoLines.push(`<div class="part-field"><span class="field-name">核心/线程</span><span class="field-value">${d.cores_threads}</span></div>`);
                    if (d.base_freq) infoLines.push(`<div class="part-field"><span class="field-name">基础频率</span><span class="field-value">${d.base_freq}</span></div>`);
                    if (d.turbo_freq && d.turbo_freq !== 'null') infoLines.push(`<div class="part-field"><span class="field-name">睿频</span><span class="field-value">${d.turbo_freq}</span></div>`);
                    if (d.cache) infoLines.push(`<div class="part-field"><span class="field-name">缓存</span><span class="field-value">${d.cache}</span></div>`);
                    if (d.graphics) infoLines.push(`<div class="part-field"><span class="field-name">集显</span><span class="field-value">${d.graphics}</span></div>`);
                } else if (type === 'display') {
                    if (d.type) infoLines.push(`<div class="part-title-text">${d.type}</div>`);
                    if (d.tech) infoLines.push(`<div class="part-field"><span class="field-name">技术</span><span class="field-value">${d.tech}</span></div>`);
                    if (d.brightness) infoLines.push(`<div class="part-field"><span class="field-name">亮度</span><span class="field-value">${d.brightness}</span></div>`);
                    if (d.refresh_rate) infoLines.push(`<div class="part-field"><span class="field-name">刷新率</span><span class="field-value">${d.refresh_rate}</span></div>`);
                    if (d.color_gamut) infoLines.push(`<div class="part-field"><span class="field-name">色域</span><span class="field-value">${d.color_gamut}</span></div>`);
                    if (d.touch) infoLines.push(`<div class="part-field"><span class="field-name">触摸</span><span class="field-value">${d.touch}</span></div>`);
                } else if (type === 'graphics') {
                    if (d.model) infoLines.push(`<div class="part-title-text">${d.model}</div>`);
                    if (d.VRAM) infoLines.push(`<div class="part-field"><span class="field-name">显存</span><span class="field-value">${d.VRAM}</span></div>`);
                    if (d.Generation) infoLines.push(`<div class="part-field"><span class="field-name">架构</span><span class="field-value">${d.Generation}</span></div>`);
                    if (d.base_freq) infoLines.push(`<div class="part-field"><span class="field-name">频率</span><span class="field-value">${d.base_freq}</span></div>`);
                } else {
                    const main = d.model || d.type || part.name;
                    if (main) infoLines.push(`<div class="part-title-text">${main}</div>`);
                    for (const [k, v] of Object.entries(d)) {
                        if (['model', 'type', 'FRUs', 'frus', 'Frus', 'iconfamily', 'ark'].includes(k)) continue;
                        if (v && typeof v !== 'object') infoLines.push(`<div class="part-field"><span class="field-name">${k.replace(/_/g, ' ')}</span><span class="field-value">${v}</span></div>`);
                    }
                }

                return `<div class="part-row"><div class="part-info-wrap">${infoLines.join('')}</div>${iconHtml}${menuHtml}</div>`;
            }).join('');
            return makeCard(title, itemsHtml, useFlow);
        }

        const memoryCard = makeCard('内存', `
            <div class="info-row"><span class="info-label">容量</span><span class="info-value">${data.memory?.max_capacity || 'N/A'}</span></div>
            <div class="info-row"><span class="info-label">类型</span><span class="info-value">${data.memory?.type || 'N/A'}</span></div>
            <div class="info-row"><span class="info-label">插槽</span><span class="info-value">${data.memory?.slots || 'N/A'}</span></div>
            ${data.memory?.features ? `<div class="info-row"><span class="info-label">特性</span><span class="info-value">${data.memory.features}</span></div>` : ''}
        `);

        const storageCard = makeCard('存储', data.storage
            ? Object.entries(data.storage)
                .filter(([, v]) => v && typeof v === 'string' && v.trim() !== '')
                .map(([k, v]) => `<div class="info-row"><span class="info-label"><span class="tag">${k.replace(/_/g, ' ')}</span></span><span class="info-value">${v}</span></div>`)
                .join('') || '<span style="color:var(--text-muted);">无信息</span>'
            : '<span style="color:var(--text-muted);">无信息</span>');

        const bats = data.Battary || data.battery || [];
        const batteryCard = makeCard('电池与续航', bats.length > 0
            ? bats.map(b => `<div class="info-row"><span class="info-value">${b.type || '电池'}: ${b.capacity || b.cap || ''}${b.tech ? ` (${b.tech})` : ''}${b.form ? ` - ${b.form}` : ''}</span></div>`).join('')
            : '<span style="color:var(--text-muted);">无电池信息</span>');

        let touchPenHtml = '';
        if (data.touch || data.pen) {
            const items = [];
            if (data.touch) items.push(`<div class="info-row"><span class="info-label">触摸</span><span class="info-value">${Array.isArray(data.touch) ? data.touch.join('、') : data.touch}</span></div>`);
            if (data.pen) items.push(`<div class="info-row"><span class="info-label">笔</span><span class="info-value">${Array.isArray(data.pen) ? data.pen.join('、') : data.pen}</span></div>`);
            touchPenHtml = makeCard('触摸与笔', items.join(''));
        }

        const portsCard = makeCard('物理接口与多媒体', `
            <table class="spec-table">
                <tr><th>接口</th><td>${Array.isArray(data.ports) ? data.ports.join('、') : data.ports || '无'}</td></tr>
                <tr><th>摄像头</th><td>${Array.isArray(data.camera) ? data.camera.join('、') : data.camera || '无'}</td></tr>
                <tr><th>音频</th><td>${Array.isArray(data.audio) ? data.audio.join('<br>') : data.audio || 'N/A'}</td></tr>
                <tr><th>键盘和UltraNav</th><td>${Array.isArray(data.keyboard) ? data.keyboard.join('<br>') : data.keyboard || 'N/A'}</td></tr>
                ${data.colorcalibration ? `<tr><th>校色仪</th><td>${Array.isArray(data.colorcalibration) ? data.colorcalibration.join('、') : data.colorcalibration}</td></tr>` : ''}
            </table>
        `, true);

        function formatAddOnTips(tips) {
            if (!tips) return '';
            if (Array.isArray(tips)) return tips.map(t => typeof t === 'object' ? Object.entries(t).map(([k, v]) => `${k}: ${v}`).join('<br>') : t).join('<br>');
            if (typeof tips === 'object') return Object.entries(tips).map(([k, v]) => `${k}: ${v}`).join('<br>');
            return String(tips);
        }
        const addOnTipsHtml = formatAddOnTips(data.add_on_tips);

        const otherCard = makeCard('其他', `
            <table class="spec-table">
                <tr><th>尺寸</th><td>${data.physical?.dimensions || 'N/A'}</td></tr>
                <tr><th>重量</th><td>${data.physical?.weight || 'N/A'}</td></tr>
                <tr><th>材质</th><td>${data.physical?.case_material || data.case_material || 'N/A'}</td></tr>
                <tr><th>安全特性</th><td>${Array.isArray(data.security) ? data.security.join('<br>') : data.security || 'N/A'}</td></tr>
                <tr><th>预装系统</th><td>${Array.isArray(data.system) ? data.system.join('<br>') : data.system || 'N/A'}</td></tr>
                ${data.ACadapter ? `<tr><th>电源适配器</th><td>${Array.isArray(data.ACadapter) ? data.ACadapter.join('、') : data.ACadapter}</td></tr>` : ''}
                ${addOnTipsHtml ? `<tr><th>附加信息</th><td>${addOnTipsHtml}</td></tr>` : ''}
                ${secretTipsEnabled && data.secret_tips ? `<tr><th>秘密提示</th><td>${data.secret_tips}</td></tr>` : ''}
            </table>
        `, true);

        $display.innerHTML = `
            <div class="page-title">${data.model_name || '未知型号'} ${codeHtml}    ${favBtn} </div>
            <div class="page-subtitle">${data.model_family || ''} · ${data.model_generation || ''} · 更新: ${data.update_date || 'N/A'}</div>
            ${addonsHtml}
            ${renderPartCard(parts.cpu, '处理器 (CPU)', 'cpu')}
            ${renderPartCard(parts.graphics, '显卡', 'graphics')}
            ${memoryCard}
            ${renderPartCard(parts.display, '显示屏', 'display')}
            ${touchPenHtml}
            ${storageCard}
            ${batteryCard}
            ${renderPartCard(parts.ethernet, '有线网卡', 'ethernet')}
            ${renderPartCard(parts.wlan, '无线网卡', 'wlan')}
            ${renderPartCard(parts.wwan, 'WWAN', 'wwan')}
            ${renderPartCard(parts.dock, '专有扩展坞支持', 'dock')}
            ${portsCard}
            ${otherCard}
            <div class="btn-row-bottom">
                ${switchBtn}
                ${psref ? `<a class="btn" href="${psref}" target="_blank" rel="noopener">PSREF 网站</a>` : ''}
                ${guide ? `<a class="btn" href="${guide}" target="_blank" rel="noopener">用户手册</a>` : ''}
                ${hmm ? `<a class="btn" href="${hmm}" target="_blank" rel="noopener">硬件维护指南</a>` : ''}
            </div>
        `;
    } catch (e) {
        console.error('渲染失败:', e);
        $display.innerHTML = '<div class="loading-text">加载规格数据失败</div>';
    }
}

// ========== 启动 ==========
loadIndex();