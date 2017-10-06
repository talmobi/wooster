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

// '/Users/mollie/code/wooster/test/src/main-error.js:1',
var sourcePath = path.join(
  __dirname,
  'src/main-error.js'
)

var buffer = [
  '',
  '$absolutePath:1'.replace( '$absolutePath', sourcePath ),
  'var text = \'giraffe\':',
  '                    ^',
  'ParseError: Unexpected token'
].join( '\n' )

test( 'test no prettify', function ( t ) {
  t.plan( 1 )

  wooster( buffer, { prettify: false }, function ( text ) {
    var expectedOutput = [
      '>> wooster output <<',
      'ParseError: Unexpected token',
      '',
      '@ ./src/main-error.js 1:20',
      '> 1 | var text = \'giraffe\':',
      '|                     ^',
      '2 | console.log(text)'
    ].join( '\n' )

    t.equal(
      tools.normalize( text ),
      tools.normalize( expectedOutput ),
      'wooster output was as expected'
    )
  } )
} )
