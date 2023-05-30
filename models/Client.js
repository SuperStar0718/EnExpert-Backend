const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const clientSchema = new Schema(
  {
    userName: String,
    buckets: Array,
    colors: Array,
    barColors: Array,
    clientId: Number,
    dataChannels: Number,
    language: String,
    priceElectricDelivery: String,
    priceWaterDelivery: String,
    priceHeatDelivery: String,
    priceGasDelivery: String,
    priceEnergyInput: String,
    maxPowerSupply: String,
    loadPeakPrice: String,
    zipCode: String,
    sidebarAccess: {
      live: {
        type: Boolean,
        default: true,
      },
      analysis: {
        type: Boolean,
        default: true,
      },
      energyProduction: {
        type: Boolean,
        default: true,
      },
      loadPeak: {
        type: Boolean,
        default: true,
      },
      digitalization: {
        type: Boolean,
        default: true,
      },
      pvProduction: {
        type: Boolean,
        default: true,
      },
    },
    measNodes: [
      {
        code: String,
        name: String,
        Type: String,
      },
    ],
    controlNodes: [
      {
        code: String,
        name: String,
        isChecked: {
          type: Boolean,
          default: false,
        },
        percentage: {
          type: Number,
          default: 0,
        },
      },
    ],
    geoLocation: {
      lat: String,
      lng: String,
    },
    livePageConfig: {
      batteries: Number, //not more than 4 batteries
      heatChannels: Number,
      waterConsumption: {
        type: Boolean,
        default: true,
      },
      heatColors: String, //colors on live page
      batteryColor: String, //colors on live page
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    blocked: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      required: true,
    },
    passwordRecoveryToken: {
      type: String,
      required: false,
    },
    recoveryCode: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("client", clientSchema);
