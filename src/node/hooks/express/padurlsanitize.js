var padManager = require('../../db/PadManager');
var url = require('url');

exports.expressCreateServer = function (hook_name, args, cb) {
  //redirects browser to the pad's sanitized url if needed. otherwise, renders the html
  args.app.param('pad', function (req, res, next, padId) {
    //ensure the padname is valid and the url doesn't end with a /
    if(!padManager.isValidPadId(padId) || /\/$/.test(req.url))
    {
      res.send('Such a padname is forbidden', 404);
    }
    else
    {
      padManager.sanitizePadId(padId, function(sanitizedPadId) {
	//the pad id was sanitized, so we redirect to the sanitized version
	if(sanitizedPadId != padId)
	{
          var real_url = sanitizedPadId;
          var query = url.parse(req.url).query;
          if ( query ) real_url += '?' + query;
	  res.header('Location', real_url);
	  res.send('You should be redirected to <a href="' + real_url + '">' + real_url + '</a>', 302);
	}
	//the pad id was fine, so just render it
	else
	{
	  next();
	}
      });
    }
  });
}
