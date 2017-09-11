'use strict';

const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const inquirer = require('inquirer');
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
    let name = params.name;

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

    getUserName(port, (err, username) => {

      if (err) {
        return callback(err);
      }

      let pathname;

      if (params.flags.hasOwnProperty('s') || params.vflags.hasOwnProperty('service')) {
        pathname = `${username}/${name}`;
      } else {
        pathname = source;
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

            let user, service;
            [user, service] = relpath.split(path.sep);

            if (!fs.existsSync(user)) {
              fs.mkdirSync(user)
            }

            !fs.existsSync(relpath) && fs.mkdirSync(relpath);

          } catch (e) {
            return callback(new Error(`Could not create directory ${relpath}`));
          }

        }

        let tmpPath = `/tmp/${source.replace(/\//g, '.')}.tgz`;

        try {
          fs.writeFileSync(tmpPath, response);
        } catch (e) {
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

            let sourceJSON = JSON.parse(fs.readFileSync(path.join(pathname, 'source.json'), 'utf8'));
            let pkgJSON = JSON.parse(fs.readFileSync(path.join(pathname, 'package.json'), 'utf8'));

            let envJSON = {
              local: {},
              dev: {},
              release: {},
            }

            let varPrompts = [];
            let environments = Object.keys(sourceJSON.environmentVariables);

            environments.forEach((env) => {

              let prompts = Object.keys(sourceJSON.environmentVariables[env]).map((enVar) => {
                return {
                  name: `${env}.${enVar}`,
                  message: `${env}.${enVar}`,
                  type: 'input',
                };
              });

              varPrompts = varPrompts.concat(prompts);

            });

            inquirer.prompt(varPrompts, function (promptResult) {

              for (let res in promptResult){
                let env, key;
                [env, key] = res.split('.');
                envJSON[env][key] = promptResult[res];
              }

              fs.writeFileSync(
                path.join(pathname, 'env.json'),
                JSON.stringify(envJSON, null, 2)
              );

              fs.unlinkSync(path.join(pathname, 'source.json'));

              if (source.indexOf('@') !== -1) {
                pkgJSON.stdlib.source = source;
              } else {
                pkgJSON.stdlib.source = `${source}@${pkgJSON.version}`
              }

              pkgJSON.version = '0.0.0';
              pkgJSON.name = name;
              pkgJSON.stdlib.name = `${username}/${name}`;

              fs.writeFileSync(
                path.join(pathname, 'package.json'),
                JSON.stringify(pkgJSON, null, 2)
              );

              console.log();
              console.log(`Service created from source code: ${chalk.bold(source)} at:`);
              console.log(`  ${chalk.bold(pathname)}`);
              console.log();

              return callback(null)

            });

          } else {

            console.log(`Source code ${chalk.bold(source)} retrieved to:`);
            console.log(`  ${chalk.bold(pathname)}`);
            console.log();

            return callback(null);

          }

        });

      });

    });

  }

}

function getUserName(port, callback) {

  let host = 'api.jacobb.us';
  let resource = new APIResource(host, port);
  resource.authorize(Credentials.read('ACCESS_TOKEN'));

  resource.request('v1/users').index({me: true}, (err, response) => {

    if (err) {
      return callback(err);
    }

    return callback(null, response.data[0].username);

  });

}

module.exports = SourceGetCommand;
