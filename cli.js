#!/usr/bin/env node

var wooster = require( './dist/bundle.min.js' )
var buffer = ''
var timeout
var bufferClearTimeout
var hasHadErrors = false

var argv = require( 'minimist' )( process.argv.slice( 2 ), {
  alias: {
    'debounce': [ 'timeout', 't', 'd' ],
    'bail': [ 'b', 'exit', 'e', 'x' ], // bail and exit after first parse
    'version': [ 'V' ]
  }
} )

if ( argv[ 'version' ] ) {
  var path = require( 'path' )
  var pkg = require( path.join( __dirname, 'package.json' ) )
  console.log( 'wooster version: ' + pkg.version )
  process.exit( 0  )
}

var _timeout = argv[ 'debounce' ]

if ( _timeout == null ) _timeout = 100

var shouldBail = !!argv[ 'bail' ]

function clearConsole () {
  process.stdout.write( '\x1bc' )
}

process.stdin.on( 'data', function ( chunk ) {
  buffer += chunk.toString( 'utf8' )
  if ( _timeout > 0 ) {
    clearTimeout( timeout )
    timeout = setTimeout( function () {
      run()
    }, _timeout )
  } else {
    run()
  }

  clearTimeout( bufferClearTimeout )

  function run () {
    var hasErrors = false
    var output = wooster( buffer )

    if ( output !== buffer ) {
      hasErrors = true
      hasHadErrors = true
    }

    bufferClearTimeout = setTimeout( function () {
      if ( shouldBail ) {
        if ( hasHadErrors ) {
          process.exit( 1 ) // exit failure
        } else {
          process.exit( 0 ) // exit success
        }
      }

      buffer = ''
    }, 100 )

    if ( hasErrors ) {
      clearConsole()
    }

    process.stdout.write( output )
  }
} )
