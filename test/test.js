var wooster

if ( typeof process.env.TEST_SOURCE === 'string' ) {
  var source = process.env.TEST_SOURCE
  wooster = require( source )
  console.log( 'testing source: ' + source )
} else {
  // wooster = require('../snippet.js')
  wooster = require( '../src/version2.js' )
  // wooster = require( '../dist/bundle.min.js' )
}

var path = require('path')
var childProcess = require('child_process')
var fs = require('fs')

var webpack = require('webpack')
var browserify = require('browserify')
var rollup = require('rollup')

var test = require('tape')

var _spawns = []

// TODO update tests for new API
// function wooster (buffer, callback) {
//   callback(_wooster(buffer))
// }

// cleaning up
process.on('exit', function () {
  _spawns.forEach(function (spawn) {
    try {
      spawn.kill()
    } catch (err) {}
  })
})

function exec (cmd, args, callback) {
  var spawn = childProcess.spawn(cmd, args)
  _spawns.push(spawn)

  var handler = createIOHandler(function (data) {
    // console.log('killing spawn and calling callback')
    spawn.kill()
    callback(data)
  })

  spawn.stdout.on('data', handler)
  spawn.stderr.on('data', handler)
}

function createIOHandler (callback) {
  var _done = false
  var _buffer = ''
  var _timeout = setTimeout(function () {
    _done = true
    callback(_buffer)
  }, 3000)

  return function handleIO (chunk) {
    // console.log('callbacking')
    if (_done) return undefined
    _buffer += chunk.toString('utf8')
    clearTimeout(_timeout)
    _timeout = setTimeout(function () {
      callback(_buffer)
    }, 1000)
  }
}

function stripAnsi ( str ) {
  // https://github.com/chalk/ansi-regex
  var ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PRZcf-nqry=><]/g
  return str.replace( ansiRegex, '' )
}

function normalize ( str ) {
  var s = stripAnsi( str )
  s = s.replace( /\s+/g, '' )
  s = s.toLowerCase()
  return s
}

test('test successful stylus cli', function (t) {
  t.plan(3)

  exec('npm', 'run build:stylus --silent'.split(' '), function (buffer) {
    t.ok(
      normalize( buffer ).indexOf( 'error' ) === -1,
      'no errors on the terminal as expected'
    )

    wooster(buffer, function (text) {
      t.equal(
        text,
        buffer,
        'wooster output === input since no errors were detected'
      )

      // run the bundled javascript
      exec('../node_modules/.bin/csslint', ['bundles/stylus.bundle.css'], function (buffer) {
        t.ok(
          buffer.toLowerCase().indexOf('no errors in') > 0,
          'no errors found in the built css bundle as expected')
      })
    })
  })
})

test('test error stylus cli', function (t) {
  t.plan(2)

  exec('npm', 'run e:build:stylus --silent'.split(' '), function (buffer) {
    t.ok(
      normalize( buffer ).indexOf( 'error' ) !== -1,
      'errors found on the terminal as expected'
    )

    wooster(buffer, function (text) {

      var expectedOutput = [
        '>> wooster output <<',
        'TypeError: ./style-error.styl:2:21',
        '',
        '@ ./style-error.styl 2:21',
        '1 | html, body',
        '> 2 |   background: salmon%',
        '|                      ^'
      ].join('\n')

      t.equal(
        normalize(text),
        normalize(expectedOutput),
        'wooster output was as expected'
      )
    })
  })
})

test('test successful less cli', function (t) {
  t.plan(3)

  exec('npm', 'run build:rollup --silent'.split(' '), function (buffer) {
    t.ok(
      normalize(buffer).indexOf('error') === -1,
      'no errors on the terminal as expected'
    )

    wooster(buffer, function (text) {
      t.equal(
        buffer,
        text,
        'wooster output === input since no errors were detected'
      )

      // run the bundled javascript
      exec('../node_modules/.bin/csslint', ['bundles/less.bundle.css'], function (buffer) {
        t.ok(
          buffer.toLowerCase().indexOf('no errors in') > 0,
          'no errors found in the built css bundle as expected')
      })
    })
  })
})


test('test error less cli', function (t) {
  t.plan(2)

  exec('npm', 'run e:build:less --silent'.split(' '), function (buffer) {
    t.ok(
      normalize(buffer).indexOf('error') !== -1,
      'errors found on the terminal as expected'
    )

    wooster(buffer, function (text) {

      var expectedOutput = [
        '>> wooster output <<',
        'SyntaxError: Invalid % without number in ./style-error.less on line 2, column 3:',
        '',
        '@ ./style-error.less 2:3',
        '1 | html, body {',
        '> 2 |   background: salmon%',
        '|    ^',
        '3 | }'
      ].join('\n')

      t.equal(
        normalize(text),
        normalize(expectedOutput),
        'wooster output was as expected'
      )
    })
  })
})

test('test successful rollup cli', function (t) {
  t.plan(4)

  exec('npm', 'run build:rollup --silent'.split(' '), function (buffer) {
    t.ok(
      normalize(buffer).indexOf('error') === -1,
      'no errors on the terminal as expected'
    )

    wooster(buffer, function (text) {
      t.equal(
        buffer,
        text,
        'wooster output === input since no errors were detected'
      )

      // run the bundled javascript
      exec('node', ['bundles/rollup.bundle.js'], function (buffer) {
        t.equal(buffer.trim(), 'giraffe', 'expected output')

        // on successful build, do nothing and print raw input as output
        wooster(buffer, function (text) {
          t.equal(buffer, text)
        })
      })
    })
  })
})

