const { InfluxDB, Point } = require("@influxdata/influxdb-client");
const moment = require("moment");

exports.getHistogramDataFromInflux = function (clientId, code, timescale) {
  return new Promise(function (resolve, reject) {
    try {
      const url = process.env.INFLUX_URL || "";
      const token = process.env.INFLUX_TOKEN;
      const org = process.env.INFLUX_ORG || "";
      const timeout = Number(process.env.INFLUX_TIMEOUT) || 30000;

      const queryApi = new InfluxDB({ url, token, timeout }).getQueryApi(org);

      let days = timescale === "week" ? 7 : timescale === "month" ? 30 : 30;

      let result = [];

      const heatmapQuery = `
                from(bucket: "bucket_API_simulation_1")
                |> range(start: -${days}d)
                |> filter(fn: (r) => r["_measurement"] == "Power")
                |> filter(fn: (r) => r["ClientID"] == "${clientId}")
                |> filter(fn: (r) => r["MeasNode"] == "${code}")
                |> keep(columns: ["_time", "_value"])
                |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
                |> rename(columns: {_value: "value" , _time : "time"})
                `;
      const fluxObserver = {
        next(row, tableMeta) {
          const o = tableMeta.toObject(row);
          moment;
          result.push({
            // ...o,
            value: o.value,
            time: moment(o.time).format("HHa"),
          });
        },
        error(error) {
          console.error(error);
        },
        complete() {
          resolve(result);
        },
      };

      queryApi.queryRows(heatmapQuery, fluxObserver);
    } catch (err) {
      res.status(500).json({
        message: err.toString(),
      });
    }
  });
};

exports.getHeatmapDataFromInflux = function (filter, bucket, code, interval) {
  return new Promise(function (resolve, reject) {
    try {
      const url = process.env.INFLUX_URL || "";
      const token = process.env.INFLUX_TOKEN;
      const org = process.env.INFLUX_ORG || "";
      const timeout = Number(process.env.INFLUX_TIMEOUT) || 30000;

      const queryApi = new InfluxDB({ url, token, timeout }).getQueryApi(org);

      let result = [];

      // |> filter(fn: (r) => r["ClientID"] == "${clientId}")
      const heatmapQuery = `
      from(bucket: "${bucket}")
      |> range(start: -${filter})
      |> filter(fn: (r) => r["_measurement"] == "Power")
      |> filter(fn: (r) => r["MeasNode"] == "${code}")
      |> keep(columns: ["_time", "_value"])
      |> aggregateWindow(every: ${interval}, fn: mean, createEmpty: false)
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
          resolve(result);
        },
      };

      queryApi.queryRows(heatmapQuery, fluxObserver);
    } catch (err) {
      res.status(500).json({
        message: err.toString(),
      });
    }
  });
};
