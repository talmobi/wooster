const fs = require( 'fs' )
const path = require( 'path' )

const CONFIG = require( path.join( __dirname, '/private/config.json' ) )

const symphonyAgent = require( './symphony-agent.js' )
const statsAgent = require( './stats-agent.js' )

const async = require( 'async' )

const db = require( './database.js' )

const INTERVAL = Math.ceil( 15 * 1000 + Math.random() * 10000 )
const ERROR_TIMEOUT = 1000 * 60 * 3

const LOCK_TIMEOUT_SECONDS = 60 * 10

var _errorTimeout

// TODO refactor special key names to config file?
const KEY = 'symphony-users-injector-lock'
const LAST_UPDATE_KEY = 'symphony-users-injector-last-update-time'

const MS_BETWEEN_CALLS = 100 // TODO UNUSED
const MAX_PARALLEL_TASKS = 10

const api = {}

api.start = start
api.stop = stop

module.exports = api

const _name = '[injector:' + process.pid + ']'

function log () {
  if ( process.env.INJECTOR_SILENT ) return

  if ( typeof arguments[ 0 ] === 'string' ) {
    arguments[ 0 ] = _name + ': ' + arguments[ 0 ]
  }
  console.log.apply( this, arguments )
}

var _running = false

function start () {
  if ( !_running ) {
    _running = true
    scheduleTick()
  }
}

function stop () {
  _running = false
  clearTimeout( _errorTimeout )
}

function tick () {
  clearTimeout( _errorTimeout )
  _errorTimeout = setTimeout( function () {
    throw new Error( _name + ': error timed out.' )
  }, ERROR_TIMEOUT )

  // make sure the lock expires if it's too old
  db.expireMax( KEY, LOCK_TIMEOUT_SECONDS, function ( set, s ) {
    if ( set ) {
      log( 'expireMax set: ' + s + ' seconds' )
    }
  } )

  statsAgent.send(
    'sps.injector.ticks:1|c'
  )

  var value = Date.now()

  log( 'locking key' )
  db.lock( KEY, value, LOCK_TIMEOUT_SECONDS, function ( locked ) {
    if ( locked ) {
      log( 'locked!' )
      var startTime = Date.now()

      // set expiration on the lock if the value matches
      db.expireLock( KEY, value, LOCK_TIMEOUT_SECONDS, function ( willExpire ) {
        if ( willExpire ) {
          log( 'lock set to expire in ' + ( LOCK_TIMEOUT_SECONDS ) + ' seconds' )
        }
      } )

      updateUserList( function () {
        scheduleTick( INTERVAL )
        var delta = Math.round( ( Date.now() - startTime ) / 1000 )
        log( 'user list updated, took: ~' + delta + ' seconds' )

        statsAgent.send(
          'sps.injector.updateTime:' + delta + '|g'
        )

        scheduleTick( INTERVAL )

        db.set( LAST_UPDATE_KEY, Date.now() )

        // set expiration on the lock if the value matches
        db.expireLock( KEY, value, ( 180 + delta ), function ( willExpire ) {
          if ( willExpire ) {
            log( 'lock set to expire in ' + ( 180 + delta ) + ' seconds' )
          }
        } )

        // setTimeout( function () {
        //   // unlock if the key matches the value set
        //   db.unlock( KEY, value, function ( unlocked ) {
        //     if ( unlocked ) {
        //       log( 'unlocked' )
        //     }
        //   } )
        // }, 1000 * 60 )
      } )
    } else {
      // failed to lock
      log( 'failed to lock ( already locked )' )
      scheduleTick( INTERVAL )
    }
  } )
}

function scheduleTick ( interval ) {
  clearTimeout( _errorTimeout )
  _errorTimeout = setTimeout( function () {
    tick()
  }, interval )
}

function updateUserList ( done ) {
  log( 'updating user list' )

  symphonyAgent.getUserList( function ( err, list ) {
    if ( err ) throw err

    var counter = 0

    var tasks = list.map( function ( id ) {
      return function ( callback ) {

        symphonyAgent.getUserById( id, function ( err, data ) {
          var timeout = setTimeout( function () {
            callback( new Error( 'Error getting user timed out' ) )
          }, 1000 * 10 )

          if ( err ) {
            console.error( err )
            log( 'error getting user id: ' + id )
            statsAgent.send(
              'sps.injector.errors:1|c'
            )

            clearTimeout( timeout )
            callback( null )
          } else {
            data.userID = String( data.emailAddress )
            data.symphonyId = String( data.id )

            if ( data.userID && data.symphonyId ) {
              // skip garbage users
              // TODO refactor this?
              if ( data.emailAddress.indexOf( 'success+' ) === -1 ) {
                symphonyAgent.getUserPresenceById(
                  data.symphonyId,
                  function ( err, d ) {
                    if ( err ) {
                      console.error( err )
                      clearTimeout( timeout )
                      callback( null )
                    } else {
                      // console.log( 'CATEGORY: ' + d.category )
                      data.category = d.category

                      var statusMapping = CONFIG.statusMappings[ data.category ] || {}

                      var UNKNOWN = ''

                      // TODO remap the data
                      var doc = {
                        userID: data.emailAddress,
                        symphonyId: String( data.id ),
                        primaryEmailAddress: data.emailAddress || UNKNOWN,

                        activity: data.category || UNKNOWN, // TODO
                        availability: statusMapping.outlookPresence || UNKNOWN,
                        activityId: statusMapping.outlookActivity || UNKNOWN, // TODO

                        title: data.title || UNKNOWN,
                        company: data.company || UNKNOWN,
                        department: data.department || UNKNOWN,
                        office: data.office || UNKNOWN,

                        contactType: data.contactType || 'Person',
                        description: data.description || UNKNOWN,

                        firstName: data.firstName || UNKNOWN,
                        lastName: data.lastName || UNKNOWN,

                        nextCalendarStateStartTime: '', // TODO
                        currentCalendarState: '', // TODO
                        nextCalendarState: '', // TODO

                        isOutOfOffice: data.isOutOfOffice || ''
                      }

                      if ( data.avatars instanceof Array ) {
                        doc.iconUrl = data.avatars[ 0 ].url || UNKNOWN

                        // resolve relative ../ path to podUrl path
                        doc.iconUrl = doc.iconUrl.split( '..' ).join( CONFIG.podUrl )
                      }

                      db.setUser( doc, function ( err ) {
                        if ( err ) {
                          console.error( err.message || err )

                          clearTimeout( timeout )
                          callback( err )
                        } else {
                          clearTimeout( timeout )
                          callback( null )
                        }
                      } )
                    }
                  }
                )
              } else {
                log( 'skipping garbage user with email: ' + data.emailAddress )
                clearTimeout( timeout )
                callback( null )
              }
            } else {
              clearTimeout( timeout )
              callback( null )
            }
          }

          log( 'counter: ' + ++counter + ' / ' + list.length )
        } )

      }
    } )

    async.parallelLimit(
      tasks,
      MAX_PARALLEL_TASKS,
      function ( err ) {
        if ( err ) {
          throw err
        }

        log( 'users updated' )

        done()
      }
    )
  } )
}
