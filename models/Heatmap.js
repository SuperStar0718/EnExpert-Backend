const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const heatmapSchema = new Schema(
  {
    clientId: String,
    data: Array,
    timescale: String, //24h,6d,24d
    client: {
      type: Schema.Types.ObjectId,
      ref: "client",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("heatmap", heatmapSchema);
