var fs = require( 'fs' )
var path = require( 'path' )

function debug ( msg ) {
  // console.log( msg )
}

// https://github.com/chalk/ansi-regex
var ANSI_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PRZcf-nqry=><]/g

function stripAnsi ( str ) {
  return str.replace( ANSI_REGEX, '' )
}

var colorify = require( './colorify.js' )

var findError = require( './find-error.js' )
var transformToRelativePaths = require( './transform-to-relative-paths.js' )
var shortenUrls = require( './shorten-urls.js' )
var prettifyText = require( './prettify-text.js' )
var parseContext = require( './parse-context.js' )

var defaultOpts = {
  prettify: true,
  relative: true,
  shorten: true
}

function _api ( text, opts, callback ) {
  if ( typeof opts === 'function' ) {
    callback = opts
    opts = undefined
  }

  opts = Object.assign(
    defaultOpts,
    opts || {}
  )

  var raw = text
  var returnValue = raw

  text = ( '\n' + stripAnsi( text ) + '\n' )

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

    description = _parseDescription( description, opts )

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

    output += '\n' + context + '\n'

    if ( !opts.prettify ) {
      output = stripAnsi( output )
    }

    debug( output )
    returnValue = output
  } else {
    // console.log( ' == RAW == ' )
    returnValue = raw
  }

  if ( typeof callback === 'function' ) {
    callback( returnValue )
  }

  return returnValue
}

function _parseDescription ( description, opts ) {
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
          return colorify( path, 'magentaBright' )
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

  return description
}

_api.prettifyText = prettifyText
_api.parseContext = parseContext
_api.shortenUrls = shortenUrls
_api.colorify = colorify

module.exports = _api
