/*
* A simplified "hello world" filter
*/
(function(){
	var cookFilt = {}
		, pxSiv
		, bpmv;

	cookFilt.init = function ( pxs ) {
		// Let's save pxSiv to the local scope.
		pxSiv = pxs;
		bpmv = pxSiv.b;
		pxSiv.log( 'filt', 'Filter cookies.js initialized.' );
	};

	cookFilt.filter = function ( req, resp ) {
		var jar = {}
			, dough;
		if ( !bpmv.obj(req) || ( resp.statusCode >= 400 ) ) {
			// already an error status, skip filtering
			return false;
		}
		dough = req.headers.cookie;
		if ( bpmv.str(dough) ) {
console.log( 'dough', dough );
		}
	};

	exports.pxsFilter = cookFilt;
})();