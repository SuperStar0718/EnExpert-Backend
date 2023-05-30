const moment = require("moment");
const Client = require("../models/Client");
const Heatmap = require("../models/Heatmap");
const { randomNumber, getDateArray } = require("../functions/general");
const { getHeatmapDataFromInflux } = require("../functions/influxFunctions");
var zmq = require("zeromq");
const { InfluxDB, Point } = require("@influxdata/influxdb-client");

const NodeCache = require("node-cache");
const myCache = new NodeCache();

// const electricsock = new zmq.Request({
//   immediate: true,
//   sendTimeout: 5000,
//   receiveTimeout: 5000,
// });
// const energyCostSock = new zmq.Request({
//   immediate: true,
//   sendTimeout: 5000,
//   receiveTimeout: 5000,
// });

// electricsock.connect(process.env.ZEROMQ_CONNECTION_PROD);
// energyCostSock.connect(process.env.ZEROMQ_CONNECTION_PROD);

exports.getElectricConsumption = async (req, res) => {
  try {
    let staticDataChannels = [
      {
        name: "Spa",
        percentage: 0,
      },
      {
        name: "E-mobility",
        percentage: 0,
      },
      {
        name: "Restaurant",
        percentage: 0,
      },
      {
        name: "Laundry",
        percentage: 0,
      },
    ];

    let cacheData = myCache.get("electricConsumptionCache");

    // console.log("cacheData", cacheData);

    // if (cacheData) {
    //   return res.status(200).json(cacheData);
    // } else {
    Client.findById(req.userId).then(async (client) => {
      let result = [];
      let finalResult = [];

      const url = process.env.INFLUX_URL || "";
      const token = process.env.INFLUX_TOKEN;
      const org = process.env.INFLUX_ORG || "";
      const timeout = Number(process.env.INFLUX_TIMEOUT) || 30000;

      const queryApi = new InfluxDB({ url, token, timeout }).getQueryApi(org);

      let queryCondition = client?.measNodes?.filter((obj) => {
        return obj.Type === "power" && obj.name !== "PV-Production";
      });

      let str = "";
      queryCondition?.map((cond) => {
        str += `r["MeasNode"] == "${cond.code}" or `;
      });

      str = str.substring(0, str.length - 3);

      const heatmapQuery = `
                          from(bucket: "${client.buckets?.[0]}")
                          |> range(start: -20s)
                          |> filter(fn: (r) => r["_measurement"] == "Power")
                          |> keep(columns: ["MeasNode","_value","_field","Unit"])
                          |> filter(fn: (r) => ${str})
                          |> filter(fn: (r) => r["_field"] == "actual")
                          |> filter(fn: (r) => r["Unit"] == "kW")
                          |> last()
                          |> yield(name: "last")
                            `;

      let totalObj = client?.measNodes?.find((obj) => {
        return obj.name === "Total" && obj.Type === "power";
      });

      let condition = client?.measNodes?.filter((obj) => {
        return obj.Type === "power";
      });

      const oneHourBefore = `
            from(bucket: "${client.buckets?.[0]}")
            |> range(start: -2h , stop : -1h)
            |> filter(fn: (r) => r["_measurement"] == "Power")
            |> keep(columns: ["MeasNode","_value","_time","_field","Unit"])
            |> filter(fn: (r) => r["MeasNode"] == "${totalObj?.code}")
            |> filter(fn: (r) => r["_field"] == "actual")
            |> filter(fn: (r) => r["Unit"] == "kW")
            |> last()
            `;

      // console.log("heatmapQuery", heatmapQuery);
      // console.log("oneHourBefore", oneHourBefore);

      let resultTotalObj;
      const fluxObserver = {
        next(row, tableMeta) {
          const o = tableMeta.toObject(row);
          // result.push(o);
          if (o.MeasNode !== totalObj?.code) {
            result.push(o);
          } else {
            // console.log("o total", o);
            resultTotalObj = o;
          }
        },
        error(error) {
          console.error(error);
          // return res.status(200).json(
          //   cacheData
          //     ? cacheData
          //     : {
          //         TotalConsumption: 0,
          //         dataChannels: staticDataChannels,
          //         Last_Hour_Comparison: -1.3,
          //       }
          // );
        },
        complete() {
          // return res.status(200).json(result);

          result?.map((data) => {
            let codeObj = client?.measNodes?.find((obj) => {
              return obj.code === data.MeasNode;
            });
            finalResult.push({
              name: codeObj ? codeObj.name : data.MeasNode,
              percentage: Number(
                ((data._value / resultTotalObj?._value) * 100).toFixed()
              ),
            });
          });
          if (finalResult.length === condition?.length - 2) {
            let beforeResult;
            queryApi.queryRows(oneHourBefore, {
              next(row, tableMeta) {
                const o = tableMeta.toObject(row);
                // console.log("o", o);
                beforeResult = o;
              },
              error(error) {
                console.error(error);
              },
              complete() {
                // console.log("beforeResult", beforeResult?._value);
                // console.log("current", resultTotalObj?._value);
                // let percentage =
                //   ((resultTotalObj?._value - beforeResult?._value) /
                //     resultTotalObj?._value) *
                //   100;

                let percentage = Number(
                  (
                    ((resultTotalObj?._value - beforeResult?._value) /
                      resultTotalObj?._value) *
                    100
                  ).toFixed(2)
                );
                let payload = {
                  TotalConsumption: resultTotalObj?._value,
                  dataChannels: finalResult,
                  Last_Hour_Comparison: percentage,
                };
                myCache.set("electricConsumptionCache", payload);
                return res.status(200).json(payload);
              },
            });
          }
        },
      };

      queryApi.queryRows(heatmapQuery, fluxObserver);
    });
  } catch (err) {
    res.status(500).json({
      message: err.toString(),
    });
  }
};
// exports.getElectricConsumption = async (req, res) => {
//   try {
//     let staticDataChannels = [
//       {
//         name: "Spa",
//         percentage: 0,
//       },
//       {
//         name: "E-mobility",
//         percentage: 0,
//       },
//       {
//         name: "Restaurant",
//         percentage: 0,
//       },
//       {
//         name: "Laundry",
//         percentage: 0,
//       },
//     ];

