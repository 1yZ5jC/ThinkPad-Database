# ThinkLight

ThinkLight 是一个 5 伏的小型 LED 灯，集成在部分旧款 ThinkPad 显示屏边框的左上角或中间区域。它可以照亮 ThinkPad 的键盘，让用户在黑暗中无需外接光源即可打字。

该功能实际上已被背光键盘所取代，后者使得 ThinkLight 显得多余。不过，也有一些机型同时配备了 ThinkLight 和背光键盘。

由于 ThinkLight 完全依赖嵌入式控制器（embedded controller）工作，因此通过键盘快捷键控制其在所有系统上均可使用。只需按 `Fn + PageUp` 即可在开和关之间切换。

从 xx30 系列机型（T430、T530、W530 等）开始，为了更好适配 6 行孤岛式键盘布局，快捷键改为 `Fn + Space`。在带有背光键盘的机型上，共有 4 种状态：关闭、背光暗、背光亮、背光亮 + ThinkLight。不带背光键盘的机型只有 ThinkLight 开和 ThinkLight 关两种状态——对于安装了背光键盘的机型，可以在 UEFI 中禁用背光键盘来达到仅有 ThinkLight 开关的效果。

## 搭载白光ThinkLight的设备
i Series 1460, i Series 1480, i Series 1482, i Series 1483, i Series 1492, i Series 1560, i Series 1562, i Series 1592, i Series 1620, i Series 1800
W500, W510, W520, W530
A20m, A20p, A21e, A21m, A21p, A22e, A22m, A22p, A30, A30p, A31, A31p
T20, T21, T22, T23, T30, T40, T40p, T41, T41p, T42, T42p, T43, T43p, T60, T60p, T61, T61p, T400, T400s, T410, T410i, T410s, T410si, T420, T420i, T420s, T420si, T430, T430i, T430s, T430si, T430u, T500, T510, T510i, T520, T520i, T530, T530i
X20, X21, X22, X23, X24, X60, X60s, X61, X61s, X200, X200s, X201, X201i, X201s, X201si, X220, X220i, X230, X230i, X300, X301
R30, R31, R32, R40
S30, S31

## 搭载琥珀色灯光ThinkLight的设备
X30, X31, X32, X40, X41
R50, R50e, R50p, R51, R51e, R52, R60, R60e, R60i, R61, R61e, R61i, R400, R500
Z60m, Z60t, Z61e, Z61m, Z61p, Z61t

## 搭载两个ThinkLight的设备
W700, W700ds, W701, W701ds