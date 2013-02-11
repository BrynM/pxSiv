/*
* A simplified "hello world" filter
*/
(function(){
	var cookFilt = {}
		, pxSiv;

	cookFilt.init = function ( pxs ) {
		// Let's save pxSiv to the local scope.
		pxSiv = pxs;
		pxSiv.log( 'filt', 'Filter cookies.js initialized.' );
	};

	cookFilt.filter = function ( req, resp ) {
		if ( resp.statusCode >= 400 ) {
			// already an error status, skip filtering
			return false;
		}
	};

	exports.pxsFilter = cookFilt;
})();