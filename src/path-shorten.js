var path = require( 'path' )

// shorten urls in error description
// (path/to/file -> p/t/file)
function shortenUrls ( url, length ) {
  length = length || 3

  if ( length <= 0 ) length = 3 // defaults to 3

  // cut off any redundant tails
  while (
    ( url ) &&
    ( url.length > 1 ) &&
    (
     ( url[ url.length - 1 ] === '.'  &&
       ( url[ url.length - 2 ] === '/' || url[ url.length - 2 ] === '.' )
     ) ||
     ( url[ url.length - 1 ] === '/' )
    )
  ) {
    url = url.slice( 0, -1 )
  }

  if ( !url ) return url

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

  if ( url[ 0 ] === '/' ) {
    return ( '/' + words.join( ' ' ) )
  } else {
    return words.join( ' ' )
  }
}

// similar to vim's :help pathshorten
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
