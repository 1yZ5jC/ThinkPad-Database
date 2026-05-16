# Ultrabay

> **注意**：IdeaPad Y400/Y500/Y410p/Y510p 的 Ultrabay 与 ThinkPad 所用的 Ultrabay 不同。一个显著区别是它包含一个 TE Connectivity 2199022-1 连接器（MXM 3.0 的专有实现），而 ThinkPad 的所有 Ultrabay 类型均无此连接器。因此，为上述 IdeaPad 生产的 Ultrabay GPU 因缺少此连接器而无法在 ThinkPad 的 Ultrabay 中使用。

Ultrabay 是 IBM（现为 Lenovo）对可互换插槽（设备托架）的命名。根据 IBM 的定义[^2]：

> “ThinkPad UltraBay[^1] 也是系统标配，它是一个智能插槽，能够切换其引脚信号，从而允许在通常仅为软驱插槽的位置安装标准和可选设备。”

该技术最早出现在 **ThinkPad 360** 和 **750** 上，之后几乎每一代新机型都会重新设计。这可能导致一些混淆，希望本文能帮助澄清。下表概述了不同的 Ultrabay 类型、它们所在的机型以及可用的设备。

## 概述

随着时间的推移，Ultrabay 使用了多种不同的外形规格。它们通常不互相兼容，但也存在一些例外（详见下文）。由于严重的空间限制，当前的 ThinkPad 已不再使用 Ultrabay。如今只有少数机型仍然配备 Ultrabay，但遗憾的是它们被“阉割”了——不再支持 Ultrabay 电池和/或热插拔。

请注意，并非所有 Ultrabay 都是完全相同的：有些缺少弹出机构，有些缺少充电/放电 Ultrabay 电池所需的电池端子。某些 Ultrabay 可能不支持热插拔或温插拔，即使在另一个型号中它们支持（例如，高端型号支持热、温、冷插拔，但同一类型的低端型号可能只支持冷插拔）。这些功能残缺的 Ultrabay 变种通常出现在低端型号上，尽管偶尔也会出现在高端型号中。

## 兼容性

### Ultrabay 类型、所在机型及可用设备

