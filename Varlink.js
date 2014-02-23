/*
 * Varlink 0.1.0
 * Copyright (c) 2013-2014 KOBAYASHI Mitsuru
 * https://github.com/kobayashim/varlink
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */

var Varlink = function Varlink(target, opt) {
    opt = opt || {};

    // デフォルト設定
    var d = {
        escape          : true,
        unescape        : false,
        callback        : null,
        select_default  : -1,
        duplicate       : false,
        delimiter       : ',',
    };
    for (var key in d) {
        if (opt[key] == undefined) {
            opt[key] = d[key];
        };
    };

    // UID生成
    var uid = null;
    while (uid == null) {
        uid = 'varlink-' + (Math.round(Math.random() * 10000000000) + 1).toString();
        if (document.getElementsByClassName(uid).length > 0) {
            uid = null;
        };
    };

    this.target = target;
    this.opt = opt;
    this.val = {};
    this.uid = uid;

    this.init();
};

// 初期化
Varlink.prototype.init = function() {
    return this.bind().refresh();
};

// イベントの設定
Varlink.prototype.bind = function() {
    var self = this;

    // 変更イベントを作成
    if (!self.change_function) {
        self.change_function = function() {
            var key = this.dataset.varlink;
            self._get_form_data(key)._change(key);

            // コールバック設定がある場合は実施
            if (this.dataset.varlinkCallback) {
                try {
                    eval('var func = ' + this.dataset.varlinkCallback);
                    func(key, self.getNotRefresh(key), self);
                } catch (e) {
                };
            };
        };
    };

    // セレクタ用クラスを設定し、変更イベントを設定
    $('[data-varlink]', $(this.target)).addClass(self.uid).unbind('change', self.change_function).bind('change', self.change_function).each(function() {
        $(this).addClass(self.uid + '-' + this.dataset.varlink);
    });

    // データ全項目再表示
    for (var key in self.val) {
        self._change(key);
    };

    return this;
};

// データのリフレッシュ
Varlink.prototype.refresh = function() {
    var self = this;

    var got = {};
    var elms = document.getElementsByClassName(self.uid);
    for (var i = 0; i < elms.length; i++) {
        var key = elms[i].dataset.varlink;
        if (!got[key]) {
            self._get_form_data(key)._change(key);
            got[key] = true;
        };
    };

    return this;
};

// データの設定
Varlink.prototype.set = function(data) {
    for (var key in data) {
        var val = (this._getObjectType(data[key]) == 'Array') ? data[key] : [data[key]];
        for (var i = 0; i < val.length; i++) {
            if (this._getObjectType(val[i]) == 'String') {
                val[i] = this._unescape(val[i]);
                val[i] = this._parseNumber(val[i]);
            };
        };
        this.val[key] = (this.opt.duplicate) ? val.sort() : this._removeDuplicate(val).sort();
        this._change(key);
    };

    return this;
};

// データの取得(リフレッシュなし)
Varlink.prototype.get = function(key) {
    if (key) {
        if (!this.val[key] || this.val[key].length == 0) {
            return null;
        } else if (this.val[key].length == 1) {
            return this.val[key][0];
        } else {
            return this.val[key];
        };
    } else {
        var val = {};
        for (var key in this.val) {
            if (!this.val[key] || this.val[key].length == 0) {
            } else if (this.val[key].length == 1) {
                val[key] = this.val[key][0];
            } else {
                val[key] = this.val[key];
            };
        };
        return val;
    };
};

// データの取得
Varlink.prototype.getWithRefresh = function(key) {
    return this.refresh().get(key);
};

// データの削除
Varlink.prototype.del = function(key) {
    delete this.val[key];
    this._change(key);

    return this;
};

// データのクリア
Varlink.prototype.clear = function() {
    var self = this;

    self.val = {};
    var changed = {};
    var elms = document.getElementsByClassName(self.uid);
    for (var i = 0; i < elms.length; i++) {
        if (!changed[elms[i].dataset.varlink]) {
            self._change(elms[i].dataset.varlink);
            changed[elms[i].dataset.varlink] = true;
        };
    };

    return this;
};

