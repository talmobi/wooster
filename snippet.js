var path = require('path')
var fs = require('fs')
var clc = require('cli-color')

var DEBUG = false

function debug () {
  DEBUG && console.log.apply(this, arguments)
}

// https://github.com/chalk/ansi-regex
var ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PRZcf-nqry=><]/g

function stripAnsi (str) {
  return str.replace(ansiRegex, '')
}

var _iterationBoxCounter = 0
var _iterationBoxCounterLimit = 4
function getIerationBox () {
  _iterationBoxCounter = (_iterationBoxCounter + 1) % _iterationBoxCounterLimit

  var box = ''
  for (var i = 0; i < _iterationBoxCounterLimit; i++) {
    if (i === _iterationBoxCounter) {
      box += clc.bgMagentaBright('  ')
    } else {
      box += '  '
    }
  }

  return box
}

function stripSnippets (str) {
  var lines = str.split('\n').map(function (line) {
    return {
      text: line
    }
  })

  lines.forEach(function (line) {
    var text = line.text
    var head = text.substring(0, 10)
    var match

    var reLineNumber = /\s{0,5}\d+\s{1,2}[|:]?\s{0,5}/
    var match = reLineNumber.exec(head) // match against head of string
    if (match && match[0]) {
      line.possibleSnippet = true
      // debug('possibleSnippet found: ' + text)
    }
  })

  for (var i = 0; i < lines.length; i++) {
    var prevLine = lines[i - 1] || undefined
    var currentLine = lines[i]
    var nextLine = lines[i + 1] || undefined

    if (currentLine.possibleSnippet) {
      if (prevLine && prevLine.possibleSnippet) {
        lines[i].detectedSnippet = true
      }
      if (nextLine && nextLine.possibleSnippet) {
        lines[i].detectedSnippet = true
      }
    }
  }

  // lines.forEach(function (line) {
  //   if (line.detectedSnippet) debug('detectedSnippet: ' + line.text)
  // })

  return lines.filter(function (line) {
    return !line.detectedSnippet
  }).map(function (line) {
    return line.text
  }).join('\n')
}

// var rePath = /[\S]*\.[a-zA-Z]+/g
// var rePosition = /[(]?\s{0,5}\d+.{0,5}?\d+\s{0,5}[)]?/g
// var hljs = require('highlight.js')


var browserifyString = 'SyntaxError: /Users/mollie/temp/miru/demos/webpack/scripts/mods/module.js: Unexpected token, expected ; (4:25) while parsing file: /Users/mollie/temp/miru/demos/webpack/scripts/mods/module.js'

var webpackString = [
  'ERROR in ./scripts/mods/module.js',
  'Module build failed: SyntaxError: Unexpected token, expected ; (4:25)'
].join('\n')

var standardString = 'standard: Use JavaScript Standard Style (https://standardjs.com) /Users/mollie/temp/miru/demos/webpack/scripts/mods/module.js:4:26: Parsing error: Unexpected token :'

var _resolved = []
var _positions = []
var _lastMode = 'normal'
var _likelyErrorDescription = ''

function transformToRelativePaths (text, callback) {
  if (!callback) {
    callback = function (str) { return str }
  }
  if (typeof callback !== 'function') {
    throw new Error('callback parameter must be of type "function"')
  }

  var match
  var urls = []
  var rePath = /[\S]*\.[a-zA-Z]+/g
  while (match = rePath.exec(text)) {
    urls.push({
      match: match[0],
      absolutePath: path.resolve(match[0])
    })
  }
  urls = urls.filter(function (url) {
    // filter out non-file paths
    try {
      return fs.existsSync(url.absolutePath)
      return true
    } catch (err) {
      return false
    }
  })

  urls.forEach(function (url) {
    // debug(url.match)
    // replace matches path with a transformed path.relative path
    // var relativePath = './' + path.relative(__dirname, url.absolutePath)
    var relativePath = './' + path.relative(process.cwd(), url.absolutePath)
    text = text.split(url.match).join( callback(relativePath) )
  })

  // debug(urls)

  return text
}