//     let cacheData = myCache.get("electricConsumptionCache");

//     // console.log("cacheData", cacheData);

//     // if (cacheData) {
//     //   return res.status(200).json(cacheData);
//     // } else {
//     Client.findById(req.userId).then(async (client) => {
//       let result = [];
//       let finalResult = [];

//       const url = process.env.INFLUX_URL || "";
//       const token = process.env.INFLUX_TOKEN;
//       const org = process.env.INFLUX_ORG || "";
//       const timeout = Number(process.env.INFLUX_TIMEOUT) || 30000;

//       const queryApi = new InfluxDB({ url, token, timeout }).getQueryApi(org);

//       const heatmapQuery = `
//                   from(bucket: "bucket_API_simulation_1")
//                   |> range(start: -2s)
//                   |> filter(fn: (r) => r["_measurement"] == "Power")
//                   |> filter(fn: (r) => r["ClientID"] == "${client.clientId}")
//                   |> keep(columns: ["MeasNode","_value"])
//                   |> yield(name: "last")
//                     `;
//       let totalObj = client?.measNodes?.find((obj) => {
//         return obj.name === "Total";
//       });
//       let resultTotalObj;
//       const fluxObserver = {
//         next(row, tableMeta) {
//           const o = tableMeta.toObject(row);
//           if (o.MeasNode !== totalObj?.code) {
//             result.push(o);
//           } else {
//             resultTotalObj = o;
//           }
//         },
//         error(error) {
//           console.error(error);
//           return res.status(200).json(
//             cacheData
//               ? cacheData
//               : {
//                   TotalConsumption: 0,
//                   dataChannels: staticDataChannels,
//                   Last_Hour_Comparison: -1.3,
//                 }
//           );
//         },
//         complete() {
//           result?.map((data) => {
//             let codeObj = client?.measNodes?.find((obj) => {
//               return obj.code === data.MeasNode;
//             });
//             finalResult.push({
//               name: codeObj ? codeObj.name : data.MeasNode,
//               percentage: Number(
//                 ((data._value / resultTotalObj?._value) * 100).toFixed()
//               ),
//             });
//           });
//           if (finalResult.length === client?.measNodes?.length - 1) {
//             let payload = {
//               TotalConsumption: resultTotalObj?._value,
//               dataChannels: finalResult,
//               Last_Hour_Comparison: -1.3,
//             };
//             myCache.set("electricConsumptionCache", payload);
//             return res.status(200).json(payload);
//           }
//         },
//       };

//       queryApi.queryRows(heatmapQuery, fluxObserver);

//       // var jsonObject = {
//       //   REQUEST: "getElectricConsumption",
//       //   ClientID: client.clientId,
//       // };
//       // var stringObject = JSON.stringify(jsonObject);

//       // const electricsock = new zmq.Request({
//       //   immediate: true,
//       //   sendTimeout: 5000,
//       //   receiveTimeout: 5000,
//       // });
//       // electricsock.connect(process.env.ZEROMQ_CONNECTION_PROD);

//       // await electricsock
//       //   .send(stringObject)
//       //   .then(async (resp) => {
//       //     console.log("send then");
//       //     const [result] = await electricsock.receive();
//       //     const data = JSON.parse(JSON.parse(result.toString()));
//       //     const dataCopy = JSON.parse(
//       //       JSON.stringify(JSON.parse(JSON.parse(result.toString())))
//       //     );

//       //     let dataChannels = [];

//       //     // console.log("data", data);
//       //     if (data) {
//       //       let totalObj = client?.measNodes?.find((obj) => {
//       //         return obj.name === "Total";
//       //       });

//       //       delete data[totalObj.code];

//       //       Object.entries(data)?.map(([key, value]) => {
//       //         // console.log("key, value", key, value);
//       //         let codeObj = client?.measNodes?.find((obj) => {
//       //           return obj.code === key;
//       //         });
//       //         dataChannels.push({
//       //           name: codeObj ? codeObj.name : key,
//       //           percentage: Number(
//       //             ((value / dataCopy[totalObj.code]) * 100).toFixed()
//       //           ),
//       //         });
//       //       });

//       //       let payload = {
//       //         TotalConsumption: dataCopy[totalObj.code],
//       //         dataChannels,
//       //         Last_Hour_Comparison: -1.3,
//       //       };

