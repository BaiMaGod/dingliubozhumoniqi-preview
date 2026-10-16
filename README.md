# 顶流博主模拟器 · 试玩预览

[打开游戏](https://baimagod.github.io/dingliubozhumoniqi-preview/)

当前版本：V1.4.0，LayaAir 3.4 引擎版。

本仓库仅保存公开试玩产物；源代码与设计文档保存在正式私有仓库。

本次产物来自正式提交 `fc8b30ad1cff3aa4c7abbd00c9e0d800cecaf8f5`，由官方 LayaAir CLI 3.4.0 导出。65项规则/边界检查、390×844和375×667真实触摸流程、旧存档兼容与20项文件哈希验证通过。`_build-evidence.json`记录同一包的浏览器验收和文件哈希。

保留同域存档键，不清空已有创作循环进度。浏览器旧版页面和美术对照记录仅供归档，不是当前游戏入口。

引擎产物提交：[042cdb2](https://github.com/BaiMaGod/dingliubozhumoniqi-preview/commit/042cdb244446482703a3b91cef0d36506b047f9b)。

2026-10-15 20:15（新加坡时间）再次发布：复用已通过官方构建、真实触摸流程和文件哈希校验的 V1.4.0 引擎产物，保持源码基线 `fc8b30ad1cff3aa4c7abbd00c9e0d800cecaf8f5` 不变，触发 GitHub Pages 重新发布。

2026-10-16 再次发布：继续使用已验证的 V1.4.0 引擎产物，触发 GitHub Pages 重新部署。主仓库已有 V1.5.0 源码 `0c3845b4f17a9245f8e4f1d0f805dac1ce634cfb`，但因 GitHub Actions 构建任务未能启动，本次**未将 V1.5.0 源码标记为已上线**；请勿将本次 Pages 成功等同于 V1.5 的构建与验收。

2026-10-16 22:08（新加坡时间）手动再次触发预览库 Pages 发布：重新发布已通过校验的 V1.4.0 原有构建产物。正式仓库此时的 main 为 `ffd5933ecd92674d05493349e37947869fe3aa36`（V1.5.1），其源码虽有验收记录，但新版 Web 发行文件未保存在可访问的仓库中，正式仓库 GitHub Actions 构建曾失败，当前执行环境也未安装官方 LayaAir CLI。因此**本次不是 V1.5.1 部署**，不得将 Pages 工作流成功视为新版本通过发布。
