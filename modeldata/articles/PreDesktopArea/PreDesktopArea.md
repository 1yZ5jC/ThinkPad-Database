# 预桌面区域（Predesktop Area）

“预桌面区域”这一名称用于指代两种不同的技术：**隐藏保护区域**（Hidden Protected Area）和**挽救与恢复**（Rescue and Recovery）。

## 隐藏保护区域（HPA）

隐藏保护区域是硬盘上的一个特殊区域，可以对 ThinkPad 上运行的软件隐藏。它包含了恢复 ThinkPad 出厂预装状态所需的所有软件和数据。HPA 还包括一些诊断工具以及一个（仅限 MS Windows 的）备份工具。HPA 最早随 R40、T40 和 X30 系列 ThinkPad 引入。目前的 ThinkPad 不再配备 HPA。

## 挽救与恢复（Rescue and Recovery）

较新的 ThinkPad 出厂时预装了 Rescue and Recovery 技术。该技术使用一个（隐藏的）分区来恢复出厂预装状态并提供诊断工具。

---

## 隐藏保护区域（HPA）详解

隐藏保护区域（也称 Host Protected Area）是位于硬盘末尾的一个特殊区域（通常大小为几个 GB）。它预装在部分 ThinkPad 的硬盘上，通常对 ThinkPad 上运行的软件隐藏，其中包含恢复出厂预装状态所需的所有软件和数据。HPA 还包括诊断工具和一个（仅限 MS Windows 的）备份工具。

HPA 最早随 R40、T40 和 X30 系列 ThinkPad 引入，在 BIOS 设置中被称为“预桌面区域”（Predesktop Area）。较新的 ThinkPad 可能拥有一个（隐藏的）分区，在 BIOS 设置中同样称为“预桌面区域”，但它**不是** HPA。更多信息请参阅“挽救与恢复”部分。

### IBM 预桌面区域

#### HPA 概述

与恢复分区不同，受保护服务区域（PSA，如 HPA）可以理解为写入到硬盘末尾的分区镜像，只能通过其 **BEER** 进行访问。其基本思想是：在 BIOS 的控制下，PSA 对所有普通软件（包括恶意软件：病毒、木马、间谍软件）完全隐藏。只有在 BIOS 允许的情况下才能访问，而且必须借助支持 HPA 的专用工具。在 GNU/Linux 下，只能通过 `dd` 等底层工具访问 HPA。

HPA 基于 Phoenix FirstWare 技术。简而言之，FirstWare 是两种技术的实现：**BEER** 和 **PARTIES**（是的，名称没错）。BEER（Boot Engineering Extension Record，启动工程扩展记录）和 PARTIES（Protected Area Run Time Interface Extension Services，保护区域运行时接口扩展服务）在 T13 工作草案中有描述。IBM 网站上提供了对 PARTIES 的通用介绍。FirstWare 依赖于特定的 ATA-5 命令，因此无法在更低 ATA 级别（更早的）硬盘甚至部分 ATA-5 硬盘上工作。遗憾的是，没有公开的 HPA 兼容性测试工具或兼容硬盘列表。

基本原理是：Phoenix BIOS 命令硬盘隐藏最后几个 GB（即 HPA）。对于不支持 HPA 的软件，硬盘看起来容量变小了。请注意，这仅仅是 BIOS 中的一个设置，可以禁用。在启动时按 **Access IBM** 或 **Enter** 键即可访问 HPA。然后 BIOS 会解析 BEER（128 字节，位于硬盘最后一个 512 字节扇区中）和“服务目录”（由多个 64 字节的目录条目组成，从最后一个扇区开始并可能延伸到前几个扇区），以确定应启动 HPA 的哪个部分。在（大多数？）ThinkPad 中，BEER 指示 BIOS 启动 Access IBM 预桌面区域。系统随后将实际启动到一个（最小化的）DOS 环境，该环境能够启动一个图形外壳（称为 Phoenix FirstSight）。IBM 只是将这个图形外壳重新命名为 Access IBM 预桌面区域。从这个图形外壳中，用户可以启动多个工具（BIOS 设置、诊断工具、恢复工具）。

### BIOS 中的三个选项

BIOS 中（在 **Security** 类别下）对“IBM Predesktop Area”提供了三个设置：

