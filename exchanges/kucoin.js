const fs = require("fs");
const moment = require("moment");
const api = require("kucoin-node-api");
const Bottleneck = require("bottleneck/es5");

const config = {
  apiKey: "xxx",
  secretKey: "xxx",
  passphrase: "xxx",
  environment: "live",
};
const VOLUME_THRESHOLD = 500000.0;
const REST_CALL_INTERVAL_IN_MILLISECONDS = 200;
const limiter = new Bottleneck({
  minTime: REST_CALL_INTERVAL_IN_MILLISECONDS,
});

async function getHotCoinsDetail(hotCoins) {
  for (let i = 0; i < hotCoins.length; i++) {
    const ticker = hotCoins[i]["symbol"];
    console.log(`${ticker} [${i} / ${hotCoins.length}]`);

    // get 30day vol
    const timeNow = new Date().getTime() / 1000;
    const oneMonthAgo = timeNow - 2592000;
    params = {
      symbol: ticker,
      startAt: oneMonthAgo,
      endAt: timeNow,
      type: "1hour",
    };

    let shouldRetry = true;
    while (shouldRetry) {
      try {
        const lastMonthStats = await limiter.schedule(() =>
          api.getKlines(params)
        );
        let vol30Days = 0;
        for (let j = 0; j < lastMonthStats.data.length; j++) {
          vol30Days += parseFloat(lastMonthStats.data[j][6]);
        }

        hotCoins[i]["vol30Days"] = vol30Days;
        hotCoins[i]["oneDayOver30Days"] =
          (hotCoins[i]["vol24hr"] / hotCoins[i]["vol30Days"]) * 30;
        shouldRetry = false;
      } catch (err) {
        console.log(err.config.response);
        console.log("retrying...");
        hotCoins[i]["vol30Days"] = 0.4444444;
        hotCoins[i]["oneDayOver30Days"] = 0.4444444;
        continue;
      }
    }
  }

  // sort by vol ratio
  hotCoins.sort((a, b) => {
    return b["oneDayOver30Days"] - a["oneDayOver30Days"];
  });
  var obj = new Object();
  let date = new Date();
  let formatedTime = moment(date)
    .utcOffset("+0800")
    .format("YYYY-MMM-DD, HH:mm:ss [SGT]");
  obj["last_update"] = formatedTime;
  obj["min_24hr_volume"] = VOLUME_THRESHOLD;
  obj["count"] = hotCoins.length;
  obj["data"] = hotCoins;
  var json = JSON.stringify(obj);

  fs.writeFile("./data/kucoinHotCoins.json", json, (err) => {
    if (err) {
      throw err;
    }
    console.log("JSON data is saved to /data/kucoinHotCoins.");
  });
  return hotCoins;
}

function meetBar(coin) {
  if (!coin.symbol.endsWith("USDT")) {
    return false;
  }
  if (parseFloat(coin.volValue) < VOLUME_THRESHOLD) {
    return false;
  }
  if (coin.symbol.endsWith("3S-USDT")) {
    return false;
  }
  if (coin.symbol.endsWith("3L-USDT")) {
    return false;
  }
  return true;
}

async function runHotCoins() {
  console.log("getting hot coins");
  let hotCoins = [];

  api.init(config);
  api
    .getAllTickers()
    .then((r) => {
      r.data.ticker.forEach((element) => {
        if (meetBar(element)) {
          let coinObject = new Object();
          coinObject["symbol"] = element.symbol;
          coinObject["vol24hr"] = parseFloat(element.volValue);
          coinObject["lastPrice"] = parseFloat(element.last);
          coinObject["change24hr"] = parseFloat(element.changeRate * 100);
          hotCoins.push(coinObject);
        }
      });
    })
    .then(() => {
      getHotCoinsDetail(hotCoins);
    });
}

module.exports = runHotCoins;
