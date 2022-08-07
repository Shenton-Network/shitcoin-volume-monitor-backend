const express = require("express");
var cors = require("cors");
const schedule = require("node-schedule");
const moment = require("moment");
const getKucoinHotCoins = require("./exchanges/kucoin");
const getBinanceHotCoins = require("./exchanges/binance");

const CRON_JOB_STRING = "*/5 * * * *";
const app = express();
app.use(cors());
let port = process.env.PORT || 80;

let date = new Date();
let formatedTime = moment(date)
  .utcOffset("+0800")
  .format("YYYY-MMM-DD, HH:mm:ss [SGT]");

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/README.md");
});

app.get("/status", (req, res) => {
  res.send(`last updated at: ${formatedTime}`);
});

// kucoin route
app.get("/shitcoinAlert/exchange/kucoinHotcoin", (req, res) => {
  res.sendFile(__dirname + "/data/kucoinHotCoins.json");
});

// binance usdt route
app.get("/shitcoinAlert/exchange/binanceHotCoinsUsdtPair", (req, res) => {
  res.sendFile(__dirname + "/data/binanceHotCoinsUsdtPair.json");
});

// binance btc route
app.get("/shitcoinAlert/exchange/binanceHotCoinsBtcPair", (req, res) => {
  res.sendFile(__dirname + "/data/binanceHotCoinsBtcPair.json");
});

schedule.scheduleJob(CRON_JOB_STRING, () => {
  console.log("Running getKucoinHotCoins()");
  getKucoinHotCoins();
  getBinanceHotCoins();
  let date = new Date();
  formatedTime = moment(date)
    .utcOffset("+0800")
    .format("YYYY-MMM-DD, HH:mm:ss [SGT]");
});

app.listen(port);