- **Secure（安全）**：不允许用户或软件发起的更改；内容对操作系统隐藏。
- **Normal（正常）**：允许更改；内容对操作系统隐藏。
- **Disabled（禁用）**：不可用；可见且可回收。

默认设置为 **Normal**。当设置为 **Secure** 或 **Normal** 时，可以启动到预桌面区域。当设置为 **Disabled** 时，预桌面区域将无法启动。根据预桌面区域白皮书，当设置为 **Secure** 时，HPA 既被“锁定”[1] 又被“隐藏”；当设置为 **Normal** 时，仅被“隐藏”。实际效果是：当设置为 **Secure** 时，Linux（以及所有应用程序）完全无法访问 HPA（“安全模式”下，包括 MS Windows 在内的所有操作系统都应无法访问 HPA）。当设置为 **Normal** 时，理论上 HPA 只能被支持 HPA 的工具访问。然而，较新的内核在设置为 **Normal** 时默认会禁用 HPA。请注意，linux-ide 上的近期讨论表明，ThinkPad 在恢复（resume）时会重新启用 HPA，从而与 GNU/Linux 系统（假设 HPA 仍然可用）产生（可能严重的）冲突。

设置为 **Disabled** 后，您可以安全地回收 HPA 占用的区域（对 GNU/Linux 来说，它基本上是硬盘上未分配的空间）。

### HPA 的细节

Fabrice Bellet 描述了一种使用 GNU/Linux 工具探索其 ThinkPad T40 上 HPA 的技术。该技术仅供好奇或大胆的人使用。它使用 `dd` 将硬盘上包含 HPA 的扇区从 `/dev/hda` 复制到一个新文件中：在 `/dev/hda` 上使用 `dd` 时，一个微小的拼写错误就可能导致不可恢复的灾难！

另一个选项是 **Hidden Protected Area FileSystem（hpafs）**，一个只读的 FUSE 文件系统。hpafs 允许分析、备份 HPA 等。当前版本为 hpafs-0.1.0（仅限开发者的 alpha 版本）。详细信息请查看 README。

对于需要将 HPA 从旧硬盘复制到新硬盘的用户来说，好消息是：**fiesta** 是一个易于使用（因此得名）的信息/备份/恢复/复制工具，适用于配备 HPA 的计算机。除了显示 HPA 结构的详细信息外，它还允许提取 HPA “分区”或 PSA，直接挂载（如果包含文件系统），最重要的是，在磁盘升级/降级时，通过简单的两步过程将整个 HPA 从一个磁盘复制到另一个磁盘。

最后，强大的 HPA 和 PSA 处理工具集（很自然地称为 **hpatools**）在此线程中进行了讨论。该工具集只有德语版本，但这里有一个在 X31 上成功测试过的翻译版本。

### 如何回收 HPA 占用的空间

在 BIOS 中禁用“IBM Predesktop Area”（设置为 **Disabled**，见上文）后，可以回收 HPA 占用的空间。然后可以使用标准工具（如 `fdisk`、`mkfs`）将该区域纳入分区，因为它将被视为硬盘的普通空闲空间。

如果您在更换硬盘后想将原始硬盘通过 IDE 转 USB 适配器使用，USB 磁盘可能仍然无法使用其全部容量，因为对于 Hitachi Travelstar 硬盘，“clipping”功能可能也被激活以隐藏 HPA。使用 Hitachi Feature Tool（`ftool.exe`，可作为可启动 CD ISO 获取：http://www.thgweb.de/downloads/display.php?id=1124），可以将磁盘容量重新调整为原始值。此操作仅在过程中将磁盘连接到 IDE 总线时有效。

### 替代用途？

也许可以利用 HPA 中包含的 FirstWare 工具，使 HPA 对 GNU/Linux 更有用。例如，可以将预装操作系统的副本替换为您 GNU/Linux 发行版的紧急备份。甚至可以使用预桌面区域启动到 GNU/Linux 救援系统。目前尚不能确定 Phoenix 专有工具是否真的允许替代用途，以及这些工具是否会使其难以实现。现实地讲，这些替代用途的收益可能不值得付出的努力。不过，尝试一下可能很有趣（尽管可能对您的系统有风险）……

### HPA 引起的问题

#### 从挂起状态恢复

