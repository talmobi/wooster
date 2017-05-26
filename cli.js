#!/usr/bin/env node

var wooster = require('./snippet.js')
var buffer = ''
var timeout

process.stdin.on('data', function (chunk) {
  buffer += chunk
  clearTimeout(timeout)
  timeout = setTimeout(function () {
    wooster(buffer)
    buffer = ''
  }, 5)
})

