(function () {
    // ---------- 局部变量（所有可能冲突的变量均在此作用域内） ----------
    let currentMode = "model";
    
    let appState = {
        processor_options: [],
        graphics_options: [],
        display_options: [],
        dock_support: [],
        Ethernet: [],
        WLAN: [],
        WWAN: []
    };
    
    let cpuConfig = {
        model: "",
        cores_threads: "",
        base_freq: "",
        turbo_freq: "",
        ext_freq: "",
        cache: "",
        graphics: "",
        iconfamily: "",
        ark: ""
    };
    
    let gpuConfig = {
        model: "",
        Shading_Units: "",
        base_freq: "",
        turbo_freq: "",
        VRAM: "",
        Generation: "",
        Feature: "",
        iconfamily: ""
    };
    
    let displayConfig = {
        type: "",
        tech: "",
        brightness: "",
        contrast: "",
        viewing_angle: "",
        color_gamut: "",
        refresh_rate: "",
        FRUs: []
    };
    
    let ethernetConfig = {
        type: "",
        model_type: ""
    };
    
    let wifiConfig = {
        type: "",
        form: "",
        feature: ""
    };
    
    let wwanConfig = {
        type: "",
        form: "",
        feature: ""
    };
    
    let dockConfig = {
        model: "",
        ports: [],
        power: ""
    };
    
    let cpuIconSelected = cpuConfig.iconfamily;
    let gpuIconSelected = gpuConfig.iconfamily;
    
    let cpuFullList = [];
    let gpuFullList = [];
    let optionLists = { display: [], dock: [], ethernet: [], wlan: [], wwan: [] };
    
    let cpuFilterState = { family: "all", architecture: "all", generationClass: "all", keyword: "" };
    let gpuFilterState = { family: "all", architecture: "all", generationClass: "all", keyword: "" };

    let MAX_CONCURRENT = 6;

    function detectProtocolAndSetConcurrency() {
        try {
            const navEntry = performance.getEntriesByType('navigation')[0];
            if (navEntry && navEntry.nextHopProtocol) {
                const protocol = navEntry.nextHopProtocol;
                if (protocol === 'h2' || protocol === 'h3') {
                    MAX_CONCURRENT = 20;
                }
            }
        } catch(e) {}
    }
    if (document.readyState === 'complete') {
        detectProtocolAndSetConcurrency();
    } else {
        window.addEventListener('load', detectProtocolAndSetConcurrency);
    }

    async function asyncPool(concurrency, iterable, iteratorFn) {
        const ret = [];
        const executing = new Set();
        for (const item of iterable) {
            const p = Promise.resolve().then(() => iteratorFn(item));
            ret.push(p);
            executing.add(p);
            const clean = () => executing.delete(p);
            p.then(clean).catch(clean);
            if (executing.size >= concurrency) {
                await Promise.race(executing);
            }
        }
        return Promise.all(ret);
    }

    function escapeHtml(str) { if(!str) return ""; return String(str).replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }
    
    function safeString(value) {
        if (value == null) return '';
        if (typeof value === 'object') {
            if (value.name) return String(value.name);
            if (value.model) return String(value.model);
            if (value.label) return String(value.label);
            return JSON.stringify(value);
        }
        return String(value);
    }
    
    function normalizeItem(item) {
        return {
            ...item,
            id: item.id || (item.file || "").replace(/\.json$/i, ''),
            name: safeString(item.name),
            family: safeString(item.family),
            Architecture: safeString(item.Architecture),
            generation: safeString(item.generation)
        };
    }
    
    function enrichItemsWithId(list) {
        if (!list) return [];
        list.forEach(i => { if(!i.id) i.id = (i.file || "").replace(/\.json$/i, ''); });
        return list;
    }
    
    function getAvailableValuesForField(listType, state, field) {
        const full = listType === 'cpu' ? cpuFullList : gpuFullList;
        if (!full || !full.length) return [];
        let filtered = full.slice();
        if (field !== 'family' && state.family !== 'all') filtered = filtered.filter(i => i.family === state.family);
        if (field !== 'architecture' && state.architecture !== 'all') filtered = filtered.filter(i => i.Architecture === state.architecture);
        if (field !== 'generationClass' && state.generationClass !== 'all') filtered = filtered.filter(i => (i.generation || "").split(/[,，]+/).map(p=>p.trim()).includes(state.generationClass));
        if (field === 'family') return [...new Set(filtered.map(i=>i.family).filter(Boolean))].sort();
        if (field === 'architecture') return [...new Set(filtered.map(i=>i.Architecture).filter(a=>a && a!="N/A"))].sort();
        if (field === 'generationClass') {
            const set = new Set();
            filtered.forEach(i => { if(i.generation && i.generation!="N/A") i.generation.split(/[,，]+/).forEach(p=>{ if(p.trim()) set.add(p.trim()); }); });
            return Array.from(set).sort();
        }
        return [];
    }
    
    function adjustFilterState(listType, partial) {
        const cur = listType === 'cpu' ? cpuFilterState : gpuFilterState;
        const merged = { ...cur, ...partial };
        const validFam = getAvailableValuesForField(listType, merged, 'family');
        if (merged.family !== 'all' && !validFam.includes(merged.family)) merged.family = 'all';
        const validArch = getAvailableValuesForField(listType, merged, 'architecture');
        if (merged.architecture !== 'all' && !validArch.includes(merged.architecture)) merged.architecture = 'all';
        const validGen = getAvailableValuesForField(listType, merged, 'generationClass');
        if (merged.generationClass !== 'all' && !validGen.includes(merged.generationClass)) merged.generationClass = 'all';
        return merged;
    }
    
    function filterListByState(full, state) {
        return full.filter(item => {
            if (state.family !== "all" && item.family !== state.family) return false;
            if (state.architecture !== "all" && item.Architecture !== state.architecture) return false;
            if (state.generationClass !== "all") {
                const parts = (item.generation || "").split(/[,，]+/).map(p=>p.trim());
                if (!parts.includes(state.generationClass)) return false;
            }
            if (state.keyword.trim()) {
                const kw = state.keyword.trim().toLowerCase();
                if (!(item.name || "").toLowerCase().includes(kw) && !(item.family || "").toLowerCase().includes(kw)) return false;
            }
            return true;
        });
    }
    
    function renderFilterableSection(title, fullList, filterState, selectedIds, listType) {
        if (!fullList || !fullList.length) return `<div class="section"><div class="section-title">${title}</div><div class="helper-text">加载中...</div></div>`;
        const families = getAvailableValuesForField(listType, filterState, 'family');
        const archs = getAvailableValuesForField(listType, filterState, 'architecture');
        const gens = getAvailableValuesForField(listType, filterState, 'generationClass');
        const familiesOpt = `<option value="all">全部厂商</option>`+families.map(f=>`<option value="${escapeHtml(f)}" ${filterState.family===f?'selected':''}>${escapeHtml(f)}</option>`).join('');
        const archOpt = `<option value="all">全部架构</option>`+archs.map(a=>`<option value="${escapeHtml(a)}" ${filterState.architecture===a?'selected':''}>${escapeHtml(a)}</option>`).join('');
        const genOpt = `<option value="all">全部代分类</option>`+gens.map(g=>`<option value="${escapeHtml(g)}" ${filterState.generationClass===g?'selected':''}>${escapeHtml(g)}</option>`).join('');
        const filtered = filterListByState(fullList, filterState);
        let listHtml = `<div class="list-container" data-list-type="${listType}">`;
        filtered.forEach(item => {
            const checked = selectedIds.includes(item.id);
            const displayName = escapeHtml(safeString(item.name));
            const displayFamily = escapeHtml(safeString(item.family));
            const displayArch = escapeHtml(safeString(item.Architecture));
            const displayGen = escapeHtml(safeString(item.generation));
            listHtml += `<div class="list-item ${checked?'selected':''}" data-item-id="${escapeHtml(item.id)}" data-list-type="${listType}">
                <input type="checkbox" ${checked?'checked':''}>
                <div class="item-info">
                    <div class="item-name">${displayName}</div>
                    <div class="item-meta">
                        <span>${displayFamily}</span>
                        <span>${displayArch}</span>
                        <span>${displayGen}</span>
                    </div>
                </div>
            </div>`;
        });
        listHtml += `</div><div class="badge-count">已选 ${selectedIds.length} 项 | 当前筛选 ${filtered.length} 款</div>`;
        return `<div class="section"><div class="section-title">${title} </div>
            <div class="filter-bar" data-filter-type="${listType}">
                <div class="filter-group"><label>厂商</label><select class="filter-family">${familiesOpt}</select></div>
                <div class="filter-group"><label>架构</label><select class="filter-arch">${archOpt}</select></div>
                <div class="filter-group"><label>代分类</label><select class="filter-gen">${genOpt}</select></div>
                <div class="filter-group"><label>搜索</label><input type="text" class="filter-keyword" value="${escapeHtml(filterState.keyword)}"></div>
                <div class="filter-actions"><button class="reset-filters-btn small-reset">重置筛选</button></div>
            </div>${listHtml}</div>`;
    }
    
    function bindFilterBars() {
        document.querySelectorAll('#generatorPage .filter-bar').forEach(bar => {
            if (bar.dataset.eventsBound === 'true') return;
            const type = bar.dataset.filterType;
            const family = bar.querySelector('.filter-family');
            const arch = bar.querySelector('.filter-arch');
            const gen = bar.querySelector('.filter-gen');
            const kw = bar.querySelector('.filter-keyword');
            const reset = bar.querySelector('.reset-filters-btn');
            
            const update = () => {
                const partial = { family: family?.value||"all", architecture: arch?.value||"all", generationClass: gen?.value||"all", keyword: kw?.value||"" };
                if (type === 'cpu') {
                    cpuFilterState = adjustFilterState('cpu', partial);
                    const cpuSec = renderFilterableSection("处理器选项", cpuFullList, cpuFilterState, appState.processor_options, "cpu");
                    document.getElementById('cpuFilterSection').innerHTML = cpuSec;
                } else if (type === 'gpu') {
                    gpuFilterState = adjustFilterState('gpu', partial);
                    const gpuSec = renderFilterableSection("显卡选项", gpuFullList, gpuFilterState, appState.graphics_options, "gpu");
                    document.getElementById('gpuFilterSection').innerHTML = gpuSec;
                }
                bindFilterBars();
                bindModelListItems();
                updateJsonPreviewModel();
            };
            
            if(family) family.addEventListener('change', update);
            if(arch) arch.addEventListener('change', update);
            if(gen) gen.addEventListener('change', update);
            if(kw) kw.addEventListener('input', update);
            if(reset) reset.addEventListener('click', () => {
                const resetState = { family:"all", architecture:"all", generationClass:"all", keyword:"" };
                if (type === 'cpu') {
                    cpuFilterState = adjustFilterState('cpu', resetState);
                    const cpuSec = renderFilterableSection("处理器选项", cpuFullList, cpuFilterState, appState.processor_options, "cpu");
                    document.getElementById('cpuFilterSection').innerHTML = cpuSec;
                } else if (type === 'gpu') {
                    gpuFilterState = adjustFilterState('gpu', resetState);
                    const gpuSec = renderFilterableSection("显卡选项", gpuFullList, gpuFilterState, appState.graphics_options, "gpu");
                    document.getElementById('gpuFilterSection').innerHTML = gpuSec;
                }
                bindFilterBars();
                bindModelListItems();
                updateJsonPreviewModel();
            });
            bar.dataset.eventsBound = 'true';
        });
    }
    
    function bindModelListItems() {
        document.querySelectorAll('#generatorPage .list-item[data-list-type]').forEach(item => {
            if (item.dataset.eventsBound === 'true') return;
            item.addEventListener('click', (e) => {
                if (e.target.tagName === 'INPUT') return;
                const type = item.dataset.listType;
                const id = item.dataset.itemId;
                if (!type || !id) return;
                let arr = type === 'cpu' ? appState.processor_options : appState.graphics_options;
                const idx = arr.indexOf(id);
                if (idx === -1) arr.push(id);
                else arr.splice(idx,1);
                const isSelected = arr.includes(id);
                if(isSelected) item.classList.add('selected');
                else item.classList.remove('selected');
                const cb = item.querySelector('input[type="checkbox"]');
                if(cb) cb.checked = isSelected;
                updateJsonPreviewModel();
            });
            item.dataset.eventsBound = 'true';
        });
    }
    
    function renderChipGrid(options, selected, typeKey) {
        if(!options.length) return `<div>加载中...</div>`;
        let html = `<div class="chip-grid">`;
        options.forEach(opt => {
            const isSelected = selected.includes(opt.value);
            html += `<div class="chip-card ${isSelected ? 'selected' : ''}" data-type="${typeKey}" data-value="${opt.value}"><input type="checkbox" ${isSelected ? 'checked' : ''}><span>${escapeHtml(opt.label)}</span></div>`;
        });
        html += `</div><div class="badge-count">已选 ${selected.length} 项</div>`;
        return html;
    }
    
    function renderBatterySection(batteries) {
        let html = '';
        batteries.forEach((b,idx)=> {
            html += `<div class="battery-item" data-battery-idx="${idx}"><div class="battery-item-header"><span>电池 ${idx+1}</span><button class="danger-btn remove-battery" data-remove-idx="${idx}">删除</button></div>
            <div class="battery-fields">
                <input class="battery-type" placeholder="类型" value="${escapeHtml(b.type||'')}">
                <input class="battery-capacity" placeholder="容量" value="${escapeHtml(b.capacity||'')}">
                <input class="battery-tech" placeholder="技术" value="${escapeHtml(b.tech||'')}">
                <input class="battery-form" placeholder="形态" value="${escapeHtml(b.form||'')}">
            </div></div>`;
        });
        return html;
    }
    
    function renderTextArrayField(id, label, arr) {
        return `<div class="field-group"><label>${label}</label><textarea id="${id}" rows="3" placeholder="${label}">${escapeHtml(arr.join('\n'))}</textarea></div>`;
    }
    
    function buildModelObject() {
        const get = (id) => document.getElementById(id)?.value || "";
        const identity = {
            id: get('f_id'),
            model_name: get('f_modelName'),
            model_family: get('f_modelFamily'),
            model_generation: get('f_modelGen'),
            update_date: get('f_update'),
            model_code: get('f_modelCode').split(/[,，]+/).map(s=>s.trim()).filter(Boolean)
        };
        const max_resolution = {
            mini_dp: get('disp_minidp'),
            hdmi: get('disp_hdmi'),
            usb_c_tbt: get('disp_usbc')
        };
        const memory = {
            max_capacity: get('mem_max'),
            type: get('mem_type'),
            slots: get('mem_slots'),
            features: get('mem_features')
        };
        const storage = {
            ssd_sata: get('st_sata'),
            ssd_pcie: get('st_pcie'),
            hdd: get('st_hdd'),
            sshd: get('st_sshd'),
            emmc: get('st_emmc'),
            optical: get('st_optical'),
            floppy: get('st_floppy'),
            optane: get('st_optane')
        };
        const simVal = get('sim_type');
        const SIM_Card = simVal ? [{ type: simVal }] : [];
        const btType = get('bt_type');
        const btFeature = get('bt_feature');
        const Bluetooth = btType ? [{ type: btType, feature: btFeature, form: "" }] : [];
        const toArray = (id) => get(id).split('\n').filter(l=>l.trim());
        const ports = toArray('ports_area');
        const ACadapter = toArray('ac_adapter');
        const camera = toArray('camera_area');
        const audio = toArray('audio_area');
        const keyboard = toArray('keyboard_area');
        const security = toArray('security_area');
        const system = toArray('system_area');
        const PSREF_link = toArray('psref_link');
        const HMM_link = toArray('hmm_link');
        const user_guide_link = toArray('user_guide');
        const add_on_tips = toArray('add_tips');
        const secret_tips = toArray('secret_tips');
        const physical = {
            dimensions: get('phy_dim'),
            weight: get('phy_weight'),
            case_material: get('phy_material')
        };
        const Battary = [];
        document.querySelectorAll('#generatorPage .battery-item').forEach(el => {
            Battary.push({
                type: el.querySelector('.battery-type')?.value || '',
                capacity: el.querySelector('.battery-capacity')?.value || '',
                tech: el.querySelector('.battery-tech')?.value || '',
                form: el.querySelector('.battery-form')?.value || ''
            });
        });
        return {
            id: identity.id, model_name: identity.model_name, model_family: identity.model_family,
            model_generation: identity.model_generation, update_date: identity.update_date, model_code: identity.model_code,
            processor_options: appState.processor_options, graphics_options: appState.graphics_options,
            display_options: appState.display_options, dock_support: appState.dock_support,
            Ethernet: appState.Ethernet, WLAN: appState.WLAN, WWAN: appState.WWAN,
            Display: { max_resolution: max_resolution, multi_display: get('disp_multi') },
            memory: memory, storage: storage, SIM_Card: SIM_Card, Bluetooth: Bluetooth, Battary: Battary,
            ACadapter: ACadapter, ports: ports, camera: camera, audio: audio, keyboard: keyboard,
            security: security, system: system, physical: physical,
            PSREF_link: PSREF_link, HMM_link: HMM_link, user_guide_link: user_guide_link,
            add_on_tips: add_on_tips, secret_tips: secret_tips
        };
    }

    function updateJsonPreviewModel() {
        const output = buildModelObject();
        document.getElementById('generatorJsonPreviewMain').innerText = JSON.stringify(output, null, 2);
    }

    function renderModelModeForm() {
        return `
            <div class="section"><div class="section-title">基础标识</div><div class="row-2col">
                <input id="f_id" placeholder="ID"><input id="f_modelName" placeholder="型号名称">
                <input id="f_modelFamily" placeholder="产品家族"><input id="f_modelGen" placeholder="世代标记">
                <input id="f_update" placeholder="更新日期"><input id="f_modelCode" placeholder="型号代码(逗号分隔)">
            </div></div>
            <div id="cpuFilterSection"></div>
            <div id="gpuFilterSection"></div>
            <div class="section"><div class="section-title">屏幕</div>${renderChipGrid(optionLists.display, appState.display_options, 'display_options')}</div>
            <div class="section"><div class="section-title">显示输出</div><div class="row-2col"><input id="disp_minidp" placeholder="Mini DP分辨率"><input id="disp_hdmi" placeholder="HDMI分辨率"><input id="disp_usbc" placeholder="USB-C分辨率"><input id="disp_multi" placeholder="多屏描述"></div></div>
            <div class="section"><div class="section-title">内存</div><div class="row-2col"><input id="mem_max" placeholder="最大容量"><input id="mem_type" placeholder="类型"><input id="mem_slots" placeholder="插槽"><input id="mem_features" placeholder="特性"></div></div>
            <div class="section"><div class="section-title">存储</div><div class="row-2col"><input id="st_sata" placeholder="SATA SSD"><input id="st_pcie" placeholder="PCIe SSD"><input id="st_hdd" placeholder="HDD"><input id="st_sshd" placeholder="SSHD"><input id="st_emmc" placeholder="eMMC"><input id="st_optical" placeholder="光驱"><input id="st_floppy" placeholder="软盘"><input id="st_optane" placeholder="傲腾"></div></div>
            <div class="section"><div class="section-title">SIM与蓝牙</div><div class="row-2col"><input id="sim_type" placeholder="SIM卡槽"><input id="bt_type" placeholder="蓝牙类型"><input id="bt_feature" placeholder="蓝牙特性"></div></div>
            <div class="section"><div class="section-title">电池</div><div id="battery-list-container">${renderBatterySection([])}</div><button id="addBatteryBtn" class="add-btn">+ 添加电池</button></div>
            ${renderTextArrayField('ports_area','接口列表',[])}${renderTextArrayField('ac_adapter','电源适配器',[])}${renderTextArrayField('camera_area','摄像头',[])}${renderTextArrayField('audio_area','音频',[])}${renderTextArrayField('keyboard_area','键盘',[])}${renderTextArrayField('security_area','安全',[])}${renderTextArrayField('system_area','操作系统',[])}
            <div class="section"><div class="section-title">物理规格</div><div class="row-2col"><input id="phy_dim" placeholder="尺寸"><input id="phy_weight" placeholder="重量"><input id="phy_material" placeholder="材质"></div></div>
            <div class="section"><div class="section-title">网络连接</div>${renderChipGrid(optionLists.dock, appState.dock_support, 'dock_support')}${renderChipGrid(optionLists.ethernet, appState.Ethernet, 'Ethernet')}${renderChipGrid(optionLists.wlan, appState.WLAN, 'WLAN')}${renderChipGrid(optionLists.wwan, appState.WWAN, 'WWAN')}</div>
            ${renderTextArrayField('psref_link','PSREF链接',[])}${renderTextArrayField('hmm_link','HMM链接',[])}${renderTextArrayField('user_guide','用户指南',[])}${renderTextArrayField('add_tips','附加提示',[])}${renderTextArrayField('secret_tips','内部提示',[])}
            <div class="section"><button id="saveModelBtn" class="primary">保存机型配置到服务器</button></div>
        `;
    }
    
    async function saveModelToServer() {
        const modelDetail = buildModelObject();
        const indexEntry = {
            file: (modelDetail.id || 'unknown') + '.json',
            name: modelDetail.model_name || '未命名机型',
            family: modelDetail.model_family || '',
            generation: modelDetail.model_generation || ''
        };
        try {
            const resp = await fetch('/api/model/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ modelDetail, indexEntry })
            });
            const data = await resp.json();
            if (resp.ok) {
                alert(data.message);
            } else {
                alert('保存失败: ' + (data.error || ''));
            }
        } catch (e) {
            alert('无法连接到后端或后端不存在（悲');
            console.error(e);
        }
    }
    
    function bindModelMiscEvents() {
        const addBtn = document.getElementById('addBatteryBtn');
        if(addBtn && !addBtn.dataset.eventsBound) {
            addBtn.addEventListener('click', () => {
                const container = document.getElementById('battery-list-container');
                if(!container) return;
                const newIdx = document.querySelectorAll('#generatorPage .battery-item').length;
                const newItem = document.createElement('div');
                newItem.className = 'battery-item';
                newItem.setAttribute('data-battery-idx', newIdx);
                newItem.innerHTML = `<div class="battery-item-header"><span>电池 ${newIdx+1}</span><button class="danger-btn remove-battery" data-remove-idx="${newIdx}">删除</button></div>
                <div class="battery-fields">
                    <input class="battery-type" placeholder="类型">
                    <input class="battery-capacity" placeholder="容量">
                    <input class="battery-tech" placeholder="技术">
                    <input class="battery-form" placeholder="形态">
                </div>`;
                container.appendChild(newItem);
                attachBatteryRemoveEvents();
                updateJsonPreviewModel();
            });
            addBtn.dataset.eventsBound = 'true';
        }
        
        function attachBatteryRemoveEvents() {
            document.querySelectorAll('#generatorPage .remove-battery').forEach(btn => {
                if(btn.dataset.eventsBound) return;
                btn.addEventListener('click', (e) => {
                    const idx = parseInt(e.currentTarget.dataset.removeIdx,10);
                    if(!isNaN(idx)) {
                        const item = e.currentTarget.closest('.battery-item');
                        if(item) item.remove();
                        document.querySelectorAll('#generatorPage .battery-item').forEach((el,i) => {
                            el.setAttribute('data-battery-idx', i);
                            const headerSpan = el.querySelector('.battery-item-header span');
                            if(headerSpan) headerSpan.textContent = `电池 ${i+1}`;
                            const delBtn = el.querySelector('.remove-battery');
                            if(delBtn) delBtn.setAttribute('data-remove-idx', i);
                        });
                        updateJsonPreviewModel();
                    }
                });
                btn.dataset.eventsBound = 'true';
            });
        }
        attachBatteryRemoveEvents();
        
        document.querySelectorAll('#generatorPage input, #generatorPage textarea, #generatorPage select').forEach(el => {
            if(el.id && !el.id.includes('filter') && !el.dataset.eventsBound) {
                el.addEventListener('input', () => updateJsonPreviewModel());
                el.dataset.eventsBound = 'true';
            }
        });
        
        document.querySelectorAll('#generatorPage .chip-card').forEach(card => {
            if(card.dataset.eventsBound) return;
            card.addEventListener('click', (e) => {
                const type = card.dataset.type;
                const val = card.dataset.value;
                if (!type || !val) return;
                if (!appState.hasOwnProperty(type)) return;
                const idx = appState[type].indexOf(val);
                if (idx === -1) appState[type].push(val);
                else appState[type].splice(idx,1);
                if(card.classList.contains('selected')) card.classList.remove('selected');
                else card.classList.add('selected');
                const cb = card.querySelector('input[type="checkbox"]');
                if(cb) cb.checked = !cb.checked;
                updateJsonPreviewModel();
            });
            card.dataset.eventsBound = 'true';
        });

        const saveBtn = document.getElementById('saveModelBtn');
        if (saveBtn && !saveBtn.dataset.eventsBound) {
            saveBtn.addEventListener('click', saveModelToServer);
            saveBtn.dataset.eventsBound = 'true';
        }
    }
    
    // ---------- CPU 配置 ----------
    function renderCpuForm() {
        return `
            <div class="section">
                <div class="section-title">CPU 配置文件生成器</div>
                <div class="component-form-grid">
                    <div class="component-form-field full-width">
                        <input id="cpu_model" placeholder="型号（同时也是文件名）" value="${escapeHtml(cpuConfig.model)}">
                    </div>
                    <div class="component-form-field">
                        <input id="cpu_cores" placeholder="核心/线程数" value="${escapeHtml(cpuConfig.cores_threads)}">
                    </div>
                    <div class="component-form-field">
                        <input id="cpu_base" placeholder="基础频率" value="${escapeHtml(cpuConfig.base_freq)}">
                    </div>
                    <div class="component-form-field">
                        <input id="cpu_turbo" placeholder="加速频率" value="${escapeHtml(cpuConfig.turbo_freq)}">
                    </div>
                    <div class="component-form-field">
                        <input id="cpu_ext" placeholder="外频" value="${escapeHtml(cpuConfig.ext_freq)}">
                    </div>
                    <div class="component-form-field">
                        <input id="cpu_cache" placeholder="缓存" value="${escapeHtml(cpuConfig.cache)}">
                    </div>
                    <div class="component-form-field">
                        <input id="cpu_graphics" placeholder="图形处理器" value="${escapeHtml(cpuConfig.graphics)}">
                    </div>
                    <div class="component-form-field">
                        <button type="button" id="cpu_iconfamily_btn" style="width:100%; padding:10px 14px; border:1px solid var(--border-light); border-radius:12px; background:var(--bg-panel); color:var(--text-primary); cursor:pointer; text-align:left; font-size:0.85rem;">
                            <span id="cpu_icon_label">${cpuConfig.iconfamily ? cpuConfig.iconfamily : '点击选择图标'}</span>
                        </button>
                        <input type="hidden" id="cpu_iconfamily_hidden" value="${escapeHtml(cpuConfig.iconfamily)}">
                    </div>
                    <div class="component-form-field full-width">
                        <input id="cpu_ark" placeholder="ark" value="${escapeHtml(cpuConfig.ark)}">
                    </div>
                </div>
                <hr>
                <div class="section-title" style="margin-top:12px;">索引元数据（用于更新 CPU.json 索引）</div>
                <div class="row-2col">
                    <div class="component-form-field">
                        <input id="cpu_idx_family" placeholder="家族 (family)" value="">
                    </div>
                    <div class="component-form-field">
                        <input id="cpu_idx_arch" placeholder="架构 (Architecture)" value="">
                    </div>
                    <div class="component-form-field">
                        <input id="cpu_idx_gen" placeholder="代分类 (generation)" value="">
                    </div>
                </div>
                <button id="addToCpuIndexBtn" class="primary" style="margin-top:12px;">将此 CPU 加入索引并导出</button>
            </div>
        `;
    }

    function updateCpuPreview() {
        cpuConfig.model = document.getElementById('cpu_model')?.value || "";
        cpuConfig.cores_threads = document.getElementById('cpu_cores')?.value || "";
        cpuConfig.base_freq = document.getElementById('cpu_base')?.value || "";
        cpuConfig.turbo_freq = document.getElementById('cpu_turbo')?.value || "";
        cpuConfig.ext_freq = document.getElementById('cpu_ext')?.value || "";
        cpuConfig.cache = document.getElementById('cpu_cache')?.value || "";
        cpuConfig.graphics = document.getElementById('cpu_graphics')?.value || "";
        const hidden = document.getElementById('cpu_iconfamily_hidden');
        cpuConfig.iconfamily = hidden ? hidden.value : cpuIconSelected;
        cpuConfig.ark = document.getElementById('cpu_ark')?.value || "";
        document.getElementById('generatorJsonPreviewMain').innerText = JSON.stringify(cpuConfig, null, 2);
        const labelSpan = document.getElementById('cpu_icon_label');
        if (labelSpan) {
            const icon = cpuConfig.iconfamily;
            labelSpan.textContent = icon ? icon : '点击选择图标';
        }
    }

    async function openIconPicker() {
        const modal = document.createElement('div');
        modal.className = 'icon-modal-overlay';
        modal.innerHTML = `
            <div class="icon-modal">
                <div class="icon-modal-header">
                    <span class="icon-modal-title">选择 CPU 图标</span>
                    <button class="icon-close-btn">&times;</button>
                </div>
                <div id="icon-grid-container" style="min-height:120px; text-align:center; padding:20px; color:var(--text-muted);">加载中...</div>
            </div>
        `;
        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector('.icon-close-btn').addEventListener('click', close);
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        let icons = [];
        let fallback = false;
        try {
            const resp = await fetch('/api/list/cpu_icons');
            if (resp.ok) icons = await resp.json();
            else fallback = true;
        } catch (e) {
            console.error('获取图标失败', e);
            fallback = true;
        }

        const container = document.getElementById('icon-grid-container');
        if (!fallback && icons.length > 0) {
            let html = '<div class="icon-grid">';
            icons.forEach(icon => {
                html += `
                    <div class="icon-item" data-icon="${escapeHtml(icon)}">
                        <img src="/modeldata/CPU/cpu_icon/${icon}" alt="${icon}" loading="lazy" style="width:64px;height:64px;object-fit:contain;">
                        <span>${escapeHtml(icon)}</span>
                    </div>`;
            });
            html += '</div>';
            container.innerHTML = html;
            container.querySelectorAll('.icon-item').forEach(item => {
                item.addEventListener('click', () => {
                    const icon = item.dataset.icon;
                    document.getElementById('cpu_iconfamily_hidden').value = icon;
                    document.getElementById('cpu_icon_label').textContent = icon;
                    cpuConfig.iconfamily = icon;
                    cpuIconSelected = icon;
                    updateCpuPreview();
                    close();
                });
            });
        } else {
            container.innerHTML = `
                <p>无法加载图标列表，请手动输入文件名</p>
                <div style="display:flex; gap:8px; margin-top:12px;">
                    <input id="icon-fallback-input" type="text" placeholder="图标文件名" value="${escapeHtml(cpuConfig.iconfamily)}" style="flex:1;">
                    <button id="icon-fallback-confirm" class="primary">确定</button>
                </div>`;
            document.getElementById('icon-fallback-confirm').addEventListener('click', () => {
                const val = document.getElementById('icon-fallback-input').value.trim();
                document.getElementById('cpu_iconfamily_hidden').value = val;
                document.getElementById('cpu_icon_label').textContent = val || '点击选择图标';
                cpuConfig.iconfamily = val;
                cpuIconSelected = val;
                updateCpuPreview();
                close();
            });
        }
    }

    async function openGpuIconPicker() {
    const modal = document.createElement('div');
    modal.className = 'icon-modal-overlay';
    modal.innerHTML = `
        <div class="icon-modal">
            <div class="icon-modal-header">
                <span class="icon-modal-title">选择 GPU 图标</span>
                <button class="icon-close-btn">&times;</button>
            </div>
            <div id="icon-grid-container" style="min-height:120px; text-align:center; padding:20px; color:var(--text-muted);">加载中...</div>
        </div>
    `;
    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('.icon-close-btn').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    let icons = [];
    let fallback = false;
    try {
        const resp = await fetch('/api/list/gpu_icons');
        if (resp.ok) icons = await resp.json();
        else fallback = true;
    } catch (e) {
        console.error('获取 GPU 图标失败', e);
        fallback = true;
    }

    const container = document.getElementById('icon-grid-container');
    if (!fallback && icons.length > 0) {
        let html = '<div class="icon-grid">';
        icons.forEach(icon => {
            html += `
                <div class="icon-item" data-icon="${escapeHtml(icon)}">
                    <img src="/modeldata/Graphics/Graphics_icons/${icon}" alt="${icon}" loading="lazy" style="width:64px;height:64px;object-fit:contain;">
                    <span>${escapeHtml(icon)}</span>
                </div>`;
        });
        html += '</div>';
        container.innerHTML = html;
        container.querySelectorAll('.icon-item').forEach(item => {
            item.addEventListener('click', () => {
                const icon = item.dataset.icon;
                document.getElementById('gpu_iconfamily_hidden').value = icon;
                document.getElementById('gpu_icon_label').textContent = icon;
                gpuConfig.iconfamily = icon;
                gpuIconSelected = icon;
                updateGpuPreview();
                close();
            });
        });
    } else {
        container.innerHTML = `
            <p>无法加载图标列表，请手动输入文件名</p>
            <div style="display:flex; gap:8px; margin-top:12px;">
                <input id="icon-fallback-input" type="text" placeholder="图标文件名" value="${escapeHtml(gpuConfig.iconfamily)}" style="flex:1;">
                <button id="icon-fallback-confirm" class="primary">确定</button>
            </div>`;
        document.getElementById('icon-fallback-confirm').addEventListener('click', () => {
            const val = document.getElementById('icon-fallback-input').value.trim();
            document.getElementById('gpu_iconfamily_hidden').value = val;
            document.getElementById('gpu_icon_label').textContent = val || '点击选择图标';
            gpuConfig.iconfamily = val;
            gpuIconSelected = val;
            updateGpuPreview();
            close();
        });
    }
}

    function bindCpuEvents() {
        const ids = ['cpu_model','cpu_cores','cpu_base','cpu_turbo','cpu_ext','cpu_cache','cpu_graphics','cpu_ark'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if(el && !el.dataset.eventsBound) {
                el.addEventListener('input', () => updateCpuPreview());
                el.dataset.eventsBound = 'true';
            }
        });

        const iconBtn = document.getElementById('cpu_iconfamily_btn');
        if (iconBtn && !iconBtn.dataset.eventsBound) {
            iconBtn.addEventListener('click', openIconPicker);
            iconBtn.dataset.eventsBound = 'true';
        }

        updateCpuPreview();

        const addBtn = document.getElementById('addToCpuIndexBtn');
        if (addBtn && !addBtn.dataset.eventsBound) {
            addBtn.addEventListener('click', async () => {
                const model = document.getElementById('cpu_model')?.value.trim();
                if (!model) {
                    alert('请先填写 CPU 型号！');
                    return;
                }

                const family = document.getElementById('cpu_idx_family')?.value.trim() || "未分类";
                const arch = document.getElementById('cpu_idx_arch')?.value.trim() || "未知";
                const gen = document.getElementById('cpu_idx_gen')?.value.trim() || "未知";

                const cpuDetail = {
                    model: model,
                    cores_threads: document.getElementById('cpu_cores')?.value || "",
                    base_freq: document.getElementById('cpu_base')?.value || "",
                    turbo_freq: document.getElementById('cpu_turbo')?.value || "",
                    ext_freq: document.getElementById('cpu_ext')?.value || "",
                    cache: document.getElementById('cpu_cache')?.value || "",
                    graphics: document.getElementById('cpu_graphics')?.value || "",
                    iconfamily: document.getElementById('cpu_iconfamily_hidden')?.value || "",
                    ark: document.getElementById('cpu_ark')?.value || ""
                };

                const indexEntry = {
                    file: model + '.json',
                    name: model,
                    family: family,
                    Architecture: arch,
                    generation: gen
                };

                try {
                    const response = await fetch('/api/cpu/add', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ cpuDetail, indexEntry })
                    });

                    const result = await response.json();
                    if (response.ok) {
                        alert(result.message);
                        await loadCpuIndex();
                        if (currentMode === 'model') renderForm();
                    } else {
                        alert('添加失败: ' + (result.error || '未知错误'));
                    }
                } catch (err) {
                    alert('无法连接到后端或后端不存在（悲，请确认后端是否已启动。');
                    console.error(err);
                }
            });
            addBtn.dataset.eventsBound = 'true';
        }
    }

    // ---------- GPU 配置 ----------
    function renderGpuForm() {
        return `
            <div class="section">
                <div class="section-title">GPU 配置文件生成器</div>
                <div class="component-form-grid">
                    <div class="component-form-field full-width">
                        <input id="gpu_model" placeholder="型号（同时也是文件名）" value="${escapeHtml(gpuConfig.model)}">
                    </div>
                    <div class="component-form-field">
                        <input id="gpu_shading" placeholder="Shading Units" value="${escapeHtml(gpuConfig.Shading_Units)}">
                    </div>
                    <div class="component-form-field">
                        <input id="gpu_base" placeholder="基础频率" value="${escapeHtml(gpuConfig.base_freq)}">
                    </div>
                    <div class="component-form-field">
                        <input id="gpu_turbo" placeholder="加速频率" value="${escapeHtml(gpuConfig.turbo_freq)}">
                    </div>
                    <div class="component-form-field">
                        <input id="gpu_vram" placeholder="VRAM" value="${escapeHtml(gpuConfig.VRAM)}">
                    </div>
                    <div class="component-form-field">
                        <input id="gpu_gen" placeholder="世代" value="${escapeHtml(gpuConfig.Generation)}">
                    </div>
                    <div class="component-form-field">
                        <input id="gpu_feature" placeholder="功能" value="${escapeHtml(gpuConfig.Feature)}">
                    </div>
                    <div class="component-form-field">
                        <button type="button" id="gpu_iconfamily_btn" style="width:100%; padding:10px 14px; border:1px solid var(--border-light); border-radius:12px; background:var(--bg-panel); color:var(--text-primary); cursor:pointer; text-align:left; font-size:0.85rem;">
                            <span id="gpu_icon_label">${gpuConfig.iconfamily ? gpuConfig.iconfamily : '点击选择图标'}</span>
                        </button>
                        <input type="hidden" id="gpu_iconfamily_hidden" value="${escapeHtml(gpuConfig.iconfamily)}">
                    </div>
                </div>
                <hr>
                <div class="section-title" style="margin-top:12px;">索引元数据（用于更新 GPU.json 索引）</div>
                <div class="row-2col">
                    <div class="component-form-field">
                        <input id="gpu_idx_family" placeholder="家族 (family)" value="">
                    </div>
                    <div class="component-form-field">
                        <input id="gpu_idx_arch" placeholder="架构 (Architecture)" value="">
                    </div>
                    <div class="component-form-field">
                        <input id="gpu_idx_gen" placeholder="代分类 (generation)" value="">
                    </div>
                </div>
                <button id="addToGpuIndexBtn" class="primary" style="margin-top:12px;">将此 GPU 加入索引并导出</button>
            </div>
        `;
    }

    function updateGpuPreview() {
        gpuConfig.model = document.getElementById('gpu_model')?.value || "";
        gpuConfig.Shading_Units = document.getElementById('gpu_shading')?.value || "";
        gpuConfig.base_freq = document.getElementById('gpu_base')?.value || "";
        gpuConfig.turbo_freq = document.getElementById('gpu_turbo')?.value || "";
        gpuConfig.VRAM = document.getElementById('gpu_vram')?.value || "";
        gpuConfig.Generation = document.getElementById('gpu_gen')?.value || "";
        gpuConfig.Feature = document.getElementById('gpu_feature')?.value || "";
        const hidden = document.getElementById('gpu_iconfamily_hidden');
        gpuConfig.iconfamily = hidden ? hidden.value : gpuIconSelected;
        const out = {
            model: gpuConfig.model,
            "Shading Units": gpuConfig.Shading_Units,
            base_freq: gpuConfig.base_freq,
            turbo_freq: gpuConfig.turbo_freq,
            VRAM: gpuConfig.VRAM,
            Generation: gpuConfig.Generation,
            Feature: gpuConfig.Feature,
            iconfamily: gpuConfig.iconfamily
        };
        document.getElementById('generatorJsonPreviewMain').innerText = JSON.stringify(out, null, 2);
        const labelSpan = document.getElementById('gpu_icon_label');
        if (labelSpan) {
            const icon = gpuConfig.iconfamily;
            labelSpan.textContent = icon ? icon : '点击选择图标';
        }
    }

    function bindGpuEvents() {
        const ids = ['gpu_model','gpu_shading','gpu_base','gpu_turbo','gpu_vram','gpu_gen','gpu_feature'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if(el && !el.dataset.eventsBound) {
                el.addEventListener('input', () => updateGpuPreview());
                el.dataset.eventsBound = 'true';
            }
        });

        const iconBtn = document.getElementById('gpu_iconfamily_btn');
        if (iconBtn && !iconBtn.dataset.eventsBound) {
            iconBtn.addEventListener('click', openGpuIconPicker);
            iconBtn.dataset.eventsBound = 'true';
        }

        updateGpuPreview();

        const addBtn = document.getElementById('addToGpuIndexBtn');
        if (addBtn && !addBtn.dataset.eventsBound) {
            addBtn.addEventListener('click', async () => {
                const model = document.getElementById('gpu_model')?.value.trim();
                if (!model) {
                    alert('请先填写 GPU 型号！');
                    return;
                }

                const family = document.getElementById('gpu_idx_family')?.value.trim() || "未分类";
                const arch = document.getElementById('gpu_idx_arch')?.value.trim() || "未知";
                const gen = document.getElementById('gpu_idx_gen')?.value.trim() || "未知";

                const gpuDetail = {
                    model: model,
                    "Shading Units": document.getElementById('gpu_shading')?.value || "",
                    base_freq: document.getElementById('gpu_base')?.value || "",
                    turbo_freq: document.getElementById('gpu_turbo')?.value || "",
                    VRAM: document.getElementById('gpu_vram')?.value || "",
                    Generation: document.getElementById('gpu_gen')?.value || "",
                    Feature: document.getElementById('gpu_feature')?.value || "",
                    iconfamily: document.getElementById('gpu_iconfamily_hidden')?.value || ""
                };

                const indexEntry = {
                    file: model + '.json',
                    name: model,
                    family: family,
                    Architecture: arch,
                    generation: gen
                };

                try {
                    const response = await fetch('/api/gpu/add', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ gpuDetail, indexEntry })
                    });

                    const result = await response.json();
                    if (response.ok) {
                        alert(result.message);
                        await loadGpuIndex();
                        if (currentMode === 'model') renderForm();
                    } else {
                        alert('添加失败: ' + (result.error || '未知错误'));
                    }
                } catch (err) {
                    alert('无法连接到后端或后端不存在（悲，请确认后端是否已启动。');
                    console.error(err);
                }
            });
            addBtn.dataset.eventsBound = 'true';
        }
    }

    // ---------- 屏幕配置 ----------
    function renderDisplayForm() {
        let fruHtml = '';
        if (displayConfig.FRUs && displayConfig.FRUs.length) {
            displayConfig.FRUs.forEach((fru, idx) => {
                const fruKey = Object.keys(fru)[0] || '';
                const panelVal = fru[fruKey] || '';
                fruHtml += `
                    <div class="fru-item" data-fru-idx="${idx}">
                        <input type="text" class="fru-number" placeholder="FRU 编号" value="${escapeHtml(fruKey)}" style="flex:1;">
                        <input type="text" class="fru-panel" placeholder="面板型号" value="${escapeHtml(panelVal)}" style="flex:2;">
                        <button class="danger-btn remove-fru" data-idx="${idx}">删除</button>
                    </div>
                `;
            });
        }
        return `
            <div class="section">
                <div class="section-title">屏幕配置文件生成器</div>
                <div class="component-form-grid">
                    <div class="component-form-field full-width">
                        <input id="disp_type" placeholder="型号" value="${escapeHtml(displayConfig.type)}">
                    </div>
                    <div class="component-form-field">
                        <input id="disp_tech" placeholder="技术" value="${escapeHtml(displayConfig.tech)}">
                    </div>
                    <div class="component-form-field">
                        <input id="disp_brightness" placeholder="亮度" value="${escapeHtml(displayConfig.brightness)}">
                    </div>
                    <div class="component-form-field">
                        <input id="disp_contrast" placeholder="对比度" value="${escapeHtml(displayConfig.contrast)}">
                    </div>
                    <div class="component-form-field">
                        <input id="disp_angle" placeholder="可视角度" value="${escapeHtml(displayConfig.viewing_angle)}">
                    </div>
                    <div class="component-form-field">
                        <input id="disp_gamut" placeholder="色彩区域" value="${escapeHtml(displayConfig.color_gamut)}">
                    </div>
                    <div class="component-form-field">
                        <input id="disp_refresh" placeholder="刷新率" value="${escapeHtml(displayConfig.refresh_rate)}">
                    </div>
                </div>
                <div class="section-title" style="margin-top:16px;">FRU 列表 (编号与面板型号)</div>
                <div id="fru-list-container">${fruHtml || '<div class="empty-battery">暂无 FRU，点击下方添加</div>'}</div>
                <button type="button" id="addFruBtn" class="add-btn" style="margin-top:8px;">+ 添加 FRU</button>
                <button id="saveDisplayBtn" class="primary" style="margin-top:12px;">保存屏幕配置到服务器</button>
            </div>
        `;
    }

    function updateDisplayPreview() {
        displayConfig.type = document.getElementById('disp_type')?.value || "";
        displayConfig.tech = document.getElementById('disp_tech')?.value || "";
        displayConfig.brightness = document.getElementById('disp_brightness')?.value || "";
        displayConfig.contrast = document.getElementById('disp_contrast')?.value || "";
        displayConfig.viewing_angle = document.getElementById('disp_angle')?.value || "";
        displayConfig.color_gamut = document.getElementById('disp_gamut')?.value || "";
        displayConfig.refresh_rate = document.getElementById('disp_refresh')?.value || "";
        const frus = [];
        document.querySelectorAll('#generatorPage .fru-item').forEach(item => {
            const fruNum = item.querySelector('.fru-number')?.value.trim();
            const panelModel = item.querySelector('.fru-panel')?.value.trim();
            if (fruNum || panelModel) {
                const obj = {};
                if (fruNum) obj[fruNum] = panelModel || "";
                else if (panelModel) obj[""] = panelModel;
                if (Object.keys(obj).length) frus.push(obj);
            }
        });
        displayConfig.FRUs = frus;
        const out = {
            type: displayConfig.type,
            tech: displayConfig.tech,
            brightness: displayConfig.brightness,
            contrast: displayConfig.contrast,
            viewing_angle: displayConfig.viewing_angle,
            color_gamut: displayConfig.color_gamut,
            refresh_rate: displayConfig.refresh_rate,
            FRUs: displayConfig.FRUs
        };
        document.getElementById('generatorJsonPreviewMain').innerText = JSON.stringify(out, null, 2);
    }

    async function saveDisplayToServer() {
        updateDisplayPreview();
        const indexEntry = {
            file: (displayConfig.type || 'untitled') + '.json',
            name: displayConfig.type || '未命名屏幕',
            tech: displayConfig.tech || ''
        };
        try {
            const resp = await fetch('/api/display/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ displayDetail: displayConfig, indexEntry })
            });
            const data = await resp.json();
            if (resp.ok) {
                alert(data.message);
                await loadOptionList('display');
                if (currentMode === 'model') renderForm();
            } else {
                alert('保存失败: ' + (data.error || ''));
            }
        } catch (e) {
            alert('无法连接到后端或后端不存在（悲');
            console.error(e);
        }
    }

    function bindDisplayEvents() {
        const basicIds = ['disp_type','disp_tech','disp_brightness','disp_contrast','disp_angle','disp_gamut','disp_refresh'];
        basicIds.forEach(id => {
            const el = document.getElementById(id);
            if(el && !el.dataset.eventsBound) {
                el.addEventListener('input', () => updateDisplayPreview());
                el.dataset.eventsBound = 'true';
            }
        });
        
        const addFruBtn = document.getElementById('addFruBtn');
        if(addFruBtn && !addFruBtn.dataset.eventsBound) {
            addFruBtn.addEventListener('click', () => {
                const container = document.getElementById('fru-list-container');
                if(!container) return;
                const newItem = document.createElement('div');
                newItem.className = 'fru-item';
                newItem.innerHTML = `
                    <input type="text" class="fru-number" placeholder="FRU 编号" style="flex:1;">
                    <input type="text" class="fru-panel" placeholder="面板型号" style="flex:2;">
                    <button class="danger-btn remove-fru">删除</button>
                `;
                container.appendChild(newItem);
                const numInput = newItem.querySelector('.fru-number');
                const panelInput = newItem.querySelector('.fru-panel');
                if(numInput) numInput.addEventListener('input', () => updateDisplayPreview());
                if(panelInput) panelInput.addEventListener('input', () => updateDisplayPreview());
                const removeBtn = newItem.querySelector('.remove-fru');
                if(removeBtn) {
                    removeBtn.addEventListener('click', (e) => {
                        const item = e.currentTarget.closest('.fru-item');
                        if(item) item.remove();
                        if(container.querySelectorAll('.fru-item').length === 0) {
                            container.innerHTML = '<div class="empty-battery">暂无 FRU，点击下方添加</div>';
                        }
                        updateDisplayPreview();
                    });
                }
                const emptyDiv = container.querySelector('.empty-battery');
                if(emptyDiv) emptyDiv.remove();
                updateDisplayPreview();
            });
            addFruBtn.dataset.eventsBound = 'true';
        }
        
        document.querySelectorAll('#generatorPage .fru-item').forEach(item => {
            const numInput = item.querySelector('.fru-number');
            const panelInput = item.querySelector('.fru-panel');
            if(numInput && !numInput.dataset.eventsBound) {
                numInput.addEventListener('input', () => updateDisplayPreview());
                numInput.dataset.eventsBound = 'true';
            }
            if(panelInput && !panelInput.dataset.eventsBound) {
                panelInput.addEventListener('input', () => updateDisplayPreview());
                panelInput.dataset.eventsBound = 'true';
            }
            const delBtn = item.querySelector('.remove-fru');
            if(delBtn && !delBtn.dataset.eventsBound) {
                delBtn.addEventListener('click', (e) => {
                    const item = e.currentTarget.closest('.fru-item');
                    if(item) item.remove();
                    const container = document.getElementById('fru-list-container');
                    if(container && container.querySelectorAll('.fru-item').length === 0) {
                        container.innerHTML = '<div class="empty-battery">暂无 FRU，点击下方添加</div>';
                    }
                    updateDisplayPreview();
                });
                delBtn.dataset.eventsBound = 'true';
            }
        });

        const saveBtn = document.getElementById('saveDisplayBtn');
        if (saveBtn && !saveBtn.dataset.eventsBound) {
            saveBtn.addEventListener('click', saveDisplayToServer);
            saveBtn.dataset.eventsBound = 'true';
        }
        
        updateDisplayPreview();
    }

    // ---------- 有线网卡配置 ----------
    function renderEthernetForm() {
        return `
            <div class="section">
                <div class="section-title">有线网卡配置文件生成器</div>
                <div class="component-form-grid">
                    <div class="component-form-field full-width">
                        <input id="eth_type" placeholder="型号" value="${escapeHtml(ethernetConfig.type)}">
                    </div>
                    <div class="component-form-field">
                        <input id="eth_model_type" placeholder="功能" value="${escapeHtml(ethernetConfig.model_type)}">
                    </div>
                </div>
                <button id="saveEthernetBtn" class="primary" style="margin-top:12px;">保存网卡配置到服务器</button>
            </div>
        `;
    }

    function updateEthernetPreview() {
        ethernetConfig.type = document.getElementById('eth_type')?.value || "";
        ethernetConfig.model_type = document.getElementById('eth_model_type')?.value || "";
        const out = { type: ethernetConfig.type, "model-type": ethernetConfig.model_type };
        document.getElementById('generatorJsonPreviewMain').innerText = JSON.stringify(out, null, 2);
    }

    async function saveEthernetToServer() {
        updateEthernetPreview();
        const indexEntry = {
            file: (ethernetConfig.type || 'untitled') + '.json',
            name: ethernetConfig.type || '未命名网卡'
        };
        try {
            const resp = await fetch('/api/ethernet/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ethernetDetail: ethernetConfig, indexEntry })
            });
            const data = await resp.json();
            if (resp.ok) {
                alert(data.message);
                await loadOptionList('ethernet');
                if (currentMode === 'model') renderForm();
            } else {
                alert('保存失败: ' + (data.error || ''));
            }
        } catch (e) {
            alert('无法连接到后端或后端不存在（悲');
            console.error(e);
        }
    }

    function bindEthernetEvents() {
        const ids = ['eth_type','eth_model_type'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if(el && !el.dataset.eventsBound) {
                el.addEventListener('input', () => updateEthernetPreview());
                el.dataset.eventsBound = 'true';
            }
        });
        const saveBtn = document.getElementById('saveEthernetBtn');
        if (saveBtn && !saveBtn.dataset.eventsBound) {
            saveBtn.addEventListener('click', saveEthernetToServer);
            saveBtn.dataset.eventsBound = 'true';
        }
        updateEthernetPreview();
    }

    // ---------- WiFi 配置 ----------
    function renderWifiForm() {
        return `
            <div class="section">
                <div class="section-title">WiFi 配置文件生成器</div>
                <div class="component-form-grid">
                    <div class="component-form-field full-width">
                        <input id="wifi_type" placeholder="型号" value="${escapeHtml(wifiConfig.type)}">
                    </div>
                    <div class="component-form-field">
                        <input id="wifi_form" placeholder="接口与形态" value="${escapeHtml(wifiConfig.form)}">
                    </div>
                    <div class="component-form-field full-width">
                        <input id="wifi_feature" placeholder="功能" value="${escapeHtml(wifiConfig.feature)}">
                    </div>
                </div>
                <button id="saveWifiBtn" class="primary" style="margin-top:12px;">保存 WiFi 配置到服务器</button>
            </div>
        `;
    }

    function updateWifiPreview() {
        wifiConfig.type = document.getElementById('wifi_type')?.value || "";
        wifiConfig.form = document.getElementById('wifi_form')?.value || "";
        wifiConfig.feature = document.getElementById('wifi_feature')?.value || "";
        const out = { type: wifiConfig.type, form: wifiConfig.form, feature: wifiConfig.feature };
        document.getElementById('generatorJsonPreviewMain').innerText = JSON.stringify(out, null, 2);
    }

    async function saveWifiToServer() {
        updateWifiPreview();
        const indexEntry = {
            file: (wifiConfig.type || 'untitled') + '.json',
            name: wifiConfig.type || '未命名 WiFi'
        };
        try {
            const resp = await fetch('/api/wifi/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wifiDetail: wifiConfig, indexEntry })
            });
            const data = await resp.json();
            if (resp.ok) {
                alert(data.message);
                await loadOptionList('wlan');
                if (currentMode === 'model') renderForm();
            } else {
                alert('保存失败: ' + (data.error || ''));
            }
        } catch (e) {
            alert('无法连接到后端或后端不存在（悲');
            console.error(e);
        }
    }

    function bindWifiEvents() {
        const ids = ['wifi_type','wifi_form','wifi_feature'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if(el && !el.dataset.eventsBound) {
                el.addEventListener('input', () => updateWifiPreview());
                el.dataset.eventsBound = 'true';
            }
        });
        const saveBtn = document.getElementById('saveWifiBtn');
        if (saveBtn && !saveBtn.dataset.eventsBound) {
            saveBtn.addEventListener('click', saveWifiToServer);
            saveBtn.dataset.eventsBound = 'true';
        }
        updateWifiPreview();
    }

    // ---------- WWAN 配置 ----------
    function renderwwanForm() {
        return `
            <div class="section">
                <div class="section-title">WWAN 配置文件生成器</div>
                <div class="component-form-grid">
                    <div class="component-form-field full-width">
                        <input id="wwan_type" placeholder="型号" value="${escapeHtml(wwanConfig.type)}">
                    </div>
                    <div class="component-form-field">
                        <input id="wwan_form" placeholder="接口与形态" value="${escapeHtml(wwanConfig.form)}">
                    </div>
                    <div class="component-form-field full-width">
                        <textarea id="wwan_feature" placeholder="功能" rows="2">${escapeHtml(wwanConfig.feature)}</textarea>
                    </div>
                </div>
                <button id="saveWwanBtn" class="primary" style="margin-top:12px;">保存 WWAN 配置到服务器</button>
            </div>
        `;
    }

    function updatewwanPreview() {
        wwanConfig.type = document.getElementById('wwan_type')?.value || "";
        wwanConfig.form = document.getElementById('wwan_form')?.value || "";
        wwanConfig.feature = document.getElementById('wwan_feature')?.value || "";
        const out = { type: wwanConfig.type, form: wwanConfig.form, feature: wwanConfig.feature };
        document.getElementById('generatorJsonPreviewMain').innerText = JSON.stringify(out, null, 2);
    }

    async function saveWwanToServer() {
        updatewwanPreview();
        const indexEntry = {
            file: (wwanConfig.type || 'untitled') + '.json',
            name: wwanConfig.type || '未命名 WWAN'
        };
        try {
            const resp = await fetch('/api/wwan/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wwanDetail: wwanConfig, indexEntry })
            });
            const data = await resp.json();
            if (resp.ok) {
                alert(data.message);
                await loadOptionList('wwan');
                if (currentMode === 'model') renderForm();
            } else {
                alert('保存失败: ' + (data.error || ''));
            }
        } catch (e) {
            alert('无法连接到后端或后端不存在（悲');
            console.error(e);
        }
    }

    function bindwwanEvents() {
        const ids = ['wwan_type','wwan_form','wwan_feature'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if(el && !el.dataset.eventsBound) {
                el.addEventListener('input', () => updatewwanPreview());
                el.dataset.eventsBound = 'true';
            }
        });
        const saveBtn = document.getElementById('saveWwanBtn');
        if (saveBtn && !saveBtn.dataset.eventsBound) {
            saveBtn.addEventListener('click', saveWwanToServer);
            saveBtn.dataset.eventsBound = 'true';
        }
        updatewwanPreview();
    }

    // ---------- 扩展坞配置 ----------
    function renderDockForm() {
        let portsHtml = '';
        if (dockConfig.ports && dockConfig.ports.length) {
            dockConfig.ports.forEach((port, idx) => {
                portsHtml += `<div class="array-item" data-port-idx="${idx}">
                    <input type="text" class="dock-port" placeholder="端口描述" value="${escapeHtml(port)}">
                    <button class="danger-btn remove-port" data-idx="${idx}" style="margin-left:8px;">删除</button>
                </div>`;
            });
        }
        return `
            <div class="section">
                <div class="section-title">扩展坞配置文件生成器</div>
                <div class="component-form-grid">
                    <div class="component-form-field full-width">
                        <input id="dock_model" placeholder="型号" value="${escapeHtml(dockConfig.model)}">
                    </div>
                    <div class="component-form-field full-width">
                        <div id="dock-ports-container">${portsHtml || '<div class="empty-battery" style="margin:8px 0;">暂无端口，点击下方添加</div>'}</div>
                        <button type="button" id="addDockPortBtn" class="add-btn" style="margin-top:8px;">+ 添加端口</button>
                    </div>
                    <div class="component-form-field">
                        <input id="dock_power" placeholder="适配器" value="${escapeHtml(dockConfig.power)}">
                    </div>
                </div>
                <button id="saveDockBtn" class="primary" style="margin-top:12px;">保存扩展坞配置到服务器</button>
            </div>
        `;
    }

    function updateDockPreview() {
        dockConfig.model = document.getElementById('dock_model')?.value || "";
        dockConfig.power = document.getElementById('dock_power')?.value || "";
        const ports = [];
        document.querySelectorAll('#generatorPage .dock-port').forEach(input => {
            if(input.value.trim()) ports.push(input.value.trim());
        });
        dockConfig.ports = ports;
        const out = { model: dockConfig.model, ports: dockConfig.ports, power: dockConfig.power };
        document.getElementById('generatorJsonPreviewMain').innerText = JSON.stringify(out, null, 2);
    }

    async function saveDockToServer() {
        updateDockPreview();
        const indexEntry = {
            file: (dockConfig.model || 'untitled') + '.json',
            name: dockConfig.model || '未命名的扩展坞'
        };
        try {
            const resp = await fetch('/api/dock/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dockDetail: dockConfig, indexEntry })
            });
            const data = await resp.json();
            if (resp.ok) {
                alert(data.message);
                await loadOptionList('dock');
                if (currentMode === 'model') renderForm();
            } else {
                alert('保存失败: ' + (data.error || ''));
            }
        } catch (e) {
            alert('无法连接到后端或后端不存在（悲');
            console.error(e);
        }
    }

    function bindDockEvents() {
        const modelInput = document.getElementById('dock_model');
        const powerInput = document.getElementById('dock_power');
        if(modelInput && !modelInput.dataset.eventsBound) {
            modelInput.addEventListener('input', () => updateDockPreview());
            modelInput.dataset.eventsBound = 'true';
        }
        if(powerInput && !powerInput.dataset.eventsBound) {
            powerInput.addEventListener('input', () => updateDockPreview());
            powerInput.dataset.eventsBound = 'true';
        }
        
        const addBtn = document.getElementById('addDockPortBtn');
        if(addBtn && !addBtn.dataset.eventsBound) {
            addBtn.addEventListener('click', () => {
                const container = document.getElementById('dock-ports-container');
                if(!container) return;
                const newItem = document.createElement('div');
                newItem.className = 'array-item';
                newItem.innerHTML = `<input type="text" class="dock-port" placeholder="端口描述"><button class="danger-btn remove-port" style="margin-left:8px;">删除</button>`;
                container.appendChild(newItem);
                const portInput = newItem.querySelector('.dock-port');
                if(portInput) portInput.addEventListener('input', () => updateDockPreview());
                const removeBtn = newItem.querySelector('.remove-port');
                if(removeBtn) {
                    removeBtn.addEventListener('click', (e) => {
                        const item = e.currentTarget.closest('.array-item');
                        if(item) item.remove();
                        if(container.querySelectorAll('.array-item').length === 0) {
                            container.innerHTML = '<div class="empty-battery" style="margin:8px 0;">暂无端口，点击下方添加</div>';
                        }
                        updateDockPreview();
                    });
                }
                const emptyDiv = container.querySelector('.empty-battery');
                if(emptyDiv) emptyDiv.remove();
                updateDockPreview();
            });
            addBtn.dataset.eventsBound = 'true';
        }
        
        document.querySelectorAll('#generatorPage .dock-port').forEach(input => {
            if(!input.dataset.eventsBound) {
                input.addEventListener('input', () => updateDockPreview());
                input.dataset.eventsBound = 'true';
            }
        });
        document.querySelectorAll('#generatorPage .remove-port').forEach(btn => {
            if(!btn.dataset.eventsBound) {
                btn.addEventListener('click', (e) => {
                    const item = e.currentTarget.closest('.array-item');
                    if(item) item.remove();
                    const container = document.getElementById('dock-ports-container');
                    if(container && container.querySelectorAll('.array-item').length === 0) {
                        container.innerHTML = '<div class="empty-battery" style="margin:8px 0;">暂无端口，点击下方添加</div>';
                    }
                    updateDockPreview();
                });
                btn.dataset.eventsBound = 'true';
            }
        });

        const saveBtn = document.getElementById('saveDockBtn');
        if (saveBtn && !saveBtn.dataset.eventsBound) {
            saveBtn.addEventListener('click', saveDockToServer);
            saveBtn.dataset.eventsBound = 'true';
        }
        
        updateDockPreview();
    }

    // ---------- 主渲染 ----------
    async function renderForm() {
        const container = document.getElementById('generatorFormPanelMain');
        if (!container) return;
        if (currentMode === 'model') {
            if (!cpuFullList.length) { container.innerHTML = '<div class="loading-spinner">加载机型数据中...</div>'; return; }
            const cpuSec = renderFilterableSection("处理器选项", cpuFullList, cpuFilterState, appState.processor_options, "cpu");
            const gpuSec = renderFilterableSection("显卡选项", gpuFullList, gpuFilterState, appState.graphics_options, "gpu");
            const baseHtml = renderModelModeForm();
            let fullHtml = baseHtml.replace('<div id="cpuFilterSection"></div>', `<div id="cpuFilterSection">${cpuSec}</div>`);
            fullHtml = fullHtml.replace('<div id="gpuFilterSection"></div>', `<div id="gpuFilterSection">${gpuSec}</div>`);
            container.innerHTML = fullHtml;
            bindFilterBars();
            bindModelListItems();
            bindModelMiscEvents();
            updateJsonPreviewModel();
        } else if (currentMode === 'cpu') {
            container.innerHTML = renderCpuForm();
            bindCpuEvents();
        } else if (currentMode === 'gpu') {
            container.innerHTML = renderGpuForm();
            bindGpuEvents();
        } else if (currentMode === 'display') {
            container.innerHTML = renderDisplayForm();
            bindDisplayEvents();
        } else if (currentMode === 'ethernet') {
            container.innerHTML = renderEthernetForm();
            bindEthernetEvents();
        } else if (currentMode === 'wifi') {
            container.innerHTML = renderWifiForm();
            bindWifiEvents();
        } else if (currentMode === 'wwan') {
            container.innerHTML = renderwwanForm();
            bindwwanEvents();
        } else if (currentMode === 'dock') {
            container.innerHTML = renderDockForm();
            bindDockEvents();
        }
    }

    // 初始化标签（生成器面板内部）
    function initGeneratorTabs() {
        document.querySelectorAll('#generatorTabBarMain .generator-tab-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const mode = btn.dataset.mode;
                currentMode = mode;
                document.querySelectorAll('#generatorTabBarMain .generator-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                await renderForm();
            });
        });
    }

    async function loadCpuIndex() {
        try {
            const resp = await fetch('/modeldata/CPU/CPU.json');
            if (!resp.ok) throw new Error();
            const data = await resp.json();
            cpuFullList = enrichItemsWithId(data).map(item => normalizeItem(item));
            cpuFilterState = adjustFilterState('cpu', { family:"all", architecture:"all", generationClass:"all", keyword:"" });
        } catch(e) { console.error("加载CPU索引失败",e); cpuFullList = []; }
    }

    async function loadGpuIndex() {
        try {
            const resp = await fetch('/modeldata/Graphics/GPU.json');
            if (!resp.ok) throw new Error();
            const data = await resp.json();
            gpuFullList = enrichItemsWithId(data).map(item => normalizeItem(item));
            gpuFilterState = adjustFilterState('gpu', { family:"all", architecture:"all", generationClass:"all", keyword:"" });
        } catch(e) { console.error("加载GPU索引失败",e); gpuFullList = []; }
    }

    async function loadOptionList(type) {
        const caps = {
            display: 'Display',
            ethernet: 'Ethernet',
            wlan: 'WLAN',
            wwan: 'WWAN',
            dock: 'Dock'
        };
        const cap = caps[type];
        if (!cap) return;
        const url = `/modeldata/${cap}/${cap}.json`;
        try {
            const resp = await fetch(url);
            if (resp.ok) {
                const data = await resp.json();
                optionLists[type] = data.map(item => {
                    const raw = typeof item === 'string' ? item : (item.model || item.name) || "";
                    return { value: raw.replace(/\.json$/i, ''), label: raw.replace(/\.json$/i, '') };
                });
            }
        } catch(e) {
            console.error(`重新加载 ${type} 列表失败`, e);
        }
    }

    async function loadOtherOptions() {
        const types = ['display', 'dock', 'ethernet', 'wlan', 'wwan'];
        const tasks = types.map(t => {
            let cap;
            if (t === 'wlan') cap = 'WLAN';
            else if (t === 'wwan') cap = 'WWAN';
            else cap = t.charAt(0).toUpperCase() + t.slice(1);
            const url = `/modeldata/${cap}/${cap}.json`;
            return (async () => {
                try {
                    const resp = await fetch(url);
                    if (resp.ok) {
                        const data = await resp.json();
                        return {
                            key: t,
                            data: data.map(item => {
                                const raw = typeof item === 'string' ? item : (item.model || item.name) || "";
                                return { value: raw.replace(/\.json$/i, ''), label: raw.replace(/\.json$/i, '') };
                            })
                        };
                    } else {
                        return { key: t, data: [] };
                    }
                } catch(e) {
                    return { key: t, data: [] };
                }
            })();
        });

        const results = await asyncPool(MAX_CONCURRENT, tasks, task => task);
        results.forEach(({key, data}) => {
            optionLists[key] = data;
        });
    }

    function resetAll() {
        if(confirm('重置当前模式的所有数据？')) {
            if(currentMode === 'model') renderForm(); // 不刷新整个页面，而是重新渲染模型表单（重新加载数据）
            else if(currentMode === 'cpu') {
                cpuConfig = { model:"", cores_threads:"", base_freq:"", turbo_freq:"", cache:"", graphics:"", iconfamily:"", ark:"" };
                cpuIconSelected = "";
                renderForm();
            } else if(currentMode === 'gpu') {
                gpuConfig = { model:"", Shading_Units:"", base_freq:"", turbo_freq:"", VRAM:"", Generation:"", Feature:"", iconfamily:"" };
                gpuIconSelected = "";
                renderForm();
            } else if(currentMode === 'display') {
                displayConfig = { type:"", tech:"", brightness:"", contrast:"", viewing_angle:"", color_gamut:"", refresh_rate:"", FRUs:[] };
                renderForm();
            } else if(currentMode === 'ethernet') {
                ethernetConfig = { type:"", model_type:"" };
                renderForm();
            } else if(currentMode === 'wifi') {
                wifiConfig = { type:"", form:"", feature:"" };
                renderForm();
            } else if(currentMode === 'wwan') {
                wwanConfig = { type:"", form:"", feature:"" };
                renderForm();
            } else if(currentMode === 'dock') {
                dockConfig = { model:"", ports:[], power:"" };
                renderForm();
            }
        }
    }

    function copyJson() { 
        navigator.clipboard.writeText(document.getElementById('generatorJsonPreviewMain').innerText).then(()=>alert('已复制')).catch(()=>alert('失败')); 
    }
    
    function exportJson() {
        const content = document.getElementById('generatorJsonPreviewMain').innerText;
        if (!content || content === 'null') { alert('没有可导出的内容'); return; }
        let filename = 'config.json';
        if (currentMode === 'model') {
            const id = document.getElementById('f_id')?.value.trim();
            filename = (id ? id : 'thinkpad') + '_config.json';
        } else if (currentMode === 'cpu') {
            let name = cpuConfig.model.trim();
            filename = (name ? name.replace(/[<>:"/\\|?*]/g, '_') : 'cpu') + '.json';
        } else if (currentMode === 'gpu') {
            let name = gpuConfig.model.trim();
            filename = (name ? name.replace(/[<>:"/\\|?*]/g, '_') : 'gpu') + '.json';
        } else if (currentMode === 'display') {
            let name = displayConfig.type.trim();
            filename = (name ? name.replace(/[<>:"/\\|?*]/g, '_') : 'display') + '.json';
        } else if (currentMode === 'ethernet') {
            let name = ethernetConfig.type.trim();
            filename = (name ? name.replace(/[<>:"/\\|?*]/g, '_') : 'ethernet') + '.json';
        } else if (currentMode === 'wifi') {
            let name = wifiConfig.type.trim();
            filename = (name ? name.replace(/[<>:"/\\|?*]/g, '_') : 'wifi') + '.json';
        } else if (currentMode === 'wwan') {
            let name = wwanConfig.type.trim();
            filename = (name ? name.replace(/[<>:"/\\|?*]/g, '_') : 'wwan') + '.json';
        } else if (currentMode === 'dock') {
            let name = dockConfig.model.trim();
            filename = (name ? name.replace(/[<>:"/\\|?*]/g, '_') : 'dock') + '.json';
        }
        const blob = new Blob([content], {type:'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    // 初始化入口
    function initGenerator() {
        if (initGenerator._initialized) return;
        initGenerator._initialized = true;

        // 绑定标签切换（使用生成器内部的标签栏）
        initGeneratorTabs();

        // 绑定重置/复制/导出按钮
        document.getElementById('generatorResetBtn')?.addEventListener('click', resetAll);
        document.getElementById('generatorCopyBtn')?.addEventListener('click', copyJson);
        document.getElementById('generatorExportBtn')?.addEventListener('click', exportJson);

        // 加载数据并渲染默认模式
        loadDataAndRender();
    }

    async function loadDataAndRender() {
        try {
            await Promise.all([loadCpuIndex(), loadGpuIndex(), loadOtherOptions()]);
        } catch (e) {
            console.error('加载生成器数据失败:', e);
        }
        await renderForm();
    }

    // 暴露到全局
    window.initGenerator = initGenerator;
})();