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
      description: 'Converts a StdLib service into source code'
    };

  }

  run(params, callback) {

    let pkgJSON;

    try {
      pkgJSON = require(path.join(process.cwd(), 'package.json'));
    } catch(e) {
      return callback(new Error('Invalid package.json'));
    }

    if (!pkgJSON.stdlib) {
      return callback(new Error('No stdlib information set in "package.json"'));
    }

    let sourceTemplate = require(path.join(__dirname,`../../templates/sourceCode/source.json`));
    let sourcePath = path.join(process.cwd(), 'source.json');

    if (fs.existsSync(sourcePath)) {
      return callback(new Error('source.json already exists'));
    }
    
    let envJSON;

    try {
      envJSON = require(path.join(process.cdw(), 'env.json'));
    } catch(e) {
      return callback(new Error('Invalid env.json'));
    }
    
    sourceTemplate.environmentVariables = {};

    // prioritize release, then dev, then local  
    if (envJSON.release) {
      for (var field in envJSON.release) {
        sourceTemplate.environmentVariables[field] = {default: '', description: ''};
      }
    } else if (envJSON.dev) {
      for (var field in envJSON.dev) {
        sourceTemplate.environmentVariables[field] = {default: '', description: ''};
      }
    } else if (envJSON.local) {
      for (var field in envJSON.local) {
        sourceTemplate.environmentVariables[field] = {default: '', description: ''};
      }
    }

    fs.writeFileSync(
      sourcePath,
      JSON.stringify(sourceTemplate, null, 2)
    );

    let dirs = process.cwd().split(path.sep);
    let origin =  path.join(dirs[dirs.length - 2], dirs[dirs.length - 1])
    pkgJSON.stdlib.source = origin;

    fs.writeFileSync(
      path.join(process.cwd(), 'package.json'),
      JSON.stringify(pkgJSON, null, 2)
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
