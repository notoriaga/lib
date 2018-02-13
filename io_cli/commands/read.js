'use strict';

const fs = require('fs');
const path = require('path');

const APIResource = require('api-res');
const chalk = require('chalk');
const Command = require('cmnd').Command;

const config = require('../../cli/config');

class GetCommand extends Command {

  constructor() {

    super('read');

  }

  help() {

    return {
      description: 'Reads a file from StdIO and saves it locally',
      args: [
        'StdIO file path',
        'Local destination'
      ],
      flags: {
        t: 'Library Token (default is currently active)',
        w: 'Write over old file'
      },
      vflags: {
        'token': 'Library Token (default is currently active)',
        'write-over': 'Write over old file'
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

    let stdioPath = params.args[0] || ''
    if (!stdioPath) {
      console.log()
      console.log(chalk.bold.red('Oops!'))
      console.log()
      console.log(`Please specify a StdIO file`)
      console.log()
      return callback(null)
    }

    let destination = params.args[1] || ''
    if (!destination) {
      console.log()
      console.log(chalk.bold.red('Oops!'))
      console.log()
      console.log(`Please specify a destination`)
      console.log()
      return callback(null)
    }

    let write = params.flags.hasOwnProperty('w') || params.vflags.hasOwnProperty('write-over');
    if (fs.existsSync(destination) && !write) {
      console.log()
      console.log(chalk.bold.red('Oops!'))
      console.log()
      console.log('The file you are trying to write to already exists.')
      console.log('Use -w to force writing to this location')
      console.log()
      return callback(null)
    }

    let writeStream = fs.createWriteStream(destination)

    let resource = new APIResource(host, port)
    resource.authorize(token)

    return resource
      .request('/files?path=' + encodeURIComponent(stdioPath))
      .stream(
        'GET',
        null,
        (data) => {
          writeStream.write(data)
        },
        (err, result) => {
          if (err) {
            return callback(err)
          }
          return callback(null, `File written to ${destination}`)
        }
      )

  }

}

module.exports = GetCommand;
