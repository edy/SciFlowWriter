var $ = require('ep_etherpad-lite/static/js/rjquery').$; // use jQuery

exports.postAceInit = function (hook_name, args, cb) {
  $('<div id="widgetcontainerbox"><div class="widget-column"></div><span class="vertical-rule-main"></span><span class="vertical-rule-corner-top"></span><span class="vertical-rule-corner-bottom"></span></div>').insertAfter('#editorcontainerbox');
  $('<link rel="stylesheet" type="text/css" href="/static/plugins/ep_sciflowwriter/static/css/widgets.css">').appendTo("head");
}