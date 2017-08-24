'use strict';

const Command = require('cmnd').Command;
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

class SourceAdd extends Command {

  constructor() {

    super('source', 'add');

  }

  help() {

    return {
      description: 'Convert a StdLib service into source code'
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
    let source = require(path.join(__dirname,`../../templates/${build}/source.json`));
    let sourcePath = path.join(process.cwd(), 'source.json');

    if (fs.existsSync(sourcePath)) {
      return callback(new Error('source.json already exists'));
    }

    fs.writeFileSync(
      sourcePath,
      JSON.stringify(source, null, 2)
    );

    console.log();
    console.log(chalk.bold.green('Success!'));
    console.log();
    console.log(`source.json created at:`);
    console.log(`  ${chalk.bold(sourcePath)}`);
    console.log();

    return callback(null);
  }

}

module.exports = SourceAdd;