function init (text) {
  if (typeof text !== 'string' && typeof text.toString === 'function') {
    text = text.toString()
  }

  var _rawInputText = text
  if (text.indexOf('error') === -1 && text.indexOf('Error') === -1) {
    return _rawInputText
  }

  debug(' === wooster input === ')
  text.split('\n').forEach(function (line) {
    debug('  ' + line)
  })

  text = text.split('\n').filter(function (line) {
    var i = line.toLowerCase().trim().indexOf('npm')
    return !(i >= 0 && i <= 5)
  }).join('\n')

  debug(' === wooster debug info === ')

  text = stripAnsi(text)
  text = stripSnippets(text)

  debug(' === wooster input after strips === ')
  debug( text )
  debug(' ===')

  var _lines = text.split('\n')
  _resolved = []
  _positions = []
  _lastMode = 'normal'
  _likelyErrorDescription = ''

  var cwdDirs = fs.readdirSync( process.cwd() ).filter( function ( path ) {
      return fs.lstatSync(path).isDirectory()
    }
  )
  debug(' === cwd directories === ')
  debug(cwdDirs)
  debug(' === ')

  debug(' === urls === ')
  var match
  var urls = []
  var rePath = /[\S]*\.[a-zA-Z]+/g
  var seekBuffer = text

  while (match = rePath.exec(text)) {
    var weight = 0
    var indexOf = (text.length - seekBuffer.length) + seekBuffer.indexOf(match[0])
    var lineNumber = text.substring(0, indexOf).split('\n').length - 1
    var line = _lines[lineNumber]
    seekBuffer = text.substring(indexOf + match[0].length)

    if (line.toLowerCase().indexOf('node_modules') !== -1) weight--
    if (line.toLowerCase().indexOf('npm') !== -1) weight -= 0.5

    if (line.toLowerCase().indexOf('error') !== -1) weight += 1
    if (line.toLowerCase().indexOf('fail') !== -1) weight += 0.49
    if (line.indexOf('Error') !== -1) weight += 1.1

    // if prev line contains 'error' increase weight a little bit
    var prevLine = _lines[lineNumber - 1]
    if (typeof prevLine === 'string') {
      if (prevLine.toLowerCase().indexOf('error') !== -1) weight += 0.50
    }

    // if next line contains 'error' increase weight a tiny bit
    var nextLine = _lines[lineNumber + 1]
    if (typeof nextLine === 'string') {
      if (nextLine.toLowerCase().indexOf('error') !== -1) weight += 0.25
    }

    debug(' url found: ' + match[0] + ', weight: ' + weight)
    debug('  line: ' + line)

    urls.push({
      weight: weight,
      line: line,
      lineNumber: lineNumber,
      match: match[0]
    })

    // for convenience check up one dir level
    urls.push({
      weight: weight - 0.1,
      line: line,
      lineNumber: lineNumber,
      match: '../' + match[0]
    })

    // for convenience check up two dir levels
    urls.push({
      weight: weight - 0.15,
      line: line,
      lineNumber: lineNumber,
      match: '../../' + match[0]
    })

    // for convenience check down one dir level
    cwdDirs.forEach(function (dir) {
      urls.push({
        weight: weight - 0.20,
        line: line,
        lineNumber: lineNumber,
        match: dir + '/' + match[0]
      })
    })
  }

  debug('sorting urls by weight')
  urls = urls.sort(function (a, b) {
    return b.weight - a.weight
  })

  var bestUrl
  var _bestUrl
  for ( var i = 0; i < urls.length; i++ ) {
    var url = urls[i]
    var resolvedPath = path.resolve(url.match)
    var exists = fs.existsSync(resolvedPath)
    if (exists) {
      bestUrl = resolvedPath
      _bestUrl = url
      debug(' >> deciding line: ' + url.line)
      break
    }
  }
  debug('   > most likely source URL: ' + bestUrl)

  // if (!urls[0]) return console.log('no errors detected')
  if (!bestUrl) {
    debug('no url matches')
    return _rawInputText
  }

  debug('')

  // var rePosition = /[(]?\s{0,5}\d+\s{0,5}?[:]\s{0,5}?\d+\s{0,5}[)]?/g
  debug(' === positions === ')
  var matches = []
  var rePosition = /[(]?\s{0,5}\d+\s{0,5}?\D{1,20}\s{0,5}?\d+\s{0,5}[)]?/g
  // match = rePosition.exec(text)
  seekBuffer = text
  while (match = rePosition.exec(text)) {
    var weight = 0

    var indexOf = (text.length - seekBuffer.length) + seekBuffer.indexOf(match[0])
    var lineNumber = text.substring(0, indexOf).split('\n').length - 1
    var line = _lines[lineNumber]
    var words = line.split(/\s+/)
    // console.debug(words)
    // console.debug(match[0])
    var word = words.filter(function (w) {
      return w.indexOf(match[0]) !== -1
    })[0]
    seekBuffer = text.substring(indexOf + match[0].length)

    // console.debug(' position word boundary: ' + word + ', match: ' + match[0])
    // if matched word boundary contains '/' (path seperators) decrease weight
    // this avoids parsing path names as error positions (in case a path name happens to match)
    if (word && word.indexOf('/') !== -1) weight--

    // avoid parsing lines with node_modules in them (most likely stack traces..)
    if (line.toLowerCase().indexOf('node_modules') !== -1) weight--
    if (line.toLowerCase().indexOf('npm') !== -1) weight -= 0.5

    // if current line contains 'error' increase weight
    if (line.toLowerCase().indexOf('error') !== -1) weight++
    if (line.toLowerCase().indexOf('fail') !== -1) weight++
    if (line.indexOf('Error') !== -1) weight++

    // if prev line contains 'error' increase weight a little bit
    var prevLine = _lines[lineNumber - 1]
    if (typeof prevLine === 'string') {
      if (prevLine.toLowerCase().indexOf('error') !== -1) weight += 0.50
    }

    // if next line contains 'error' increase weight a tiny bit
    var nextLine = _lines[lineNumber + 1]
    if (typeof nextLine === 'string') {
      if (nextLine.toLowerCase().indexOf('error') !== -1) weight += 0.25
    }

    if (line.indexOf(bestUrl) !== -1) weight++

    debug(' position found: ' + match[0] + ', weight: ' + weight)
    debug('  line: ' + line)

    matches.push({
      line: line,
      weight: weight,
      lineNumber: lineNumber,
      match: match[0]
    })
  }

  // if (!matches.length > 0) return console.log('no errors detected')
  if (!matches.length > 0) {
    debug('no positional matches, trying special cases')

    // special case positional matching
    // (for vanilla browserify prints only url and line number,
    // and a context snippet with column indicated by a ^ marker)

    if (_bestUrl) {
      try {
        var line = _lines.slice( _bestUrl.lineNumber - 1).filter(function (l) {
          return l.indexOf('^') >= 0
        })[0]

        var lineNumber = _bestUrl.line.split(':')[1].replace(/\D/g, '')
        var column = line.indexOf('^')

        matches.push({
          line: line,
          weight: 999,
          lineNumber: lineNumber,
          match: '(' + lineNumber + ':' + column + ')'
        })

        debug('special case positioning found: ' + matches[0].match)
      } catch (err) {
        debug('no special case positioning found.')
      }
    }
  }

  if (!matches.length > 0) {
    debug('still no positional matches, even after checking special cases')
    return _rawInputText
  }

  var r = matches.sort(function (a, b) {
    return b.weight - a.weight
  })
  debug('')
  var bestMatch = r[0].match
  // if (!match || !match[0]) {
  //   var rePosition = /[(]?\s{0,5}\d+\s{0,5}?\D{1,10}\s{0,5}?\d+\s{0,5}[)]?/g
  //   match = rePosition.exec(text)
  // }

  _resolved.push({
    url: bestUrl,
    pos: parsePosition( bestMatch )
  })

  // text.split('\n').forEach(function (line) {
  //   var prettyLine = parseOutput(line)
  //   if (prettyLine && prettyLine.trim()) debug('  prettyLine: ' + prettyLine)
  // })

  _lines.forEach(function (line) {
    if (line.indexOf('Error') >= 0) _likelyErrorDescription = line
  })

  if (!_likelyErrorDescription) {
    _lines.forEach(function (line) {
      if (line.toLowerCase().indexOf('unexpected') >= 0) _likelyErrorDescription = line
      if (line.toLowerCase().indexOf('failed') >= 0) _likelyErrorDescription = line
    })
  }

  debug('   > most likely error description: ' + _likelyErrorDescription)

  try {
    return processInput()
  } catch (err) {
    debug('error processing input')
    return _rawInputText
  }

  // console.log(' ==== GIRAFFE END ==== ')
}