| 类型 | 内置机型 | 外置底座 | 可用设备（图标文字说明） |
|------|----------|----------|--------------------------|
| **UltraBay** | 355, 355C, 355Cs, 360, 360C, 360Cs, 360P, 360CE, 360CSE, 360PE, 370C, 750, 750C, 750Cs, 750P, 755C, 755CE, 755Cs, 755CSE, 755CV, 755CX, 760C, 760L, 760E | 无 | 软驱(1.44M/2.88M), PC卡适配器, 硬盘适配器, 电池, WMF CD/PD适配器, WMF Ardis适配器, 电视调谐器, 旅行挡板 |
| **UltraBay Thick** | 755CD, 755CDV, 760CD, 760E, 760ED, 760EL, 760ELD, 760LD, 760XD, 760XL, 765D, 765L | SelectaDock I/II[^3] | ZIP 100, 光驱, 旅行挡板 |
| **UltraBay II** | 770, 770E, 770ED, 770X, 770Z | SelectaDock III[^3] | 软驱, ZIP 100, LS-120, 光驱, DVD, 硬盘适配器, Ultrabay驱动器适配器, 电池, 旅行挡板 |
| **UltraBay FX**[^11] | 390, 390E, 390X, i1700, i1720, i1721, i1780, i1781 | 无 | 软驱+光驱, 软驱+DVD, 硬盘适配器, 电池, 旅行挡板 |
| **UltraslimBay** | 600[^3], 600E, 600X | ThinkPad UltraBase[^3], Portable Drive Bay[^3] | 软驱, LS-120, ZIP 100, ZIP 250, 光驱, DVD, 硬盘适配器, 电池, 旅行挡板 |
| **Ultrabay 2000** | i1800[^3][^4], A20m/p, A21e[^3][^4], A21m/p, A22e[^3][^4], A22m/p, A30[^6], A30p[^6], A31[^6], A31p[^6], T20[^6], T21, T22 | ThinkPad Dock[^3][^4], ThinkPad Dock II[^3], ThinkPad X2 UltraBase[^3], Portable Drive Bay 2000[^3] | 软驱, LS-120, LS-240, ZIP 250, 光驱, CD-RW, DVD, Combo, Multi-Burner, 硬盘适配器, Ultrabay驱动器适配器（两个）, 电池, 旅行挡板 |
| **Ultrabay Plus** | A30[^3][^6], A30p[^3][^6], A31[^3][^6], A31p[^3][^6], R30[^3][^4], R31[^3][^4], R32[^4], R40, T23, T30 | ThinkPad X3 UltraBase | 设备托架, 数字小键盘, WorkPad c500 底座 |
| **Ultrabay Slim** | T40, T40p, T41, T41p, T42, T42p, T43, T43p, T60, T60p, T61, T61p, Z60t, Z61t | ThinkPad X4 UltraBase, ThinkPad X4 Dock[^3], ThinkPad X6 UltraBase, ThinkPad X6 Tablet UltraBase | DVD, Combo, Multi-Burner, 硬盘适配器, 电池, 串并口适配器, 旅行挡板 |
| **Ultrabay Enhanced** | R50, R50e[^3][^4], R50p, R51, R51e[^3][^4], R52, R60, R60i, R60e[^3][^4][^5], R61, R61i, R61e[^3][^4][^5], G41[^3][^4][^5], G50[^3][^4][^5], Z60m, Z61e[^3][^4][^5], Z61m, Z61p | ThinkPad Advanced Dock[^3] | 光驱, DVD, Combo, Multi-Burner, 电池, 旅行挡板 |
| **Ultrabay Thin** | X300, X301 | 无 | Multi-Burner, 硬盘适配器, 电池, 旅行挡板 |
| **Serial Ultrabay Slim** | P70[^3][^4][^5], P71[^3][^4][^5], W500, W540[^3][^4][^5], W541[^3][^4][^5], T400, T400s, T410[^3], T410i[^3], T410s, T410si, T420s, T420si, T430s, T430si, T440p[^3][^4][^5], T500, T540p[^3][^4][^5], L440[^3][^4][^5], L540[^3][^4][^5], L560[^3][^4][^5], L570[^3][^4][^5] | ThinkPad X200 UltraBase[^3], ThinkPad UltraBase Series 3[^3] | DVD, Combo, Multi-Burner, 硬盘适配器, 电池, 旅行挡板 |
| **Serial Ultrabay Enhanced** | W510[^3], W520[^3], W530[^3], W700[^3], W700ds[^3], W701[^3], W701ds[^3], T420[^3], T420i[^3], T430[^3], T430i[^3], T510[^3], T510i[^3], T520[^3], T520i[^3], T530[^3], T530i[^3], L410[^3][^4][^5], L412[^3][^4][^5], L420[^3][^4][^5], L421[^3][^4][^5], L430[^3][^4][^5], L510[^3][^4][^5], L512[^3][^4][^5], L520[^3][^4][^5], L530[^3][^4][^5], R400, R500 | 无 | DVD, Combo, Multi-Burner, 硬盘适配器, 旅行挡板 |

### 设备与插槽之间的兼容性

| 设备类型 \ 插槽类型 | UltraBay | UltraBay Thick | UltraBay II | UltraBay FX | UltraslimBay | Ultrabay 2000 | Ultrabay Plus | Ultrabay Slim | Ultrabay Enhanced | Ultrabay Thin | Serial Ultrabay Slim | Serial Ultrabay Enhanced |
|-------------------|----------|----------------|-------------|-------------|--------------|---------------|---------------|---------------|-------------------|---------------|----------------------|--------------------------|
| UltraBay 设备 | 是 | 是[^适配1] | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 否 |
| UltraBay Thick 设备 | 否 | 是 | 是[^适配2] | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 否 |
| UltraBay II 设备 | 否 | 否 | 是 | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 否 |
| UltraBay FX 设备 | 否 | 否 | 否 | 是 | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 否 |
| UltraslimBay 设备 | 否 | 否 | 否 | 否 | 是 | 否 | 否 | 否 | 否 | 否 | 否 | 否 |
| Ultrabay 2000 设备 | 否 | 否 | 否 | 否 | 否 | 是 | 是 | 否 | 否 | 否 | 否 | 否 |
| Ultrabay Plus 设备 | 否 | 否 | 否 | 否 | 否 | 否 | 是 | 否 | 否 | 否 | 否 | 否 |
| Ultrabay Slim 设备 | 否 | 否 | 否 | 否 | 否 | 适配器[^适配3] | 适配器[^适配3] | 是 | 是 | 否 | 否 | 否 |
| Ultrabay Enhanced 设备 | 否 | 否 | 否 | 否 | 否 | 适配器[^适配4] | 适配器[^适配4] | 否 | 是 | 否 | 否 | 否 |
| Ultrabay Thin 设备 | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 是 | 否 | 否 |
| Serial Ultrabay Slim 设备 | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 是 | 是 |
| Serial Ultrabay Enhanced 设备 | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 是 |

