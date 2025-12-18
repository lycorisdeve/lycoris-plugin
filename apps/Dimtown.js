import fetch from "node-fetch";
import * as cheerio from "cheerio";

/** 获取图片数据 */
async function getDimTownData(url) {
  try {
    let response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0",
        "Referer": "https://dimtown.com/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    let html = await response.text();
    let $ = cheerio.load(html);

    // Check if we are on a list page (look for article links)
    const articleLinks = [];
    $(".kzpost-data > a").each((i, elem) => {
      const href = $(elem).attr("href");
      if (href) articleLinks.push(href);
    });

    if (articleLinks.length > 0) {
      // We are on a list page, pick a random article
      const randomArticleUrl = articleLinks[Math.trunc(Math.random() * articleLinks.length)];
      logger.info(`Fetched list page, redirecting to article: ${randomArticleUrl}`);

      response = await fetch(randomArticleUrl, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0",
          "Referer": url,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        },
        redirect: "follow",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} for article`);
      html = await response.text();
      $ = cheerio.load(html);
      url = randomArticleUrl; // Update url for return
    }

    const images = [];
    // Selectors: Priority to gallery containers, then generic content
    const imgSelectors = [
      ".hig-image-container img",
      ".entry-content img",
      ".post-content img",
      ".content img",
      ".single-content img",
      "article img"
    ];

    $(imgSelectors.join(", ")).each((i, elem) => {
      let src =
        $(elem).attr("data-src") ||
        $(elem).attr("src") ||
        $(elem).attr("data-original") ||
        $(elem).attr("data-url");

      if (src) {
        // Clean up src
        src = src.trim();
        if (src.startsWith("//")) src = "https:" + src;
        else if (src.startsWith("/")) src = "https://dimtown.com" + src;
        else if (!src.startsWith("http")) {
          try {
            src = new URL(src, url).href;
          } catch (e) {
            // Ignore invalid URLs
            return;
          }
        }

        // Filter: Ignore small icons, avatars, layout images
        if (
          src.includes("avatar") ||
          src.includes("icon") ||
          src.includes("logo") ||
          src.endsWith(".svg") ||
          src.includes("wp-content/plugins") ||
          src.includes("wp-content/themes")
        ) {
          return;
        }

        images.push({ src });
      }
    });

    const title =
      $(".kz-single-data h1, h1.entry-title, .post-title, .entry-header h1")
        .first()
        .text()
        .trim() || "次元小镇图片";
    return [images, url, title];
  } catch (error) {
    logger.error("获取DimTown数据失败:", error);
    return [[], url, "获取失败"];
  }
}

/** 指令映射 */
const commands = {
  cos: () => {
    const urls = [
      `https://dimtown.com/cosplay/page/${Math.trunc(Math.random() * 296) + 1}`,
      `https://mikagogo.com/cosplay/page/${Math.trunc(Math.random() * 143) + 1}`,
    ];
    return urls[Math.trunc(Math.random() * urls.length)];
  },
  pixiv: () => {
    const urls = [
      `https://dimtown.com/pixiv-illustration/page/${Math.trunc(Math.random() * 58) + 1}`,
      `https://mikagogo.com/pixiv-illustration/page/${Math.trunc(Math.random() * 30) + 1}`,
    ];
    return urls[Math.trunc(Math.random() * urls.length)];
  },
  sifu: () => `https://dimtown.com/sifu/page/${Math.trunc(Math.random() * 55) + 1}`,
  jk: () => `https://dimtown.com/jk/page/${Math.trunc(Math.random() * 8) + 1}`,
  hanfu: () => `https://dimtown.com/hanfu/page/${Math.trunc(Math.random() * 4) + 1}`,
  lolita: () => `https://dimtown.com/lolita/page/${Math.trunc(Math.random() * 12) + 1}`,
  miaotx: () => `https://dimtown.com/miaotx/page/${Math.trunc(Math.random() * 13) + 1}`,
  illustration: () => `https://dimtown.com/illustration/page/${Math.trunc(Math.random() * 34) + 1}`,
  tujihuace: () => `https://dimtown.com/tujihuace/page/${Math.trunc(Math.random() * 2) + 1}`,
  bizhi: (msg) => {
    let urls = [];
    if (msg.includes("手机")) {
      urls = [
        `https://dimtown.com/acg-wallpaper/page/${Math.trunc(Math.random() * 50) + 1}`,
        `https://mikagogo.com/acg-wallpaper/page/${Math.trunc(Math.random() * 34) + 1}`,
        `https://yiimii.com/m-wallpaper/page/${Math.trunc(Math.random() * 10) + 1}`,
      ];
    } else if (msg.includes("电脑") || msg.includes("平板")) {
      urls = [
        `https://dimtown.com/pc-wallpaper/page/${Math.trunc(Math.random() * 14) + 1}`,
        `https://mikagogo.com/pc-wallpaper/page/${Math.trunc(Math.random() * 2) + 1}`,
        `https://yiimii.com/pc-wallpaper/page/${Math.trunc(Math.random() * 8) + 1}`,
      ];
    } else if (msg.includes("汽车")) {
      urls = [`https://yiimii.com/car-wallpaper/page/${Math.trunc(Math.random() * 1) + 1}`];
    } else if (msg.includes("游戏")) {
      urls = [
        `https://yiimii.com/game-wallpaper/page/${Math.trunc(Math.random() * 8) + 1}`,
        `https://yiimii.com/tag/ys-wallpaper/page/${Math.trunc(Math.random() * 2) + 1}`,
        `https://yiimii.com/tag/sr/page/${Math.trunc(Math.random() * 2) + 1}`,
        `https://yiimii.com/tag/bilandangan/page/${Math.trunc(Math.random() * 2) + 1}`,
      ];
    } else if (msg.includes("动漫")) {
      urls = [
        `https://yiimii.com/anime-wallpaper/page/${Math.trunc(Math.random() * 4) + 1}`,
        `https://mikagogo.com/acg-wallpaper/page/${Math.trunc(Math.random() * 34) + 1}`,
        `https://dimtown.com/bizhi/page/${Math.trunc(Math.random() * 63) + 1}`,
      ];
    } else if (msg.includes("风景")) {
      urls = [`https://yiimii.com/fengjing-wallpaper/page/${Math.trunc(Math.random() * 2) + 1}`];
    } else {
      urls = [
        `https://dimtown.com/bizhi/page/${Math.trunc(Math.random() * 63) + 1}`,
        `https://yiimii.com/meinv-wallpaper/page/${Math.trunc(Math.random() * 2) + 1}`,
        `https://yiimii.com/fengjing-wallpaper/page/${Math.trunc(Math.random() * 2) + 1}`,
      ];
    }
    return urls[Math.trunc(Math.random() * urls.length)];
  },
};