test('test error rollup cli', function (t) {
  t.plan(2)

  exec('npm', 'run e:build:rollup --silent'.split(' '), function (buffer) {
    t.ok(
      normalize(buffer).indexOf('error') !== -1,
      'errors found on the terminal as expected'
    )

    wooster(buffer, function (text) {

      var expectedOutput = [
        '>> wooster output <<',
        'Error: Unexpected token',
        '',
        '@ ./main-error.js 1:20',
        '> 1 | var text = \'giraffe\':',
        '|                     ^',
        '2 | console.log(text)'
      ].join('\n')

      t.equal(
        normalize(text),
        normalize(expectedOutput),
        'wooster output was as expected'
      )
    })
  })
})

test('test successful browserify cli', function (t) {
  t.plan(4)

  exec('npm', 'run build:browserify --silent'.split(' '), function (buffer) {
    t.ok(
      normalize(buffer).indexOf('error') === -1,
      'no errors on the terminal as expected'
    )

    wooster(buffer, function (text) {
      t.equal(
        buffer,
        text,
        'wooster output === input since no errors were detected'
      )

      // run the bundled javascript
      exec('node', ['bundles/browserify.bundle.js'], function (buffer) {
        t.equal(buffer.trim(), 'giraffe', 'expected output')

        // on successful build, do nothing and print raw input as output
        wooster(buffer, function (text) {
          t.equal(buffer, text)
        })
      })
    })
  })
})

test('test error browserify cli', function (t) {
  t.plan(2)

  exec('npm', 'run e:build:browserify --silent'.split(' '), function (buffer) {
    t.ok(
      normalize(buffer).indexOf('error') !== -1,
      'errors found on the terminal as expected'
    )

    wooster(buffer, function (text) {

      var expectedOutput = [
        '>> wooster output <<',
        'ParseError: Unexpected token',
        '',
        '@ ./main-error.js 1:20',
        '> 1 | var text = \'giraffe\':',
        '|                     ^',
        '2 | console.log(text)'
      ].join('\n')

      t.equal(
        normalize(text),
        normalize(expectedOutput),
        'wooster output was as expected'
      )
    })
  })
})

test('test successful browserify cli with babelify transform', function (t) {
  t.plan(4)

  exec('npm', 'run build:browserify-babelify --silent'.split(' '), function (buffer) {
    t.ok(
      normalize(buffer).indexOf('error') === -1,
      'no errors on the terminal as expected'
    )

    wooster(buffer, function (text) {
      t.equal(
        buffer,
        text,
        'wooster output === input since no errors were detected'
      )

      // run the bundled javascript
      exec('node', ['bundles/browserify-babelify.bundle.js'], function (buffer) {
        t.equal(buffer.trim(), 'giraffe', 'expected output')

        // on successful build, do nothing and print raw input as output
        wooster(buffer, function (text) {
          t.equal(buffer, text)
        })
      })
    })
  })
})

test('test error browserify cli with babelify transform', function (t) {
  t.plan(2)

  exec('npm', 'run e:build:browserify-babelify --silent'.split(' '), function (buffer) {
    t.ok(
      normalize(buffer).indexOf('error') !== -1,
      'errors found on the terminal as expected'
    )

    wooster(buffer, function (text) {

      var expectedOutput = [
        '>> wooster output <<',
        'SyntaxError: ./main-error.js: Unexpected token, expected ; (1:20)',
        '',
        '@ ./main-error.js 1:20',
        '> 1 | var text = \'giraffe\':',
        '|                     ^',
        '2 | console.log(text)'
      ].join('\n')

      t.equal(
        normalize(text),
        normalize(expectedOutput),
        'wooster output was as expected'
      )
    })
  })
})

test('test successful webpack cli', function (t) {
  t.plan(4)

  exec('npm', 'run build:webpack --silent'.split(' '), function (buffer) {
    t.ok(
      normalize(buffer).indexOf('error') === -1,
      'no errors on the terminal as expected'
    )

    wooster(buffer, function (text) {
      t.equal(
        buffer,
        text,
        'wooster output === input since no errors were detected'
      )

      // run the bundled javascript
      exec('node', ['bundles/webpack.bundle.js'], function (buffer) {
        t.equal(buffer.trim(), 'giraffe', 'expected output')

        // on successful build, do nothing and print raw input as output
        wooster(buffer, function (text) {
          t.equal(buffer, text)
        })
      })
    })
  })
})

test('test error webpack cli', function (t) {
  t.plan(2)

  exec('npm', 'run e:build:webpack --silent'.split(' '), function (buffer) {
    t.ok(
      normalize(buffer).indexOf('error') !== -1,
      'errors found on the terminal as expected'
    )

    wooster(buffer, function (text) {

      var expectedOutput = [
        '',
        '>> wooster output <<',
        'Module parse failed: ./main-error.js Unexpected token (1:20)',
        '',
        '@ ./main-error.js 1:20',
        '> 1 | var text = \'giraffe\':',
        '|                     ^',
        '2 | console.log(text)'
      ].join('\n')

      t.equal(
        normalize(text),
        normalize(expectedOutput),
        'wooster output was as expected'
      )
    })
  })
})

