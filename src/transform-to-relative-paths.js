var fs = require( 'fs' )
var path = require( 'path' )

// var colorify = require( './colorify.js' )

function debug ( msg ) {
  // console.log( msg )
}

function transformToRelativePaths ( text, transformPath ) {
  if ( !transformPath ) {
    transformPath = function ( path ) {
      return path
    }
  }

  var match
  var urls = []
  var regexPath = /[\S]*\.[a-zA-Z]+/g

  while ( match = regexPath.exec( text ) ) {
    urls.push( {
      match: match[ 0 ],
      absolutePath: path.resolve( match[ 0 ] )
    } )
  }

  urls = urls.filter( function ( url ) {
    // filter out non-file paths
    try {
      return fs.existsSync( url.absolutePath )
    } catch ( err ) {
      return false
    }
  } )

  urls.forEach( function ( url ) {
    debug( 'trans match: ' + url.match )
    // replace matches path with a transformed path.relative path
    // var relativePath = './' + path.relative(__dirname, url.absolutePath)
    var relativePath = './' + path.relative( process.cwd(), url.absolutePath )
    debug( 'trans relpath: ' + relativePath )
    text = text
    .split( url.match )
    .join( transformPath( ' ' + relativePath ) )
  } )

  debug( urls )

  return text.split( /\s+/ ).join( ' ' )
}

module.exports = transformToRelativePaths
