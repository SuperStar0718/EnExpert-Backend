const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const histogramSchema = new Schema(
  {
    name: String,
    code: String,
    clientId: String,
    values: Array,
    timescale: String, //week,month,year
    client: {
      type: Schema.Types.ObjectId,
      ref: "client",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("histogram", histogramSchema);
