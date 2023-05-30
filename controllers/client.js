const Client = require("../models/Client");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const colors = require("../functions/colors.json");
var zmq = require("zeromq");

const randomCode = () => {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
};

function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex != 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

exports.create = async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase();
    const password = req.body.password;

    // let shuffledColors = shuffle(colors);
    const totalClients = await Client.find().countDocuments();

    if (email && password) {
      Client.findOne({ email }).then(async (user) => {
        if (user) {
          return res.status(400).json({
            message: "Client with same email already exists",
          });
        } else {
          if (password.length >= 8) {
            bcrypt.hash(password, 12).then((hashedPassword) => {
              let payload = {
                ...req.body,
                email,
                clientId: totalClients + 1,
                password: hashedPassword,
                colors: req.body.colors
                  ? req.body.colors
                  : shuffle(colors)?.slice(0, req.body.dataChannels),
                barColors: req.body.barColors
                  ? req.body.barColors
                  : shuffle(colors)?.slice(0, 3),
                // livePageConfig: {
                //   ...livePageConfig,
                //   heatChannels: shuffle(colors)?.slice(
                //     0,
                //     req.body.livePageConfig.heatChannels
                //   ),
                // },
                passwordRecoveryToken: randomCode(),
                controlNodes: sidebarAccess.loadPeak
                  ? req.body.controlNodes
                  : [],
              };
              Client.create(payload)
                .then(() => {
                  return res.status(200).json({
                    message: "Client Registered Succesfully",
                  });
                })
                .catch((err) => {
                  console.log(err);
                  return res.status(500).json({
                    message: "Error Registering Client",
                    err,
                  });
                });
            });
          } else {
            return res.status(400).json({
              message: "Password must be greater than or equal to 8 characters",
            });
          }
        }
      });
    } else {
      return res.status(400).json({
        message: "Email or Password is missing",
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
};

exports.getAll = async (req, res) => {
  try {
    Client.find().then((employees) => {
      res.status(200).json(employees);
    });
  } catch (err) {
    res.status(500).json({
      message: err.toString(),
    });
  }
};

exports.getClient = async (req, res) => {
  try {
    Client.findById(req.userId).then((employees) => {
      res.status(200).json(employees);
    });
  } catch (err) {
    res.status(500).json({
      message: err.toString(),
    });
  }
};

exports.update = (req, res, next) => {
  try {
    Client.findByIdAndUpdate(req.body.id, req.body, { new: true })
      .then(async () => {
        res.status(200).json({
          message: "Client Profile Updated",
        });
      })
      .catch((err) => {
        res.status(400).json({
          message: err,
        });
      });
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};

exports.updateClientLocation = (req, res, next) => {
  try {
    Client.findByIdAndUpdate(
      req.userId,
      {
        geoLocation: {
          lat: req.body.lat,
          lng: req.body.lng,
        },
      },
      { new: true }
    )
      .then(async () => {
        res.status(200).json({
          message: "Client Location Updated",
        });
      })
      .catch((err) => {
        res.status(400).json({
          message: err,
        });
      });
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};

exports.updateLoadPeakActions = (req, res, next) => {
  try {
    Client.findByIdAndUpdate(
      req.userId,
      { controlNodes: req.body },
      { new: true }
    )
      .then(async (client) => {
        // var jsonObject = {
        //   REQUEST: "updateLoadPeakActions",
        //   clientId: client.clientId,
        //   controlNodes: req.body,
        // };
        // var stringObject = JSON.stringify(jsonObject);

        // let value = myCache.get("electricConsumptionCache");

        // if (value) {
        //   console.log("value", value);
        // }

        // const updatesock = new zmq.Request({
        //   immediate: true,
        //   sendTimeout: 5000,
        //   receiveTimeout: 5000,
        // });
        // updatesock.connect(process.env.ZEROMQ_CONNECTION_PROD);

        // await updatesock.send(stringObject);
        res.status(200).json({
          message: "Load Peak Actions Updated",
        });
      })
      .catch((err) => {
        res.status(400).json({
          message: err,
        });
      });
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};

exports.login = (req, res, next) => {
  const email = req.body.email.toLowerCase();
  const password = req.body.password;
  let loadedUser = "";
  let userType = "";

  Client.findOne({ email })
    .then(async (user) => {
      if (user) {
        loadedUser = user;
        userType = "client";
        return bcrypt.compare(password, user.password);
      } else {
        const error = new Error("No Client Found by this Email.");
        error.statusCode = 401;
        throw error;
      }
    })
    .then(async (isEqual) => {
      if (!isEqual) {
        const error = new Error("Invalid Password");
        error.statusCode = 400;
        throw error;
      }

      // var jsonObject = {
      //   REQUEST: "pushUserData",
      //   userData: loadedUser,
      // };
      // var stringObject = JSON.stringify(jsonObject);

      // let value = myCache.get("electricConsumptionCache");

      // if (value) {
      //   console.log("value", value);
      // }

      // const loginsock = new zmq.Request({
      //   immediate: true,
      //   sendTimeout: 5000,
      //   receiveTimeout: 5000,
      // });
      // loginsock.connect(process.env.ZEROMQ_CONNECTION_PROD);

      // await loginsock.send(stringObject);

      const token = jwt.sign(
        {
          userId: loadedUser._id,
          clientId: loadedUser.clientId,
          type: userType,
        },
        "4=?ADE56GJMC2%7&kF%HTqy8CfTZuj5e2aTKy2g!^F-W%7uP$cUqfuWcQxyVP*ez"
      );

      res.status(200).json({
        message: "Logged In Succesfully",
        token: token,
        user: loadedUser,
        userType,
      });
    })
    .catch((err) => {
      console.log(err);
      if (err.statusCode === 401) {
        res.status(401).json({
          message: "No Client Found by this Email.",
        });
      } else if (err.statusCode === 400) {
        res.status(400).json({
          message: "Invalid Password",
        });
      } else {
        res.status(500).json({
          message: "Internal Server Error",
        });
      }
    });
};

exports.updatePassword = (req, res, next) => {
  try {
    const { newPass, ConfirmPass, oldPass } = req.body;
    if (newPass !== ConfirmPass) {
      return res.status(400).json({
        message: "New & Confirm Password Doesn't Matched",
      });
    }
    // else if (newPass === oldPass) {
    //   return res.status(400).json({
    //     message: "New & Old Password are same, password not updated",
    //   });
    // }
    else {
      Client.findById(req.userId, (err, doc) => {
        const validate = bcrypt.compareSync(oldPass, doc.password);
        if (!validate) {
          return res.status(400).json({ message: "Old Password is Incorrect" });
        }
        bcrypt.hash(newPass, 12).then((hashedPassword) => {
          doc.password = hashedPassword;
          doc.save();
          return res.status(200).json({
            message: "Password Updated!",
          });
        });
      });
    }
  } catch (err) {
    return res.status(500).json(err);
  }
};
exports.search = async (req, res) => {
  try {
    Client.find({ userName: { $regex: req.body.name, $options: "i" } })
      .select("-password -passwordRecoveryToken")
      .then((employees) => {
        res.status(200).json(employees);
      });
  } catch (err) {
    res.status(500).json({
      message: err.toString(),
    });
  }
};
