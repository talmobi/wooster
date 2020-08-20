var pathShorten = require( 'path-shorten' )
module.exports = function shortenUrls( text, len ) {
  if ( !len ) len = 3
  if ( len < 1 ) len = 3
  return pathShorten( text, { length: len } )
}