function parsePosition (pos) {
  // log('  line positioning string detected: ' + pos)
  var split = pos.split(/\D+/).filter(function (s) { return s })
  debug('  parsed positioning string: ' + split.toString())
  return {
    line: /\d+/.exec(split[0])[0],
    column: /\d+/.exec(split[1])[0]
  }
}

function processInput () {
  var output = []

  var log = function (str) {
    output.push(str)
  }

  _resolved.forEach(function (r) {
    var { url, pos } = r
    var buffer = fs.readFileSync(url, { encoding: 'utf8' })
    var lines = buffer.split('\n')
    var i = Math.max(0, pos.line - 5)
    var j = Math.min(lines.length - 1, i + 4 + 2)
    // log('pos.line: ' + pos.line)
    // log('i: ' + i)
    // log('j: ' + j)

    var minOffset = String(j).trim().length

    log()
    // log(clc.reset) // TODO
    // log(' >> wooster output << ' + getIerationBox())
    log(' >> wooster output << ')
    if (_likelyErrorDescription.length > 0) {
      // shorten urls in error description
      // (path/to/file -> p/t/file)
      var relativeUrl = transformToRelativePaths(url)
      var words = _likelyErrorDescription.split(/\s+/)
      words = words.map(function (word) {
        if (word.indexOf('.') >= 0 || word.indexOf('/') >= 0) {
          word = transformToRelativePaths(word)
          var split = word.split('/')
          var lastFileName = split.pop()
          var result = ''
          split.forEach(function (fileName) {
            if (fileName) {
              result += fileName[0] + '/'
            }
          })
          result += lastFileName
          return clc.magenta(result)
        } else {
          return word
        }
      })
      log(
        ' ' + clc.redBright(words.join(' '))
      )
    }
    log()
    log(
      ' @ ' +
      transformToRelativePaths(url, strToMagenta) +
      ' ' + clc.redBright(pos.line) +
      ':' + clc.redBright(pos.column)
    )
    // log('---')
    var result = []
    for (; i < j; i++) {
      var lineNumber = String(i + 1).trim()
      while (lineNumber.length < minOffset) lineNumber = (' ' + lineNumber)

      if (i === pos.line - 1) {
        lineNumber = clc.redBright('> ') + clc.whiteBright(lineNumber)
      } else {
        lineNumber = '  ' + lineNumber
      }

      lineNumber += ' | '

      result.push(lineNumber + lines[i])
      // log(lines[i])

      // draw an arrow pointing upward to column location
      if (i === pos.line - 1) {
        var pointerOffset = ''
        for (var x = 0; x < pos.column; x++) {
          pointerOffset += ' '
        }
        var _o = String(j).trim().split(/./).join(' ') + '   | '
        // log(pointerOffset + '^')
        result.push(_o + pointerOffset + '^')
      }
    }

    result.forEach(function (line) {
      var prettyLine = parsePrettyLine(line, url)
      log(prettyLine)
    })

    // log('---')
  })
  // log('_resolved: ' + _resolved.length)
  var textContent = output.join('\n')
  return textContent + '\n\n'
}

