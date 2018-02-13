'use strict';

const fs = require('fs');
const path = require('path');

const APIResource = require('api-res');
const chalk = require('chalk');
const Command = require('cmnd').Command;

const config = require('../../cli/config');

class GetCommand extends Command {

  constructor() {

    super('write');

  }

  help() {

    return {
      description: 'Writes a file to StdIO',
      args: [
        'File destination',
        'File path'
      ],
      flags: {
        t: 'Library Token (default is currently active)'
      },
      vflags: {
        token: 'Library Token (default is currently active)'
      }
    };

  }

  run(params, callback) {

    let host = 'staging-io.r6hztkpcbr.us-west-2.elasticbeanstalk.com'
    let port = 80

    let hostname = (params.flags.h && params.flags.h[0]) || ''
    let matches = hostname.match(/^(https?:\/\/)?(.*?)(:\d+)?$/)

    if (hostname && matches) {
      host = matches[2]
      port = parseInt((matches[3] || '').substr(1) || (hostname.indexOf('https') === 0 ? 443 : 80))
    }

    let token = (params.flags.t && params.flags.t[0]) || (params.flags.token && params.flags.token[0]) || config.get('ACTIVE_LIBRARY_TOKEN')

    if (!token) {
      console.log()
      console.log(chalk.bold.red('Oops!'))
      console.log()
      console.log(`No active library token found`)
      console.log(`Try running: ${chalk.bold('lib tokens')}`)
      console.log()
      return callback(null)
    }

    let fileDest = params.args[0] || ''
    if (!fileDest) {
      console.log()
      console.log(chalk.bold.red('Oops!'))
      console.log()
      console.log(`Please specify a file destination`)
      console.log()
      return callback(null)
    }

    let filePath = params.args[1] || ''
    if (!filePath) {
      console.log()
      console.log(chalk.bold.red('Oops!'))
      console.log()
      console.log(`Please specify a file name`)
      console.log()
      return callback(null)
    }

    if (!fs.existsSync(filePath)) {
      console.log()
      console.log(chalk.bold.red('Oops!'))
      console.log()
      console.log(`The file you're trying to write does not exist:`)
      console.log(`  ${chalk.bold(filePath)}`)
      console.log()
      return callback(null)
    }

    let fileData = fs.readFileSync(filePath)

    let resource = new APIResource(host, port)
    resource.authorize(token)

    return resource
      .request('/files?path=' + encodeURIComponent(fileDest))
      .stream(
        'POST',
        fileData,
        null,
        (err, result) => {
          if (err) {
            return callback(err)
          }
          return callback(null, result.toString())
        }
      )

  }

}

module.exports = GetCommand;
