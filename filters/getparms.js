/*
* Save all get parms as data
*/
(function(){

	var getParmsFilt = {}
		, getParmsFiltDebug = false
		, pxSiv
		, bpmv;

	getParmsFilt.debugMode = false;

	getParmsFilt.init = function ( pxs ) {
		// Let's save pxSiv to the local scope.
		pxSiv = pxs;
		bpmv = pxSiv.b;
	};

	getParmsFilt.filter = function ( req, resp ) {
		var countGet = 0
			, countUtm = 0
			, parms
			, get = {}
			, utm = {};
		if ( resp.statusCode >= 400 ) {
			return;
		}
		// explode the parms
		parms = bpmv.unserial( (''+req.url).replace( /^[^\?]+\?/, '' ) );
		for ( var p in parms ) {
			if ( bpmv.str(p) ) {
				p = decodeURIComponent( p );
				if ( ( p.toLowerCase().indexOf( 'utm_' ) === 0 ) && parms.hasOwnProperty(p) ) {
					countUtm++;
					utm[p] = decodeURIComponent( parms[p] );
				} else {
					countGet++;
					get[p] = decodeURIComponent( parms[p] );
				}
			}
		}
		if ( bpmv.num(countUtm) ) {
			this.debug( 'Filter added '+countUtm+' utm parameters to data.' );
			// store UTM codes separately
			req.pxsData['getutm'] = utm;
		}
		if ( bpmv.num(countGet) ) {
			if ( getParmsFiltDebug ) {
				this.debug( 'Filter added '+countGet+' get parameters to data.' );
			}
			return get;
		}
	};

	exports.pxsFilter = getParmsFilt;

})();