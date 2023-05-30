var zmq = require("zeromq");

const generalRecieve = async (params) => {
  const sock = new zmq.Request({
    immediate: true,
    sendTimeout: 500,
    receiveTimeout: 500,
  });
  sock.connect(process.env.ZEROMQ_CONNECTION_PROD);

  let message;
  await sock
    .send(params)
    .then(async (resp) => {
      console.log("send then");
      const [result] = await sock.receive();
      //   console.log(JSON.parse(JSON.parse(result.toString())));
      message = JSON.parse(JSON.parse(result.toString()));
      //   const dataCopy = JSON.parse(
      //     JSON.stringify(JSON.parse(JSON.parse(result.toString())))
      //   );

      //   let dataChannels = [];

      //   if (data) {
      //     let totalObj = client?.measNodes?.find((obj) => {
      //       return obj.name === "Total";
      //     });

      //     delete data[totalObj.code];

      //     Object.entries(data)?.map(([key, value]) => {
      //       // console.log("key, value", key, value);
      //       let codeObj = client?.measNodes?.find((obj) => {
      //         return obj.code === key;
      //       });
      //       dataChannels.push({
      //         name: codeObj ? codeObj.name : key,
      //         percentage: Number(
      //           ((value / dataCopy[totalObj.code]) * 100).toFixed()
      //         ),
      //       });
      //     });

      //     let payload = {
      //       TotalConsumption: dataCopy[totalObj.code],
      //       dataChannels,
      //       Last_Hour_Comparison: -1.3,
      //     };

      //     return res.status(200).json(payload);
      //   } else {
      //     return res.status(200).json({
      //       TotalConsumption: 3456789.221,
      //       dataChannels: staticDataChannels,
      //       Last_Hour_Comparison: -1.3,
      //     });
      //   }
    })
    .catch((err) => {
      console.log("in send catch");
      message = false;
      //   return false;
      //   return res.status(200).json({
      //     TotalConsumption: 3456789.221,
      //     dataChannels: staticDataChannels,
      //     Last_Hour_Comparison: -1.3,
      //   });
    });
  return message;
};

module.exports = { generalRecieve };