//       //       myCache.set("electricConsumptionCache", payload);
//       //       return res.status(200).json(payload);
//       //     } else {
//       //       console.log("in then cache");
//       //       let cacheData = myCache.get("electricConsumptionCache");
//       //       if (cacheData) {
//       //         return res.status(200).json(cacheData);
//       //       } else {
//       //         return res.status(200).json({
//       //           TotalConsumption: 0,
//       //           dataChannels: staticDataChannels,
//       //           Last_Hour_Comparison: 0,
//       //         });
//       //       }
//       //     }
//       //   })
//       //   .catch((err) => {
//       //     console.log("in catch cache");
//       //     console.log("in send catch");
//       //     console.log("err", err);
//       //     let cacheData = myCache.get("electricConsumptionCache");
//       //     if (cacheData) {
//       //       return res.status(200).json(cacheData);
//       //     } else {
//       //       return res.status(200).json({
//       //         TotalConsumption: 0,
//       //         dataChannels: staticDataChannels,
//       //         Last_Hour_Comparison: 0,
//       //       });
//       //     }
//       //   });
//     });
//     // }
//   } catch (err) {
//     res.status(500).json({
//       message: err.toString(),
//     });
//   }
// };

exports.getEnergyCost = async (req, res) => {
  try {
    const { filter } = req.body;

    let startDate;
    let endDate;

    if (filter === "today") {
      startDate = new Date();
      startDate.setUTCHours(0, 0, 0, 0);
      startDate = moment(startDate).toISOString();
      endDate = new Date();
      endDate.setUTCHours(23, 59, 59, 999);
      endDate = moment(endDate).toISOString();
    } else if (filter === "week") {
      startDate = new Date(moment().startOf("week").format("YYYY-MM-DD"));
      startDate.setUTCHours(0, 0, 0, 0);
      startDate = moment(startDate).toISOString();
      endDate = new Date(moment().endOf("week").format("YYYY-MM-DD"));
      endDate.setUTCHours(23, 59, 59, 999);
      endDate = moment(endDate).toISOString();
    } else if (filter === "month") {
      // endDate = moment().endOf("month").toISOString();
      // startDate = moment().startOf("month").toISOString();

      startDate = new Date(moment().startOf("month").format("YYYY-MM-DD"));
      startDate.setUTCHours(0, 0, 0, 0);
      startDate = moment(startDate).toISOString();
      endDate = new Date(moment().endOf("month").format("YYYY-MM-DD"));
      endDate.setUTCHours(23, 59, 59, 999);
      endDate = moment(endDate).toISOString();
    } else if (filter === "year") {
      // endDate = moment().endOf("year").toISOString();
      // startDate = moment().startOf("year").toISOString();

      startDate = new Date(moment().startOf("year").format("YYYY-MM-DD"));
      startDate.setUTCHours(0, 0, 0, 0);
      startDate = moment(startDate).toISOString();
      endDate = new Date(moment().endOf("year").format("YYYY-MM-DD"));
      endDate.setUTCHours(23, 59, 59, 999);
      endDate = moment(endDate).toISOString();
    }

    const client = await Client.findById(req.userId);

    let result = [];

    const url = process.env.INFLUX_URL || "";
    const token = process.env.INFLUX_TOKEN;
    const org = process.env.INFLUX_ORG || "";
    const timeout = Number(process.env.INFLUX_TIMEOUT) || 30000;

    const queryApi = new InfluxDB({ url, token, timeout }).getQueryApi(org);

    let queryCondition = client?.measNodes?.filter((obj) => {
      return obj.name === "Total";
    });

    let str = "";
    queryCondition?.map((cond) => {
      str += `r["MeasNode"] == "${cond.code}" or `;
    });

    str = str.substring(0, str.length - 3);

    const currentEnergyQuery = `
                        from(bucket: "${client.buckets?.[0]}")
                        |> range(start: ${startDate} , stop : ${endDate})
                        |> filter(fn: (r) => r["_measurement"] == "Gas" or r["_measurement"] == "Heat" or r["_measurement"] == "Water" or r["_measurement"] == "Power")
                        |> keep(columns: ["MeasNode","_value","_field","Unit"])
                        |> filter(fn: (r) => ${str})
                        |> filter(fn: (r) => r["Unit"] == "kWh" or r["Unit"] == "m3")
                        |> filter(fn: (r) => r["_field"] == "integral")
                        |> last()
                          `;

    // |> range(start: ${beforeStartDate} , stop : ${beforeEndDate})
    const beforeEnergyQuery = `from(bucket: "${client.buckets?.[0]}")
    |> range(start: ${startDate} , stop : ${endDate})
                          |> filter(fn: (r) => r["_measurement"] == "Gas" or r["_measurement"] == "Heat" or r["_measurement"] == "Water" or r["_measurement"] == "Power")
                          |> keep(columns: ["MeasNode","_value","_field","Unit"])
                          |> filter(fn: (r) => ${str})
                          |> filter(fn: (r) => r["Unit"] == "kWh" or r["Unit"] == "m3")
                          |> filter(fn: (r) => r["_field"] == "integral")
                          |> first()`;

    // console.log("currentEnergyQuery", currentEnergyQuery);
    // console.log("beforeEnergyQuery", beforeEnergyQuery);
    const fluxObserver = {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row);
        result.push(o);
      },
      error(error) {
        console.error(error);
      },
      complete() {
        let beforeResult = [];

        queryApi.queryRows(beforeEnergyQuery, {
          next(row, tableMeta) {
            const o = tableMeta.toObject(row);
            // console.log("o", o);
            beforeResult.push(o);
          },
          error(error) {
            console.error(error);
          },
          complete() {
            let tempResult = [];
            let totalCost = 0;
            let totalValueBefore = 0;
            let totalValueAfter = 0;

            queryCondition?.map((data) => {
              let tempCurrent = result.find((obj) => {
                return obj.MeasNode === data.code;
              });
              let tempBefore = beforeResult.find((obj) => {
                return obj.MeasNode === data.code;
              });

              // console.log("tempCurrent", tempCurrent);
              // console.log("tempBefore", tempBefore);

              totalValueBefore += tempBefore?._value;
              totalValueAfter += tempCurrent?._value;

              let diff = tempCurrent?._value - tempBefore?._value;
              let price;
              if (data.Type === "power") {
                price = Number(client.priceElectricDelivery) * diff;
              } else if (data.Type === "water") {
                price = Number(client.priceWaterDelivery) * diff;
              } else if (data.Type === "gas") {
                price = Number(client.priceGasDelivery) * diff;
              } else {
                price = Number(client.priceHeatDelivery) * diff;
              }
              totalCost += price;

              tempResult.push({
                code: data.code,
                type: data.Type,
                name: data.name,
                difference: diff.toFixed(),
                price: Number(price.toFixed(2)),
              });
            });

            let payload = {
              totalCost: Number(totalCost.toFixed(2)),
              percentage: Number(
                (
                  ((totalValueAfter - totalValueBefore) / totalValueAfter) *
                  100
                ).toFixed(2)
              ),
              channels: tempResult,
            };
            // myCache.set("energyCostCache", payload);
            return res.status(200).json(payload);
          },
        });
      },
    };

    queryApi.queryRows(currentEnergyQuery, fluxObserver);
  } catch (err) {
    res.status(500).json({
      message: err.toString(),
    });
  }
};

