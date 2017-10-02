var clc = require( 'cli-color' )

function colorify ( text, color ) {
  if ( clc && clc[ color ] ) {
    return clc[ color ]( text )
  } else {
    return text
  }
}

module.exports = colorify
