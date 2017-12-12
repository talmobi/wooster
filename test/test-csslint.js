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

test( 'csslint app.css', function ( t ) {
  t.plan( 1 )

  var text = fs.readFileSync(
    path.join( __dirname, 'logs/csslint_app.css' ), 'utf8'
  )

  wooster( text, function ( output ) {
    t.equal(
      text,
      output,
      'wooster output === input since no errors were detected'
    )
  } )
} )

test( 'csslint app-error.js', function ( t ) {
  t.plan( 1 )

  var text = fs.readFileSync(
    path.join( __dirname, 'logs/csslint_app-error.css' ), 'utf8'
  )

  var expectedOutput = [
    '>> wooster output <<',
    'Expected RBRACE at line 2, col 21.',
    '',
    '@  ./src/app-error.css 2:21',
    '1 | html, body {',
    '> 2 |   background: tomato:',
    '|                      ^',
    '3 | }'
  ].join( '\n' )

  wooster( text, function ( output ) {
    t.equal(
      tools.normalize( output ),
      tools.normalize( expectedOutput ),
      'wooster output was as expected'
    )
  } )
} )
