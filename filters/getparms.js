/*
* Save all get parms as data
*/
(function(){

	var getParmsFilt = {}
		, getParmsFiltDebug = false
		, pxSiv
		, bpmv
		, reserved;

	getParmsFilt.init = function ( pxs ) {
		// Let's save pxSiv to the local scope.
		pxSiv = pxs;
		bpmv = pxSiv.b;
		reserved = pxSiv.get_reserved();
		pxSiv.log( 'filt', 'Filter cookies.js initialized.' );
	};

	getParmsFilt.filter = function ( req, resp ) {
		var parms
			, count = 0;
		if ( bpmv.obj(req) && bpmv.obj(req.pxsData) ) {
			// explode the parms
			parms = bpmv.unserial(  (''+req.url).replace( /^[^\?]+\?/, '' ) );
			if ( bpmv.obj(parms, true) ) {
				for ( var p in parms ) {
					if ( bpmv.str(p) && parms.hasOwnProperty(p) ) {
						count++;
						if ( bpmv.arr(reserved) && bpmv.num(bpmv.find( p, reserved ), true) ) {
							req.pxsData['_pxsRenamed_'+p] = parms[p];
						} else {
							req.pxsData[p] = parms[p];
						}
					}
				}
			}
			if ( getParmsFiltDebug && bpmv.num(count) ) {
				pxSiv.debug( 'filt', 'Filter getparms.js added '+count+' GET parameters to data.' );
			}
		}
	};

	exports.pxsFilter = getParmsFilt;

})();