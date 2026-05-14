(function() {
    var currentMode = "model";
    var appState = {
        processor_options: [],
        graphics_options: [],
        display_options: [],
        dock_support: [],
        Ethernet: [],
        WLAN: [],
        WWAN: []
    };
    var cpuConfig = {
        model: "", cores_threads: "", base_freq: "", turbo_freq: "", ext_freq: "", cache: "", graphics: "", iconfamily: "", ark: ""
    };
    var gpuConfig = {
        model: "", Shading_Units: "", base_freq: "", turbo_freq: "", VRAM: "", Generation: "", Feature: "", iconfamily: ""
    };
    var displayConfig = {
        type: "", tech: "", brightness: "", contrast: "", viewing_angle: "", color_gamut: "", refresh_rate: "", FRUs: []
    };
    var ethernetConfig = { type: "", model_type: "" };
    var wifiConfig = { type: "", form: "", feature: "" };
    var wwanConfig = { type: "", form: "", feature: "" };
    var dockConfig = { model: "", ports: [], power: "" };
    var cpuIconSelected = cpuConfig.iconfamily;
    var gpuIconSelected = gpuConfig.iconfamily;
    var cpuFullList = [];
    var gpuFullList = [];
    var optionLists = { display: [], dock: [], ethernet: [], wlan: [], wwan: [] };
    var cpuFilterState = { family: "all", architecture: "all", generationClass: "all", keyword: "" };
    var gpuFilterState = { family: "all", architecture: "all", generationClass: "all", keyword: "" };
    var MAX_CONCURRENT = 6;

    function detectProtocolAndSetConcurrency() {
        try {
            var navEntry = performance.getEntriesByType('navigation')[0];
            if (navEntry && navEntry.nextHopProtocol) {
                var protocol = navEntry.nextHopProtocol;
                if (protocol === 'h2' || protocol === 'h3') MAX_CONCURRENT = 20;
            }
        } catch(e) {}
    }
    if (document.readyState === 'complete') detectProtocolAndSetConcurrency();
    else window.addEventListener('load', detectProtocolAndSetConcurrency);

    function asyncPool(concurrency, iterable, iteratorFn) {
        var ret = [];
        var executing = new Set();
        function run(item) {
            var p = Promise.resolve().then(function() { return iteratorFn(item); });
            ret.push(p);
            executing.add(p);
            var clean = function() { executing.delete(p); };
            p.then(clean).catch(clean);
            if (executing.size >= concurrency) return Promise.race(executing);
            return p;
        }
        return iterable.reduce(function(promise, item) {
            return promise.then(function() { return run(item); });
        }, Promise.resolve()).then(function() { return Promise.all(ret); });
    }

    function escapeHtml(str) {
        if (!str) return "";
        return String(str).replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

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
            id: item.id || (item.file || "").replace(/\.json$/i, ''),
            name: safeString(item.name),
            family: safeString(item.family),
            Architecture: safeString(item.Architecture),
            generation: safeString(item.generation)
        };
    }

    function enrichItemsWithId(list) {
        if (!list) return [];
        for (var i = 0; i < list.length; i++) {
            if (!list[i].id) list[i].id = (list[i].file || "").replace(/\.json$/i, '');
        }
        return list;
    }

    function getAvailableValuesForField(listType, state, field) {
        var full = listType === 'cpu' ? cpuFullList : gpuFullList;
        if (!full || !full.length) return [];
        var filtered = full.slice();
        if (field !== 'family' && state.family !== 'all') {
            filtered = filtered.filter(function(i) { return i.family === state.family; });
        }
        if (field !== 'architecture' && state.architecture !== 'all') {
            filtered = filtered.filter(function(i) { return i.Architecture === state.architecture; });
        }
        if (field !== 'generationClass' && state.generationClass !== 'all') {
            filtered = filtered.filter(function(i) {
                var parts = (i.generation || "").split(/[,，]+/).map(function(p){ return p.trim(); });
                return parts.indexOf(state.generationClass) !== -1;
            });
        }
        if (field === 'family') {
            var families = [];
            for (var i = 0; i < filtered.length; i++) {
                if (filtered[i].family && families.indexOf(filtered[i].family) === -1) families.push(filtered[i].family);
            }
            return families.sort();
        }
        if (field === 'architecture') {
            var archs = [];
            for (var i = 0; i < filtered.length; i++) {
                var a = filtered[i].Architecture;
                if (a && a !== "N/A" && archs.indexOf(a) === -1) archs.push(a);
            }
            return archs.sort();
        }
        if (field === 'generationClass') {
            var set = {};
            for (var i = 0; i < filtered.length; i++) {
                if (filtered[i].generation && filtered[i].generation !== "N/A") {
                    var parts = filtered[i].generation.split(/[,，]+/);
                    for (var j = 0; j < parts.length; j++) {
                        var g = parts[j].trim();
                        if (g) set[g] = true;
                    }
                }
            }
            return Object.keys(set).sort();
        }
        return [];
    }

    function adjustFilterState(listType, partial) {
        var cur = listType === 'cpu' ? cpuFilterState : gpuFilterState;
        var merged = {
            family: partial.family !== undefined ? partial.family : cur.family,
            architecture: partial.architecture !== undefined ? partial.architecture : cur.architecture,
            generationClass: partial.generationClass !== undefined ? partial.generationClass : cur.generationClass,
            keyword: partial.keyword !== undefined ? partial.keyword : cur.keyword
        };
        var validFam = getAvailableValuesForField(listType, merged, 'family');
        if (merged.family !== 'all' && validFam.indexOf(merged.family) === -1) merged.family = 'all';
        var validArch = getAvailableValuesForField(listType, merged, 'architecture');
        if (merged.architecture !== 'all' && validArch.indexOf(merged.architecture) === -1) merged.architecture = 'all';
        var validGen = getAvailableValuesForField(listType, merged, 'generationClass');
        if (merged.generationClass !== 'all' && validGen.indexOf(merged.generationClass) === -1) merged.generationClass = 'all';
        return merged;
    }

    function filterListByState(full, state) {
        return full.filter(function(item) {
            if (state.family !== "all" && item.family !== state.family) return false;
            if (state.architecture !== "all" && item.Architecture !== state.architecture) return false;
            if (state.generationClass !== "all") {
                var parts = (item.generation || "").split(/[,，]+/).map(function(p){ return p.trim(); });
                if (parts.indexOf(state.generationClass) === -1) return false;
            }
            if (state.keyword.trim()) {
                var kw = state.keyword.trim().toLowerCase();
                if (!(item.name || "").toLowerCase().includes(kw) && !(item.family || "").toLowerCase().includes(kw)) return false;
            }
            return true;
        });
    }

    function renderFilterableSection(title, fullList, filterState, selectedIds, listType) {
        if (!fullList || !fullList.length) return '<div class="section"><div class="section-title">' + title + '</div><div class="helper-text">加载中...</div></div>';
        var families = getAvailableValuesForField(listType, filterState, 'family');
        var archs = getAvailableValuesForField(listType, filterState, 'architecture');
        var gens = getAvailableValuesForField(listType, filterState, 'generationClass');
        var familiesOpt = '<option value="all">全部厂商</option>';
        for (var i = 0; i < families.length; i++) {
            familiesOpt += '<option value="' + escapeHtml(families[i]) + '" ' + (filterState.family === families[i] ? 'selected' : '') + '>' + escapeHtml(families[i]) + '</option>';
        }
        var archOpt = '<option value="all">全部架构</option>';
        for (var i = 0; i < archs.length; i++) {
            archOpt += '<option value="' + escapeHtml(archs[i]) + '" ' + (filterState.architecture === archs[i] ? 'selected' : '') + '>' + escapeHtml(archs[i]) + '</option>';
        }
        var genOpt = '<option value="all">全部代分类</option>';
        for (var i = 0; i < gens.length; i++) {
            genOpt += '<option value="' + escapeHtml(gens[i]) + '" ' + (filterState.generationClass === gens[i] ? 'selected' : '') + '>' + escapeHtml(gens[i]) + '</option>';
        }
        var filtered = filterListByState(fullList, filterState);
        var listHtml = '<div class="list-container" data-list-type="' + listType + '">';
        for (var i = 0; i < filtered.length; i++) {
            var item = filtered[i];
            var checked = selectedIds.indexOf(item.id) !== -1;
            var displayName = escapeHtml(safeString(item.name));
            var displayFamily = escapeHtml(safeString(item.family));
            var displayArch = escapeHtml(safeString(item.Architecture));
            var displayGen = escapeHtml(safeString(item.generation));
            listHtml += '<div class="list-item ' + (checked ? 'selected' : '') + '" data-item-id="' + escapeHtml(item.id) + '" data-list-type="' + listType + '">' +
                        '<input type="checkbox" ' + (checked ? 'checked' : '') + '>' +
                        '<div class="item-info">' +
                        '<div class="item-name">' + displayName + '</div>' +
                        '<div class="item-meta">' +
                        '<span>' + displayFamily + '</span>' +
                        '<span>' + displayArch + '</span>' +
                        '<span>' + displayGen + '</span>' +
                        '</div></div></div>';
        }
        listHtml += '</div><div class="badge-count">已选 ' + selectedIds.length + ' 项 | 当前筛选 ' + filtered.length + ' 款</div>';
        return '<div class="section"><div class="section-title">' + title + ' </div>' +
               '<div class="filter-bar" data-filter-type="' + listType + '">' +
               '<div class="filter-group"><label>厂商</label><select class="filter-family">' + familiesOpt + '</select></div>' +
               '<div class="filter-group"><label>架构</label><select class="filter-arch">' + archOpt + '</select></div>' +
               '<div class="filter-group"><label>代分类</label><select class="filter-gen">' + genOpt + '</select></div>' +
               '<div class="filter-group"><label>搜索</label><input type="text" class="filter-keyword" value="' + escapeHtml(filterState.keyword) + '"></div>' +
               '<div class="filter-actions"><button class="reset-filters-btn small-reset">重置筛选</button></div>' +
               '</div>' + listHtml + '</div>';
    }

    function bindFilterBars() {
        var bars = document.querySelectorAll('#generatorPage .filter-bar');
        for (var i = 0; i < bars.length; i++) {
            var bar = bars[i];
            if (bar.dataset.eventsBound === 'true') continue;
            var type = bar.dataset.filterType;
            var family = bar.querySelector('.filter-family');
            var arch = bar.querySelector('.filter-arch');
            var gen = bar.querySelector('.filter-gen');
            var kw = bar.querySelector('.filter-keyword');
            var reset = bar.querySelector('.reset-filters-btn');
            var update = function() {
                var partial = {
                    family: family ? family.value : "all",
                    architecture: arch ? arch.value : "all",
                    generationClass: gen ? gen.value : "all",
                    keyword: kw ? kw.value : ""
                };
                if (type === 'cpu') {
                    cpuFilterState = adjustFilterState('cpu', partial);
                    var cpuSec = renderFilterableSection("处理器选项", cpuFullList, cpuFilterState, appState.processor_options, "cpu");
                    document.getElementById('cpuFilterSection').innerHTML = cpuSec;
                } else if (type === 'gpu') {
                    gpuFilterState = adjustFilterState('gpu', partial);
                    var gpuSec = renderFilterableSection("显卡选项", gpuFullList, gpuFilterState, appState.graphics_options, "gpu");
                    document.getElementById('gpuFilterSection').innerHTML = gpuSec;
                }
                bindFilterBars();
                bindModelListItems();
                updateJsonPreviewModel();
            };
            if (family) family.addEventListener('change', update);
            if (arch) arch.addEventListener('change', update);
            if (gen) gen.addEventListener('change', update);
            if (kw) kw.addEventListener('input', update);
            if (reset) {
                reset.addEventListener('click', function() {
                    var resetState = { family:"all", architecture:"all", generationClass:"all", keyword:"" };
                    if (type === 'cpu') {
                        cpuFilterState = adjustFilterState('cpu', resetState);
                        var cpuSec = renderFilterableSection("处理器选项", cpuFullList, cpuFilterState, appState.processor_options, "cpu");
                        document.getElementById('cpuFilterSection').innerHTML = cpuSec;
                    } else if (type === 'gpu') {
                        gpuFilterState = adjustFilterState('gpu', resetState);
                        var gpuSec = renderFilterableSection("显卡选项", gpuFullList, gpuFilterState, appState.graphics_options, "gpu");
                        document.getElementById('gpuFilterSection').innerHTML = gpuSec;
                    }
                    bindFilterBars();
                    bindModelListItems();
                    updateJsonPreviewModel();
                });
            }
            bar.dataset.eventsBound = 'true';
        }
    }

    function bindModelListItems() {
        var items = document.querySelectorAll('#generatorPage .list-item[data-list-type]');
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (item.dataset.eventsBound === 'true') continue;
            item.addEventListener('click', function(e) {
                if (e.target.tagName === 'INPUT') return;
                var type = this.dataset.listType;
                var id = this.dataset.itemId;
                if (!type || !id) return;
                var arr = type === 'cpu' ? appState.processor_options : appState.graphics_options;
                var idx = arr.indexOf(id);
                if (idx === -1) arr.push(id);
                else arr.splice(idx, 1);
                var isSelected = arr.indexOf(id) !== -1;
                if (isSelected) this.classList.add('selected');
                else this.classList.remove('selected');
                var cb = this.querySelector('input[type="checkbox"]');
                if (cb) cb.checked = isSelected;
                updateJsonPreviewModel();
            });
            item.dataset.eventsBound = 'true';
        }
    }

    function renderChipGrid(options, selected, typeKey) {
        if (!options.length) return '<div>加载中...</div>';
        var html = '<div class="chip-grid">';
        for (var i = 0; i < options.length; i++) {
            var opt = options[i];
            var isSelected = selected.indexOf(opt.value) !== -1;
            html += '<div class="chip-card ' + (isSelected ? 'selected' : '') + '" data-type="' + typeKey + '" data-value="' + opt.value + '">' +
                    '<input type="checkbox" ' + (isSelected ? 'checked' : '') + '><span>' + escapeHtml(opt.label) + '</span></div>';
        }
        html += '</div><div class="badge-count">已选 ' + selected.length + ' 项</div>';
        return html;
    }

    function renderBatterySection(batteries) {
        var html = '';
        for (var idx = 0; idx < batteries.length; idx++) {
            var b = batteries[idx];
            html += '<div class="battery-item" data-battery-idx="' + idx + '">' +
                    '<div class="battery-item-header"><span>电池 ' + (idx+1) + '</span><button class="danger-btn remove-battery" data-remove-idx="' + idx + '">删除</button></div>' +
                    '<div class="battery-fields">' +
                    '<input class="battery-type" placeholder="类型" value="' + escapeHtml(b.type||'') + '">' +
                    '<input class="battery-capacity" placeholder="容量" value="' + escapeHtml(b.capacity||'') + '">' +
                    '<input class="battery-tech" placeholder="技术" value="' + escapeHtml(b.tech||'') + '">' +
                    '<input class="battery-form" placeholder="形态" value="' + escapeHtml(b.form||'') + '">' +
                    '</div></div>';
        }
        return html;
    }

    function renderTextArrayField(id, label, arr) {
        return '<div class="field-group"><label>' + label + '</label><textarea id="' + id + '" rows="3" placeholder="' + label + '">' + escapeHtml(arr.join('\n')) + '</textarea></div>';
    }

    function buildModelObject() {
        function get(id) { var el = document.getElementById(id); return el ? el.value : ""; }
        var identity = {
            id: get('f_id'),
            model_name: get('f_modelName'),
            model_family: get('f_modelFamily'),
            model_generation: get('f_modelGen'),
            update_date: get('f_update'),
            model_code: get('f_modelCode').split(/[,，]+/).map(function(s){ return s.trim(); }).filter(Boolean)
        };
        var max_resolution = {
            mini_dp: get('disp_minidp'),
            hdmi: get('disp_hdmi'),
            usb_c_tbt: get('disp_usbc')
        };
        var memory = {
            max_capacity: get('mem_max'),
            type: get('mem_type'),
            slots: get('mem_slots'),
            features: get('mem_features')
        };
        var storage = {
            ssd_sata: get('st_sata'),
            ssd_pcie: get('st_pcie'),
            hdd: get('st_hdd'),
            sshd: get('st_sshd'),
            emmc: get('st_emmc'),
            optical: get('st_optical'),
            floppy: get('st_floppy'),
            optane: get('st_optane')
        };
        var simVal = get('sim_type');
        var SIM_Card = simVal ? [{ type: simVal }] : [];
        var btType = get('bt_type');
        var btFeature = get('bt_feature');
        var Bluetooth = btType ? [{ type: btType, feature: btFeature, form: "" }] : [];
        function toArray(id) { return get(id).split('\n').filter(function(l){ return l.trim(); }); }
        var ports = toArray('ports_area');
        var ACadapter = toArray('ac_adapter');
        var camera = toArray('camera_area');
        var audio = toArray('audio_area');
        var keyboard = toArray('keyboard_area');
        var security = toArray('security_area');
        var system = toArray('system_area');
        var PSREF_link = toArray('psref_link');
        var HMM_link = toArray('hmm_link');
        var user_guide_link = toArray('user_guide');
        var add_on_tips = toArray('add_tips');
        var secret_tips = toArray('secret_tips');
        var physical = {
            dimensions: get('phy_dim'),
            weight: get('phy_weight'),
            case_material: get('phy_material')
        };
        var Battary = [];
        var batteryItems = document.querySelectorAll('#generatorPage .battery-item');
        for (var i = 0; i < batteryItems.length; i++) {
            var el = batteryItems[i];
            Battary.push({
                type: el.querySelector('.battery-type') ? el.querySelector('.battery-type').value : '',
                capacity: el.querySelector('.battery-capacity') ? el.querySelector('.battery-capacity').value : '',
                tech: el.querySelector('.battery-tech') ? el.querySelector('.battery-tech').value : '',
                form: el.querySelector('.battery-form') ? el.querySelector('.battery-form').value : ''
            });
        }
        return {
            id: identity.id,
            model_name: identity.model_name,
            model_family: identity.model_family,
            model_generation: identity.model_generation,
            update_date: identity.update_date,
            model_code: identity.model_code,
            processor_options: appState.processor_options,
            graphics_options: appState.graphics_options,
            display_options: appState.display_options,
            dock_support: appState.dock_support,
            Ethernet: appState.Ethernet,
            WLAN: appState.WLAN,
            WWAN: appState.WWAN,
            Display: { max_resolution: max_resolution, multi_display: get('disp_multi') },
            memory: memory,
            storage: storage,
            SIM_Card: SIM_Card,
            Bluetooth: Bluetooth,
            Battary: Battary,
            ACadapter: ACadapter,
            ports: ports,
            camera: camera,
            audio: audio,
            keyboard: keyboard,
            security: security,
            system: system,
            physical: physical,
            PSREF_link: PSREF_link,
            HMM_link: HMM_link,
            user_guide_link: user_guide_link,
            add_on_tips: add_on_tips,
            secret_tips: secret_tips
        };
    }

    function updateJsonPreviewModel() {
        var output = buildModelObject();
        document.getElementById('generatorJsonPreviewMain').innerText = JSON.stringify(output, null, 2);
    }

    function renderModelModeForm() {
        return '<div class="section"><div class="section-title">基础标识</div><div class="row-2col">' +
               '<input id="f_id" placeholder="ID"><input id="f_modelName" placeholder="型号名称">' +
               '<input id="f_modelFamily" placeholder="产品家族"><input id="f_modelGen" placeholder="世代标记">' +
               '<input id="f_update" placeholder="更新日期"><input id="f_modelCode" placeholder="型号代码(逗号分隔)">' +
               '</div></div>' +
               '<div id="cpuFilterSection"></div>' +
               '<div id="gpuFilterSection"></div>' +
               '<div class="section"><div class="section-title">屏幕</div>' + renderChipGrid(optionLists.display, appState.display_options, 'display_options') + '</div>' +
               '<div class="section"><div class="section-title">显示输出</div><div class="row-2col">' +
               '<input id="disp_minidp" placeholder="Mini DP分辨率"><input id="disp_hdmi" placeholder="HDMI分辨率">' +
               '<input id="disp_usbc" placeholder="USB-C分辨率"><input id="disp_multi" placeholder="多屏描述"></div></div>' +
               '<div class="section"><div class="section-title">内存</div><div class="row-2col">' +
               '<input id="mem_max" placeholder="最大容量"><input id="mem_type" placeholder="类型">' +
               '<input id="mem_slots" placeholder="插槽"><input id="mem_features" placeholder="特性"></div></div>' +
               '<div class="section"><div class="section-title">存储</div><div class="row-2col">' +
               '<input id="st_sata" placeholder="SATA SSD"><input id="st_pcie" placeholder="PCIe SSD">' +
               '<input id="st_hdd" placeholder="HDD"><input id="st_sshd" placeholder="SSHD">' +
               '<input id="st_emmc" placeholder="eMMC"><input id="st_optical" placeholder="光驱">' +
               '<input id="st_floppy" placeholder="软盘"><input id="st_optane" placeholder="傲腾"></div></div>' +
               '<div class="section"><div class="section-title">SIM与蓝牙</div><div class="row-2col">' +
               '<input id="sim_type" placeholder="SIM卡槽"><input id="bt_type" placeholder="蓝牙类型">' +
               '<input id="bt_feature" placeholder="蓝牙特性"></div></div>' +
               '<div class="section"><div class="section-title">电池</div><div id="battery-list-container">' + renderBatterySection([]) + '</div><button id="addBatteryBtn" class="add-btn">+ 添加电池</button></div>' +
               renderTextArrayField('ports_area','接口列表',[]) +
               renderTextArrayField('ac_adapter','电源适配器',[]) +
               renderTextArrayField('camera_area','摄像头',[]) +
               renderTextArrayField('audio_area','音频',[]) +
               renderTextArrayField('keyboard_area','键盘',[]) +
               renderTextArrayField('security_area','安全',[]) +
               renderTextArrayField('system_area','操作系统',[]) +
               '<div class="section"><div class="section-title">物理规格</div><div class="row-2col">' +
               '<input id="phy_dim" placeholder="尺寸"><input id="phy_weight" placeholder="重量"><input id="phy_material" placeholder="材质"></div></div>' +
               '<div class="section"><div class="section-title">网络连接</div>' +
               renderChipGrid(optionLists.dock, appState.dock_support, 'dock_support') +
               renderChipGrid(optionLists.ethernet, appState.Ethernet, 'Ethernet') +
               renderChipGrid(optionLists.wlan, appState.WLAN, 'WLAN') +
               renderChipGrid(optionLists.wwan, appState.WWAN, 'WWAN') + '</div>' +
               renderTextArrayField('psref_link','PSREF链接',[]) +
               renderTextArrayField('hmm_link','HMM链接',[]) +
               renderTextArrayField('user_guide','用户指南',[]) +
               renderTextArrayField('add_tips','附加提示',[]) +
               renderTextArrayField('secret_tips','内部提示',[]) +
               '<div class="section"><button id="saveModelBtn" class="primary">保存机型配置到服务器</button></div>';
    }

    function saveModelToServer() {
        var modelDetail = buildModelObject();
        var indexEntry = {
            file: (modelDetail.id || 'unknown') + '.json',
            name: modelDetail.model_name || '未命名机型',
            family: modelDetail.model_family || '',
            generation: modelDetail.model_generation || ''
        };
        fetch('/api/model/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modelDetail: modelDetail, indexEntry: indexEntry })
        }).then(function(resp) { return resp.json(); }).then(function(data) {
            if (resp.ok) alert(data.message);
            else alert('保存失败: ' + (data.error || ''));
        }).catch(function(e) {
            alert('无法连接到后端或后端不存在（悲');
            console.error(e);
        });
    }

    function bindModelMiscEvents() {
        var addBtn = document.getElementById('addBatteryBtn');
        if (addBtn && !addBtn.dataset.eventsBound) {
            addBtn.addEventListener('click', function() {
                var container = document.getElementById('battery-list-container');
                if (!container) return;
                var newIdx = document.querySelectorAll('#generatorPage .battery-item').length;
                var newItem = document.createElement('div');
                newItem.className = 'battery-item';
                newItem.setAttribute('data-battery-idx', newIdx);
                newItem.innerHTML = '<div class="battery-item-header"><span>电池 ' + (newIdx+1) + '</span><button class="danger-btn remove-battery" data-remove-idx="' + newIdx + '">删除</button></div>' +
                                   '<div class="battery-fields">' +
                                   '<input class="battery-type" placeholder="类型">' +
                                   '<input class="battery-capacity" placeholder="容量">' +
                                   '<input class="battery-tech" placeholder="技术">' +
                                   '<input class="battery-form" placeholder="形态">' +
                                   '</div>';
                container.appendChild(newItem);
                attachBatteryRemoveEvents();
                updateJsonPreviewModel();
            });
            addBtn.dataset.eventsBound = 'true';
        }
        function attachBatteryRemoveEvents() {
            var btns = document.querySelectorAll('#generatorPage .remove-battery');
            for (var i = 0; i < btns.length; i++) {
                var btn = btns[i];
                if (btn.dataset.eventsBound) continue;
                btn.addEventListener('click', function(e) {
                    var idx = parseInt(e.currentTarget.dataset.removeIdx, 10);
                    if (!isNaN(idx)) {
                        var item = e.currentTarget.closest('.battery-item');
                        if (item) item.remove();
                        var items = document.querySelectorAll('#generatorPage .battery-item');
                        for (var j = 0; j < items.length; j++) {
                            items[j].setAttribute('data-battery-idx', j);
                            var headerSpan = items[j].querySelector('.battery-item-header span');
                            if (headerSpan) headerSpan.textContent = '电池 ' + (j+1);
                            var delBtn = items[j].querySelector('.remove-battery');
                            if (delBtn) delBtn.setAttribute('data-remove-idx', j);
                        }
                        updateJsonPreviewModel();
                    }
                });
                btn.dataset.eventsBound = 'true';
            }
        }
        attachBatteryRemoveEvents();
        var inputs = document.querySelectorAll('#generatorPage input, #generatorPage textarea, #generatorPage select');
        for (var i = 0; i < inputs.length; i++) {
            var el = inputs[i];
            if (el.id && el.id.indexOf('filter') === -1 && !el.dataset.eventsBound) {
                el.addEventListener('input', function() { updateJsonPreviewModel(); });
                el.dataset.eventsBound = 'true';
            }
        }
        var chipCards = document.querySelectorAll('#generatorPage .chip-card');
        for (var i = 0; i < chipCards.length; i++) {
            var card = chipCards[i];
            if (card.dataset.eventsBound) continue;
            card.addEventListener('click', function(e) {
                var type = this.dataset.type;
                var val = this.dataset.value;
                if (!type || !val) return;
                if (!appState.hasOwnProperty(type)) return;
                var idx = appState[type].indexOf(val);
                if (idx === -1) appState[type].push(val);
                else appState[type].splice(idx, 1);
                if (this.classList.contains('selected')) this.classList.remove('selected');
                else this.classList.add('selected');
                var cb = this.querySelector('input[type="checkbox"]');
                if (cb) cb.checked = !cb.checked;
                updateJsonPreviewModel();
            });
            card.dataset.eventsBound = 'true';
        }
        var saveBtn = document.getElementById('saveModelBtn');
        if (saveBtn && !saveBtn.dataset.eventsBound) {
            saveBtn.addEventListener('click', saveModelToServer);
            saveBtn.dataset.eventsBound = 'true';
        }
    }

    function renderCpuForm() {
        return '<div class="section"><div class="section-title">CPU 配置文件生成器</div><div class="component-form-grid">' +
               '<div class="component-form-field full-width"><input id="cpu_model" placeholder="型号（同时也是文件名）" value="' + escapeHtml(cpuConfig.model) + '"></div>' +
               '<div class="component-form-field"><input id="cpu_cores" placeholder="核心/线程数" value="' + escapeHtml(cpuConfig.cores_threads) + '"></div>' +
               '<div class="component-form-field"><input id="cpu_base" placeholder="基础频率" value="' + escapeHtml(cpuConfig.base_freq) + '"></div>' +
               '<div class="component-form-field"><input id="cpu_turbo" placeholder="加速频率" value="' + escapeHtml(cpuConfig.turbo_freq) + '"></div>' +
               '<div class="component-form-field"><input id="cpu_ext" placeholder="外频" value="' + escapeHtml(cpuConfig.ext_freq) + '"></div>' +
               '<div class="component-form-field"><input id="cpu_cache" placeholder="缓存" value="' + escapeHtml(cpuConfig.cache) + '"></div>' +
               '<div class="component-form-field"><input id="cpu_graphics" placeholder="图形处理器" value="' + escapeHtml(cpuConfig.graphics) + '"></div>' +
               '<div class="component-form-field"><button type="button" id="cpu_iconfamily_btn" style="width:100%; padding:10px 14px; border:1px solid var(--border-light); border-radius:12px; background:var(--bg-panel); color:var(--text-primary); cursor:pointer; text-align:left; font-size:0.85rem;"><span id="cpu_icon_label">' + (cpuConfig.iconfamily ? cpuConfig.iconfamily : '点击选择图标') + '</span></button><input type="hidden" id="cpu_iconfamily_hidden" value="' + escapeHtml(cpuConfig.iconfamily) + '"></div>' +
               '<div class="component-form-field full-width"><input id="cpu_ark" placeholder="ark" value="' + escapeHtml(cpuConfig.ark) + '"></div>' +
               '</div><hr><div class="section-title" style="margin-top:12px;">索引元数据（用于更新 CPU.json 索引）</div>' +
               '<div class="row-2col"><div class="component-form-field"><input id="cpu_idx_family" placeholder="家族 (family)" value=""></div>' +
               '<div class="component-form-field"><input id="cpu_idx_arch" placeholder="架构 (Architecture)" value=""></div>' +
               '<div class="component-form-field"><input id="cpu_idx_gen" placeholder="代分类 (generation)" value=""></div></div>' +
               '<button id="addToCpuIndexBtn" class="primary" style="margin-top:12px;">将此 CPU 加入索引并导出</button></div>';
    }

    function updateCpuPreview() {
        cpuConfig.model = document.getElementById('cpu_model') ? document.getElementById('cpu_model').value : "";
        cpuConfig.cores_threads = document.getElementById('cpu_cores') ? document.getElementById('cpu_cores').value : "";
        cpuConfig.base_freq = document.getElementById('cpu_base') ? document.getElementById('cpu_base').value : "";
        cpuConfig.turbo_freq = document.getElementById('cpu_turbo') ? document.getElementById('cpu_turbo').value : "";
        cpuConfig.ext_freq = document.getElementById('cpu_ext') ? document.getElementById('cpu_ext').value : "";
        cpuConfig.cache = document.getElementById('cpu_cache') ? document.getElementById('cpu_cache').value : "";
        cpuConfig.graphics = document.getElementById('cpu_graphics') ? document.getElementById('cpu_graphics').value : "";
        var hidden = document.getElementById('cpu_iconfamily_hidden');
        cpuConfig.iconfamily = hidden ? hidden.value : cpuIconSelected;
        cpuConfig.ark = document.getElementById('cpu_ark') ? document.getElementById('cpu_ark').value : "";
        document.getElementById('generatorJsonPreviewMain').innerText = JSON.stringify(cpuConfig, null, 2);
        var labelSpan = document.getElementById('cpu_icon_label');
        if (labelSpan) labelSpan.textContent = cpuConfig.iconfamily ? cpuConfig.iconfamily : '点击选择图标';
    }

    function openIconPicker() {
        var modal = document.createElement('div');
        modal.className = 'icon-modal-overlay';
        modal.innerHTML = '<div class="icon-modal"><div class="icon-modal-header"><span class="icon-modal-title">选择 CPU 图标</span><button class="icon-close-btn">&times;</button></div><div id="icon-grid-container" style="min-height:120px; text-align:center; padding:20px; color:var(--text-muted);">加载中...</div></div>';
        document.body.appendChild(modal);
        var close = function() { modal.remove(); };
        modal.querySelector('.icon-close-btn').addEventListener('click', close);
        modal.addEventListener('click', function(e) { if (e.target === modal) close(); });
        fetch('/api/list/cpu_icons').then(function(resp) {
            if (resp.ok) return resp.json();
            else throw new Error();
        }).then(function(icons) {
            var container = document.getElementById('icon-grid-container');
            var html = '<div class="icon-grid">';
            for (var i = 0; i < icons.length; i++) {
                html += '<div class="icon-item" data-icon="' + escapeHtml(icons[i]) + '">' +
                        '<img src="/modeldata/CPU/cpu_icon/' + icons[i] + '" alt="' + icons[i] + '" loading="lazy" style="width:64px;height:64px;object-fit:contain;">' +
                        '<span>' + escapeHtml(icons[i]) + '</span></div>';
            }
            html += '</div>';
            container.innerHTML = html;
            var items = container.querySelectorAll('.icon-item');
            for (var i = 0; i < items.length; i++) {
                items[i].addEventListener('click', function() {
                    var icon = this.dataset.icon;
                    document.getElementById('cpu_iconfamily_hidden').value = icon;
                    document.getElementById('cpu_icon_label').textContent = icon;
                    cpuConfig.iconfamily = icon;
                    cpuIconSelected = icon;
                    updateCpuPreview();
                    close();
                });
            }
        }).catch(function() {
            var container = document.getElementById('icon-grid-container');
            container.innerHTML = '<p>无法加载图标列表，请手动输入文件名</p><div style="display:flex; gap:8px; margin-top:12px;">' +
                                 '<input id="icon-fallback-input" type="text" placeholder="图标文件名" value="' + escapeHtml(cpuConfig.iconfamily) + '" style="flex:1;">' +
                                 '<button id="icon-fallback-confirm" class="primary">确定</button></div>';
            document.getElementById('icon-fallback-confirm').addEventListener('click', function() {
                var val = document.getElementById('icon-fallback-input').value.trim();
                document.getElementById('cpu_iconfamily_hidden').value = val;
                document.getElementById('cpu_icon_label').textContent = val || '点击选择图标';
                cpuConfig.iconfamily = val;
                cpuIconSelected = val;
                updateCpuPreview();
                close();
            });
        });
    }

    function openGpuIconPicker() {
        var modal = document.createElement('div');
        modal.className = 'icon-modal-overlay';
        modal.innerHTML = '<div class="icon-modal"><div class="icon-modal-header"><span class="icon-modal-title">选择 GPU 图标</span><button class="icon-close-btn">&times;</button></div><div id="icon-grid-container" style="min-height:120px; text-align:center; padding:20px; color:var(--text-muted);">加载中...</div></div>';
        document.body.appendChild(modal);
        var close = function() { modal.remove(); };
        modal.querySelector('.icon-close-btn').addEventListener('click', close);
        modal.addEventListener('click', function(e) { if (e.target === modal) close(); });
        fetch('/api/list/gpu_icons').then(function(resp) {
            if (resp.ok) return resp.json();
            else throw new Error();
        }).then(function(icons) {
            var container = document.getElementById('icon-grid-container');
            var html = '<div class="icon-grid">';
            for (var i = 0; i < icons.length; i++) {
                html += '<div class="icon-item" data-icon="' + escapeHtml(icons[i]) + '">' +
                        '<img src="/modeldata/Graphics/Graphics_icons/' + icons[i] + '" alt="' + icons[i] + '" loading="lazy" style="width:64px;height:64px;object-fit:contain;">' +
                        '<span>' + escapeHtml(icons[i]) + '</span></div>';
            }
            html += '</div>';
            container.innerHTML = html;
            var items = container.querySelectorAll('.icon-item');
            for (var i = 0; i < items.length; i++) {
                items[i].addEventListener('click', function() {
                    var icon = this.dataset.icon;
                    document.getElementById('gpu_iconfamily_hidden').value = icon;
                    document.getElementById('gpu_icon_label').textContent = icon;
                    gpuConfig.iconfamily = icon;
                    gpuIconSelected = icon;
                    updateGpuPreview();
                    close();
                });
            }
        }).catch(function() {
            var container = document.getElementById('icon-grid-container');
            container.innerHTML = '<p>无法加载图标列表，请手动输入文件名</p><div style="display:flex; gap:8px; margin-top:12px;">' +
                                 '<input id="icon-fallback-input" type="text" placeholder="图标文件名" value="' + escapeHtml(gpuConfig.iconfamily) + '" style="flex:1;">' +
                                 '<button id="icon-fallback-confirm" class="primary">确定</button></div>';
            document.getElementById('icon-fallback-confirm').addEventListener('click', function() {
                var val = document.getElementById('icon-fallback-input').value.trim();
                document.getElementById('gpu_iconfamily_hidden').value = val;
                document.getElementById('gpu_icon_label').textContent = val || '点击选择图标';
                gpuConfig.iconfamily = val;
                gpuIconSelected = val;
                updateGpuPreview();
                close();
            });
        });
    }

    function bindCpuEvents() {
        var ids = ['cpu_model','cpu_cores','cpu_base','cpu_turbo','cpu_ext','cpu_cache','cpu_graphics','cpu_ark'];
        for (var i = 0; i < ids.length; i++) {
            var el = document.getElementById(ids[i]);
            if (el && !el.dataset.eventsBound) {
                el.addEventListener('input', function() { updateCpuPreview(); });
                el.dataset.eventsBound = 'true';
            }
        }
        var iconBtn = document.getElementById('cpu_iconfamily_btn');
        if (iconBtn && !iconBtn.dataset.eventsBound) {
            iconBtn.addEventListener('click', openIconPicker);
            iconBtn.dataset.eventsBound = 'true';
        }
        updateCpuPreview();
        var addBtn = document.getElementById('addToCpuIndexBtn');
        if (addBtn && !addBtn.dataset.eventsBound) {
            addBtn.addEventListener('click', function() {
                var model = document.getElementById('cpu_model') ? document.getElementById('cpu_model').value.trim() : "";
                if (!model) { alert('请先填写 CPU 型号！'); return; }
                var family = document.getElementById('cpu_idx_family') ? document.getElementById('cpu_idx_family').value.trim() || "未分类" : "未分类";
                var arch = document.getElementById('cpu_idx_arch') ? document.getElementById('cpu_idx_arch').value.trim() || "未知" : "未知";
                var gen = document.getElementById('cpu_idx_gen') ? document.getElementById('cpu_idx_gen').value.trim() || "未知" : "未知";
                var cpuDetail = {
                    model: model,
                    cores_threads: document.getElementById('cpu_cores') ? document.getElementById('cpu_cores').value : "",
                    base_freq: document.getElementById('cpu_base') ? document.getElementById('cpu_base').value : "",
                    turbo_freq: document.getElementById('cpu_turbo') ? document.getElementById('cpu_turbo').value : "",
                    ext_freq: document.getElementById('cpu_ext') ? document.getElementById('cpu_ext').value : "",
                    cache: document.getElementById('cpu_cache') ? document.getElementById('cpu_cache').value : "",
                    graphics: document.getElementById('cpu_graphics') ? document.getElementById('cpu_graphics').value : "",
                    iconfamily: document.getElementById('cpu_iconfamily_hidden') ? document.getElementById('cpu_iconfamily_hidden').value : "",
                    ark: document.getElementById('cpu_ark') ? document.getElementById('cpu_ark').value : ""
                };
                var indexEntry = { file: model + '.json', name: model, family: family, Architecture: arch, generation: gen };
                fetch('/api/cpu/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cpuDetail: cpuDetail, indexEntry: indexEntry })
                }).then(function(response) { return response.json(); }).then(function(result) {
                    if (response.ok) {
                        alert(result.message);
                        loadCpuIndex();
                        if (currentMode === 'model') renderForm();
                    } else {
                        alert('添加失败: ' + (result.error || '未知错误'));
                    }
                }).catch(function(err) {
                    alert('无法连接到后端或后端不存在（悲，请确认后端是否已启动。');
                    console.error(err);
                });
            });
            addBtn.dataset.eventsBound = 'true';
        }
    }

    function renderGpuForm() {
        return '<div class="section"><div class="section-title">GPU 配置文件生成器</div><div class="component-form-grid">' +
               '<div class="component-form-field full-width"><input id="gpu_model" placeholder="型号（同时也是文件名）" value="' + escapeHtml(gpuConfig.model) + '"></div>' +
               '<div class="component-form-field"><input id="gpu_shading" placeholder="Shading Units" value="' + escapeHtml(gpuConfig.Shading_Units) + '"></div>' +
               '<div class="component-form-field"><input id="gpu_base" placeholder="基础频率" value="' + escapeHtml(gpuConfig.base_freq) + '"></div>' +
               '<div class="component-form-field"><input id="gpu_turbo" placeholder="加速频率" value="' + escapeHtml(gpuConfig.turbo_freq) + '"></div>' +
               '<div class="component-form-field"><input id="gpu_vram" placeholder="VRAM" value="' + escapeHtml(gpuConfig.VRAM) + '"></div>' +
               '<div class="component-form-field"><input id="gpu_gen" placeholder="世代" value="' + escapeHtml(gpuConfig.Generation) + '"></div>' +
               '<div class="component-form-field"><input id="gpu_feature" placeholder="功能" value="' + escapeHtml(gpuConfig.Feature) + '"></div>' +
               '<div class="component-form-field"><button type="button" id="gpu_iconfamily_btn" style="width:100%; padding:10px 14px; border:1px solid var(--border-light); border-radius:12px; background:var(--bg-panel); color:var(--text-primary); cursor:pointer; text-align:left; font-size:0.85rem;"><span id="gpu_icon_label">' + (gpuConfig.iconfamily ? gpuConfig.iconfamily : '点击选择图标') + '</span></button><input type="hidden" id="gpu_iconfamily_hidden" value="' + escapeHtml(gpuConfig.iconfamily) + '"></div>' +
               '</div><hr><div class="section-title" style="margin-top:12px;">索引元数据（用于更新 GPU.json 索引）</div>' +
               '<div class="row-2col"><div class="component-form-field"><input id="gpu_idx_family" placeholder="家族 (family)" value=""></div>' +
               '<div class="component-form-field"><input id="gpu_idx_arch" placeholder="架构 (Architecture)" value=""></div>' +
               '<div class="component-form-field"><input id="gpu_idx_gen" placeholder="代分类 (generation)" value=""></div></div>' +
               '<button id="addToGpuIndexBtn" class="primary" style="margin-top:12px;">将此 GPU 加入索引并导出</button></div>';
    }

    function updateGpuPreview() {
        gpuConfig.model = document.getElementById('gpu_model') ? document.getElementById('gpu_model').value : "";
        gpuConfig.Shading_Units = document.getElementById('gpu_shading') ? document.getElementById('gpu_shading').value : "";
        gpuConfig.base_freq = document.getElementById('gpu_base') ? document.getElementById('gpu_base').value : "";
        gpuConfig.turbo_freq = document.getElementById('gpu_turbo') ? document.getElementById('gpu_turbo').value : "";
        gpuConfig.VRAM = document.getElementById('gpu_vram') ? document.getElementById('gpu_vram').value : "";
        gpuConfig.Generation = document.getElementById('gpu_gen') ? document.getElementById('gpu_gen').value : "";
        gpuConfig.Feature = document.getElementById('gpu_feature') ? document.getElementById('gpu_feature').value : "";
        var hidden = document.getElementById('gpu_iconfamily_hidden');
        gpuConfig.iconfamily = hidden ? hidden.value : gpuIconSelected;
        var out = { model: gpuConfig.model, "Shading Units": gpuConfig.Shading_Units, base_freq: gpuConfig.base_freq, turbo_freq: gpuConfig.turbo_freq, VRAM: gpuConfig.VRAM, Generation: gpuConfig.Generation, Feature: gpuConfig.Feature, iconfamily: gpuConfig.iconfamily };
        document.getElementById('generatorJsonPreviewMain').innerText = JSON.stringify(out, null, 2);
        var labelSpan = document.getElementById('gpu_icon_label');
        if (labelSpan) labelSpan.textContent = gpuConfig.iconfamily ? gpuConfig.iconfamily : '点击选择图标';
    }

    function bindGpuEvents() {
        var ids = ['gpu_model','gpu_shading','gpu_base','gpu_turbo','gpu_vram','gpu_gen','gpu_feature'];
        for (var i = 0; i < ids.length; i++) {
            var el = document.getElementById(ids[i]);
            if (el && !el.dataset.eventsBound) {
                el.addEventListener('input', function() { updateGpuPreview(); });
                el.dataset.eventsBound = 'true';
            }
        }
        var iconBtn = document.getElementById('gpu_iconfamily_btn');
        if (iconBtn && !iconBtn.dataset.eventsBound) {
            iconBtn.addEventListener('click', openGpuIconPicker);
            iconBtn.dataset.eventsBound = 'true';
        }
        updateGpuPreview();
        var addBtn = document.getElementById('addToGpuIndexBtn');
        if (addBtn && !addBtn.dataset.eventsBound) {
            addBtn.addEventListener('click', function() {
                var model = document.getElementById('gpu_model') ? document.getElementById('gpu_model').value.trim() : "";
                if (!model) { alert('请先填写 GPU 型号！'); return; }
                var family = document.getElementById('gpu_idx_family') ? document.getElementById('gpu_idx_family').value.trim() || "未分类" : "未分类";
                var arch = document.getElementById('gpu_idx_arch') ? document.getElementById('gpu_idx_arch').value.trim() || "未知" : "未知";
                var gen = document.getElementById('gpu_idx_gen') ? document.getElementById('gpu_idx_gen').value.trim() || "未知" : "未知";
                var gpuDetail = {
                    model: model,
                    "Shading Units": document.getElementById('gpu_shading') ? document.getElementById('gpu_shading').value : "",
                    base_freq: document.getElementById('gpu_base') ? document.getElementById('gpu_base').value : "",
                    turbo_freq: document.getElementById('gpu_turbo') ? document.getElementById('gpu_turbo').value : "",
                    VRAM: document.getElementById('gpu_vram') ? document.getElementById('gpu_vram').value : "",
                    Generation: document.getElementById('gpu_gen') ? document.getElementById('gpu_gen').value : "",
                    Feature: document.getElementById('gpu_feature') ? document.getElementById('gpu_feature').value : "",
                    iconfamily: document.getElementById('gpu_iconfamily_hidden') ? document.getElementById('gpu_iconfamily_hidden').value : ""
                };
                var indexEntry = { file: model + '.json', name: model, family: family, Architecture: arch, generation: gen };
                fetch('/api/gpu/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ gpuDetail: gpuDetail, indexEntry: indexEntry })
                }).then(function(response) { return response.json(); }).then(function(result) {
                    if (response.ok) {
                        alert(result.message);
                        loadGpuIndex();
                        if (currentMode === 'model') renderForm();
                    } else {
                        alert('添加失败: ' + (result.error || '未知错误'));
                    }
                }).catch(function(err) {
                    alert('无法连接到后端或后端不存在（悲，请确认后端是否已启动。');
                    console.error(err);
                });
            });
            addBtn.dataset.eventsBound = 'true';
        }
    }

    function renderDisplayForm() {
        var fruHtml = '';
        if (displayConfig.FRUs && displayConfig.FRUs.length) {
            for (var idx = 0; idx < displayConfig.FRUs.length; idx++) {
                var fru = displayConfig.FRUs[idx];
                var fruKey = Object.keys(fru)[0] || '';
                var panelVal = fru[fruKey] || '';
                fruHtml += '<div class="fru-item" data-fru-idx="' + idx + '">' +
                           '<input type="text" class="fru-number" placeholder="FRU 编号" value="' + escapeHtml(fruKey) + '" style="flex:1;">' +
                           '<input type="text" class="fru-panel" placeholder="面板型号" value="' + escapeHtml(panelVal) + '" style="flex:2;">' +
                           '<button class="danger-btn remove-fru" data-idx="' + idx + '">删除</button></div>';
            }
        }
        return '<div class="section"><div class="section-title">屏幕配置文件生成器</div><div class="component-form-grid">' +
               '<div class="component-form-field full-width"><input id="disp_type" placeholder="型号" value="' + escapeHtml(displayConfig.type) + '"></div>' +
               '<div class="component-form-field"><input id="disp_tech" placeholder="技术" value="' + escapeHtml(displayConfig.tech) + '"></div>' +
               '<div class="component-form-field"><input id="disp_brightness" placeholder="亮度" value="' + escapeHtml(displayConfig.brightness) + '"></div>' +
               '<div class="component-form-field"><input id="disp_contrast" placeholder="对比度" value="' + escapeHtml(displayConfig.contrast) + '"></div>' +
               '<div class="component-form-field"><input id="disp_angle" placeholder="可视角度" value="' + escapeHtml(displayConfig.viewing_angle) + '"></div>' +
               '<div class="component-form-field"><input id="disp_gamut" placeholder="色彩区域" value="' + escapeHtml(displayConfig.color_gamut) + '"></div>' +
               '<div class="component-form-field"><input id="disp_refresh" placeholder="刷新率" value="' + escapeHtml(displayConfig.refresh_rate) + '"></div>' +
               '</div><div class="section-title" style="margin-top:16px;">FRU 列表 (编号与面板型号)</div>' +
               '<div id="fru-list-container">' + (fruHtml || '<div class="empty-battery">暂无 FRU，点击下方添加</div>') + '</div>' +
               '<button type="button" id="addFruBtn" class="add-btn" style="margin-top:8px;">+ 添加 FRU</button>' +
               '<button id="saveDisplayBtn" class="primary" style="margin-top:12px;">保存屏幕配置到服务器</button></div>';
    }

    function updateDisplayPreview() {
        displayConfig.type = document.getElementById('disp_type') ? document.getElementById('disp_type').value : "";
        displayConfig.tech = document.getElementById('disp_tech') ? document.getElementById('disp_tech').value : "";
        displayConfig.brightness = document.getElementById('disp_brightness') ? document.getElementById('disp_brightness').value : "";
        displayConfig.contrast = document.getElementById('disp_contrast') ? document.getElementById('disp_contrast').value : "";
        displayConfig.viewing_angle = document.getElementById('disp_angle') ? document.getElementById('disp_angle').value : "";
        displayConfig.color_gamut = document.getElementById('disp_gamut') ? document.getElementById('disp_gamut').value : "";
        displayConfig.refresh_rate = document.getElementById('disp_refresh') ? document.getElementById('disp_refresh').value : "";
        var frus = [];
        var items = document.querySelectorAll('#generatorPage .fru-item');
        for (var i = 0; i < items.length; i++) {
            var fruNum = items[i].querySelector('.fru-number') ? items[i].querySelector('.fru-number').value.trim() : "";
            var panelModel = items[i].querySelector('.fru-panel') ? items[i].querySelector('.fru-panel').value.trim() : "";
            if (fruNum || panelModel) {
                var obj = {};
                if (fruNum) obj[fruNum] = panelModel || "";
                else if (panelModel) obj[""] = panelModel;
                if (Object.keys(obj).length) frus.push(obj);
            }
        }
        displayConfig.FRUs = frus;
        var out = { type: displayConfig.type, tech: displayConfig.tech, brightness: displayConfig.brightness, contrast: displayConfig.contrast, viewing_angle: displayConfig.viewing_angle, color_gamut: displayConfig.color_gamut, refresh_rate: displayConfig.refresh_rate, FRUs: displayConfig.FRUs };
        document.getElementById('generatorJsonPreviewMain').innerText = JSON.stringify(out, null, 2);
    }

    function saveDisplayToServer() {
        updateDisplayPreview();
        var indexEntry = { file: (displayConfig.type || 'untitled') + '.json', name: displayConfig.type || '未命名屏幕', tech: displayConfig.tech || '' };
        fetch('/api/display/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayDetail: displayConfig, indexEntry: indexEntry })
        }).then(function(resp) { return resp.json(); }).then(function(data) {
            if (resp.ok) {
                alert(data.message);
                loadOptionList('display');
                if (currentMode === 'model') renderForm();
            } else {
                alert('保存失败: ' + (data.error || ''));
            }
        }).catch(function(e) {
            alert('无法连接到后端或后端不存在（悲');
            console.error(e);
        });
    }

    function bindDisplayEvents() {
        var basicIds = ['disp_type','disp_tech','disp_brightness','disp_contrast','disp_angle','disp_gamut','disp_refresh'];
        for (var i = 0; i < basicIds.length; i++) {
            var el = document.getElementById(basicIds[i]);
            if (el && !el.dataset.eventsBound) {
                el.addEventListener('input', function() { updateDisplayPreview(); });
                el.dataset.eventsBound = 'true';
            }
        }
        var addFruBtn = document.getElementById('addFruBtn');
        if (addFruBtn && !addFruBtn.dataset.eventsBound) {
            addFruBtn.addEventListener('click', function() {
                var container = document.getElementById('fru-list-container');
                if (!container) return;
                var newItem = document.createElement('div');
                newItem.className = 'fru-item';
                newItem.innerHTML = '<input type="text" class="fru-number" placeholder="FRU 编号" style="flex:1;">' +
                                   '<input type="text" class="fru-panel" placeholder="面板型号" style="flex:2;">' +
                                   '<button class="danger-btn remove-fru">删除</button>';
                container.appendChild(newItem);
                var numInput = newItem.querySelector('.fru-number');
                var panelInput = newItem.querySelector('.fru-panel');
                if (numInput) numInput.addEventListener('input', function() { updateDisplayPreview(); });
                if (panelInput) panelInput.addEventListener('input', function() { updateDisplayPreview(); });
                var removeBtn = newItem.querySelector('.remove-fru');
                if (removeBtn) {
                    removeBtn.addEventListener('click', function(e) {
                        var item = e.currentTarget.closest('.fru-item');
                        if (item) item.remove();
                        if (container.querySelectorAll('.fru-item').length === 0) container.innerHTML = '<div class="empty-battery">暂无 FRU，点击下方添加</div>';
                        updateDisplayPreview();
                    });
                }
                var emptyDiv = container.querySelector('.empty-battery');
                if (emptyDiv) emptyDiv.remove();
                updateDisplayPreview();
            });
            addFruBtn.dataset.eventsBound = 'true';
        }
        var fruItems = document.querySelectorAll('#generatorPage .fru-item');
        for (var i = 0; i < fruItems.length; i++) {
            var item = fruItems[i];
            var numInput = item.querySelector('.fru-number');
            var panelInput = item.querySelector('.fru-panel');
            if (numInput && !numInput.dataset.eventsBound) {
                numInput.addEventListener('input', function() { updateDisplayPreview(); });
                numInput.dataset.eventsBound = 'true';
            }
            if (panelInput && !panelInput.dataset.eventsBound) {
                panelInput.addEventListener('input', function() { updateDisplayPreview(); });
                panelInput.dataset.eventsBound = 'true';
            }
            var delBtn = item.querySelector('.remove-fru');
            if (delBtn && !delBtn.dataset.eventsBound) {
                delBtn.addEventListener('click', function(e) {
                    var item = e.currentTarget.closest('.fru-item');
                    if (item) item.remove();
                    var container = document.getElementById('fru-list-container');
                    if (container && container.querySelectorAll('.fru-item').length === 0) container.innerHTML = '<div class="empty-battery">暂无 FRU，点击下方添加</div>';
                    updateDisplayPreview();
                });
                delBtn.dataset.eventsBound = 'true';
            }
        }
        var saveBtn = document.getElementById('saveDisplayBtn');
        if (saveBtn && !saveBtn.dataset.eventsBound) {
            saveBtn.addEventListener('click', saveDisplayToServer);
            saveBtn.dataset.eventsBound = 'true';
        }
        updateDisplayPreview();
    }

    function renderEthernetForm() {
        return '<div class="section"><div class="section-title">有线网卡配置文件生成器</div><div class="component-form-grid">' +
               '<div class="component-form-field full-width"><input id="eth_type" placeholder="型号" value="' + escapeHtml(ethernetConfig.type) + '"></div>' +
               '<div class="component-form-field"><input id="eth_model_type" placeholder="功能" value="' + escapeHtml(ethernetConfig.model_type) + '"></div>' +
               '</div><button id="saveEthernetBtn" class="primary" style="margin-top:12px;">保存网卡配置到服务器</button></div>';
    }

    function updateEthernetPreview() {
        ethernetConfig.type = document.getElementById('eth_type') ? document.getElementById('eth_type').value : "";
        ethernetConfig.model_type = document.getElementById('eth_model_type') ? document.getElementById('eth_model_type').value : "";
        var out = { type: ethernetConfig.type, "model-type": ethernetConfig.model_type };
        document.getElementById('generatorJsonPreviewMain').innerText = JSON.stringify(out, null, 2);
    }

    function saveEthernetToServer() {
        updateEthernetPreview();
        var indexEntry = { file: (ethernetConfig.type || 'untitled') + '.json', name: ethernetConfig.type || '未命名网卡' };
        fetch('/api/ethernet/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ethernetDetail: ethernetConfig, indexEntry: indexEntry })
        }).then(function(resp) { return resp.json(); }).then(function(data) {
            if (resp.ok) {
                alert(data.message);
                loadOptionList('ethernet');
                if (currentMode === 'model') renderForm();
            } else {
                alert('保存失败: ' + (data.error || ''));
            }
        }).catch(function(e) {
            alert('无法连接到后端或后端不存在（悲');
            console.error(e);
        });
    }

    function bindEthernetEvents() {
        var ids = ['eth_type','eth_model_type'];
        for (var i = 0; i < ids.length; i++) {
            var el = document.getElementById(ids[i]);
            if (el && !el.dataset.eventsBound) {
                el.addEventListener('input', function() { updateEthernetPreview(); });
                el.dataset.eventsBound = 'true';
            }
        }
        var saveBtn = document.getElementById('saveEthernetBtn');
        if (saveBtn && !saveBtn.dataset.eventsBound) {
            saveBtn.addEventListener('click', saveEthernetToServer);
            saveBtn.dataset.eventsBound = 'true';
        }
        updateEthernetPreview();
    }

    function renderWifiForm() {
        return '<div class="section"><div class="section-title">WiFi 配置文件生成器</div><div class="component-form-grid">' +
               '<div class="component-form-field full-width"><input id="wifi_type" placeholder="型号" value="' + escapeHtml(wifiConfig.type) + '"></div>' +
               '<div class="component-form-field"><input id="wifi_form" placeholder="接口与形态" value="' + escapeHtml(wifiConfig.form) + '"></div>' +
               '<div class="component-form-field full-width"><input id="wifi_feature" placeholder="功能" value="' + escapeHtml(wifiConfig.feature) + '"></div>' +
               '</div><button id="saveWifiBtn" class="primary" style="margin-top:12px;">保存 WiFi 配置到服务器</button></div>';
    }

    function updateWifiPreview() {
        wifiConfig.type = document.getElementById('wifi_type') ? document.getElementById('wifi_type').value : "";
        wifiConfig.form = document.getElementById('wifi_form') ? document.getElementById('wifi_form').value : "";
        wifiConfig.feature = document.getElementById('wifi_feature') ? document.getElementById('wifi_feature').value : "";
        var out = { type: wifiConfig.type, form: wifiConfig.form, feature: wifiConfig.feature };
        document.getElementById('generatorJsonPreviewMain').innerText = JSON.stringify(out, null, 2);
    }

    function saveWifiToServer() {
        updateWifiPreview();
        var indexEntry = { file: (wifiConfig.type || 'untitled') + '.json', name: wifiConfig.type || '未命名 WiFi' };
        fetch('/api/wifi/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wifiDetail: wifiConfig, indexEntry: indexEntry })
        }).then(function(resp) { return resp.json(); }).then(function(data) {
            if (resp.ok) {
                alert(data.message);
                loadOptionList('wlan');
                if (currentMode === 'model') renderForm();
            } else {
                alert('保存失败: ' + (data.error || ''));
            }
        }).catch(function(e) {
            alert('无法连接到后端或后端不存在（悲');
            console.error(e);
        });
    }

    function bindWifiEvents() {
        var ids = ['wifi_type','wifi_form','wifi_feature'];
        for (var i = 0; i < ids.length; i++) {
            var el = document.getElementById(ids[i]);
            if (el && !el.dataset.eventsBound) {
                el.addEventListener('input', function() { updateWifiPreview(); });
                el.dataset.eventsBound = 'true';
            }
        }
        var saveBtn = document.getElementById('saveWifiBtn');
        if (saveBtn && !saveBtn.dataset.eventsBound) {
            saveBtn.addEventListener('click', saveWifiToServer);
            saveBtn.dataset.eventsBound = 'true';
        }
        updateWifiPreview();
    }

    function renderwwanForm() {
        return '<div class="section"><div class="section-title">WWAN 配置文件生成器</div><div class="component-form-grid">' +
               '<div class="component-form-field full-width"><input id="wwan_type" placeholder="型号" value="' + escapeHtml(wwanConfig.type) + '"></div>' +
               '<div class="component-form-field"><input id="wwan_form" placeholder="接口与形态" value="' + escapeHtml(wwanConfig.form) + '"></div>' +
               '<div class="component-form-field full-width"><textarea id="wwan_feature" placeholder="功能" rows="2">' + escapeHtml(wwanConfig.feature) + '</textarea></div>' +
               '</div><button id="saveWwanBtn" class="primary" style="margin-top:12px;">保存 WWAN 配置到服务器</button></div>';
    }

    function updatewwanPreview() {
        wwanConfig.type = document.getElementById('wwan_type') ? document.getElementById('wwan_type').value : "";
        wwanConfig.form = document.getElementById('wwan_form') ? document.getElementById('wwan_form').value : "";
        wwanConfig.feature = document.getElementById('wwan_feature') ? document.getElementById('wwan_feature').value : "";
        var out = { type: wwanConfig.type, form: wwanConfig.form, feature: wwanConfig.feature };
        document.getElementById('generatorJsonPreviewMain').innerText = JSON.stringify(out, null, 2);
    }

    function saveWwanToServer() {
        updatewwanPreview();
        var indexEntry = { file: (wwanConfig.type || 'untitled') + '.json', name: wwanConfig.type || '未命名 WWAN' };
        fetch('/api/wwan/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wwanDetail: wwanConfig, indexEntry: indexEntry })
        }).then(function(resp) { return resp.json(); }).then(function(data) {
            if (resp.ok) {
                alert(data.message);
                loadOptionList('wwan');
                if (currentMode === 'model') renderForm();
            } else {
                alert('保存失败: ' + (data.error || ''));
            }
        }).catch(function(e) {
            alert('无法连接到后端或后端不存在（悲');
            console.error(e);
        });
    }

    function bindwwanEvents() {
        var ids = ['wwan_type','wwan_form','wwan_feature'];
        for (var i = 0; i < ids.length; i++) {
            var el = document.getElementById(ids[i]);
            if (el && !el.dataset.eventsBound) {
                el.addEventListener('input', function() { updatewwanPreview(); });
                el.dataset.eventsBound = 'true';
            }
        }
        var saveBtn = document.getElementById('saveWwanBtn');
        if (saveBtn && !saveBtn.dataset.eventsBound) {
            saveBtn.addEventListener('click', saveWwanToServer);
            saveBtn.dataset.eventsBound = 'true';
        }
        updatewwanPreview();
    }

    function renderDockForm() {
        var portsHtml = '';
        if (dockConfig.ports && dockConfig.ports.length) {
            for (var idx = 0; idx < dockConfig.ports.length; idx++) {
                var port = dockConfig.ports[idx];
                portsHtml += '<div class="array-item" data-port-idx="' + idx + '">' +
                             '<input type="text" class="dock-port" placeholder="端口描述" value="' + escapeHtml(port) + '">' +
                             '<button class="danger-btn remove-port" data-idx="' + idx + '" style="margin-left:8px;">删除</button></div>';
            }
        }
        return '<div class="section"><div class="section-title">扩展坞配置文件生成器</div><div class="component-form-grid">' +
               '<div class="component-form-field full-width"><input id="dock_model" placeholder="型号" value="' + escapeHtml(dockConfig.model) + '"></div>' +
               '<div class="component-form-field full-width"><div id="dock-ports-container">' + (portsHtml || '<div class="empty-battery" style="margin:8px 0;">暂无端口，点击下方添加</div>') + '</div>' +
               '<button type="button" id="addDockPortBtn" class="add-btn" style="margin-top:8px;">+ 添加端口</button></div>' +
               '<div class="component-form-field"><input id="dock_power" placeholder="适配器" value="' + escapeHtml(dockConfig.power) + '"></div>' +
               '</div><button id="saveDockBtn" class="primary" style="margin-top:12px;">保存扩展坞配置到服务器</button></div>';
    }

    function updateDockPreview() {
        dockConfig.model = document.getElementById('dock_model') ? document.getElementById('dock_model').value : "";
        dockConfig.power = document.getElementById('dock_power') ? document.getElementById('dock_power').value : "";
        var ports = [];
        var inputs = document.querySelectorAll('#generatorPage .dock-port');
        for (var i = 0; i < inputs.length; i++) {
            if (inputs[i].value.trim()) ports.push(inputs[i].value.trim());
        }
        dockConfig.ports = ports;
        var out = { model: dockConfig.model, ports: dockConfig.ports, power: dockConfig.power };
        document.getElementById('generatorJsonPreviewMain').innerText = JSON.stringify(out, null, 2);
    }

    function saveDockToServer() {
        updateDockPreview();
        var indexEntry = { file: (dockConfig.model || 'untitled') + '.json', name: dockConfig.model || '未命名的扩展坞' };
        fetch('/api/dock/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dockDetail: dockConfig, indexEntry: indexEntry })
        }).then(function(resp) { return resp.json(); }).then(function(data) {
            if (resp.ok) {
                alert(data.message);
                loadOptionList('dock');
                if (currentMode === 'model') renderForm();
            } else {
                alert('保存失败: ' + (data.error || ''));
            }
        }).catch(function(e) {
            alert('无法连接到后端或后端不存在（悲');
            console.error(e);
        });
    }

    function bindDockEvents() {
        var modelInput = document.getElementById('dock_model');
        var powerInput = document.getElementById('dock_power');
        if (modelInput && !modelInput.dataset.eventsBound) {
            modelInput.addEventListener('input', function() { updateDockPreview(); });
            modelInput.dataset.eventsBound = 'true';
        }
        if (powerInput && !powerInput.dataset.eventsBound) {
            powerInput.addEventListener('input', function() { updateDockPreview(); });
            powerInput.dataset.eventsBound = 'true';
        }
        var addBtn = document.getElementById('addDockPortBtn');
        if (addBtn && !addBtn.dataset.eventsBound) {
            addBtn.addEventListener('click', function() {
                var container = document.getElementById('dock-ports-container');
                if (!container) return;
                var newItem = document.createElement('div');
                newItem.className = 'array-item';
                newItem.innerHTML = '<input type="text" class="dock-port" placeholder="端口描述"><button class="danger-btn remove-port" style="margin-left:8px;">删除</button>';
                container.appendChild(newItem);
                var portInput = newItem.querySelector('.dock-port');
                if (portInput) portInput.addEventListener('input', function() { updateDockPreview(); });
                var removeBtn = newItem.querySelector('.remove-port');
                if (removeBtn) {
                    removeBtn.addEventListener('click', function(e) {
                        var item = e.currentTarget.closest('.array-item');
                        if (item) item.remove();
                        if (container.querySelectorAll('.array-item').length === 0) container.innerHTML = '<div class="empty-battery" style="margin:8px 0;">暂无端口，点击下方添加</div>';
                        updateDockPreview();
                    });
                }
                var emptyDiv = container.querySelector('.empty-battery');
                if (emptyDiv) emptyDiv.remove();
                updateDockPreview();
            });
            addBtn.dataset.eventsBound = 'true';
        }
        var dockPorts = document.querySelectorAll('#generatorPage .dock-port');
        for (var i = 0; i < dockPorts.length; i++) {
            var input = dockPorts[i];
            if (!input.dataset.eventsBound) {
                input.addEventListener('input', function() { updateDockPreview(); });
                input.dataset.eventsBound = 'true';
            }
        }
        var removePorts = document.querySelectorAll('#generatorPage .remove-port');
        for (var i = 0; i < removePorts.length; i++) {
            var btn = removePorts[i];
            if (!btn.dataset.eventsBound) {
                btn.addEventListener('click', function(e) {
                    var item = e.currentTarget.closest('.array-item');
                    if (item) item.remove();
                    var container = document.getElementById('dock-ports-container');
                    if (container && container.querySelectorAll('.array-item').length === 0) container.innerHTML = '<div class="empty-battery" style="margin:8px 0;">暂无端口，点击下方添加</div>';
                    updateDockPreview();
                });
                btn.dataset.eventsBound = 'true';
            }
        }
        var saveBtn = document.getElementById('saveDockBtn');
        if (saveBtn && !saveBtn.dataset.eventsBound) {
            saveBtn.addEventListener('click', saveDockToServer);
            saveBtn.dataset.eventsBound = 'true';
        }
        updateDockPreview();
    }

    function renderForm() {
        var container = document.getElementById('generatorFormPanelMain');
        if (!container) return;
        if (currentMode === 'model') {
            if (!cpuFullList.length) {
                container.innerHTML = '<div class="loading-spinner">加载机型数据中...</div>';
                return;
            }
            var cpuSec = renderFilterableSection("处理器选项", cpuFullList, cpuFilterState, appState.processor_options, "cpu");
            var gpuSec = renderFilterableSection("显卡选项", gpuFullList, gpuFilterState, appState.graphics_options, "gpu");
            var baseHtml = renderModelModeForm();
            var fullHtml = baseHtml.replace('<div id="cpuFilterSection"></div>', '<div id="cpuFilterSection">' + cpuSec + '</div>');
            fullHtml = fullHtml.replace('<div id="gpuFilterSection"></div>', '<div id="gpuFilterSection">' + gpuSec + '</div>');
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

    function initGeneratorTabs() {
        var btns = document.querySelectorAll('#generatorTabBarMain .generator-tab-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].addEventListener('click', function() {
                var mode = this.dataset.mode;
                currentMode = mode;
                var all = document.querySelectorAll('#generatorTabBarMain .generator-tab-btn');
                for (var j = 0; j < all.length; j++) all[j].classList.remove('active');
                this.classList.add('active');
                renderForm();
            });
        }
    }

    function loadCpuIndex() {
        return fetch('/modeldata/CPU/CPU.json').then(function(resp) {
            if (!resp.ok) throw new Error();
            return resp.json();
        }).then(function(data) {
            cpuFullList = enrichItemsWithId(data).map(function(item) { return normalizeItem(item); });
            cpuFilterState = adjustFilterState('cpu', { family:"all", architecture:"all", generationClass:"all", keyword:"" });
        }).catch(function(e) { console.error("加载CPU索引失败",e); cpuFullList = []; });
    }

    function loadGpuIndex() {
        return fetch('/modeldata/Graphics/GPU.json').then(function(resp) {
            if (!resp.ok) throw new Error();
            return resp.json();
        }).then(function(data) {
            gpuFullList = enrichItemsWithId(data).map(function(item) { return normalizeItem(item); });
            gpuFilterState = adjustFilterState('gpu', { family:"all", architecture:"all", generationClass:"all", keyword:"" });
        }).catch(function(e) { console.error("加载GPU索引失败",e); gpuFullList = []; });
    }

    function loadOptionList(type) {
        var caps = { display: 'Display', ethernet: 'Ethernet', wlan: 'WLAN', wwan: 'WWAN', dock: 'Dock' };
        var cap = caps[type];
        if (!cap) return Promise.resolve();
        var url = '/modeldata/' + cap + '/' + cap + '.json';
        return fetch(url).then(function(resp) {
            if (resp.ok) return resp.json();
            else return [];
        }).then(function(data) {
            optionLists[type] = data.map(function(item) {
                var raw = typeof item === 'string' ? item : (item.model || item.name) || "";
                return { value: raw.replace(/\.json$/i, ''), label: raw.replace(/\.json$/i, '') };
            });
        }).catch(function(e) { console.error('重新加载 ' + type + ' 列表失败', e); });
    }

    function loadOtherOptions() {
        var types = ['display', 'dock', 'ethernet', 'wlan', 'wwan'];
        var tasks = types.map(function(t) { return loadOptionList(t); });
        return Promise.all(tasks);
    }

    function resetAll() {
        if (confirm('重置当前模式的所有数据？')) {
            if (currentMode === 'model') renderForm();
            else if (currentMode === 'cpu') {
                cpuConfig = { model:"", cores_threads:"", base_freq:"", turbo_freq:"", cache:"", graphics:"", iconfamily:"", ark:"" };
                cpuIconSelected = "";
                renderForm();
            } else if (currentMode === 'gpu') {
                gpuConfig = { model:"", Shading_Units:"", base_freq:"", turbo_freq:"", VRAM:"", Generation:"", Feature:"", iconfamily:"" };
                gpuIconSelected = "";
                renderForm();
            } else if (currentMode === 'display') {
                displayConfig = { type:"", tech:"", brightness:"", contrast:"", viewing_angle:"", color_gamut:"", refresh_rate:"", FRUs:[] };
                renderForm();
            } else if (currentMode === 'ethernet') {
                ethernetConfig = { type:"", model_type:"" };
                renderForm();
            } else if (currentMode === 'wifi') {
                wifiConfig = { type:"", form:"", feature:"" };
                renderForm();
            } else if (currentMode === 'wwan') {
                wwanConfig = { type:"", form:"", feature:"" };
                renderForm();
            } else if (currentMode === 'dock') {
                dockConfig = { model:"", ports:[], power:"" };
                renderForm();
            }
        }
    }

    function copyJson() {
        var content = document.getElementById('generatorJsonPreviewMain').innerText;
        navigator.clipboard.writeText(content).then(function(){ alert('已复制'); }).catch(function(){ alert('失败'); });
    }

    function exportJson() {
        var content = document.getElementById('generatorJsonPreviewMain').innerText;
        if (!content || content === 'null') { alert('没有可导出的内容'); return; }
        var filename = 'config.json';
        if (currentMode === 'model') {
            var id = document.getElementById('f_id') ? document.getElementById('f_id').value.trim() : null;
            filename = (id ? id : 'thinkpad') + '_config.json';
        } else if (currentMode === 'cpu') {
            var name = cpuConfig.model.trim();
            filename = (name ? name.replace(/[<>:"/\\|?*]/g, '_') : 'cpu') + '.json';
        } else if (currentMode === 'gpu') {
            var name = gpuConfig.model.trim();
            filename = (name ? name.replace(/[<>:"/\\|?*]/g, '_') : 'gpu') + '.json';
        } else if (currentMode === 'display') {
            var name = displayConfig.type.trim();
            filename = (name ? name.replace(/[<>:"/\\|?*]/g, '_') : 'display') + '.json';
        } else if (currentMode === 'ethernet') {
            var name = ethernetConfig.type.trim();
            filename = (name ? name.replace(/[<>:"/\\|?*]/g, '_') : 'ethernet') + '.json';
        } else if (currentMode === 'wifi') {
            var name = wifiConfig.type.trim();
            filename = (name ? name.replace(/[<>:"/\\|?*]/g, '_') : 'wifi') + '.json';
        } else if (currentMode === 'wwan') {
            var name = wwanConfig.type.trim();
            filename = (name ? name.replace(/[<>:"/\\|?*]/g, '_') : 'wwan') + '.json';
        } else if (currentMode === 'dock') {
            var name = dockConfig.model.trim();
            filename = (name ? name.replace(/[<>:"/\\|?*]/g, '_') : 'dock') + '.json';
        }
        var blob = new Blob([content], {type:'application/json'});
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function initGenerator() {
        if (initGenerator._initialized) return;
        initGenerator._initialized = true;
        initGeneratorTabs();
        var resetBtn = document.getElementById('generatorResetBtn');
        if (resetBtn) resetBtn.addEventListener('click', resetAll);
        var copyBtn = document.getElementById('generatorCopyBtn');
        if (copyBtn) copyBtn.addEventListener('click', copyJson);
        var exportBtn = document.getElementById('generatorExportBtn');
        if (exportBtn) exportBtn.addEventListener('click', exportJson);

        // ---------- 重建索引按钮 ----------
        var rebuildBtn = document.getElementById('generatorRebuildBtn');
        if (!rebuildBtn) {
            rebuildBtn = document.createElement('button');
            rebuildBtn.textContent = '重建索引';
            rebuildBtn.className = 'btn';
            rebuildBtn.id = 'generatorRebuildBtn';
            var toolbar = document.querySelector('#generatorPage .compare-toolbar');
            if (toolbar) toolbar.appendChild(rebuildBtn);
        }
        if (rebuildBtn && !rebuildBtn.dataset.eventsBound) {
            rebuildBtn.addEventListener('click', function() {
                var mode = currentMode;
                var typeMap = {
                    'model': 'model',
                    'cpu': 'cpu',
                    'gpu': 'gpu',
                    'display': 'display',
                    'ethernet': 'ethernet',
                    'wifi': 'wifi',
                    'wwan': 'wwan',
                    'dock': 'dock'
                };
                var apiType = typeMap[mode];
                if (!apiType) {
                    alert('当前模式不支持重建索引');
                    return;
                }
                if (!confirm('确定要重建 ' + mode + ' 索引吗？这将扫描所有已存在的 JSON 文件并更新索引。')) return;
                fetch('/api/rebuild-index/' + apiType, { method: 'POST' })
                    .then(function(resp) { return resp.json(); })
                    .then(function(data) {
                        if (data.success) {
                            alert(data.message + '，共 ' + data.count + ' 项');
                            if (mode === 'cpu') {
                                loadCpuIndex().then(function() {
                                    if (currentMode === 'cpu') renderForm();
                                    else if (currentMode === 'model') renderForm();
                                });
                            } else if (mode === 'gpu') {
                                loadGpuIndex().then(function() {
                                    if (currentMode === 'gpu') renderForm();
                                    else if (currentMode === 'model') renderForm();
                                });
                            } else if (mode === 'display' || mode === 'ethernet' || mode === 'wifi' || mode === 'wwan' || mode === 'dock') {
                                var type = (mode === 'wifi' ? 'wlan' : mode);
                                loadOptionList(type).then(function() {
                                    if (currentMode === 'model') renderForm();
                                    else if (currentMode === mode) renderForm();
                                });
                            } else if (mode === 'model') {
                                alert('机型索引已重建，请刷新整个页面以使主页生效。');
                            }
                        } else {
                            alert('重建失败: ' + (data.error || '未知错误'));
                        }
                    })
                    .catch(function(err) {
                        alert('请求失败: ' + err.message);
                        console.error(err);
                    });
            });
            rebuildBtn.dataset.eventsBound = 'true';
        }

        loadDataAndRender();
    }

    function loadDataAndRender() {
        Promise.all([loadCpuIndex(), loadGpuIndex(), loadOtherOptions()]).then(function() {
            renderForm();
        }).catch(function(e) {
            console.error('加载生成器数据失败:', e);
        });
    }

    window.initGenerator = initGenerator;
})();