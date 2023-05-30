const moment = require("moment");
const Client = require("../models/Client");
const { randomNumber, getDateArray } = require("../functions/general");
const { InfluxDB, Point } = require("@influxdata/influxdb-client");

const NodeCache = require("node-cache");
const myCache = new NodeCache();

exports.getStats = async (req, res) => {
  try {
    let thermalData = [];

    new Array(100).fill(1).map((data) => {
      thermalData.push(Number(randomNumber(1, 300)));
    });

    const client = await Client.findById(req.userId);

    const url = process.env.INFLUX_URL || "";
    const token = process.env.INFLUX_TOKEN;
    const org = process.env.INFLUX_ORG || "";
    const timeout = Number(process.env.INFLUX_TIMEOUT) || 30000;

    const queryApi = new InfluxDB({ url, token, timeout }).getQueryApi(org);

    let totalQueryCondition = client?.measNodes?.filter((obj) => {
      return obj.name === "Solar" && obj.Type === "heat";
    });

    let str = "";
    totalQueryCondition?.map((cond) => {
      str += `r["MeasNode"] == "${cond.code}" or `;
    });

    str = str.substring(0, str.length - 3);

    const query = `
      from(bucket: "${client.buckets?.[0]}")
    |> range(start: -1h)
    |> filter(fn: (r) => r["_measurement"] == "Heat_Solar")
    |> filter(fn: (r) => ${str})
    |> filter(fn: (r) => r["Unit"] == "kW")
    |> filter(fn: (r) => r["_field"] == "actual")
    |> aggregateWindow(every: 2m, fn: last, createEmpty: false)
    |> yield(name: "last")
    `;

    const secondQuery = `
    from(bucket: "${client.buckets?.[0]}")
  |> range(start: -2h , stop: -1h)
  |> filter(fn: (r) => r["_measurement"] == "Heat_Solar")
  |> filter(fn: (r) => ${str})
  |> filter(fn: (r) => r["Unit"] == "kW")
  |> filter(fn: (r) => r["_field"] == "actual")
  |> last()
  `;

    const totalQuery = `
  from(bucket: "${client.buckets?.[0]}")
|> range(start: -1h)
|> filter(fn: (r) => r["_measurement"] == "Heat_Solar")
|> filter(fn: (r) => ${str})
|> filter(fn: (r) => r["Unit"] == "kW")
|> filter(fn: (r) => r["_field"] == "actual")
|> last()
`;

    let result = [];

    console.log("query", query);

    queryApi.queryRows(query, {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row);

        // result.push(o);
        result.push({
          minutes: String(moment(o._time).minutes()),
          value: Number(o._value.toFixed(3)),
        });
      },
      error(error) {
        console.error(error);
      },
      complete() {
        let resultBefore;
        queryApi.queryRows(secondQuery, {
          next(row, tableMeta) {
            const o = tableMeta.toObject(row);

            // result.push(o);
            resultBefore = o;
          },
          error(error) {
            console.error(error);
          },
          complete() {
            let resultTotal;
            queryApi.queryRows(totalQuery, {
              next(row, tableMeta) {
                const o = tableMeta.toObject(row);

                // result.push(o);
                resultTotal = o;
              },
              error(error) {
                console.error(error);
              },
              complete() {
                var sorted = result.sort((a, b) => {
                  return Number(a.minutes) - Number(b.minutes);
                });
                let payload = {
                  saved: 509235,
                  savedPercent: -2.3,
                  thermalProduction: resultTotal?._value?.toFixed(3),
                  thermalPercent: Number(
                    (
                      ((resultTotal?._value - resultBefore?._value) /
                        (resultTotal?._value + 0.1)) *
                      100
                    ).toFixed(2)
                  ),
                  thermalData: sorted,
                  resultBefore,
                  resultTotal,
                };
                return res.status(200).json(payload);
              },
            });
          },
        });
      },
    });
  } catch (err) {
    res.status(500).json({
      message: err.toString(),
    });
  }
};

