#!/usr/bin/env node

var wooster = require('./dist/bundle.min.js')
var buffer = ''
var timeout
var exitTimeout
var hasErrors = false

var argv = require('minimist')( process.argv.slice( 2 ), {
  alias: {
    'debounce': [ 'timeout', 't', 'd' ]
  }
} )
var _timeout = argv.t || argv[ 'debounce' ]

if ( _timeout == null ) _timeout = 100

function clearConsole () {
  process.stdout.write( '\x1bc' )
}

process.stdin.on('data', function ( chunk ) {
  buffer += chunk.toString( 'utf8' )
  if ( _timeout > 0 ) {
    clearTimeout( timeout )
    timeout = setTimeout( function () {
      run()
    }, _timeout )
  } else {
    run()
  }

  clearTimeout( exitTimeout )

  function run () {
    var output = wooster( buffer )

    if ( output !== buffer ) {
      hasErrors = true
    }


    exitTimeout = setTimeout( function () {
      if ( hasErrors ) {
        process.exit( 1 )
      } else {
        process.exit( 0 )
      }
    }, 100 )

    if ( hasErrors ) {
      clearConsole()
    }

    process.stdout.write( output )
  }
})

