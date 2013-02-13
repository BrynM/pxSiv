/*
* Save all get parms as data
*/
(function(){

	var getParmsFilt = {}
		, getParmsFiltDebug = false
		, pxSiv
		, bpmv
		, fileName = (''+__filename).replace( /^.*[\/\\]/, '' );

	getParmsFilt.init = function ( pxs ) {
		// Let's save pxSiv to the local scope.
		pxSiv = pxs;
		bpmv = pxSiv.b;
	};

	getParmsFilt.filter = function ( req, resp ) {
		var parms;
		if ( resp.statusCode >= 400 ) {
			return;
		}
		// explode the parms
		parms = bpmv.unserial( (''+req.url).replace( /^[^\?]+\?/, '' ) );
		if ( bpmv.obj(parms, true) ) {
			if ( getParmsFiltDebug ) {
				pxSiv.debug( 'filt', 'Filter '+fileName+' added '+bpmv.count(parms)+' cookies to data.' );
			}
			return parms;
		}
	};

	exports.pxsFilter = getParmsFilt;

})();