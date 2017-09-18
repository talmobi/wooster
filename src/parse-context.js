var prettifyText = require( './prettify-text.js' )

var colorify = require( './colorify.js' )

function parseContext ( opts ) {
  // var url = opts.url
  // var message = opts.message

  var text = opts.text
  var rawLines = text.split( '\n' )
  var lines = rawLines.slice()

  // prettify context lines
  if ( opts.prettify ) {
    var buffer = lines.join( '\n' )
    var path = opts.url || opts.path || opts.filename || opts.filepath
    var p = prettifyText( buffer, path )
    lines = p.split( '\n' )
  }

  var colno = opts.colno
  var lineno = opts.lineno

  var i = Math.max( 0, lineno - 6 ) // first line
  var j = Math.min( lines.length - 1, i + 4 + 2 + 2 ) // last line

  var minLeftPadding = String( j ).trim().length

  var parsedLines = []
  for (; i < j; i++) {
    var head = String( i + 1 ).trim() // line number column
    var body = lines[ i ] // line text content

    // currently parsing target line
    var onTargetLine = ( i === ( lineno - 1 ) )

    // left pad
    while ( head.length < minLeftPadding ) head = (' ' + head )

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
      for (var x = 0; x < colno; x++) {
        offset += ' '
      }
      var _head = String( j ).trim().split( /./ ).join(' ') + '   | '

      if ( opts.prettify ) {
        parsedLines.push( _head + offset + colorify( '^', 'redBright' ) )
      } else {
        parsedLines.push( _head + offset + '^' )
      }
    }
  }

  return parsedLines
}

module.exports = parseContext
