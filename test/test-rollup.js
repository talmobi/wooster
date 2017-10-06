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
var rollupBinPath = which.sync( 'rollup' )

// var rollupBinPath = path.join(
//   __dirname,
//   '../node_modules/.bin/rollup'
// )

test( 'successful rollup build', function ( t ) {
  var sourcePath = path.join(
    __dirname,
    'src',
    'main.js'
  )

  var targetPath = path.join(
    __dirname,
    'stage',
    'rollup[' + tools.UID() + ']-build.js'
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
          'node',
          [ targetPath ],
          function ( buffer ) {
            t.equal( buffer.trim(), 'giraffe', 'expected output' )

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

test( 'error rollup build', function ( t ) {
  var sourcePath = path.join(
    __dirname,
    'src',
    'main-error.js'
  )

  var targetPath = path.join(
    __dirname,
    'stage',
    'rollup-error[' + tools.UID() + ']-build.js'
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
          'Error: Unexpected token',
          '',
          '@ ./src/main-error.js 1:20',
          '> 1 | var text = \'giraffe\':',
          '|                     ^',
          '2 | console.log(text)'
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
    rollupBinPath,
    [
      sourcePath,
      '--format', 'cjs', '-o',
      targetPath
    ],
    callback
  )
}
