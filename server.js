require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const moment = require("moment");
const {
  getHistogramDataFromInflux,
  getHeatmapDataFromInflux,
} = require("./functions/influxFunctions");
const Histogram = require("./models/Histogram");
const Heatmap = require("./models/Heatmap");
const Client = require("./models/Client");
require("moment-timezone");
// const multer = require("multer");
const CronJob = require("cron").CronJob;
const app = express();
http.createServer(app);

const port = process.env.PORT || 5000;

//init middleware
app.use(express.json({ extended: false }));
app.use(cors());

app.get("/", (req, res) => {
  res.json({
    message: "Server running " + `at port ${port}`,
  });
});

// app.use(multer().array("pictures"));

//define routes
app.use("/client", require("./routes/client"));
app.use("/home", require("./routes/home"));
app.use("/auth", require("./routes/auth"));
app.use("/loadpeak", require("./routes/loadpeak"));
app.use("/influx", require("./routes/influx"));
app.use("/live", require("./routes/live"));
app.use("/digitalization", require("./routes/digitalization"));
app.use("/analysis", require("./routes/analysis"));
app.use("/energy", require("./routes/energy"));
app.use("/logs", require("./routes/logs"));

mongoose
  .connect(
    "mongodb+srv://yasir:6g4d8697s8k7Jx02@cluster0.fiwvh.mongodb.net/enexpert?retryWrites=true&w=majority",
    {
      useUnifiedTopology: true,
      useNewUrlParser: true,
      useFindAndModify: false,
    }
  )
  .then((result) => {
    app.listen(port);
    console.log(`Connected to PORT ${port} `);
  })
  .catch((err) => {
    console.log(err);
  });

const updateClientHistogram = new CronJob(
  "0 * * * *", //every 1 hour
  // "51 * * * *", //at specific minute of every hour
  async function () {
    console.log("Updating Client Histogram Data...");

    Histogram.find().then((histograms) => {
      histograms?.map(async (data) => {
        await getHistogramDataFromInflux(
          data.clientId,
          data.code,
          data.timescale
        ).then(async (result) => {
          data.values = result;
          await data.save();
          console.log(
            "client : " +
              data.clientId +
              " code : " +
              data.code +
              " updated successfully..."
          );
        });
      });
    });
  },
  null,
  null,
  "Asia/Karachi"
);

const updateClientHeatmap = new CronJob(
  "0 * * * *", //every 1 hour
  // "51 * * * *", //at specific minute of every hour
  async function () {
    console.log("Updating Client Heatmap Data...");

    console.time("find");
    Heatmap.find()
      .select("client timescale clientId")
      .lean()
      .then((histograms) => {
        console.timeEnd("find");

        histograms?.map(async (data) => {
          let client = await Client.findById(data.client);

          let interval =
            data.timescale === "24h"
              ? "1h"
              : data.timescale === "6d"
              ? "6h"
              : "24h";

          let finalResult = [];

          client?.measNodes?.map(async (node) => {
            if (node.name !== "Total") {
              await getHeatmapDataFromInflux(
                data.timescale,
                client.clientId,
                node.code,
                interval
              ).then(async (result) => {
                let valueArr = [];

                result?.map((resultData) => {
                  valueArr.push({
                    time: moment(resultData._time)
                      .tz("Europe/Rome")
                      .format("YYYY-MM-DD , HH:MM a"),
                    value: resultData._value?.toFixed(2),
                  });
                });

                finalResult.push({
                  name: node.name,
                  values: valueArr,
                });
                console.log(
                  "client : " +
                    data.clientId +
                    " code : " +
                    node.code +
                    " timescale  : " +
                    data.timescale +
                    " heatmap data updated successfully..."
                );
                if (finalResult.length === client?.measNodes?.length - 1) {
                  await Heatmap.findOneAndUpdate(
                    {
                      timescale: data.timescale,
                      clientId: client.clientId,
                      client: client._id,
                    },
                    {
                      data: finalResult,
                    },
                    { new: true, upsert: true }
                  );
                }
              });
            }
          });
        });
      });
  },
  null,
  null,
  "Asia/Karachi"
);

// updateClientHistogram.start();
// updateClientHeatmap.start();