从 Linux 2.6.18 开始，存在 HPA 可能导致笔记本从挂起到内存或挂起到磁盘恢复时出现错误。请参阅 **ACPI 挂起问题** 中的“笔记本恢复时出现 SectorIdNotFound 磁盘错误”一节。

#### 无法启动

如果在 BIOS 中启用了 HPA（模式设置为 **Normal**），Linux 可能会对正确的分区几何结构产生混淆。确切原因尚不清楚，但 GNU/Linux 安装可能会覆盖/损坏 HPA，从而导致启动时出现问题。在安装 GNU/Linux 后更改 BIOS 中的 HPA 模式也可能导致该问题。

报告的症状包括：

- Linux 无法启动：启动时，Grub 显示 `Error 17`；Lilo 显示 `L 99 99 99 99 ...`
- Windows XP 启动时蓝屏，显示消息 `STOP [...] UNMOUNTABLE_BOOT_VOLUME`

参见例如 Ubuntu 的错误报告：Bug #25451 – Thinkpad BIOS can't hide the Predesktop area

显然，通过在 BIOS 设置中将 HPA 模式设置为 **Disable** 可以修复此问题。

请注意，此设置将允许软件覆盖 HPA。特别是，后续的 GNU/Linux 安装如果在擦除磁盘时很可能会覆盖 HPA。如果您需要 HPA 中安装的恢复系统的恢复功能，则应将设置保持为 **Secure**。但是，如果您遇到上述启动问题，您的 HPA 很可能已经被破坏，因此 **Disable** 是最佳设置（在某些情况下，如果 BIOS 检测到 HPA 已被删除，实际上会强制您设置为 **Disable**）。

---

## 挽救与恢复（Rescue and Recovery）

Rescue and Recovery 版本 3.0 包含一个可启动分区，内含多种系统恢复工具，包括对预装 Windows XP 分区的完整恢复。在系统启动时按 **ThinkPad**、**Access IBM** 或 **ThinkVantage** 按钮即可激活。它包含一个 FAT 文件系统（有时标记为 `IBM_SERVICE`、`SERVICEV001` 等），分区类型为 `0x12`（在 `fdisk` 中显示为“Compaq diagnostics”）。

与隐藏保护区域不同，**恢复分区是普通分区**，可通过分区表访问。由于它们是普通分区，因此可以被普通分区工具访问。请谨慎处理它们。

Rescue and Recovery 是 Windows 专有功能。如果您打算在出现问题时恢复到 Windows，务必仔细遵循此处的警告。如果您打算完全运行另一个操作系统且不再返回 Windows，删除此分区是安全的。如果您已创建了恢复光盘集（需要 1CD + 1DVD 或 5CD），以后仍然可以重新安装 Windows。从恢复 CD 启动会将系统恢复到出厂状态，包括恢复分区。

### 使用 Product Recovery 恢复 Windows MBR

Product Recovery CD/DVD-ROM 会擦除您的硬盘并将其恢复到原始的出厂 Windows 状态。GRUB MBR 可能会干扰此过程。症状是：您尝试恢复，但恢复过程立即结束，计算机尝试用 GRUB 启动。问题在于 Product Recovery（版本 5.6）不会覆盖的磁盘部分之一就是 MBR。

如果遇到此问题，请使用 IBM Product Recovery CD 上的 PC Doctor 完全擦除硬盘：

1. 插入 Product Recovery Disk 1（此过程假设版本 5.6，约 2002 年）
2. 启动计算机，按 F12，选择 CD-ROM Drive 作为启动设备
3. IBM Product Recovery 启动后，会给出两个选项：
   - **Full Recovery** – 想必您已经尝试过但失败了。
   - **System Utilities** – 选择此项。
4. 选择 **Run diagnostics**。PC Doctor 诊断程序将启动。
5. 在顶部菜单中，选择 **Utility**。
6. 在此菜单中，选择 **Full Erase Hard Drive** 并确认您确实要擦除。Full Erase 有效，但每 GB 大约需要两分钟。如果您发现 Quick Erase Hard Drive 也有效，请在此文档中注明。
7. 擦除完成后，您的硬盘没有 MBR，因此 Product Recovery 别无选择，只能安装一个新的 MBR。
8. 重新启动，按 F12，选择 CD-ROM Drive 作为启动设备
9. IBM Product Recovery 启动后，这次选择 **Full Recovery**

