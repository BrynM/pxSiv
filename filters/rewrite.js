/*
* simple RegExp rewrites
*/
(function(){
	var rewriteFilt = {}
		, rewriteFiltRules = {}
		, pxSiv
		, bpmv;

	rewriteFilt.debugMode = false;

	rewriteFilt.init = function ( pxs ) {
		pxSiv = pxs;
		bpmv = pxSiv.b;
		/* SAMPLE REWRITE
		// redirect / to an image keeping get parms intact
		rewriteFilt.add_rule( '/px.gif$1', [
			  /^\/(\?.*)?$/
		 	, /^(\?.*)?$/
		] );
		*/
	};

	rewriteFilt.add_rule = function ( path, rex ) {
		var st;
		if ( bpmv.str(path) ) {
			if ( bpmv.typeis( rex, 'RegExp' ) ) {
				st = [ rex ];
			} else if ( bpmv.arr(rex) ) {
				set = Array.apply( null, rex );
			}
			if ( bpmv.arr(set) ) {
				rewriteFiltRules[path] = set;
			}
		}
		return set;
	};

	rewriteFilt.filter = function ( req, resp ) {
		var ua
			, iter
			, iRex
			, len
			, newU;
		if ( resp.statusCode >= 400 ) {
			return;
		}
		if ( bpmv.obj(rewriteFiltRules) && bpmv.obj(req) && bpmv.str(req.url) && bpmv.obj(resp) ) {
			for ( iter in rewriteFiltRules ) {
				if ( bpmv.str(iter) && bpmv.arr(rewriteFiltRules[iter]) ) {
					len = rewriteFiltRules[iter].length;
					for ( var iRex = 0; iRex < len; iRex++ ) {
						if ( bpmv.typeis( rewriteFiltRules[iter][iRex], 'RegExp' ) && rewriteFiltRules[iter][iRex].test(req.url) ) {
							resp.setHeader( 'Location', req.url.replace( rewriteFiltRules[iter][iRex], iter ) );
							resp.statusCode = 302;
							pxSiv.stats( 'rewrite', 1 );
							return { 'rewrite' : iter };
						}
					}
				}
			}
		}
	};

	exports.pxsFilter = rewriteFilt;

})();