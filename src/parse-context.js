var prettifyText = require( './prettify-text.js' )
var colorify = require( './colorify.js' )

var convert = require( 'convert-source-map' )
var sourceMap = require( 'source-map' )

function debug ( msg ) {
  // console.log( msg )
}

function parseContext ( opts ) {
  // var url = opts.url
  // var message = opts.message

  var text = opts.text

  var lineno = opts.lineno || opts.line || opts.lin
  var colno = opts.colno || opts.column || opts.col
  var filename = ( opts.url || opts.path || opts.filename || opts.filepath || opts.file || opts.uri || '[unknown source]' )

  var rawSourceMap
  var sourceMapConsumer
  var sourceText
  var sourceOrigin
  var usedSourceMap = false

  try {
    rawSourceMap = convert.fromSource( text )

    if ( rawSourceMap ) rawSourceMap = rawSourceMap.toJSON()

    if ( rawSourceMap ) {
      sourceMapConsumer = new sourceMap.SourceMapConsumer( rawSourceMap )
      sourceOrigin = sourceMapConsumer.originalPositionFor( {
        line: lineno,
        column: colno
      } )
      sourceText = sourceMapConsumer.sourceContentFor(
        sourceOrigin.source
      )
    }
  } catch ( err ) {
    // ignore, didn't find source map support
    debug( 'warning: searching for a source map threw an error' )
    debug( err )
  }

  if ( rawSourceMap ) {
    debug( 'inline source maps found!' )
  } else {
    debug( 'no inline source maps found.' )
  }

  if (
    opts.enableSourceMaps === true &&
    sourceText &&
    sourceOrigin
    // sourceOrigin.line >= 0 &&
    // sourceOrigin.column >= 0
  ) {
    // use source maps instead
    text = sourceText
    lineno = sourceOrigin.line
    colno = sourceOrigin.column
    filename = sourceOrigin.source
    usedSourceMap = true
  }

  var lines = text.split( '\n' )

  var i = Math.max( 0, lineno - 6 ) // first line
  var j = Math.min( lines.length - 1, i + 4 + 2 + 2 ) // last line

  // prettify context lines
  if ( opts.prettify ) {
    var begin = Math.max( 0, i - 3 )
    var end = Math.min( lines.length, j + 1 )

    var slice = lines.slice( begin, end )

    var buffer = slice.join( '\n' )
    var prettyText = prettifyText( buffer, filename )
    var prettyLines = prettyText.split( '\n' )

    prettyLines.forEach( function ( prettyLine, index ) {
      lines[ begin + index ] = prettyLine
    } )
  }

  var minLeftPadding = String( j ).trim().length

  var parsedLines = []
  for ( ; i < j; i++ ) {
    var head = String( i + 1 ).trim() // line number column
    var body = lines[ i ] // line text content

    // currently parsing target line
    var onTargetLine = ( i === ( lineno - 1 ) )

    // left pad
    while ( head.length < minLeftPadding ) head = ( ' ' + head )

    // target line
    if ( onTargetLine ) {
      if ( opts.prettify ) {
        head = colorify( head, 'whiteBright' )
      }

      // prepend > arrow

      if ( opts.prettify ) {
        head = colorify( '> ', 'redBright' ) + head
      } else {
        head = '> ' + head
      }
    } else { // context line
      if ( opts.prettify ) {
        head = colorify( head, 'blackBright' )
      }
      // prepend two spaces ( to stay aligned with the targeted line '> ' )
      head = '  ' + head
    }

    // separate line number and line content
    var line = ( head + ' | ' + body )
    parsedLines.push( line )

    // draw an arrow pointing upward to column location
    if ( onTargetLine ) {
      var offset = '' // ^ pointer offset
      for ( var x = 0; x < colno; x++ ) {
        offset += ' '
      }
      var _head = String( j ).trim().split( /./ ).join( ' ' ) + '   | '

      if ( opts.prettify ) {
        parsedLines.push( _head + offset + colorify( '^', 'redBright' ) )
      } else {
        parsedLines.push( _head + offset + '^' )
      }
    }
  }

  return {
    usedSourceMap: usedSourceMap,
    text: parsedLines.join( '\n' ),
    filename: filename,
    lineno: lineno,
    colno: colno
  }
}

module.exports = parseContext
