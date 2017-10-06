var test = require( 'tape' )

var colorify = require( '../src/colorify.js' )
var clc = require( 'cli-color' )

test( 'test colorify', function ( t ) {
  t.plan( 2 )

  t.equal(
    colorify( 'text' ),
    'text',
    'colorify without color OK'
  )

  t.equal(
    String( colorify( 'text', 'black' ) ),
    clc[ 'black' ]( 'text' ),
    'colorify with color OK'
  )
} )
