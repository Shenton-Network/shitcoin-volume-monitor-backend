const fs = require("fs");
const moment = require("moment");
const { Spot } = require("@binance/connector");
const apiKey = "";
const apiSecret = "";
const client = new Spot(apiKey, apiSecret);
var Bottleneck = require("bottleneck/es5");
const limiter = new Bottleneck({
  minTime: 100,
});
const config = {
  apiKey: "xxx",
  secretKey: "xxx",
  passphrase: "xxx",
  environment: "live",
};

async function getHotCoinsDetail(hotCoins) {
  let liveHotCoins = [];
  for (let i = 0; i < hotCoins.length; i++) {
    const ticker = hotCoins[i]["symbol"];

    // get 24hr vol
    let shouldRetry = true;
    while (shouldRetry) {
      try {
        const lastDayStats = await limiter.schedule(() => client.ticker24hr(ticker));
        hotCoins[i]["vol24hr"] = parseFloat(lastDayStats.data.quoteVolume);
        hotCoins[i]["lastPrice"] = parseFloat(lastDayStats.data.lastPrice);
        hotCoins[i]["change24hr"] = parseFloat(lastDayStats.data.priceChangePercent);
        if (hotCoins[i]["vol24hr"] != 0) {
          liveHotCoins.push(hotCoins[i]);
        }
        shouldRetry = false;
      } catch (err) {
        console.log(err.config.response);
        console.log("retrying...");
        continue;
      }
    }
  }

  for (let k = 0; k < liveHotCoins.length; k++) {
    const ticker = liveHotCoins[k]["symbol"];
    console.log(`${ticker} ${k} / ${liveHotCoins.length}`);
    // get 30day vol
    const timeNow = new Date().getTime();
    const oneMonthAgo = timeNow - 2592000000;
    options = {
      startTime: oneMonthAgo,
      endTime: timeNow,
      limit: 720,
    };

    let shouldRetry = true;
    while (shouldRetry) {
      try {
        const lastMonthStats = await limiter.schedule(() => client.klines(ticker, "1h", options));
        let vol30Days = 0;
        for (let j = 0; j < lastMonthStats.data.length; j++) {
          vol30Days += parseFloat(lastMonthStats.data[j][7]);
        }
        liveHotCoins[k]["vol30Days"] = vol30Days == 0 ? 0.444 : vol30Days;
        // calculate heat score
        let heatScore = (liveHotCoins[k]["vol24hr"] / liveHotCoins[k]["vol30Days"]) * 30;
        liveHotCoins[k]["oneDayOver30Days"] = heatScore ?? 0;
        shouldRetry = false;
      } catch (err) {
        console.log(err.config.response);
        console.log("retrying...");
        hotCoins[i]["vol30Days"] = 0.4444444;
        hotCoins[i]["oneDayOver30Days"] = 0.4444444;
        continue;
      }
    }

    console.log(liveHotCoins[k]);
  }

  // sort by vol ratio
  liveHotCoins.sort((a, b) => {
    return b["oneDayOver30Days"] - a["oneDayOver30Days"];
  });

  // write to file
  var obj = new Object();
  let date = new Date();
  let formatedTime = moment(date).utcOffset("+0800").format("YYYY-MMM-DD, HH:mm:ss [SGT]");
  obj["last_update"] = formatedTime;
  obj["min_24hr_volume"] = 0;
  obj["count"] = liveHotCoins.length;
  obj["data"] = liveHotCoins;
  var json = JSON.stringify(obj);

  fs.writeFile("./data/binanceHotCoinsUsdtPair.json", json, (err) => {
    if (err) {
      throw err;
    }
    console.log("JSON data is saved to /data/binanceHotCoinsUsdtPair.json");
  });
}

// block list
function meetBar(coin) {
  if (!coin.symbol.endsWith("USDT")) {
    return false;
  }
  if (coin.symbol.endsWith("3S-USDT")) {
    return false;
  }
  if (coin.symbol.endsWith("3L-USDT")) {
    return false;
  }
  if (coin.symbol.startsWith("TUSD")) {
    return false;
  }
  if (coin.symbol.startsWith("USDC")) {
    return false;
  }
  if (coin.symbol.startsWith("USDP")) {
    return false;
  }
  return true;
}

function runHotCoins() {
  console.log("getting hot coins from binance");
  let hotCoins = [];
  client
    .exchangeInfo()
    .then((res) => {
      res.data.symbols.forEach((element) => {
        if (meetBar(element)) {
          let coinObject = new Object();
          coinObject["symbol"] = element.symbol;
          hotCoins.push(coinObject);
        }
      });
      console.log(hotCoins.length);
    })
    .then(() => {
      getHotCoinsDetail(hotCoins);
    });
}

module.exports = runHotCoins;
