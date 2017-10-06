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
var stylusBinPath = which.sync( 'stylus' )

// var stylusBinPath = path.join(
//   __dirname,
//   '../node_modules/.bin/stylus'
// )

test( 'successful stylus build', function ( t ) {
  var sourcePath = path.join(
    __dirname,
    'src',
    'style.styl'
  )

  var targetPath = path.join(
    __dirname,
    'stage',
    'stylus[' + tools.UID() + ']-bundle.css'
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

test( 'error stylus build', function ( t ) {
  var sourcePath = path.join(
    __dirname,
    'src',
    'style-error.styl'
  )

  var targetPath = path.join(
    __dirname,
    'stage',
    'stylus-error[' + tools.UID() + ']-bundle.css'
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
          'TypeError: ./src/style-error.styl:2:21',
          '',
          '@ ./src/style-error.styl 2:21',
          '1 | html, body',
          '> 2 |   background: salmon%',
          '|                      ^'
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
    stylusBinPath,
    [
      sourcePath,
      '-o',
      targetPath
    ],
    callback
  )
}