export class DimTownPlugin extends plugin {
  constructor() {
    super({
      name: "次元小镇",
      event: "message",
      priority: 5000,
      rule: [
        {
          reg: /^#?(次元|小镇|次元小镇|cy|xz|cyxz)?(cos|pixiv|p站|二次元|私服|jk|JK|汉服|lolita|洛丽塔|头像|插画|图集|画册|图集画册|(手机|电脑|平板|汽车|游戏|动漫|风景)?壁纸)$/,
          fnc: "handleCommand",
        },
      ],
    });
  }

  async sendImages(e, url) {
    try {
      const [images, link, title] = await getDimTownData(url);
      if (images.length > 0) {
        e.reply(`正在获取 ${title} ~~~`);
        e.reply(`原文链接: ${link}`);
        for (const img of images) {
          e.reply(segment.image(img.src));
        }
      } else {
        e.reply("没有找到图片");
      }
    } catch (error) {
      logger.error(error);
      e.reply("获取失败，请稍后重试");
    }
  }

  async handleCommand(e) {
    const msg = e.msg.replace(/^#?/, "").toLowerCase();
    let type = null;
    let url = null;

    if (msg.includes("cos")) {
      type = "cos";
    } else if (
      msg.includes("pixiv") ||
      msg.includes("p站") ||
      msg.includes("二次元")
    ) {
      type = "pixiv";
    } else if (msg.includes("私服")) {
      type = "sifu";
    } else if (msg.includes("jk")) {
      type = "jk";
    } else if (msg.includes("汉服")) {
      type = "hanfu";
    } else if (msg.includes("lolita") || msg.includes("洛丽塔")) {
      type = "lolita";
    } else if (msg.includes("头像")) {
      type = "miaotx";
    } else if (msg.includes("插画")) {
      type = "illustration";
    } else if (msg.includes("图集") || msg.includes("画册")) {
      type = "tujihuace";
    } else if (msg.includes("壁纸")) {
      type = "bizhi";
    }

    if (type) {
      if (type === "bizhi") {
        url = commands.bizhi(msg);
      } else {
        url = commands[type]();
      }
      if (url) {
        await this.sendImages(e, url);
        return true;
      }
    }
    return false;
  }
}
