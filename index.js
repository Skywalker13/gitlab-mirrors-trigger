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

function gitmirror (config, res, cmd, project, token, callback) {
  if (!config.token || config.token !== token) {
    res.sendStatus (401);
    return;
  }

  if (cmd !== 'ls' && (!project || !project.length)) {
    res.sendSTatus (204);
    return;
  }

  var stdout = '';
  var stderr = '';
  var bin = path.join (config.gitmirror.path, config.gitmirror.bin[cmd]);
  var gitmirror = spawn (bin, project ? [project] : null, {
    cwd: config.gitmirror.path
  });

  gitmirror.stdout.on ('data', function (data) {
    stdout += data.toString ();
  });
  gitmirror.stderr.on ('data', function (data) {
    stderr += data.toString ();
  });

  gitmirror.on ('exit', function (code) {
    console.log ('exited with code: %d', code);
    var output = callback (stdout, stderr);
    output.code = code;
    res.write (JSON.stringify (output));
    res.status (200);
    res.end ();
  });
}

function start (configFile) {
  var config = readConfig (configFile)
  var prefix = config.prefix || '';

  app.get (prefix + '/', function (req, res) {
    res.send ('GitLab Mirrors Trigger is ready');
  });

  app.get (prefix + '/update/:project/:token', function (req, res) {
    gitmirror (config, res, 'update',
               req.params.project, req.params.token, function (stdout, stderr) {
      console.error (stderr);
      var results = stdout
        .split ('\n')
        .filter (function (line) {
          return line.length > 0;
        });

      var messages = stderr
        .split ('\n')
        .filter (function (line) {
          return line.length > 0;
        });

      return {
        messages: messages,
        results: results
      };
    });
  });

  app.get (prefix + '/ls/:token', function (req, res) {
    gitmirror (config, res, 'ls', null, req.params.token, function (stdout, stderr) {
      console.error (stderr);
      var results = stdout
        .split ('\n')
        .filter (function (line) {
          return line.length > 0;
        })
        .map (function (line) {
          var entry = line.split (' -> ');
          return {
            name: entry[0],
            repository: entry[1]
          };
        });

      var messages = stderr
        .split ('\n')
        .filter (function (line) {
           return line.length > 0;
        });

      return {
        messages: messages,
        results: results
      };
    });
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
