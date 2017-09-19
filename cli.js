#!/usr/bin/env node

var wooster = require('./dist/bundle.min.js')
var buffer = ''
var timeout
var bufferClearTimeout

var argv = require('minimist')( process.argv.slice( 2 ) )
var _timeout = argv.t || argv[ 'timeout' ]

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

  clearTimeout( bufferClearTimeout )

  function run () {
    clearConsole()
    var output = wooster( buffer )

    bufferClearTimeout = setTimeout( function () {
      buffer = ''
    }, 1500 )

    process.stdout.write( output )
  }
})

