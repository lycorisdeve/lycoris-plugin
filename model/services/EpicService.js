import fetch from 'node-fetch'
/**
   * #epic
   * 获取Epic免费游戏信息
   */
async function epicGamesMsg() {

    /** Epic免费游戏接口地址 */
    const url = 'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=zh-CN&country=CN&allowCountries=CN'

    /** 调用接口获取数据 */
    let res = await fetch(url).catch((err) => logger.error(err))


    /** 判断接口是否请求成功 */
    if (!res) {
        logger.error('[Epic免费游戏信息] 接口请求失败')
        return await this.reply('Epic免费游戏信息接口请求失败')
    }

    /** 接口结果，json字符串转对象 */
    let data = await res.json()
    /** 获取游戏信息 */
    if (data && data.data && data.data.Catalog && data.data.Catalog.searchStore) {
        const games = data.data.Catalog.searchStore.elements.filter(
            (game) => game.promotions && game.promotions.promotionalOffers.length > 0 && game.price.totalPrice.discountPrice === 0
        );
        if (games.length === 0) {
            return '暂未找到正在促销的游戏...'
        }

        let msgList = [];

        for (let game of games) {
            try {
                let gamePromotions = game.promotions.promotionalOffers[0].promotionalOffers;
                let endDate = new Date(gamePromotions[0].endDate);
                let formattedEndDate = endDate.toLocaleString('zh-CN', {
                    timeZone: 'Asia/Shanghai',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                });
                let gameURL;
                if (game.url) {
                    gameURL = game.url;
                } else {
                    const slugs = [
                        ...(game.offerMappings || [])
                            .filter(x => x.pageType === 'productHome')
                            .map(x => x.pageSlug),
                        ...(game.catalogNs?.mappings || [])
                            .filter(x => x.pageType === 'productHome')
                            .map(x => x.pageSlug),
                        ...(game.customAttributes || [])
                            .filter(x => x.key.indexOf('productSlug') !== -1)
                            .map(x => x.value)
                    ];
                    gameURL = `https://store.epicgames.com/zh-CN${slugs.length > 0 ? `/p/${slugs[0]}` : ''}`;
                }
                let gamePrice = game.price.totalPrice.originalPrice;
                gamePrice = "￥" + (gamePrice / 100).toFixed(2);
                let titleText = `${game.title}`;
                let descText = `${game.description}`;
                let imagePath = ''
                for (const image of game.keyImages) {
                    if (image.url && ["Thumbnail", "VaultOpened", "DieselStoreFrontWide", "OfferImageWide"].includes(image.type)) {
                        imagePath = image.url
                        break;
                    }
                }
                let msg = `[CQ:image,file=${imagePath}]\n游 戏 名：${titleText}\n原     价：${gamePrice}\n结束时间：${formattedEndDate}\n发 行 商：${game.seller.name}\n简     介：${descText}点击下方链接免费入库：\n${gameURL}`
                msgList.push(msg)
            } catch (err) {
                logger.error(err);
            }
        }
        if (msgList.length > 0) {
            return msgList;
        } else {
            return '没有找到免费游戏哦';
        }


    } else {
        return '获取EPIC免费游戏信息失败';
    }


}

export default epicGamesMsg;