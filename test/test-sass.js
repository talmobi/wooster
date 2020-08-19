var path = require( 'path' )

var tools = require( './tools.js' )

var test = require( 'tape' )

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
var sassBinPath = which.sync( 'node-sass' )

// var sassBinPath = path.join(
//   __dirname,
//   '../node_modules/.bin/node-sass'
// )

test( 'successful sass build', function ( t ) {
  var sourcePath = path.join(
    __dirname,
    'src',
    'style.scss'
  )

  var targetPath = path.join(
    __dirname,
    'stage',
    'sass[' + tools.UID() + ']-bundle.css'
  )

  t.equal(
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

test( 'error sass build', function ( t ) {
  var sourcePath = path.join(
    __dirname,
    'src',
    'style-error.scss'
  )

  var targetPath = path.join(
    __dirname,
    'stage',
    'sass-error[' + tools.UID() + ']-bundle.css'
  )

  t.equal(
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
        var expectedOutput = [
          '>> wooster output <<',
  '"formatted": "Error: Invalid CSS after \\"...ground: salmon%\\": expected expression',
          '  (e.g. 1px, bold), was \\"}\\"\\n on line 2 of  ./src/style-error.scss\\n>> background: salmon%\\n\\n',
          '  ---------------------^\\n"',
          '',
          '@  ./src/style-error.scss 2:22',
          '  1 | html, body {',
          '> 2 |   background: salmon%',
          '    |                       ^',
          '  3 | }'
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
    sassBinPath,
    [
      sourcePath,
      '>',
      targetPath
    ],
    callback
  )
}
