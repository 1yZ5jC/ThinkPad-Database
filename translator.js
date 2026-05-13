// translator.js
// 增强中文翻译：全局文本替换，避免破坏 HTML 标签

(function () {
    const TRANSLATIONS = {
        'Anti-glare': '抗反射处理',
        'anti-glare': '抗反射处理',
        '6-row, spill-resistant, multimedia Fn keys, optional LED backlight':'带有多媒体功能键的抗泼溅六行式键盘，选配LED键盘背光',
        'LED backlight': 'LED背光',
        'led backlight': 'LED背光',
        'Internal battery': '内置电池',
        'External battery': '外置电池',
        'Wireless WAN upgradable':'WWAN可由最终用户升级',
        'always-on' :'始终可供电',
        'charging port' :'充电接口',
        'security lock slot':'锁孔',
        'port':'接口',
        'Headphone/Microphone combo':'耳机/麦克风二合一接口',
        'Glass-Fiber Reinforced Plastic':'玻璃纤维混合塑料',
        'Power-on/Hard disk/Supervisor password':'开机/硬盘/管理密码',
        'Starting at':'至少',
        'Discrete TPM 1.2 and Firmware TPM 2.0':'独立TPM1.2和固件集成TPM2.0',
        'Fingerprint reader':'指纹读取器',
        'Windows 7 Professional 64 preinstalled through downgrade rights in Windows 10 Pro 64':'从Windows 10 专业版（64位）行使降级权降级的Windows 7 专业版（64位）',
        'Slim AC adapter':'方口电源适配器',
        'or':'或',
        'TrackPoint pointing device and buttonless Mylar surface multi-touch touchpad':'指点杆和无按键多点触控触摸板（麦拉材质表面）',
        'TrackPoint pointing device and buttonless Glass-like Mylar surface multi-touch touchpad':'指点杆和无按键多点触控触摸板（带类玻璃涂层的麦拉材质表面）',
        'HD Audio':'高清晰度音频',
        'codec / stereo speakers':'解码器 / 立体声音响',
        'dual array microphone, combo audio/microphone jack':'双阵列麦克风，音频/麦克风二合一接口',
        'resolution, low light sensitive, fixed focus':'分辨率，低光敏感、固定焦距',
        'Smart card reader':'智能卡读卡器',
        '4-in-1 reader':'四合一读卡器',
        'Power-on password':'开机密码',
        'Hard disk password':'硬盘密码',
        'Supervisor password':'超级管理员密码',
        "HD 720p resolution, fixed focus":"高清摄像头，定焦，720p分辨率",
        '6-row, spill-resistant, multimedia Fn keys, LED backlit':'带有多媒体功能键的抗泼溅六行式键盘，LED键盘背光',
        'Based on':'基于',
        'Also as':'也被称作',
        'soldered to systemboard':'焊接在主板上',
        'TrackPoint pointing device and Mylar surface touchpad, integrated five buttons, multi-touch':'指点杆和麦拉材质表面触摸板，五合一触摸板，多点触控',
        'sockets':'插槽',
        'Dual-channel capable, non-parity':'双通道兼容，无奇偶校验',
        'Smart card reader':'智能卡读卡器',
        'Fingerprint reader':'指纹读取器',
        'Optional':'选配'




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