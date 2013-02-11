/*
* A simplified "hello world" filter
*/
(function(){
	var cookFilt = {};

	cookFilt.filter = function ( req, resp ) {
		if ( resp.statusCode >= 400 ) {
			// already an error status, skip filtering
			return false;
		}
		console.log( __filename+' pxsFilter - Filtering data! Woohoo!' );
	};

	exports.pxsFilter = cookFilt;
})();