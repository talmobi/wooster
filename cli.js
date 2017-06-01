#!/usr/bin/env node

var wooster = require('./snippet.js')
var buffer = ''
var timeout

var argv = require('minimist')(process.argv.slice(2))
var _timeout = argv.t || process.env.TIMEOUT || 25

process.stdin.on('data', function (chunk) {
  buffer += chunk
  clearTimeout(timeout)
  timeout = setTimeout(function () {
    wooster(buffer)
    buffer = ''
  }, _timeout)
})

