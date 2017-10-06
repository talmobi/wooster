var test = require( 'tape' )

var shortenUrls = require( '../src/path-shorten.js' )
var clc = require( 'cli-color' )

var urls = [
  {
    length: 1,
    source: 'path/to/file',
    target: 'p/t/file'
  },
  {
    length: -1, // defaults to 3 when falsy
    source: 'path/to/file',
    target: 'pat/to/file'
  },
  {
    length: 0, // defaults to 3 when falsy
    source: 'path/to/file',
    target: 'pat/to/file'
  },
  {
    length: 2,
    source: 'path/to/file',
    target: 'pa/to/file'
  },
  {
    length: 3,
    source: 'path/to/file',
    target: 'pat/to/file'
  },
  {
    length: 4,
    source: 'path/to/file',
    target: 'path/to/file'
  },
  {
    length: 5,
    source: 'path/to/file',
    target: 'path/to/file'
  },
  {
    length: 1,
    source: '~/.vim/autoload/myfile.vim',
    target: '~/.v/a/myfile.vim'
  },
  {
    length: 3,
    source: '/path/to/file',
    target: '/pat/to/file'
  },
  {
    length: 3,
    source: '/path/to/file/',
    target: '/pat/to/file'
  },
  {
    length: 2,
    source: '.path/.to/file/',
    target: '.pa/.to/file'
  },
  {
    length: 2,
    source: '.path/.to/file/.',
    target: '.pa/.to/file'
  },
  {
    length: 3,
    source: './path/to/file/',
    target: './pat/to/file'
  },
  {
    length: 3,
    source: 'path/to/file/',
    target: 'pat/to/file'
  },
  {
    length: 3,
    source: 'path/to/file///.././', // NOTICE .. to move up 1 dir
    target: 'pat/to'
  },
  {
    length: 3,
    source: '',
    target: ''
  }
]

test( 'test shorten-urls.js', function ( t ) {
  t.plan( urls.length + 1 )

  try {
    shortenUrls( undefined, undefined )
    t.fail( 'should have thrown an error' )
  } catch ( err ) {
    t.pass( 'OK! throws error when not a string' )
  }

  urls.forEach( function ( pair ) {
    t.equal(
      shortenUrls( pair.source, pair.length ),
      pair.target
    )
  } )
} )
