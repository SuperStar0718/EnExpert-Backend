const { InfluxDB } = require("@influxdata/influxdb-client");
const Client = require("../models/Client");
const moment = require("moment");

exports.getAnalysisData = async (req, res) => {
  try {
    const { startDate, endDate, interval, aggregation } = req.body;

    let client = await Client.findById(req.userId);

    var start = moment(startDate).startOf("day").toISOString();
    var end = moment(endDate).endOf("day").toISOString();

    // var start = new Date(moment(startDate).startOf("day").toISOString());
    // var startMilliseconds = start.getTime();

    const url = process.env.INFLUX_URL || "";
    const token = process.env.INFLUX_TOKEN;
    const org = process.env.INFLUX_ORG || "";
    const timeout = Number(process.env.INFLUX_TIMEOUT) || 30000;

    const queryApi = new InfluxDB({ url, token, timeout }).getQueryApi(org);

    let result = [];
    let category = [];

    const analysisQuery = `
        from(bucket: "bucket_API_simulation_1")
        |> range(start: ${start} , stop : ${end})
        |> filter(fn: (r) => r["_measurement"] == "Power")
        |> filter(fn: (r) => r["ClientID"] == "${req.clientId}")
        |> keep(columns: ["_time", "_value" , "MeasNode"])
        |> aggregateWindow(every: ${interval}h, fn: ${
      aggregation ? aggregation : "mean"
    }, createEmpty: false)
        |> rename(columns: {_value: "value"})
        `;

    // console.log("analysisQuery", analysisQuery);

    const fluxObserver = {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row);

        let index = category.findIndex((obj) => {
          return (
            obj.label ===
            moment(o._time).tz("Europe/Rome").format("YYYY-MM-DD, HH:MM a")
          );
        });
        if (index === -1) {
          category.push({
            label: moment(o._time)
              .tz("Europe/Rome")
              .format("YYYY-MM-DD, HH:MM a"),
          });
        }
        result.push({
          time: o._time,
          value: o.value,
          measNode: o.MeasNode,
        });
      },
      error(error) {
        console.error(error);
      },
      complete() {
        console.log("complete", result.length);
        let axis = [];

        let mergeResult = [];
        let tempCode = [];

        result.map((data) => {
          let index = tempCode.indexOf(data.measNode);
          if (index === -1) {
            tempCode.push(data.measNode);
            mergeResult.push({
              code: data.measNode,
              values: [
                {
                  value: String(Number(data.value).toFixed(2)),
                },
              ],
            });
          } else {
            mergeResult[index].values.push({
              value: String(Number(data.value).toFixed(2)),
            });
          }
        });

        let datasets = [];

        mergeResult.map((data, ind) => {
          let codeObj = client?.measNodes?.find((obj) => {
            return obj.code === data.code;
          });
          let datasetArr = data.values;

          // let maximum = Math.max.apply(
          //   Math,
          //   datasetArr.map((o) => o.value)
          // );
          datasets.push({
            seriesname: codeObj.name,
            linethickness: "3",
            data: datasetArr,
          });
        });

        axis.push(
          {
            title: "Electricity",
            titlepos: "left",
            // titlepos: ind % 2 === 0 ? "left" : "RIGHT",
            // axisonleft: ind % 2 === 0 ? "1" : "0",
            numbersuffix: " kW",
            // numberprefix: "$",
            divlineisdashed: "4",
            // maxvalue: String(Number(maximum).toFixed()),
            dataset: datasets,
          },
          {
            title: "Gas",
            titlepos: "RIGHT",
            axisonleft: "0",
            numdivlines: "5",
            numbersuffix: " m3/h",
            divlineisdashed: "1",
            maxvalue: "400000",
            dataset: [
              {
                seriesname: "Total",
                linethickness: "3",
                data: [
                  {
                    value: "378186",
                  },
                  {
                    value: "166138",
                  },
                  {
                    value: "105288",
                  },
                  {
                    value: "37268",
                  },
                  {
                    value: "96898",
                  },
                  {
                    value: "94798",
                  },
                  {
                    value: "73617",
                  },
                  {
                    value: "32199",
                  },
                  {
                    value: "45199",
                  },
                  {
                    value: "64066",
                  },
                  {
                    value: "59048",
                  },
                  {
                    value: "46523",
                  },
                ],
              },
            ],
          },
          {
            title: "Water",
            titlepos: "left",
            numbersuffix: " m3/h",
            // numberprefix: "$",
            divlineisdashed: "4",
            maxvalue: "100000",
            dataset: [
              {
                seriesname: "Total",
                linethickness: "3",
                data: [
                  {
                    value: "38450.2",
                  },
                  {
                    value: "16544.4",
                  },
                  {
                    value: "10659.4",
                  },
                  {
                    value: "9657.4",
                  },
                  {
                    value: "9040.4",
                  },
                  {
                    value: "9040.4",
                  },
                  {
                    value: "6992.3",
                  },
                  {
                    value: "6650.5",
                  },
                  {
                    value: "6650.5",
                  },
                  {
                    value: "6337.2",
                  },
                  {
                    value: "5835.4",
                  },
                  {
                    value: "4582.9",
                  },
                ],
              },
            ],
          },
          {
            title: "Heat",
            titlepos: "RIGHT",
            axisonleft: "0",
            numdivlines: "5",
            numbersuffix: " m3/h",
            divlineisdashed: "1",
            maxvalue: "400000",
            dataset: [
              {
                seriesname: "Total",
                linethickness: "3",
                data: [
                  {
                    value: "358196",
                  },
                  {
                    value: "166138",
                  },
                  {
                    value: "107288",
                  },
                  {
                    value: "97268",
                  },
                  {
                    value: "91098",
                  },
                  {
                    value: "91098",
                  },
                  {
                    value: "70617",
                  },
                  {
                    value: "67199",
                  },
                  {
                    value: "67199",
                  },
                  {
                    value: "64066",
                  },
                  {
                    value: "59048",
                  },
                  {
                    value: "46523",
                  },
                ],
              },
            ],
          }
        );
        res.status(200).json({
          categories: [
            {
              category,
            },
          ],
          axis,
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

exports.getAnalysisData2 = async (req, res) => {
  try {
    const { startDate, endDate, interval, aggregation } = req.body;

    let client = await Client.findById(req.userId);

    var start = moment(startDate).startOf("day").toISOString();
    var end = moment(endDate).endOf("day").toISOString();

    // var start = new Date(moment(startDate).startOf("day").toISOString());
    // var startMilliseconds = start.getTime();

    const url = process.env.INFLUX_URL || "";
    const token = process.env.INFLUX_TOKEN;
    const org = process.env.INFLUX_ORG || "";
    const timeout = Number(process.env.INFLUX_TIMEOUT) || 30000;

    const queryApi = new InfluxDB({ url, token, timeout }).getQueryApi(org);

    let result = [];
    let category = [];

    const analysisQuery = `
        from(bucket: "bucket_API_simulation_1")
        |> range(start: ${start} , stop : ${end})
        |> filter(fn: (r) => r["_measurement"] == "Power")
        |> filter(fn: (r) => r["ClientID"] == "${req.clientId}")
        |> keep(columns: ["_time", "_value" , "MeasNode"])
        |> aggregateWindow(every: ${interval}h, fn: ${
      aggregation ? aggregation : "mean"
    }, createEmpty: false)
        |> rename(columns: {_value: "value"})
        `;

    // console.log("analysisQuery", analysisQuery);

    const fluxObserver = {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row);

        let index = category.findIndex((obj) => {
          return (
            obj.label ===
            moment(o._time).tz("Europe/Rome").format("YYYY-MM-DD, HH:MM a")
          );
        });
        if (index === -1) {
          category.push({
            label: moment(o._time)
              .tz("Europe/Rome")
              .format("YYYY-MM-DD, HH:MM a"),
          });
        }
        result.push({
          time: o._time,
          value: o.value,
          measNode: o.MeasNode,
        });
      },
      error(error) {
        console.error(error);
      },
      complete() {
        console.log("complete", result.length);
        let axis = [];

        let mergeResult = [];
        let tempCode = [];

        let dataValues = [];

        result.map((data) => {
          dataValues.push({
            value: String(Number(data.value).toFixed(2)),
          });
          // let index = tempCode.indexOf(data.measNode);
          // if (index === -1) {
          //   tempCode.push(data.measNode);
          //   mergeResult.push({
          //     code: data.measNode,
          //     values: [
          //       {
          //         value: String(Number(data.value).toFixed(2)),
          //       },
          //     ],
          //   });
          // } else {
          //   mergeResult[index].values.push({
          //     value: String(Number(data.value).toFixed(2)),
          //   });
          // }
        });

        // mergeResult.map((data, ind) => {
        //   let codeObj = client?.measNodes?.find((obj) => {
        //     return obj.code === data.code;
        //   });
        // let datasetArr = data.values;

        let maximum = Math.max.apply(
          Math,
          dataValues.map((o) => o.value)
        );

        axis.push(
          {
            title: "Electricity",
            // title: codeObj.name,
            titlepos: "left",
            // titlepos: ind % 2 === 0 ? "left" : "RIGHT",
            axisonleft: "1",
            // axisonleft: ind % 2 === 0 ? "1" : "0",
            numbersuffix: " kW",
            // numberprefix: "$",
            divlineisdashed: "4",
            maxvalue: String(Number(maximum).toFixed()),
            dataset: [
              {
                // seriesname: codeObj.name,
                seriesname: "Electricity",
                linethickness: "3",
                data: dataValues,
              },
            ],
          },
          {
            title: "Gas",
            titlepos: "RIGHT",
            axisonleft: "0",
            numdivlines: "5",
            numbersuffix: " m3/h",
            divlineisdashed: "1",
            maxvalue: "400000",
            dataset: [
              {
                seriesname: "Gas",
                linethickness: "3",
                data: [
                  {
                    value: "378186",
                  },
                  {
                    value: "166138",
                  },
                  {
                    value: "105288",
                  },
                  {
                    value: "37268",
                  },
                  {
                    value: "96898",
                  },
                  {
                    value: "94798",
                  },
                  {
                    value: "73617",
                  },
                  {
                    value: "32199",
                  },
                  {
                    value: "45199",
                  },
                  {
                    value: "64066",
                  },
                  {
                    value: "59048",
                  },
                  {
                    value: "46523",
                  },
                ],
              },
            ],
          },
          {
            title: "Water",
            titlepos: "left",
            numbersuffix: " m3/h",
            // numberprefix: "$",
            divlineisdashed: "4",
            maxvalue: "100000",
            dataset: [
              {
                seriesname: "Water",
                linethickness: "3",
                data: [
                  {
                    value: "38450.2",
                  },
                  {
                    value: "16544.4",
                  },
                  {
                    value: "10659.4",
                  },
                  {
                    value: "9657.4",
                  },
                  {
                    value: "9040.4",
                  },
                  {
                    value: "9040.4",
                  },
                  {
                    value: "6992.3",
                  },
                  {
                    value: "6650.5",
                  },
                  {
                    value: "6650.5",
                  },
                  {
                    value: "6337.2",
                  },
                  {
                    value: "5835.4",
                  },
                  {
                    value: "4582.9",
                  },
                ],
              },
            ],
          },
          {
            title: "Heat",
            titlepos: "RIGHT",
            axisonleft: "0",
            numdivlines: "5",
            numbersuffix: " m3/h",
            divlineisdashed: "1",
            maxvalue: "400000",
            dataset: [
              {
                seriesname: "Heat",
                linethickness: "3",
                data: [
                  {
                    value: "358196",
                  },
                  {
                    value: "166138",
                  },
                  {
                    value: "107288",
                  },
                  {
                    value: "97268",
                  },
                  {
                    value: "91098",
                  },
                  {
                    value: "91098",
                  },
                  {
                    value: "70617",
                  },
                  {
                    value: "67199",
                  },
                  {
                    value: "67199",
                  },
                  {
                    value: "64066",
                  },
                  {
                    value: "59048",
                  },
                  {
                    value: "46523",
                  },
                ],
              },
            ],
          }
        );
        // });
        res.status(200).json({
          categories: [
            {
              category,
            },
          ],
          axis,
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