function testToken (str, tests, globalModifiers) {
  if (typeof tests === 'string') tests = [tests]

  var i, test, t, split, r, s, j

  loop: for (i = 0; i < tests.length; i++) {
    test = tests[i]
    s = str

    split = test.split('/')
    t = split[0]
    r = split[1] || ''
    if ( globalModifiers ) r += globalModifiers

    for (j = 0; j < r.length; j++) {
      var c = r[j]
      switch (c) {
        case 'i':
          t = t.toLowerCase()
          s = s.toLowerCase()
          break
        case 't':
          t = t.trim()
          s = s.trim()
          break
        case 's': // clamp to same size
          // same length/size
          if (s.length !== t.length) continue loop
          break;
      }
    }

    if (s.indexOf(t) >= 0) return true
  }

  return false
}

function prettifyCodeLine (line, initialMode) {
  var prettyLine = ''
  var words = line.split(' ')

  var buffer = ''
  var penColor = 'whiteBright'
  var mode = initialMode || 'normal'

  var i, c
  for (i = 0; i < line.length; i++) {
    c = line[i]

    switch (mode) {
      case 'normal':
        switch (c) {
          case "'":
          case '"':
            prettyLine += clc[penColor](buffer)
            buffer = '' // reset buffer
            // enter new mode
            mode = 'quotes'
            penColor = 'green'
            buffer += c
            break

          case '{':
          case '}':
            // TODO unsure to include braces?
          case '<':
          case '>':
            // TODO unsure to include braces?

          case '+':
          case '-':
          case '*':
          case '%':
          case '=':
          case ';':
          case ':':
          case '.':
          case ',':
          case '?':
          case '!':
            prettyLine += parseToken(buffer, penColor)
            prettyLine += clc['yellow'](c)
            buffer = ''
            break

          // special case comment blocks
          case '/':
            if ((i + 1) < line.length) {
              var nextC = line[i + 1]
              switch (nextC) {
                case '/':
                  prettyLine += parseToken(buffer, penColor)
                  prettyLine += clc['black'](line.slice(i))
                  i = line.length // end of line
                  buffer = ''
                  break

                case '*':
                  prettyLine += clc[penColor](buffer)
                  buffer = '' // reset buffer
                  // enter new mode
                  mode = 'commentstar'
                  penColor = 'black'
                  buffer += c
                  break

                default:
                  prettyLine += parseToken(buffer, penColor)
                  prettyLine += clc['yellow'](c)
                  buffer = ''
              }
            } else {
              prettyLine += parseToken(buffer, penColor)
              prettyLine += clc['yellow'](c)
              buffer = ''
            }
            break

          case '(':
          case ')':
            // TODO unsure to include parens?
            prettyLine += parseToken(buffer, penColor)
            prettyLine += clc['white'](c)
            buffer = ''
            break

          case ' ':
            buffer += c
            prettyLine += parseToken(buffer, penColor)
            buffer = '' // reset buffer
            break

          default:
            buffer += c
        }
        break

      case 'quotes':
        switch (c) {
          case "'":
          case '"':
            buffer += c
            prettyLine += clc[penColor](buffer)
            buffer = '' // reset buffer
            // enter new mode
            mode = 'normal'
            penColor = 'whiteBright'
            break

          default:
            buffer += c
        }
        break

      case 'commentstar':
        switch (c) {
          case '*':
            if ((i + 1) < line.length) {
              var nextC = line[i + 1]
              if (nextC === '/') {
                buffer += c
                buffer += nextC
                i += 1
                prettyLine += clc['black'](buffer)
                buffer = '' // reset buffer
                // enter new mode
                mode = 'normal'
                penColor = 'whiteBright'
                break
              }
            }

          default:
            buffer += c
        }
        break

      default:
        throw new Error('prettifyCodeLine error')
    }
  }

  prettyLine += parseToken(buffer, penColor)
  // prettyLine += clc[penColor](buffer)

  _lastMode = mode
  return prettyLine
}

