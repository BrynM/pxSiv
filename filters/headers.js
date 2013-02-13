/*
* Save all but select headers as data
*/
(function(){

	var headersFilt = {}
		, headersFiltDebug = false
		, pxSiv
		, bpmv;

	headersFilt.init = function ( pxs ) {
		// Let's save pxSiv to the local scope.
		pxSiv = pxs;
		bpmv = pxSiv.b;
	};

	headersFilt.filter = function ( req, resp ) {
		var count = 0
			, headers = {}
			, skipHeaders = [
				  'accept'
				, 'accept-charset'
				, 'accept-encoding'
				, 'cache-control'
				, 'cookie'
				, 'connection'
			];
		if ( resp.statusCode >= 400 ) {
			return;
		}
		if ( bpmv.obj(req) && bpmv.obj(req.headers, true) ) {
			for ( var p in req.headers ) {
				if ( bpmv.str(p) && req.headers.hasOwnProperty(p) && !bpmv.num(bpmv.find( p, skipHeaders ), true ) ) {
					count++;
					headers[p] = req.headers[p];
				}
			}
			if ( bpmv.obj(headers, true) ) {
				if ( headersFiltDebug ) {
					this.debug( 'Filter added '+count+' GET parameters to data.' );
				}
				return headers;
			}
		}
	};

	exports.pxsFilter = headersFilt;

})();