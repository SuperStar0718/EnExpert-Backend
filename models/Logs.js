const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const logsSchema = new Schema(
  {
    page: String,
    section: String,
    filter: String,
    description: String,
    aggregation: String,
    clientId: Number,
    client: {
      type: Schema.Types.ObjectId,
      ref: "client",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("logs", logsSchema);
