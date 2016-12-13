'use strict';

const Command = require('cmnd').Command;
const path = require('path');
const spawn = require('child_process').spawn;
const spawnSync = require('child_process').spawnSync;

const parser = require('../parser.js');

class HTTPCommand extends Command {

  constructor() {

    super('http');

  }

  help() {

    return {
      description: 'Creates HTTP Server for Current Service',
      flags: {p: 'Port (Default 8170)'},
      vflags: {port: 'Port (Default 8170)'}
    };

  }

  run(params, callback) {

    let port = (params.flags.p || params.vflags.port || [])[0] || 8170;
    let offline = !!(params.flags.o || params.vflags.offline);
    let pkg = {};

    try {
      pkg = require(path.join(process.cwd(), 'package.json'));
    } catch (e) {
      throw new Error('Invalid package.json in this directory');
      return true;
    }

    if (pkg.stdlib.http && pkg.stdlib.http.prerun) {
      let spawnArgs = pkg.stdlib.http.prerun.split(' ');
      spawnArgs[2] = 'node_modules/.bin/' + spawnArgs[2];
      spawn('node_modules/.bin/' + spawnArgs[0], spawnArgs.slice(1), {
        stdio: 'inherit'
      });
    }

    if (!offline) {
      parser.check(err => parser.createServer(pkg, port, !!err));
    } else {
      parser.createServer(pkg, port, offline);
    }
    if (pkg.stdlib.scripts && pkg.stdlib.scripts.http) {
      let npmPathCommand = spawnSync('npm', ['bin']);
      let npmPath = npmPathCommand.stdout.toString().trim();
      process.env.PATH = npmPath + ':' + process.env.PATH;

      let http = pkg.stdlib.scripts.http;
      let cmds = duringhttp instanceof Array ? http : [http];
      for (let i = 0; i < cmds.length; i++) {
        let cmd = cmds[i].split(' ');
        if (!cmd.length) {
          continue;
        }
        let command = spawn(cmd[0], cmd.slice(1), {stdio: [0, 1, 2]});
        command.on('error', err => {
          callback(new Error('Error running preup scripts'));
        });
      }
    }

  }

}

module.exports = HTTPCommand;