function parseToken (token, penColor) {
  if (testToken(token, [
    'function',
    'atob',
    'btoa',
    'decodeURI',
    'decodeURIComponent',
    'encodeURI',
    'encodeURIComponent',
    'document'
  ], 'ts')) {
    return clc.cyan(token)
  }

  if (testToken(token, [
    'return',
    'var',
    'new',
    'do',
    'void',
    'else',
    'break',
    'catch',
    'instanceof',
    'with',
    'throw',
    'case',
    'default',
    'try',
    'this',
    'switch',
    'continue',
    'typeof',
    'delete',
    'let',
    'yield',
    'const',
    'export',
    'super',
    'debugger',
    'as',
    'async',
    'await',
    'static',
    'import',
    'from',
    'arguments',
    'window'
  ], 'ts')) {
    return clc.redBright(token)
  }

  if (testToken(token, [
    'true',
    'false',
    'null',
    'undefined'
  ], 'ts')) {
    return clc.magentaBright(token)
  }

  if (testToken(token, [
    'Date',
    'Object',
    'Function',
    'Number',
    'Math',
    'String',
    'RegExp',
    'Array',
    'Boolean'
  ], 'ts')) {
    return clc['yellow'](token)
  }

  return clc[penColor](token)
}

function prettifyStyleLine (line, initialMode) {
  var prettyLine = ''
  var words = line.split(' ')

  var buffer = ''
  var penColor = 'whiteBright'
  var mode = initialMode || 'normal'

  var i, c
  for (i = 0; i < line.length; i++) {
    c = line[i]

    switch (mode) {
      case 'normal':
        switch (c) {
          case "'":
          case '"':
            prettyLine += clc[penColor](buffer)
            buffer = '' // reset buffer
            // enter new mode
            mode = 'quotes'
            penColor = 'green'
            buffer += c
            break

          case '{':
          case '}':
            // TODO unsure to include braces?

          case '+':
          // case '-':
          case '*':
          case '%':
          case '=':
          case ';':
          case ':':
          // case '.':
          case ',':
          case '?':
          case '!':
            prettyLine += parseStyleToken(buffer, penColor)
            prettyLine += clc['yellow'](c)
            buffer = ''
            break

          // special case comment blocks
          case '/':
            if ((i + 1) < line.length) {
              var nextC = line[i + 1]
              switch (nextC) {
                case '/':
                  prettyLine += parseStyleToken(buffer, penColor)
                  prettyLine += clc['black'](line.slice(i))
                  i = line.length // end of line
                  buffer = ''
                  break

                case '*':
                  prettyLine += clc[penColor](buffer)
                  buffer = '' // reset buffer
                  // enter new mode
                  mode = 'commentstar'
                  penColor = 'black'
                  buffer += c
                  break

                default:
                  prettyLine += parseStyleToken(buffer, penColor)
                  prettyLine += clc['yellow'](c)
                  buffer = ''
              }
            } else {
              prettyLine += parseStyleToken(buffer, penColor)
              prettyLine += clc['yellow'](c)
              buffer = ''
            }
            break

          case '(':
          case ')':
            // TODO unsure to include parens?
            prettyLine += parseStyleToken(buffer, penColor)
            prettyLine += clc['white'](c)
            buffer = ''
            break

          case ' ':
            buffer += c
            prettyLine += parseStyleToken(buffer, penColor)
            buffer = '' // reset buffer
            break

          default:
            buffer += c
        }
        break

      case 'quotes':
        switch (c) {
          case "'":
          case '"':
            buffer += c
            prettyLine += clc[penColor](buffer)
            buffer = '' // reset buffer
            // enter new mode
            mode = 'normal'
            penColor = 'whiteBright'
            break

          default:
            buffer += c
        }
        break

      case 'commentstar':
        switch (c) {
          case '*':
            if ((i + 1) < line.length) {
              var nextC = line[i + 1]
              if (nextC === '/') {
                buffer += c
                buffer += nextC
                i += 1
                prettyLine += clc['black'](buffer)
                buffer = '' // reset buffer
                // enter new mode
                mode = 'normal'
                penColor = 'whiteBright'
                break
              }
            }

          default:
            buffer += c
        }
        break

      default:
        throw new Error('prettifyCodeLine error')
    }
  }

  prettyLine += parseStyleToken(buffer, penColor)
  // prettyLine += clc[penColor](buffer)

  _lastMode = mode
  return prettyLine
}

