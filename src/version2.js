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

// console.log( ' == isNode: ' + isNode + ' == ' )

function debug ( msg ) {
  // console.log( msg )
}

// https://github.com/chalk/ansi-regex
var ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PRZcf-nqry=><]/g

function stripAnsi ( str ) {
  return str.replace( ansiRegex, '' )
}

var colorify = require( './colorify.js' )

var findError = require( './find-error.js' )
var transformToRelativePaths = require( './transform-to-relative-paths.js' )
var shortenUrls = require( './shorten-urls.js' )
var prettifyText = require( './prettify-text.js' )
var parseContext = require( './parse-context.js' )

function _api ( text, callback ) {
  if ( !isNode ) {
    throw new Error( 'This function cannot be run in the Browser.' )
  }

  var opts = {
    prettify: true,
    relative: true,
    shorten: true
  }

  var raw = text
  var returnValue = raw

  text = stripAnsi( text )

  debug( ' === text === ' )
  debug( text )
  debug( ' === ==== === ' )

  var error = findError( text )

  if ( error ) {
    debug( 'match: ' + error.url.match )
    debug( 'resolved match: ' + path.resolve( error.url.match ) )
    debug( 'path: ' + error.path )
    debug( 'pos: ' + error.lineno + ':' + error.colno )
    var filepath = error.path || path.resolve( error.url.match )

    var ctx = parseContext( {
      filename: filepath,
      prettify: opts.prettify,
      text: fs.readFileSync( filepath, { encoding: 'utf8' } ),
      lineno: error.lineno,
      colno: error.colno
    } )

    var context = ctx.text

    var description = error.message || '[ Unknown Error ]'

    // highlight "error" words
    if ( opts.prettify ) {
      var lineLength = 0
      var output = ' '
      var words = description.split( /\s+/ )

      words.forEach( function ( word ) {
        var raw = word
        var rawLow = raw.toLowerCase()
        if ( rawLow.indexOf( 'error' ) !== -1 ) {
          word = colorify( raw, 'red' )
        }

        if (
          rawLow.indexOf( '/' ) !== -1 ||
          rawLow.indexOf( '.' ) !== -1
        ) {
          if ( opts.relative ) {
            word = transformToRelativePaths( raw, function ( path ) {
              if ( opts.prettify ) {
                return colorify( path, 'magentaBright' )
              } else {
                return path
              }
            } )
          }

          if ( opts.shorten ) {
            word = shortenUrls( word )
          }
        }

        output += word.trim()

        lineLength += raw.length
        if ( lineLength > 70 ) {
          lineLength = 0
          output += '\n '
        }

        output += ' '
      } )

      description = ' ' + output.trim()
    }

    if ( opts.prettify ) {
      var output = [
        colorify( '>> wooster output <<', 'blackBright' ),
        description,
        '',
        ' @ ' +
        transformToRelativePaths( filepath, function ( path ) {
          return colorify( path, 'magentaBright' )
        } ) +
        ' ' + colorify( error.lineno, 'redBright' ) +
        ':' + colorify( error.colno, 'redBright' )
      ].join( '\n' )
    } else {
    }

    output += '\n' + context + '\n'

    debug( output )
    returnValue = output
  } else {
    returnValue = raw
  }

  if ( typeof callback === 'function' ) {
    callback( returnValue )
  }

  return returnValue
}

_api.prettifyText = prettifyText
_api.parseContext = parseContext
_api.shortenUrls = shortenUrls
_api.colorify = colorify

module.exports = _api
