import { Version, Common } from '../components/Index.js'
import HelpService from '../model/HelpService.js'


export class Help extends plugin {
    constructor() {
        super({
            name: '彼岸花插件帮助',
            dsc: '彼岸花插件帮助',
            event: 'message',
            priority: 1200,
            rule: [
                {
                    reg: "^#?(ly|lycoris|彼岸花|彼岸|ba)?(命令|帮助|菜单|help|说明|功能|指令|使用说明)$",
                    fnc: 'help'
                },
                {
                    reg: "^#?彼岸花版本$",
                    fnc: 'versionInfo'
                }
            ]
        })
    }

    async help(e) {

        let data = HelpService.help(e)
        return Common.render(
            'help/index',
            data,
            { e, scale: 1.2 }
        );
    }

    async versionInfo(e) {
        return await Common.render('help/version-info', {
            currentVersion: Version.version,
            changelogs: Version.changelogs,
            elem: 'dendro'
        }, { e, scale: 1.2 })
    }
}
