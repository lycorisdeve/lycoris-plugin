# 项目说明

- 项目名称：Lycoris-Plugin。
- 项目用途：Yunzai-Bot 附属插件，提供资讯推送、图片查询、签到、生活工具等指令。
- 主要技术栈：JavaScript ES Modules、YAML、SQLite（better-sqlite3）、RSS、HTML/CSS 图片模板。
- 运行环境：Node.js，部署在 Yunzai-Bot 的 `plugins/lycoris-plugin` 下；依赖宿主提供的 plugin、Bot、logger、redis 和 Puppeteer 等能力，不能作为独立应用启动。
- 包管理工具：pnpm，仓库包含 `pnpm-lock.yaml` 和 `pnpm-workspace.yaml`。
- 主要源码目录：`apps/` 为指令入口，`components/` 为公共组件，`model/services/` 为业务服务，`model/sqlite3/` 为数据库封装，`utils/` 为工具。
- 配置与资源：`config/default_config/` 为默认配置，`config/config/` 为本地配置，`resources/` 为模板及静态资源。
- 测试目录：`tests/`，使用 Node.js 内置测试运行器；宿主依赖通过 VM 模块隔离，`package.json` 未配置测试脚本。
- 构建产物目录：没有构建步骤，宿主直接加载源码。

## 模块约定

- 图片、回复、错误提示及日志不得泄露 API 地址、接口路径、密钥或原始请求错误；接口信息仅用于内部请求，展示内容须过滤接口信息。

- `index.js` 自动扫描 `apps/*.js`，每个文件只注册第一个导出类；一个入口文件应只导出一个插件类。
- `apps/Ai.js` 包含 AI 新闻、模型排行榜；保留 `aiNews`、`arenaRank` 两份配置及各自定时任务。
- `apps/DailyLife.js` 包含日期提醒、饮食推荐与菜单管理；保留 `dateReminder` 配置。
- 合并功能时保留指令正则、权限、优先级、配置键和数据存储方式。

## 常用检查

- 每次提交、推送代码前必须同步更新根目录 `CHANGELOG.md`，记录本次实际变更和必要的使用说明；保持现有 `# 版本号`、`* 条目` 格式，以兼容版本页面。不得遗漏日志后直接提交或推送。

- 单文件语法检查：`node --check apps/Ai.js`。
- PowerShell 检查全部入口：`Get-ChildItem apps/*.js | ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE -ne 0) { throw $_.FullName } }`。
- 修改检查：`git diff --check`。
- 回归测试：`node --experimental-vm-modules --test tests/*.test.js`。
- 完整运行验证：在 Yunzai-Bot 环境重启插件，验证手动指令、模板渲染和定时推送；语法检查不能替代宿主运行验证。
