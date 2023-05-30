const moment = require("moment");
const Client = require("../models/Client");
const { InfluxDB } = require("@influxdata/influxdb-client");

const { randomNumber, getDateArray } = require("../functions/general");
var zmq = require("zeromq");

const NodeCache = require("node-cache");
const myCache = new NodeCache();

exports.getMaxLoad = async (req, res) => {
  try {
    let payload = {
      maxLoad: 193.456,
      contributors: [
        {
          name: "Spa",
          percentage: 13,
        },
        {
          name: "E-mobility",
          percentage: 28,
        },
        {
          name: "Restaurant",
          percentage: 12,
        },
        {
          name: "Laundry",
          percentage: 47,
        },
        {
          name: "Total",
          percentage: 65,
        },
      ],
    };

    // var jsonObject = {
    //   REQUEST: "getMaxLoadPeak",
    //   clientId: req.clientId,
    // };
    // var stringObject = JSON.stringify(jsonObject);

    // const loadsock = new zmq.Request({
    //   immediate: true,
    //   sendTimeout: 5000,
    //   receiveTimeout: 5000,
    // });
    // loadsock.connect(process.env.ZEROMQ_CONNECTION_PROD);

    return res.status(200).json(payload);
    // await loadsock.send(stringObject).then(async () => {
    //   // const [result] = await loadsock.receive();
    //   // const data = JSON.parse(JSON.parse(result.toString()));
    //   // console.log("data", data);
    // });
  } catch (err) {
    res.status(500).json({
      message: err.toString(),
    });
  }
};

exports.getElectricConsumption = async (req, res) => {
  try {
    const url = process.env.INFLUX_URL || "";
    const token = process.env.INFLUX_TOKEN;
    const org = process.env.INFLUX_ORG || "";
    const timeout = Number(process.env.INFLUX_TIMEOUT) || 30000;

    const queryApi = new InfluxDB({ url, token, timeout }).getQueryApi(org);

    var dateArr = getDateArray(
      moment().startOf("month").format("YYYY-MM-DD"),
      moment().format("YYYY-MM-DD")
    );
    let result = [];

    // |> range(start: 2022-09-16T19:00:00.000Z , stop : 2022-09-30T18:59:59.999Z)

    const analysisQuery = `
    from(bucket: "bucket_API_simulation_1")
    |> range(start: ${req.body.timescale ? req.body.timescale : "-7d"})
    |> filter(fn: (r) => r["_measurement"] == "Power")
    |> filter(fn: (r) => r["ClientID"] == "${req.clientId}")
    |> filter(fn: (r) => r["MeasNode"] == "5179")
    |> keep(columns: ["_time", "_value" , "MeasNode"])
    |> aggregateWindow(every: ${
      req.body.filter ? req.body.filter : "15m"
    }, fn: mean, createEmpty: false)
    |> rename(columns: {_value: "value"})
    `;

    const fluxObserver = {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row);
        result.push({
          // Date: o._time,
          Date: moment(o._time).format("DD MMM, hh:mm a"),
          scales: Number((o.value / 1000).toFixed(2)),
          // scales: Number(o.value.toFixed(2) / 1000).toLocaleString("de-DE"),
        });
      },
      error(error) {
        console.error(error);
      },
      complete() {
        res.status(200).json(result);
      },
    };
    queryApi.queryRows(analysisQuery, fluxObserver);
  } catch (err) {
    res.status(500).json({
      message: err.toString(),
    });
  }
};

exports.getMonthlyConsumption = async (req, res) => {
  try {
    var month = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    var dateArr = moment().format("MM");

    let resultArr = [];

    month?.slice(0, Number(dateArr)).map((date) => {
      resultArr.push({
        type: date,
        interval: date,
        sales: Number(randomNumber(10, 200)),
      });
    });

    return res.status(200).json(resultArr);
  } catch (err) {
    res.status(500).json({
      message: err.toString(),
    });
  }
};