exports.getHeatConsumption = async (req, res) => {
  try {
    const client = await Client.findById(req.userId);

    const url = process.env.INFLUX_URL || "";
    const token = process.env.INFLUX_TOKEN;
    const org = process.env.INFLUX_ORG || "";
    const timeout = Number(process.env.INFLUX_TIMEOUT) || 30000;

    const queryApi = new InfluxDB({ url, token, timeout }).getQueryApi(org);

    let totalQueryCondition = client?.measNodes?.filter((obj) => {
      return obj.name !== "Total" && obj.Type === "heat";
    });

    let str = "";
    totalQueryCondition?.map((cond) => {
      str += `r["MeasNode"] == "${cond.code}" or `;
    });

    str = str.substring(0, str.length - 3);

    const heatQuery = `from(bucket: "${client.buckets?.[0]}")
  |> range(start: -1d)
  |> filter(fn: (r) => r["_measurement"] == "Heat")
  |> filter(fn: (r) => ${str})
  |> filter(fn: (r) => r["Unit"] == "kW")
  |> filter(fn: (r) => r["_field"] == "actual")
  |> last()`;

    let result = [];

    queryApi.queryRows(heatQuery, {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row);

        let codeObj = client?.measNodes?.find((obj) => {
          return obj.code === o.MeasNode;
        });

        result.push({
          type: codeObj.name,
          sales: Number(o._value.toFixed()),
        });
      },
      error(error) {
        console.error(error);
      },
      complete() {
        var maximum = Math.max.apply(
          Math,
          result.map((o) => o.sales)
        );
        return res.status(200).json({ result, maximum: maximum * 1.2 });
      },
    });
  } catch (err) {
    res.status(500).json({
      message: err.toString(),
    });
  }
};
exports.getWaterConsumption = async (req, res) => {
  try {
    const client = await Client.findById(req.userId);

    const url = process.env.INFLUX_URL || "";
    const token = process.env.INFLUX_TOKEN;
    const org = process.env.INFLUX_ORG || "";
    const timeout = Number(process.env.INFLUX_TIMEOUT) || 30000;

    const queryApi = new InfluxDB({ url, token, timeout }).getQueryApi(org);

    let totalQueryCondition = client?.measNodes?.filter((obj) => {
      return obj.name === "Total" && obj.Type === "water";
    });

    let str = "";
    totalQueryCondition?.map((cond) => {
      str += `r["MeasNode"] == "${cond.code}" or `;
    });

    str = str.substring(0, str.length - 3);

    const waterQuery = `from(bucket: "${client.buckets?.[0]}")
  |> range(start: -1d)
  |> filter(fn: (r) => r["_measurement"] == "Water")
  |> filter(fn: (r) => ${str})
  |> filter(fn: (r) => r["Unit"] == "liter/s")
  |> filter(fn: (r) => r["_field"] == "actual")
  |> last()`;

    let result;

    queryApi.queryRows(waterQuery, {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row);
        result = Number(o._value.toFixed(2));
      },
      error(error) {
        console.error(error);
      },
      complete() {
        return res.status(200).json(result);
      },
    });

    // let payload = Number(Math.random() * (1 - 0) + 0);

    // res.status(200).json(payload);
  } catch (err) {
    res.status(500).json({
      message: err.toString(),
    });
  }
};

exports.getBatteryLevels = async (req, res) => {
  try {
    let batteryLevel = [
      {
        title: "Battery 1",
        percentage: 0.5,
        status: "Charging...",
      },
      {
        title: "Battery 2",
        percentage: 1,
        status: "Completed",
      },
      {
        title: "Battery 3",
        percentage: 0.5,
        status: "Charging...",
      },
      {
        title: "Battery 4",
        percentage: 0.25,
        status: "Stopped Charging...",
      },
    ];

    res.status(200).json(batteryLevel);
  } catch (err) {
    res.status(500).json({
      message: err.toString(),
    });
  }
};

exports.getPvProductionLive = async (req, res) => {
  try {
    let payload = {
      totalProduction: 7400,
      gridFeed: 30,
      selfConsumption: 30,
      batteryCharging: 40,
    };
    res.status(200).json(payload);
  } catch (err) {
    res.status(500).json({
      message: err.toString(),
    });
  }
};
