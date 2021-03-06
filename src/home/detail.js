/**
 * @file Network detail dialog
 * @author zdying
 */
'use srtict';

window.networkDetail = window.ND = {
  $el: null,

  netWorkInfo: null,

  init: function () {
    let $el = this.$el = $('#js-network-detail');
    
    // Close network detail dialog
    $el.on('click', '.close', this.hide.bind(this));

    $el.on('click', 'header .tab', function (eve) {
      let $curr = $(eve.currentTarget);
      let data = $curr.data();
      let role = data.role;
      if (role === 'request') {
        this.renderRequest();
      } else if (role === 'response') {
        this.renderResponse();
      } else if (role === 'preview') {
        this.renderPreview();
      }

      $curr.parent().find('.tab.active').removeClass('active');
      $curr.addClass('active');
    }.bind(this));

    let startLeft = 0;
    let startX = 0;

    // Network detail dialog resizer
    $el.find('#js-spliter').on('mousedown', function (eve) {
      startLeft = parseInt($el.css('left'), 10);
      startX = eve.pageX;
      return false;
    }.bind(this));

    $(document).on('mousemove', function (eve) {
      if (!startX) {
        return;
      }

      let pageX = eve.pageX;
      let dx = pageX - startX;
      let left = startLeft + dx;

      $el.css('left', left);

      return false;
    }.bind(this));

    $(document).on('mouseup', function (eve) {
      startX = 0;
      startLeft = 0;
    }.bind(this));

    // Show detail dialog when click network table row
    window.$eve.on('itemclick.table', function (eve, data) {
      this.show(data);
    }.bind(this));
  },

  show: function (info) {
    if (!info || typeof info !== 'object') {
      throw Error('window.networkDetail.show(info) -> `info` should not be empty.'); 
    }
    this.netWorkInfo = info;

    let resContentType = info.res.headers['content-type']; 

    this.$el.find('header .tab.preview').hide();
    if (resContentType && resContentType.indexOf('json') > -1) {
      this.$el.find('header .tab.preview').show();
    }
    let role = this.$el.find('header .tab.active').data('role');
    if (role === 'request') {
      this.renderRequest();
    } else if (role === 'response') {
      this.renderResponse();
    } else if (role === 'preview') {
      this.$el.find('header .tab.active').removeClass('active');
      this.$el.find('header .tab[data-role=request]').addClass('active');
      this.renderRequest();
    }

    this.$el.removeClass('hide');
    window.$eve.trigger('show.detail');
  },

  hide: function () {
    this.$el.addClass('hide');
    this.netWorkInfo = null;
    this.$el.find('header .tab.active').removeClass('active');
    this.$el.find('header .tab').first().addClass('active');
    window.$eve.trigger('hide.detail', {});
  },

  renderPreview: function () {
    let netWorkInfo = this.netWorkInfo;
    let id = netWorkInfo.id;
    let resContentType = netWorkInfo.res.headers['content-type'];

    $.ajax('/fetchresponse?reqId=' + id + '&contentType=' + resContentType, {dataType: 'text'})
    .then(function (body, status, xhr) {
      let json = JSON.parse(xhr.responseText);
      let $body = this.$el.find('section.body');

      $body.html('<div class="json-preview"></div>');

      jsonv(
        $body.find('.json-preview').scrollTop(0)[0],
        json
      )
    }.bind(this));
  },

  renderRequest: function () {
    let info = this.netWorkInfo;

    let {req, res, proxy, urlInfo, queryObject, originalReq, originalRes} = info;
    let generalInfo = {
      'Request URL': urlInfo.href,
      'Proxy URL': proxy.url || '',
      'Request Method': req.method,
      'Status Code': res.statusCode || '',
      'Remote Address': proxy.hostname || ''
    };
    let html = [
      this.renderSection('General', generalInfo, true, generalInfo),
      this.renderSection('Request Headers', req.headers, true, originalReq.headers),
      this.renderSection('Response Headers', res.headers, true, originalRes.headers),
    ];

    if (queryObject && queryObject.object) {
      html.push(
        this.renderSection(queryObject.keyName, queryObject.object, false)
      )
    }
    html.join('');

    this.$el.find('section.body').scrollTop(0).html(html);
  },

  renderSection: function (title, info, fixKey, originalInfo) {
    let html = [
      `<h3 class="group-header">${title}</h3>`,
      `<ul class="list">`,
    ];
    let isAddedByHiproxy = false;

    fixKey = fixKey !== false;

    for (let key in info) {
      isAddedByHiproxy = !originalInfo || (originalInfo[key] !== info[key]);
      html.push(
        `<li ${isAddedByHiproxy ? 'by-hiproxy="true" title="Added/Modified by hiproxy"' : ''}><strong>${fixKey ? this.fixKey(key) : key}:</strong> <span>${info[key]}</span></li>`
      )
    }

    html.push(`</ul>`);

    return html.join('');
  },

  fixKey: function (key) {
    return key.replace(/^\w|-\w/g, match => match.toUpperCase());
  },

  renderResponse: function () {
    let netWorkInfo = this.netWorkInfo;
    let {res} = netWorkInfo;
    let regImg = /png|jpg|jpeg|gif|webp|bmp|svg|ico|icon/;
    let id = netWorkInfo.id;
    let resContentType = res.headers['content-type'] || '';

    if (netWorkInfo.req.method === 'CONNECT') {
      return this._renderResponse('');
    }

    if (resContentType.match(regImg)) {
      return this._renderResponse('<img src="' + '/fetchresponse?reqId=' + id + '&contentType=' + resContentType + '"/>')
    }

    $.ajax('/fetchresponse?reqId=' + id + '&contentType=' + resContentType, {dataType: 'text'})
    .then(function (body, status, xhr) {
      let text = xhr.responseText;
      this._renderResponse('<pre>' + text.replace(/</g, '&lt;') + '</pre>', resContentType);
    }.bind(this));
  },

  _renderResponse: function (body, contentType) {
    this.$el.find('section.body').scrollTop(0).scrollLeft(0).html(body);

    if (!contentType) {
      return;
    }
    let type = contentType.split(';')[0];

    if (/(html|css|javascript|json)/.test(type)) {
      setTimeout(() => {
        let $code = this.$el.find('section.body pre');
        $code.addClass(type.split('/')[1]);
        hljs.highlightBlock($code[0]);
      }, 10);
    }
  }
};
