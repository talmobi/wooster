var tap = require( 'tap' )

var colorify = require( '../src/colorify.js' )
var clc = require( 'cli-color' )

tap.equal(
  colorify( 'text' ),
  'text',
  'colorify without color OK'
)

tap.equal(
  String( colorify( 'text', 'black' ) ),
  clc[ 'black' ]( 'text' ),
  'colorify with color OK'
)
