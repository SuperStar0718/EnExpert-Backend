const { randomNumber, getDateArray } = require("../functions/general");
const { getHistogramDataFromInflux } = require("../functions/influxFunctions");
const { InfluxDB, Point } = require("@influxdata/influxdb-client");
const Client = require("../models/Client");
const Histogram = require("../models/Histogram");

exports.getDigitalization = async (req, res) => {
  try {
    const data = [
      {
        main: "Grid",
        child1: "",
        child2: "",
        end: "CHP/BHKW",
        value: Number(randomNumber(10, 500)),
      },
      {
        main: "Grid",
        child1: "Spa",
        child2: "",
        end: "",
        value: Number(randomNumber(10, 500)),
      },
      {
        main: "Grid",
        child1: "Spa",
        child2: "",
        end: "CHP/BHKW",
        value: Number(randomNumber(10, 500)),
      },
      {
        main: "",
        child1: "Spa",
        child2: "Battery",
        end: "",
        value: Number(randomNumber(10, 500)),
      },
      {
        main: "",
        child1: "",
        child2: "Battery",
        end: "PV",
        value: Number(randomNumber(10, 500)),
      },
      {
        main: "Grid",
        child1: "E-Mobility",
        child2: "",
        end: "",
        value: Number(randomNumber(10, 500)),
      },
      {
        main: "",
        child1: "E-Mobility",
        child2: "Battery",
        end: "",
        value: Number(randomNumber(10, 500)),
      },
      {
        main: "Grid",
        child1: "Restaurant",
        child2: "",
        end: "",
        value: Number(randomNumber(10, 500)),
      },
      {
        main: "",
        child1: "Restaurant",
        child2: "Battery",
        end: "",
        value: Number(randomNumber(10, 500)),
      },

      {
        main: "Grid",
        child1: "Laundry",
        child2: "",
        end: "",
        value: Number(randomNumber(10, 500)),
      },
      {
        main: "",
        child1: "Laundry",
        child2: "Battery",
        end: "",
        value: Number(randomNumber(10, 500)),
      },
      {
        main: "Grid",
        child1: "",
        child2: "",
        end: "PV",
        value: Number(randomNumber(10, 500)),
      },
    ];

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({
      message: err.toString(),
    });
  }
};

exports.getHistogramData = async (req, res) => {
  try {
    Histogram.findOne({
      code: req.body.code,
      timescale: req.body.filter,
      client: req.userId,
    }).then(async (histogramData) => {
      if (histogramData) {
        // console.log("in if");
        return res.status(200).json({
          data: histogramData,
        });
      } else {
        // console.log("in else");

        await getHistogramDataFromInflux(
          req.clientId,
          req.body.code,
          req.body.filter
        ).then((data) => {
          if (data) {
            Histogram.create({
              name: req.body.name,
              code: req.body.code,
              values: data,
              clientId: req.clientId,
              timescale: req.body.filter,
              client: req.userId,
            });

            return res.status(200).json({
              data: {
                name: req.body.name,
                code: req.body.code,
                values: data,
              },
            });
          }
        });
      }
    });

    // const url = process.env.INFLUX_URL || "";
    // const token = process.env.INFLUX_TOKEN;
    // const org = process.env.INFLUX_ORG || "";

    // let finalResult = [];
    // const queryApi = new InfluxDB({ url, token }).getQueryApi(org);

    // let client = await Client.findById(req.userId);

    // let days =
    //   req.body.filter === "week" ? 7 : req.body.filter === "month" ? 30 : 30;

    // // client?.measNodes?.map((node) => {
    // let result = [];

    // const heatmapQuery = `
    //     from(bucket: "bucket_API_simulation_1")
    //     |> range(start: -${days}d)
    //     |> filter(fn: (r) => r["_measurement"] == "Power")
    //     |> filter(fn: (r) => r["ClientID"] == "${client.clientId}")
    //     |> filter(fn: (r) => r["MeasNode"] == "${req.body.code}")
    //     |> keep(columns: ["_time", "_value"])
    //     |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
    //     |> rename(columns: {_value: "value"})
    //     `;
    // // |> toInt()
    // const fluxObserver = {
    //   next(row, tableMeta) {
    //     const o = tableMeta.toObject(row);
    //     result.push(o);
    //   },
    //   error(error) {
    //     console.error(error);
    //   },
    //   complete() {
    //     // let valueArr = [];
    //     // result?.map((data) => {
    //     //   valueArr.push({ value: data.value });
    //     // });

    //     return res.status(200).json({
    //       data: {
    //         name: req.body.name,
    //         code: req.body.code,
    //         values: result,
    //       },
    //     });

    //     // finalResult.push({
    //     //   name: req.body.name,
    //     //   values: result,
    //     // });
    //     // if (finalResult.length === client?.measNodes?.length) {

    //     // }
    //   },
    // };

    // queryApi.queryRows(heatmapQuery, fluxObserver);
    // });

    // const electricQuery =
    //   'from(bucket:"bucket_API_simulation_1") |> range(start: -2s) |> filter(fn:(r) => r._measurement == "Power") |> yield(name: "last")';
  } catch (err) {
    res.status(500).json({
      message: err.toString(),
    });
  }
};
