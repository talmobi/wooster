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

var opts = {
  prettify: true,
  filename: 'http://localhost:4040/bundle.js',
  message: 'ReferenceError: Can\'t find variable: redom',
  text: '(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module \'"+o+"\'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){\n\'use strict\';\n\n// successful build\nvar text = \'giraffe\';\nredom;\nconsole.log(text);\n\n},{}]},{},[1])\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJ0ZXN0L3N0YWdlL2FwcC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDQUE7QUFDQSxJQUFJLE9BQU8sU0FBWDtBQUNBO0FBQ0EsUUFBUSxHQUFSLENBQWEsSUFBYiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBzdWNjZXNzZnVsIGJ1aWxkXG52YXIgdGV4dCA9ICdnaXJhZmZlJ1xucmVkb21cbmNvbnNvbGUubG9nKCB0ZXh0IClcbiJdfQ==\n',
  lineno: 6,
  colno: 6
}

test( 'parse origin context and message ( no source maps )', function ( t ) {
  var ctx = wooster.parseContext( {
    prettify: true,
    disableSourceMaps: true,
    text: opts.text,
    filename: opts.filename,
    lineno: opts.lineno,
    colno: opts.colno
  } )

  t.equal( opts.filename, ctx.filename, 'filename was the same OK' )
  t.equal( ctx.usedSourceMap, false, 'did not use source map OK' )
  t.equal( ctx.lineno, 6, 'line number OK' )
  t.equal( ctx.colno, 6, 'column number OK' )
  t.equal(
    tools.normalize( ctx.context ),
    tools.normalize(
      fs.readFileSync( path.join( 'src/sourcemap/origin-context.txt' ), 'utf8' )
    ),
    'origin context OK'
  )

  var message = wooster.createMessage( {
    message: opts.message,
    filename: ctx.filename,
    ctx: ctx
  } )

  t.equal(
    tools.normalize( message ),
    tools.normalize(
      fs.readFileSync( path.join( 'src/sourcemap/origin-output.txt' ), 'utf8' )
    ),
    'origin output ( terminal ) message OK'
  )

  t.end()
} )

test( 'parse source map context and message ( source file not found on disk )', function ( t ) {
  var ctx = wooster.parseContext( {
    prettify: true,
    disableSourceMaps: false, // allow source maps ( the default )
    text: opts.text,
    filename: opts.filename,
    lineno: opts.lineno,
    colno: opts.colno
  } )

  t.notEqual( opts.filename, ctx.filename, 'filename was not the same OK' )
  t.equal( ctx.filename, 'test/stage/app.js', 'filename was not the same OK' )
  t.equal( ctx.usedSourceMap, true, 'did use source map OK' )
  t.equal( ctx.lineno, 3, 'line number OK' )
  t.equal( ctx.colno, 0, 'column number OK' )
  t.equal(
    tools.normalize( ctx.context ),
    tools.normalize(
      fs.readFileSync( path.join( 'src/sourcemap/sourcemap-context.txt' ), 'utf8' )
    ),
    'sourcemap context OK'
  )

  var message = wooster.createMessage( {
    message: opts.message,
    filename: ctx.filename,
    ctx: ctx
  } )

  t.equal(
    tools.normalize( message ),
    tools.normalize(
      fs.readFileSync( path.join( 'src/sourcemap/sourcemap-output--source-file-not-found-on-disk.txt' ), 'utf8' )
    ),
    'sourcemap output ( terminal ) message OK'
  )

  t.end()
} )

test( 'parse source map context and message ( source file FOUND on disk )', function ( t ) {
  try {
    fs.mkdirSync( 'test' )
    fs.mkdirSync( 'test/stage' )
    fs.writeFileSync( path.join( 'test/stage/app.js' ), 'foo' )
  } catch ( err ) { /* ignore */ }

  var ctx = wooster.parseContext( {
    prettify: true,
    disableSourceMaps: false, // allow source maps ( the default )
    text: opts.text,
    filename: opts.filename,
    lineno: opts.lineno,
    colno: opts.colno
  } )

  t.notEqual( opts.filename, ctx.filename, 'filename was not the same OK' )
  t.equal( ctx.filename, 'test/stage/app.js', 'filename was not the same OK' )
  t.equal( ctx.usedSourceMap, true, 'did use source map OK' )
  t.equal( ctx.lineno, 3, 'line number OK' )
  t.equal( ctx.colno, 0, 'column number OK' )
  t.equal(
    tools.normalize( ctx.context ),
    tools.normalize(
      fs.readFileSync( path.join( 'src/sourcemap/sourcemap-context.txt' ), 'utf8' )
    ),
    'sourcemap context OK'
  )

  var message = wooster.createMessage( {
    message: opts.message,
    filename: ctx.filename,
    ctx: ctx
  } )

  t.equal(
    tools.normalize( message ),
    tools.normalize(
      fs.readFileSync( path.join( 'src/sourcemap/sourcemap-output.txt' ), 'utf8' )
    ),
    'sourcemap output ( terminal ) message OK'
  )

  fs.unlinkSync( path.join( 'test/stage/app.js' ) )
  fs.rmdirSync( 'test/stage' )
  fs.rmdirSync( 'test' )

  t.end()
} )


// var origin = undefined
// if ( ctx.usedSourceMap ) {
//   var originCtx = wooster.parseContext( {
//     prettify: true,
//     disableSourceMaps: true,
//     text: opts.text,
//     filename: opts.filename,
//     lineno: opts.lineno,
//     colno: opts.colno
//   } )
// 
//   origin = wooster.createMessage( {
//     message: opts.message,
//     filename: originCtx.filename,
//     ctx: originCtx
//   } )
// }
