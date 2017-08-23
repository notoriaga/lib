'use strict';

const Command = require('cmnd').Command;
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

class TemplateAdd extends Command {

  constructor() {

    super('template', 'add');

  }

  help() {

    return {
      description: 'Convert a StdLib service into a template'
    };

  }

  run(params, callback) {

    let pkg;

    try {
      pkg = require(path.join(process.cwd(), 'package.json'));
    } catch(e) {
      return callback(new Error('Invalid package.json'));
    }

    if (!pkg.stdlib) {
      return callback(new Error('No stdlib information set in "package.json"'));
    }

    let build = pkg.stdlib.build;
    let template = require(path.join(__dirname,`../../templates/${build}/template.json`));
    let templatePath = path.join(process.cwd(), 'template.json');

    if (fs.existsSync(templatePath)) {
      return callback(new Error('template.json already exists'));
    }

    fs.writeFileSync(
      templatePath,
      JSON.stringify(template, null, 2)
    );

    console.log();
    console.log(chalk.bold.green('Success!'));
    console.log();
    console.log(`template.json created at:`);
    console.log(`  ${chalk.bold(templatePath)}`);
    console.log();

    return callback(null);
  }

}

module.exports = TemplateAdd;
