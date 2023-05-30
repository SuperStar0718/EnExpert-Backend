const randomNumber = (min, max) => {
  return Number(Math.random() * (max - min) + min).toFixed();
};

const getDateArray = (start, end) => {
  var arr = [];
  let startDate = new Date(start);
  let endDate = new Date(end);
  while (startDate <= endDate) {
    arr.push(new Date(startDate).toISOString().slice(0, 10));
    startDate.setDate(startDate.getDate() + 1);
  }
  return arr;
};

module.exports = { randomNumber, getDateArray };
