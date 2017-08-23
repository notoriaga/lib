'use strict';

const Command = require('cmnd').Command;
const TemplateUpCommand = require('./up.js');

class TemplateReleaseCommand extends Command {

  constructor() {

    super('template', 'release');

  }

  help() {

    return {
      description: 'Pushes release of StdLib template to registry and cloud (Alias of `lib template:up -r`)'
    };

  }

  run(params, callback) {

    params.flags.r = true;
    params.args = [];

    TemplateUpCommand.prototype.run.call(this, params, callback);

  }

}

module.exports = TemplateReleaseCommand;
