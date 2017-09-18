// only works in NodeJS

var fs, path
var isNode = false
try {
  var _require = require
  fs = _require( 'fs' )
  path = _require( 'path' )
  isNode = true
} catch ( err ) {
  isNode = false
}

var colorify = require( './colorify.js' )

function debug ( msg ) {
  // console.log( msg )
}

function transformToRelativePaths ( text, transformPath ) {
  if ( isNode ) {
    if ( !transformPath ) {
      transformPath = function ( path ) {
        return path
      }
    }

    var match
    var urls = []
    var rePath = /[\S]*\.[a-zA-Z]+/g

    while ( match = rePath.exec( text ) ) {
      urls.push( {
        match: match[ 0 ],
        absolutePath: path.resolve( match[ 0 ] )
      } )
    }

    urls = urls.filter(function (url) {
      // filter out non-file paths
      try {
        return fs.existsSync( url.absolutePath )
        return true
      } catch (err) {
        return false
      }
    })

    urls.forEach( function ( url ) {
      debug( 'trans match: ' + url.match )
      // replace matches path with a transformed path.relative path
      // var relativePath = './' + path.relative(__dirname, url.absolutePath)
      var relativePath = './' + path.relative( process.cwd(), url.absolutePath )
      debug( 'trans relpath: ' + relativePath )
      text = text
        .split( url.match )
        // .join( colorify( ' ' + relativePath, 'cyan' ).trim() )
        .join( transformPath( ' ' + relativePath ) )
    } )

    // debug(urls)

    return text.split( /\s+/ ).join( ' ' )
  } else {
    throw new Error( ' NOT IN NODE JS ================== ')
    return text
  }
}

module.exports = transformToRelativePaths
