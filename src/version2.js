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
var pathShorten = require( './path-shorten.js' )
var prettifyText = require( './prettify-text.js' )
var parseContext = require( './parse-context.js' )

var defaultOpts = {
  prettify: true,
  relative: true,
  shorten: true
}

/*
 *  Attempt to parse the error log with wooster.
 *
 *  wooster tries to find the source file of the error,
 *  get its context and prettify the information into
 *  a consice, easy to understand text output.
 *
 *  If it fails the output text is left unchanged from the
 *  original input text.
 */
function _api ( text, opts, callback ) {
  var result = text

  var wp = parse( text, opts )
  if ( wp ) {
    result = wp.text
  }

  if ( typeof opts === 'function' ) {
    callback = opts
  }

  if ( typeof callback === 'function' ) {
    callback( result )
  }

  return result
}

/*
 *  Same parsing as _api but return a richer object
 *  with context, filename, line and column information.
 *
 *  returns false is the parsing fails
 */
function parse ( text, opts ) {
  if ( typeof opts === 'function' ) {
    opts = undefined
  }

  opts = Object.assign(
    defaultOpts,
    opts || {}
  )

  var raw = text
  var returnValue = raw
  var ctx

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

    ctx = parseContext( {
      filename: filepath,
      prettify: opts.prettify,
      text: fs.readFileSync( filepath, { encoding: 'utf8' } ),
      lineno: error.lineno,
      colno: error.colno
    } )

    var context = ctx.context

    var description = error.message || '[ Unknown Error ]'

    description = _parseDescription( description, opts )

    var introMessage = colorify( '>> wooster output <<', 'blackBright' )

    if ( opts.intro ) {
      introMessage = opts.intro
    }

    if ( ctx.usedSourceMap ) {
      introMessage += ( '  ' + colorify( '( SourceMap )', 'bgCyan' ) )
    }

    if ( opts.preintro ) {
      introMessage = ( opts.preintro + introMessage )
    }

    if ( opts.postintro ) {
      introMessage = ( introMessage + opts.postintro )
    }

    var output = [
      introMessage,
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

  if ( returnValue === raw ) {
    return false
  }

  var robj = ( ctx || {} )

  robj.text = returnValue

  robj.toString = function () {
    return returnValue
  }

  return robj
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
        word = pathShorten( word )
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

function createMessage ( opts ) {
  var ctx = opts.ctx
  var message = opts.message
  var filepath = opts.filename || ctx.filename

  if ( opts.prettify !== false ) {
    opts.prettify = true
  }

  var context = ctx.context

  var description = message || '[ Unknown Error ]'

  description = _parseDescription( description, opts )

  var introMessage = colorify( '>> wooster output <<', 'blackBright' )

  if ( opts.intro ) {
    introMessage = opts.intro
  }

  if ( ctx.usedSourceMap ) {
    introMessage += ( '  ' + colorify( '( SourceMap )', 'bgCyan' ) )
  }

  if ( opts.preintro ) {
    introMessage = ( opts.preintro + introMessage )
  }

  if ( opts.postintro ) {
    introMessage = ( introMessage + opts.postintro )
  }

  var output = [
    introMessage,
    description,
    '',
    ' @ ' +
    transformToRelativePaths( filepath, function ( path ) {
      return colorify( path, 'magentaBright' )
    } ) +
    ' ' + colorify( ctx.lineno, 'redBright' ) +
    ':' + colorify( ctx.colno, 'redBright' )
  ].join( '\n' )

  output += '\n' + context + '\n'

  if ( !opts.prettify ) {
    output = stripAnsi( output )
  }

  debug( output )

  return output
}

_api.parse = parse

_api.prettifyText = prettifyText
_api.parseContext = parseContext
_api.pathShorten = pathShorten
_api.colorify = colorify

_api.createMessage = createMessage

module.exports = _api
