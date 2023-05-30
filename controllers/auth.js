const Client = require("../models/Client");

const bcrypt = require("bcryptjs");

const randomCode = () => {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
};

exports.forgetPassword = (req, res, next) => {
  const email = req.body.email.toLowerCase();
  let code;
  Client.findOne({ email })
    .then(async (user) => {
      code = user.passwordRecoveryToken;
      user.passwordRecoveryToken = randomCode();
      user.recoveryCode = code;
      user.save();
      return res.status(200).json({
        message: "Recovery Token has been sent to your email.",
        code,
      });
    })
    .catch((err) => {
      console.log(err);
      if (err.statusCode === 401) {
        res.status(401).json({
          message: "No Client found by this email",
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
    const { newPass, ConfirmPass } = req.body;
    const email = req.body.email.toLowerCase();

    if (newPass !== ConfirmPass) {
      return res.status(400).json({
        message: "New & Confirm Password Doesn't Matched",
      });
    } else {
      Client.findOne({ email }).then(async (user) => {
        // const is_equal = await bcrypt.compare(oldPass, newPass);
        // if (is_equal) {
        bcrypt.hash(newPass, 12).then((hashedPassword) => {
          user.password = hashedPassword;
          user.save();
          return res.status(200).json({
            message: "Password Updated!",
          });
        });
        // } else {
        //   return res.status(400).json({
        //     message: "Old Password is Incorrect!",
        //   });
        // }
      });
    }
  } catch (err) {
    console.log(err);
    if (err.statusCode === 401) {
      res.status(401).json({
        message: "No Client found by this email",
      });
    } else {
      res.status(500).json({
        message: "Internal Server Error",
      });
    }
  }
};
exports.verifyCode = (req, res, next) => {
  try {
    const code = req.body.code?.toUpperCase();
    const email = req.body.email.toLowerCase();

    Client.findOne({ email })
      .then(async (user) => {
        if (user.recoveryCode === code) {
          return res.status(200).json({
            message: "Code Verified",
          });
        } else {
          return res.status(400).json({
            message: "Invalid Code",
          });
        }
      })
      .catch((err) => {
        console.log(err);
        if (err.statusCode === 401) {
          res.status(401).json({
            message: "No Client found by this email",
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
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};
