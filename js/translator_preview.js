// translator.js
// 增强中文翻译：全局文本替换，避免破坏 HTML 标签

(function () {
    const TRANSLATIONS = {
        'Anti-glare': '抗反射处理',
        '6-row, spill-resistant, multimedia Fn keys, optional LED backlight':'带有多媒体Fn键的抗泼溅六行式键盘，选配LED键盘背光',
        '6-row, spill-resistant, multimedia Fn keys, LED backlit':'带有多媒体Fn键的抗泼溅六行式背光键盘',
        'LED backlight': 'LED背光',
        'Internal battery (Optional)': '内置电池（选配）',
        'External battery': '外置电池',
        'Wireless WAN upgradable':'可升级WWAN',
        'always-on' :'始终开启',
        'charging port' :'充电接口',
        'security lock slot':'锁孔',
        'Headphone/Microphone combo':'耳机/麦克风二合一',
        'Glass-Fiber Reinforced Plastic':'玻璃纤维混合塑料',
        'Power-on/Hard disk/Supervisor password':'开机/硬盘/管理密码',
        'Starting at':'至少',
        'Discrete TPM 1.2 and Firmware TPM 2.0':'独立TPM1.2和固件集成TPM2.0',
        'Fingerprint reader (Optional)':'指纹读取器（选装）',
        'Windows 7 Professional 64 preinstalled through downgrade rights in Windows 10 Pro 64':'基于Windows 10 专业版（64位）降级的Windows 7 专业版（64位）',
        'Slim AC adapter':'方口电源适配器',
        'or':'或',
        'TrackPoint pointing device and buttonless Mylar surface multi-touch touchpad':'指点杆和无按键多点触控触摸板（麦拉膜表面）',
        'HD Audio':'高清晰度音频',
        'codec / stereo speakers':'解码器 / 立体声音响',
        'dual array microphone, combo audio/microphone jack':'双阵列麦克风，音频/麦克风二合一接口',
        'resolution':'分辨率',
        'low light sensitive':'低光敏感',
        'fixed focus':'固定焦距',
        'Smart card reader (Optional)':'智能卡读卡器（选配）',
        '4-in-1 reader':'四合一读卡器'
        // 可继续扩充任何需要转换的英文术语
    };

    let enabled = false;

    try {
        const saved = localStorage.getItem('enhancedTranslation');
        if (saved === 'true') enabled = true;
    } catch (e) {}

    /**
     * 全局翻译 HTML 字符串中的术语
     * 通过正则确保只替换标签外的文本
     */
    function globalTranslateHTML(html) {
        if (!enabled || typeof html !== 'string') return html;
        let result = html;

        for (const [eng, chs] of Object.entries(TRANSLATIONS)) {
            // 匹配不在 HTML 标签内的单词（简单实现：要求术语前后是标签或空格或标点）
            const escaped = eng.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // 正向预查：前面是 > 或空格或开头；后面是 < 或空格或标点或结尾
            const regex = new RegExp(`(>|\\s|^)${escaped}(?=<|\\s|$|[.,;!?])`, 'gi');
            result = result.replace(regex, (match, prefix) => {
                return prefix + chs;
            });
        }

        return result;
    }

    function setTranslationEnabled(val) {
        enabled = !!val;
        try {
            localStorage.setItem('enhancedTranslation', val ? 'true' : 'false');
        } catch (e) {}
    }

    // 暴露到全局
    window.globalTranslateHTML = globalTranslateHTML;
    window.getTranslationEnabled = () => enabled;
    window.setTranslationEnabled = setTranslationEnabled;
})();