// exports.getEnergyCost = async (req, res) => {
//   try {
//     const { filter } = req.body;

//     // let startDate = moment().format("YYYY-MM-DD");
//     // let endDate;
//     // if (filter === "today") {
//     //   startDate = moment().startOf("day").format("YYYY-MM-DD");
//     //   endDate = moment().endOf("day").format("YYYY-MM-DD");
//     // } else if (filter === "week") {
//     //   startDate = moment().startOf("week").format("YYYY-MM-DD");
//     //   endDate = moment().endOf("week").format("YYYY-MM-DD");
//     // } else if (filter === "month") {
//     //   endDate = moment().endOf("month").format("YYYY-MM-DD");
//     //   startDate = moment().startOf("month").format("YYYY-MM-DD");
//     // } else if (filter === "year") {
//     //   endDate = moment().endOf("year").format("YYYY-MM-DD");
//     //   startDate = moment().startOf("year").format("YYYY-MM-DD");
//     // }
//     var jsonObject = {
//       REQUEST: "getEnergyCost",
//       ClientID: req.clientId,
//       timescale: filter,
//     };
//     var stringObject = JSON.stringify(jsonObject);

//     // console.log("jsonObject", jsonObject);

//     const client = await Client.findById(req.userId);

//     let totalCost = 43567;

//     // let payload = {
//     //   totalCost,
//     //   lastDayComparision: 2.5,
//     //   electricity: (Number(client.priceElectricDelivery) * totalCost).toFixed(),
//     //   heating: (Number(client.priceHeatDelivery) * totalCost).toFixed(),
//     //   water: (Number(client.priceWaterDelivery) * totalCost).toFixed(),
//     //   gas: (Number(client.priceGasDelivery) * totalCost).toFixed(),
//     // };
//     let payload = {
//       totalCost,
//       lastDayComparision: 2.5,
//       electricity: (0.3 * totalCost).toFixed(),
//       heating: (0.4 * totalCost).toFixed(),
//       water: (0.15 * totalCost).toFixed(),
//       gas: (0.15 * totalCost).toFixed(),
//     };

//     const energyCostSock = new zmq.Request({
//       immediate: true,
//       sendTimeout: 5000,
//       receiveTimeout: 5000,
//     });
//     energyCostSock.connect(process.env.ZEROMQ_CONNECTION_PROD);

//     await energyCostSock
//       .send(stringObject)
//       .then(async () => {
//         const [result] = await energyCostSock.receive();
//         const data = JSON.parse(JSON.parse(result.toString()));

//         if (data) {
//           myCache.set("energyCostCache", {
//             ...data.data,
//             lastDayComparision: 3.9,
//           });

//           return res.status(200).json({
//             ...data.data,
//             lastDayComparision: 3.9,
//           });
//         } else {
//           let cacheData = myCache.get("energyCostCache");
//           if (cacheData) {
//             return res.status(200).json(cacheData);
//           } else {
//             return res.status(200).json(payload);
//           }
//         }
//       })
//       .catch((err) => {
//         let cacheData = myCache.get("energyCostCache");
//         if (cacheData) {
//           return res.status(200).json(cacheData);
//         } else {
//           return res.status(200).json(payload);
//         }
//       });
//   } catch (err) {
//     res.status(500).json({
//       message: err.toString(),
//     });
//   }
// };

