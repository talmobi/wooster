var tap = require( 'tap' )

var shortenUrls = require( '../src/shorten-urls.js' )
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
    length: 3,
    source: 'path/to/file/',
    target: 'pat/to/file'
  },
  {
    length: 3,
    source: 'path/to/file///.././',
    target: 'pat/to/file'
  },
  {
    length: 3,
    source: undefined,
    target: undefined
  }
]

urls.forEach( function ( pair ) {
  tap.equal(
    shortenUrls( pair.source, pair.length ),
    pair.target
  )
} )
