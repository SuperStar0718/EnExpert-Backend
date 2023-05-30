const Logs = require("../models/Logs");

exports.generateLogs = async (req, res) => {
  try {
    Logs.findOneAndUpdate(
      {
        page: req.body.page,
        section: req.body.section,
        filter: req.body.filter,
      },
      {
        ...req.body,
        client: req.userId,
        clientId: req.clientId,
      },
      { new: true, upsert: true }
    ).then(() => {
      res.status(200).json({
        message: "Logs Created",
      });
    });
  } catch (err) {
    res.status(500).json({
      message: err.toString(),
    });
  }
};

exports.getAllLogs = async (req, res) => {
  try {
    Logs.find().then((logs) => {
      res.status(200).json(logs);
    });
  } catch (err) {
    res.status(500).json({
      message: err.toString(),
    });
  }
};
