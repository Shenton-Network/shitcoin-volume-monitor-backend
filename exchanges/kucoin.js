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
const REST_CALL_INTERVAL_IN_MILLISECONDS = 100;
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
    } catch (err) {
      console.log(err);
      hotCoins[i]["vol30Days"] = 0.444;
      hotCoins[i]["oneDayOver30Days"] = 0.444;
      continue;
    }
  }

  hotCoins.sort((a, b) => {
    return b["oneDayOver30Days"] - a["oneDayOver30Days"];
  });
  var obj = new Object();
  let date = new Date();
  let formatedTime = moment(date).format("YYYY-MMM-DD, HH:mm:ss");
  obj["update_timestamp"] = formatedTime;
  obj["data"] = hotCoins;
  var json = JSON.stringify(obj);

  fs.writeFile("kucoinHotCoins.json", json, (err) => {
    if (err) {
      throw err;
    }
    console.log("JSON data is saved to /kucoinHotCoins.");
  });
  return hotCoins;
}

async function runHotCoins() {
  console.log("getting hot coins");
  let hotCoins = [];

  api.init(config);
  api
    .getAllTickers()
    .then((r) => {
      r.data.ticker.forEach((element) => {
        if (
          element.symbol.endsWith("USDT") &&
          parseFloat(element.volValue) > VOLUME_THRESHOLD
        ) {
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
