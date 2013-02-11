/*
* A cookie parsing filter
*/
(function(){

	var cookFilt = {}
		, cookFiltDebug = false
		, pxSiv
		, bpmv;

	function parse_cookie ( dough ) {
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
	}

	cookFilt.init = function ( pxs ) {
		// Let's save pxSiv to the local scope.
		pxSiv = pxs;
		bpmv = pxSiv.b;
		pxSiv.log( 'filt', 'Filter cookies.js initialized.' );
	};

	cookFilt.filter = function ( req, resp ) {
		var jar = {};
		if ( !bpmv.obj(req) || ( resp.statusCode >= 400 ) ) {
			// already an error status, skip filtering
			return false;
		}
		jar = parse_cookie( req.headers.cookie );
		if ( bpmv.obj(jar, true) ) {
			req.pxsData['cookies'] = jar;
			if ( cookFiltDebug && bpmv.num(count) ) {
				pxSiv.debug( 'filt', 'Filter cookies.js added '+bpmv.count(jar)+' cookies to data.' );
			}
		}
	};

	exports.pxsFilter = cookFilt;

})();