exports.getTotalElectricConsumption = async (req, res) => {
  try {
    const { filter } = req.body;

    let startDate;
    let endDate;
    let interval;
    if (filter === "12m") {
      // startDate = moment()
      //   .subtract(12, "months")
      //   .startOf("month")
      //   .toISOString();
      // endDate = moment().toISOString();
      interval = "30d";

      startDate = new Date(
        moment().subtract(12, "months").startOf("month").format("YYYY-MM-DD")
      );
      startDate.setUTCHours(0, 0, 0, 0);
      startDate = moment(startDate).toISOString();
      endDate = new Date(moment().format("YYYY-MM-DD"));
      endDate.setUTCHours(23, 59, 59, 999);
      endDate = moment(endDate).toISOString();
    } else if (filter === "7d") {
      startDate = moment().subtract(6, "days").toISOString();
      interval = "1d";

      endDate = moment().toISOString();
    } else if (filter === "30d") {
      interval = "1d";

      startDate = moment().subtract(29, "days").toISOString();
      endDate = moment().toISOString();
    }

    const client = await Client.findById(req.userId);

    const url = process.env.INFLUX_URL || "";
    const token = process.env.INFLUX_TOKEN;
    const org = process.env.INFLUX_ORG || "";
    const timeout = Number(process.env.INFLUX_TIMEOUT) || 30000;

    const queryApi = new InfluxDB({ url, token, timeout }).getQueryApi(org);

    let result = [];
    let totalResult = [];

    let queryCondition = client?.measNodes?.filter((obj) => {
      return (
        obj.name !== "Total" &&
        obj.name !== "PV-Production" &&
        obj.Type === "power"
      );
    });

    let totalQueryCondition = client?.measNodes?.filter((obj) => {
      return obj.name !== "PV-Production" && obj.Type === "power";
    });

    let str = "";
    let str2 = "";
    queryCondition?.map((cond) => {
      str += `r["MeasNode"] == "${cond.code}" or `;
    });
    totalQueryCondition?.map((cond) => {
      str2 += `r["MeasNode"] == "${cond.code}" or `;
    });

    str = str.substring(0, str.length - 3);
    str2 = str2.substring(0, str2.length - 3);

    const monthlyElectricQuery = `
                        from(bucket: "${client.buckets?.[0]}")
                        |> range(start: ${startDate} , stop : ${endDate})
                        |> filter(fn: (r) => r["_measurement"] == "Power")
                        |> filter(fn: (r) => ${str})
                        |> filter(fn: (r) => r["Unit"] == "kWh")
                        |> filter(fn: (r) => r["_field"] == "integral")
                        |> aggregateWindow(every: ${interval}, fn: last, createEmpty: false)
                        `;

    const monthlyElectricQueryPreviousMonth = `
                        from(bucket: "${client.buckets?.[0]}")
                        |> range(start: ${startDate} , stop : ${endDate})
                        |> filter(fn: (r) => r["_measurement"] == "Power")
                        |> filter(fn: (r) => ${str})
                        |> filter(fn: (r) => r["Unit"] == "kWh")
                        |> filter(fn: (r) => r["_field"] == "integral")
                        |> aggregateWindow(every: ${interval}, fn: first, createEmpty: false)
                        `;
    // |> last()

    const totalElectricQuery = `
                          from(bucket: "${client.buckets?.[0]}")
                          |> range(start: ${startDate} , stop : ${endDate})
                          |> filter(fn: (r) => r["_measurement"] == "Power")
                          |> filter(fn: (r) => ${str2})
                          |> filter(fn: (r) => r["Unit"] == "kWh")
                          |> filter(fn: (r) => r["_field"] == "integral")
                          |> last()
                            `;

    // console.log("monthlyElectricQuery", monthlyElectricQuery);
    // console.log("totalElectricQuery", totalElectricQuery);

    const fluxObserver = {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row);

        result.push(o);

        // let codeObj = client?.measNodes?.find((obj) => {
        //   return obj.code === o.MeasNode;
        // });

        // result.push({
        //   place: codeObj.name,
        //   date: moment(o?._time).format(filter === "12m" ? "MMM YYYY" : "DD"),
        //   value: Number(o?._value?.toFixed()),
        // });
      },
      error(error) {
        console.error(error);
      },
      complete() {
        let labels = [];

        let previousQuery = [];

        let data = [];
        let total = 0;

        queryApi.queryRows(monthlyElectricQueryPreviousMonth, {
          next(row, tableMeta) {
            const o = tableMeta.toObject(row);
            previousQuery.push(o);
          },
          error(error) {
            console.error(error);
          },
          complete() {
            let tempResult = [];

            result?.map((data, ind) => {
              let codeObj = client?.measNodes?.find((obj) => {
                return obj.code === data.MeasNode;
              });

              // let tempCurrent = result.find((obj) => {
              //   return obj.MeasNode === data.code;
              // });
              // let tempBefore = previousQuery.find((obj) => {
              //   return obj.MeasNode === data.code;
              // });

              // console.log("tempCurrent", tempCurrent);
              // console.log("tempBefore", tempBefore);

              // totalValueBefore += tempBefore?._value;
              // totalValueAfter += tempCurrent?._value;

              let diff = data?._value - previousQuery?.[ind]?._value;
              // let price;
              // if (data.Type === "power") {
              //   price = Number(client.priceElectricDelivery) * diff;
              // } else if (data.Type === "water") {
              //   price = Number(client.priceWaterDelivery) * diff;
              // } else if (data.Type === "gas") {
              //   price = Number(client.priceGasDelivery) * diff;
              // } else {
              //   price = Number(client.priceHeatDelivery) * diff;
              // }
              // totalCost += price;

              tempResult.push({
                place: codeObj.name,
                date: moment(data?._time).format(
                  filter === "12m" ? "MMM YYYY" : "DD"
                ),
                value: Number(diff?.toFixed()),
              });
              // tempResult.push({
              //   code: data.code,
              //   type: data.Type,
              //   name: data.name,
              // });
            });

            return res.status(200).json({
              roundChart: {
                labels,
                data,
                total,
              },
              stackChart: tempResult,
            });

            // let payload = {
            //   totalCost: Number(totalCost.toFixed(2)),
            //   percentage: Number(
            //     (
            //       ((totalValueAfter - totalValueBefore) / totalValueAfter) *
            //       100
            //     ).toFixed(2)
            //   ),
            //   channels: tempResult,
            // };
            // // myCache.set("energyCostCache", payload);
            // return res.status(200).json(payload);
          },
        });

        // queryApi.queryRows(totalElectricQuery, {
        //   next(row, tableMeta) {
        //     const o = tableMeta.toObject(row);

        //     let codeObj = client?.measNodes?.find((obj) => {
        //       return obj.code === o.MeasNode;
        //     });
        //     let totalObj = client?.measNodes?.find((obj) => {
        //       return obj.name === "Total" && obj.Type === "power";
        //     });
        //     // console.log("totalObj", totalObj);

        //     if (o.MeasNode !== totalObj?.code) {
        //       labels.push(codeObj.name);
        //       data.push(Number(o._value?.toFixed()));
        //     } else {
        //       total = Number(o._value?.toFixed());
        //     }
        //   },
        //   error(error) {
        //     console.error(error);
        //   },
        //   complete() {
        //     return res.status(200).json({
        //       roundChart: {
        //         labels,
        //         data,
        //         total,
        //       },
        //       stackChart: result,
        //     });
        //   },
        // });
      },
    };
    queryApi.queryRows(monthlyElectricQuery, fluxObserver);
  } catch (err) {
    console.log("err", err);
    res.status(500).json({
      message: err.toString(),
    });
  }
};
exports.getRoundChartData = async (req, res) => {
  try {
    const { filter } = req.body;

    let startDate;
    let endDate;
    let interval;
    if (filter === "12m") {
      interval = "30d";

      startDate = new Date(
        moment().subtract(12, "months").startOf("month").format("YYYY-MM-DD")
      );
      startDate.setUTCHours(0, 0, 0, 0);
      startDate = moment(startDate).toISOString();
      endDate = new Date(moment().format("YYYY-MM-DD"));
      endDate.setUTCHours(23, 59, 59, 999);
      endDate = moment(endDate).toISOString();
    } else if (filter === "7d") {
      interval = "1d";
      startDate = new Date(
        moment().subtract(6, "days").startOf("month").format("YYYY-MM-DD")
      );
      startDate.setUTCHours(0, 0, 0, 0);
      startDate = moment(startDate).toISOString();
      endDate = new Date(moment().format("YYYY-MM-DD"));
      endDate.setUTCHours(23, 59, 59, 999);
      endDate = moment(endDate).toISOString();
    } else if (filter === "30d") {
      interval = "1d";

      // startDate = moment().subtract(29, "days").toISOString();
      // endDate = moment().toISOString();

      startDate = new Date(
        moment().subtract(29, "days").startOf("month").format("YYYY-MM-DD")
      );
      startDate.setUTCHours(0, 0, 0, 0);
      startDate = moment(startDate).toISOString();
      endDate = new Date(moment().format("YYYY-MM-DD"));
      endDate.setUTCHours(23, 59, 59, 999);
      endDate = moment(endDate).toISOString();
    }

    const client = await Client.findById(req.userId);

    const url = process.env.INFLUX_URL || "";
    const token = process.env.INFLUX_TOKEN;
    const org = process.env.INFLUX_ORG || "";
    const timeout = Number(process.env.INFLUX_TIMEOUT) || 30000;

    const queryApi = new InfluxDB({ url, token, timeout }).getQueryApi(org);

    let totalQueryCondition = client?.measNodes?.filter((obj) => {
      return obj.name !== "PV-Production" && obj.Type === "power";
    });

    let str2 = "";

    totalQueryCondition?.map((cond) => {
      str2 += `r["MeasNode"] == "${cond.code}" or `;
    });

    str2 = str2.substring(0, str2.length - 3);

    const totalElectricQuery = `
                          from(bucket: "${client.buckets?.[0]}")
                          |> range(start: ${startDate} , stop : ${endDate})
                          |> filter(fn: (r) => r["_measurement"] == "Power")
                          |> filter(fn: (r) => ${str2})
                          |> filter(fn: (r) => r["Unit"] == "kWh")
                          |> filter(fn: (r) => r["_field"] == "integral")
                          |> last()
                            `;

    const totalElectricQueryPrevious = `
                            from(bucket: "${client.buckets?.[0]}")
                            |> range(start: ${startDate} , stop : ${endDate})
                            |> filter(fn: (r) => r["_measurement"] == "Power")
                            |> filter(fn: (r) => ${str2})
                            |> filter(fn: (r) => r["Unit"] == "kWh")
                            |> filter(fn: (r) => r["_field"] == "integral")
                            |> first()
                              `;

    // console.log("totalElectricQuery", totalElectricQuery);
    // console.log("totalElectricQueryPrevious", totalElectricQueryPrevious);
    // console.log("totalQueryCondition", totalQueryCondition);

    let result = [];

    const fluxObserver = {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row);

        // result.push(o);

        // date: moment(o?._time).format(filter === "12m" ? "MMM YYYY" : "DD"),
        result.push({
          code: o.MeasNode,
          value: o?._value,
        });
      },
      error(error) {
        console.error(error);
      },
      complete() {
        let previousQuery = [];

        // console.log("result", result);

        queryApi.queryRows(totalElectricQueryPrevious, {
          next(row, tableMeta) {
            const o = tableMeta.toObject(row);
            // previousQuery.push(o);
            previousQuery.push({
              code: o.MeasNode,
              value: o?._value,
            });
          },
          error(error) {
            console.error(error);
          },
          complete() {
            let labels = [];
            let datas = [];
            let total = 0;

            // console.log("previousQuery", previousQuery);

            let totalObj = client?.measNodes?.find((obj) => {
              return obj.name === "Total" && obj.Type === "power";
            });

            totalQueryCondition?.map((data) => {
              let tempCurrent = result.find((obj) => {
                return obj.code === data.code;
              });
              let tempBefore = previousQuery.find((obj) => {
                return obj.code === data.code;
              });

              // console.log("tempCurrent", tempCurrent);
              // console.log("tempBefore", tempBefore);

              // totalValueBefore += tempBefore?._value;
              // totalValueAfter += tempCurrent?._value;

              let codeObj = client?.measNodes?.find((obj) => {
                return obj.code === data.code;
              });

              let diff = tempCurrent?.value - tempBefore?.value;

              // console.log("diff", diff);
              if (totalObj?.code === data.code) {
                total = Number(diff?.toFixed(2));
              } else {
                labels.push(codeObj?.name);
                datas.push(Number(diff?.toFixed(2)));
              }
            });

            return res.status(200).json({
              labels,
              data: datas,
              total,
            });

            // let payload = {
            //   totalCost: Number(totalCost.toFixed(2)),
            //   percentage: Number(
            //     (
            //       ((totalValueAfter - totalValueBefore) / totalValueAfter) *
            //       100
            //     ).toFixed(2)
            //   ),
            //   channels: tempResult,
            // };
            // // myCache.set("energyCostCache", payload);
            // return res.status(200).json(payload);
          },
        });

        // queryApi.queryRows(totalElectricQuery, {
        //   next(row, tableMeta) {
        //     const o = tableMeta.toObject(row);

        //     let codeObj = client?.measNodes?.find((obj) => {
        //       return obj.code === o.MeasNode;
        //     });
        //     let totalObj = client?.measNodes?.find((obj) => {
        //       return obj.name === "Total" && obj.Type === "power";
        //     });
        //     // console.log("totalObj", totalObj);

        //     if (o.MeasNode !== totalObj?.code) {
        //       labels.push(codeObj.name);
        //       data.push(Number(o._value?.toFixed()));
        //     } else {
        //       total = Number(o._value?.toFixed());
        //     }
        //   },
        //   error(error) {
        //     console.error(error);
        //   },
        //   complete() {
        //     return res.status(200).json({
        //       roundChart: {
        //         labels,
        //         data,
        //         total,
        //       },
        //       stackChart: result,
        //     });
        //   },
        // });
      },
    };
    queryApi.queryRows(totalElectricQuery, fluxObserver);
  } catch (err) {
    console.log("err", err);
    res.status(500).json({
      message: err.toString(),
    });
  }
};

