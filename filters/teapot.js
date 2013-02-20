/*
* This is a testing filter which can be used for things like load balancer status checks.
* It returns HTTP status 418 "I'm a teapot (RFC 2324)"
*/
(function(){

	var teapotFilter = {}
		, pxSiv
		, bpmv
		, stats;

	teapotFilter.output = '';

	teapotFilter.init = function ( pxs ) {
		pxSiv = pxs;
		bpmv = pxSiv.b;
	};

	function ret_stat ( stat ) {
		if ( bpmv.obj(stats) ) {
			if ( bpmv.num(stats[stat], true) || bpmv.str(stats[stat]) ) {
				return stats[stat];
			}
		}
		return 0;
	}

	teapotFilter.filter = function ( req, resp ) {
		if ( resp.statusCode >= 400 ) {
			return;
		}
		if ( /^\/teapot(\/.*)?/.test( req.url ) ) {
			stats = pxSiv.stats();
			resp.statusCode = 418;
			resp.pxsOut += '\n';
			resp.pxsOut += 'cache expired = '+ret_stat('cache-expired')+'\n';
			resp.pxsOut += 'cache hit = '+ret_stat('cache-hit')+'\n';
			resp.pxsOut += 'cache miss = '+ret_stat('cache-miss')+'\n';
			resp.pxsOut += 'cache set = '+ret_stat('cache-set')+'\n';
			resp.pxsOut += 'memory = '+stats.memory+'M\n';
			resp.pxsOut += 'requests = '+ret_stat('http-requests')+'\n';
			resp.pxsOut += 'static requests = '+ret_stat('http-requests-static')+'\n';
			resp.pxsOut += 'uptime = '+ret_stat('uptime-msec')+'msec ('+ret_stat('uptime-human')+')\n';
			resp.pxsOut += '\n';
			return 'teapot';
		}
	};

	// This is required!!!
	exports.pxsFilter = teapotFilter;

})();