### 较新版本的 Rescue and Recovery

Rescue and Recovery 版本 4 安装在 T61/R61 上。分区类型为 `0x27`。出厂默认情况下，R&R 分区是磁盘上的第一个分区。使用的文件系统为 NTFS。预装的 Windows 显示为第二个分区，活动位已设置。

（_并非所有 T61 都是如此。我的 T61 是版本 4，但 R&R 分区是第二个，ID 为 0x12。而在我的 x61t 上，版本 4、类型 0x27 是第一个分区——此处需要更多信息……_）

（同样在 R61 8919-CTO 上，R&R 版本 4 是第二个分区，类型为 FAT32。）

R&R 版本 4 的引导加载程序似乎遵循分区表中的活动位。因此，在保持 R&R 功能的同时安装 Linux 相当直接：

- 缩小第二个 Windows 分区 – 或不需要时将其删除
- 为 Linux（或其他操作系统）添加分区，其中必须有一个主分区，因为 R&R 引导加载程序无法从扩展分区启动
- 将 GRUB 安装在新添加的主分区的引导扇区上
- 从 Windows 分区中移除活动位，并激活装有 GRUB 的引导分区

不幸的是，GRUB2 希望安装在磁盘的 MBR 上，但可以覆盖此行为。

### 旧版本的 Rescue and Recovery

部分 ThinkPad（例如 T23 和 T30）没有附带恢复 CD，也不支持隐藏保护区域。这些 ThinkPad 在硬盘上预装了旧版本的 Rescue and Recovery 来实现出厂恢复功能。上述大多数注释也适用于旧版本，但有以下区别：

- 恢复分区类型为 `0x1c`（隐藏 FAT32，LBA 映射）或未隐藏时为 `0xc`。
- 引导管理器程序位于 `C:\IBMTOOLS\RECOVERY`，仅在 16 位 DOS 环境中运行。
- **FIXME**：需要此引导管理器的名称。
- IBM 预桌面区域运行在 Windows 98（命令行）之上，而非 WinPE。
- ThinkPad A22p 笔记本电脑似乎没有引导管理器（我找不到）。我曾使用一个名为 MBRWizard 的工具，将四扇区引导代码从一台正常工作的笔记本复制到一台无法工作的笔记本上，从而恢复了 Rescue and Recovery 功能。

### 恢复启动挂起

最近在一台 R61 上，我试图通过 CD/DVD 恢复 XP，机器中装有一个新硬盘，上面安装了 Fedora 9 并带有一个加密分区。启动 CD/DVD 开始启动，闪烁“inspecting machine configuration”或类似信息，然后黑屏挂起。要检查您的 CD/DVD 是否正常，可以完全拔掉硬盘。在我这种情况下，拔掉硬盘后 CD/DVD 正常启动。为了解决此问题以便真正运行恢复，我从 DVD 启动了 Fedora 9，将硬盘重新分区为未加密的 vfat 格式，保存新分区后，我就能正常启动恢复 CD/DVD 了。我不确定是否必须完全按照我做的去做，但这就是我所做的并且成功了，也许更小的子集就足够了。

### 从硬盘恢复

如果您能够通过 F11、已安装的 grub 或 SGD（Super Grub Disk，下载地址：http://www.supergrubdisk.org/，并使用 `Boot Windows from 2nd partition` 选项）加载 Rescue and Recovery，您可以将系统恢复到出厂预装状态。

如果您将 GRUB 安装在 MBR 中，恢复将会启动，但不会替换 MBR。在这种情况下，GRUB 会启动，但由于缺少其他文件，会卡在 `error 22`。要恢复 MBR，如果您有软盘，可以尝试使用 `rnr31_rrd.exe`（XP）或 `rnr40_rrd.ext`（Vista）。如果您只有光盘，可以在 rapidshare 上找到 ISO 镜像（例如搜索 `rnr31_rrd_fixed.iso`）。我尝试过但没有成功。即使机器无法启动，恢复仍然以某种方式进行了。使用 SGD 作为引导加载程序，恢复可以继续，但到目前为止我得到了一台不稳定的机器。特别是，再也无法生成恢复 CD 了……

---

## 脚注

[1] “锁定”是指 HPA 被设置为“只读”状态，无法通过 BIOS 以外的任何方式修改其内容。