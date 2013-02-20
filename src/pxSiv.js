(function ( proc ) { // core section

	/* *****************************************************************************
	* ******************************************************************************
	* CORE
	* ******************************************************************************
	***************************************************************************** */

	var pxSiv = {
		  'a'  : require( __dirname+'/ansi.js' ).ansi
		, 'b'  : require( __dirname+'/bpmv.js' ).bpmv
		, 'c'  : fs = require( 'crypto' )
		, 'fs' : fs = require( 'fs' )
		, 'p'  : proc
		, 'u'  : util = require( 'util' )
	};
	exports.pxSiv = pxSiv;

	var bpmv = pxSiv.b
		, pxsDaemonMode
		, pxsDate = new Date()
		, pxsDebug = false
		, pxsDirSep = (/^win/i).test( pxSiv.p.platform ) ? '\\' : '/'
		, pxsFailed = 0
		, pxsFsPathCache = {}
		, pxsInitRun = false
		, pxsIsWin = (/^win/i).test( pxSiv.p.platform )
		, pxsLive = false
		, pxsLogHandle
		, pxsReady = []
		, pxsReadyCbs = {}
		, pxsReservedKeys = [ 'ip', 'url', 'host', 'epoch', 'filt', 'noscript', 'cookies' ]
		, pxsRoot = __dirname+'/../'
		, pxsSlugWidth = 9
		, pxsStartSlug = pxSiv.a.fg.green+'++Startup++'+pxSiv.a.reset
		, pxsStatInterval // for reporting stats during debug mode
		, pxsStatRun
		, pxsStats = {}
		, pxsTimes = {}
		, pxsVerbose = false
		, pxsVersion = '0.55'
		, pxsWaiting = [ 'core', 'opt', 'optset', 'db', 'http', 'filt', 'final' ];

	pxsTimes.msec = 1;
	pxsTimes.sec  = 1000;
	pxsTimes.min  = pxsTimes.sec  * 60;
	pxsTimes.hour = pxsTimes.min  * 60;
	pxsTimes.day  = pxsTimes.hour * 60;
	pxsTimes.week = pxsTimes.day  * 7;
	pxsTimes.year = pxsTimes.week * 52.1775;

	// -----------------------------------------------------------------------------
	// - core functions
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

	pxSiv.die = function ( msg ) {
		console.trace( 'pxSiv' );
		if ( ( typeof(msg) === 'string' ) && ( msg.length > 0 ) ) {
			pxSiv.err( 'fatal', msg );
		} else {
			pxSiv.err( 'fatal', 'An unknown error occurred in pxSiv!!!' );
		}
		process.exit( 255 );
	};

	// epoch is in seconds
	pxSiv.epoch = function ( str ) {
		var d = new Date()
		return str ? d.toUTCString() : d.getTime() / 1000;
	};

	pxSiv.fix_path = function ( path, real ) {
		var cPath
			, fPath;
		if ( bpmv.str(path) ) {
			fPath = (''+path).replace( /[\\\/]/g, pxsDirSep );
			if ( real ) {
				try {
					return pxSiv.fs.realpathSync( fPath, pxsFsPathCache );
				} catch ( e ) {
					// noop - return undef
				}
			} else {
				return fPath;
			}
		}
	};

	pxSiv.get_reserved = function () {
		return Array.apply( null, pxsReservedKeys );
	}

	pxSiv.is_win = function () {
		return true && pxsIsWin;
	};

	pxSiv.rand = function ( xtraSeed ) {
		var ha = pxSiv.c.createHash('sha1');
		ha.update( ''+pxSiv.epoch() );
		ha.update( ''+pxSiv.c.randomBytes( 512 ) );
		ha.update( ''+xtraSeed );
		return ha.digest('hex');
	}

	pxSiv.ready_check = function ( waiting ) {
		var wait = bpmv.str(waiting) ? waiting : 'final'
		return bpmv.num(bpmv.find( wait, pxsReady ), true);
	}

	pxSiv.root = function () {
		return ''+pxsRoot;
	};

	pxSiv.set_daemon = function ( flag ) {
		if ( typeof(pxsDaemonMode) === 'undefined' ) {
			if ( typeof(flag) != 'undefined' ) {
				pxsDaemonMode = bpmv.trueish( flag );
			}
		}
		return true && pxsDaemonMode;
	};

	pxSiv.set_debug = function ( flag ) {
		var old;
		if ( typeof(flag) != 'undefined' ) {
			old = true && pxsDebug;
			pxsDebug = bpmv.trueish( flag );
			if ( old != pxsDebug ) {
				pxSiv.debug( 'debug', 'Debug mode '+(pxsDebug ? 'enabled' : 'disabled')+'.' );
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
				pxSiv.verbose( 'verbose', 'Verbose mode '+(pxsVerbose ? 'enabled' : 'disabled')+'.' );
			}
		}
		return true && pxsVerbose;
	};

	pxSiv.shutdown = function () {
		return pxs_shutdown();
	};

	pxSiv.time_length = function ( msec ) {
		var rem
			, ret = {
					'negative' : false
				, 'years'    : 0
				, 'weeks'    : 0
				, 'days'     : 0
				, 'hours'    : 0
				, 'minutes'  : 0
				, 'seconds'  : 0
				, 'msec'     : 0
			};
		if ( bpmv.num(msec, true) ) {
			rem = parseInt( msec, 10 );
			if ( msec < 0 ) {
				ret.negative = true;
				rem = 0 - rem
			}
			if ( rem > pxsTimes.year ) {
				ret.years = parseInt( rem / pxsTimes.year, 10 );
				rem = rem - ( ret.years * pxsTimes.year );
			}
			if ( rem > pxsTimes.week ) {
				ret.weeks = parseInt( rem / pxsTimes.week, 10 );
				rem = rem - ( ret.weeks * pxsTimes.week );
			}
			if ( rem > pxsTimes.day ) {
				ret.days = parseInt( rem / pxsTimes.day, 10 );
				rem = rem - ( ret.days * pxsTimes.day );
			}
			if ( rem > pxsTimes.hour ) {
				ret.hours = parseInt( rem / pxsTimes.hour, 10 );
				rem = rem - ( ret.hours * pxsTimes.hour );
			}
			if ( rem > pxsTimes.min ) {
				ret.minutes = parseInt( rem / pxsTimes.min, 10 );
				rem = rem - ( ret.minutes * pxsTimes.min );
			}
			if ( rem > pxsTimes.sec ) {
				ret.seconds = parseInt( rem / pxsTimes.sec, 10 );
				rem = rem - ( ret.seconds * pxsTimes.sec );
			}
			if ( rem > pxsTimes.msec ) {
				ret.msec = parseInt( rem / pxsTimes.msec, 10 );
				rem = rem - ( ret.msec * pxsTimes.msec );
			}
			return ret;
		}
	}

	// in msec unless asStr is true
	pxSiv.uptime = function ( asStr ) {
		var ut = parseInt(pxSiv.p.uptime() * 1000, 10);
		if ( asStr ) {
			var ut = pxSiv.time_length( ut );
			return ut.years+'y '+ut.weeks+'w '+ut.days+'d '+bpmv.pad(ut.hours, 2)+':'+bpmv.pad(ut.minutes, 2)+':'+bpmv.pad(ut.seconds, 2)+'.'+ut.msec;
		} else {
			return ut;
		}
	};

	pxSiv.version = function () {
		return ''+pxsVersion;
	};

	// -----------------------------------------------------------------------------
	// - User Communication functions
	// -----------------------------------------------------------------------------

	function pxs_con ( group, msg, data ) {
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

	function pxs_flatten ( mixed ) {
		var ret;
		if ( bpmv.obj(mixed) || bpmv.arr(mixed, true) ) {
			ret = pxSiv.u.inspect( mixed ).replace( /\s+/g, ' ' );
		} else if ( typeof(mixed) != 'undefined' ) {
			ret = ''+mixed;
		}
		return ret;
	}

	pxSiv.debug = function ( group, msg, data ) {
		var args;
		if ( !pxsDaemonMode && pxsDebug && bpmv.str(group) && bpmv.str(msg) ) {
			args = [
				  pxSiv.a.fg.magenta+'['+bpmv.pad(group.toUpperCase(), pxsSlugWidth, ' ')+']'+pxSiv.a.reset+' '+msg
			];
			if ( typeof(data) != 'undefined' ) {
				args.push( pxs_flatten( data ) );
			}
			return console.log.apply( console, args );
		}
	};

	pxSiv.err = function ( group, msg, data ) {
		var args;
		if ( bpmv.str(group) && bpmv.str(msg) ) {
			pxSiv.log( 'ERROR', '['+group+'] '+msg, data, true )
			if ( !pxsDaemonMode ) {
				args = [
					pxSiv.a.bg.red+pxSiv.a.fg.white+'['+bpmv.pad(group.toUpperCase(), pxsSlugWidth, ' ')+']'+pxSiv.a.reset+pxSiv.a.fg.red+' '+msg+pxSiv.a.reset
				];
				if ( typeof(data) != 'undefined' ) {
					args.push( data );
				}
				return console.error.apply( console, args );
			}
		}
	};

	pxSiv.info = function ( group, msg, data ) {
		var args;
		if ( bpmv.str(group) && bpmv.str(msg) ) {
			pxSiv.log( group, msg, data, true )
			if ( !pxsDaemonMode ) {
				args = [
					  pxSiv.a.fg.green+'['+bpmv.pad(group.toUpperCase(), pxsSlugWidth, ' ')+']'+pxSiv.a.reset+' '+msg
				];
				if ( typeof(data) != 'undefined' ) {
					args.push( pxs_flatten( data ) );
				}
				return console.log.apply( console, args );
			}
		}
	};

	pxSiv.log = function ( group, msg, data, quiet ) {
		var args
			, log
			, out
			, logData = pxs_flatten( data )
			, qIter;
		if ( !pxsDaemonMode && pxsVerbose && !quiet ) {
			pxSiv.verbose( group+'#', msg, logData );
		}
		if ( !pxSiv.ready_check( 'opt' ) ) {
			pxSiv.log.queue.push( [ this, arguments ] );
			// logging is not ready as options have not been fully started
			return;
		}
		log = pxSiv.opt( 'log' );
		if ( !bpmv.str(log) ) {
			pxSiv.log.queue = null;
			return; // logging is disabled
		}
		if ( bpmv.str(log) && bpmv.str(group) && bpmv.str(msg) ) {
			if ( !bpmv.obj(pxsLogHandle) ) {
				try {
					pxsLogHandle = pxSiv.fs.createWriteStream( log, {
						  'flags'    : 'a'
  					, 'encoding' : 'utf-8'
					} );
					pxSiv.log.queued();
					pxSiv.ready( 'log' );
				} catch ( e ) {
					pxSiv.opt( 'log', '' );
					pxSiv.die( 'Could not open log file "'+log+'". '+e );
				}
			}
			if ( bpmv.obj(pxsLogHandle) ) {
				out = '"'+pxSiv.epoch( true )+'", ';
				out += '"'+pxSiv.a.strip( group.toUpperCase() )+'", ';
				out += '"'+bpmv.txt2html( pxSiv.a.strip( msg.replace( /[\n\r\t]/g, ' ' ) ), [ '"' ] )+'"';
				if ( bpmv.str(logData) ) {
					out += ', "'+bpmv.txt2html( logData, [ '"' ] )+'"';
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
	};

	pxSiv.log.queue = [];

	pxSiv.log.queued = function () {
		if ( bpmv.obj(pxsLogHandle) && bpmv.arr(pxSiv.log.queue) ) {
			pxSiv.debug( 'log', 'Catching up on '+pxSiv.log.queue.length+' log messages.' );
			while ( qIter = pxSiv.log.queue.shift() ) {
				if ( bpmv.arr(qIter, 2) ) {
					pxSiv.log.apply( qIter[0], qIter[1] );
				}
			}
		}
	}

	pxSiv.out = function ( txt ) {
		pxSiv.p.stdout.write( txt );
	}

	pxSiv.verbose = function ( group, msg, data ) {
		var args;
		if ( !pxsDaemonMode && pxsVerbose && bpmv.str(group) && bpmv.str(msg) ) {
			args = [
				  pxSiv.a.fg.cyan+'['+bpmv.pad(group.toUpperCase(), pxsSlugWidth, ' ')+']'+pxSiv.a.reset+' '+msg
			];
			if ( typeof(data) != 'undefined' ) {
				args.push( pxs_flatten( data ) );
			}
			return console.log.apply( console, args );
		}
	};

	pxSiv.warn = function ( group, msg, data ) {
		var args;
		if ( bpmv.str(group) && bpmv.str(msg) ) {
			pxSiv.log( 'WARN', '['+group+'] '+msg, data )
			if ( !pxsDaemonMode ) {
				args = [
					pxSiv.a.bg.yellow+pxSiv.a.fg.black+'['+bpmv.pad(group.toUpperCase(), pxsSlugWidth, ' ')+']'+pxSiv.a.reset+pxSiv.a.fg.yellow+' '+msg+pxSiv.a.reset
				];
				if ( typeof(data) != 'undefined' ) {
					args.push( pxs_flatten( data ) );
				}
				return console.warn.apply( console, args );
			}
		}
	};

	// -----------------------------------------------------------------------------
	// - Handle daemon/debug/verbose flag
	// -----------------------------------------------------------------------------

	// early daemon flag
	if ( bpmv.num(pxSiv.arg( [ 'daemon' ], true ), true) ) {
		pxSiv.set_daemon( true );
	}

	pxSiv.info( 'start', pxsStartSlug+pxSiv.a.fg.green+' pxSiv.js v'+pxSiv.version()+' - '+pxSiv.p.arch+' '+pxSiv.p.platform+' ('+pxSiv.p.pid+')'+pxSiv.a.reset );

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
		pxSiv.ready( 'optset', pxSiv.debug_stats );
		pxSiv.log( 'start', 'pxSiv required init complete.' );
		if ( pxsDaemonMode ) {
		// how to detatch console?!?!
		//process.kill(process.pid, 'SIGHUP');
		}
	}

	function pxs_shutdown () {
		if ( pxsLive ) {
			pxSiv.log( 'core', 'Performing shutdown tasks. Uptime: '+pxSiv.uptime( true ) );
			pxSiv.db.close();
			pxSiv.http.close();
			pxsLive = false;
		}
		return !pxsLive;
	}

	// -----------------------------------------------------------------------------
	// - external functions
	// -----------------------------------------------------------------------------

	pxSiv.debug_stats = function ( interval ) { // set interval to 0 or less to disable
		if ( pxsDebug ) {
			if ( bpmv.num(interval, true) ) {
				pxSiv.opt( 'debugStatInterval', interval );
			}
			pxsStatInterval = pxSiv.opt( 'debugStatInterval' );
			if ( typeof(pxsStatRun) != 'undefined' ) {
				clearInterval( pxsStatRun );
				pxsStatRun = null;
			}
			if ( bpmv.num(pxsStatInterval) ) {
				pxsStatRun = setInterval( function () {
					var stats = pxSiv.stats()
						, msg = 'Debug reporting stats every '+pxsStatInterval+' seconds.';
					pxSiv.debug( 'stats', msg, stats );
					if ( bpmv.obj(stats, true) ) {
						pxSiv.log( 'stats', msg, stats, true );
					}
				}, pxsStatInterval * 1000 );
				pxSiv.debug( 'stats', 'Debug reporting stats every '+pxsStatInterval+' seconds.', pxSiv.stats() );
			}
		}
	};

	pxSiv.init = function () {
		var failLimit = 20
			, wait = 500
			, iter
			, len
			, ready = true;
		if ( !pxsInitRun ) {
			len = pxsWaiting.length;
			for ( iter = 0; iter < len; iter++ ) {
				if ( pxsWaiting[iter] === 'final' ) {
					continue;
				}
				if ( !bpmv.num(bpmv.find(pxsWaiting[iter], pxsReady), true) ) {
					ready = false;
					break;
				}
				
			}
			if ( ready ) {
				pxSiv.stats( 'uptime-msec', pxSiv.uptime );
				pxSiv.stats( 'uptime-human', [ pxSiv.uptime, [true] ] );
				pxSiv.stats( 'memory', pxSiv.mem );
				pxsInitRun = true;
				pxSiv_init();
				pxSiv.ready( 'final' );
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

	pxSiv.mem = function () { // in MB
		return parseInt( (pxSiv.p.memoryUsage().rss / 1024 / 1024) * 100, 10 ) / 100;
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
						readyCopy = Array.apply( null, pxsReady );
					}
				}
			} else { // declaring something ready
				if ( bpmv.num(bpmv.find( waiting, pxsReady ), true) ) {
					throw '"'+waiting+'" has already been declared as ready!!!';
				}
				pxsReady.push( waiting );
				readyCopy = Array.apply( null, pxsReady );
				pxSiv.info( 'ready', pxsStartSlug+' '+( bpmv.num(bpmv.find( waiting, pxsWaiting ), true) ? 'Section' : 'Optional section' )+' '+pxSiv.a.fg.magenta+waiting.toUpperCase()+pxSiv.a.reset+' is ready.' );
				if ( bpmv.arr(pxsReadyCbs[waiting]) ) {
					while ( runCb = pxsReadyCbs[waiting].shift() ) {
						runCb( readyCopy, waitingCopy, pxSiv );
					}
				}
			}
		}
		return readyCopy;
	};

	/*
	* The parm inc can be an integer to increment by, a function callback or an array of [ callback, arguments ].
	* If inc is undefined, but stat is a string, the value of that stat will be returned.
	* If called without parms, all stats will be returned.
	*/
	pxSiv.stats = function ( stat, inc ) {
		var top
			, ret;
		if ( bpmv.str(stat) ) {
			if ( bpmv.num(inc) ) {
				if ( typeof(pxsStats[stat]) === 'undefined' ) {
					pxsStats[stat] = 0;
				}
				for ( top = 0; top < inc; top++ ) {
					pxsStats[stat]++;
				}
			} else if ( bpmv.func(inc) ) {
				pxsStats[stat] = inc;
			} else if ( bpmv.arr(inc, 2) && bpmv.func(inc[0]) && bpmv.arr(inc[1], true) ) {
				pxsStats[stat] = inc;
			}
			if ( bpmv.num(pxsStats[stat], true) ) {
				return 0 + parseInt( pxsStats[stat], 10 );
			} else if ( bpmv.func(pxsStats[stat]) ) {
				return pxsStats[stat].apply( pxSiv, [] );
			} else if ( bpmv.arr(pxsStats[stat], 2) ) {
				if ( bpmv.func(pxsStats[stat][0]) && bpmv.arr(pxsStats[stat][1], true) ) {
					return pxsStats[stat][0].apply( pxSiv, pxsStats[stat][1] );
				}
			}
		} else {
			ret = {};
			for ( var top in pxsStats ) {
				if ( pxsStats.hasOwnProperty( top ) ) {
					if ( bpmv.num(pxsStats[top], true) ) {
						ret[top] = 0 + parseInt( pxsStats[top], 10 );
					} else if ( bpmv.func(pxsStats[top]) ) {
						ret[top] = pxsStats[top].apply( pxSiv, [] );
					} else if ( bpmv.arr(pxsStats[top], 2) ) {
						if ( bpmv.func(pxsStats[top][0]) && bpmv.arr(pxsStats[top][1], true) ) {
							ret[top] = pxsStats[top][0].apply( pxSiv, pxsStats[top][1] );
						}
					}
				}
			}
			if ( bpmv.obj(ret, true) ) {
				return ret;
			}
		}
	}

	// -----------------------------------------------------------------------------
	// - simple setup
	// -----------------------------------------------------------------------------

	// set the process name
	pxSiv.p.title = 'pxSiv.js';

	// handle various exits
	pxSiv.p.on( 'exit', pxs_shutdown );
	// SIGINT will not exit properly with CTRL-C on OSX
	//pxSiv.p.on( 'SIGINT', pxs_shutdown );
	pxSiv.p.on( 'SIGTERM', pxs_shutdown );
	pxSiv.p.on( 'uncaughtException', function ( err ) {
		pxSiv.err( 'core', 'UNHANDLED EXCEPTION!!! '+pxSiv.u.inspect( arguments ) );
		pxSiv.err( 'STACK', pxSiv.a.fg.yellow+err.stack+pxSiv.a.reset );
		pxSiv.p.exit( 255 );
	} );
	process.on('SIGHUP', function () {
  	pxSiv.log( 'core', 'Got SIGHUP signal.' );
	});

	return pxSiv.ready( 'core' );

})(process) && (function ( pxSiv ) { // options section

	/* *****************************************************************************
	* ******************************************************************************
	* OPTIONS
	* ******************************************************************************
	***************************************************************************** */

	var bpmv = pxSiv.b
		, pxsCfg = {} // currently running options
		, pxsOpts ={} // the main options and their functionality
		, pxsInitRunOpts = false
		, pxsDescription = []
		, pxsOptsByIni = {};

	pxsDescription.push( 'pxSiv is an HTTP server that logs tracking pixel requests directly to a database backend.' );
	pxsDescription.push( 'The server answers all requests with an image file read from memory.' );
	pxsDescription.push( 'It will never serve a 404 to avoid problems with broken requests in various clients (with two static file exceptions - "test.html" and "pxsLob.js").' );
	pxsDescription.push( 'All form requests will be filtered and, if applicable, saved to the DB backend.' );

	// -----------------------------------------------------------------------------
	// - internal funcs
	// -----------------------------------------------------------------------------

	function pxs_cli_help () {
		var co
			, kz = bpmv.keys( pxsOpts )
			, iter
			, len
			, args = []
			, opts = ''
			, app = (''+__filename).replace( /^.*[\/\\]/, '' )
			, cWide = pxSiv.p.stdout.columns
			, funkChar = '#'
			, help
			, usedCliFlags = {};
		kz.sort();
		len = kz.length;
		for ( iter = 0; iter < len; iter++ ) {
			co = pxsOpts[kz[iter]];
			if ( !bpmv.obj(co) || !bpmv.arr(co.cli) || co.hidden ) {
				continue;
			}
			args[iter] = '[';
			args[iter] += co.cli.length > 1 ? '(' : '';
			for ( var i = 0; i < co.cli.length; i++ ) {
				if ( bpmv.str(co.cli[i]) ) {
					if ( bpmv.str(usedCliFlags[co.cli[i]]) ) {
						pxSiv.debug( 'opts', 'Flag "'+co.cli[i]+'" already in used by option "'+usedCliFlags[co.cli[i]]+'" Can\'t use for "'+co.opt+'". Skipping!' );
						continue;
					}
					usedCliFlags[co.cli[i]] = co.opt;
					if ( i > 0 ) {
						args[iter] += '|'
					}
					if ( co.cli[i].length > 2 ) {
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
		pxSiv.out( bpmv.wrapped( ' pxSiv v'+pxSiv.version()+' - A pixel sieve from hell...\n', cWide - 2, '\n', funkChar+' ')+'\n' );
		pxSiv.out( bpmv.pad( funkChar, cWide / 2, funkChar )+'\n' );
		pxSiv.out( bpmv.wrapped( pxsDescription.join( ' ' ), cWide - 1, '\n' )+'\n' );
		pxSiv.out( '\n' );
		pxSiv.out( 'Usage:\n' );
		pxSiv.out( bpmv.wrapped( 'node '+app+' '+args.join( ' ' )+'', cWide - 4, '\n', '    ')+'\n' );
		pxSiv.out( 'Options:\n' );
		for ( iter = 0; iter < len; iter++ ) {
			co = pxsOpts[kz[iter]];
			if ( !bpmv.obj(co) || !bpmv.arr(co.cli) || co.hidden ) {
				continue;
			}
			pxSiv.out( '    '+args[iter].replace( /[\[\]\(\)]/g, '' )+'\n' );
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
		if ( pxSiv.arg( pxsOpts['_help'].cli ) ) {
			pxsOpts['_help'].valid();
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
				pxsOptsByIni[co.ini] = co.opt;
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
			ret.opt = opts.opt;
			ret.def = opts.def;
			ret.flag = bpmv.trueish( opts.flag );
			ret.hidden = bpmv.trueish( opts.hidden );
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
			if ( !bpmv.obj(co) || co.hidden ) {
				continue;
			}
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
							if ( bpmv.obj(co) && !co.hidden ) {
								ret += bpmv.str(co.help) ? bpmv.wrapped( co.help, 80, '\n', '; ' )+'\n' : '';
								ret += !co.flag ? '; Default: "'+co.def.toString()+'"\n' : '';
								ret += vals[groups[iter]][val]+' = '+pxsCfg[val].toString()+'\n';
							}
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
		pxSiv.out( 'Wrote "'+dest+'".\n' );
	}

	pxSiv.opt.obj_sort = function ( obj ) {
		var kz
			, ret
			, iter
			, len;
		if ( bpmv.obj(obj, true) ) {
			kz = bpmv.keys( obj );
			kz.sort();
			len = kz.length;
			ret = {}
			for ( iter = 0; iter < len; iter++ ) {
				ret[kz[iter]] = obj[kz[iter]]
			}
		}
		return bpmv.obj(ret) ? ret : obj;
	}

	pxSiv.opt.show_cli_help = function ( path ) {
		pxs_cli_help()
	};

	// -----------------------------------------------------------------------------
	// - simple setup
	// -----------------------------------------------------------------------------
	pxSiv.ready( 'optset', pxs_init_opt );

	return pxSiv.opt;

})(exports.pxSiv) && (function ( pxSiv ) { // cache section

	/* *****************************************************************************
	* ******************************************************************************
	* CACHE
	* ******************************************************************************
	***************************************************************************** */

	var bpmv = pxSiv.b
		, pxsCache = {}
		, pxsInvalidVal = 'PXS_CACHE_INVALID'
		, pxsCachePruneInterval = 1000 * 5 // 5000 minimum
		, pxsCacheTimer
		, pxsDefaultLife = 30;

	pxSiv.cache = function ( key, val, life ) {
		if ( bpmv.str(key) ) {
			if ( typeof(val) === 'undefined' ) {
				return pxs_cache_get( key );
			} else {
				if ( val === null ) {
					return pxs_cache_delete( key );
				} else {
					return pxs_cache_set( key, val, life );
				}
			}
		}
	};

	// -----------------------------------------------------------------------------
	// - internal funcs
	// -----------------------------------------------------------------------------

	function pxs_init_cache () {
		if ( ( typeof(pxsCacheTimer) === 'undefined' ) ) {
			if ( !bpmv.num(pxsCachePruneInterval) || ( pxsCachePruneInterval < 5000 ) ) {
				pxsCachePruneInterval = 5000;
			}
			pxsCacheTimer = setInterval( pxs_cache_prune, pxsCachePruneInterval );
		}
		pxSiv.ready( 'cache' );
	}

	function pxs_cache_delete ( key ) {
		if ( bpmv.str(key) && ( typeof(pxsCache[key]) != 'undefined' ) ) {
			pxsCache[key] = null;
			pxSiv.stats( 'cache-deleted', 1 );
			pxSiv.debug( 'cache', 'Deleted key "'+key+'".' );
			return pxsCache[key];
		}
	}

	function pxs_cache_expire ( key ) {
		if ( bpmv.str(key) && bpmv.typeis( pxsCache[key], 'PxsCached' ) ) {
			pxsCache[key] = null;
			pxSiv.stats( 'cache-expired', 1 );
			pxSiv.debug( 'cache', 'Expired key "'+key+'".' );
		}
	}

	function pxs_cache_get (key) {
		var cObj
			, ret;
		if ( bpmv.str(key) ) {
			cObj = pxsCache[key];
			if ( bpmv.typeis( cObj, 'PxsCached' ) ) {
				ret = cObj.val;
			}
		}
		if ( ret == null ) {
			pxSiv.stats( 'cache-miss', 1 );
		} else {
			pxSiv.stats( 'cache-hit', 1 );
		}
		return ret;
	}

	function pxs_cache_prune () {
		var kz
			, iter
			, len
			, cObj;
		if ( bpmv.num(bpmv.count(pxsCache)) ) {
			kz = bpmv.keys( pxsCache );
			len = kz.length;
			for ( iter = 0; iter < len; iter++ ) {
				cObj = pxsCache[kz[iter]];
				if ( bpmv.typeis( cObj, 'PxsCached' ) ) {
					pxsCache[kz[iter]] = new PxsCached( cObj.key, cObj.val, cObj.life )
				}
			}
		}
	}

	function pxs_cache_set ( key, val, life ) {
		var cObj = new PxsCached(  key, val, life  );
		if ( cObj != null ) {
			pxsCache[key] = cObj;
			if ( bpmv.typeis( cObj, 'PxsCached' ) && ( cObj.val != null ) ) {
				pxSiv.debug( 'cache', 'Set key "'+key+'".', val.toString().length );
				pxSiv.stats( 'cache-set', 1 );
				return val;
			}
		}
	}

	// -----------------------------------------------------------------------------
	// - proper classes
	// -----------------------------------------------------------------------------

	function PxsCached ( key, val, life ) {
		var exp
			, ts
			, cl
			, id;
		if ( bpmv.str(key) && ( typeof(val) != 'undefined' ) ) {
			ts = pxSiv.epoch();
			exp = parseInt( ts + (bpmv.num(life, true) ? life * 1000 : pxsDefaultLife * 1000) );
			if ( exp > ts ) {
				this.born = ts;
				this.exp = exp;
				this.key = ''+key;
				this.life = parseInt(life, 10);
				this.val = val;
				this.toString = function () {
					return this.val.toString();
				}
				setTimeout( function () {
					if ( bpmv.obj(pxsCache[key]) && pxsCache[key].born == ts ) {
						pxs_cache_expire( key );
					}
				}, life * 1000 );
				pxsCache[key] = this;
				return this;
			}
		}
		return null;
	}

	// -----------------------------------------------------------------------------
	// - simple setup
	// -----------------------------------------------------------------------------

	pxSiv.ready( 'opt', pxs_init_cache );

	return bpmv.func(pxSiv.cache);

})(exports.pxSiv) && (function ( pxSiv ) { // database section

	/* *****************************************************************************
	* ******************************************************************************
	* DATABASE
	* ******************************************************************************
	***************************************************************************** */

	// mg = require( 'mongodb' )

	var bpmv = pxSiv.b
		, pxsInitRunDb = false
		, pxsDbFailed = 0
		, pxsDbType
		, pxsDbHumanRw = {
			  'r' : pxSiv.a.bg.blue+pxSiv.a.fg.white+'read'+pxSiv.a.reset
			, 'w' : pxSiv.a.bg.red+pxSiv.a.fg.white+'write'+pxSiv.a.reset
		};

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

	pxSiv.db.rw_human = function ( rw ) {
		if ( bpmv.str(pxsDbHumanRw[rw]) ) {
			return pxsDbHumanRw[rw];
		}
	}

	pxSiv.db.table_name = function () {
		var d = new Date()
			, pre = bpmv.trim( pxSiv.opt( 'dbTablePrefix' ) )
			, ret = d.getFullYear();
		if ( bpmv.str(pre) ) {
			ret = pre+ret;
		}
		if ( pxSiv.opt( 'dbPerMonth' ) ) {
			ret += '_'+bpmv.pad( d.getMonth()+1, 2 );
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

	return pxSiv.db;

})(exports.pxSiv) && (function ( pxSiv ) { // mongo section

	/* *****************************************************************************
	* ******************************************************************************
	* MONGO DB INTERFACE
	* http://mongodb.github.com/node-mongodb-native/
	* http://localhost:28017/
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
		}
		, pxsDbIndexes = {};

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
			, db
			, human;
		// http://mongodb.github.com/node-mongodb-native/api-generated/db.html
		if ( ( rw === 'r' ) || ( rw === 'w' ) ) {
			human = pxSiv.db.rw_human( rw );
			db = pxSiv.opt( 'dbDatabase' );
			if ( rw === 'r' ) {
				host = pxSiv.opt( 'dbReadHost' );
				port = pxSiv.opt( 'dbReadPort' );
			} else if ( rw === 'w' ) {
				host = pxSiv.opt( 'dbWriteHost' );
				port = pxSiv.opt( 'dbWritePort' );
			}
			if ( bpmv.str(db) && bpmv.str(host) && bpmv.num(port) ) {
				pxSiv.verbose( 'mongo', 'Connecting to '+human+' "mongodb://'+host+':'+port+'/'+db+'".' );
				srv = new mongo.Server( host, port );
				// http://mongodb.github.com/node-mongodb-native/api-generated/db.html#authenticate
				if ( rw === 'r' ) {
					pxsDbR = new mongo.Db( db, srv, pxsDbOpts );
					if ( bpmv.obj(pxsDbR) ) {
						pxsDbR.open( pxs_db_mongo_handle_open );
					} else {
						pxSiv.err( 'mongo', 'Failed mongo '+human+' DB connection creation.', err );
						pxSiv.die( 'Database '+human+' open failed.' );
					}
				} else if ( rw === 'w' ) {
					pxsDbW = new mongo.Db( db, srv, pxsDbOpts );
					pxsDbW.open( pxs_db_mongo_handle_open );
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

	function pxs_db_mongo_handle_open ( err, db ) {
		var tName
			, user
			, pass
			, human
			, rw;
		if ( ( typeof(err) != 'undefined' ) && ( err != null ) ) {
			pxSiv.err( 'mongo', 'Failed mongo read DB open.', err );
			pxSiv.die( 'Database read open failed.' );
		} else if ( bpmv.obj(db) ) {
			if ( db === pxsDbR ) {
				pass = pxSiv.opt( 'dbReadPass' );
				rw = 'r';
				usr = pxSiv.opt( 'dbReadUser' );
			} else if ( db === pxsDbW ) {
				pass = pxSiv.opt( 'dbWritePass' );
				rw = 'w';
				usr = pxSiv.opt( 'dbWriteUser' );
			} else {
				pxSiv.err( 'mongo', 'Expected the open database to be r or w.', arguments );
				pxSiv.die( 'Database open failed.' );
			}
			human = pxSiv.db.rw_human( rw );
			if ( bpmv.str(usr) ) {
				db.authenticate( usr, pass, function ( err, res ) {
					var readyDb = false;
					if ( ( typeof(err) === 'undefined' ) || ( err == null ) && ( res == true ) ) {
						pxSiv.verbose( 'mongo', 'Database mongo '+human+' authenticated' );
						readyDb = true;
						pxs_db_mongo_ready();
					} else {
						pxSiv.err( 'mongo', 'Failed mongo '+human+' DB authentication.', err );
						pxSiv.die( 'Database read auth failed.' );
					}
					if ( rw === 'r' ) {
						pxsDbReadyR = readyDb;
					} else if ( rw === 'w' ) {
						pxsDbReadyW = readyDb;
					}
				} );
			} else {
				if ( rw === 'r' ) {
					pxsDbReadyR = true;
				} else if ( rw === 'w' ) {
					pxsDbReadyW = true;
				}
				pxs_db_mongo_ready();
			}
		} else {
			pxSiv.err( 'mongo', 'Expected an open database, but it was not an object.', arguments );
			pxSiv.die( 'Database open failed.' );
		}
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
			coll = pxsDbW.collection( tName	 );
			coll.insert( data, function () {
				if ( bpmv.func(cb) ) {
					cb.apply( this, arguments );
				}
			} );
		} else {
			// how to handle not ready? queue?
		}
	};

	return pxSiv.db.mongo;

})(exports.pxSiv) && (function ( pxSiv ) { // filters section

	/* *****************************************************************************
	* ******************************************************************************
	* FILTERS
	* ******************************************************************************
	***************************************************************************** */

	var bpmv = pxSiv.b
		pxsActiveFilters = {};

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
		var filt = (''+bpmv.trim(filtName)).replace( /\.js$/, '' );
		fObj = new PxsFilter( filt );
		fObj.load();
		return fObj
	}

	// -----------------------------------------------------------------------------
	// - proper classes
	// -----------------------------------------------------------------------------

	function PxsFilter ( name ) {
		if ( !bpmv.str(name) ) {
			return;
		}
		this.debugMode = false;
		this.loaded = false;
		this.path = '';
		this.filtName = name;
		this.slug = '['+this.filtName+']';
		this.debug = function ( msg ) {
			var args;
			if ( this.debugMode && bpmv.str(msg) ) {
				args = Array.apply( null, arguments );
				args.unshift( this.slug );
				args.unshift( 'filt' );
				pxSiv.debug.apply( pxSiv, args );
			}
		};
		this.err = function ( msg ) {
			var args;
			if ( bpmv.str(msg) ) {
				args = Array.apply( null, arguments );
				args.unshift( this.slug );
				args.unshift( 'filt' );
				pxSiv.err.apply( pxSiv, args );
			}
		};
		this.log = function ( msg ) {
			var args;
			if ( bpmv.str(msg) ) {
				args = Array.apply( null, arguments );
				args.unshift( this.slug );
				args.unshift( 'filt' );
				pxSiv.log.apply( pxSiv, args );
			}
		};
		this.verbose = function ( msg ) {
			var args;
			if ( bpmv.str(msg) ) {
				args = Array.apply( null, arguments );
				args.unshift( this.slug );
				args.unshift( 'filt' );
				pxSiv.verbose.apply( pxSiv, args );
			}
		};
		this.load = function () {
			var file
				, dirs
				, iter
				, len
				, filt;
			if ( bpmv.str(this.filtName) ) {
				dirs = pxSiv.opt( 'filtDirs' )
				if ( bpmv.arr(dirs) ) {
					len = dirs.length;
					for ( iter = 0; iter < len; iter++) {
						file = pxSiv.fix_path( dirs[iter]+'/'+this.filtName+'.js', true );
						if ( bpmv.str(file) ) {
							this.log( 'Found filter file "'+file+'".' );
							break;
						}
					}
					if ( bpmv.str(file) ) {
						try {
							filt = require( file ).pxsFilter;
							for ( fA in filt ) {
								if ( filt.hasOwnProperty( fA ) && ( typeof(this[fA]) === 'undefined' ) ) {
									this[fA] = filt[fA];
								}
							}
							this.debugMode = bpmv.trueish( filt.debugMode );
							this.loaded = true;
							if ( bpmv.func(this.init) ) {
								if ( bpmv.func(this.init) ) {
									this.init( pxSiv );
									this.log( 'Initialized.'+(this.debugMode ? ' Debug enabled.' : '' ) );
								}
							} else {
								this.log( 'Loaded.' );
							}
						} catch (e) {
							this.err( 'Could not load from "'+file+'"! '+e );
							pxSiv.die( 'Filter error!' )
						}
						pxsActiveFilters[this.filtName] = this;
						return pxsActiveFilters[this.filtName];
					}
				}
				this.err( 'Could not load! '+e )
				pxSiv.die( 'Filter error!' )
			}
		};
		return this;
	}

	// -----------------------------------------------------------------------------
	// - external funcs
	// -----------------------------------------------------------------------------

	pxSiv.filt.clear = function () {
		pxsActiveFilters = {};
	};

	pxSiv.filt.add = function ( filtName ) {};

	pxSiv.filt.apply = function ( req, resp ) {
		var fi
			, filts = bpmv.keys( pxsActiveFilters )
			, iter
			, len
			, filtRes;
		if ( !bpmv.obj(req) || !bpmv.obj(resp) ) {
			pxSiv.err( 'filt', 'Bad request or response.' );
			return;
		}
		if ( resp.statusCode >= 400 ) {
			pxSiv.verbose( 'filt', 'Aborted filter chain ('+resp.statusCode+', "'+req.url+'").' )
			return;
		}
		if ( bpmv.arr(filts) ) {
			len = filts.length;
			for ( iter = 0; iter < len; iter++ ) {
				if ( resp.statusCode >= 400 ) {
					pxSiv.verbose( 'filt', '['+filts[iter]+']', 'Broke filter chain ('+resp.statusCode+').' )
					break;
				}
				if ( bpmv.str(filts[iter]) ) {
					fi = pxsActiveFilters[filts[iter]];
					if ( bpmv.obj(fi) && bpmv.func(fi.filter) ) {
						fi.debug( 'Applying filter.' );
						try {
							filtRes = fi.filter( req, resp );
							if ( ( typeof(filtRes) === 'undefined' ) || ( filtRes === null ) ) {
								// skip it (we needed absolute null, not != null)
							} else {
								req.pxsData[filts[iter]] = filtRes;
							}
							req.pxsFilters[filts[iter]] = resp.statusCode;
						} catch ( e ) {
							fi.err( 'Failed to run.', e );
						}
					}
				}
			}
			return req.statusCode;
		}
	};

	pxSiv.filt.remove = function ( filtName ) {
		if ( bpmv.str(filtName) ) {
			pxsActiveFilters[filtName] = null;
		}
		return !bpmv.obj(pxsActiveFilters[filtName]);
	};

	// -----------------------------------------------------------------------------
	// - simple setup
	// -----------------------------------------------------------------------------
	pxSiv.ready( 'http', pxs_init_filt );

	return pxSiv.filt;

})(exports.pxSiv) && (function ( pxSiv ) { // http server section

	/* *****************************************************************************
	* ******************************************************************************
	* HTTP SERVER
	* ******************************************************************************
	***************************************************************************** */

	var bpmv = pxSiv.b
		, pxsHttp = require( 'http' )
		, pxsHttpS = require( 'https' )
		, pxsUgly = require("uglify-js") // http://lisperator.net/uglifyjs/
		, pxsCache = {}
		, pxsServ
		, pxsServS
		, pxsHttpHost
		, pxsHttpPort
		, pxsHttpsPort
		, pxsHttpsCert
		, pxsHttpsKey
		, pxsPxCName = 'http-pixel';

	pxSiv.http = {};

	// -----------------------------------------------------------------------------
	// - internal funcs
	// -----------------------------------------------------------------------------

	function pxs_init_http ( ready, waiting, siv ) {
		var cLife;
		if ( !bpmv.obj(pxsServ) ) {
			pxsHttpHost = bpmv.trim( pxSiv.opt( 'httpHost' ) );
			if ( !bpmv.str(pxsHttpHost) ) {
				pxsHttpHost = '*';
			}
			pxsHttpPort = parseInt( pxSiv.opt( 'httpPort' ), 10 );
			if ( bpmv.num(pxsHttpPort) ) {
				try {
					if ( bpmv.str(pxsHttpHost) && ( pxsHttpHost != '*' ) ) {
						pxsServ = pxsHttp.createServer( pxs_http_handle_request ).listen( pxsHttpPort, pxsHttpHost );
					} else {
						pxsServ = pxsHttp.createServer( pxs_http_handle_request ).listen( pxsHttpPort );
					}
				} catch ( e ) {
					pxSiv.err( 'http', 'HTTP server failed creation on "'+pxsHttpHost+':'+pxsHttpPort+'". '+e );
				}
			} else {
				pxSiv.err( 'http', 'Cannot start HTTP server on host ("'+pxsHttpHost+'") - port ("'+pxsHttpPort+'") is invalid!' );
			}
			if ( !bpmv.obj(pxsServ) ) {
				pxSiv.die( 'Cannot start HTTP server.' );
			} else {
				pxSiv.log( 'http', 'HTTP listening on "'+pxsHttpHost+':'+pxsHttpPort+'".' );
				pxSiv.ready( 'http' );
			}
		}
	};

	function pxs_http_populate_request ( req, resp ) {
		var ip;
		if ( bpmv.obj(req) ) {
			ip = pxs_ip_from_request( req );
			if ( bpmv.str(ip) ) {
				req.pxsData = {};
				req.pxsData['_pxs_ip'] = req.pxsIp;
				req.pxsData['_pxs_url'] = req.url;
				req.pxsData['_pxs_host'] = req.pxsHost;
				req.pxsData['_pxs_epoch'] = req.pxsEpoch;
				req.pxsData['_pxs_filt'] = req.pxsFilters;
				req.pxsEpoch = ''+(pxSiv.epoch());
				req.pxsFilters = {};
				req.pxsHost = pxsHttpHost+':'+pxsHttpPort;
				req.pxsIp = ip;
				resp.pxsEnc = 'utf-8';
				resp.pxsOut = '';
				resp.pxsType = 'text/plain';
			}
		}
		return req;
	}

	function pxs_http_handle_static ( req, resp ) {
		var ret
			, enable = pxSiv.opt( 'httpAllowStatic' )
			, ty
			, cks
			, tmp;
		if ( enable && bpmv.obj(req) && bpmv.obj(resp) ) {
			cks = req.url.split( '?' );
			if ( bpmv.arr(cks) ) {
				switch ( cks[0] ) {
					case '/bpmv.js':
						ret = pxSiv.http.get_bpmv();
						if ( bpmv.str(ret) ) {
							resp.pxsType = 'text/javascript';
						} else {
							resp.statusCode = 404;
							return;
						}
						break;
					case '/favicon.ico':
						ret = pxSiv.http.get_favicon( true );
						if ( bpmv.obj(ret) && bpmv.str(ret.data) ) {
							resp.pxsType = ret.type;
							resp.pxsEnc = 'binary';
							tmp = (60*60*24*28); // leave in cache for about a month
							resp.setHeader( 'Cache-control', 'max-age='+tmp );
							resp.setHeader( 'Expires', new Date(new Date().getTime()+(tmp*1000)).toUTCString() );
							ret = ret.data;
						} else {
							resp.statusCode = 404;
							return;
						}
						break;
					case '/pxsLob.js':
						ret = pxSiv.http.get_lob();
						if ( bpmv.str(ret) ) {
							resp.pxsType = 'text/javascript';
						} else {
							resp.statusCode = 404;
							return;
						}
						break;
					case '/test.html':
						ret = pxSiv.http.get_test_html();
						if ( bpmv.str(ret) ) {
							resp.pxsType = 'text/html';
						} else {
							resp.statusCode = 404;
							return;
						}
						break;
				}
			}
		}
		if ( bpmv.str(ret) ) {
			return ret;
		}
	}

	function pxs_http_handle_request ( req, resp ) {
		var logData
			, px
			, pxType
			, st
			, cooks
			, cookName = pxSiv.opt( 'httpCookieName' )
			, cookNameF = cookName+'_f'
			, xpy
			, exF
			, cookHead = []
			, filtres;
		if ( bpmv.obj(req) && bpmv.obj(resp) ) {
			pxSiv.stats( 'http-requests', 1 );
			pxs_http_populate_request( req, resp );
			if ( bpmv.str(req.headers.cookie) )  {
				cooks = pxSiv.http.cookie_parse( req.headers.cookie );
			}
			if ( bpmv.str(cookName) ) {
				if ( !bpmv.obj(cooks) ) {
					cooks = {};
				}
				if ( !bpmv.str(cooks[cookName]) ) {
					cooks[cookName] = pxSiv.rand( req.url );
				}
				xpy = new Date( new Date().getTime() + (1000 * 60 * 60 * 24 *365 * 5) ).toGMTString();
				cookHead.push( cookName+'='+cooks[cookName]+'; Path=/; Expires='+xpy );
				req.pxsData[cookName] = cooks[cookName];
				exF = req.url.match( /(\?|\&)_f\=([^\&]+)/ )
				if ( bpmv.arr(exF, 3) ) {
					if ( !bpmv.str(cooks[cookNameF]) ) {
						cooks[cookNameF] = exF[2];
					}
				}
				if ( bpmv.str(cooks[cookNameF]) ) {
					cookHead.push( cookNameF+'='+cooks[cookNameF]+'; Path=/; Expires='+xpy );
					req.pxsData[cookNameF] = cooks[cookNameF];
				}
			}
			if ( bpmv.arr(cookHead) ) {
				resp.setHeader( 'Set-Cookie', cookHead );
			}
			resp.setHeader( 'X-pxSiv', pxSiv.version() );
			st = pxs_http_handle_static ( req, resp );
			if ( typeof(st) != 'undefined' ) { // handle static
				pxSiv.stats( 'http-requests-static', 1 );
				resp.pxsOut = st;
			} else if ( resp.statusCode < 400 ) { // handle pixel
				resp.setHeader( 'Cache-control', 'no-cache, must-revalidate' );
				resp.setHeader( 'Pragma', 'no-cache' );
				resp.setHeader( 'Expires', '0' );
				switch ( req.method ) {
					case 'GET':
						if ( pxSiv.opt( 'httpDisallowGet' ) || ( pxSiv.opt( 'httpGetRequired' ) && !( /\?[^=]+\=/ ).test(req.url) ) ) {
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
				filtres = pxSiv.filt.apply( req, resp );
				if ( resp.statusCode < 400 ) {
					// save to DB
					pxSiv.stats( 'http-requests-saved', 1 );
					pxs_http_save_request( req, resp );
					px = pxSiv.http.get_pixel();
					pxType = pxSiv.http.get_pixel_type();
					if ( bpmv.str(px) && bpmv.str(pxType) ) {
						resp.pxsOut = px;
						resp.pxsType = pxType;
						resp.pxsEnc = 'binary';
					}
				}
			} // end handling pixel
			if ( resp.statusCode >= 400 ) {
				resp.setHeader( 'X-PXS-STATUS', pxSiv._httpCodes[resp.statusCode] );
				resp.pxsOut = 'HTTP/'+req.httpVersion+' '+resp.statusCode+' - '+pxSiv._httpCodes[resp.statusCode]+'\n'+resp.pxsOut;
				resp.pxsType = 'text/plain';
			}
			logData = {
				  'server'     : req.pxsHost
				, 'ip'         : req.pxsIp
				, 'status'     : resp.statusCode
				, 'epoch'      : req.pxsEpoch
				, 'keys'       : ( resp.statusCode < 400 ) ? bpmv.count(req.pxsData) : 0
				, 'url'        : req.url
				, 'filters'    : req.pxsFilters
				, 'user-agent' : bpmv.obj(req) && bpmv.obj(req.headers) ? req.headers['user-agent'] : ''
			};
			pxSiv.log( 'http', req.method, logData );
			if ( bpmv.str(resp.pxsType) ) {
				resp.setHeader( 'Content-Type', resp.pxsType );
			}
			if ( bpmv.str(resp.pxsOut) ) {
				resp.write( resp.pxsOut, resp.pxsEnc );
			}
			pxs_http_finish_request( req, resp );
		}
	}

	function pxs_http_finish_request ( req, resp ) {
		resp.end();
	}

	function pxs_http_save_request ( req, resp ) {
		if ( bpmv.obj(req) && bpmv.obj(req.pxsData, true) ) {
			req.pxsData['_pxs_stat'] = resp.statusCode;
			// write the data to db
			pxSiv.db.w( pxSiv.opt.obj_sort( req.pxsData ) );
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
			pxSiv.cache( 'pxsLob.js', null );
			pxSiv.cache( 'test.html', null );
			pxSiv.cache( pxsPxCName, null );
		}
	};

	pxSiv.http.close = function () {
		if ( bpmv.obj(pxsServ) ) {
			pxSiv.log( 'http', 'Shutting down http server on  "'+pxsHttpHost+':'+pxsHttpPort+'".' );
			pxsServ.close();
		}
	};

	pxSiv.http.cookie_parse = function ( dough ) {
		var ar
			, ret
			, iter
			, len
			, kN
			, kV
			, reRex;
		if ( bpmv.str(dough) ) {
			ar = dough.split( /;\s*/ );
			if ( bpmv.arr(ar) ) {
				len = ar.length;
				ret = {};
				for ( iter = 0; iter < len; iter++ ) {
					kN = ar[iter].match( /^[^=]+/ )+'';
					if ( kN !== '' ) {
						reRex = new RegExp( '^'+kN+'=' );
						kV = unescape( ar[iter].replace( reRex, '' ) );
					}
					ret[kN] = ''+kV;
				}
			}
		}
		return ret;
	};

	pxSiv.http.get_bpmv = function () {
		var bpmvPath
			, life = pxSiv.opt( 'httpCacheLife' )
			, mini = pxSiv.opt( 'httpMinifyLob' )
			, bpmvCode = bpmv.num(life) ? pxSiv.cache( 'bpmv.js' ) : null
			, ug
			, ugOpts = {
				  'properties' : false
				, 'unsafe'     : false
				, 'unused'     : false
				, 'warnings'   : false
			};
		if ( !bpmv.str(bpmvCode) ) {
			try {
				bpmvPath = pxSiv.fix_path( pxSiv.root()+'/src/bpmv.js', true );
				if ( bpmv.str(bpmvPath) && pxSiv.fs.existsSync( bpmvPath ) ) {
					//pxsUgly
					bpmvCode = pxSiv.fs.readFileSync( bpmvPath, 'utf-8' );
					if ( mini ) {
						try {
							ug = pxsUgly.parse( bpmvCode );
							ug.figure_out_scope();
							ug.mangle_names();
							if ( ug.transform( pxsUgly.Compressor( ugOpts ) ) ) {
								pxSiv.debug( 'http', 'Uglified "'+bpmvPath+'".' );
								bpmvCode = ug.print_to_string();
							}
						} catch ( e ) {
							pxSiv.debug( 'http', 'Couldn\'t uglify "'+bpmvPath+'".', e );
						}
					}
					if ( bpmv.num(life) ) {
						pxSiv.cache( 'bpmv.js', bpmvCode, life );
						pxSiv.log( 'http', 'Cached bpmv.js from "'+bpmvPath+'".', life );
					}
					return bpmvCode;
				} else {
					pxSiv.err( 'Could not read file "'+bpmvPath+'"!' );
				}
			} catch ( e ) {
				pxSiv.err( 'FS error reading file "src/bpmv.js"' );
			}
		} else {
			return bpmvCode;
		}
	};

	pxSiv.http.get_lob = function () {
		var lobPath
			, life = pxSiv.opt( 'httpCacheLife' )
			, mini = pxSiv.opt( 'httpMinifyLob' )
			, lob = bpmv.num(life) ? pxSiv.cache( 'pxsLob.js' ) : null
			, ug
			, ugOpts = {
				  'properties' : false
				, 'unsafe'     : false
				, 'unused'     : false
				, 'warnings'   : false
			};
		if ( !bpmv.str(lob) ) {
			try {
				lobPath = pxSiv.fix_path( pxSiv.root()+'/src/pxsLob.js', true );
				if ( bpmv.str(lobPath) && pxSiv.fs.existsSync( lobPath ) ) {
					//pxsUgly
					lob = pxSiv.fs.readFileSync( lobPath, 'utf-8' );
					if ( mini ) {
						try {
							ug = pxsUgly.parse( lob );
							ug.figure_out_scope();
							ug.mangle_names();
							if ( ug.transform( pxsUgly.Compressor( ugOpts ) ) ) {
								pxSiv.debug( 'http', 'Uglified "'+lobPath+'".' );
								lob = ug.print_to_string();
							}
						} catch ( e ) {
							pxSiv.debug( 'http', 'Couldn\'t uglify "'+lobPath+'".', e );
						}
					}
					if ( bpmv.num(life) ) {
						pxSiv.cache( 'pxsLob.js', lob, life );
						pxSiv.log( 'http', 'Cached pxsLob.js from "'+lobPath+'".', life );
					}
					return lob;
				} else {
					pxSiv.err( 'Could not read file "'+lobPath+'"!' );
				}
			} catch ( e ) {
				pxSiv.err( 'FS error reading file "src/pxsLob.js"' );
			}
		} else {
			return lob;
		}
	};

	pxSiv.http.get_pixel = function ( asObj ) {
		var pxPath
			, life = pxSiv.opt( 'httpCacheLife' )
			, px = bpmv.num(life) ? pxSiv.cache( pxsPxCName ) : null;
		if ( bpmv.obj(px) && bpmv.str(px.type) ) {
			return asObj ? px : px.data;
		} else {
			pxPath = pxSiv.opt( 'pixel' );
			try {
				if ( bpmv.str(pxPath) && /\.(gif|png|jpg|jpeg)$/i.test( pxPath ) && pxSiv.fs.existsSync( pxPath ) ) {
					px = {
						  'data' : pxSiv.fs.readFileSync( pxPath, 'binary' )
						, 'type' : 'image/'+(pxPath.split( '.' ).pop())
					};
					if ( bpmv.num(life) ) {
						pxSiv.cache( pxsPxCName, px, life );
						pxSiv.log( 'http', 'Cached pixel from "'+pxPath+'".', life );
					}
				} else {
					pxSiv.die( 'Could not read pixel file "'+pxPath+'"!' );
				}
			} catch ( e ) {
				pxSiv.die( 'FS error reading pixel file "'+pxPath+'"! '+e );
			}
		}
		if ( bpmv.obj(px) && bpmv.str(px.data) ) {
			return asObj ? px : px.data;
		}
	};

	pxSiv.http.get_favicon = function ( asObj ) {
		var fiPath
			, life = pxSiv.opt( 'httpCacheLife' )
			, fi = bpmv.num(life) ? pxSiv.cache( 'favicon.ico' ) : null;
		if ( bpmv.obj(fi) && bpmv.str(fi.type) ) {
			return asObj ? fi : fi.data;
		} else {
			fiPath = pxSiv.fix_path( pxSiv.root()+'/data/favicon.ico', true );
			try {
				if ( bpmv.str(fiPath) && /\.(ico|gif|png|jpg|jpeg)$/i.test( fiPath ) && pxSiv.fs.existsSync( fiPath ) ) {
					fi = {
						  'data' : pxSiv.fs.readFileSync( fiPath, 'binary' )
						, 'type' : 'image/x-icon'
					};
					if ( bpmv.num(life) ) {
						pxSiv.cache( 'favicon.ico', fi, life );
						pxSiv.log( 'http', 'Cached pixel from "'+fiPath+'".', life );
					}
				} else {
					pxSiv.die( 'Could not read pixel file "'+fiPath+'"!' );
				}
			} catch ( e ) {
				pxSiv.die( 'FS error reading pixel file "'+fiPath+'"! '+e );
			}
		}
		if ( bpmv.obj(fi) && bpmv.str(fi.data) ) {
			return asObj ? fi : fi.data;
		}
	};

	pxSiv.http.get_test_html = function () {
		var htmlPath
			, life = pxSiv.opt( 'httpCacheLife' )
			, html = bpmv.num(life) ? pxSiv.cache( 'test.html' ) : null;
		if ( !bpmv.str(html) ) {
			try {
				htmlPath = pxSiv.fix_path( pxSiv.root()+'/src/test.html', true );
				if ( bpmv.str(htmlPath) && pxSiv.fs.existsSync( htmlPath ) ) {
					html = pxSiv.fs.readFileSync( htmlPath, 'utf-8' );
					if ( bpmv.num(life) ) {
						pxSiv.cache( 'test.html', html, life );
						pxSiv.log( 'http', 'Cached htmlTest from "'+htmlPath+'".', life );
					}
				} else {
					pxSiv.err( 'Could not read file "'+htmlPath+'"!' );
				}
			} catch ( e ) {
				pxSiv.err( 'FS error reading file "src/pxsLob.js"' );
			}
		}
		return html;
	};

	pxSiv.http.get_pixel_type = function () {
		var px = pxSiv.cache( pxsPxCName )
		if ( !bpmv.obj(px) ) {
			px = pxSiv.http.get_pixel( true );
		}
		if ( bpmv.obj(px) && bpmv.str(px.type) ) {
			return px.type;
		}
	};

	// -----------------------------------------------------------------------------
	// - simple setup
	// -----------------------------------------------------------------------------

	pxSiv.ready( 'db', pxs_init_http );

	return pxSiv.http;

})(exports.pxSiv) && (function ( pxSiv ) { // admin section

	/* *****************************************************************************
	* ******************************************************************************
	* ADMIN SERVER
	* ******************************************************************************
	***************************************************************************** */

	var bpmv = pxSiv.b
		, pxsAuthFile
		, pxsAdmCommands = {}
		, pxsCmdRgx = /[^\s"']+|"([^"]*)"|'([^']*)'/g
		, pxsAdmAuthed = {};

	pxSiv.adm = {};

	// -----------------------------------------------------------------------------
	// - internal funcs
	// -----------------------------------------------------------------------------

	function pxs_init_admin () {
		pxs_adm_open();
	}

	function pxs_adm_cmd_add ( group, cmd, cb ) {
		if ( bpmv.str(group) && bpmv.str(cmd) && bpmv.func(cb) ) {
			if ( bpmv.obj(pxsAdmCommands[cmd]) ) {
				pxSiv.err( 'admin', 'Attempt to add duplicate command aborted.', [ group, cmd, cb.toString().length ] );
			} else {
				pxsAdmCommands[cmd] = {
					  'func'  : cb
					, 'cmd'   : cmd
					, 'group' : group
				};
				return true;
			}
		}
	}

	function pxs_adm_cmd_auth ( sock, cmdObj ) {
	}

	function pxs_adm_cmd_exec ( command, cxt ) {
	/*
		var cmd
			, expl
			, args
			, fRex = /^\s*(.+)\s*\(\s*(.*)\s*\)\s*$/
			, iter
			, len;
		if ( bpmv.str(command) ) {
			cmd = bpmv.trim( bpmv.trim( command, '()' ) );
			if ( fRex.test(cmd) ) {
				expl = (''+cmd).match( fRex );
				if ( bpmv.arr(expl) ) {
					cmd = expl[1];
					if ( bpmv.arr(expl, 3) ) {
						args = expl[2].match( /(?:"(?:[^\x5C"]+|\x5C(?:\x5C\x5C)*[\x5C"])*"|'(?:[^\x5C']+|\x5C(?:\x5C\x5C)*[\x5C'])*'|[^"',\s]+)+/g );
					}
				}
			}
			cxt.sock.write( cmd+' '+(bpmv.arr(args) ? '( '+args.join( ', ' )+' )' : '')+'\r\n' );
			if ( bpmv.obj(pxsAdmCommands[cmd]) && pxs_adm_is_socket( cxt.sock ) ) {
				if ( pxs_adm_cmd_auth( cxt.sock, pxsAdmCommands[cmd] ) ) {
					pxSiv.stats( 'admin-commands', 1 );
					cxt.sock.pxs.hist.push( cmd );
					return pxsAdmCommands[cmd].func( pxSiv, cxt.sock );
				} else {
					return 'You don\'t have permissin to run "'+cmd+'".';
				}
			} else if ( (/^\s*(\#|\/\/)/).test( cmd ) ) {
				cxt.sock.pxs.hist.push( cmd );
			} else {
				return 'Invalid command "'+cmd+'".';
			}
			sock.pxs.hist.push( cmd );
			while ( cxt.sock.pxs.hist.length > pxsAdmCmdHistSize ) {
				cxt.sock.pxs.hist.shift();
			}
		}
	*/
	}

	function pxs_adm_auth ( user, pass, conn ) {
		pxSiv.stats( 'admin-logins', 1 );
	}

	function pxs_adm_load_auth ( file ) {
	}

	function pxs_adm_logout () {
	}

	function pxs_adm_open () {
	}

	// -----------------------------------------------------------------------------
	// - external functions
	// -----------------------------------------------------------------------------

	pxSiv.adm.cmd_add = function ( group, cmd, cb ) {
		return pxs_adm_cmd_add( group, cmd, cb );
	};

	// -----------------------------------------------------------------------------
	// - admin commands
	// -----------------------------------------------------------------------------
	pxSiv.adm.cmd_add( '*', 'logout', pxs_adm_logout );

	pxSiv.adm.cmd_add( '*', 'login', pxs_adm_auth );

	// -----------------------------------------------------------------------------
	// - simple setup
	// -----------------------------------------------------------------------------

	// Don't let anything depend on this because it's optional.
	pxSiv.ready( 'final', pxs_init_admin );

	return pxSiv.adm;

})(exports.pxSiv) && (function ( pxSiv ) { // optset core

	/* *****************************************************************************
	* ******************************************************************************
	* OPTIONS SETS
	* ******************************************************************************
	***************************************************************************** */

	var bpmv = pxSiv.b;

	// -----------------------------------------------------------------------------
	// - core options
	// -----------------------------------------------------------------------------

	pxSiv.opt.create( {
		  'opt'    : 'daemon'
		, 'def'    : false
		, 'flag'   : true
		, 'cli'    : [ 'daemon' ]
		, 'ini'    : 'core.daemon'
		, 'help'   : 'Daemon (silent) mode.'
		, 'todo'   : true
		, 'valid'  : function ( val, isCli ) {
			// this is only set once
			return pxSiv.set_daemon( val );
		}
	} );


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
		, 'flag'  : true
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
		, 'flag'  : true
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
		  'opt'   : 'filtDirs'
		, 'def'   : [ pxSiv.fix_path( pxSiv.root()+'/filters', true ) ]
		//, 'cli'   : [ 'fd', 'filt-dir', 'filters-dir' ]
		, 'ini'   : 'core.filtDirs'
		, 'help'  : 'Comma separated list of filter directories.'
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
		  'opt'   : 'filters'
		, 'def'   : [ 'teapot', 'headers', 'cookies', 'noscript', 'getparms' ]
		, 'cli'   : [ 'f', 'filters' ]
		, 'ini'   : 'core.filters'
		, 'help'  : 'Comma separated list of filters in order of execution.'
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
		  'opt'    : 'debugStatInterval'
		, 'def'    : 60 * 15
		, 'cli'    : [ 'dsi', 'debug-stat-interval' ]
		, 'hidden' : true
		, 'ini'    : 'core.debugStatInterval'
		, 'help'   : 'When in debug mode, how often in seconds to report stats to the log and debug output.'
		, 'valid'  : function ( val, isCli ) {
			var t = parseInt(val, 10);
			if ( bpmv.num(t, true) ) {
				return t;
			} else {
				return '';
			}
		}
	} );

	return pxSiv.opt;

})(exports.pxSiv) && (function ( pxSiv ) { // optset admin

	var bpmv = pxSiv.b;

	// -----------------------------------------------------------------------------
	// - admin server/interface options
	// -----------------------------------------------------------------------------

	pxSiv.opt.create( {
		  'opt'   : 'adminAuthFile'
		, 'def'   : pxSiv.fix_path( pxSiv.root()+'/conf/adminAuth.ini' )
		, 'cli'  : [ 'af', 'auth-file' ]
		, 'ini'  : 'admin.authFile'
		, 'help' : 'The auth file containing user accounts for the admin interface. If missing or no valid accounts are found in it, the admin interface is disabled. Valid accounts must have non-empty passwords.'
		, 'valid' : function ( val, isCli ) {
			if ( bpmv.str(val) ) {
				return bpmv.trim( val );
			}
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

	return pxSiv.opt;

})(exports.pxSiv) && (function ( pxSiv ) { // optset db

	var bpmv = pxSiv.b;

	// -----------------------------------------------------------------------------
	// - DB options - general
	// -----------------------------------------------------------------------------

	pxSiv.opt.create( {
		  'opt'   : 'dbType'
		, 'def'   : 'mongo'
		//, 'cli'   : [ 't', 'db-type' ]
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
		//, 'cli'  : [ 'pm', 'per-month' ]
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
		//, 'cli'  : [ 'tp', 'table-prefix' ]
		, 'ini'  : 'db.tablePrefix'
		, 'help' : 'Prefix for table/collection names.'
		, 'todo' : true
		, 'valid' : function ( val, isCli ) {
			if ( bpmv.str(val) ) {
				return bpmv.trim( val );
			}
		}
	} );

	return pxSiv.opt;

})(exports.pxSiv) && (function ( pxSiv ) { // optset db-w

	var bpmv = pxSiv.b;

	// -----------------------------------------------------------------------------
	// - DB options - write DB
	// -----------------------------------------------------------------------------

	pxSiv.opt.create( {
		  'opt'  : 'dbWriteHost'
		, 'def'  : '127.0.0.1'
		//, 'cli'  : [ 'dbw-h', 'db-write-host' ]
		, 'ini'  : 'db-write.host'
		, 'help' : 'Hostname or IP of database used for writes.'
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
		//, 'cli'  : [ 'dbw-p', 'db-write-port' ]
		, 'ini'  : 'db-write.port'
		, 'help' : 'Port number of database used for writes.'
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
		//, 'cli'  : [ 'dbw-u', 'db-write-user' ]
		, 'ini'  : 'db-write.user'
		, 'help' : 'Authentication user name of database used for writes.'
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
		//, 'cli'  : [ 'dbw-pw', 'db-write-pass' ]
		, 'ini'  : 'db-write.pass'
		, 'help' : 'Authentication password of database used for writes.'
		, 'valid' : function ( val, isCli ) {
			if ( bpmv.str(val, true) ) {
				return bpmv.trim( val );
			} else {
				return '';
			}
		}
	} );

	/*
	pxSiv.opt.create( {
		  'opt'  : 'dbWriteKey'
		, 'def'  : ''
		//, 'cli'  : [ 'dbw-k', 'db-write-key' ]
		, 'ini'  : 'db-write.key'
		, 'help' : 'Authentication key of database used for writes.'
		, 'todo' : true
		, 'valid' : function ( val, isCli ) {
			if ( bpmv.str(val, true) ) {
				return bpmv.trim( val );
			} else {
				return '';
			}
		}
	} );
	*/

	return pxSiv.opt;

})(exports.pxSiv) && (function ( pxSiv ) { // optset db-r

	var bpmv = pxSiv.b;

	// -----------------------------------------------------------------------------
	// - DB options - readDB
	// -----------------------------------------------------------------------------

	pxSiv.opt.create( {
		  'opt'  : 'dbReadHost'
		, 'def'  : ''
		//, 'cli'  : [ 'dbr-h', 'db-read-host' ]
		, 'ini'  : 'db-read.host'
		, 'help' : 'Hostname or IP of database used for reads. If empty, all values (host, IP, authentication) from database for writes will be used.'
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
		//, 'cli'  : [ 'dbr-p', 'db-read-port' ]
		, 'ini'  : 'db-read.port'
		, 'help' : 'Port number of database used for reads.'
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
		//, 'cli'  : [ 'dbr-u', 'db-read-user' ]
		, 'ini'  : 'db-read.user'
		, 'help' : 'Authentication user name of database used for reads.'
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
		//, 'cli'  : [ 'dbr-pw', 'db-read-pass' ]
		, 'ini'  : 'db-read.pass'
		, 'help' : 'Authentication password of database used for reads.'
		, 'valid' : function ( val, isCli ) {
			if ( bpmv.str(val, true) ) {
				return bpmv.trim( val );
			} else {
				return '';
			}
		}
	} );

	/*
	pxSiv.opt.create( {
		  'opt'  : 'dbReadKey'
		, 'def'  : ''
		//, 'cli'  : [ 'dbr-k', 'db-read-key' ]
		, 'ini'  : 'db-read.key'
		, 'help' : 'Authentication key of database used for reads.'
		, 'todo' : true
		, 'valid' : function ( val, isCli ) {
			if ( bpmv.str(val, true) ) {
				return bpmv.trim( val );
			} else {
				return '';
			}
		}
	} );
	*/

	return pxSiv.opt;

})(exports.pxSiv) && (function ( pxSiv ) { // optset http

	var bpmv = pxSiv.b;

	// -----------------------------------------------------------------------------
	// - HTTP server options
	// -----------------------------------------------------------------------------

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
		  'opt'  : 'httpCookieName'
		, 'def'  : 'pxs_id'
		, 'cli'  : [ 'cn', 'cookie-name' ]
		, 'ini'  : 'http.cookieName'
		, 'help' : 'Name of the identification cookie to use.'
		, 'valid' : function ( val, isCli ) {
			var t = (''+val).replace( /[^a-z0-9\_\/\.\-\+]+/i, '_' );
			if ( bpmv.str(t) ) {
				return t;
			} else {
				return '';
			}
		}
	} );

	pxSiv.opt.create( {
		  'opt'  : 'httpCacheLife'
		, 'def'  : 60 * 60 * 3
		//, 'cli'  : [ 'hcl', 'http-cache-life' ]
		, 'ini'  : 'http.cacheLife'
		, 'help' : 'Lifetime in seconds of static objects in the HTTP cache. Set to 0 or empty to disable cache (ill-advised).'
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
		  'opt'  : 'httpAllowStatic'
		, 'def'  : true
		, 'ini'  : 'http.allowStatic'
		, 'help' : 'Whether or not to serve the files test.html and pxsLob.js.'
		, 'valid' : function ( val, isCli ) {
			return bpmv.trueish( val );
		}
	} );

	pxSiv.opt.create( {
		  'opt'  : 'httpMinifyLob'
		, 'def'  : true
		, 'ini'  : 'http.minifyLob'
		, 'help' : 'Whether or not to minify the pxsLob.js client library using Uglify-js.'
		, 'valid' : function ( val, isCli ) {
			return bpmv.trueish( val );
		}
	} );

	pxSiv.opt.create( {
		  'opt'  : 'httpGetRequired'
		, 'def'  : false
		, 'cli'  : [ 'g', 'get-required' ]
		, 'ini'  : 'http.getRequired'
		, 'help' : 'Whether or not to require HTTP GET requests (such as "/foo?getParm=stuff") for all requests. If you want to just require some, then use a filter.'
		, 'valid' : function ( val, isCli ) {
			return bpmv.trueish( val );
		}
	} );

	pxSiv.opt.create( {
		  'opt'  : 'httpDisallowGet'
		, 'def'  : false
		, 'cli'  : [ 'ng', 'no-get' ]
		, 'ini'  : 'http.disallowGet'
		, 'help' : 'Do not allow requests with GET parameters (such as "/foo?getParm=stuff").'
		, 'valid' : function ( val, isCli ) {
			return bpmv.trueish( val );
		}
	} );

	return pxSiv.opt;

})(exports.pxSiv) && (function ( pxSiv ) { // optset special cli flags

	var bpmv = pxSiv.b;

	// -----------------------------------------------------------------------------
	// - stuff strictly for cli flags - functionality, not real configuration
	// -----------------------------------------------------------------------------

	pxSiv.opt.create( {
		  'opt'  : '_help'
		, 'def'  : false
		, 'cli'  : [ '?', 'h', 'help' ]
		, 'flag' : true
		, 'help' : 'Show help and exit.'
		, 'valid' : function ( val, isCli ) {
			if ( isCli ) {
				pxSiv.opt.show_cli_help();
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
			pxSiv.p.exit( 0 );
		}
	} );

	return pxSiv.opt;

})(exports.pxSiv) && (function ( pxSiv ) { // ready optsets

	// -----------------------------------------------------------------------------
	// - internal funcs
	// -----------------------------------------------------------------------------

	function pxs_init_optset () {
		pxSiv.ready( 'optset' );
	}

	// -----------------------------------------------------------------------------
	// - simple setup
	// -----------------------------------------------------------------------------

	pxSiv.ready( 'core', pxs_init_optset );

	return pxSiv.opt;

})(exports.pxSiv) && (function ( pxSiv ) { // sundries section

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

	return pxSiv._httpCodes;

})(exports.pxSiv) && (function ( pxSiv ) { // runtime section

	/* *****************************************************************************
	* ******************************************************************************
	* RUNTIME
	* ******************************************************************************
	***************************************************************************** */

	pxSiv.init();

})(exports.pxSiv);