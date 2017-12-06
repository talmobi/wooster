var fs = require( 'fs' )
var path = require( 'path' )

var tools = require( './tools.js' )

var test = require( 'tape' )

var wooster

if ( typeof process.env.TEST_SOURCE === 'string' ) {
  var source = process.env.TEST_SOURCE
  wooster = require( source )
  console.log( 'testing source: ' + source )
} else {
  // wooster = require('../snippet.js')
  wooster = require( '../src/version2.js' )
  // wooster = require( '../dist/bundle.min.js' )
}

test( 'successful log parsing', function ( t ) {
  t.plan( 1 )

  var data = fs.readFileSync(
    path.join( __dirname, 'logs/1.txt' ), 'utf8'
  )

  var expectedOutput = [
    ">> wooster output <<",
    "17|sps | TypeError: Cannot read property 'OFFLINE' ofundefined",
    "",
    "@  ./src/symphony-users-injector.js 179:64",
    "174 |   callback( null )",
    "175 | } else {",
    "176 |   // console.log( 'CATEGORY: ' + d.category )",
    "177 |   data.category = d.category",
    "178 |",
    "> 179 |   var statusMapping = CONFIG.statusMappings[ data.category ] || {}",
    "|                                             ^",
    "180 |",
    "181 |   var UNKNOWN = ''",
  ].join( '\n' )

  wooster( data, function ( text ) {
    t.equal(
      tools.normalize( text ),
      tools.normalize( expectedOutput ),
      'wooster error parse output as expected!'
    )
  } )
} )
