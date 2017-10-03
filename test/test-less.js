var path = require( 'path' )

var tools = require( './tools.js' )

var tap = require( 'tap' )

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

var which = require( 'npm-which' )( __dirname )
var lessBinPath = which.sync( 'lessc' )

// var lessBinPath = path.join(
//   __dirname,
//   '../node_modules/.bin/lessc'
// )

tap.test( 'successful less build', function ( t ) {
  var sourcePath = path.join(
    __dirname,
    'src',
    'style.less'
  )

  var targetPath = path.join(
    __dirname,
    'stage',
    'less[' + tools.UID() + ']-bundle.css'
  )

  tap.equal(
    tools.clean( targetPath ),
    'is clean',
    'targetPath is clean before the test'
  )

  build(
    sourcePath,
    targetPath,
    function ( data ) {
      t.equal(
        tools.normalize( data ).indexOf( 'error' ),
        -1,
        'no errors on the terminal as expected'
      )

      wooster( data, function ( text ) {
        t.equal(
          data,
          text,
          'wooster output === input since no errors were detected'
        )

        // run the bundle and get expected output
        tools.exec(
          which.sync( 'csslint' ),
          [ targetPath ],
          function ( buffer ) {
            t.ok(
              buffer.toLowerCase().indexOf('no errors in') > 0,
              'no errors found in the built css bundle as expected'
            )

            t.equal(
              tools.clean( targetPath ),
              'is clean',
              'targetPath is clean after the test'
            )

            t.end()
          }
        )
      } )
    }
  )
} )

tap.test( 'error less build', function ( t ) {
  var sourcePath = path.join(
    __dirname,
    'src',
    'style-error.less'
  )

  var targetPath = path.join(
    __dirname,
    'stage',
    'less-error[' + tools.UID() + ']-bundle.css'
  )

  tap.equal(
    tools.clean( targetPath ),
    'is clean',
    'targetPath is clean before the test'
  )

  build(
    sourcePath,
    targetPath,
    function ( data ) {
      t.notEqual(
        tools.normalize( data ).indexOf( 'error' ),
        -1,
        'errors found on the terminal as expected'
      )

      wooster( data, function ( text ) {
        // var expectedOutput = [
        //   '>> wooster output <<',
        //   'TypeError: ./src/style-error.styl:2:21',
        //   '',
        //   '@ ./src/style-error.styl 2:21',
        //   '1 | html, body',
        //   '> 2 |   background: salmon%',
        //   '|                      ^'
        // ].join('\n')

        var expectedOutput = [
          '>> wooster output <<',
          'SyntaxError: Invalid % without number in ./src/style-error.less on line 2, column 3:',
          '',
          '@ ./src/style-error.less 2:3',
          '1 | html, body {',
          '> 2 |   background: salmon%',
          '|    ^',
          '3 | }'
        ].join('\n')

        t.equal(
          tools.normalize( text ),
          tools.normalize( expectedOutput ),
          'wooster output was as expected'
        )

        t.equal(
          tools.clean( targetPath ),
          'is clean',
          'targetPath is clean after the test'
        )

        t.end()
      } )
    }
  )
} )

function build ( sourcePath, targetPath, callback ) {
  tools.exec(
    lessBinPath,
    [
      sourcePath,
      targetPath
    ],
    callback
  )
}
