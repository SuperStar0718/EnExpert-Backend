const moment = require("moment");
const Client = require("../models/Client");
const { randomNumber, getDateArray } = require("../functions/general");
var zmq = require("zeromq");
const { InfluxDB, Point } = require("@influxdata/influxdb-client");

const NodeCache = require("node-cache");
const myCache = new NodeCache();

exports.testInflux = async (req, res) => {
  try {
    const url = process.env.INFLUX_URL || "";
    const token = process.env.INFLUX_TOKEN;
    const org = process.env.INFLUX_ORG || "";
    const timeout = Number(process.env.INFLUX_TIMEOUT) || 30000;

    const queryApi = new InfluxDB({ url, token, timeout }).getQueryApi(org);

    let result = [];
    let finalResult = [];

    let client = await Client.findById("630477966bc9c440918e2966");

    client?.measNodes?.map((node) => {
      const heatmapQuery = `
        from(bucket: "bucket_API_simulation_1")
        |> range(start: -24d)
        |> filter(fn: (r) => r["_measurement"] == "Power")
        |> filter(fn: (r) => r["ClientID"] == "${client.clientId}")
        |> filter(fn: (r) => r["MeasNode"] == "${node.code}")
        |> keep(columns: ["_time", "_value"])
        |> aggregateWindow(every: 24h, fn: mean, createEmpty: false)
        |> yield(name: "mean")
          `;
      const fluxObserver = {
        next(row, tableMeta) {
          const o = tableMeta.toObject(row);
          result.push(o);
        },
        error(error) {
          console.error(error);
        },
        complete() {
          let valueArr = [];
          result?.map((data) => {
            valueArr.push({ time: data._time, value: data._value?.toFixed(2) });
          });

          finalResult.push({
            name: node.name,
            values: valueArr,
          });
          if (finalResult.length === client?.measNodes?.length) {
            return res.status(200).json({
              dataRecieved: result.length,
              data: finalResult,
            });
          }
        },
      };

      queryApi.queryRows(heatmapQuery, fluxObserver);
    });

    // const electricQuery =
    //   'from(bucket:"bucket_API_simulation_1") |> range(start: -2s) |> filter(fn:(r) => r._measurement == "Power") |> yield(name: "last")';
  } catch (err) {
    res.status(500).json({
      message: err.toString(),
    });
  }
};
