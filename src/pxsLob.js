/*
* The client side of pxSiv
*/
(function(doc){

	if ( typeof(pxsLob) != 'undefined' ) {
		throw 'pxsLob.js loaded twice!';
		return;
	}

	var pxsLob = {}
		, pxsLobLoc
		, pxsPixelLife = 1000 * 5
		, pxsPixels = []
		, pxsPoll
		, pxsPollInterval = 1000 * 30 // in miliseconds
		, pxsPolls = 0
		, pxsPxQueue = []
		, pxsPxQueueToRetry = 10
		, pxsScrIam =doc.getElementsByTagName( 'script' )
		, pxsStamp = new Date().getTime()
		, pxsPxLoc
		, pxsRexCleanA = /[^a-z0-9\_\-\/\.]+/ig
		, pxsRexCleanB = /(^\/|[\/\.]+$)/
		, pxsRexParseUrl = /^([^\:]+):\/\/([^\/]+)/
		, pxsRexRescape = /[\-\[\]{}()*+?.,\\\^$|#\s]/g
		, pxsRexUnserialA = /^.*\?/
		, pxsRexUnserialB = /^([^=]+)=(.*)$/
		, navi = navigator
		, win = window
		, srn = win.screen;

	function count ( obj ) {
		if ( is_arr(obj) && is_num(obj.length) ) {
			return obj.length;
		}
		var cnt = 0;
		if ( is_obj(obj) ) {
			for ( var bAtz in obj ) {
				if ( obj.hasOwnProperty(bAtz) ) {
					++cnt;
				}
			}
		}
		return cnt;
	}

	function get_f () {
		var np
			, ret = '';
		for ( var i in navi ) {
			if ( is_str(navi[i]) ) {
				ret += navi[i];
			}
		}
		np = navi.plugins;
		for ( var iter = 0; iter < np.length; iter++ ) {
			ret += serialize( np[i] );
		}
		if ( is_obj(srn) ) {
			ret += serialize( srn );
		}
		return Sha256( ret );
	}

	function get_loc () {
		var loc;
		if ( is_obj(pxsLobLoc) ) {
			return pxsLobLoc;
		}
		if ( type_is(pxsScrIam, 'NodeList') && is_num(pxsScrIam.length) ) {
			loc = {}
			loc.script = parse_url( ''+pxsScrIam[pxsScrIam.length - 1].src );
			loc.page = parse_url( ''+document.location );
			if ( is_obj(loc.script) ) {
				if ( is_str(loc.script.host) ) {
					pxsPxLoc = is_str(loc.script.proto) ? loc.script.proto+'://' : 'http://';
					pxsPxLoc += loc.script.host;
				}
			}
			loc.base = ''+pxsPxLoc;
		}
		pxsLobLoc = is_obj(loc) ? loc : {};
		return pxsLobLoc;
	}

	function init () {
		// reconcile location
		var loc = get_loc()
			, dat = {};
		// assign to "global" scope
		window.pxsLob = pxsLob;
		// log our usage
		if ( is_obj(loc.script) ) {
			dat.loc = loc.script;
		}
		dat.page_ref = document.referrer;
		dat.page = document.location;
		dat._f = get_f();
		pxsLob.data( 'pxsLob.js_load', dat );
		// set our poll interval
		if ( !is_obj(pxsPoll) && is_num(pxsPollInterval) ) {
			pxsPoll = setInterval( poll, pxsPollInterval );
		}
		poll();
	}

	function is_arr ( arr, cnt ) {
		if ( is_bool(cnt) ) {
			return Boolean( is_obj( arr ) && ( Object.prototype.toString.call( arr ) === '[object Array]' ) && ( cnt || (arr.length > 0) ) );
		} else if ( !isNaN( cnt ) && ( cnt > -1 ) ) {
			return Boolean( is_obj( arr ) && ( Object.prototype.toString.call( arr ) === '[object Array]' ) && ( arr.length == parseInt(cnt, 10) ) );
		} else {
			return Boolean( is_obj( arr ) && ( Object.prototype.toString.call( arr ) === '[object Array]' ) && ( arr.length > 0 ) );
		}
	}

	function is_bool ( bl ) {
		return ( typeof(bl) == 'boolean' );
	}

	function is_func ( vl ) {
		return ( typeof(vl) === 'function' );
	}

	function is_num ( obj, zOk ) {
		var it = parseFloat(obj);
		if ( ( typeof(obj) == 'undefined' ) || ( type_is( obj, 'String' ) && ( obj == '' ) ) || ( obj === null ) ) {
			return false;
		}
		if ( !isNaN(obj) ) {
			if ( type_is( zOk, 'Number' ) ) {
				return ( it > zOk );
			} else {
				return ( zOk || ( it > 0 ) );
			}
		}
		return false;
	}

	function is_obj ( obj, pop ) {
		return ( obj !== null ) && ( typeof(obj) === 'object' ) && ( !pop || (count(obj) > 0) );
	}

	function is_str ( str, zOk ) {
		return ( typeof(str) === 'string' ) && ( zOk || ( str.length > 0 ) );
	}

	function parse_url ( url ) {
		var url
			, urlArr
			, ret
			, tM;
		if ( is_str(url) ) {
			switch ( url.indexOf( '?' ) ) {
				case -1:
					urlArr = [ url ];
					break;
				case 0:
					urlArr = [ '', url ];
					break;
				default:
					urlArr = url.split( /\?/ );
					break;
			}
			if ( is_arr(urlArr) ) {
				ret = {
						'proto' : null
					, 'host'  : null
				};
				tM = (''+urlArr[0]).match( pxsRexParseUrl );
				if ( is_arr(tM, 3) ) {
					ret.proto = ''+tM[1];
					ret.host = ''+tM[2];
					urlArr[0] = (''+urlArr[0]).replace( new RegExp( rescape( tM[0] ) ), '' );
				}
				ret.path = is_str(urlArr[0]) ? ''+urlArr[0] : null;
				ret.parms = is_str(urlArr[1]) ? unserial( urlArr[1] ) : null;
			}
		}
		if ( is_obj(ret) ) {
			return ret;
		}
	}

	function poll () {
		var iter
			, old;
		pxsLob.data( 'poll', {
				'ref'  : ''+document.referrer
			, 'page' : ''+document.location
			, 'num'  : pxsPolls
		} );
		pxsPolls++;
		if ( is_arr(pxsPxQueue) && is_num(pxsPxQueueToRetry) ) {
			for ( iter = 0; iter < pxsPxQueueToRetry; iter++ ) {
				old = null;
				if ( is_arr(pxsPxQueue) ) {
					old = pxsPxQueue.shift();
				}
				if ( is_arr(old, 2) ) {
					px_fire.apply( this, old );
				}
			}
		}
	}

	function px_fire ( uri, cb ) {
		var idx
			, px;
		if ( is_str(uri) ) {
			px = {
				'ele' : document.createElement( 'img' )
			};
			if ( is_obj(px.ele) ) {
				idx = pxsPixels.push( px ) - 1;
				px.idx = 0 + idx;
				px.ele.onload = function () {
					if ( is_func(cb) ) {
						cb.apply( this, arguments );
					}
					setTimeout( function () {
						px_kill( idx );
					}, pxsPixelLife );
				};
				px.ele.onerror = function () {
					var src = this.src;
					if ( is_str(src) ) {
						pxsPxQueue.push( [ this.src, cb ] );
					}
					px_kill( idx );
				};
				px.ele.src = uri;
				px.uri = uri;
				return px;
			}
		}
	}

	function px_kill ( idx ) {
		pxsPixels[idx] = null;
		//console.log( 'killed'+idx, pxsPixels );
	}

	function rescape ( rex ) {
		if ( !is_str(rex) ) {
			return rex; // not a string? just return it
		}
		return String(rex).replace( pxsRexRescape, "\\$&");
	}

	function serialize ( obj ) {
		var out = [];
		if ( !is_obj(obj) ) {
			return '';
		}
		for ( var vic in obj ) {
			if ( obj.hasOwnProperty( vic ) ) {
				if ( is_arr(obj[vic]) ) {
					out.push.apply( out, obj[vic].map( function ( witness ) {
							return encodeURIComponent(vic+'[]') +'='+ encodeURIComponent(witness);
						} ) );
				} else if ( is_obj(obj[vic]) ) {
					out.push( encodeURIComponent( vic )+'='+encodeURIComponent(serialize(obj[vic])) );
				} else if ( !is_func(obj[vic]) ) {
					out.push( encodeURIComponent( vic )+'='+encodeURIComponent( obj[vic] ) );
				}
			}
		}
		return ( count(out) > 0 ) ? out.join( '&' ) : false;
	}

	function Sha256 (s) {
		var chrsz   = 8
			, hexcase = 0;
		function safe_add (x, y) {
			var lsw = (x & 0xFFFF) + (y & 0xFFFF)
				, msw = (x >> 16) + (y >> 16) + (lsw >> 16);
			return (msw << 16) | (lsw & 0xFFFF);
		}
		function S (X, n) { return ( X >>> n ) | (X << (32 - n)); }
		function R (X, n) { return ( X >>> n ); }
		function Ch(x, y, z) { return ((x & y) ^ ((~x) & z)); }
		function Maj(x, y, z) { return ((x & y) ^ (x & z) ^ (y & z)); }
		function Sigma0256(x) { return (S(x, 2) ^ S(x, 13) ^ S(x, 22)); }
		function Sigma1256(x) { return (S(x, 6) ^ S(x, 11) ^ S(x, 25)); }
		function Gamma0256(x) { return (S(x, 7) ^ S(x, 18) ^ R(x, 3)); }
		function Gamma1256(x) { return (S(x, 17) ^ S(x, 19) ^ R(x, 10)); }
		function core_sha256 (m, l) {
			var K = new Array(0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5, 0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3, 0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174, 0xE49B69C1, 0xEFBE4786, 0xFC19DC6, 0x240CA1CC, 0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA, 0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7, 0xC6E00BF3, 0xD5A79147, 0x6CA6351, 0x14292967, 0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13, 0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85, 0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3, 0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070, 0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5, 0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3, 0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208, 0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2)
				, HASH = new Array(0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19)
				, W = new Array(64)
				, a, b, c, d, e, f, g, h, i, j
				, T1, T2;
			m[l >> 5] |= 0x80 << (24 - l % 32);
			m[((l + 64 >> 9) << 4) + 15] = l;
			for ( var i = 0; i<m.length; i+=16 ) {
				a = HASH[0];
				b = HASH[1];
				c = HASH[2];
				d = HASH[3];
				e = HASH[4];
				f = HASH[5];
				g = HASH[6];
				h = HASH[7];
				for ( var j = 0; j<64; j++) {
					if (j < 16) W[j] = m[j + i];
					else W[j] = safe_add(safe_add(safe_add(Gamma1256(W[j - 2]), W[j - 7]), Gamma0256(W[j - 15])), W[j - 16]);
					T1 = safe_add(safe_add(safe_add(safe_add(h, Sigma1256(e)), Ch(e, f, g)), K[j]), W[j]);
					T2 = safe_add(Sigma0256(a), Maj(a, b, c));
					h = g;
					g = f;
					f = e;
					e = safe_add(d, T1);
					d = c;
					c = b;
					b = a;
					a = safe_add(T1, T2);
				}
				HASH[0] = safe_add(a, HASH[0]);
				HASH[1] = safe_add(b, HASH[1]);
				HASH[2] = safe_add(c, HASH[2]);
				HASH[3] = safe_add(d, HASH[3]);
				HASH[4] = safe_add(e, HASH[4]);
				HASH[5] = safe_add(f, HASH[5]);
				HASH[6] = safe_add(g, HASH[6]);
				HASH[7] = safe_add(h, HASH[7]);
			}
			return HASH;
		}
		function str2binb (str) {
			var bin = Array()
				, mask = (1 << chrsz) - 1;
			for(var i = 0; i < str.length * chrsz; i += chrsz) {
				bin[i>>5] |= (str.charCodeAt(i / chrsz) & mask) << (24 - i%32);
			}
			return bin;
		}
		function Utf8Encode(string) {
			string = string.replace(/\r\n/g,"\n");
			var utftext = "";
			for (var n = 0; n < string.length; n++) {
				var c = string.charCodeAt(n);
				if (c < 128) {
					utftext += String.fromCharCode(c);
				}
				else if((c > 127) && (c < 2048)) {
					utftext += String.fromCharCode((c >> 6) | 192);
					utftext += String.fromCharCode((c & 63) | 128);
				}
				else {
					utftext += String.fromCharCode((c >> 12) | 224);
					utftext += String.fromCharCode(((c >> 6) & 63) | 128);
					utftext += String.fromCharCode((c & 63) | 128);
				}
			}
			return utftext;
		}
		function binb2hex (binarray) {
			var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef"
				, str = "";
			for(var i = 0; i < binarray.length * 4; i++) {
				str += hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8+4)) & 0xF) +
				hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8  )) & 0xF);
			}
			return str;
		}
		s = Utf8Encode(s);
		return binb2hex(core_sha256(str2binb(s), s.length * chrsz));
	}

	function type_is ( thing, type ) {
		if ( ( typeof(thing) != 'undefined' ) && is_str(type) ) {
			if ( Object.prototype.toString.call( thing ) === '[object ' + type + ']' ) {
				return true;
			} else if ( is_obj( thing ) && ( thing.constructor.name == type ) ) { // fall back to constructor name
				return true;
			} else {
				return false;
			}
		}
		return; // undef
	}

	function unserial ( str ) {
		var ret = {}
			, st
			, spl
			, iter
			, cnk
			, len;
		if ( is_str(str) ) {
			st = (''+str).replace( pxsRexUnserialA, ''); // forcefully get rid of the query delim and all before it
			spl = st.split( '&' );
			len = spl.length;
			for ( iter = 0; iter < len; iter++ ) {
				if ( is_str(spl[iter]) ) {
					cnk = spl[iter].match( pxsRexUnserialB );
					if ( cnk ) {
						if ( is_str(cnk[1]) && is_str(cnk[2]) ) {
							ret[cnk[1]] = cnk[2];
						}
					}
				}
			}
		}
		return ( count(ret) > 0 ) ? ret : undefined;
	}

	// log data via a pixel
	pxsLob.data = function ( cat, data, cb ) {
		var px
			, dt = {}
			, iter
			, loc
			, catClean;
		if ( !bpmv.str(cat) ) {
			cat = 'general';
		}
		catClean = escape( cat.replace( pxsRexCleanA, '_' ) ).replace( pxsRexCleanB, '' );
		if ( is_obj(data, true) ) {
			for ( iter in data ) {
				if ( data.hasOwnProperty(iter) ) {
					dt[iter] = data[iter];
				}
			}
		}
		dt._cat = cat;
		dt._delta = new Date().getTime() - pxsStamp;
		loc = pxsPxLoc+'/'+catClean+'.gif';
		if ( is_str(loc) ) {
			px_fire( loc+(loc.indexOf( '?' ) > -1 ? '&' : '?' )+serialize(dt), cb );
		}
	}

	// load an arbitrary image
	// it is assumed that the parms and other data
	// are already part of the URI
	pxsLob.img = function ( uri, cb ) {
		var px = px_fire( uri, cb );
		if ( is_obj(px) ) {
			pxsLob.data( 'pxLob.js_img', { 'uri' : uri } )
		}
	}

	init();

})(document);