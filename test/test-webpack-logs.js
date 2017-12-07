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

var log = fs.readFileSync(
  path.join( __dirname, 'logs/webpack-logs.txt'),
  'utf8'
)

var expectedOutput = [
  '>> wooster output <<',
  'Module build failed: SyntaxError: Unexpected token, expected ; (63:11)',
  '',
  '@  ./src/child-applications/lifecycles/load.js 63:11',
  '58 | var r',
  '59 | if ( window.Reflect ) {',
    '60 |   r = Object.assign( window.Reflect )',
  '61 | }',
  '62 |',
  '> 63 | var el _mount.apply( this, arguments )',
  '|        ^',
  '64 |',
  '65 | if ( r ) {'
].join( '\n' )

test( 'webpack sample log output', function ( t ) {
  t.equal(
    tools.normalize( wooster( log ) ),
    tools.normalize( expectedOutput ),
    'wooster output was as expected'
  )
  t.end()
} )
