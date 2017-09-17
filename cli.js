#!/usr/bin/env node

var wooster = require('./snippet.js')
var buffer = ''
var timeout

var argv = require('minimist')( process.argv.slice( 2 ) )
var _timeout = argv.t || argv[ 'timeout' ]

if ( _timeout == null ) _timeout = 100

process.stdin.on('data', function ( chunk ) {
  buffer += chunk.toString( 'utf8' )
  if ( _timeout > 0 ) {
    clearTimeout(timeout)
    timeout = setTimeout(function () {
      run()
    }, _timeout)
  } else {
    run()
  }

  function run () {
    var output = wooster( buffer )
    buffer = ''
    process.stdout.write( output )
  }
})

