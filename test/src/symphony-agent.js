const fs = require( 'fs' )
const path = require( 'path' )
const urlParse = require( 'url' ).parse

const crypto = require( 'crypto' )

const iidesuka = require( 'iidesuka' )

const CONFIG = require( path.join( __dirname, '/private/config.json' ) )

const db = require( './database.js' )

const URL = urlParse( CONFIG.podUrl )
const PROTOCOL = URL.protocol
const HOST = URL.host

const dasu = require( 'dasu' )

// current session token
// TODO add clustering support ( read/write from cache )
var _sessionToken = ''

// _sessionToken = ''

var _gettingSessionToken = false
var _sessionListeners = []

// user email: id cache
const _cache = {}

const agentApi = {}

module.exports = agentApi

function log () {
  if ( !agentApi.silent ) {
    console.log.apply( this, arguments )
  }
}

// updateSessionToken() // update session token at start

function updateSessionToken ( next ) {
  if ( _gettingSessionToken ) {
    if ( typeof next === 'function' ) {
      _sessionListeners.push( next )
    }
  } else {
    _gettingSessionToken = true

    if ( typeof next === 'function' ) {
      _sessionListeners.push( next )
    }

    sharedKeyAuth( {
      accountName: CONFIG.accountName,
      sharedKey: CONFIG.sharedKey
    }, function ( err, token ) {
      if ( err ) throw err
      _gettingSessionToken = false

      log( 'got sessionToken: ' + stripped( token ) )
      _sessionToken = token

      console.log(
        'calling [$n] sessionToken callbacks'
        .replace( '$n', _sessionListeners.length )
      )

      _sessionListeners.forEach( function ( cb ) {
        cb()
      } )

      _sessionListeners.length = 0
    } )
  }
}

function handleError ( status, next ) {
  if ( !_sessionToken || status === 401 ) {
    _sessionToken = ''
    console.log( 'handleError: no sessionToken, updating sessionToken' )
    updateSessionToken( next )
  }
}

function getUserPresenceById ( id, callback ) {
  var params = {
    method: 'GET',
    protocol: 'https',
    host: 'nexus4-dev.symphony.com',
    path: '/pod/v3/user/' + id + '/presence',
    headers: {
      'Cache-Control': 'no-cache',
      'sessionToken': _sessionToken
    }
  }

  dasu.req(
    params,
    function ( err, res, body ) {
      if ( err ) {
        callback( err )
      } else {
        log( 'getUserPresenceById status: ' + res.status )

        try {
          var data = JSON.parse( body )
          callback( null, data )
        } catch ( err ) {
          callback( err )
        }
      }
    }
  )
}

function getUserPresenceByEmail ( email, callback ) {
  var id = _cache[ email ]
  if ( id ) {
    next( id )
  } else {
    getUserByEmail( email, function ( err, user ) {
      if ( err ) {
        callback( err )
      } else {
        id = _cache[ email ] = user.id

        db.set( 'email-of-id:' + id, email )

        next( id )
      }
    } )
  }

  function next ( id ) {
    getUserPresenceById( id, callback )
  }
}

function getUserByEmail ( email, callback ) {
  var params = {
    method: 'GET',
    protocol: PROTOCOL,
    host: HOST,
    path: '/pod/v2/user?email=' + email + '&local=true',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'sessionToken': _sessionToken
    }
  }

  dasu.req(
    params,
    function ( err, res, body ) {
      if ( err ) {
        callback( err )
      } else {
        log( 'getUserByEmail status: ' + res.status )

        try {
          var data = JSON.parse( body )
          if ( data.id ) {
            _cache[ email ] = data.id
            db.set( 'email-of-id:' + data.id, email )
          }

          callback( null, data )
        } catch ( err ) {
          callback( err )
        }
      }
    }
  )
}

function getUserById ( id, callback ) {
  var params = {
    method: 'GET',
    protocol: PROTOCOL,
    host: HOST,
    path: '/pod/v2/user?uid=' + id + '&local=true',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'sessionToken': _sessionToken
    }
  }

  dasu.req(
    params,
    function ( err, res, body ) {
      if ( err ) {
        callback( err )
      } else {
        log( 'getUserById status: ' + res.status )

        try {
          var data = JSON.parse( body )
          if ( data.id && data.emailAddress ) {
            _cache[ data.emailAddress ] = data.id
            db.set( 'email-of-id:' + data.id, data.emailAddress )
          }

          callback( null, data )
        } catch ( err ) {
          callback( err )
        }
      }
    }
  )
}

function getUserList ( callback ) {
  var params = {
    method: 'GET',
    protocol: 'https',
    host: 'nexus4-dev.symphony.com',
    path: '/pod/v1/admin/user/list',
    headers: {
      'Content-Type': 'application/json', // required
      'sessionToken': _sessionToken
    }
  }

  dasu.req(
    params,
    function ( err, res, body ) {
      if ( err ) throw err
      console.log( 'status: ' + res.status )

      try {
        var data = JSON.parse( body )
        console.log( 'list.length: ' + data.length )
        callback( null, data )
      } catch ( err ) {
        callback( err )
      }
    }
  )
}