// データによる表示切り替え
Varlink.prototype._change = function(key) {
    var self = this;
    var val = self.val[key];

    // 対象エレメントを取得しエレメント毎に処理
    var elems = document.getElementsByClassName(self.uid + '-' + key);
    for (var i = 0; i < elems.length; i++) {
        var elm = elems[i];
 
        // 値のプレ設定
        if (!val || val.length == 0) {
            // 値が存在せず、デフォルト設定があった場合はその値で設定、なければ空配列
            if (elm.dataset.varlinkDefault) {
                val = [elm.dataset.varlinkDefault];
            } else {
                val = [];
            };
        } else if (elm.dataset.varlinkTrim) {
            // 値が存在して、trim設定があった場合は各値に対してtirm実行
            try {
                eval('var func = ' + elm.dataset.varlinkTrim);
                val = val.map(func);
            } catch (e) {
            };
        };

        // 対象エレメントのタグで処理を変更
        switch(elm.nodeName) {
            case 'SELECT' : 
                var opts = elm.getElementsByTagName('option');
                for (var j = 0; j < opts.length; j++) {
                    opts[j].selected = ((val.length > 0 && val.indexOf(self._parseNumber(opts[j].value)) >= 0) || (val.length == 0 && j == self.opt.select_default)) ? true : false;
                };
                break;
            case 'TEXTAREA' : 
            case 'INPUT' : 
                if (elm.type == 'checkbox' || elm.type == 'radio') {
                    elm.checked = (val.length > 0 && val.indexOf(self._parseNumber(elm.value)) >= 0) ? true : false;
                } else {
                    var str = val.join(self.opt.delimiter) || '';
                    elm.value = (self.opt.unescape) ? self._unescape(str) : str;
                };
                break;
            default : 
                var str = val.join(self.opt.delimiter) || '';
                elm.innerHTML = (self.opt.escape) ? self._escape(str) : str;
                break;
        };
    };

    return this;
};

// フォームデータの取得
Varlink.prototype._get_form_data = function(key) {
    var self = this;

    // 対象エレメントを取得しエレメント毎に処理
    var val = [];
    var elems = document.getElementsByClassName(self.uid + '-' + key);
    for (var i = 0; i < elems.length; i++) {
        var v = [];
        var elm = elems[i];

        // 対象エレメントのタグで処理を変更
        switch(elm.nodeName) {
            case 'SELECT' : 
                var opts = elm.getElementsByTagName('option');
                for (var j = 0; j < opts.length; j++) {
                    if (opts[j].selected) {
                        v.push(opts[j].value);
                    };
                };
                break;
            case 'TEXTAREA' : 
            case 'INPUT' : 
                if (elm.type == 'checkbox' || elm.type == 'radio') {
                    if (elm.checked && elm.value != '') {
                        v.push(elm.value);
                    };
                } else {
                    if (elm.value != '') {
                        v.push(elm.value);
                    };
                };
                break;
            default : 
                break;
        };

        // 値が存在する場合は、pre設定があれば実行して、なければそのままデータに追加
        if (v.length > 0) {
            if (elm.dataset.varlinkPre) {
                try {
                    eval('var func = ' + elm.dataset.varlinkPre);
                    v = v.map(func);
                } catch (e) {
                };
            };
            val = val.concat(v);
        };
    };

    if (val.length > 0) {
        self.val[key] = (self.opt.duplicate) ? val.map(self._parseNumber).sort() : self._removeDuplicate(val.map(self._parseNumber)).sort();
    } else {
        delete self.val[key];
    };

    return this;
};

// エスケープ
Varlink.prototype._escape = function(str) {
    return str.replace(/[&<>"]/g, function(match) {
        return {
            '&' : '&amp;',
            '<' : '&lt;',
            '>' : '&gt;',
            '"' : '&quot;',
        }[match];
    });
};

// アンエスケープ
Varlink.prototype._unescape = function(str) {
    return str.replace(/&(amp|lt|gt|quot);/g, function(match) {
        return {
            '&amp;'  : '&',
            '&lt;'   : '<',
            '&gt;'   : '>',
            '&quot;' : '"',
        }[match];
    });
};

// オブジェクトタイプを取得
Varlink.prototype._getObjectType = function(obj) {
    return Object.prototype.toString.call(obj).slice(8, -1);
};

// 数値は数値に変換
Varlink.prototype._parseNumber = function(val) {
    return (isFinite(val)) ? val - 0 : val;
};

// 重複削除
Varlink.prototype._removeDuplicate = function(ary) {
    return ary.filter(function (a, i, self) {
        return self.indexOf(a) === i;
    });
};

