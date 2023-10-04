require('dotenv').config();
require('module-alias/register')

const fs = require('node:fs');
const packageJSON = require('@root/package.json');
const { checkEnv, genEnv } = require('dotenv-joi');
const envSchema = require('./envSchema');

const port = process.env.BALANCER_PORT || 80;

const { log } = require('@lib/logger');
const { init } = require('@lib/store');

process.package = packageJSON;

process.log = {};
process.log = log;

// Check if all .env values are valid
if (fs.existsSync('.env')) {
  // Check if all .env values are valid
  const isENVok = checkEnv(envSchema);
  if (isENVok) {
    process.log.error('Invalid ENV values. Please check your .env file and fix the above mentioned errors.');
    process.exit(1);
  }
} else {
  const envFile = genEnv(envSchema);
  fs.writeFileSync('.env', envFile);
  process.log.error('No .env file found. A new one has been generated. Please fill it with your values and restart the application.');
  process.exit(1);
}

(async () => {
  try {
    await init();

    //This timeout is used to delay accepting connections until the server is fully loaded. 
    //It could come to a crash if a request comes in before the settings cache was fully laoded.
    setTimeout(() => {
      const app = require('@src/app');

      setTimeout(() => {
        if (process.env.EXTRAERRORWEBDELAY > 0) {
          process.log.system(`Webserver was delayed by ${process.env.EXTRAERRORWEBDELAY || 500}ms beause of a error.`);
        }
        app.listen(port)
          .then((socket) => process.log.system(`Listening on port: ${port}`))
          .catch((error) => process.log.error(`Failed to start webserver on: ${port}\nError: ${error}`));
      }, process.env.EXTRAERRORWEBDELAY || 500);
    }, process.env.GLOBALWAITTIME || 100);
  } catch (error) {
    console.error(error);
  }
})();