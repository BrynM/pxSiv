/*
* A simplified "hello world" filter
*/
(function(){
	var nsFilt = {}
		, pxSiv;

	nsFilt.init = function ( pxs ) {
		// Let's save pxSiv to the local scope.
		pxSiv = pxs;
		pxSiv.log( 'filt', 'Filter noscript.js initialized.' );
	};

	nsFilt.filter = function ( req, resp ) {
		if ( resp.statusCode >= 400 ) {
			// already an error status, skip filtering
			return false;
		}
		if ( /\?.*noscript\=/i.test( req.url ) ) {
			req.pxsData['noscript'] = true;
		}
	};

	exports.pxsFilter = nsFilt;
})();