# UltraNav

ThinkPad 经典的集成指点设备一直是 TrackPoint。从 T30 开始，IBM 引入了 UltraNav——将传统 TrackPoint 与可编程触摸板相结合的组合方案。这种组合指点设备的技术来自 Synaptics、ALPS 或 ELAN。触摸板具备多项可定制功能，包括沿边缘滑动实现滚动、点击区域，以及忽略意外触碰/手掌误触。

## Windows 支持

IBM 的 UltraNav 驱动程序基于 Synaptics 驱动，其中包含一个导致“坏点”的 bug。

当使用触摸板的滚动功能（在触摸板右侧边缘滑动手指）时，任务管理器的第一个标签页中经常会显示一个名为 `Syn Visual Window` 的应用程序或窗口。有时这个窗口会停留在屏幕上以及任务管理器中。它是一个 1×1 像素大小的窗口，通常为白色。如果将鼠标直接移动到该像素上，会出现一个小图标，就像使用了 TrackPoint 中键进行滚动一样。通过在任务管理器中终止 `SynTP*` 相关进程，可以移除这个像素点。有用户声称可以通过使用 TrackPoint 中键来移除它，但这似乎并不总是有效。

截至目前，此问题已在 T60p 和 T41p 上复现，但仅在使用 Firefox 浏览大型网页时出现。即使关闭 Firefox，该像素点仍然存在。IBM 实验室在全新恢复镜像上安装 Firefox 后也能复现该问题，但他们拒绝修复此问题或将其转交给 Synaptics 及其驱动开发人员，理由是 Firefox “不受支持”。猜测 IBM 只希望你使用 IE。这个 bug 相当烦人，因为它会让人误以为是真正的坏点。

近期，一台运行 Windows XP 和 Internet Explorer 7 的 T42 也能够复现此问题。

## UltraNav的进化

不着急写