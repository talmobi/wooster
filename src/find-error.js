// only works in NodeJS
// find error sources in text by url and context weight

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

function debug ( msg ) {
  // console.log( msg )
}

var removeContextFromText = require( './remove-context-from-text.js' )

function parsePosition ( pos ) {
  // log('  line positioning string detected: ' + pos)
  var split = pos.split( /\D+/ )
    .filter( function ( s ) { return s } )
  debug('  parsed positioning string: ' + split.toString())
  return {
    lineno: /\d+/.exec(split[0])[0],
    colno: /\d+/.exec(split[1])[0]
  }
}

function findError ( text ) {
  var _rawText = text
  text = removeContextFromText( text )

  var _lines = text.split('\n')

  debug(' === cwd directories === ')
  var cwdDirs = []
  if ( process && process.version && fs ) {
    cwdDirs = fs.readdirSync( process.cwd() )
      .filter( function ( path ) {
        return fs.lstatSync( path ).isDirectory()
      } )
  }
  debug(cwdDirs)
  debug(' === ')

  debug(' === urls === ')
  var match
  var urls = []
  var seekBuffer = text
  var rePath = /[\S]*\.[a-zA-Z]+/g
  var rePosition = /[(]?\s{0,5}\d+\s{0,5}?\D{1,20}\s{0,5}?\d+\s{0,5}[)]?/g

  while ( match = rePath.exec( text ) ) {
    var weight = 0
    var indexOf = ( text.length - seekBuffer.length ) + seekBuffer.indexOf( match[ 0 ] )
    var lineNumber = ( text.substring( 0, indexOf ).split( '\n' ).length - 1 )
    var line = _lines[ lineNumber ]
    seekBuffer = text.substring( indexOf + match[ 0 ].length )

    if ( line.toLowerCase().indexOf('node_modules' ) !== -1) weight -= 1.5
    if ( line.toLowerCase().indexOf( 'npm') !== -1 ) weight -= 0.1
    if ( line.toLowerCase().indexOf( 'Npm') !== -1 ) weight -= 0.25
    if ( line.toLowerCase().indexOf( 'NPM') !== -1 ) weight -= 0.75

    if ( line.toLowerCase().indexOf( 'error' ) !== -1 ) weight += 1
    if ( line.toLowerCase().indexOf( 'fail' ) !== -1 ) weight += 0.49
    if ( line.indexOf( 'Error' ) !== -1 ) weight += 0.50

    // if current line has position information increase weight
    if ( rePosition.test( line.toLowerCase() ) ) {
      weight += 0.50
    }

    // if prev line contains 'error' increase weight a little bit
    var prevLine = _lines[ lineNumber - 1 ]
    if ( typeof prevLine === 'string' ) {
      if ( prevLine.toLowerCase().indexOf( 'error') !== -1 ) weight += 0.50

      if ( rePosition.test( prevLine.toLowerCase() ) ) {
        weight += 0.05
      }
    }

    // if next line contains 'error' increase weight a tiny bit
    var nextLine = _lines[ lineNumber + 1 ]
    if ( typeof nextLine === 'string' ) {
      if ( nextLine.toLowerCase().indexOf( 'error' ) !== -1 ) weight += 0.25

      if ( rePosition.test( nextLine.toLowerCase() ) ) {
        weight += 0.35
      }
    }

    debug( ' url found: ' + match[ 0 ] + ', weight: ' + weight )
    debug( '  line: ' + line )

    urls.push({
      weight: weight,
      line: line,
      lineNumber: lineNumber,
      match: match[0]
    })

    // for convenience check up one dir level
    urls.push({
      weight: weight - 0.1,
      line: line,
      lineNumber: lineNumber,
      match: '../' + match[0]
    })

    // for convenience check up two dir levels
    urls.push({
      weight: weight - 0.15,
      line: line,
      lineNumber: lineNumber,
      match: '../../' + match[0]
    })

    // for convenience check down one dir level
    cwdDirs.forEach(function (dir) {
      urls.push({
        weight: weight - 0.20,
        line: line,
        lineNumber: lineNumber,
        match: dir + '/' + match[0]
      })
    })
  }

  debug( 'sorting urls by weight' )
  urls = urls.sort(function (a, b) {
    return b.weight - a.weight
  })

  var bestUrl
  var bestResolvedPath
  for ( var i = 0; i < urls.length; i++ ) {
    var url = urls[ i ]
    var resolvedPath = path.resolve( url.match )
    var exists = fs.existsSync( resolvedPath )
    if ( exists ) {
      bestResolvedPath = resolvedPath
      bestUrl = url
      debug( ' >> deciding line: ' + url.line )
      break
    }
  }

  // if (!urls[0]) return console.log('no errors detected')
  if ( !bestUrl ) {
    debug( 'no url matches' )
    return false
  }

  if ( bestUrl.weight <= 0 ) {
    debug( ' >>>>> url match weight at or below 0 -- consider as no error found' )
    return false
  }

  debug( '   > most likely source URL: ' + bestUrl.match )

  debug(' === positions === ')
  var matches = []
  var rePosition = /[(]?\s{0,5}\d+\s{0,5}?\D{1,20}\s{0,5}?\d+\s{0,5}[)]?/g
  // match = rePosition.exec(text)
  seekBuffer = text
  while ( match = rePosition.exec( text ) ) {
    var weight = 0

    var indexOf = ( text.length - seekBuffer.length ) + seekBuffer.indexOf( match[ 0 ] )
    var lineNumber = text.substring( 0, indexOf ).split( '\n' ).length - 1
    var line = _lines[ lineNumber ]
    var words = line.split( /\s+/ )
    // console.debug(words)
    // console.debug(match[0])
    var word = words.filter( function ( w ) {
      return w.indexOf( match[ 0 ] ) !== -1
    } )[ 0 ]
    seekBuffer = text.substring( indexOf + match[ 0 ].length )

    debug( ' position word boundary: ' + word + ', match: ' + match[ 0 ] )
    // if matched word boundary contains '/' (path seperators) decrease weight
    // this avoids parsing path names as error positions (in case a path name happens to match)
    if (word && word.indexOf('/') !== -1) weight -= 1

    // avoid parsing lines with node_modules in them (most likely stack traces..)
    if ( line.toLowerCase().indexOf( 'node_modules' ) !== -1 ) weight -= 1
    if ( line.toLowerCase().indexOf( 'npm' ) !== -1 ) weight -= 0.5

    // if current line contains 'error' increase weight
    if ( line.toLowerCase().indexOf( 'error' ) !== -1 ) weight += 1
    if ( line.toLowerCase().indexOf( 'fail' ) !== -1 ) weight += 1
    if ( line.indexOf( 'Error' ) !== -1 ) weight += 1

    // decrease weight if match has letters in them
    if ( line.toLowerCase().match(/[a-z]/) ) weight -= 0.1

    // if prev line contains 'error' increase weight a little bit
    var prevLine = _lines[ lineNumber - 1 ]
    if ( typeof prevLine === 'string' ) {
      if ( prevLine.toLowerCase().indexOf( 'error' ) !== -1 ) weight += 0.50
    }

    // if next line contains 'error' increase weight a tiny bit
    var nextLine = _lines[ lineNumber + 1 ]
    if ( typeof nextLine === 'string' ) {
      if ( nextLine.toLowerCase().indexOf( 'error' ) !== -1 ) weight += 0.25
    }

    if ( line.indexOf( bestUrl.match ) !== -1 ) weight++

    debug(' position found: ' + match[0] + ', weight: ' + weight)
    debug('  line: ' + line)

    matches.push({
      line: line,
      weight: weight,
      lineNumber: lineNumber,
      match: match[0]
    })
  }

  // if (!matches.length > 0) return console.log('no errors detected')
  if ( matches.length < 1 ) {
    debug( 'no positional matches, trying special cases' )

    // special case positional matching.
    // for vanilla browserify prints only url and line number,
    // and a context snippet with column indicated by a ^ marker
    // so in order to know which column the error it, we need to
    // check how far the ^ character is to the right...  (:
    // it's stupid but it works.

    if ( bestUrl ) {
      try {
        var line = _lines
          .slice( bestUrl.lineNumber - 1 )
          .filter( function ( l ) {
          return ( l.indexOf( '^' ) >= 0 )
        } )[ 0 ]

        var lineNumber = bestUrl.line.split( ':' )[ 1 ].replace( /\D/g , '' )
        var column = line.indexOf( '^' )

        matches.push( {
          line: line,
          weight: 999,
          lineNumber: lineNumber,
          match: '(' + lineNumber + ':' + column + ')'
        } )

        debug( 'special case positioning found: ' + matches[ 0 ].match )
      } catch ( err ) {
        debug( 'no special case positioning found.' )
      }
    }
  }

  if ( matches.length < 1 ) {
    debug('still no positional matches, even after checking special cases')
    return false
  }

  // sort positions
  debug( 'sorting positions' )
  var r = matches.sort( function ( a, b ) {
    return b.weight - a.weight
  } )

  if ( r[ 0 ].weight <= 0 ) {
    debug( ' >>>>> pos match weight at or below 0 -- consider as no error found' )
    return false
  }

  var bestMatch = r[ 0 ].match
  debug( 'pos bestMatch: ' + bestMatch )

  var _likelyErrorDescription
  _lines.forEach( function ( line ) {
    if ( line.indexOf( 'Error' ) >= 0 ) _likelyErrorDescription = line
  })

  if ( !_likelyErrorDescription ) {
    _lines.forEach( function ( line ) {
      if ( line.toLowerCase().indexOf('unexpected') >= 0 ) _likelyErrorDescription = line
      if ( line.toLowerCase().indexOf('failed') >= 0 ) _likelyErrorDescription = line
    } )
  }

  if ( !_likelyErrorDescription ) {
    _likelyErrorDescription = '[ Unknown Error ]'
  }

  debug( '   > most likely error description: ' + _likelyErrorDescription )


  var pos = parsePosition( bestMatch )
  return {
    message: _likelyErrorDescription,
    url: bestUrl,
    path: bestResolvedPath,
    lineno: pos.lineno,
    colno: pos.colno
  }
}

module.exports = findError
