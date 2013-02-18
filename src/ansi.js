// ansi color codes

(function () {

	var ansiRegExp = new RegExp( '\033\[[0-9]*[ABCDmDJus]', 'g' )

	exports.ansi = {
		'bg' : {
			  'black'   : '\033[40m'
			, 'blue'    : '\033[44m'
			, 'cyan'    : '\033[46m'
			, 'default' : '\033[49m'
			, 'green'   : '\033[42m'
			, 'magenta' : '\033[45m'
			, 'red'     : '\033[41m'
			, 'reset'   : '\033[0m'
			, 'white'   : '\033[47m'
			, 'yellow'  : '\033[43m'
		}
		, 'c' : {
			  'bk1'   : '\033[1D' // cursor back 1
			, 'bk2'   : '\033[2D' // cursor back 2
			, 'bk3'   : '\033[2D' // cursor back 3
			, 'bk4'   : '\033[2D' // cursor back 4
			, 'bk5'   : '\033[2D' // cursor back 5
			, 'clear' : '\033[2J' // clear display
			, 'dn1'   : '\033[1B' // cursor down 1
			, 'dn2'   : '\033[2B' // cursor down 2
			, 'dn3'   : '\033[2B' // cursor down 3
			, 'dn4'   : '\033[2B' // cursor down 4
			, 'dn5'   : '\033[2B' // cursor down 5
			, 'el'    : '\033[2K' // erase line
			, 'fw1'   : '\033[1C' // cursor forward 1
			, 'fw2'   : '\033[2C' // cursor forward 2
			, 'fw3'   : '\033[2C' // cursor forward 3
			, 'fw4'   : '\033[2C' // cursor forward 4
			, 'fw5'   : '\033[2C' // cursor forward 5
			, 'rest'  : '\033[u'  // restore cursor position (see save)
			, 'save'  : '\033[s'  // save cursor pos (see rest)
			, 'up1'   : '\033[1A' // cursor up 1
			, 'up2'   : '\033[2A' // cursor up 2
			, 'up3'   : '\033[2A' // cursor up 3
			, 'up4'   : '\033[2A' // cursor up 4
			, 'up5'   : '\033[2A' // cursor up 5
		}
		, 'fg' : {
			  'black'   : '\033[30m'
			, 'blue'    : '\033[34m'
			, 'cyan'    : '\033[36m'
			, 'default' : '\033[39m'
			, 'green'   : '\033[32m'
			, 'magenta' : '\033[35m'
			, 'red'     : '\033[31m'
			, 'reset'   : '\033[0m'
			, 'white'   : '\033[37m'
			, 'yellow'  : '\033[33m'
		}
		, 'reset' : '\033[0m'
		, 'strip' : function ( txt ) {
			return (''+txt).replace( ansiRegExp, '' );
		}
		, 't' : {
			  'blink' : '\033[5m'
			, 'bold'  : '\033[1m'
			, 'hide'  : '\033[8m'
			, 'rev'   : '\033[7m'
			, 'under' : '\033[4m'
		}
	}

})();