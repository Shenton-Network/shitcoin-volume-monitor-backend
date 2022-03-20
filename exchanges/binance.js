const { Spot } = require("@binance/connector");
const api = new Spot();
var Bottleneck = require("bottleneck/es5");
const limiter = new Bottleneck({
  minTime: 3000,
});
const config = {
  apiKey: "xxx",
  secretKey: "xxx",
  passphrase: "xxx",
  environment: "live",
};

async function getHotCoinsDetail(hotCoins) {
  for (let i = 0; i < hotCoins.length; i++) {
    const ticker = hotCoins[i]["symbol"];
    console.log(`${ticker} ${i} / ${hotCoins.length}`);
    // get 24hr vol
    const lastDayStats = await limiter.schedule(() => api.get24hrStats(ticker));
    hotCoins[i]["vol24hr"] = parseFloat(lastDayStats.data.volValue);
    hotCoins[i]["lastPrice"] = parseFloat(lastDayStats.data.last);
    hotCoins[i]["change24hr"] = parseFloat(lastDayStats.data.changeRate * 100);

    // get 30day vol
    const timeNow = new Date().getTime() / 1000;
    const oneMonthAgo = timeNow - 2592000;
    params = {
      symbol: ticker,
      startAt: oneMonthAgo,
      endAt: timeNow,
      type: "1hour",
    };
    const lastMonthStats = await api.getKlines(params);
    let vol30Days = 0;
    for (let j = 0; j < lastMonthStats.data.length; j++) {
      vol30Days += parseFloat(lastMonthStats.data[j][6]);
    }

    hotCoins[i]["vol30Days"] = vol30Days;
    hotCoins[i]["oneDayOver30Days"] =
      (hotCoins[i]["vol24hr"] / hotCoins[i]["vol30Days"]) * 30;
    console.log(hotCoins[i]);
  }
  console.log(hotCoins);
}

function runHotCoins() {
  console.log("getting hot coins");
  let hotCoins = [];

  api.exchangeInfo().then((res) => console.log(res));
  //   api
  //     .getSymbols()
  //     .then((r) => {
  //       r.data.forEach((element) => {
  //         if (element.symbol.endsWith("USDT")) {
  //           let coinObject = new Object();
  //           coinObject["symbol"] = element.symbol;
  //           hotCoins.push(coinObject);
  //         }
  //       });
  //     })
  //     .then(() => {
  //       getHotCoinsDetail(hotCoins);

  //     });
}

module.exports = runHotCoins;
