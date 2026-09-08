(function ($, Drupal, drupalSettings) {
  "use strict";

  var loading = false, scroll_load;

  function loadmoreNotify(page,renderElm) {
    if (page === undefined) page = 1;
    if (!loading) {
      loading = true;
      $.get(Drupal.url('account/notifications?_format=json&page=' + page))
        .done(function (data) {
          loading = false;
          console.log('Notify respon: ', data);
          if (typeof data === 'string') data = JSON.parse(data);
          for (var i in data) {
            var notify = data[i];
            if (renderElm[0].tagName === 'DIV') {
              var read_class = parseInt( notify.read ) === 0 ? 'unread' : '';
              var tmp = '<div data-id="'+ notify.id +'" class="order-item ' + read_class + '" data-toggle="tab" data-target="#order-id1">\n' +
                '  <a href="#">' + notify.title + '<span class="date">' + notify.created + '</span></a>\n' +
                '</div>';
            } else {
              var read_class = notify.unread === 1 ? 'not-seen' : '';
              var tmp = '<li class="'+ read_class +'" data-id="'+ notify.id +'">\n' +
                '  <div data-toggle="tab" data-target="#order-id1" class="clearfix">\n' +
                '    <div class="order-item">'+ notify.title +'</div>\n' +
                '    <div class="date">'+ notify.created +'</div>\n' +
                '  </div>\n' +
                '</li>';
            }
            renderElm.append(tmp);
          }
          renderElm.children('.fa').remove();
          renderElm.data('page', page + 1);
          renderElm.closest('.orders-column').children('.fa').remove();
          try {
            renderElm.parent().getNiceScroll().resize();
          } catch (e) {
            console.log(e);
          }
        });
    }
  }

  Drupal.behaviors.iot_notification = {
    attach: function attach(context, settings) {

      /*if ($('.user-notifications .icon-notification-mb .number').length && $('.user-notification .icon-notification .number').length) {
        $('.user-notifications .icon-notification-mb .number').html($('.user-notification .icon-notification .number').html());
      }*/
      //For mobile
      if ($('.notifi-popup-mobile').length) {
        $('.icon-notification-mb').click(function(event) {
          if (!$('#notification-tabs .order-item').length) loadmoreNotify(0, $('#notification-tabs'));
          $('#notification-tabs').on('click', '.order-item', function (e) {
            e.preventDefault();
            var $this = $(this);
            $this.parent().hide();
            $('.notifi-popup-mobile .title').addClass('active');
            $('.notifi-popup-mobile .table-order-content').find('.order-title').html('');
            $('.notifi-popup-mobile .table-order-content').find('.time').html('');
            $('.notifi-popup-mobile .table-order-content').find('.container-mess-order').html('');
            $.get(Drupal.url('account/notification/' + $this.data('id') + '?_format=json'))
              .done(function (data) {
                loading = false;
                if (typeof data === "string") data = JSON.parse(data);
                $('.notifi-popup-mobile .table-order-content').find('.order-title').html(data.title);
                $('.notifi-popup-mobile .table-order-content').find('.time').html(data.created);

                //Remove style and script tag before render
                var bodyTxt = document.createElement('div');
                bodyTxt.innerHTML = data.body;
                $(bodyTxt).find('script').remove();
                $(bodyTxt).find('meta').remove();
                $(bodyTxt).find('link[rel="stylesheet"]').remove();
                $(bodyTxt).find('style').remove();

                $('.notifi-popup-mobile .table-order-content').find('.container-mess-order').html(bodyTxt);

                //Update message was read
                if (data.read !== 1) {
                  $.post(Drupal.url('account/notification/' + data.id), {read: 1})
                    .done(function (read_updated) {
                      if (read_updated == 1) {
                        $this.removeClass('unread');
                        if ($('.user-notification-wrap li[data-notify="' + data.id + '"]').length) {
                          $('.user-notification-wrap li[data-notify="' + data.id + '"]').remove();
                          if ($('.user-notification-wrap li.notify-item').length > 0) {
                            $('li.user-notification .icon-notification .number').html($('.user-notification-wrap li.notify-item').length);
                          } else {
                            $('li.user-notification .icon-notification .number').html('');
                          }
                        }
                      }
                    });
                }
              });
          });
        });

        $('#notification-tabs').on('mousewheel, wheel', function (e) {
          if (this.scrollTop === this.scrollHeight) {
            if (scroll_load) clearTimeout(scroll_load);
            scroll_load = setTimeout(function () {
              if (!$(this).find('.fa-spin').length) $(this).append('<i class="fa fa-spin fa-circle-o-notch" aria-hidden="true"></i>');
              loadmoreNotify($(this).data('page'), $('.notifi-cont-wrap .nav-tabs'));
            }, 400);
          }
        });

        if ($('.notifi-popup-mobile .table-order-content').find('.container-mess-order').length && settings.notify_detail !== undefined) {
          //Remove style and script tag before render
          var bodyTxt = document.createElement('div');
          bodyTxt.innerHTML = settings.notify_detail.body;
          $(bodyTxt).find('script').remove();
          $(bodyTxt).find('meta').remove();
          $(bodyTxt).find('link[rel="stylesheet"]').remove();
          $(bodyTxt).find('style').remove();
          $('.notifi-popup-mobile .table-order-content').find('.container-mess-order').html(bodyTxt);
        }
      }

      if ($('.notifi-cont-wrap').length) {
        //Load first notify
        if (!$('.notifi-cont-wrap .nav-tabs > li.active').length) {
          setTimeout(function () {
            $('.notifi-cont-wrap .nav-tabs > li:first-child').trigger('click');
          }, 300);
        }
        //
        $('.notifi-cont-wrap .orders-column').niceScroll();
        $('.notifi-cont-wrap .orders-column ul').on('mousewheel, wheel', function (e) {
            if (this.closest('.orders-column').scrollTop + this.closest('.orders-column').offsetHeight > $('.notifi-cont-wrap .nav-tabs')[0].scrollHeight - 5) {
                if (!$(this).closest('.orders-column').find('.fa-spin').length) $(this).closest('.orders-column').append('<i class="fa fa-spin fa-circle-o-notch" aria-hidden="true"></i>');
                if($(this).data('page') == 0){
                    setTimeout(function(){
                        // your code.
                        loadmoreNotify(1, $(this));
                     }.bind(this), 1000);

                }else {
                    setTimeout(function(){
                        // your code.
                        loadmoreNotify($(this).data('page'), $(this));
                     }.bind(this), 1000);
                }
            }
        });
//        $('.notifi-cont-wrap .orders-column').on('mousewheel, wheel', function (e) {
//          if (this.scrollTop + this.offsetHeight === $('.notifi-cont-wrap .nav-tabs')[0].scrollHeight) {
//              loadmoreNotify($(this).data('page'), $(this));
//
////            if (scroll_load) clearTimeout(scroll_load);
////            scroll_load = setTimeout(function () {
////              if (!$(this).find('.fa-spin').length) $(this).append('<i class="fa fa-spin fa-circle-o-notch" aria-hidden="true"></i>');
////              loadmoreNotify($(this).data('page'), $(this));
////            }, 400);
//          }
//        });

        $('.notifi-cont-wrap .nav-tabs').on('click', 'li', function (e) {
          if (!loading) {
            loading = true;
            $('.notifi-cont-wrap .nav-tabs li.active').removeClass('active');
            var $this = $(this);
            if (!$this.hasClass('active')) {
              $this.addClass('active');
              $.get(Drupal.url('account/notification/' + $this.data('id') + '?_format=json'))
                .done(function (data) {
                  loading = false;
                  if (typeof data === "string") data = JSON.parse(data);
                  $('.notifi-cont-wrap .table-order-content').find('.order-title').html(data.title + '<span class="time">' + data.created + '</span>');

                  //Remove style and script tag before render
                  var bodyTxt = document.createElement('div');
                  bodyTxt.innerHTML = data.body;
                  $(bodyTxt).find('script').remove();
                  $(bodyTxt).find('meta').remove();
                  $(bodyTxt).find('link[rel="stylesheet"]').remove();
                  $(bodyTxt).find('style').remove();

                  $('.notifi-cont-wrap .table-order-content').find('.container-mess-order').html(bodyTxt);

                  //Update message was read
                  if (data.read !== 1) {
                    $.post(Drupal.url('account/notification/' + data.id), {read: 1})
                      .done(function (read_updated) {
                        if (read_updated == 1) {

                           if(($this).hasClass('not-seen')) {
                            var unread_cnt = $('li.user-notification .icon-notification .number').html();
                                if( unread_cnt > 1 ) {
                                    $('li.user-notification .icon-notification .number').html(unread_cnt-1);
                                }else {
                                    $('li.user-notification .icon-notification .number').html('');
                                }
                                $this.removeClass('not-seen');
                          }

                          if ($('.user-notification-wrap li[data-notify="' + data.id + '"]').length) {
//                            $('.user-notification-wrap li[data-notify="' + data.id + '"]').remove();
                            if ($('.user-notification-wrap li.notify-item').length > 0) {
//                              $('li.user-notification .icon-notification .number').html($('.user-notification-wrap li.notify-item').length);
                            }
                            else {
                              $('li.user-notification .icon-notification .number').html('');
                            }
                          }
                        }
                      });
                  }
                });
            }
          }
        });

        if ($('.notifi-cont-wrap .table-order-content').find('.container-mess-order').length && settings.notify_detail !== undefined) {
          //Remove style and script tag before render
          var bodyTxt = document.createElement('div');
          bodyTxt.innerHTML = settings.notify_detail.body;
          $(bodyTxt).find('script').remove();
          $(bodyTxt).find('meta').remove();
          $(bodyTxt).find('link[rel="stylesheet"]').remove();
          $(bodyTxt).find('style').remove();
          $('.notifi-cont-wrap .table-order-content').find('.container-mess-order').html(bodyTxt);
        }
      }

    }
  }

})(jQuery, Drupal, drupalSettings);
;
(function ($, Drupal, drupalSettings) {
  Drupal.behaviors.Notify = {
    attach: function (context, settings) {
      var menu_tab = $('.page.product-variation .variation-menu ul');
      var timerIntervals;
      var type;
      // Check type product;
      type = 'all';
      if (typeof type === "undefined") {
        return false;
      }
      $(menu_tab.find('li a.writing')).click(function (e) {
        type = 'writing';
      });
      $(menu_tab.find('li a.speaking')).click(function (e) {
        type = 'speaking';
      });
      $(menu_tab.find('li a.best-seller')).click(function (e) {
        type = 'all';
      });

      // function notifyProduct() {
      //   // Check id tab menu product;
      //   var tab_id = 'sv-best-seller';
      //   if (type == 'speaking') {
      //     tab_id = 'sv-speaking';
      //   }
      //   else if (type == 'writing') {
      //     tab_id = 'sv-writing';
      //   }
      //   var lang = '';
      //   if (drupalSettings.language !== '' && drupalSettings.language !== undefined && drupalSettings.language !== 'en') {
      //     lang = '/' + drupalSettings.language;
      //   }
      //   $.get("/notify/callback", function (data, status) {
      //     if (status == 'success') {
      //       var js = JSON.stringify(data);
      //       var obj = JSON.parse(js);
      //       if (typeof obj.name != 'undefined' && typeof obj.message != 'undefined' && typeof obj.time != 'undefined') {
      //         $('.sale-notification').html('<div class="sale-notification__top"><img class="sale-notification__flag" src="/themes/iot/images/flags/' + obj.country + '.svg" alt=""><h6 class="sale-notification__name-wrap"><span class="sale-notification__name">' + obj.name + '</span><em>' + Drupal.t('has just bought') + '</em></h6><div class="sale-notification__time">' + Drupal.t('now') + '</div> </div><div class="sale-notification__body">' + Drupal.t('Evaluation service for ') + obj.message + '</div>');
      //
      //         if (jQuery('.notify--product').length) {
      //           var length = jQuery('#' + tab_id + ' .notify--product').length;
      //           for (let i = 1; i <= length; i++) {
      //             var pro_type = jQuery('#' + tab_id + ' .notify--product:nth-child(' + i + ')').attr("data-pro-type");
      //             if (obj.type == pro_type) {
      //               $('#' + tab_id + ' .notify--product:nth-child(' + i + ') .user-just-purchase-warpper').html('<div class="user-just-purchase"><div class="prep-purchase-wrapper" data-pro-id="' + obj.id + '"><img class="sale-notification__flag" src="/themes/iot/images/flags/' + obj.country + '.svg" alt=""><div class="user-just-purchase__text"><strong>' + obj.name + '</strong> ' + Drupal.t('has just bought it!') + '</div></div></div>');
      //             }
      //           }
      //         }
      //         if ($('.sale-notification').find('.content-notify a').length && window.innerWidth < 768) {
      //           var href = $('.sale-notification').find('.content-notify a').attr('href');
      //           $('.sale-notification').find('.content-notify a').attr('href', '#' + href);
      //         }
      //
      //         $('.sale-notification').removeClass('is-active');
      //         setTimeout(function () {
      //           $('#' + tab_id + ' .notify--product .user-just-purchase').remove();
      //           $('.sale-notification .sale-notification__top').remove();
      //           $('.sale-notification .sale-notification__body').remove();
      //           $('.sale-notification').addClass('is-active');
      //         }, 6000);
      //       }
      //     }
      //   });
      // }

      if (!($('.page-node-type-quiz').length || $('form.examiner-evaluation-form').length || $('form.tutor-evaluation-form').length)) {
        // timerIntervals = setInterval(function () {
        //   if ($(context).length && $(context)[0].nodeName == '#document') {
        //     notifyProduct();
        //   }
        // }, 120000);
      }

      $('body').on('click', 'a.notify-close', function (e) {
        e.preventDefault();
        $('.sale-notification').fadeOut('slow');
      });
    }
  }
})(jQuery, Drupal, drupalSettings);
;
