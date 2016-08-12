'use strict';

var fs      = require ('fs');
var path    = require ('path');
var spawn   = require ('child_process').spawn;
var express = require ('express');
var program = require ('commander');

var app = express();


function readConfig (configPath) {
  return JSON.parse (fs.readFileSync (configPath));
}

function readPackage () {
  return JSON.parse (fs.readFileSync (path.join (__dirname, 'package.json')));
}

function gitmirror (config, res, cmd, project, token) {
  if (!config.token || config.token !== token) {
    res.sendStatus (401);
    return;
  }

  var bin = path.join (config.gitmirror.path, config.gitmirror.bin[cmd]);
  var gitmirror = spawn (bin, [project], {
    cwd: config.gitmirror.path
  });

  gitmirror.stdout.on ('data', function (data) {res.write (data.toString ());});
  gitmirror.stderr.on ('data', function (data) {res.write (data.toString ());});

  gitmirror.on ('close', function (code) {
    if (code !== 0) {
      res.write ('exited with error code: %d', code);
    }
    res.end ();
  });
}

function start (configFile) {
  var config = readConfig (configFile)

  app.get ('/update/:project/:token', function (req, res) {
    gitmirror (config, res, 'update', req.params.project, req.params.token);
  });

  app.listen (config.server.port);
  console.log ('server listing on port %s', config.server.port);
}

var pkgDef = readPackage ();

program
  .version (pkgDef.version)
  .command ('start <config>')
  .action (start);

program.parse (process.argv);
