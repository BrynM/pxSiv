/*
* Detect noscript from get parm
*/
(function(){
	var nsFilt = {}
		, pxSiv;

	nsFilt.init = function ( pxs ) {
		// Let's save pxSiv to the local scope.
		pxSiv = pxs;
	};

	nsFilt.filter = function ( req, resp ) {
		if ( resp.statusCode >= 400 ) {
			return;
		}
		if ( /\?.*noscript\=/i.test( req.url ) ) {
			pxSiv.stats( 'noscript-requests', 1 );
			return true;
		}
	};

	exports.pxsFilter = nsFilt;
})();