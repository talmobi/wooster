// shorten urls in error description
// (path/to/file -> p/t/file)
function shortenUrls ( url, length ) {
  length = length || 3

  var words = url.split( /\s+/ )
  words = words.map( function ( word ) {
    if ( word.indexOf( '.' ) >= 0 || word.indexOf( '/' ) >= 0 ) {
      // word = transformToRelativePaths( word )
      var split = word.split( '/' )
      var lastFileName = split.pop()
      var result = ''
      split.forEach( function ( fileName ) {
        if ( fileName ) {
          var i
          var len = length

          if ( length > fileName.length ) len = fileName.length
          for ( i = 0; i < len; i++ ) {
            result += fileName[ i ]
          }
          result += '/'
        }
      } )
      result += lastFileName
      return result
      // return clc.magenta(result)
    } else {
      return word
    }
  } )

  return words.join( ' ' )
  // log(
  //   ' ' + clc.redBright( words.join(' ') )
  // )
}

module.exports = shortenUrls
