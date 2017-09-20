// attempt to strip code context lines from text
function removeContextFromText ( text ) {
  var lines = text.split( '\n' ).map( function ( line ) {
    return {
      text: line
    }
  } )

  lines.forEach( function ( line ) {
    var text = line.text
    var head = text.substring( 0, 10 )
    var match

    var reLineNumber = /\s{0,5}\d+\s{1,2}[|:]?\s{0,5}/
    var match = reLineNumber.exec( head ) // match against head of string
    if ( match && match[ 0 ] ) {
      line.possibleSnippet = true
      // debug('possibleSnippet found: ' + text)
    }
  } )

  for ( var i = 0; i < lines.length; i++ ) {
    var prevLine = lines[ i - 1 ] || undefined
    var currentLine = lines[ i ]
    var nextLine = lines[ i + 1 ] || undefined

    if ( currentLine.possibleSnippet ) {
      if ( prevLine && prevLine.possibleSnippet ) {
        lines[ i ].detectedSnippet = true
      }
      if ( nextLine && nextLine.possibleSnippet ) {
        lines[ i ].detectedSnippet = true
      }
    }
  }

  // lines.forEach(function (line) {
  //   if (line.detectedSnippet) debug('detectedSnippet: ' + line.text)
  // })

  return lines.filter( function ( line ) {
    return !line.detectedSnippet
  } ).map( function ( line ) {
    return line.text
  } ).join( '\n' )
}

module.exports = removeContextFromText
