/*
 * Varlink 0.0.1
 * Copyright (c) 2013 KOBAYASHI Mitsuru
 * https://github.com/kobayashim/varlink
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */

var Varlink = function(target, opt) {
  opt = $.extend(
    {
      escape    : true,
      unescape  : false,
      callback  : null,
      delimiter : ',',
    }, opt || {}
  );

  this.target = target;
  this.opt = opt;
  this.val = {};

  var self = this;
  $('[data-varlink]', target).bind('change', function() {
    self.refresh($(this));
  });
};

Varlink.prototype.refresh = function(obj) {
  var data = {};
  data[obj.data('varlink')] = this._getFormData(obj);
  this.set(data);

  if (this.opt.callback) {
    this.opt.callback(obj.data('varlink'), this.val);
  };
};

Varlink.prototype.get = function(key) {
  this._trimVal();
  if (key) {
    return (this.val[key]) ? this.val[key] : null;
  } else {
    return this.val;
  };
};

Varlink.prototype.set = function(data) {
  for (var key in data) {
    this.val[key] = data[key];
    this._change(key);
  };
};

Varlink.prototype.del = function(key) {
  delete this.val[key];
  this._change(key);
};

Varlink.prototype.clear = function() {
  this.val = {};
  var self = this;
  $('[data-varlink]', this.target).each(function() {
    self._change($(this).data('varlink'));
  });
};

Varlink.prototype._trimVal = function() {
  for (var key in this.val) {
    if (this.val[key] == null || this.val[key] == '') {
      delete this.val[key];
    } else {
      if (this._getType(this.val[key]) == 'Array') {
        if (this.val[key].length == 1) {
          this.val[key] = this._parseNumber(this.val[key][0]);
        } else {
          for(var i = 0; i < this.val[key].length; i++) {
            this.val[key][i] = this._parseNumber(this.val[key][i]);
          };
        }
      } else {
        this.val[key] = this._parseNumber(this.val[key]);
      };
    };
  };
};

Varlink.prototype._parseNumber = function(val) {
        return (isFinite(val)) ? val - 0 : val;
};

Varlink.prototype._getFormData = function(obj) {
  var self = this;
  if (obj[0].type == 'radio' || obj[0].type == 'checkbox') {
    var val = [];
    $('[data-varlink=' + obj.data('varlink') + ']', self.target).each(function(){
      if ($(this).prop('checked')) {
        val.push($(this).val());
      };
    });
    switch (val.length) {
      case 0:
        return null;
        break;
      case 1:
        return val[0];
        break;
      default:
        return val;
        break;
    };
  } else {
    return obj.val();
  };
  return null;
};

Varlink.prototype._change = function(key) {
  var self = this;

  $('[data-varlink=' + key + ']', this.target).each(function(){
   var val = self.val[key];
   var obj = $(this);

    if (val == null || val == '') {
      val = obj.data('varlink-default') ? obj.data('varlink-default') : null;
    } else {
      if (obj.data('varlink-trim')) {
        try {
          eval('var func = ' + obj.data('varlink-trim'));
          val = func(val);
        } catch (e) {
        };
      };
    };

    switch (this.nodeName) {
      case 'SELECT':
        obj.prop('selectedIndex', -1);
        if (val !== null) {
          obj.val(val);
        };
        break;
      case 'TEXTAREA':
      case 'INPUT':
        if (this.type == 'radio' || this.type == 'checkbox') {
          obj.prop('checked', false);
          obj.val((self._getType(val) == 'Array') ? val : [val]);
        } else {
          obj.val((self.opt.unescape) ? $('<div>').html((self._getType(val) == 'Array') ? val.join(self.opt.delimiter) : val).text() : val);
        };
      default:
        val = (self._getType(val) == 'Array') ? val.join(self.opt.delimiter) : val;
        if (val == null) {
          val = '';
        };
        obj.html((self.opt.escape) ? $('<div>').text(val).html() : val);
        break;
    };
  });
};

Varlink.prototype._getType = function(obj) {
  return Object.prototype.toString.call(obj).slice(8, -1);
};
