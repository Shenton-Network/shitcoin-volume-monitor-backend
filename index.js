const express = require("express");
const schedule = require("node-schedule");
const getKucoinHotCoins = require("./exchanges/kucoin");

const CRON_JOB_STRING = "*/5 * * * *";
const app = express();

let port = process.env.PORT || 80;

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/README.md");
});

app.get("/kucoinHotcoins", (req, res) => {
  res.sendFile(__dirname + "/data/kucoinHotCoins.json");
});

// hotCoins = getKucoinHotCoins();
const job = schedule.scheduleJob(CRON_JOB_STRING, () => {
  console.log("Running getKucoinHotCoins()");
  getKucoinHotCoins();
});

app.listen(port);
