[![npm](https://img.shields.io/npm/v/wooster.svg?maxAge=3600&style=flat-square)](https://www.npmjs.com/package/wooster)
[![npm](https://img.shields.io/npm/l/wooster.svg?maxAge=3600&style=flat-square)](https://github.com/talmobi/wooster/blob/master/LICENSE)
![mac](https://github.com/talmobi/wooster/workflows/mac/badge.svg)
![ubuntu](https://github.com/talmobi/wooster/workflows/ubuntu/badge.svg)
![windows](https://github.com/talmobi/wooster/workflows/windows/badge.svg)

#  wooster
error detection, context and makeup 🎀

## Before
![](https://i.imgur.com/E1f9hhn.gif)

## After
![](https://i.imgur.com/ZQuiNbt.gif)

## Easy to use

#### CLI with pipes
```bash
npm install -g wooster
npm run build 2>&1 | wooster
```

![](https://thumbs.gfycat.com/ObedientRemarkableArthropods-size_restricted.gif)

#### As module
```js
var wooster = require( 'wooster' )
var wp = wooster.parse( text )
if ( wp ) {
  console.log( wp.text ) // full wooster output message with context

  console.log( wp.context ) // only context
  console.log( wp.filename ) // filename
}
```

```js
// grab context from text
var ctx = wooster.parseContext(
  {
    disableSourceMaps: false, // parse inline source maps by default
    prettify: true, // enable pretty/colored output
    text: fs.readFileSync( 'index.js', 'utf8' ),
    filename: 'index.js',
    lineno: 10,
    colno: 3
  }
)
```

## About
Basic error log output parser.

## Why
To easily see the source error and context.

## How
By scoring each line, each url and each source position ( line and column )
in a variety of ways to determine if there is an error that could be parsed
and then giving that error some context and giving it some makeup.

If no error is detected or parsing fails the input will be returned as output without changes.

## Alternatives
[pretty-error](https://github.com/AriaMinaei/pretty-error)

## Test

Tests against successful and error outputs from `browserify`, `babelify`, `rollup`,
`webpack`, `sass`, `less`, `stylus` and some sample pm2 log error output.

```bash
npm test
```
