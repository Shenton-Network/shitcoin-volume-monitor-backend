const express = require("express");
const schedule = require("node-schedule");
const moment = require("moment");
const getKucoinHotCoins = require("./exchanges/kucoin");

const CRON_JOB_STRING = "*/5 * * * *";
const app = express();
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

app.get("/kucoinHotcoins", (req, res) => {
  res.sendFile(__dirname + "/data/kucoinHotCoins.json");
});

// hotCoins = getKucoinHotCoins();
schedule.scheduleJob(CRON_JOB_STRING, () => {
  console.log("Running getKucoinHotCoins()");
  getKucoinHotCoins();
  let date = new Date();
  formatedTime = moment(date)
    .utcOffset("+0800")
    .format("YYYY-MMM-DD, HH:mm:ss [SGT]");
});

app.listen(port);