exports.getHeatMapData = async (req, res) => {
  try {
    const { filter } = req.body;

    // let startDate;
    // let endDate;

    let interval = filter === "24h" ? "1h" : filter === "6d" ? "6h" : "24h";
    // if (filter === "24h") {
    //   startDate = moment().subtract(24, "hours").format("YYYY-MM-DD HH:MM");
    //   endDate = moment().format("YYYY-MM-DD HH:MM");
    // } else if (filter === "6d") {
    //   startDate = moment().subtract(6, "days").format("YYYY-MM-DD");
    //   endDate = moment().format("YYYY-MM-DD");
    // } else if (filter === "24d") {
    //   startDate = moment().subtract(24, "days").format("YYYY-MM-DD");
    //   endDate = moment().format("YYYY-MM-DD");
    // }

    let finalResult = [];

    Heatmap.findOne({
      timescale: filter,
      // clientId: req.clientId,
      client: req.userId,
    }).then(async (heatmapData) => {
      if (heatmapData) {
        // console.log("in if");
        return res.status(200).json(heatmapData.data);
      } else {
        let client = await Client.findById(req.userId);

        let nodes = client?.measNodes?.filter((obj) => {
          return (
            obj.Type === "power" &&
            obj.name !== "PV-Production" &&
            obj.name !== "Total"
          );
        });
        nodes?.map(async (node) => {
          // console.log("in else");

          await getHeatmapDataFromInflux(
            filter,
            client.buckets?.[0],
            node.code,
            interval
          )
            .then(async (result) => {
              let valueArr = [];

              result?.map((data, ind) => {
                valueArr.push({
                  // time: moment(data._time)
                  //   .tz("Europe/Rome")
                  //   .format("YYYY-MM-DD , HH"),
                  time: result?.[ind + 1]?._time
                    ? moment(data._time)
                        .tz("Europe/Rome")
                        .format("YYYY-MM-DD , HH - ") +
                      moment(result?.[ind + 1]?._time)
                        .tz("Europe/Rome")
                        .format("HH")
                    : moment(data._time)
                        .tz("Europe/Rome")
                        .format("YYYY-MM-DD , HH"),
                  value: data._value?.toFixed(2),
                });
              });

              finalResult.push({
                name: node.name,
                values: valueArr,
              });
              if (finalResult.length === nodes?.length) {
                await Heatmap.findOneAndUpdate(
                  {
                    timescale: filter,
                    // clientId: req.clientId,
                    client: req.userId,
                  },
                  {
                    data: finalResult,
                  },
                  { new: true, upsert: true }
                );
                return res.status(200).json(finalResult);
              }
            })
            .catch((err) => {
              console.log("err", err);
            });
        });
      }
    });
  } catch (err) {
    console.log("err", err);
    res.status(500).json({
      message: err.toString(),
    });
  }
};

