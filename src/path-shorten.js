var path = require( 'path' )

var HOME_DIR = false

var _r = require
try {
  HOME_DIR = _r( 'os' ).homedir()
} catch ( err ) { /* ignore */ }

// similar ( but not the same ) to vim's :help pathshorten
// Shorten directory names in the path {expr} and return the
// result.  The tail, the file name, is kept as-is.  The other
// components in the path are reduced to single letters.  Leading
// '~' and '.' characters are kept.  Example:
//         :echo pathshorten('~/.vim/autoload/myfile.vim')
//         ~/.v/a/myfile.vim
// It doesn't matter if the path exists or not.
function pathShorten ( text, length ) {
  if ( typeof text !== 'string' ) throw new Error( 'text must be of type string' )

  length = length || 3

  if ( !length || length <= 0 ) length = 3 // defaults to 3

  var words = text.split( /\s+/ )
  words = words.map( function ( word ) {
    if ( word.indexOf( '.' ) >= 0 || word.indexOf( '/' ) >= 0 ) {
      if ( HOME_DIR ) {
        word = word.replace( HOME_DIR, '~' )
      }

      // console.log( word )
      var split = word.split( '/' )

      // normalize after first /
      if ( split.length > 1 ) {
        var a = split.shift()
        var b = split.join( '/' )

        word = ( a + '/' + path.normalize( b ) )
        // console.log( a )
        // console.log( b )
        // console.log( word )
      }

      // cut off any trailing '/'
      while ( word.length > 1 && word[ word.length - 1 ] === '/' ) word = word.slice( 0, -1 )

      var fileNames = word.split( '/' )
      var tail = fileNames.pop() // keep tail ( filename ) as is

      var result = ''

      fileNames.forEach( function ( fileName ) {
        if ( fileName ) {
          var i
          var len = length

          // make room for leading ~ and leading .
          if ( fileName[ 0 ] === '~' || fileName[ 0 ] === '.' ) len += 1

          // remember to cap the length
          if ( len > fileName.length ) len = fileName.length

          // construct the shortened path name
          for ( i = 0; i < len; i++ ) {
            result += fileName[ i ]
          }

          // add the path separator
          result += '/'
        }
      } )

      // keep leading '/'
      if (
        word[ 0 ] === '/' &&
        result[ 0 ] !== word[ 0 ]
      ) {
        result = '/' + result
      }

      result += tail
      return result
    } else {
      return word
    }
  } )

  return words.join( ' ' )
}

module.exports = pathShorten
