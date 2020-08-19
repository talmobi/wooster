var path = require( 'path' )
var childProcess = require( 'child_process' )
var fs = require( 'fs' )

var _spawns = []

process.on( 'exit', function () {
  _spawns.forEach( function ( spawn ) {
    try {
      spawn.kill()
    } catch ( err ) { /* ignore */ }
  } )
} )

function exec ( cmd, args, callback ) {
  // console.log( 'running command: ' + cmd + ' ' + args.join( ' ') )

  // { shell: true } fixed windows errors where there are spaces
  // in both command and argument, see:
  // https://github.com/nodejs/node/issues/736://github.com/nodejs/node/issues/7367
  var spawn = childProcess.spawn( cmd, args, { shell: true } )
  _spawns.push( spawn )

  var _data = ''

  var handler = createIOHandler( function ( data ) {
    _data = data

    try {
      spawn.kill()
    } catch ( err ) { /* ignore */ }
  } )

  spawn.on( 'exit', function () {
    var limit = ( Date.now() + 1000 )

    attempt()
    function attempt () {
      var timedOut = ( Date.now() > limit )
      if ( _data || timedOut ) {
        callback( _data )
      } else {
        setTimeout( attempt, 100 )
      }
    }
  } )

  spawn.stdout.on( 'data', handler )
  spawn.stderr.on( 'data', handler )
}

function createIOHandler ( callback ) {
  var _done = false
  var _buffer = ''

  var _timeout = setTimeout( function () {
    clearTimeout( _timeout )
    if ( !_done ) {
      _done = true
      console.log( 'IOHandler timed out' )
      callback( _buffer )
    }
  }, 1000 * 6 )

  return function handleIO ( chunk ) {
    if ( _done ) return undefined

    _buffer += chunk.toString( 'utf8' )

    if ( _buffer.trim().length > 0 ) {
      clearTimeout( _timeout )
      _timeout = setTimeout( function () {
        _done = true
        callback( _buffer )
      }, 1000 )
    }
  }
}

function execWait ( file, cmd, args, callback ) {
  var startTime = Date.now()
  var limit = 1000 * 3

  attempt()

  function attempt () {
    // console.log( 'attempting: ' + file )
    try {
      var stats = fs.statSync( file )

      if ( stats.size > 0 ) {
        // console.log( 'attempt SUCCESS: ' + file )
        finish()
      }
    } catch ( err ) {

      var now = Date.now()
      var delta = ( now - startTime )
      if ( delta < limit ) {
        setTimeout( attempt, 500 )
      } else {
        console.log( 'attempt TIMEOUT: ' + file )
        finish()
      }
    }
  }

  function finish () {
    exec( cmd, args, callback )
  }
}

function stripAnsi ( str ) {
  return require( 'cli-color/strip' )( str )
}

function normalize ( str ) {
  var s = stripAnsi( str )
  s = s.replace( /\s+/g, '' )
  s = s.toLowerCase()
  return s
}

function clean ( filepath ) {
  try {
    fs.unlinkSync( filepath )
    fs.readFileSync( filepath)
  } catch ( err ) {
    if ( err.code === 'ENOENT' ) {
      return 'is clean'
    }
  }

  return false
}

var _counter = 0
var _size = ( 1 << 16 )

function UID () {
  var date = Date.now().toString( 16 ).slice( -10 )
  var rnd = String( Math.floor( Math.random() * _size ) )
  return ( 'uid' + date + String( _counter++ ) + rnd )
}

module.exports = {
  exec: exec,
  execWait: execWait,
  normalize: normalize,
  clean: clean,
  UID: UID
}