function parseStyleToken (token, penColor) {
  if (testToken(token, [
    'align-content',
    'align-items',
    'align-self',
    'all',
    'animation',
    'animation-delay',
    'animation-direction',
    'animation-duration',
    'animation-fill-mode',
    'animation-iteration-count',
    'animation-name',
    'animation-play-state',
    'animation-timing-function',
    'backface-visibility',
    'background',
    'background-attachment',
    'background-blend-mode',
    'background-clip',
    'background-color',
    'background-image',
    'background-origin',
    'background-position',
    'background-repeat',
    'background-size',
    'border',
    'border-bottom',
    'border-bottom-color',
    'border-bottom-left-radius',
    'border-bottom-right-radius',
    'border-bottom-style',
    'border-bottom-width',
    'border-collapse',
    'border-color',
    'border-image',
    'border-image-outset',
    'border-image-repeat',
    'border-image-slice',
    'border-image-source',
    'border-image-width',
    'border-left',
    'border-left-color',
    'border-left-style',
    'border-left-width',
    'border-radius',
    'border-right',
    'border-right-color',
    'border-right-style',
    'border-right-width',
    'border-spacing',
    'border-style',
    'border-top',
    'border-top-color',
    'border-top-left-radius',
    'border-top-right-radius',
    'border-top-style',
    'border-top-width',
    'border-width',
    'bottom',
    'box-shadow',
    'box-sizing',
    'caption-side',
    'clear',
    'clip',
    'color',
    'column-count',
    'column-fill',
    'column-gap',
    'column-rule',
    'column-rule-color',
    'column-rule-style',
    'column-rule-width',
    'column-span',
    'column-width',
    'columns',
    'content',
    'counter-increment',
    'counter-reset',
    'cursor',
    'direction',
    'display',
    'empty-cells',
    'filter',
    'flex',
    'flex-basis',
    'flex-direction',
    'flex-flow',
    'flex-grow',
    'flex-shrink',
    'flex-wrap',
    'float',
    'font',
    '@font-face',
    'font-family',
    'font-size',
    'font-size-adjust',
    'font-stretch',
    'font-style',
    'font-variant',
    'font-weight',
    'hanging-punctuation',
    'height',
    'justify-content',
    '@keyframes',
    'left',
    'letter-spacing',
    'line-height',
    'list-style',
    'list-style-image',
    'list-style-position',
    'list-style-type',
    'margin',
    'margin-bottom',
    'margin-left',
    'margin-right',
    'margin-top',
    'max-height',
    'max-width',
    '@media',
    'min-height',
    'min-width',
    'nav-down',
    'nav-index',
    'nav-left',
    'nav-right',
    'nav-up',
    'opacity',
    'order',
    'outline',
    'outline-color',
    'outline-offset',
    'outline-style',
    'outline-width',
    'overflow',
    'overflow-x',
    'overflow-y',
    'padding',
    'padding-bottom',
    'padding-left',
    'padding-right',
    'padding-top',
    'page-break-after',
    'page-break-before',
    'page-break-inside',
    'perspective',
    'perspective-origin',
    'position',
    'quotes',
    'resize',
    'right',
    'tab-size',
    'table-layout',
    'text-align',
    'text-align-last',
    'text-decoration',
    'text-decoration-color',
    'text-decoration-line',
    'text-decoration-style',
    'text-indent',
    'text-justify',
    'text-overflow',
    'text-shadow',
    'text-transform',
    'top',
    'transform',
    'transform-origin',
    'transform-style',
    'transition',
    'transition-delay',
    'transition-duration',
    'transition-property',
    'transition-timing-function',
    'unicode-bidi',
    'user-select',
    'vertical-align',
    'visibility',
    'white-space',
    'width',
    'word-break',
    'word-spacing',
    'word-wrap',
    'z-index'
  ])) {
    return clc.cyan(token)
  }

  if (testToken(token, [
    'html',
    'head',
    'meta',
    'link',
    'title',
    'base',
    'body',
    'style',

    'nav',
    'header',
    'footer',
    'main',
    'aside',
    'article',
    'section',

    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hgroup',

    'div', 'p', 'pre', 'blockquote',

    'hr',

    'ul', 'ol', 'li',

    'dl', 'dt', 'dd',

    'span', 'a',

    'em', 'strong', 'b', 'i', 'u', 's', 'mark', 'small',

    'del', 'ins',

    'sup', 'sub',

    'dfn', 'code', 'var', 'samp', 'kbd', 'q', 'cite',

    'ruby', 'rt', 'rp',

    'br', 'wbr',

    'bdo', 'bdi',

    'table', 'caption', 'tr', 'td', 'th', 'thead', 'tfoot', 'tbody', 'colgroup', 'col',

    'img', 'figure', 'figcaption', 'map', 'area',

    'video', 'audio', 'source', 'track',

    'script', 'noscript', 'object', 'param', 'embed', 'iframe', 'canvas',

    'abbr', 'address',

    'meter', 'progress', 'time',

    'form', 'button', 'input', 'textarea', 'select', 'option', 'optgroup', 'label',

    'fieldset', 'legend', 'keygen', 'command', 'datalist', 'menu', 'output', 'details', 'summary'
  ], 'ts')) {
    return clc.redBright(token)
  }

  if (testToken(token, [
    'sans-serif',
    'monospace',
    'Times',
    'serif',
    'Arial',
    'Helvetica',
    'Impact', 'Charcoal',
    'Tahoma', 'Geneva',
    'Trebuchet', 'Verdana',
    'table-caption',
    'table-column',
    'table-column-group',
    'line-through',
    'bidi-override',
    'inline-block',
    'inline',
    'open-quote',
    'close-quote',
    'normal',
    'smaller',
    'super',
    'sub',
    'separate',
    'table-row-group',
    'table-footer-group',
    'table-header-group',
    'table-cell',
    'table-row',
    'middle',
    'inherit',
    'block',
    'default',
    'inset',
    'disc',
    'decimal',
    'absolute',
    'none',
    'hidden',
    'bold',
    'italic',
    'underline',
    'auto',
    'center',
    'pre',
    '0'
  ], 's')) {
    return clc.magentaBright(token)
  }

  if (token.trim()[0] === '.') {
    return clc.greenBright(token)
  }

  if (token.trim()[0] === '#') {
    return clc.yellowBright(token)
  }

  // if (testToken(token, [
  //   'Date',
  //   'Object',
  //   'Function',
  //   'Number',
  //   'Math',
  //   'String',
  //   'RegExp',
  //   'Array',
  //   'Boolean'
  // ])) {
  //   return clc['yellow'](token)
  // }

  return clc[penColor](token)
}

