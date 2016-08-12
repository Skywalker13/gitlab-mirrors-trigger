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

function gitmirror (config, res, cmd, projectName) {
  const gitmirror = spawn (config.gitmirror.bin[cmd], [projectName], {
    cwd: config.gitmirror.path
  });

  gitmirror.stdout.on ('data', (data) => res.write (data.toString ()));
  gitmirror.stderr.on ('data', (data) => res.write (data.toString ()));

  gitmirror.on ('close', (code) => {
    if (code !== 0) {
      res.write (`exited with error code: ${code}`);
    }
    res.end ();
  });
}

function start (configFile) {
  const config = readConfig (configFile)

  app.put ('/update/:project', (req, res, next, project) => {
    gitmirror (config, res, 'update', project);
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
