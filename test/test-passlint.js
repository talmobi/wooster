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

test( 'passlint main.js', function ( t ) {
  t.plan( 1 )

  var text = fs.readFileSync(
    path.join( __dirname, 'logs/passlint_main.js' ), 'utf8'
  )

  wooster( text, function ( output ) {
    t.equal(
      text,
      output,
      'wooster output === input since no errors were detected'
    )
  } )
} )

test( 'passlint main-error.js', function ( t ) {
  t.plan( 1 )

  var text = fs.readFileSync(
    path.join( __dirname, 'logs/passlint_main-error.js' ), 'utf8'
  )

  var expectedOutput = [
    '>> wooster output <<',
    './src/main-error.js:1:21: ParseError: Unexpected token',
    '',
    '@  ./src/main-error.js 1:21',
    '> 1 | var text = \'giraffe\':',
    '|                      ^',
    '2 | console.log(text)'
  ].join( '\n' )

  wooster( text, function ( output ) {
    t.equal(
      tools.normalize( output ),
      tools.normalize( expectedOutput ),
      'wooster output was as expected'
    )
  } )
} )