exports.getPvProduction = async (req, res) => {
  try {
    const { filter } = req.body;

    let startDate = moment().toISOString();
    let endDate;
    if (filter === "lastday") {
      startDate = moment().subtract(1, "day").startOf("day").toISOString();
      endDate = moment().subtract(1, "day").endOf("day").toISOString();
    } else if (filter === "lastweek") {
      startDate = moment().subtract(6, "days").toISOString();
      endDate = moment().toISOString();
    } else if (filter === "lastmonth") {
      endDate = moment().toISOString();
      startDate = moment().subtract(1, "month").toISOString();
    } else if (filter === "lastyear") {
      endDate = moment().toISOString();
      startDate = moment().subtract(1, "year").toISOString();
    }

    const url = process.env.INFLUX_URL || "";
    const token = process.env.INFLUX_TOKEN;
    const org = process.env.INFLUX_ORG || "";
    const timeout = Number(process.env.INFLUX_TIMEOUT) || 30000;

    const queryApi = new InfluxDB({ url, token, timeout }).getQueryApi(org);

    let client = await Client.findById(req.userId);

    let queryCondition = client?.measNodes?.find((obj) => {
      return obj.name === "PV-Production";
    });

    let result = [];

    // |> keep(columns: ["MeasNode","_value","_field","Unit"])

    const pvQuery = `
  from(bucket: "${client.buckets?.[0]}")
  |> range(start: ${startDate} , stop : ${endDate})
  |> filter(fn: (r) => r["_measurement"] == "Power")
  |> filter(fn: (r) => r["MeasNode"] == "${queryCondition?.code}")
  |> filter(fn: (r) => r["Unit"] == "kWh")
  |> filter(fn: (r) => r["_field"] == "integral")
  |> aggregateWindow(every: 1h, fn: last, createEmpty: false)
  |> yield(name: "last")
  |> last()
    `;

    // console.log("pvQuery", pvQuery);
    const fluxObserver = {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row);
        result.push(o);
      },
      error(error) {
        console.error(error);
      },
      complete() {
        let temp = [];
        result?.map((data, ind) => {
          if (ind + 1) {
            temp.push({
              type:
                filter === "lastyear"
                  ? moment(data._time).format("MMM")
                  : filter === "lastday"
                  ? moment(data._time).format("HH")
                  : moment(data._time).format("DD"),
              sales:
                result[ind + 1]?._value - data._value < 0
                  ? 0
                  : (result[ind + 1]?._value - data._value).toFixed(2),
              interval:
                filter === "lastyear"
                  ? moment(data._time).format("MMM YYYY")
                  : filter === "lastday"
                  ? moment(data._time).subtract(1, "hour").format("HH - ") +
                    moment(data._time).format("HH a")
                  : moment(data._time).format("DD MMM YYYY"),
            });
          }
        });
        return res.status(200).json(temp?.slice(0, temp.length - 2));
      },
    };

    queryApi.queryRows(pvQuery, fluxObserver);

    // var dateArr = getDateArray(startDate, endDate);

    // //Number(randomNumber(15, 35)),

    // let resultArr = [];

    // dateArr.map((date) => {
    //   resultArr.push({
    //     type:
    //       filter === "lastyear"
    //         ? moment(date).format("MMM")
    //         : moment(date).format("DD"),
    //     sales: Number(randomNumber(1, 80)),
    //     interval:
    //       filter === "lastyear"
    //         ? moment(date).format("MMM YYYY")
    //         : moment(date).format("DD MMM YYYY"),
    //   });
    // });

    // const data = [
    //   {
    //     type: "6",
    //     sales: 38,
    //     interval: "05-06 AM",
    //   },
    //   {
    //     type: "7",
    //     sales: 12,
    //     interval: "06-07 AM",
    //   },
    //   {
    //     type: "8",
    //     sales: 52,
    //     interval: "07-08 AM",
    //   },
    //   {
    //     type: "9",
    //     sales: 12,
    //     interval: "08-09 AM",
    //   },
    //   {
    //     type: "10",
    //     sales: 61,
    //     interval: "09-10 AM",
    //   },
    //   {
    //     type: "11",
    //     sales: 40,
    //     interval: "10-11 AM",
    //   },

    //   {
    //     type: "12",
    //     sales: 50,
    //     interval: "11-12 PM",
    //   },
    //   {
    //     type: "13",
    //     sales: 10,
    //     interval: "12-13 PM",
    //   },
    //   {
    //     type: "14",
    //     sales: 48,
    //     interval: "13-14 PM",
    //   },
    //   {
    //     type: "15",
    //     sales: 25,
    //     interval: "14-15 PM",
    //   },
    //   {
    //     type: "16",
    //     sales: 12,
    //     interval: "15-16 PM",
    //   },
    //   {
    //     type: "17",
    //     sales: 12,
    //     interval: "16-17 PM",
    //   },
    //   {
    //     type: "18",
    //     sales: 38,
    //     interval: "17-18 PM",
    //   },
    //   {
    //     type: "19",
    //     sales: 38,
    //     interval: "18-19 PM",
    //   },
    //   {
    //     type: "20",
    //     sales: 38,
    //     interval: "19-20 PM",
    //   },
    // ];

    // res.status(200).json(filter === "lastday" ? data : resultArr);
  } catch (err) {
    res.status(500).json({
      message: err.toString(),
    });
  }
};

exports.getPowerQuality = async (req, res) => {
  try {
    const data = [
      {
        type: "Voltage Level",
        value: Number(randomNumber(15, 35)),
      },
      {
        type: "Voltage Distortion",
        value: Number(randomNumber(15, 35)),
      },
      {
        type: "Current Distortion",
        value: Number(randomNumber(15, 35)),
      },
    ];

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({
      message: err.toString(),
    });
  }
};
