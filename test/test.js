var wooster = require('../snippet.js')
var path = require('path')
var childProcess = require('child_process')
var fs = require('fs')

var webpack = require('webpack')
var browserify = require('browserify')
var rollup = require('rollup')

var test = require('tape')

function exec (cmd, args, callback) {
  var spawn = childProcess.spawn(cmd, args)

  var handler = createIOHandler(callback)

  spawn.stdout.on('data', handler)
  spawn.stderr.on('data', handler)

  process.on('exit', function () {
    spawn.close()
  })
}

function createIOHandler (callback) {
  var _buffer = ''
  var _timeout = setTimeout(function () {
    callback(_buffer)
  }, 1000)

  return function handleIO (chunk) {
    _buffer += chunk.toString('utf8')
    clearTimeout(_timeout)
    _timeout = setTimeout(function () {
      callback(_buffer)
    }, 1000)
  }
}

function stripAnsi (str) {
  // https://github.com/chalk/ansi-regex
  var ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PRZcf-nqry=><]/g
  return str.replace(ansiRegex, '')
}

function normalize (str) {
  var s = stripAnsi(str)
  s = s.replace(/\s+/g, '')
  s = s.toLowerCase()
  return s
}

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
      exec('node', ['browserify.bundle.js'], function (buffer) {
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
        '@ ./main-syntax-error.js 1:20',
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
      exec('node', ['webpack.bundle.js'], function (buffer) {
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
  t.plan(3)

  exec('npm', 'run e:build:webpack --silent'.split(' '), function (buffer) {
    t.ok(
      normalize(buffer).indexOf('error') !== -1,
      'errors found on the terminal as expected'
    )

    wooster(buffer, function (text) {

      var expectedOutput = [
        '',
        '>> wooster output <<',
        'Module parse failed: ./main-syntax-error.js Unexpected token (1:20)',
        '',
        '@ ./main-syntax-error.js 1:20',
        '> 1 | var text = \'giraffe\':',
        '|                     ^',
        '2 | console.log(text)'
      ].join('\n')

      t.equal(
        normalize(text),
        normalize(expectedOutput),
        'wooster output was as expected'
      )

      // run the bundled javascript
      exec('node', ['webpack.bundle.js'], function (buffer) {
        t.ok(
          normalize(buffer).indexOf('error') !== -1,
          'errors found when running bundle as expected'
        )
      })
    })
  })
})


// test('test successful webpack', function (t) {
//   t.plan(5)
// 
//   webpack({
//     entry: './main.js',
//     output: {
//       filename: 'webpack.bundle.js'
//     }
//   }, function (err, stats) {
//     t.error(err)
//     t.error(stats.hasErrors())
//     t.error(stats.hasWarnings())
// 
//     if (err) {
//       console.error(err.stack || err)
//       if (err.details) {
//         console.error(err.details)
//       }
//       return
//     }
// 
//     var info = stats.toJson()
// 
//     if (stats.hasErrors()) {
//       console.error(info.errors)
//     }
// 
//     if (stats.hasWarnings()) {
//       console.warn(info.warnings)
//     }
// 
//     exec('node', ['webpack.bundle.js'], function (buffer) {
//       t.equal(buffer.trim(), 'giraffe', 'expected output')
// 
//       // on successful build, do nothing and print raw input as output
//       wooster(buffer, function (text) {
//         t.equal(buffer, text)
//       })
//     })
//   })
// })

// test('test error webpack', function (t) {
//   t.plan(3)
// 
//   webpack({
//     entry: './main-syntax-error.js',
//     output: {
//       filename: 'webpack.bundle.js'
//     }
//   }, function (err, stats) {
//     t.error(err, 'no webpack errors')
//     t.equal(!!stats.hasErrors(), true, 'build errors found as expected')
// 
//     if (err) {
//       console.error(err.stack || err)
//       if (err.details) {
//         console.error(err.details)
//       }
//       return
//     }
// 
//     var info = stats.toJson()
// 
//     if (stats.hasErrors()) {
//       // console.error(info.errors)
//     }
// 
//     if (stats.hasWarnings()) {
//       console.warn(info.warnings)
//     }
// 
//     exec('node', ['webpack.bundle.js'], function (buffer) {
//       var expected = [
//         '',
//         '>> wooster output <<',
//         'Error: Module parse failed: ./main-syntax-error.js Unexpected token (1:20)',
//         '',
//         '@ ./main-syntax-error.js 1:20',
//         '> 1 | var text = \'giraffe\':',
//         '|                     ^',
//         '2 | console.log(text)'
//       ].join('\n')
// 
//       // on failed build, print wooster parsed output
//       wooster(buffer, function (text) {
//         t.equal(
//           normalize(text),
//           normalize(expected),
//           'expected output'
//         )
//       })
//     })
//   })
// })

// test('test successful browserify', function (t) {
//   t.plan(3)
// 
//   var b = browserify('main.js')
//   b.bundle(function (err, buffer) {
//     t.error(err, 'no errors during bundling as expected')
// 
//     fs.writeFileSync('browserify.bundle.js', buffer)
// 
//     exec('node', ['browserify.bundle.js'], function (buffer) {
//       t.equal(buffer.trim(), 'giraffe', 'expected output')
// 
//       // on successful build, do nothing and print raw input as output
//       wooster(buffer, function (text) {
//         t.equal(buffer, text)
//       })
//     })
//   })
// })

// test('test error browserify', function (t) {
//   t.plan(3)
// 
//   var b = browserify('main-syntax-error.js')
//   b.bundle(function (err, buffer) {
//     console.log(err)
//     t.error(err, 'no errors during bundling as expected')
// 
//     fs.writeFileSync('browserify.bundle.js', buffer)
// 
//     exec('node', ['browserify.bundle.js'], function (buffer) {
//       t.equal(buffer.trim(), 'giraffe', 'expected output')
// 
//       // on successful build, do nothing and print raw input as output
//       wooster(buffer, function (text) {
//         t.equal(buffer, text)
//       })
//     })
//   })
// })
