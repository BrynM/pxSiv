/*
* A cookie parsing filter
*/
(function(){

	var cookFilt = {}
		, cookFiltDebug = false
		, pxSiv
		, bpmv;

	cookFilt.debugMode = false;

	cookFilt.init = function ( pxs ) {
		// Let's save pxSiv to the local scope.
		pxSiv = pxs;
		bpmv = pxSiv.b;
	};

	cookFilt.filter = function ( req, resp ) {
		var jar = {};
		if ( resp.statusCode >= 400 ) {
			return;
		}
		jar = pxSiv.http.cookie_parse( req.headers.cookie );
		if ( bpmv.obj(jar, true) ) {
			if ( cookFiltDebug ) {
				this.debug( 'Filter added '+bpmv.count(jar)+' cookies to data.' );
			}
			return jar;
		}
	};

	exports.pxsFilter = cookFilt;

})();