function createPresenceFeed ( callback ) {
  var params = {
    method: 'POST',
    protocol: 'https',
    host: 'nexus4-dev.symphony.com',
    path: '/pod/v1/presence/feed/create',
    headers: {
      // 'Content-Type': 'application/json', // required
      'sessionToken': _sessionToken
    }
  }

  dasu.req(
    params,
    function ( err, res, body ) {
      if ( err ) throw err

      console.log( 'status: ' + res.status )

      try {
        var data = JSON.parse( body )

        var e = (
          iidesuka( data )
          .typeof( 'id', 'string', 'no id string returned' )
          .gt( 'id.length', 10, 'id length invalid ( too short )' )
          .end()
        )

        if ( e ) return callback( e )

        console.log( 'got feedId: ' + data.id )
        callback( null, data.id )
      } catch ( err ) {
        callback( err )
      }
    }
  )
}

function readPresenceFeed ( feedId, callback ) {
  var params = {
    method: 'GET',
    protocol: 'https',
    host: 'nexus4-dev.symphony.com',
    path: (
      '/pod/v1/presence/feed/:feedId/read'
      .replace( ':feedId', feedId )
    ),
    headers: {
      // 'Content-Type': 'application/json', // required
      'sessionToken': _sessionToken
    }
  }

  dasu.req(
    params,
    function ( err, res, body ) {
      if ( err ) throw err

      console.log( 'status: ' + res.status )

      try {
        var data = JSON.parse( body )

        console.log( 'feed list.length: ' + data.length )

        // var e = (
        //   iidesuka( data )
        //   .typeof( 'id', 'string', 'no id string returned' )
        //   .gt( 'id.length', 10, 'id length invalid ( too short )' )
        // )

        callback( null, data )
      } catch ( err ) {
        callback( err )
      }
    }
  )
}

agentApi.getUserPresenceById = getUserPresenceById
agentApi.getUserPresenceByEmail = getUserPresenceByEmail
agentApi.getUserByEmail = getUserByEmail
agentApi.getUserList = getUserList
agentApi.getUserById = getUserById

agentApi.createPresenceFeed = createPresenceFeed
agentApi.readPresenceFeed = readPresenceFeed

// wrap requests to update/fetch session token if necessary
Object.keys( agentApi ).forEach( function ( key ) {
  var fn = agentApi[ key ]
  if ( typeof fn === 'function' ) {
    var wrappedFn = function () {
      var self = this
      var args = arguments
      if ( !_sessionToken ) {
        updateSessionToken( function () {
          fn.apply( self, args )
        } )
      } else {
        fn.apply( self, args )
      }
    }

    agentApi[ key ] = wrappedFn
  }
} )

/*
 * internal session handling and authentication
 */
function sharedKeyAuth ( opts, callback ) {
  var { accountName, sharedKey } = opts

  log( 'sharedKeyAuth' )
  getNonce( accountName, function ( err, nonce ) {
    if ( err ) {
      callback( err )
    } else {

      var signedNonce = signNonce( sharedKey, nonce )

      log( 'sharedKeyAuth nonce: ' + stripped( nonce ) )
      log( 'sharedKeyAuth signedNonce: ' + stripped( signedNonce ) )

      var params = {
        method: 'POST',
        protocol: PROTOCOL,
        host: HOST,
        path: '/login/sharedkey/verify?accountName=' + accountName + '&sig=' + signedNonce,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }
      }

      dasu.req(
        params,
        function ( err, res, body ) {
          if ( err ) {
            callback( err )
          } else {
            log( 'sharedKeyAuth status: ' + res.status )

            try {
              var data = JSON.parse( body )
              callback( null, data.message )
            } catch ( err ) {
              callback( err )
            }
          }
        }
      )
    }
  } )
}

function getNonce ( accountName, callback ) {
  var params = {
    method: 'POST',
    protocol: PROTOCOL,
    host: HOST,
    path: '/login/nonce?accountName=' + accountName,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    }
  }

  log( 'getNonce' )
  dasu.req(
    params,
    function ( err, res, body ) {
      if ( err ) {
        callback( err )
      }
      log( 'getNonce status: ' + res.status )

      try {
        var data = JSON.parse( body )
        callback( null, data.message )
      } catch ( err ) {
        callback( err )
      }
    }
  )
}

function signNonce ( b64sharedKey, nonce ) {
  const mac = crypto.createHmac(
    'sha256', Buffer.from( b64sharedKey, 'base64' )
  )

  // add data
  mac.update( Buffer.from( nonce, 'base64' ) )

  // calculate digest from data
  const digest = mac.digest( 'base64' )

  return encodeURIComponent( digest )
}

function stripped ( str ) {
  return (
    str.slice( 0, 4 ) + '...' + str.slice( -4 )
  )
}
