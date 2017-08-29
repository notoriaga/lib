'use strict';

const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const Credentials = require('../../credentials.js');

const chalk = require('chalk');

class SourceGetCommand extends Command {

  constructor() {

    super('source', 'get');

  }

  help() {

    return {
      description: 'Retrieves and extracts StdLib source code',
      args: [
        'full source code name'
      ],
      flags: {
        f: 'Force command if not in root directory',
        w: 'Write over - overwrite the target directory contents',
        s: 'Service - create a service from the source code',
      },
      vflags: {
        'force': 'Force command if not in root directory',
        'write-over': 'Write over - overwrite the target directory contents',
        'service': 'Service - create a service from the source code',
      }
    };

  }

  run(params, callback) {

    let source = params.args[0] || '';
    let name = params.flags.name;

    let force = params.flags.hasOwnProperty('f') || params.vflags.hasOwnProperty('force');
    let write = params.flags.hasOwnProperty('w') || params.vflags.hasOwnProperty('write-over');

    let host = 'registry.stdlib.com';
    let port = 443;

    let hostname = (params.flags.h && params.flags.h[0]) || '';
    let matches = hostname.match(/^(https?:\/\/)?(.*?)(:\d+)?$/);

    if (hostname && matches) {
      host = matches[2];
      port = parseInt((matches[3] || '').substr(1) || (hostname.indexOf('https') === 0 ? 443 : 80));
    }

    getUserName(params.flags.hasOwnProperty('s'), port).then(results => {

      let pathname;

      if (name) {
        pathname = `${results}/${name}`
      } else {
        pathname = source
      }

      if (!source) {
        console.log();
        console.log(chalk.bold.red('Oops!'));
        console.log();
        console.log(`Please specify source code name`);
        console.log();
        return callback(null);
      }

      if (!force && !Credentials.location(1)) {
        console.log();
        console.log(chalk.bold.red('Oops!'));
        console.log();
        console.log(`You're trying to retrieve source code,`);
        console.log(`But you're not in a root stdlib project directory.`);
        console.log(`We recommend against this.`);
        console.log();
        console.log(`Use ${chalk.bold('lib get ' + source + ' --force')} to override.`);
        console.log();
        return callback(null);
      }

      if (!write && fs.existsSync(pathname)) {
        console.log();
        console.log(chalk.bold.red('Oops!'));
        console.log();
        console.log(`The directory you're retrieving to already exists:`);
        console.log(`  ${chalk.bold(pathname)}`);
        console.log();
        console.log(`Try removing the existing directory first.`);
        console.log();
        console.log(`Use ${chalk.bold('lib get ' + source + ' --write-over')} to override.`);
        console.log();
        return callback(null);
      }

      let resource = new APIResource(host, port);
      resource.authorize(Credentials.read('ACCESS_TOKEN'));

      let endpoint = `sources/${source}/package.tgz`;

      console.log();
      console.log(`Retrieving ${chalk.bold(host + '/' + endpoint)}...`);
      console.log();

      return resource.request(endpoint).index({}, (err, response) => {

        if (err) {
          return callback(err);
        }

        let directories = pathname.split(path.sep);

        for (let i = 1; i < directories.length; i++) {
          let relpath = pathname.split(path.sep).slice(0, i + 1).join(path.sep);
          try {
            !fs.existsSync(relpath) && fs.mkdirSync(relpath);
          } catch (e) {
            console.error(e);
            return callback(new Error(`Could not create directory ${relpath}`));
          }
        }

        let tmpPath = `/tmp/${source.replace(/\//g, '.')}.tgz`;

        try {
          fs.writeFileSync(tmpPath, response);
        } catch (e) {
          console.error(e);
          return callback(new Error(`Could not write temporary file ${tmpPath}`));
        }

        child_process.exec(`tar -xzf ${tmpPath} -C ${pathname}`, (err) => {

          // cleanup
          fs.unlinkSync(tmpPath);

          if (err) {
            return callback(`Could not extract from package`);
          }

          console.log(chalk.bold.green('Success!'));
          console.log();

          if (params.flags.hasOwnProperty('s') || params.vflags.hasOwnProperty('service')) {
            // with -s we copy over source.json fields and delete it

            //let sourceJSON = require(path.join(pathname, 'source.json')); why doesn't this work??
            let sourceJSON = JSON.parse(fs.readFileSync(path.join(pathname, 'source.json'), 'utf8'));

            fs.writeFileSync(
              path.join(pathname, 'env.json'),
              JSON.stringify(sourceJSON.environmentVariables, null, 2)
            );

            fs.unlinkSync(path.join(pathname, 'source.json'));

            console.log(`Service created from source code: ${chalk.bold(source)} at:`);
            console.log(`  ${chalk.bold(pathname)}`);
            console.log();

          } else {

            console.log(`Source code ${chalk.bold(source)} retrieved to:`);
            console.log(`  ${chalk.bold(pathname)}`);
            console.log();

          }

          return callback(null);

        });

      });

    }).catch(err => {
      console.log(err);
    });

  }

}

function getUserName(staging, port) {

  return new Promise(function(resolve, reject) {

    let host = staging ? 'api.jacobb.us' : 'api.polybit.com'

    let resource = new APIResource(host, port);
    resource.authorize(Credentials.read('ACCESS_TOKEN'));

    resource.request('v1/users').index({me: true}, (err, response) => {

      if (err) {
        return reject(err);
      }

      return resolve(response.data[0].username);

    });

  });

}

module.exports = SourceGetCommand;