[^适配1]: 需要使用“Ultrabay Drive Adapter for Ultrabay II”。
[^适配2]: 同上。
[^适配3]: 需要使用“Ultrabay Slim Drive Adapter for Ultrabay 2000”。
[^适配4]: 需要使用“Ultrabay Enhanced Drive Adapter for Ultrabay 2000”。

### 各类型特性

| 类型 | 冷插拔 | 温插拔 | 热插拔 | 托架面板形状 | 连接器类型 | 高度 |
|------|--------|--------|--------|--------------|------------|------|
| UltraBay                 | 是 | 否 | 否 | 扁平矩形，无切口或斜角                      | 专有 HDCN100[^7] | 15 mm |
| UltraBay Thick           | 是 | 否 | 否 | 扁平矩形，右下角有切口，无斜角               | 专有 HDCN100[^7][^8] | 19 mm |
| UltraBay II              | 是 | 是 | 是 | 扁平矩形，右下角有切口，无斜角               | 专有 80针 Molex 53997[^9] | 17 mm |
| UltraBay FX              | 是 | 是 | 否 | 楔形，右上角有切口，无斜角                  | 未知 | 25.4 mm |
| UltraslimBay             | 是 | 是 | 否 | 扁平矩形，无切口，底部有斜角                | 专有 80针 Molex 53997[^10] | 12.7 mm |
| Ultrabay 2000            | 是 | 是 | 是 | 扁平矩形，右下角有切口，底部从斜角过渡到平面  | 专有 80针 Molex 53997 | 12.7 mm |
| Ultrabay Plus            | 是 | 是 | 是 | 扁平矩形，右下角有切口，底部从斜角过渡到平面  | 专有 80针 Molex 53997    | 12.7 mm |
| Ultrabay Slim            | 是 | 是 | 是 | 扁平矩形，右下角有切口，斜角因型号而异       | 专有 50针 JAE PM1F050N1AE | 9.5 mm |
| Ultrabay Enhanced        | 是 | 是 | 是 | 扁平矩形，右下角有切口，斜角因型号而异       | 专有 50针 JAE PM1F050N1AE | 12.7 mm |
| Ultrabay Thin            | 是 | 是 | 否 | 扁平矩形，无切口，底部有斜角                | 标准 slimline PATA | 7 mm |
| Serial Ultrabay Slim     | 是 | 是 | 是 | 扁平矩形，右下角有切口，斜角因型号而异       | 标准 slimline SATA | 9.5 mm |
| Serial Ultrabay Enhanced | 是 | 是 | 是 | 扁平矩形，右下角有切口，斜角因型号而异       | 标准 slimline SATA | 12.7 mm |

## 脚注

[^1]: IBM 最初使用大写 B 的格式 ‘UltraBay’，后来改为小写 b 的 ‘Ultrabay’。更改原因未知。
[^2]: 该定义自 Ultrabay Slim 及更新的 Ultrabay 类型起不再有效，因为这些类型实际上只是一个 IDE/SATA 连接器。
[^3]: 该型号缺少支持 Ultrabay 电池所需的电池端子。对于双插槽型号，此插槽没有电池端子。
[^4]: 该型号不支持热插拔或温插拔。
[^5]: 该型号没有用于弹出 Ultrabay 设备的弹出机构。
[^6]: 该型号不支持热插拔。
[^7]: RS/6000 的 HDCN60 和 HDCN68 Mini Delta Ribbon SCSI 连接器的 100 针版本，IBM 系统专有。
[^8]: ThinkPad 760XD/760XL/765D/765L 技术参考手册第 39 页包含 UltraBay Thick 连接器的描述。
[^9]: ThinkPad 770 技术参考手册第 34-36 页讨论了 UltraBay II 对 Molex 连接器的使用。
[^10]: ThinkPad 600 技术参考手册第 33-35 页讨论了 UltraslimBay 对 Molex 连接器的使用。
[^11]: IBM 似乎互换使用了 “UltraBay FX”、“Combo Bay” 和 “Combobay” 等术语。

## 另见

- [如何制作自己的 Ultrabay 驱动器]
- [如何热插拔 Ultrabay 设备]