function isCodeSnippetLine (line) {
  var header = line.trim().substring(0, 8)
  if (header.split(/[^\d|>]/).join('').trim().length < 1) return false
  var helmet = header.split(/[^\d|> ]/).join('').trim()
  var split = header.split(helmet)
  if (split[0].split(/[^\d|>]/).join('').length > 0) return false
  // if (split[1].split(/[^\d|> ]/).join('').length < 1) return false
  return true
}

function parseOutput (line) {
  var trimmedLine = line.trim()

  if (isCodeSnippetLine(line)) return undefined

  if (testToken(trimmedLine, [
    'error /i',
    'SyntaxError',
    'Unexpected'
  ])) {
    return clc.redBright( transformToRelativePaths(line, strToMagenta) )
  }

  return line // do nothing
}

function strToMagenta (str) {
  return clc.magenta(str)
}

function parsePrettyLine (line, url) {
  var suffix = /\..+$/.exec(url.trim())[0]

  var trimmedLine = line.trim()

  if (testToken(trimmedLine, '|')) {
    // probably code snippet
    var prettyLine = ''

    var split = line.split('|', 2)
    var left = clc.xterm(246)(split[0] + '|')
    left = left.replace('>', clc.redBright('>'))
    prettyLine += left

    var right
    if (testToken(suffix, [
      'less/i',
      'styl/i',
      'sass/i',
      'scss/i',
      'css/i'
    ])) {
      // assume css syntax
      right = prettifyStyleLine(split[1], _lastMode)
    } else {
      // assume JavaScript syntax
      right = prettifyCodeLine(split[1], _lastMode)
    }
    right = right.replace('^', clc.redBright('^'))
    prettyLine += right
    return prettyLine
  }

  if (testToken(trimmedLine, [
    'error /i',
    'SyntaxError',
    'Unexpected'
  ])) {
    return clc.redBright( transformToRelativePaths(line, strToMagenta) )
  }

  return line // do nothing
}

// log(__dirname)
// init(browserifyString)
// init(standardString)

function _api (text, callback) {
  var output = init(text)
  if (callback) {
    callback(output)
  } else {
    return output
  }
}

module.exports = _api
