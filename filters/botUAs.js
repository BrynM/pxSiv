/*
* remove bot user agents
*/
(function(){
	var botUAsFilt = {}
		, pxSiv
		, bpmv;

	botUAsFilt.init = function ( pxs ) {
		// Let's save pxSiv to the local scope.
		pxSiv = pxs;
		bpmv = pxSiv.b;
	};

	botUAsFilt.filter = function ( req, resp ) {
		var ua
			, uaTests = {
				  'gen-bot' : /robot|search/
				, 'google'  : /(google.+(robot|slurp|crawler|slurp|search)|googlebot)/i
				, 'yahoo'   : /yahoo.+(robot|slurp|crawler|slurp|search)/i
			}
			, iter;
		if ( resp.statusCode >= 400 ) {
			return;
		}
		if ( bpmv.obj(uaTests) && bpmv.obj(req) && bpmv.obj(req.headers) && bpmv.str(req.headers['user-agent']) ) {
			ua = req.headers['user-agent'];
			for ( iter in uaTests ) {
				if ( bpmv.typeis( uaTests[iter], 'RegExp' ) && uaTests[iter].test(ua) ) {
					this.log( 'Rejected bot user-agent "'+iter+'".' );
					resp.statusCode = 400;
					pxSiv.stats( 'bot-uas-rejected', 1 );
					break;
				}
			}
		}
	};

	exports.pxsFilter = botUAsFilt;
})();