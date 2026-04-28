// https://gist.github.com/MilosPaunovic/1da784b83466197196b4b0fd6448c0b1
const dotenv = require('dotenv');

const files = {
  ...dotenv.config({ path: 'variables/.env' }).parsed,
  ...dotenv.config({ path: `variables/.env.${process.env.ENVIRONMENT}` }).parsed,
};

module.exports = () => {
  Object.keys(files, (key) => {
    if (typeof files[key] !== 'string') {
      files[key] = JSON.stringify(files[key]);
    }
  });
  return files;
};
