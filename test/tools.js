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
  // { shell: true } fixed windows errors where there are spaces
  // in both command and argument, see:
  // https://github.com/nodejs/node/issues/736://github.com/nodejs/node/issues/7367
  var spawn = childProcess.spawn(cmd, args, { shell: true })
  _spawns.push(spawn)

  var handler = createIOHandler(function (data) {
    // console.log('killing spawn and calling callback')
    spawn.kill()
    callback(data)
  })

  spawn.stdout.on( 'data', handler )
  spawn.stderr.on( 'data', handler )
}

function createIOHandler ( callback ) {
  var _done = false
  var _buffer = ''

  var _timeout = setTimeout( function () {
    _done = true
    // console.log( 'test timed out' )
    callback( _buffer )
  }, 5000 )

  return function handleIO ( chunk ) {
    // console.log('callbacking')
    if ( _done ) return undefined
    _buffer += chunk.toString( 'utf8' )

    clearTimeout( _timeout )
    _timeout = setTimeout( function () {
      _done = true
      callback( _buffer )
    }, 1000 )
  }
}

function stripAnsi ( str ) {
  // https://github.com/chalk/ansi-regex
  var ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PRZcf-nqry=><]/g
  return str.replace( ansiRegex, '' )
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
  normalize: normalize,
  clean: clean,
  UID: UID
}
