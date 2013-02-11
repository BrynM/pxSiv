(function ( proc ) {

	/* *****************************************************************************
	* ******************************************************************************
	* CORE
	* ******************************************************************************
	***************************************************************************** */

	var pxSiv = {
		  'b'  : require( __dirname+'/bpmv.js' ).bpmv
		, 'fs' : fs = require( 'fs' )
		, 'p'  : proc
		, 'u'  : util = require( 'util' )
	};
	exports.pxSiv = pxSiv;

	var bpmv = pxSiv.b
		, pxsLive = false
		, pxsIsWin = (/^win/i).test( pxSiv.p.platform )
		, pxsDebug = false
		, pxsFailed = 0
		, pxsInitRun = false
		, pxsReady = []
		, pxsVerbose = false
		, pxsWaiting = [ 'core', 'opt', 'optset', 'db', 'http', 'filt' ]
		, pxsRoot = __dirname+'/../'
		, pxsDirSep = pxsIsWin ? '\\' : '/'
		, pxsDate = new Date()
		, pxsLogHandle
		, pxsReadyCbs = {}
		, fsPathCache = {}
		, pxsSlugWidth = 9
		, pxsStartSlug = '++Startup++';

	// -----------------------------------------------------------------------------
	// - Sundry functions
	// -----------------------------------------------------------------------------

	// get the value of a cli arg
	pxSiv.arg = function ( arg, isFlag ) {
		var len
			, ret
			, iter
			, cArg
			, rgx = /^\-+/
			, rRgx = /(^\-+|\=.*$)/
			, t
			, tArg = [];
		if ( bpmv.str(arg) ) {
			cArg = ''+arg
			len = pxSiv.p.argv.length;
			for ( iter = 0; iter < len; iter++ ) {
				tArg = (''+pxSiv.p.argv[iter]).split( '=' );
				if ( bpmv.arr(tArg) ) {
					if ( bpmv.str(tArg[0]) && rgx.test( tArg[0] ) ) {
						if ( (''+tArg[0]).replace( rRgx, '' ) === arg ) {
							ret = [ iter ];
							if ( !isFlag ) {
								if ( bpmv.str(tArg[1]) ) {
									ret.push( bpmv.trim( tArg[1], ' \t"\'' ) );
								} else {
									if ( bpmv.str(pxSiv.p.argv[iter+1]) && !rgx.test( pxSiv.p.argv[iter+1] ) ) {
										ret.push( bpmv.trim( pxSiv.p.argv[iter+1], ' \t"\'' ) );
									}
								}
							}
						}
					}
				}
			}
		} else if ( bpmv.arr(arg) ) {
			len = arg.length;
			for ( iter = 0; iter < len; iter++ ) {
				ret = pxSiv.arg( arg[iter] );
				if ( ret ) {
					break;
				}
			}
		}
		return ret;
	};

	pxSiv.con = function ( group, msg, data ) {
		var args;
		if ( bpmv.str(group) && bpmv.str(msg) ) {
			args = [
				  '['+bpmv.pad(group.toUpperCase(), pxsSlugWidth, ' ')+'] '+msg
			];
			if ( typeof(data) != 'undefined' ) {
				args.push( data );
			}
			return console.log.apply( console, args );
		}
	};

	pxSiv.debug = function ( group, msg, data ) {
		if ( pxsDebug && bpmv.str(group) && bpmv.str(msg) ) {
			return pxSiv.con( group+'*', msg, data );
		}
	};

	pxSiv.err = function ( group, msg, data ) {
		var args;
		if ( bpmv.str(group) && bpmv.str(msg) ) {
			args = [
				  '['+bpmv.pad(group.toUpperCase(), pxsSlugWidth, ' ')+'] '+msg
			];
			if ( typeof(data) != 'undefined' ) {
				args.push( data );
			}
			pxSiv.log( 'ERROR', '['+group+'] '+msg, data )
			return console.error.apply( console, args );
		}
	};

	pxSiv.die = function ( msg ) {
		console.trace( 'pxSiv' );
		if ( ( typeof(msg) === 'string' ) && ( msg.length > 0 ) ) {
			pxSiv.err( 'fatal', msg );
		} else {
			pxSiv.err( 'fatal', 'An unknown error occurred in pxSiv!!!' );
		}
		process.exit( 255 );
	};

	pxSiv.fix_path = function ( path, real ) {
		var cPath
			, fPath;
		if ( bpmv.str(path) ) {
			fPath = (''+path).replace( /[\\\/]/g, pxsDirSep );
			if ( real ) {
				try {
					return pxSiv.fs.realpathSync( fPath, fsPathCache );
				} catch ( e ) {
					// noop - return undef
				}
			} else {
				return fPath;
			}
		}
	};

	pxSiv.is_win = function () {
		return true && pxsIsWin;
	};

	pxSiv.log = function ( group, msg, data, quiet ) {
		var args
			, log = pxSiv.opt( 'log' )
			, out
			, logData = data;
			if ( typeof(data) != 'undefined' && ( data != null ) ) {
				logData = bpmv.txt2html( pxSiv.u.inspect( data ).replace( /\s+/g, ' ' ) );
			}
		if ( bpmv.str(log) && bpmv.str(group) && bpmv.str(msg) ) {
			if ( !bpmv.obj(pxsLogHandle) ) {
				try {
					pxsLogHandle = pxSiv.fs.createWriteStream( log, {
						  'flags'    : 'a'
  					, 'encoding' : 'utf-8'
					} );
				} catch ( e ) {
					pxSiv.opt( 'log', '' );
					pxSiv.die( 'Could not open log file "'+log+'". '+e );
				}
			}
			if ( bpmv.obj(pxsLogHandle) ) {
				out = '"'+pxSiv.time( true )+'", ';
				out += '"'+group.toUpperCase()+'", ';
				out += '"'+msg.replace( /[\n\r\t]/g, ' ' )+'"';
				if ( bpmv.str(logData) ) {
					out += ', "'+logData+'"';
				}
				out += '\n';
				try {
					pxsLogHandle.write( out );
				} catch ( e ) {
					pxSiv.opt( 'log', '' );
					pxSiv.die( 'Could not write to log file "'+log+'". '+e );
				}
			}
		}
		if ( pxsVerbose && !quiet ) {
			pxSiv.verbose( group+'#', msg, logData );
		}
	};

	pxSiv.out = function ( txt ) {
		pxSiv.p.stdout.write( txt );
	}

	pxSiv.root = function () {
		return ''+pxsRoot;
	};

	pxSiv.set_debug = function ( flag ) {
		var old;
		if ( typeof(flag) != 'undefined' ) {
			old = true && pxsDebug;
			pxsDebug = bpmv.trueish( flag );
			if ( old != pxsDebug ) {
				pxSiv.verbose( 'start', 'Debug mode '+(pxsDebug ? 'enabled' : 'disabled')+'.' );
			}
		}
		return true && pxsDebug;
	};

	pxSiv.set_verbose = function ( flag ) {
		var old;
		if ( typeof(flag) != 'undefined' ) {
			old = true && pxsVerbose;
			pxsVerbose = bpmv.trueish( flag );
			if ( old != pxsVerbose ) {
				pxSiv.verbose( 'start', 'Verbose mode '+(pxsVerbose ? 'enabled' : 'disabled')+'.' );
			}
		}
		return true && pxsVerbose;
	};

	pxSiv.time = function ( str ) {
		var d = new Date()
		return str ? d.toUTCString() : d.getTime();
	};

	pxSiv.verbose = function ( group, msg, data ) {
		if ( pxsVerbose && bpmv.str(group) && bpmv.str(msg) ) {
			return pxSiv.con( group+'+', msg, data );
		}
	};

	// -----------------------------------------------------------------------------
	// - Handle verbose/debug flag
	// -----------------------------------------------------------------------------

	// early verbose flag
	if ( bpmv.num(pxSiv.arg( [ 'v', 'verbose' ], true ), true) ) {
		pxSiv.set_verbose( true );
	}

	// early debug flag
	if ( bpmv.num(pxSiv.arg( [ 'd', 'debug' ], true ), true) ) {
		pxSiv.set_debug( true );
	}

	// fix root path early
	pxsRoot = pxSiv.fix_path( pxsRoot, true );

	// -----------------------------------------------------------------------------
	// - internal funcs
	// -----------------------------------------------------------------------------

	function pxSiv_init () {
		pxsLive = true;
		pxSiv.log( 'start', pxsStartSlug+' pxSiv init complete.' );
	}

	function pxs_shutdown () {
		if ( pxsLive ) {
			pxSiv.log( 'core', 'Performing shutdown tasks. Uptime: '+pxSiv.uptime()+' milliseconds' );
			pxSiv.db.close();
			pxSiv.http.close();
			pxsLive = false;
		}
		return !pxsLive;
	}

	// -----------------------------------------------------------------------------
	// - core functions
	// -----------------------------------------------------------------------------

	pxSiv.init = function () {
		var failLimit = 20
			, wait = 500;
		if ( !pxsInitRun ) {
			if ( pxsWaiting.length === pxsReady.length ) {
				pxsInitRun = true;
				pxSiv_init();
			} else {
				pxsFailed++;
				pxSiv.debug( 'start', 'pxSiv init waiting '+wait+'. Failed: '+pxsFailed );
				if ( pxsFailed >= failLimit ) {
					throw 'Init fail limit reached ('+pxsFailed+'). Could not start pxSiv!!! Ready: '+pxSiv.u.inspect( pxsReady );
				}
				setTimeout( pxSiv.init, wait );
			}
		}
		return pxSiv;
	};

	pxSiv.ready = function ( waiting, cb ) {
		var readyCopy
			, waitingCopy
			, runCb;
		if ( bpmv.str(waiting) ) {
			readyCopy = Array.apply( null, pxsReady );
			waitingCopy = Array.apply( null, pxsWaiting );
			if ( bpmv.func(cb) ) { // setting a callback
				if ( bpmv.num(bpmv.find( waiting, pxsReady ), true) ) {
					cb( readyCopy, waitingCopy, pxSiv );
				} else {
					if ( !bpmv.arr(pxsReadyCbs[waiting]) ) {
						pxsReadyCbs[waiting] = [];
					}
					if ( !bpmv.num(bpmv.find( cb, pxsReadyCbs[waiting] ), true) ) {
						pxsReadyCbs[waiting].push( cb );
					}
				}
			} else { // declaring something ready
				if ( bpmv.num(bpmv.find( waiting, pxsWaiting ), true) ) {
					if ( bpmv.num(bpmv.find( waiting, pxsReady ), true) ) {
						throw '"'+waiting+'" has already been declared as ready!!!';
					}
					pxsReady.push( waiting );
					pxSiv.verbose( waiting, pxsStartSlug+' Section "'+waiting+'" is ready.' );
					if ( bpmv.arr(pxsReadyCbs[waiting]) ) {
						while ( runCb = pxsReadyCbs[waiting].shift() ) {
							runCb( readyCopy, waitingCopy, pxSiv );
						}
					}
					return pxSiv;
				} else {
					return readyCopy;
				}
			}
		}
	};

	pxSiv.uptime = function () {
		return pxSiv.time() - pxsDate.getTime();
	};

	// -----------------------------------------------------------------------------
	// - simple setup
	// -----------------------------------------------------------------------------

	pxSiv.p.on( 'exit', pxs_shutdown );
	pxSiv.p.on( 'SIGINT', pxs_shutdown );
	pxSiv.p.on( 'SIGTERM', pxs_shutdown );
/*
	pxSiv.p.on( 'uncaughtException', function () {
		pxSiv.err( 'core', 'Unhandled exception!!! '+pxSiv.u.inspect( arguments ) );
		console.trace();
		pxSiv.p.exit( 255 );
	} );
*/

return pxSiv.ready( 'core' ); })(process) && (function ( pxSiv ) {

	/* *****************************************************************************
	* ******************************************************************************
	* OPTIONS
	* ******************************************************************************
	***************************************************************************** */

	var bpmv = pxSiv.b
		, pxsCfg = {} // currently running options
		, pxsOpts ={} // the main options and their functionality
		, pxsInitRunOpts = false
		, pxsDescription = [];

	pxsDescription.push( 'pxSiv is an HTTP server that logs tracking pixel requests directly to a database backend.' );
	pxsDescription.push( 'The server answers all requests with an image file read from memory.' );
	pxsDescription.push( 'It will never serve a 404 to avoid problems with broken requests in various clients (with two static file exceptions - "test.html" and "pxsLob.js").' );
	pxsDescription.push( 'All form requests will be filtered and, if applicable, saved to the DB backend.' );

	// -----------------------------------------------------------------------------
	// - internal funcs
	// -----------------------------------------------------------------------------

	function pxs_help () {
		var co
			, kz = bpmv.keys( pxsOpts )
			, iter
			, len
			, args = []
			, opts = ''
			, app = (''+__filename).replace( /^.*[\/\\]/, '' )
			, cWide = pxSiv.p.stdout.columns
			, funkChar = '#'
			, help;
		kz.sort();
		len = kz.length;
		for ( iter = 0; iter < len; iter++ ) {
			co = pxsOpts[kz[iter]];
			args[iter] = '[';
			args[iter] += co.cli.length > 1 ? '(' : '';
			for ( var i = 0; i < co.cli.length; i++ ) {
				if ( bpmv.str(co.cli[i]) ) {
					if ( i > 0 ) {
						args[iter] += '|'
					}
					if ( co.cli[i].length > 1 ) {
						args[iter] += '--'+co.cli[i]
					} else {
						args[iter] += '-'+co.cli[i]
					}
				}
			}
			args[iter] += co.cli.length > 1 ? ')' : '';
			if ( co.flag ) {
				args[iter] += ']';
			} else {
				args[iter] += '=value]';
			}
		}
		pxSiv.out( '\n' );
		pxSiv.out( bpmv.pad( funkChar, cWide / 2, funkChar )+'\n' );
		pxSiv.out( bpmv.wrapped( ' pxSiv - A pixel logger from hell...\n', cWide - 2, '\n', funkChar+' ')+'\n' );
		pxSiv.out( bpmv.pad( funkChar, cWide / 2, funkChar )+'\n' );
		pxSiv.out( bpmv.wrapped( pxsDescription.join( ' ' ), cWide - 1, '\n' )+'\n' );
		pxSiv.out( '\n' );
		pxSiv.out( 'Usage:\n' );
		pxSiv.out( bpmv.wrapped( 'node '+app+' '+args.join( ' ' )+'', cWide - 4, '\n', '    ')+'\n' );
		pxSiv.out( 'Options:\n' );
		for ( iter = 0; iter < len; iter++ ) {
			co = pxsOpts[kz[iter]];
			pxSiv.out( '    '+args[iter]+'\n' );
			help = co.help;
			if ( co.todo || !co.flag) {
				help += ' (';
				help += co.todo ? '*TBD*' : ''
				help += ( co.todo && !co.flag) ? ' ' : ''
				help += !co.flag ? 'Default: "'+co.def.toString()+'"' : '';
				help += ')';
			}
			pxSiv.out( bpmv.wrapped( help, cWide - 8, '\n', '        ')+'\n' );
		}
		pxSiv.p.exit( 0 );
	}

	function pxs_ini_read ( path ) {
		var stat
			, conts;
		if ( bpmv.str(path) ) {
			if ( pxSiv.fs.existsSync( path ) ) {
				try {
					conts = fs.readFileSync( path, 'utf-8' );
				} catch ( e ) {
					pxSiv.die( 'Error reading ini file "'+path+'"!');
				}
				return bpmv.ini( conts );
			}
			pxSiv.die( 'Could not load configuration file "'+path+'"!' );
			return;
		}
	}

	function pxs_init_opt () {
		var iniPath = pxsOpts['ini'].def
			, cliOpt;
		if ( pxsInitRunOpts ) {
			return;
		}
		pxsInitRunOpts = true;
		// catch help flag early
		if ( pxSiv.arg( pxsOpts['help'].cli ) ) {
			pxs_help();
		}
		// catch ini config flag early
		cliOpt = pxSiv.arg( pxsOpts['ini'].cli );
		if ( bpmv.arr(cliOpt) && bpmv.str(cliOpt[1]) ) {
			iniPath = cliOpt[1];
		}
		pxSiv.verbose( 'start', 'Initializing options.' );
		iniPath = pxSiv.fix_path( iniPath, true );
		if ( bpmv.str(iniPath) ) {
			pxs_opts_from_ini( iniPath );
		} else {
			pxSiv.verbose( 'opt', 'Skipped loading an initial config from missing "'+pxsOpts['ini'].def+'".' )
		}
		pxs_opts_from_cli();
		pxSiv.ready( 'opt' );
	};

	function pxs_option ( opt, val ) {
		if ( bpmv.str(opt) ) {
			if ( pxsOpts.hasOwnProperty( opt ) ) {
				if ( typeof(val) != 'undefined' ) {
					pxsCfg[opt] = val;
				}
				return pxsCfg[opt];
			}
		}
	}

	function pxs_opts_from_ini ( iniPath ) {
		var iniConts = pxs_ini_read( iniPath )
			, co
			, ao
			, kz = bpmv.keys( pxsOpts )
			, iter
			, len
			, coords
			, flag;
		if ( !bpmv.str(iniPath) ) {
			return;
		}
		pxSiv.verbose( 'opt', 'Loading config from "'+iniPath+'".' );
		if ( !bpmv.obj(iniConts) ) {
			pxSiv.err( 'Could not load empty, missing, or invalid configuration file "'+iniPath+'"!' );
		}
		len = kz.length;
		if ( !bpmv.num(pxSiv.arg( [ 'v', 'verbose' ], true ), true) ) {
			pxSiv.set_verbose( bpmv.grab( 'core.verbose', iniConts ) );
		}
		if ( !bpmv.num(pxSiv.arg( [ 'd', 'debug' ], true ), true) ) {
			pxSiv.set_debug( bpmv.grab( 'core.debug', iniConts ) );
		}
		for ( iter = 0; iter < len; iter++ ) {
			co = pxsOpts[kz[iter]];
			if ( bpmv.obj(co) && bpmv.str(co.ini) && ( co.ini.indexOf( '.' ) > -1 ) ) {
				coords = co.ini.split( '.' );
				if ( bpmv.arr(coords) ) {
					if ( iniConts.hasOwnProperty( coords[0] ) && bpmv.obj(iniConts[coords[0]]) && iniConts[coords[0]].hasOwnProperty( coords[1] ) ) {
						if ( bpmv.func(co.valid) ) {
							ao = co.valid( iniConts[coords[0]][coords[1]] );
						} else {
							ao = iniConts[coords[0]][coords[1]];
						}
						if ( typeof(ao) != 'undefined' ) {
							pxSiv.debug( 'opt', 'Read config option "'+co.ini+'" from ini file "'+iniPath+'" as "'+ao+'".' );
							pxsCfg[kz[iter]] = ao;
						}
					}
				}
			}
		}
		return pxsCfg;
	}

	function pxs_opts_from_cli () {
		var arg
			, co
			, ao
			, kz = bpmv.keys( pxsOpts )
			, iter
			, len
			, coords
			, val;
		len = kz.length;
		pxSiv.verbose( 'opt', 'Loading config from command line.' );
		for ( iter = 0; iter < len; iter++ ) {
			co = pxsOpts[kz[iter]];
			if ( bpmv.obj(co) && bpmv.arr(co.cli) ) {
				arg = pxSiv.arg( co.cli, co.flag );
				if ( bpmv.arr(arg) ) {
					if ( co.flag ) {
						val = co.valid( true, true );
					} else {
						val = co.valid( arg[1], true );
					}
					if ( typeof(val) != 'undefined' ) {
						pxSiv.debug( 'opt', 'Read config option "'+co.cli+'" from command line as "'+val+'".' );
						pxsCfg[kz[iter]] = val;
					} else {
						pxSiv.err( 'opt', 'Invalid command line for "'+pxSiv.p.argv[arg[0]]+'"' );
					}
				}
			}
		}
		return pxsCfg;
	}

	// -----------------------------------------------------------------------------
	// - external funcs
	// -----------------------------------------------------------------------------

	pxSiv.opt = function ( opt, val ) {
		return pxs_option( opt, val );
	};

	pxSiv.opt.obj = function ( opt ) {
		return pxsOpts[opt];
	};

	pxSiv.opt.create = function ( opts ) {
		var ret;
		if ( bpmv.obj(opts, true) && bpmv.str(opts.opt) ) {
			ret = {};
			ret.def = opts.def;
			ret.flag = bpmv.trueish( opts.flag );
			ret.todo = bpmv.trueish( opts.todo );
			if ( bpmv.arr(opts.cli) ) {
				ret.cli = Array.apply( null, opts.cli );
			}
			if ( bpmv.func(opts.valid) ) {
				ret.valid = opts.valid;
			}
			if ( bpmv.str(opts.ini) && ( opts.ini.indexOf( '.' ) > -1 ) ) {
				ret.ini = opts.ini;
			}
			if ( bpmv.str(opts.help) ) {
				ret.help = opts.help;
			}
			pxsOpts[opts.opt] = ret;
			if ( typeof(opts.def) != 'undefined' ) {
				pxsCfg[opts.opt] = ret.def;
			}
		}
		return ret;
	}

	pxSiv.opt.ini_compose = function ( path ) {
		var co
			, kz = bpmv.keys( pxsOpts )
			, iter
			, len = kz.length
			, iloc
			, groups = []
			, vals = {}
			, names = {}
			, ret = '';
		ret += ';;\n;; pxSiv Configuration File\n;;\n';
		ret += bpmv.wrapped( pxsDescription.join( ' ' ), 80, '\n', ';; ' )+'\n;;\n\n';
		for ( iter = 0; iter < len; iter++ ) {
			co = pxsOpts[kz[iter]];
			if ( bpmv.str(co.ini) ) {
				iLoc = co.ini.split( '.' );
				if ( bpmv.arr(iLoc, 2) ) {
					if ( !bpmv.num(bpmv.find( iLoc[0], groups ), true) ) {
						groups.push( iLoc[0] );
					}
					if ( !bpmv.obj(vals[iLoc[0]]) ) {
						vals[iLoc[0]] = {};
					}
					vals[iLoc[0]][kz[iter]] = iLoc[1];
				}
			}
		}
		if ( bpmv.arr(groups) ) {
			groups.sort();
			len = groups.length;
			for ( iter = 0; iter < len; iter++ ) {
				ret += '['+groups[iter]+']\n\n';
				if ( bpmv.obj(vals[groups[iter]], true) ) {
					for ( val in vals[groups[iter]] ) {
						if ( vals[groups[iter]].hasOwnProperty( val ) && bpmv.str(vals[groups[iter]][val]) ) {
							co = pxsOpts[val];
							ret += bpmv.str(co.help) ? bpmv.wrapped( co.help, 80, '\n', '; ' )+'\n' : '';
							ret += !co.flag ? '; Default: "'+co.def.toString()+'"\n' : '';
							ret += vals[groups[iter]][val]+' = '+pxsCfg[val].toString()+'\n';
						}
					}
				}
				ret += '\n';
			}
		}
		return ret;
	}

	pxSiv.opt.ini_save = function ( path ) {
		var iniConts = pxSiv.opt.ini_compose()
			, dest
			, f;
		if ( !bpmv.str(iniConts) ) {
			pxSiv.err( 'ini', 'Could create ini contents for file "'+dest+'"!' );
			pxSiv.p.exit( 255 );
		}
		if ( bpmv.str(path) ) {
			dest = pxSiv.fix_path( path );
		} else {
			dest = pxSiv.fix_path( pxSiv.p.cwd()+'/pxSiv_defaults.ini' );
		}
		if ( fs.existsSync(dest) ) {
			try {
				fs.unlinkSync( dest );
			} catch ( e ) {
				pxSiv.err( 'ini', 'Could not remove old "'+dest+'"! '+e );
				pxSiv.p.exit( 255 );
			}
		}
		try {
			f = pxSiv.fs.openSync( dest, 'wx+' );
		} catch ( e ) {
			pxSiv.err( 'ini', 'Could not open "'+dest+'" for writing! '+e );
			pxSiv.p.exit( 255 );
		}
		try {
			fs.writeSync( f, iniConts );
		} catch ( e ) {
			pxSiv.err( 'ini', 'Could not write to "'+dest+'"! '+e );
			pxSiv.p.exit( 255 );
		}
		fs.closeSync( f );
		pxSiv.out( 'Wrote "'+dest+'".' );
		pxSiv.p.exit();
	}

	// -----------------------------------------------------------------------------
	// - simple setup
	// -----------------------------------------------------------------------------

	pxSiv.ready( 'optset', pxs_init_opt );

return pxSiv.opt; })(exports.pxSiv) && (function ( pxSiv ) {

	/* *****************************************************************************
	* ******************************************************************************
	* DATABASE
	* ******************************************************************************
	***************************************************************************** */

	// mg = require( 'mongodb' )

	var bpmv = pxSiv.b
		, pxsInitRunDb = false
		, pxsDbFailed = 0
		, pxsDbType;

	pxSiv.db = {};

	// -----------------------------------------------------------------------------
	// - internal funcs
	// -----------------------------------------------------------------------------

	function pxs_init_db () {
		if ( !pxsInitRunDb ) {
			pxsInitRunDb = true;
			pxsDbType = pxSiv.opt( 'dbType' );
			if ( bpmv.str(pxsDbType) && bpmv.obj(pxSiv.db[pxsDbType]) && bpmv.func(pxSiv.db[pxsDbType].init) ) {
				pxSiv.verbose( 'start', 'Initializing DB.' );
				pxSiv.verbose( 'start', 'Found DB interface "'+pxsDbType+'". Starting it.' );
				pxs_db_share_settings();
				pxSiv.db[pxsDbType].init();
			}
		}
		return pxSiv;
	};

	function pxs_db_share_settings () {
		var host = pxSiv.opt( 'dbReadHost' );
		if ( !bpmv.str(host) ) {
			// fallback to DB write settings
			host = pxSiv.opt( 'dbWriteHost' );
			pxSiv.opt( 'dbReadHost', host );
			pxSiv.opt( 'dbReadPort', pxSiv.opt( 'dbWritePort' ) );
			pxSiv.opt( 'dbReadUser', pxSiv.opt( 'dbWriteUser' ) );
			pxSiv.opt( 'dbReadPass', pxSiv.opt( 'dbWritePass' ) );
			pxSiv.opt( 'dbReadKey', pxSiv.opt( 'dbWriteKey' ) );
		}
		return bpmv.str(host);
	}

	// -----------------------------------------------------------------------------
	// - external funcs
	// -----------------------------------------------------------------------------

	pxSiv.db.close = function () {
		if ( bpmv.str(pxsDbType) && bpmv.func(pxSiv.db[pxsDbType].close) ) {
			pxSiv.verbose( 'db', 'Closing DB interface "'+pxsDbType+'".' );
			return pxSiv.db[pxsDbType].close();
		}
	}

	pxSiv.db.r = function ( data, cb ) {
		return pxSiv.db[pxsDbType].r.apply( pxSiv.db[pxsDbType], arguments );
	};

	pxSiv.db.table_name = function () {
		var d = new Date()
			, pre = bpmv.trim( pxSiv.opt( 'dbTablePrefix' ) )
			, ret = d.getFullYear();
		if ( bpmv.str(pre) ) {
			ret = pre+ret;
		}
		if ( pxSiv.opt( 'dbPerMonth' ) ) {
			ret += '_'+bpmv.pad( d.getMonth(), 2 );
		}
		return ret;
	};

	pxSiv.db.w = function ( data, cb ) {
		return pxSiv.db[pxsDbType].w.apply( pxSiv.db[pxsDbType], arguments );
	};

	// -----------------------------------------------------------------------------
	// - simple setup
	// -----------------------------------------------------------------------------

	pxSiv.ready( 'opt', pxs_init_db );

return pxSiv.db; })(exports.pxSiv) && (function ( pxSiv ) {

	/* *****************************************************************************
	* ******************************************************************************
	* MONGO DB INTERFACE
	* http://mongodb.github.com/node-mongodb-native/
	* ******************************************************************************
	***************************************************************************** */

	var bpmv = pxSiv.b
		, mongo = require( 'mongodb' )
		, pxsDb
		, pxsDbMongoReady = false
		, pxsDbR
		, pxsDbReadyR = false
		, pxsDbW
		, pxsDbReadyW = false
		, pxsDbOpts = {
			  'w'        : 0
			, 'j'        : false
			, 'fsync'    : false
			, 'wtimeout' : 0
		}
		, pxsSrvOpts = {
			  'auto_reconnect' : true
			, 'poolSize'       : 4
		};

	pxSiv.db.mongo = {};

	// -----------------------------------------------------------------------------
	// - internal funcs
	// -----------------------------------------------------------------------------

	function pxs_db_open_mongo ( rw, cb ) {
		var con
			, usr
			, pass
			, key
			, srv
			, host
			, port
			, db;
		// http://mongodb.github.com/node-mongodb-native/api-generated/db.html
		if ( ( rw === 'r' ) || ( rw === 'w' ) ) {
			db = pxSiv.opt( 'dbDatabase' );
			if ( rw === 'r' ) {
				host = pxSiv.opt( 'dbReadHost' );
				port = pxSiv.opt( 'dbReadPort' );
				usr = pxSiv.opt( 'dbReadUser' );
				pass = pxSiv.opt( 'dbReadPass' );
				key = pxSiv.opt( 'dbReadKey' );
			} else if ( rw === 'w' ) {
				host = pxSiv.opt( 'dbWriteHost' );
				port = pxSiv.opt( 'dbWritePort' );
				usr = pxSiv.opt( 'dbWriteUser' );
				pass = pxSiv.opt( 'dbWritePass' );
				key = pxSiv.opt( 'dbWriteKey' );
			}
			if ( bpmv.str(db) && bpmv.str(host) && bpmv.num(port) ) {
				pxSiv.verbose( 'mongo', 'Connecting to "mongodb://'+host+':'+port+'/'+db+'".' );
				srv = new mongo.Server( host, port );
				// http://mongodb.github.com/node-mongodb-native/api-generated/db.html#authenticate
				if ( rw === 'r' ) {
					pxsDbR = new mongo.Db( db, srv, pxsDbOpts );
					pxsDbR.open( pxs_db_mongo_handle_open_w );
				} else if ( rw === 'w' ) {
					pxsDbW = new mongo.Db( db, srv, pxsDbOpts );
					pxsDbW.open( pxs_db_mongo_handle_open_r );
				}
			}
			return mongo;
		}
	}

	function pxs_db_mongo_ready () {
		if ( bpmv.obj(pxsDbR) && pxsDbReadyR && bpmv.obj(pxsDbW) && pxsDbReadyW ) {
			if ( !pxsDbMongoReady ) {
				pxsDbMongoReady = true;
				pxSiv.ready( 'db' );
			}
			return true;
		}
	}

	function pxs_db_mongo_handle_open_r ( err ) {
		if ( ( typeof(err) != 'undefined' ) && ( err != null ) ) {
			pxSiv.err( 'mongo', 'Failed mongo DB open.', err );
			pxSiv.die( 'Database open failed.' );
		} else {
			pxsDbReadyR = true;
		}
		pxs_db_mongo_ready();
	}

	function pxs_db_mongo_handle_open_w ( err ) {
		var tName;
		if ( ( typeof(err) != 'undefined' ) && ( err != null ) ) {
			pxSiv.err( 'mongo', 'Failed mongo DB open.', err );
			pxSiv.die( 'Database open failed.' );
		} else {
			pxsDbReadyW = true;
		}
		pxs_db_mongo_ready();
	}

	// -----------------------------------------------------------------------------
	// - external funcs
	// -----------------------------------------------------------------------------

	pxSiv.db.mongo.close = function () {
		if ( bpmv.obj(pxsDbR) ) {
			pxsDbR.close();
		}
		if ( bpmv.obj(pxsDbW) ) {
			pxsDbW.close();
		}
	};

	pxSiv.db.mongo.init = function () {
		pxs_db_open_mongo( 'r' );
		pxs_db_open_mongo( 'w' );
	};

	pxSiv.db.mongo.r = function ( data, cb ) {
		pxSiv.err( 'mongo', 'DB reads not yet implemented (not sure if they\'re needed)!' )
	};

	pxSiv.db.mongo.w = function ( data, cb ) {
		var coll;
		if ( bpmv.obj(data, true) && pxs_db_mongo_ready() ) {
			tName = pxSiv.db.table_name();
			coll = pxsDbW.collection( tName );
			coll.insert( data, cb );
			pxSiv.log( 'mongo', 'Wrote record with '+bpmv.count(data)+' keys to "'+tName+'".' )
		} else {
			// how to handle not ready? queue?
		}
	};

return pxSiv.db.mongo; })(exports.pxSiv) && (function ( pxSiv ) {

	/* *****************************************************************************
	* ******************************************************************************
	* FILTERS
	* ******************************************************************************
	***************************************************************************** */

	var bpmv = pxSiv.b
		psxActiveFilters = {};

	pxSiv.filt = {};

	// -----------------------------------------------------------------------------
	// - internal funcs
	// -----------------------------------------------------------------------------

	function pxs_init_filt () {
		var filtList = pxSiv.opt( 'filters' )
			, iter
			, len
			, filt;
		if ( bpmv.arr(filtList) ) {
			len = filtList.length
			for ( iter = 0; iter < len; iter++ ) {
				pxSiv.debug( 'filt', 'Attempting to load filter "'+filtList[iter]+'".' );
				filt = pxs_filter_load( filtList[iter] );
			}
		}
		pxSiv.ready( 'filt' );
	}

	function pxs_filter_load ( filtName ) {
		var filt = (''+bpmv.trim(filtName)).replace( /\.js$/, '' )
			, file
			, dirs = pxSiv.opt( 'filtDirs' )
			, iter
			, len;
		if ( bpmv.arr(dirs) ) {
			len = dirs.length;
			for ( iter = 0; iter < len; iter++) {
				file = pxSiv.fix_path( dirs[iter]+'/'+filt+'.js', true );
				if ( bpmv.str(file) ) {
					pxSiv.debug( 'filt', 'Found file for filter "'+filt+'".', file );
					break;
				}
			}
			if ( bpmv.str(file) ) {
				try {
					psxActiveFilters[filt] = require( file ).pxsFilter;
					if ( bpmv.func(psxActiveFilters[filt].init) ) {
						psxActiveFilters[filt].init( pxSiv );
					}
				} catch (e) {
					pxSiv.err( 'filt', 'Could not load filter "'+filt+'"! '+e, file )
					pxSiv.die( 'Filter error!' )
				}
				return psxActiveFilters[filt];
			}
		}
		pxSiv.err( 'filt', 'Could not load filter "'+filt+'"! '+e )
		pxSiv.die( 'Filter error!' )
	}

	// -----------------------------------------------------------------------------
	// - external funcs
	// -----------------------------------------------------------------------------

	pxSiv.filt.clear = function () {
		psxActiveFilters = {};
	};

	pxSiv.filt.add = function ( filtName ) {};

	pxSiv.filt.apply = function ( req, resp ) {
		var fi
			, filts = bpmv.keys( psxActiveFilters )
			, iter
			, len;
		if ( !bpmv.obj(req) || !bpmv.obj(resp) ) {
			pxSiv.err( 'filt', 'Bad request or response.' );
			return;
		}
		if ( resp.statusCode >= 400 ) {
			pxSiv.debug( 'filt', 'Aborted filter chain ('+resp.statusCode+', "'+req.url+'").' )
			return;
		}
		if ( bpmv.arr(filts) ) {
			len = filts.length;
			for ( iter = 0; iter < len; iter++ ) {
				if ( resp.statusCode >= 400 ) {
					pxSiv.debug( 'filt', 'Broke filter chain ('+resp.statusCode+').' )
					break;
				}
				if ( bpmv.str(filts[iter]) ) {
					fi = psxActiveFilters[filts[iter]];
					if ( bpmv.obj(fi) && bpmv.func(fi.filter) ) {
						pxSiv.debug( 'filt', 'Applying filter "'+filts[iter]+'".' )
						fi.filter( req, resp );
						req.pxsFilters[filts[iter]] = resp.statusCode;
					}
				}
			}
		}
		//return true;
	};

	pxSiv.filt.remove = function ( filtName ) {
		if ( bpmv.str(filtName) ) {
			psxActiveFilters[filtName] = null;
		}
		return !bpmv.obj(psxActiveFilters[filtName]);
	};

	// -----------------------------------------------------------------------------
	// - simple setup
	// -----------------------------------------------------------------------------
	pxSiv.ready( 'http', pxs_init_filt );

return pxSiv.filt; })(exports.pxSiv) && (function ( pxSiv ) {

	/* *****************************************************************************
	* ******************************************************************************
	* HTTP SERVER
	* ******************************************************************************
	***************************************************************************** */

	var bpmv = pxSiv.b
		, pxsHttp = require( 'http' )
		, pxsCache = {}
		, pxsServ
		, pxsHttpHost
		, pxsHttpPort;

	pxSiv.http = {};

	// -----------------------------------------------------------------------------
	// - internal funcs
	// -----------------------------------------------------------------------------

	function pxs_init_http ( ready, waiting, siv ) {
		var cLife;
		if ( !bpmv.obj(pxsServ) ) {
			pxsHttpHost = pxSiv.opt( 'httpHost' );
			pxsHttpPort = pxSiv.opt( 'httpPort' );
			if ( bpmv.str(pxsHttpHost) && bpmv.num(pxsHttpPort) ) {
				try {
					pxsServ = pxsHttp.createServer( pxs_http_handle_request ).listen( pxsHttpPort, pxsHttpHost );
				} catch ( e ) {
					pxSiv.err( 'http', 'HTTP server failed creation on "'+pxsHttpHost+':'+pxsHttpPort+'". '+e );
				}
			} else {
				pxSiv.err( 'http', 'Cannot start HTTP server - host ("'+pxsHttpHost+'") or port ("'+pxsHttpPort+'") are invalid!' );
			}
			if ( !bpmv.obj(pxsServ) ) {
				pxSiv.die( 'Cannot start HTTP server.' );
			} else {
				// this cache busting is hackery for now
				cLife = pxSiv.opt( 'httpCacheLife' );
				if ( bpmv.num(cLife) ) {
					setInterval( pxSiv.http.clear_cache, cLife )
				}
				pxSiv.log( 'http', 'HTTP listening on "'+pxsHttpHost+':'+pxsHttpPort+'".' );
				pxSiv.ready( 'http' );
			}
		}
	};

	function pxs_http_populate_request ( req ) {
		if ( bpmv.obj(req) ) {
			req.pxsEpoch = pxSiv.time() / 1000;
			req.pxsIp = pxs_ip_from_request( req );
			req.pxsHost = pxsHttpHost+':'+pxsHttpPort;
			req.pxsFilters = {};
			req.pxsData = {};
		}
		return req;
	}

	function pxs_http_handle_static ( req, resp ) {
		var ret
			, ty
		if ( bpmv.obj(req) && bpmv.obj(resp) ) {
			switch ( req.url ) {
				case '/pxsLob.js':
					ret = pxSiv.http.get_lob();
					ty = 'text/javascript';
					if ( !bpmv.str(ret) ) {
						resp.statusCode = 404;
					}
					break;
				case '/test.html':
					ret = pxSiv.http.get_test_html();
					ty = 'text/html';
					if ( !bpmv.str(ret) ) {
						resp.statusCode = 404;
					}
					break;
			}
		}
		if ( bpmv.str(ret) && bpmv.str(ty) ) {
			return { 'out' : ret, 'cType' : ty };
		}
	}

	function pxs_http_handle_request ( req, resp ) {
		var filtRes
			, logData
			, px
			, pxType
			, cType
			, out
			, enc = 'utf-8'
			, st;
		if ( bpmv.obj(req) && bpmv.obj(resp) ) {
			pxs_http_populate_request( req );
			st = pxs_http_handle_static ( req, resp );
			if ( bpmv.obj(st) && bpmv.str(st.out) && bpmv.str(st.cType) ) {
				out = st.out;
				cType = st.cType;
			} else if ( resp.statusCode < 400 ) { // handle pixel
				resp.setHeader( 'Cache-control', 'no-cache' );
				resp.setHeader( 'Pragma', 'no-cache' );
				switch ( req.method ) {
					case 'GET':
						if ( !( /\?[^=]+\=/ ).test(req.url) ) {
							// no get parms
							resp.statusCode = 400;
						}
						break;
					case 'POST':
						// not yet supported
						resp.statusCode = 400;
						break;
					default:
						resp.statusCode = 400;
						break;
				}
				filtRes = pxSiv.filt.apply( req, resp );
				if ( resp.statusCode < 400 ) {
					// save to DB
					pxs_http_save_request( req, resp );
					px = pxSiv.http.get_pixel();
					pxType = pxSiv.http.get_pixel_type();
					if ( bpmv.str(px) && bpmv.str(pxType) ) {
						out = px;
						cType = pxType;
						enc = 'binary';
					}
				}
			} // end handling pixel
			if ( resp.statusCode >= 400 ) {
				resp.setHeader( 'X-PXS-STATUS', pxSiv._httpCodes[resp.statusCode] );
				out = 'HTTP/'+req.httpVersion+' '+resp.statusCode+' - '+pxSiv._httpCodes[resp.statusCode];
				cType = 'text/plain';
			}
			logData = {
				  'server'   : req.pxsHost
				, 'ip'       : req.pxsIp
				, 'status'   : resp.statusCode
				, 'epoch'    : req.pxsEpoch
				, 'keys'     : bpmv.count(req.pxsData)
				, 'url'      : req.url
				, 'filters'  : req.pxsFilters
			};
			pxSiv.log( 'http', req.method, logData );
			if ( bpmv.str(cType) ) {
				resp.setHeader( 'Content-Type', cType );
			}
			if ( bpmv.str(out) ) {
				resp.write( out, enc );
			}
			pxs_http_finish_request( req, resp );
		}
	}

	function pxs_http_finish_request ( req, resp ) {
		resp.end();
	}

	function pxs_http_save_request ( req, resp ) {
		if ( bpmv.obj(req.pxsData) ) {
			req.pxsData['ip'] = req.pxsIp;
			req.pxsData['url'] = req.url;
			req.pxsData['host'] = req.pxsHost;
			req.pxsData['epoch'] = req.pxsEpoch;
			req.pxsData['filt'] = req.pxsFilters;
			pxSiv.db.w( req.pxsData );
		}

	}

	function pxs_ip_from_request ( req ) {
		if ( bpmv.obj(req) && bpmv.obj(req.headers) && bpmv.str(req.headers['x-forwarded-for']) ) {
			return req.headers['x-forwarded-for'];
		} else if ( bpmv.obj(req) && bpmv.obj(req.connection) && bpmv.str(req.connection.remoteAddress) ) {
			return req.connection.remoteAddress;
		}
	}

	// -----------------------------------------------------------------------------
	// - external funcs
	// -----------------------------------------------------------------------------

	pxSiv.http.clear_cache = function () {
		if ( bpmv.obj(pxsCache, true) ) {
			pxSiv.log( 'http', 'Purging caches ('+bpmv.keys(pxsCache)+').' );
			pxsCache = {};
		}
	};

	pxSiv.http.close = function () {
		if ( bpmv.obj(pxsServ) ) {
			pxSiv.log( 'http', 'Shutting down http server on  "'+pxsHttpHost+':'+pxsHttpPort+'".' );
			pxsServ.close();
		}
	};

	pxSiv.http.get_lob = function () {
		var lobPath;
		if ( !bpmv.str(pxsCache['pxsLob']) ) {
			try {
				lobPath = pxSiv.fix_path( pxSiv.root()+'/src/pxsLob.js', true );
				if ( bpmv.str(lobPath) && pxSiv.fs.existsSync( lobPath ) ) {
					pxsCache['pxsLob'] = pxSiv.fs.readFileSync( lobPath, 'utf-8' );
					pxSiv.log( 'http', 'Cached pxsLob from "'+lobPath+'".' );
				} else {
					pxSiv.err( 'Could not read file "'+lobPath+'"!' );
				}
			} catch ( e ) {
				pxSiv.err( 'FS error reading file "src/pxsLob.js"' );
			}
		}
		return pxsCache['pxsLob'];
	};

	pxSiv.http.get_pixel = function () {
		var pxPath;
		if ( bpmv.str(pxsCache['pixel']) && bpmv.str(pxsCache['pixelType']) ) {
			return pxsCache['pixel'];
		} else {
			pxPath = pxSiv.opt( 'pixel' );
			try {
				if ( bpmv.str(pxPath) && /\.(gif|png|jpg|jpeg)$/i.test( pxPath ) && pxSiv.fs.existsSync( pxPath ) ) {
					pxsCache['pixelType'] = 'image/'+(pxPath.split( '.' ).pop());
					pxsCache['pixel'] = pxSiv.fs.readFileSync( pxPath, 'binary' );
					pxSiv.log( 'http', 'Cached pixel from "'+pxPath+'".' );
					pxSiv.log( 'http', 'Cached pixelType as "'+pxsCache['pixelType']+'".' );
				} else {
					pxSiv.die( 'Could not read pixel file "'+pxPath+'"!' );
				}
			} catch ( e ) {
				pxSiv.die( 'FS error reading pixel file "'+pxPath+'"! '+e );
			}
			return pxsCache['pixel'];
		}
	};

	pxSiv.http.get_test_html = function () {
		var htmlPath;
		if ( !bpmv.str(pxsCache['htmlTest']) ) {
			try {
				htmlPath = pxSiv.fix_path( pxSiv.root()+'/src/test.html', true );
				if ( bpmv.str(htmlPath) && pxSiv.fs.existsSync( htmlPath ) ) {
					pxsCache['htmlTest'] = pxSiv.fs.readFileSync( htmlPath, 'utf-8' );
					pxSiv.log( 'http', 'Cached htmlTest from "'+htmlPath+'".' );
				} else {
					pxSiv.err( 'Could not read file "'+htmlPath+'"!' );
				}
			} catch ( e ) {
				pxSiv.err( 'FS error reading file "src/pxsLob.js"' );
			}
		}
		return pxsCache['htmlTest'];
	};

	pxSiv.http.get_pixel_type = function () {
		if ( !bpmv.str(pxsCache['pixel']) ) {
			pxSiv.http.get_pixel();
		}
		return pxsCache['pixelType'];
	};

	// -----------------------------------------------------------------------------
	// - simple setup
	// -----------------------------------------------------------------------------

	pxSiv.ready( 'db', pxs_init_http );

return pxSiv.http; })(exports.pxSiv) && (function ( pxSiv ) {

	/* *****************************************************************************
	* ******************************************************************************
	* ADMIN SERVER
	* ******************************************************************************
	***************************************************************************** */

	var bpmv = pxSiv.b;

	pxSiv.adm = {};

return pxSiv.adm; })(exports.pxSiv) && (function ( pxSiv ) {

	/* *****************************************************************************
	* ******************************************************************************
	* OPTIONS SETUP
	* ******************************************************************************
	***************************************************************************** */

	var bpmv = pxSiv.b;

	// -----------------------------------------------------------------------------
	// - internal funcs
	// -----------------------------------------------------------------------------

	function pxs_init_optset () {
		pxSiv.ready( 'optset' );
	}

	// -----------------------------------------------------------------------------
	// - the options
	// -----------------------------------------------------------------------------

	pxSiv.opt.create( {
		  'opt'   : 'ini'
		, 'def'   : pxSiv.fix_path( pxSiv.root()+'/conf/pxSiv.ini' )
		, 'cli'   : [ 'i', 'ini' ]
		, 'help'  : 'Configuration (ini) file to read.'
		, 'valid' : function ( val, isCli ) {
			if ( bpmv.str(val) ) {
				return bpmv.trim( val );
			}
		}
	} );

	pxSiv.opt.create( {
		  'opt'  : 'help'
		, 'def'  : false
		, 'cli'  : [ 'h', '?', 'help' ]
		, 'flag' : true
		, 'help' : 'Show help and exit'
		, 'valid' : function ( val, isCli ) {
			if ( isCli ) {
				pxs_help();
			}
		}
	} );

	/*
	pxSiv.opt.create( {
		  'opt'  : 'daemon'
		, 'def'  : false
		, 'cli'  : [ 'd', 'daemon' ]
		, 'ini'  : 'core.daemon'
		, 'help' : 'Run pxSiv in daemon mode.'
		, 'todo' : true
		, 'valid' : function ( val, isCli ) {
			return bpmv.trueish( val );
		}
	} );
	*/

	pxSiv.opt.create( {
		  'opt'  : 'log'
		, 'def'  : ''
		, 'cli'  : [ 'l', 'log' ]
		, 'ini'  : 'core.log'
		, 'help' : 'Enable logging by setting a destination log path as value. Warning: Logging to file is a performance hit.'
		, 'valid' : function ( val, isCli ) {
			var rex;
			val = bpmv.trim( val );
			if ( bpmv.str(val) && !(/^\s*(off,false,nay,no)\s*$/i).test( val ) ) {
				val = bpmv.trim( val );
				rex = pxSiv.is_win() ? /^[a-z]\:[\\\/]/ : /^\//;
				if ( !isCli && !rex.test( val ) ) {
					val = pxSiv.fix_path( pxSiv.root()+'/'+val );
				}
				if ( bpmv.str(val) ) {
					pxSiv.opt( 'log', val ); // set so the next log message goes through
					pxSiv.log( 'core', 'Logging to file "'+val+'" (this may be a performance hit).' )
					return val;
				}
			}
			pxSiv.log( 'core', 'Logging disabled.' )
			return '';
		}
	} );

	pxSiv.opt.create( {
		  'opt'   : 'pixel'
		, 'def'   : pxSiv.fix_path( pxSiv.root()+'/data/1px.gif', true )
		, 'cli'   : [ 'px', 'pixel' ]
		, 'ini'   : 'core.pixel'
		, 'help'  : 'Location of pixel to serve.'
		, 'valid' : function ( val, isCli ) {
			var rex;
			if ( bpmv.str(val) && /\.(gif|png|jpg|jpeg)$/i.test( val ) ) {
				val = bpmv.trim( val );
				rex = pxSiv.is_win() ? /^[a-z]\:[\\\/]/ : /^\//;
				if ( isCli || rex.test( val ) ) {
					return val;
				} else {
					return pxSiv.fix_path( pxSiv.root()+'/'+val, true );
				}
			}
		}
	} );

	pxSiv.opt.create( {
		  'opt'   : 'verbose'
		, 'def'   : false
		, 'flag' : true
		, 'cli'   : [ 'v', 'verbose' ]
		, 'ini'   : 'core.verbose'
		, 'help'  : 'Verbose mode.'
		, 'valid' : function ( val, isCli ) {
			var verb = pxSiv.opt.obj( 'verbose' );
			if ( isCli || !bpmv.num(pxSiv.arg( verb.cli, true ), true) ) {
				val = bpmv.trueish( val );
				pxSiv.set_verbose( val );
			}
			return pxSiv.set_verbose();
		}
	} );

	pxSiv.opt.create( {
		  'opt'   : 'debug'
		, 'def'   : false
		, 'flag' : true
		, 'cli'   : [ 'd', 'debug' ]
		, 'ini'   : 'core.debug'
		, 'help'  : 'Debug mode.'
		, 'valid' : function ( val, isCli ) {
			var deb = pxSiv.opt.obj( 'debug' );
			if ( isCli || !bpmv.num(pxSiv.arg( deb.cli, true ), true) ) {
				val = bpmv.trueish( val );
				pxSiv.set_debug( val );
			}
			return pxSiv.set_debug();
		}
	} );

	pxSiv.opt.create( {
		  'opt'  : 'filtDirs'
		, 'def'  : [ pxSiv.fix_path( pxSiv.root()+'/filters', true ) ]
		, 'cli'  : [ 'fd', 'filt-dir', 'filters-dir' ]
		, 'ini'  : 'core.filtDirs'
		, 'help' : 'Comma separated list of filter directories.'
		, 'todo' : true
		, 'valid' : function ( val, isCli ) {
			var rex;
			val = bpmv.trim(val);
			if ( bpmv.str(val) ) {
				val = val.split( /,\s+/ );
			}
			if ( bpmv.arr(val) ) {
				if ( !isCli) {
					rex = pxSiv.is_win() ? /^[a-z]\:[\\\/]/ : /^\//;
					for ( var i = 0; i < val.length; i++ ) {
						if ( bpmv.str(val[i]) && !rex.test( val[i] ) ) {
							val[i] = pxSiv.fix_path( pxSiv.root()+'/'+val[i], true );
						}
					}
				}
				return val;
			} else {
				return [];
			}
		}
	} );

	pxSiv.opt.create( {
		  'opt'  : 'filters'
		, 'def'  : [ 'cookies', 'noscript' ]
		, 'cli'  : [ 'f', 'filters' ]
		, 'ini'  : 'core.filters'
		, 'help' : 'Comma separated list of filters in order of execution.'
		, 'todo' : true
		, 'valid' : function ( val, isCli ) {
			if ( bpmv.str(val) ) {
				return val.split( /,\s*/ );
			} else if ( bpmv.arr(val) ) {
				return val;
			} else {
				return [];
			}
		}
	} );

	pxSiv.opt.create( {
		  'opt'  : 'httpPort'
		, 'def'  : 80
		, 'cli'  : [ 'hp', 'http-port' ]
		, 'ini'  : 'http.port'
		, 'help' : 'Port number to bind HTTP server.'
		, 'valid' : function ( val, isCli ) {
			var t = parseInt(val, 10);
			if ( bpmv.num(t) ) {
				return t;
			}
		}
	} );

	pxSiv.opt.create( {
		  'opt'  : 'httpHost'
		, 'def'  : 'localhost'
		, 'cli'  : [ 'hh', 'http-host' ]
		, 'ini'  : 'http.host'
		, 'help' : 'Host or IP address to bind HTTP server.'
		, 'valid' : function ( val, isCli ) {
			if ( bpmv.str(val) ) {
				return val;
			} else {
				return '';
			}
		}
	} );

	pxSiv.opt.create( {
		  'opt'  : 'httpCacheLife'
		, 'def'  : 1000 * 30
		, 'cli'  : [ 'hcl', 'http-cache-life' ]
		, 'ini'  : 'http.cacheLife'
		, 'help' : 'Lifetime of static objects in the HTTP cache (currently implemented as a lazy setInterval purge). Set to 0 or empty to disable cache (ill-advised).'
		, 'todo' : true
		, 'valid' : function ( val, isCli ) {
			var t = parseInt(val, 10);
			if ( bpmv.num(t) ) {
				return t;
			} else {
				return '';
			}
		}
	} );

	/*
	pxSiv.opt.create( {
		  'opt'  : 'admin'
		, 'def'  : false
		, 'cli'  : [ 'a', 'admin' ]
		, 'ini'  : 'admin.admin'
		, 'help' : 'Run the admin interface (not yet implemented).'
		, 'todo' : true
		, 'valid' : function ( val, isCli ) {
			return bpmv.trueish( val );
		}
	} );

	pxSiv.opt.create( {
		  'opt'  : 'adminPort'
		, 'def'  : 8080
		, 'cli'  : [ 'ap', 'admin-port' ]
		, 'ini'  : 'admin.port'
		, 'help' : 'Port number to bind admin server.'
		, 'todo' : true
		, 'valid' : function ( val, isCli ) {
			var t = parseInt(val, 10);
			if ( bpmv.num(t) ) {
				return t;
			} else {
				return '';
			}
		}
	} );

	pxSiv.opt.create( {
		  'opt'  : 'adminHost'
		, 'def'  : 'localhost'
		, 'cli'  : [ 'ah', 'admin-host' ]
		, 'ini'  : 'admin.host'
		, 'help' : 'Host or IP address to bind admin server.'
		, 'todo' : true
		, 'valid' : function ( val, isCli ) {
			if ( bpmv.str(val) ) {
				return val;
			} else {
				return '';
			}
		}
	} );
	*/

	pxSiv.opt.create( {
		  'opt'   : 'dbType'
		, 'def'   : 'mongo'
		, 'cli'   : [ 't', 'db-type' ]
		, 'ini'   : 'db.dbType'
		, 'help'  : 'Type of DB backend to use (currently, only "mongo" is supported).'
		, 'valid' : function ( val, isCli ) {
			if ( bpmv.str(val) ) {
				switch ( val ) {
					case 'mongo':
					case 'mongodb':
						return 'mongo';
						break;
				}
			}
		}
	} );

	pxSiv.opt.create( {
		  'opt'  : 'dbPerMonth'
		, 'def'  : true
		, 'cli'  : [ 'pm', 'per-month' ]
		, 'ini'  : 'db.dbPerMonth'
		, 'help' : 'Whether to create individual tables/collections per month. If false, they will be created per-year.'
		, 'valid' : function ( val, isCli ) {
			return bpmv.trueish(val);
		}
	} );

	pxSiv.opt.create( {
		  'opt'  : 'dbDatabase'
		, 'def'  : 'pxSiv'
		, 'cli'  : [ 'db', 'database' ]
		, 'ini'  : 'db.database'
		, 'help' : 'Name of the database to use.'
		, 'valid' : function ( val, isCli ) {
			val = bpmv.trim( val );
			if ( bpmv.str(val) ) {
				return val;
			}
		}
	} );

	pxSiv.opt.create( {
		  'opt'  : 'dbTablePrefix'
		, 'def'  : 'pxSiv_'
		, 'cli'  : [ 'tp', 'table-prefix' ]
		, 'ini'  : 'db.tablePrefix'
		, 'help' : 'Prefix for table/collection names.'
		, 'todo' : true
		, 'valid' : function ( val, isCli ) {
			if ( bpmv.str(val) ) {
				return bpmv.trim( val );
			}
		}
	} );

	pxSiv.opt.create( {
		  'opt'  : 'dbWriteHost'
		, 'def'  : 'localhost'
		, 'cli'  : [ 'dbw-h', 'db-write-host' ]
		, 'ini'  : 'db-write.host'
		, 'help' : 'Hostname or IP of databse used for writes.'
		, 'valid' : function ( val, isCli ) {
			if ( bpmv.str(val) ) {
				return bpmv.trim( val );
			} else {
				return '';
			}
		}
	} );

	pxSiv.opt.create( {
		  'opt'  : 'dbWritePort'
		, 'def'  : '27017'
		, 'cli'  : [ 'dbw-p', 'db-write-port' ]
		, 'ini'  : 'db-write.port'
		, 'help' : 'Port number of databse used for writes.'
		, 'valid' : function ( val, isCli ) {
			t = parseInt( val, 10 );
			if ( bpmv.num(t) ) {
				return t;
			} else {
				return '';
			}
		}
	} );

	pxSiv.opt.create( {
		  'opt'  : 'dbWriteUser'
		, 'def'  : ''
		, 'cli'  : [ 'dbw-u', 'db-write-user' ]
		, 'ini'  : 'db-write.user'
		, 'help' : 'Authentication user name of databse used for writes.'
		, 'todo' : true
		, 'valid' : function ( val, isCli ) {
			if ( bpmv.str(val, true) ) {
				return bpmv.trim( val );
			} else {
				return '';
			}
		}
	} );

	pxSiv.opt.create( {
		  'opt'  : 'dbWritePass'
		, 'def'  : ''
		, 'cli'  : [ 'dbw-p', 'db-write-pass' ]
		, 'ini'  : 'db-write.pass'
		, 'help' : 'Authentication password of databse used for writes.'
		, 'todo' : true
		, 'valid' : function ( val, isCli ) {
			if ( bpmv.str(val, true) ) {
				return bpmv.trim( val );
			} else {
				return '';
			}
		}
	} );

	pxSiv.opt.create( {
		  'opt'  : 'dbWriteKey'
		, 'def'  : ''
		, 'cli'  : [ 'dbw-k', 'db-write-key' ]
		, 'ini'  : 'db-write.key'
		, 'help' : 'Authentication key of databse used for writes.'
		, 'todo' : true
		, 'valid' : function ( val, isCli ) {
			if ( bpmv.str(val, true) ) {
				return bpmv.trim( val );
			} else {
				return '';
			}
		}
	} );

	pxSiv.opt.create( {
		  'opt'  : 'dbReadHost'
		, 'def'  : ''
		, 'cli'  : [ 'dbr-h', 'db-read-host' ]
		, 'ini'  : 'db-read.host'
		, 'help' : 'Hostname or IP of databse used for reads. If empty, all values (host, IP, authentication) from database for writes will be used.'
		, 'valid' : function ( val, isCli ) {
			if ( bpmv.str(val) ) {
				return bpmv.trim( val );
			} else {
				return '';
			}
		}
	} );

	pxSiv.opt.create( {
		  'opt'  : 'dbReadPort'
		, 'def'  : '27017'
		, 'cli'  : [ 'dbr-p', 'db-read-port' ]
		, 'ini'  : 'db-read.port'
		, 'help' : 'Port number of databse used for reads.'
		, 'valid' : function ( val, isCli ) {
			t = parseInt( val, 10 );
			if ( bpmv.num(t) ) {
				return t;
			} else {
				return '';
			}
		}
	} );

	pxSiv.opt.create( {
		  'opt'  : 'dbReadUser'
		, 'def'  : ''
		, 'cli'  : [ 'dbr-u', 'db-read-user' ]
		, 'ini'  : 'db-read.user'
		, 'help' : 'Authentication user name of databse used for reads.'
		, 'todo' : true
		, 'valid' : function ( val, isCli ) {
			if ( bpmv.str(val, true) ) {
				return bpmv.trim( val );
			} else {
				return '';
			}
		}
	} );

	pxSiv.opt.create( {
		  'opt'  : 'dbReadPass'
		, 'def'  : ''
		, 'cli'  : [ 'dbr-p', 'db-read-pass' ]
		, 'ini'  : 'db-read.pass'
		, 'help' : 'Authentication password of databse used for reads.'
		, 'todo' : true
		, 'valid' : function ( val, isCli ) {
			if ( bpmv.str(val, true) ) {
				return bpmv.trim( val );
			} else {
				return '';
			}
		}
	} );

	pxSiv.opt.create( {
		  'opt'  : 'dbReadKey'
		, 'def'  : ''
		, 'cli'  : [ 'dbr-k', 'db-read-key' ]
		, 'ini'  : 'db-read.key'
		, 'help' : 'Authentication key of databse used for reads.'
		, 'todo' : true
		, 'valid' : function ( val, isCli ) {
			if ( bpmv.str(val, true) ) {
				return bpmv.trim( val );
			} else {
				return '';
			}
		}
	} );

	pxSiv.opt.create( {
		  'opt'  : 'writeIni'
		, 'def'  : 'pxSiv_defaults.ini'
		, 'cli'  : [ 'w', 'write-ini' ]
		, 'help' : 'Write an ini file from the current settings and exit. if value is empty, the file will be saved as "pxSiv_defaults.ini" in the current directory.'
		, 'valid' : function ( val, isCli ) {
			pxSiv.opt.ini_save( val );
		}
	} );

	// -----------------------------------------------------------------------------
	// - simple setup
	// -----------------------------------------------------------------------------

	pxSiv.ready( 'core', pxs_init_optset );

return pxSiv.opt; })(exports.pxSiv) && (function ( pxSiv ) {

	/* *****************************************************************************
	* ******************************************************************************
	* SUNDRIES
	* ******************************************************************************
	***************************************************************************** */

	pxSiv._httpCodes = {
		100 : 'Continue',
		101 : 'Switching Protocols',
		102 : 'Processing (WebDAV) (RFC 2518)',
		103 : 'Checkpoint',
		122 : 'Request-URI too long',
		200 : 'OK',
		201 : 'Created',
		202 : 'Accepted',
		203 : 'Non-Authoritative Information (since HTTP/1.1)',
		204 : 'No Content',
		205 : 'Reset Content',
		206 : 'Partial Content',
		207 : 'Multi-Status (WebDAV) (RFC 4918)',
		208 : 'Already Reported (WebDAV) (RFC 5842)',
		226 : 'IM Used (RFC 3229)',
		300 : 'Multiple Choices',
		301 : 'Moved Permanently',
		302 : 'Found',
		303 : 'See Other (since HTTP/1.1)',
		304 : 'Not Modified',
		305 : 'Use Proxy (since HTTP/1.1)',
		306 : 'Switch Proxy',
		307 : 'Temporary Redirect (since HTTP/1.1)',
		308 : 'Resume Incomplete',
		400 : 'Bad Request',
		401 : 'Unauthorized',
		402 : 'Payment Required',
		403 : 'Forbidden',
		404 : 'Not Found',
		405 : 'Method Not Allowed',
		406 : 'Not Acceptable',
		407 : 'Proxy Authentication Required',
		408 : 'Request Timeout',
		409 : 'Conflict',
		410 : 'Gone',
		411 : 'Length Required',
		412 : 'Precondition Failed',
		413 : 'Request Entity Too Large',
		414 : 'Request-URI Too Long',
		415 : 'Unsupported Media Type',
		416 : 'Requested Range Not Satisfiable',
		417 : 'Expectation Failed',
		418 : 'I\'m a teapot (RFC 2324)',
		422 : 'Unprocessable Entity (WebDAV) (RFC 4918)',
		423 : 'Locked (WebDAV) (RFC 4918)',
		424 : 'Failed Dependency (WebDAV) (RFC 4918)',
		425 : 'Unordered Collection (RFC 3648)',
		426 : 'Upgrade Required (RFC 2817)',
		428 : 'Precondition Required',
		429 : 'Too Many Requests',
		431 : 'Request Header Fields Too Large',
		444 : 'No Response',
		449 : 'Retry With',
		450 : 'Blocked by Windows Parental Controls',
		499 : 'Client Closed Request',
		500 : 'Internal Server Error',
		501 : 'Not Implemented',
		502 : 'Bad Gateway',
		503 : 'Service Unavailable',
		504 : 'Gateway Timeout',
		505 : 'HTTP Version Not Supported',
		506 : 'Variant Also Negotiates (RFC 2295)',
		507 : 'Insufficient Storage (WebDAV) (RFC 4918)',
		508 : 'Loop Detected (WebDAV) (RFC 5842)',
		509 : 'Bandwidth Limit Exceeded (Apache bw/limited extension)',
		510 : 'Not Extended (RFC 2774)',
		511 : 'Network Authentication Required',
		598 : '(Informal convention) network read timeout error',
		599 : '(Informal convention) network connect timeout error'
	};

return pxSiv._httpCodes; })(exports.pxSiv) && (function ( pxSiv ) {

	/* *****************************************************************************
	* ******************************************************************************
	* RUNTIME
	* ******************************************************************************
	***************************************************************************** */

	pxSiv.init();

})(exports.pxSiv);