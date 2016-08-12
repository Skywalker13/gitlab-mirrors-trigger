'use strict';

const fs      = require ('fs');
const path    = require ('path');
const {spawn} = require ('child_process');
const express = require ('express');
const program = require ('commander');

const app = express();


function readConfig (configPath) {
  return JSON.parse (fs.readFileSync (configPath));
}

function readPackage () {
  return JSON.parse (fs.readFileSync (path.join (__dirname, 'package.json')));
}

function gitmirror (config, cmd, projectName) {
  const gitmirror = spawn (config.gitmirror.bin[cmd], [projectName], {
    cwd: config.gitmirror.path
  });

  gitmirror.stdout.on ('data', (data) => console.log (data.toString ()));
  gitmirror.stderr.on ('data', (data) => console.error (data.toString ()));

  gitmirror.on ('close', (code) => {
    if (code !== 0) {
      console.error (`exited with error code: ${code}`);
    }
  });
}

function start (configFile) {
  const config = readConfig (configFile)

  app.put ('/update/:project', (req, res, next, project) => {
    gitmirror (config, 'update', project);
    next ();
  });

  app.listen (config.server.port);
  console.log (`server listing on port ${config.server.port}`)
}

const pkgDef = readPackage ();

program
  .version (pkgDef.version)
  .command ('start <config>')
  .action (start);

program.parse (process.argv);
