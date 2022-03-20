const express = require("express");
const schedule = require("node-schedule");
const getKucoinHotCoins = require("./exchanges/kucoin");

const CRON_JOB_STRING = "*/1 * * * *";
const app = express();

let hotCoins = [1, 2];

app.get("/", (req, res) => {
  res.send("<h1>Hello !</h1>");
});

app.get("/kucoinHotcoins", (req, res) => {
  res.sendFile(__dirname + "/data/kucoinHotCoins.json");
});

// hotCoins = getKucoinHotCoins();
const job = schedule.scheduleJob(CRON_JOB_STRING, () => {
  console.log("Running getKucoinHotCoins()");
  getKucoinHotCoins();
});

app.listen(5000);
