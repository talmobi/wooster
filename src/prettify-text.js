var colorify = require( './colorify.js' )

// https://github.com/chalk/ansi-regex
var ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PRZcf-nqry=><]/g

function stripAnsi (str) {
  return str.replace(ansiRegex, '')
}

function prettifyText ( text, filename ) {
  var parseToken = parseCodeToken

  var split = filename.split( '.' )
  var suffix = split[ split.length - 1 ]

  if ( testToken( suffix, [
    'less/i',
    'styl/i',
    'sass/i',
    'scss/i',
    'css/i'
  ] ) ) {
    // assume css syntax
    parseToken = parseStyleToken
  }

  text = stripAnsi( text )


  var penColor = 'whiteBright'
  var mode = 'normal'

  var prettyLines = []
  var lines = text.split( '\n' )

  lines.forEach( function ( line ) {
    var output = ''
    var tokenBuffer = ''

    var i, c
    // loop through all characters in the thext
    for ( i = 0; i < line.length; i++ ) {
      c = line[ i ]

      switch ( mode ) {
        case 'normal':
          switch (c) {
            case "'":
            case '"':
              // finish current token ( if any )
              output += parseToken( tokenBuffer, penColor )
              tokenBuffer = '' // reset token buffer

              // switch modes
              mode = 'quotes'
              penColor = 'green'
              tokenBuffer += c
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
              // finish current token
              output += parseToken( tokenBuffer, penColor )
              tokenBuffer = '' // reset token buffer

              // colorize character
              output += parseToken( c, 'yellow' )
              break

            case '/':
              if ( ( i + 1 ) < line.length ) {
                var nextCharacter = line[ i + 1 ]
                switch ( nextCharacter ) {
                  case '/':
                    // finish current token
                    output += parseToken( tokenBuffer, penColor )
                    tokenBuffer = '' // reset token buffer

                    // add comment
                    output += colorify( line.slice( i ), 'blackBright' )
                    i = line.length // end of line
                    break

                  case '*':
                    // finish current token
                    output += parseToken( tokenBuffer, penColor )
                    tokenBuffer = '' // reset token buffer

                    // enter new mode ( lasts until cancelled )
                    mode = 'commentstar'
                    penColor = 'blackBright'

                    tokenBuffer += c
                    break

                  default:
                    // finish current token
                    output += parseToken( tokenBuffer, penColor )
                    tokenBuffer = '' // reset token buffer
                    output += parseToken( c, 'yellow' )
                }
              } else {
                // finish current token
                output += parseToken( tokenBuffer, penColor )
                tokenBuffer = '' // reset token buffer

                output += parseToken( c, 'yellow' )
              }
              break

            case '(':
            case ')':
              // TODO unsure to include parens?
              // finish current token
              output += parseToken( tokenBuffer, penColor )
              tokenBuffer = '' // reset token buffer

              // colorize character
              output += parseToken( c, 'white' )
              break

            case ' ':
              tokenBuffer += c
              // finish current token
              output += parseToken( tokenBuffer, penColor )
              tokenBuffer = '' // reset token buffer
              break

            default:
              tokenBuffer += c
          }
          break

        case 'quotes':
          switch (c) {
            case "'":
            case '"':
              tokenBuffer += c
              // finish current token
              output += parseToken( tokenBuffer, penColor )
              tokenBuffer = '' // reset token buffer

              // enter new mode
              mode = 'normal'
              penColor = 'whiteBright'
              break

            default:
              tokenBuffer += c
          }
          break

        case 'commentstar':
          switch (c) {
            case '*':
              if ( (i + 1 ) < line.length ) {
                var nextCharacter = line[ i + 1 ]
                if ( nextCharacter === '/' ) {
                  tokenBuffer += c
                  tokenBuffer += nextCharacter
                  i += 1

                  // finish current token
                  output += parseToken( tokenBuffer, 'blackBright' )
                  tokenBuffer = '' // reset token buffer

                  // enter new mode
                  mode = 'normal'
                  penColor = 'whiteBright'
                  break
                }
              }

            default:
              tokenBuffer += c
          }
          break

        default:
          throw new Error('prettify-text.js error')
      }
    }

    // finish current token
    output += parseToken( tokenBuffer, penColor )
    tokenBuffer = '' // reset token buffer

    prettyLines.push( output )
  } )

  if ( prettyLines.length !== lines.length ) {
    throw new Error(
      'prettyfying resulted in different number of output lines'
    )
  }

  return prettyLines.join( '\n' )
}

function parseCodeToken ( token, penColor ) {
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
    return colorify( token, 'cyan' )
  }

  if (testToken(token, [
    'return',
    'var',
    'new',
    'do',
    'void',
    'if',
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
    return colorify( token, 'redBright' )
  }

  if (testToken(token, [
    'true',
    'false',
    'null',
    'undefined'
  ], 'ts')) {
    return colorify( token, 'magentaBright' )
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
    return colorify( token, 'yellow' )
  }

  return colorify( token, penColor )
}

function parseStyleToken ( token, penColor ) {
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
    return colorify( token, 'cyan' )
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
    return colorify( token, 'redBright' )
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
    return colorify( token, 'magentaBright' )
  }

  if (token.trim()[0] === '.') {
    return colorify( token, 'greenBright' )
  }

  if (token.trim()[0] === '#') {
    return colorify( token, 'yellowBright' )
  }

  return colorify( token, penColor )
}

function testToken ( str, tests, globalModifiers ) {
  if (typeof tests === 'string') tests = [ tests ]

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

module.exports = prettifyText
