var prettifyText = require( './prettify-text.js' )
var colorify = require( './colorify.js' )

var convert = require( 'convert-source-map' )
var sourceMap = require( 'source-map' )

const _envs = {}
Object.keys( process.env ).forEach(
  function ( key ) {
    const n = process.env[ key ]
    if ( n == '0' || n == 'false' || !n ) {
      return _envs[ key ] = false
    }
    _envs[ key ] = n
  }
)

function debug ( msg ) {
  if ( _envs[ debug_wooster ] ) {
    console.log( msg )
  }
}

function parseContext ( opts ) {
  // var url = opts.url
  // var message = opts.message

  var text = opts.text

  var lineno = opts.lineno || opts.line || opts.lin || opts.linenr
  var colno = opts.colno || opts.column || opts.col || opts.colnr
  var filename = ( opts.uri || opts.url || opts.path || opts.filename || opts.filepath || opts.file || '[unknown source]' )

  var rawSourceMap
  var sourceMapConsumer
  var sourceText
  var sourceOrigin
  var usedSourceMap = false

  var disableSourceMaps = ( opts.disableSourceMaps || opts.disableSourceMap )

  if ( !disableSourceMaps ) {
    try {
      rawSourceMap = convert.fromSource( text )

      if ( rawSourceMap && rawSourceMap.toJSON ) rawSourceMap = rawSourceMap.toJSON()

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
  }

  if ( rawSourceMap ) {
    debug( 'inline source maps found!' )
  } else {
    debug( 'no inline source maps found.' )
  }

  if (
    !disableSourceMaps &&
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

  var firstLineNr = Math.max( 0, lineno - 6 ) // first line
  var lastLineNr = Math.min( lines.length - 1, firstLineNr + 4 + 2 + 2 ) // last line

  // in order to align all the numbers back to back
  // eg:    8 |    vs     8 |
  //        9 |           9 |
  //       10 |           10 |
  var largestNumberPadding = String( lastLineNr ).trim().length

  // remember which lines were snipped
  // so we can add a little colored <SNIP> tag at the end
  // ( if we add it now it will be overwritten by prettifyText coloring )
  var snippedLines = {}

  // TODO unsure if this is necessary? may mess up edge cases where errors occur on long long lines?
  for ( var i = firstLineNr; i < lastLineNr; i++ ) {
    var line = lines[ i ]
    // cap line
    if ( line.length > 150 ) {
      lines[ i ] = line.slice( 0, 150 ) // + colorify( ' ..<SNIP>..', 'white' )
      snippedLines[ i ] = true
    }
  }

  /*
   * trim code block on the left side as much as possible ( keeping relative structure )
   */
  // var contextLines = []
  var leftTrim = 99999 // trim amount, set to 0 if nothing to trim
  var shift
  for ( var i = firstLineNr; i < lastLineNr; i++ ) {
    var line = lines[ i ]
    // contextLines.push( line )
    shift = line.split( /\S+/, 1 )[ 0 ].length
    if ( line.trim() ) {
      if ( shift < leftTrim ) {
        leftTrim = shift
      }
    }
  }
  if ( leftTrim === 99999 ) leftTrim = 0 // nothing to trim

  if ( leftTrim > 0 ) {
    for ( var i = firstLineNr; i < lastLineNr; i++ ) {
      var line = lines[ i ]
      lines[ i ] = line.slice( leftTrim )
    }
  }

  /*
   * prettify context lines
   */
  if ( opts.prettify ) {
    var begin = Math.max( 0, firstLineNr - 3 )
    var end = Math.min( lines.length, lastLineNr + 1 )

    var slice = lines.slice( begin, end )

    var buffer = slice.join( '\n' )
    var prettyText = prettifyText( buffer, filename )
    var prettyLines = prettyText.split( '\n' )

    prettyLines.forEach( function ( prettyLine, index ) {
      lines[ begin + index ] = prettyLine
    } )
  }

  // fill %SNIP% tags to snipped lines
  Object.keys( snippedLines ).forEach( function ( key ) {
    var lineNr = key
    lines[ lineNr ] += colorify( ' %SNIP%', 'white' )
  } )

  if ( Number( lineno ) === lines.length ) {
    // a rare little problem -- off by one error in error logs basically
    lastLineNr++
  }

  var parsedLines = []
  for ( var i = firstLineNr; i < lastLineNr; i++ ) {
    var head = String( i + 1 ).trim() // line number column
    var body = lines[ i ] // line text content

    // currently parsing target line
    var onTargetLine = ( i === ( lineno - 1 ) )

    // left pad
    while ( head.length < largestNumberPadding ) head = ( ' ' + head )

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

    // complete line
    parsedLines.push( line )

    // draw an arrow pointing upward to column location
    if ( onTargetLine ) {
      var offset = '' // ^ pointer offset
      for ( var x = 0; x < ( colno - leftTrim ); x++ ) {
        offset += ' '
      }
      var _head = String( lastLineNr ).trim().split( /./ ).join( ' ' ) + '   | '

      if ( opts.prettify ) {
        parsedLines.push( _head + offset + colorify( '^', 'redBright' ) )
      } else {
        parsedLines.push( _head + offset + '^' )
      }
    }
  }

  return {
    usedSourceMap: usedSourceMap,
    context: parsedLines.join( '\n' ),
    filename: filename,
    lineno: lineno,
    colno: colno
  }
}

module.exports = parseContext
