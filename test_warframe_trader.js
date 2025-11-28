import fetch from "node-fetch";
import moment from "moment";
import https from "https";

const url = "https://api.null00.com/world/ZHCN/";

async function getJsonData(url_arg) {
    const api_url = url + url_arg;
    const agent = api_url.startsWith("https:")
        ? new https.Agent({ rejectUnauthorized: false })
        : undefined;
    try {
        const resp = await fetch(api_url, { timeout: 10000, agent });
        return await resp.json();
    } catch (e) {
        console.error("Fetch error:", e);
        return null;
    }
}

function calculationNowTimeDiff(time) {
    const target =
        typeof time === "number" && time < 1e12
            ? moment(time * 1000)
            : moment(time);

    let diff = target.diff(moment());
    if (diff < 0) diff = -diff;

    const duration = moment.duration(diff);
    const days = Math.floor(duration.asDays());
    const hours = duration.hours();
    const minutes = duration.minutes();
    const seconds = duration.seconds();

    return `${days}天 ${hours}时 ${minutes}分 ${seconds}秒`;
}

async function trader() {
    console.log("Fetching trader info...");
    const voidTrader = await getJsonData("trader");
    console.log("Trader data:", JSON.stringify(voidTrader, null, 2));

    let arriveTitle;
    let arriveNode;
    let arriveTime;
    if (voidTrader) {
        const expiryTime = voidTrader.expiry;
        const activateTime = voidTrader.activation;
        const currentTime = moment().unix();

        if (currentTime < activateTime) {
            arriveTime = moment.unix(activateTime).format(`llll`);
            arriveTitle = `${voidTrader.character} 预计到达:`;
            arriveNode = `到达在:${voidTrader.node}`;
        } else if (currentTime > activateTime && currentTime < expiryTime) {
            arriveTitle = `${voidTrader.character} 滞留时间:`;
            arriveTime = `离开在:` + moment.unix(expiryTime).format(`llll`);
        } else {
            arriveTitle = `${voidTrader.character} 已离开`;
            arriveTime = ``;
        }
    } else {
        return "暂无奸商信息";
    }

    return `
    💰奸商💰       
==================
${arriveTitle}\n
${arriveNode}\n
${arriveTime}\n
==================`;
}

// Run the test
trader().then(result => {
    console.log("Result:");
    console.log(result);
});
