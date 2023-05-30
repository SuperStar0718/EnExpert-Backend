const { InfluxDB } = require("@influxdata/influxdb-client");
const Client = require("../models/Client");
const { randomNumber } = require("../functions/general");
const moment = require("moment");

exports.getEnergyGraphData = async (req, res) => {
  try {
    const { startDate, endDate, interval, aggregation } = req.body;

    let client = await Client.findById(req.userId);

    var start = moment(startDate).startOf("day").toISOString();
    var end = moment(endDate).endOf("day").toISOString();

    // Number(randomNumber(10, 500)),
    const url = process.env.INFLUX_URL || "";
    const token = process.env.INFLUX_TOKEN;
    const org = process.env.INFLUX_ORG || "";
    const timeout = Number(process.env.INFLUX_TIMEOUT) || 30000;

    const queryApi = new InfluxDB({ url, token, timeout }).getQueryApi(org);

    let result = [];
    let barData = [];
    let category = [];

    const analysisQuery = `
        from(bucket: "bucket_API_simulation_1")
        |> range(start: ${start} , stop : ${end})
        |> filter(fn: (r) => r["_measurement"] == "Power")
        |> filter(fn: (r) => r["ClientID"] == "${req.clientId}")
        |> filter(fn: (r) => r["MeasNode"] == "5179")
        |> keep(columns: ["_time", "_value" , "MeasNode"])
        |> aggregateWindow(every: ${interval}h, fn: mean, createEmpty: false)
        |> rename(columns: {_value: "value"})
        `;

    const fluxObserver = {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row);

        let index = category.findIndex((obj) => {
          return (
            obj.label === moment(o._time).tz("Europe/Rome").format("YYYY-MM-DD")
          );
        });
        if (index === -1) {
          category.push({
            label: moment(o._time).tz("Europe/Rome").format("YYYY-MM-DD"),
          });
        }
        barData.push({
          value: Number(randomNumber(1000, 50000)),
        });
        result.push({
          value: String(o.value),
        });
      },
      error(error) {
        console.error(error);
      },
      complete() {
        console.log("complete", result.length);

        res.status(200).json({
          categories: [
            {
              category,
            },
          ],
          axis: [
            {
              seriesname: "Daily Production",
              color: "#37A1DB",
              data: result,
            },
            {
              seriesname: "Hourly Production",
              renderas: "line",
              data: barData,
            },
          ],
        });
      },
    };
    queryApi.queryRows(analysisQuery, fluxObserver);
  } catch (err) {
    res.status(500).json({
      message: err.toString(),
    });
  }
};
