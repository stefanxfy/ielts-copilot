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
/*! jQuery Validation Plugin - v1.19.0 - 11/28/2018
 * https://jqueryvalidation.org/
 * Copyright (c) 2018 Jörn Zaefferer; Licensed MIT */
!function(a){"function"==typeof define&&define.amd?define(["jquery"],a):"object"==typeof module&&module.exports?module.exports=a(require("jquery")):a(jQuery)}(function(a){a.extend(a.fn,{validate:function(b){if(!this.length)return void(b&&b.debug&&window.console&&console.warn("Nothing selected, can't validate, returning nothing."));var c=a.data(this[0],"validator");return c?c:(this.attr("novalidate","novalidate"),c=new a.validator(b,this[0]),a.data(this[0],"validator",c),c.settings.onsubmit&&(this.on("click.validate",":submit",function(b){c.submitButton=b.currentTarget,a(this).hasClass("cancel")&&(c.cancelSubmit=!0),void 0!==a(this).attr("formnovalidate")&&(c.cancelSubmit=!0)}),this.on("submit.validate",function(b){function d(){var d,e;return c.submitButton&&(c.settings.submitHandler||c.formSubmitted)&&(d=a("<input type='hidden'/>").attr("name",c.submitButton.name).val(a(c.submitButton).val()).appendTo(c.currentForm)),!(c.settings.submitHandler&&!c.settings.debug)||(e=c.settings.submitHandler.call(c,c.currentForm,b),d&&d.remove(),void 0!==e&&e)}return c.settings.debug&&b.preventDefault(),c.cancelSubmit?(c.cancelSubmit=!1,d()):c.form()?c.pendingRequest?(c.formSubmitted=!0,!1):d():(c.focusInvalid(),!1)})),c)},valid:function(){var b,c,d;return a(this[0]).is("form")?b=this.validate().form():(d=[],b=!0,c=a(this[0].form).validate(),this.each(function(){b=c.element(this)&&b,b||(d=d.concat(c.errorList))}),c.errorList=d),b},rules:function(b,c){var d,e,f,g,h,i,j=this[0],k="undefined"!=typeof this.attr("contenteditable")&&"false"!==this.attr("contenteditable");if(null!=j&&(!j.form&&k&&(j.form=this.closest("form")[0],j.name=this.attr("name")),null!=j.form)){if(b)switch(d=a.data(j.form,"validator").settings,e=d.rules,f=a.validator.staticRules(j),b){case"add":a.extend(f,a.validator.normalizeRule(c)),delete f.messages,e[j.name]=f,c.messages&&(d.messages[j.name]=a.extend(d.messages[j.name],c.messages));break;case"remove":return c?(i={},a.each(c.split(/\s/),function(a,b){i[b]=f[b],delete f[b]}),i):(delete e[j.name],f)}return g=a.validator.normalizeRules(a.extend({},a.validator.classRules(j),a.validator.attributeRules(j),a.validator.dataRules(j),a.validator.staticRules(j)),j),g.required&&(h=g.required,delete g.required,g=a.extend({required:h},g)),g.remote&&(h=g.remote,delete g.remote,g=a.extend(g,{remote:h})),g}}}),a.extend(a.expr.pseudos||a.expr[":"],{blank:function(b){return!a.trim(""+a(b).val())},filled:function(b){var c=a(b).val();return null!==c&&!!a.trim(""+c)},unchecked:function(b){return!a(b).prop("checked")}}),a.validator=function(b,c){this.settings=a.extend(!0,{},a.validator.defaults,b),this.currentForm=c,this.init()},a.validator.format=function(b,c){return 1===arguments.length?function(){var c=a.makeArray(arguments);return c.unshift(b),a.validator.format.apply(this,c)}:void 0===c?b:(arguments.length>2&&c.constructor!==Array&&(c=a.makeArray(arguments).slice(1)),c.constructor!==Array&&(c=[c]),a.each(c,function(a,c){b=b.replace(new RegExp("\\{"+a+"\\}","g"),function(){return c})}),b)},a.extend(a.validator,{defaults:{messages:{},groups:{},rules:{},errorClass:"error",pendingClass:"pending",validClass:"valid",errorElement:"label",focusCleanup:!1,focusInvalid:!0,errorContainer:a([]),errorLabelContainer:a([]),onsubmit:!0,ignore:":hidden",ignoreTitle:!1,onfocusin:function(a){this.lastActive=a,this.settings.focusCleanup&&(this.settings.unhighlight&&this.settings.unhighlight.call(this,a,this.settings.errorClass,this.settings.validClass),this.hideThese(this.errorsFor(a)))},onfocusout:function(a){this.checkable(a)||!(a.name in this.submitted)&&this.optional(a)||this.element(a)},onkeyup:function(b,c){var d=[16,17,18,20,35,36,37,38,39,40,45,144,225];9===c.which&&""===this.elementValue(b)||a.inArray(c.keyCode,d)!==-1||(b.name in this.submitted||b.name in this.invalid)&&this.element(b)},onclick:function(a){a.name in this.submitted?this.element(a):a.parentNode.name in this.submitted&&this.element(a.parentNode)},highlight:function(b,c,d){"radio"===b.type?this.findByName(b.name).addClass(c).removeClass(d):a(b).addClass(c).removeClass(d)},unhighlight:function(b,c,d){"radio"===b.type?this.findByName(b.name).removeClass(c).addClass(d):a(b).removeClass(c).addClass(d)}},setDefaults:function(b){a.extend(a.validator.defaults,b)},messages:{required:"This field is required.",remote:"Please fix this field.",email:"Please enter a valid email address.",url:"Please enter a valid URL.",date:"Please enter a valid date.",dateISO:"Please enter a valid date (ISO).",number:"Please enter a valid number.",digits:"Please enter only digits.",equalTo:"Please enter the same value again.",maxlength:a.validator.format("Please enter no more than {0} characters."),minlength:a.validator.format("Please enter at least {0} characters."),rangelength:a.validator.format("Please enter a value between {0} and {1} characters long."),range:a.validator.format("Please enter a value between {0} and {1}."),max:a.validator.format("Please enter a value less than or equal to {0}."),min:a.validator.format("Please enter a value greater than or equal to {0}."),step:a.validator.format("Please enter a multiple of {0}.")},autoCreateRanges:!1,prototype:{init:function(){function b(b){var c="undefined"!=typeof a(this).attr("contenteditable")&&"false"!==a(this).attr("contenteditable");if(!this.form&&c&&(this.form=a(this).closest("form")[0],this.name=a(this).attr("name")),d===this.form){var e=a.data(this.form,"validator"),f="on"+b.type.replace(/^validate/,""),g=e.settings;g[f]&&!a(this).is(g.ignore)&&g[f].call(e,this,b)}}this.labelContainer=a(this.settings.errorLabelContainer),this.errorContext=this.labelContainer.length&&this.labelContainer||a(this.currentForm),this.containers=a(this.settings.errorContainer).add(this.settings.errorLabelContainer),this.submitted={},this.valueCache={},this.pendingRequest=0,this.pending={},this.invalid={},this.reset();var c,d=this.currentForm,e=this.groups={};a.each(this.settings.groups,function(b,c){"string"==typeof c&&(c=c.split(/\s/)),a.each(c,function(a,c){e[c]=b})}),c=this.settings.rules,a.each(c,function(b,d){c[b]=a.validator.normalizeRule(d)}),a(this.currentForm).on("focusin.validate focusout.validate keyup.validate",":text, [type='password'], [type='file'], select, textarea, [type='number'], [type='search'], [type='tel'], [type='url'], [type='email'], [type='datetime'], [type='date'], [type='month'], [type='week'], [type='time'], [type='datetime-local'], [type='range'], [type='color'], [type='radio'], [type='checkbox'], [contenteditable], [type='button']",b).on("click.validate","select, option, [type='radio'], [type='checkbox']",b),this.settings.invalidHandler&&a(this.currentForm).on("invalid-form.validate",this.settings.invalidHandler)},form:function(){return this.checkForm(),a.extend(this.submitted,this.errorMap),this.invalid=a.extend({},this.errorMap),this.valid()||a(this.currentForm).triggerHandler("invalid-form",[this]),this.showErrors(),this.valid()},checkForm:function(){this.prepareForm();for(var a=0,b=this.currentElements=this.elements();b[a];a++)this.check(b[a]);return this.valid()},element:function(b){var c,d,e=this.clean(b),f=this.validationTargetFor(e),g=this,h=!0;return void 0===f?delete this.invalid[e.name]:(this.prepareElement(f),this.currentElements=a(f),d=this.groups[f.name],d&&a.each(this.groups,function(a,b){b===d&&a!==f.name&&(e=g.validationTargetFor(g.clean(g.findByName(a))),e&&e.name in g.invalid&&(g.currentElements.push(e),h=g.check(e)&&h))}),c=this.check(f)!==!1,h=h&&c,c?this.invalid[f.name]=!1:this.invalid[f.name]=!0,this.numberOfInvalids()||(this.toHide=this.toHide.add(this.containers)),this.showErrors(),a(b).attr("aria-invalid",!c)),h},showErrors:function(b){if(b){var c=this;a.extend(this.errorMap,b),this.errorList=a.map(this.errorMap,function(a,b){return{message:a,element:c.findByName(b)[0]}}),this.successList=a.grep(this.successList,function(a){return!(a.name in b)})}this.settings.showErrors?this.settings.showErrors.call(this,this.errorMap,this.errorList):this.defaultShowErrors()},resetForm:function(){a.fn.resetForm&&a(this.currentForm).resetForm(),this.invalid={},this.submitted={},this.prepareForm(),this.hideErrors();var b=this.elements().removeData("previousValue").removeAttr("aria-invalid");this.resetElements(b)},resetElements:function(a){var b;if(this.settings.unhighlight)for(b=0;a[b];b++)this.settings.unhighlight.call(this,a[b],this.settings.errorClass,""),this.findByName(a[b].name).removeClass(this.settings.validClass);else a.removeClass(this.settings.errorClass).removeClass(this.settings.validClass)},numberOfInvalids:function(){return this.objectLength(this.invalid)},objectLength:function(a){var b,c=0;for(b in a)void 0!==a[b]&&null!==a[b]&&a[b]!==!1&&c++;return c},hideErrors:function(){this.hideThese(this.toHide)},hideThese:function(a){a.not(this.containers).text(""),this.addWrapper(a).hide()},valid:function(){return 0===this.size()},size:function(){return this.errorList.length},focusInvalid:function(){if(this.settings.focusInvalid)try{a(this.findLastActive()||this.errorList.length&&this.errorList[0].element||[]).filter(":visible").focus().trigger("focusin")}catch(b){}},findLastActive:function(){var b=this.lastActive;return b&&1===a.grep(this.errorList,function(a){return a.element.name===b.name}).length&&b},elements:function(){var b=this,c={};return a(this.currentForm).find("input, select, textarea, [contenteditable]").not(":submit, :reset, :image, :disabled").not(this.settings.ignore).filter(function(){var d=this.name||a(this).attr("name"),e="undefined"!=typeof a(this).attr("contenteditable")&&"false"!==a(this).attr("contenteditable");return!d&&b.settings.debug&&window.console&&console.error("%o has no name assigned",this),e&&(this.form=a(this).closest("form")[0],this.name=d),this.form===b.currentForm&&(!(d in c||!b.objectLength(a(this).rules()))&&(c[d]=!0,!0))})},clean:function(b){return a(b)[0]},errors:function(){var b=this.settings.errorClass.split(" ").join(".");return a(this.settings.errorElement+"."+b,this.errorContext)},resetInternals:function(){this.successList=[],this.errorList=[],this.errorMap={},this.toShow=a([]),this.toHide=a([])},reset:function(){this.resetInternals(),this.currentElements=a([])},prepareForm:function(){this.reset(),this.toHide=this.errors().add(this.containers)},prepareElement:function(a){this.reset(),this.toHide=this.errorsFor(a)},elementValue:function(b){var c,d,e=a(b),f=b.type,g="undefined"!=typeof e.attr("contenteditable")&&"false"!==e.attr("contenteditable");return"radio"===f||"checkbox"===f?this.findByName(b.name).filter(":checked").val():"number"===f&&"undefined"!=typeof b.validity?b.validity.badInput?"NaN":e.val():(c=g?e.text():e.val(),"file"===f?"C:\\fakepath\\"===c.substr(0,12)?c.substr(12):(d=c.lastIndexOf("/"),d>=0?c.substr(d+1):(d=c.lastIndexOf("\\"),d>=0?c.substr(d+1):c)):"string"==typeof c?c.replace(/\r/g,""):c)},check:function(b){b=this.validationTargetFor(this.clean(b));var c,d,e,f,g=a(b).rules(),h=a.map(g,function(a,b){return b}).length,i=!1,j=this.elementValue(b);"function"==typeof g.normalizer?f=g.normalizer:"function"==typeof this.settings.normalizer&&(f=this.settings.normalizer),f&&(j=f.call(b,j),delete g.normalizer);for(d in g){e={method:d,parameters:g[d]};try{if(c=a.validator.methods[d].call(this,j,b,e.parameters),"dependency-mismatch"===c&&1===h){i=!0;continue}if(i=!1,"pending"===c)return void(this.toHide=this.toHide.not(this.errorsFor(b)));if(!c)return this.formatAndAdd(b,e),!1}catch(k){throw this.settings.debug&&window.console&&console.log("Exception occurred when checking element "+b.id+", check the '"+e.method+"' method.",k),k instanceof TypeError&&(k.message+=".  Exception occurred when checking element "+b.id+", check the '"+e.method+"' method."),k}}if(!i)return this.objectLength(g)&&this.successList.push(b),!0},customDataMessage:function(b,c){return a(b).data("msg"+c.charAt(0).toUpperCase()+c.substring(1).toLowerCase())||a(b).data("msg")},customMessage:function(a,b){var c=this.settings.messages[a];return c&&(c.constructor===String?c:c[b])},findDefined:function(){for(var a=0;a<arguments.length;a++)if(void 0!==arguments[a])return arguments[a]},defaultMessage:function(b,c){"string"==typeof c&&(c={method:c});var d=this.findDefined(this.customMessage(b.name,c.method),this.customDataMessage(b,c.method),!this.settings.ignoreTitle&&b.title||void 0,a.validator.messages[c.method],"<strong>Warning: No message defined for "+b.name+"</strong>"),e=/\$?\{(\d+)\}/g;return"function"==typeof d?d=d.call(this,c.parameters,b):e.test(d)&&(d=a.validator.format(d.replace(e,"{$1}"),c.parameters)),d},formatAndAdd:function(a,b){var c=this.defaultMessage(a,b);this.errorList.push({message:c,element:a,method:b.method}),this.errorMap[a.name]=c,this.submitted[a.name]=c},addWrapper:function(a){return this.settings.wrapper&&(a=a.add(a.parent(this.settings.wrapper))),a},defaultShowErrors:function(){var a,b,c;for(a=0;this.errorList[a];a++)c=this.errorList[a],this.settings.highlight&&this.settings.highlight.call(this,c.element,this.settings.errorClass,this.settings.validClass),this.showLabel(c.element,c.message);if(this.errorList.length&&(this.toShow=this.toShow.add(this.containers)),this.settings.success)for(a=0;this.successList[a];a++)this.showLabel(this.successList[a]);if(this.settings.unhighlight)for(a=0,b=this.validElements();b[a];a++)this.settings.unhighlight.call(this,b[a],this.settings.errorClass,this.settings.validClass);this.toHide=this.toHide.not(this.toShow),this.hideErrors(),this.addWrapper(this.toShow).show()},validElements:function(){return this.currentElements.not(this.invalidElements())},invalidElements:function(){return a(this.errorList).map(function(){return this.element})},showLabel:function(b,c){var d,e,f,g,h=this.errorsFor(b),i=this.idOrName(b),j=a(b).attr("aria-describedby");h.length?(h.removeClass(this.settings.validClass).addClass(this.settings.errorClass),h.html(c)):(h=a("<"+this.settings.errorElement+">").attr("id",i+"-error").addClass(this.settings.errorClass).html(c||""),d=h,this.settings.wrapper&&(d=h.hide().show().wrap("<"+this.settings.wrapper+"/>").parent()),this.labelContainer.length?this.labelContainer.append(d):this.settings.errorPlacement?this.settings.errorPlacement.call(this,d,a(b)):d.insertAfter(b),h.is("label")?h.attr("for",i):0===h.parents("label[for='"+this.escapeCssMeta(i)+"']").length&&(f=h.attr("id"),j?j.match(new RegExp("\\b"+this.escapeCssMeta(f)+"\\b"))||(j+=" "+f):j=f,a(b).attr("aria-describedby",j),e=this.groups[b.name],e&&(g=this,a.each(g.groups,function(b,c){c===e&&a("[name='"+g.escapeCssMeta(b)+"']",g.currentForm).attr("aria-describedby",h.attr("id"))})))),!c&&this.settings.success&&(h.text(""),"string"==typeof this.settings.success?h.addClass(this.settings.success):this.settings.success(h,b)),this.toShow=this.toShow.add(h)},errorsFor:function(b){var c=this.escapeCssMeta(this.idOrName(b)),d=a(b).attr("aria-describedby"),e="label[for='"+c+"'], label[for='"+c+"'] *";return d&&(e=e+", #"+this.escapeCssMeta(d).replace(/\s+/g,", #")),this.errors().filter(e)},escapeCssMeta:function(a){return a.replace(/([\\!"#$%&'()*+,.\/:;<=>?@\[\]^`{|}~])/g,"\\$1")},idOrName:function(a){return this.groups[a.name]||(this.checkable(a)?a.name:a.id||a.name)},validationTargetFor:function(b){return this.checkable(b)&&(b=this.findByName(b.name)),a(b).not(this.settings.ignore)[0]},checkable:function(a){return/radio|checkbox/i.test(a.type)},findByName:function(b){return a(this.currentForm).find("[name='"+this.escapeCssMeta(b)+"']")},getLength:function(b,c){switch(c.nodeName.toLowerCase()){case"select":return a("option:selected",c).length;case"input":if(this.checkable(c))return this.findByName(c.name).filter(":checked").length}return b.length},depend:function(a,b){return!this.dependTypes[typeof a]||this.dependTypes[typeof a](a,b)},dependTypes:{"boolean":function(a){return a},string:function(b,c){return!!a(b,c.form).length},"function":function(a,b){return a(b)}},optional:function(b){var c=this.elementValue(b);return!a.validator.methods.required.call(this,c,b)&&"dependency-mismatch"},startRequest:function(b){this.pending[b.name]||(this.pendingRequest++,a(b).addClass(this.settings.pendingClass),this.pending[b.name]=!0)},stopRequest:function(b,c){this.pendingRequest--,this.pendingRequest<0&&(this.pendingRequest=0),delete this.pending[b.name],a(b).removeClass(this.settings.pendingClass),c&&0===this.pendingRequest&&this.formSubmitted&&this.form()?(a(this.currentForm).submit(),this.submitButton&&a("input:hidden[name='"+this.submitButton.name+"']",this.currentForm).remove(),this.formSubmitted=!1):!c&&0===this.pendingRequest&&this.formSubmitted&&(a(this.currentForm).triggerHandler("invalid-form",[this]),this.formSubmitted=!1)},previousValue:function(b,c){return c="string"==typeof c&&c||"remote",a.data(b,"previousValue")||a.data(b,"previousValue",{old:null,valid:!0,message:this.defaultMessage(b,{method:c})})},destroy:function(){this.resetForm(),a(this.currentForm).off(".validate").removeData("validator").find(".validate-equalTo-blur").off(".validate-equalTo").removeClass("validate-equalTo-blur").find(".validate-lessThan-blur").off(".validate-lessThan").removeClass("validate-lessThan-blur").find(".validate-lessThanEqual-blur").off(".validate-lessThanEqual").removeClass("validate-lessThanEqual-blur").find(".validate-greaterThanEqual-blur").off(".validate-greaterThanEqual").removeClass("validate-greaterThanEqual-blur").find(".validate-greaterThan-blur").off(".validate-greaterThan").removeClass("validate-greaterThan-blur")}},classRuleSettings:{required:{required:!0},email:{email:!0},url:{url:!0},date:{date:!0},dateISO:{dateISO:!0},number:{number:!0},digits:{digits:!0},creditcard:{creditcard:!0}},addClassRules:function(b,c){b.constructor===String?this.classRuleSettings[b]=c:a.extend(this.classRuleSettings,b)},classRules:function(b){var c={},d=a(b).attr("class");return d&&a.each(d.split(" "),function(){this in a.validator.classRuleSettings&&a.extend(c,a.validator.classRuleSettings[this])}),c},normalizeAttributeRule:function(a,b,c,d){/min|max|step/.test(c)&&(null===b||/number|range|text/.test(b))&&(d=Number(d),isNaN(d)&&(d=void 0)),d||0===d?a[c]=d:b===c&&"range"!==b&&(a[c]=!0)},attributeRules:function(b){var c,d,e={},f=a(b),g=b.getAttribute("type");for(c in a.validator.methods)"required"===c?(d=b.getAttribute(c),""===d&&(d=!0),d=!!d):d=f.attr(c),this.normalizeAttributeRule(e,g,c,d);return e.maxlength&&/-1|2147483647|524288/.test(e.maxlength)&&delete e.maxlength,e},dataRules:function(b){var c,d,e={},f=a(b),g=b.getAttribute("type");for(c in a.validator.methods)d=f.data("rule"+c.charAt(0).toUpperCase()+c.substring(1).toLowerCase()),""===d&&(d=!0),this.normalizeAttributeRule(e,g,c,d);return e},staticRules:function(b){var c={},d=a.data(b.form,"validator");return d.settings.rules&&(c=a.validator.normalizeRule(d.settings.rules[b.name])||{}),c},normalizeRules:function(b,c){return a.each(b,function(d,e){if(e===!1)return void delete b[d];if(e.param||e.depends){var f=!0;switch(typeof e.depends){case"string":f=!!a(e.depends,c.form).length;break;case"function":f=e.depends.call(c,c)}f?b[d]=void 0===e.param||e.param:(a.data(c.form,"validator").resetElements(a(c)),delete b[d])}}),a.each(b,function(d,e){b[d]=a.isFunction(e)&&"normalizer"!==d?e(c):e}),a.each(["minlength","maxlength"],function(){b[this]&&(b[this]=Number(b[this]))}),a.each(["rangelength","range"],function(){var c;b[this]&&(a.isArray(b[this])?b[this]=[Number(b[this][0]),Number(b[this][1])]:"string"==typeof b[this]&&(c=b[this].replace(/[\[\]]/g,"").split(/[\s,]+/),b[this]=[Number(c[0]),Number(c[1])]))}),a.validator.autoCreateRanges&&(null!=b.min&&null!=b.max&&(b.range=[b.min,b.max],delete b.min,delete b.max),null!=b.minlength&&null!=b.maxlength&&(b.rangelength=[b.minlength,b.maxlength],delete b.minlength,delete b.maxlength)),b},normalizeRule:function(b){if("string"==typeof b){var c={};a.each(b.split(/\s/),function(){c[this]=!0}),b=c}return b},addMethod:function(b,c,d){a.validator.methods[b]=c,a.validator.messages[b]=void 0!==d?d:a.validator.messages[b],c.length<3&&a.validator.addClassRules(b,a.validator.normalizeRule(b))},methods:{required:function(b,c,d){if(!this.depend(d,c))return"dependency-mismatch";if("select"===c.nodeName.toLowerCase()){var e=a(c).val();return e&&e.length>0}return this.checkable(c)?this.getLength(b,c)>0:void 0!==b&&null!==b&&b.length>0},email:function(a,b){return this.optional(b)||/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(a)},url:function(a,b){return this.optional(b)||/^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})).?)(?::\d{2,5})?(?:[\/?#]\S*)?$/i.test(a)},date:function(){var a=!1;return function(b,c){return a||(a=!0,this.settings.debug&&window.console&&console.warn("The `date` method is deprecated and will be removed in version '2.0.0'.\nPlease don't use it, since it relies on the Date constructor, which\nbehaves very differently across browsers and locales. Use `dateISO`\ninstead or one of the locale specific methods in `localizations/`\nand `additional-methods.js`.")),this.optional(c)||!/Invalid|NaN/.test(new Date(b).toString())}}(),dateISO:function(a,b){return this.optional(b)||/^\d{4}[\/\-](0?[1-9]|1[012])[\/\-](0?[1-9]|[12][0-9]|3[01])$/.test(a)},number:function(a,b){return this.optional(b)||/^(?:-?\d+|-?\d{1,3}(?:,\d{3})+)?(?:\.\d+)?$/.test(a)},digits:function(a,b){return this.optional(b)||/^\d+$/.test(a)},minlength:function(b,c,d){var e=a.isArray(b)?b.length:this.getLength(b,c);return this.optional(c)||e>=d},maxlength:function(b,c,d){var e=a.isArray(b)?b.length:this.getLength(b,c);return this.optional(c)||e<=d},rangelength:function(b,c,d){var e=a.isArray(b)?b.length:this.getLength(b,c);return this.optional(c)||e>=d[0]&&e<=d[1]},min:function(a,b,c){return this.optional(b)||a>=c},max:function(a,b,c){return this.optional(b)||a<=c},range:function(a,b,c){return this.optional(b)||a>=c[0]&&a<=c[1]},step:function(b,c,d){var e,f=a(c).attr("type"),g="Step attribute on input type "+f+" is not supported.",h=["text","number","range"],i=new RegExp("\\b"+f+"\\b"),j=f&&!i.test(h.join()),k=function(a){var b=(""+a).match(/(?:\.(\d+))?$/);return b&&b[1]?b[1].length:0},l=function(a){return Math.round(a*Math.pow(10,e))},m=!0;if(j)throw new Error(g);return e=k(d),(k(b)>e||l(b)%l(d)!==0)&&(m=!1),this.optional(c)||m},equalTo:function(b,c,d){var e=a(d);return this.settings.onfocusout&&e.not(".validate-equalTo-blur").length&&e.addClass("validate-equalTo-blur").on("blur.validate-equalTo",function(){a(c).valid()}),b===e.val()},remote:function(b,c,d,e){if(this.optional(c))return"dependency-mismatch";e="string"==typeof e&&e||"remote";var f,g,h,i=this.previousValue(c,e);return this.settings.messages[c.name]||(this.settings.messages[c.name]={}),i.originalMessage=i.originalMessage||this.settings.messages[c.name][e],this.settings.messages[c.name][e]=i.message,d="string"==typeof d&&{url:d}||d,h=a.param(a.extend({data:b},d.data)),i.old===h?i.valid:(i.old=h,f=this,this.startRequest(c),g={},g[c.name]=b,a.ajax(a.extend(!0,{mode:"abort",port:"validate"+c.name,dataType:"json",data:g,context:f.currentForm,success:function(a){var d,g,h,j=a===!0||"true"===a;f.settings.messages[c.name][e]=i.originalMessage,j?(h=f.formSubmitted,f.resetInternals(),f.toHide=f.errorsFor(c),f.formSubmitted=h,f.successList.push(c),f.invalid[c.name]=!1,f.showErrors()):(d={},g=a||f.defaultMessage(c,{method:e,parameters:b}),d[c.name]=i.message=g,f.invalid[c.name]=!0,f.showErrors(d)),i.valid=j,f.stopRequest(c,j)}},d)),"pending")}}});var b,c={};return a.ajaxPrefilter?a.ajaxPrefilter(function(a,b,d){var e=a.port;"abort"===a.mode&&(c[e]&&c[e].abort(),c[e]=d)}):(b=a.ajax,a.ajax=function(d){var e=("mode"in d?d:a.ajaxSettings).mode,f=("port"in d?d:a.ajaxSettings).port;return"abort"===e?(c[f]&&c[f].abort(),c[f]=b.apply(this,arguments),c[f]):b.apply(this,arguments)}),a});;
/*
 * International Telephone Input v15.1.0
 * https://github.com/jackocnr/intl-tel-input.git
 * Licensed under the MIT license
 */

!function(a){var b=function(a,b,c){"use strict";return function(){function c(a,b){if(!(a instanceof b))throw new TypeError("Cannot call a class as a function")}function d(a,b){for(var c=0;c<b.length;c++){var d=b[c];d.enumerable=d.enumerable||!1,d.configurable=!0,"value"in d&&(d.writable=!0),Object.defineProperty(a,d.key,d)}}function e(a,b,c){return b&&d(a.prototype,b),c&&d(a,c),a}for(var f=[["Afghanistan (‫افغانستان‬‎)","af","93"],["Albania (Shqipëri)","al","355"],["Algeria (‫الجزائر‬‎)","dz","213"],["American Samoa","as","1684"],["Andorra","ad","376"],["Angola","ao","244"],["Anguilla","ai","1264"],["Antigua and Barbuda","ag","1268"],["Argentina","ar","54"],["Armenia (Հայաստան)","am","374"],["Aruba","aw","297"],["Australia","au","61",0],["Austria (Österreich)","at","43"],["Azerbaijan (Azərbaycan)","az","994"],["Bahamas","bs","1242"],["Bahrain (‫البحرين‬‎)","bh","973"],["Bangladesh (বাংলাদেশ)","bd","880"],["Barbados","bb","1246"],["Belarus (Беларусь)","by","375"],["Belgium (België)","be","32"],["Belize","bz","501"],["Benin (Bénin)","bj","229"],["Bermuda","bm","1441"],["Bhutan (འབྲུག)","bt","975"],["Bolivia","bo","591"],["Bosnia and Herzegovina (Босна и Херцеговина)","ba","387"],["Botswana","bw","267"],["Brazil (Brasil)","br","55"],["British Indian Ocean Territory","io","246"],["British Virgin Islands","vg","1284"],["Brunei","bn","673"],["Bulgaria (България)","bg","359"],["Burkina Faso","bf","226"],["Burundi (Uburundi)","bi","257"],["Cambodia (កម្ពុជា)","kh","855"],["Cameroon (Cameroun)","cm","237"],["Canada","ca","1",1,["204","226","236","249","250","289","306","343","365","387","403","416","418","431","437","438","450","506","514","519","548","579","581","587","604","613","639","647","672","705","709","742","778","780","782","807","819","825","867","873","902","905"]],["Cape Verde (Kabu Verdi)","cv","238"],["Caribbean Netherlands","bq","599",1],["Cayman Islands","ky","1345"],["Central African Republic (République centrafricaine)","cf","236"],["Chad (Tchad)","td","235"],["Chile","cl","56"],["China (中国)","cn","86"],["Christmas Island","cx","61",2],["Cocos (Keeling) Islands","cc","61",1],["Colombia","co","57"],["Comoros (‫جزر القمر‬‎)","km","269"],["Congo (DRC) (Jamhuri ya Kidemokrasia ya Kongo)","cd","243"],["Congo (Republic) (Congo-Brazzaville)","cg","242"],["Cook Islands","ck","682"],["Costa Rica","cr","506"],["Côte d’Ivoire","ci","225"],["Croatia (Hrvatska)","hr","385"],["Cuba","cu","53"],["Curaçao","cw","599",0],["Cyprus (Κύπρος)","cy","357"],["Czech Republic (Česká republika)","cz","420"],["Denmark (Danmark)","dk","45"],["Djibouti","dj","253"],["Dominica","dm","1767"],["Dominican Republic (República Dominicana)","do","1",2,["809","829","849"]],["Ecuador","ec","593"],["Egypt (‫مصر‬‎)","eg","20"],["El Salvador","sv","503"],["Equatorial Guinea (Guinea Ecuatorial)","gq","240"],["Eritrea","er","291"],["Estonia (Eesti)","ee","372"],["Ethiopia","et","251"],["Falkland Islands (Islas Malvinas)","fk","500"],["Faroe Islands (Føroyar)","fo","298"],["Fiji","fj","679"],["Finland (Suomi)","fi","358",0],["France","fr","33"],["French Guiana (Guyane française)","gf","594"],["French Polynesia (Polynésie française)","pf","689"],["Gabon","ga","241"],["Gambia","gm","220"],["Georgia (საქართველო)","ge","995"],["Germany (Deutschland)","de","49"],["Ghana (Gaana)","gh","233"],["Gibraltar","gi","350"],["Greece (Ελλάδα)","gr","30"],["Greenland (Kalaallit Nunaat)","gl","299"],["Grenada","gd","1473"],["Guadeloupe","gp","590",0],["Guam","gu","1671"],["Guatemala","gt","502"],["Guernsey","gg","44",1],["Guinea (Guinée)","gn","224"],["Guinea-Bissau (Guiné Bissau)","gw","245"],["Guyana","gy","592"],["Haiti","ht","509"],["Honduras","hn","504"],["Hong Kong (香港)","hk","852"],["Hungary (Magyarország)","hu","36"],["Iceland (Ísland)","is","354"],["India (भारत)","in","91"],["Indonesia","id","62"],["Iran (‫ایران‬‎)","ir","98"],["Iraq (‫العراق‬‎)","iq","964"],["Ireland","ie","353"],["Isle of Man","im","44",2],["Israel (‫ישראל‬‎)","il","972"],["Italy (Italia)","it","39",0],["Jamaica","jm","1",4,["876","658"]],["Japan (日本)","jp","81"],["Jersey","je","44",3],["Jordan (‫الأردن‬‎)","jo","962"],["Kazakhstan (Казахстан)","kz","7",1],["Kenya","ke","254"],["Kiribati","ki","686"],["Kosovo","xk","383"],["Kuwait (‫الكويت‬‎)","kw","965"],["Kyrgyzstan (Кыргызстан)","kg","996"],["Laos (ລາວ)","la","856"],["Latvia (Latvija)","lv","371"],["Lebanon (‫لبنان‬‎)","lb","961"],["Lesotho","ls","266"],["Liberia","lr","231"],["Libya (‫ليبيا‬‎)","ly","218"],["Liechtenstein","li","423"],["Lithuania (Lietuva)","lt","370"],["Luxembourg","lu","352"],["Macau (澳門)","mo","853"],["Macedonia (FYROM) (Македонија)","mk","389"],["Madagascar (Madagasikara)","mg","261"],["Malawi","mw","265"],["Malaysia","my","60"],["Maldives","mv","960"],["Mali","ml","223"],["Malta","mt","356"],["Marshall Islands","mh","692"],["Martinique","mq","596"],["Mauritania (‫موريتانيا‬‎)","mr","222"],["Mauritius (Moris)","mu","230"],["Mayotte","yt","262",1],["Mexico (México)","mx","52"],["Micronesia","fm","691"],["Moldova (Republica Moldova)","md","373"],["Monaco","mc","377"],["Mongolia (Монгол)","mn","976"],["Montenegro (Crna Gora)","me","382"],["Montserrat","ms","1664"],["Morocco (‫المغرب‬‎)","ma","212",0],["Mozambique (Moçambique)","mz","258"],["Myanmar (Burma) (မြန်မာ)","mm","95"],["Namibia (Namibië)","na","264"],["Nauru","nr","674"],["Nepal (नेपाल)","np","977"],["Netherlands (Nederland)","nl","31"],["New Caledonia (Nouvelle-Calédonie)","nc","687"],["New Zealand","nz","64"],["Nicaragua","ni","505"],["Niger (Nijar)","ne","227"],["Nigeria","ng","234"],["Niue","nu","683"],["Norfolk Island","nf","672"],["North Korea (조선 민주주의 인민 공화국)","kp","850"],["Northern Mariana Islands","mp","1670"],["Norway (Norge)","no","47",0],["Oman (‫عُمان‬‎)","om","968"],["Pakistan (‫پاکستان‬‎)","pk","92"],["Palau","pw","680"],["Palestine (‫فلسطين‬‎)","ps","970"],["Panama (Panamá)","pa","507"],["Papua New Guinea","pg","675"],["Paraguay","py","595"],["Peru (Perú)","pe","51"],["Philippines","ph","63"],["Poland (Polska)","pl","48"],["Portugal","pt","351"],["Puerto Rico","pr","1",3,["787","939"]],["Qatar (‫قطر‬‎)","qa","974"],["Réunion (La Réunion)","re","262",0],["Romania (România)","ro","40"],["Russia (Россия)","ru","7",0],["Rwanda","rw","250"],["Saint Barthélemy","bl","590",1],["Saint Helena","sh","290"],["Saint Kitts and Nevis","kn","1869"],["Saint Lucia","lc","1758"],["Saint Martin (Saint-Martin (partie française))","mf","590",2],["Saint Pierre and Miquelon (Saint-Pierre-et-Miquelon)","pm","508"],["Saint Vincent and the Grenadines","vc","1784"],["Samoa","ws","685"],["San Marino","sm","378"],["São Tomé and Príncipe (São Tomé e Príncipe)","st","239"],["Saudi Arabia (‫المملكة العربية السعودية‬‎)","sa","966"],["Senegal (Sénégal)","sn","221"],["Serbia (Србија)","rs","381"],["Seychelles","sc","248"],["Sierra Leone","sl","232"],["Singapore","sg","65"],["Sint Maarten","sx","1721"],["Slovakia (Slovensko)","sk","421"],["Slovenia (Slovenija)","si","386"],["Solomon Islands","sb","677"],["Somalia (Soomaaliya)","so","252"],["South Africa","za","27"],["South Korea (대한민국)","kr","82"],["South Sudan (‫جنوب السودان‬‎)","ss","211"],["Spain (España)","es","34"],["Sri Lanka (ශ්‍රී ලංකාව)","lk","94"],["Sudan (‫السودان‬‎)","sd","249"],["Suriname","sr","597"],["Svalbard and Jan Mayen","sj","47",1],["Swaziland","sz","268"],["Sweden (Sverige)","se","46"],["Switzerland (Schweiz)","ch","41"],["Syria (‫سوريا‬‎)","sy","963"],["Taiwan (台灣)","tw","886"],["Tajikistan","tj","992"],["Tanzania","tz","255"],["Thailand (ไทย)","th","66"],["Timor-Leste","tl","670"],["Togo","tg","228"],["Tokelau","tk","690"],["Tonga","to","676"],["Trinidad and Tobago","tt","1868"],["Tunisia (‫تونس‬‎)","tn","216"],["Turkey (Türkiye)","tr","90"],["Turkmenistan","tm","993"],["Turks and Caicos Islands","tc","1649"],["Tuvalu","tv","688"],["U.S. Virgin Islands","vi","1340"],["Uganda","ug","256"],["Ukraine (Україна)","ua","380"],["United Arab Emirates (‫الإمارات العربية المتحدة‬‎)","ae","971"],["United Kingdom","gb","44",0],["United States","us","1",0],["Uruguay","uy","598"],["Uzbekistan (Oʻzbekiston)","uz","998"],["Vanuatu","vu","678"],["Vatican City (Città del Vaticano)","va","39",1],["Venezuela","ve","58"],["Vietnam (Việt Nam)","vn","84"],["Wallis and Futuna (Wallis-et-Futuna)","wf","681"],["Western Sahara (‫الصحراء الغربية‬‎)","eh","212",1],["Yemen (‫اليمن‬‎)","ye","967"],["Zambia","zm","260"],["Zimbabwe","zw","263"],["Åland Islands","ax","358",1]],g=0;g<f.length;g++){var h=f[g];f[g]={name:h[0],iso2:h[1],dialCode:h[2],priority:h[3]||0,areaCodes:h[4]||null}}a.intlTelInputGlobals={getInstance:function(b){var c=b.getAttribute("data-intl-tel-input-id");return a.intlTelInputGlobals.instances[c]},instances:{}};var i=0,j={allowDropdown:!0,autoHideDialCode:!0,autoPlaceholder:"polite",customContainer:"",customPlaceholder:null,dropdownContainer:null,excludeCountries:[],formatOnDisplay:!0,geoIpLookup:null,hiddenInput:"",initialCountry:"",localizedCountries:null,nationalMode:!0,onlyCountries:[],placeholderNumberType:"MOBILE",preferredCountries:["us","gb"],separateDialCode:!1,utilsScript:""},k=["800","822","833","844","855","866","877","880","881","882","883","884","885","886","887","888","889"];a.addEventListener("load",function(){a.intlTelInputGlobals.windowLoaded=!0});var l=function(a,b){for(var c=Object.keys(a),d=0;d<c.length;d++)b(c[d],a[c[d]])},m=function(b){l(a.intlTelInputGlobals.instances,function(c){a.intlTelInputGlobals.instances[c][b]()})},n=function(){function d(a,b){var e=this;c(this,d),this.id=i++,this.a=a,this.b=null,this.c=null;var f=b||{};this.d={},l(j,function(a,b){e.d[a]=f.hasOwnProperty(a)?f[a]:b}),this.e=Boolean(a.getAttribute("placeholder"))}return e(d,[{key:"_init",value:function(){var a=this;if(this.d.nationalMode&&(this.d.autoHideDialCode=!1),this.d.separateDialCode&&(this.d.autoHideDialCode=this.d.nationalMode=!1),this.g=/Android.+Mobile|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),this.g&&(b.body.classList.add("iti-mobile"),this.d.dropdownContainer||(this.d.dropdownContainer=b.body)),"undefined"!=typeof Promise){var c=new Promise(function(b,c){a.h=b,a.i=c}),d=new Promise(function(b,c){a.i0=b,a.i1=c});this.promise=Promise.all([c,d])}else this.h=this.i=function(){},this.i0=this.i1=function(){};this.s={},this._b(),this._f(),this._h(),this._i(),this._i3()}},{key:"_b",value:function(){this._d(),this._d2(),this._e(),this.d.localizedCountries&&this._d0(),(this.d.onlyCountries.length||this.d.localizedCountries)&&this.p.sort(this._d1)}},{key:"_c",value:function(a,b,c){this.q.hasOwnProperty(b)||(this.q[b]=[]);var d=c||0;this.q[b][d]=a}},{key:"_d",value:function(){if(this.d.onlyCountries.length){var a=this.d.onlyCountries.map(function(a){return a.toLowerCase()});this.p=f.filter(function(b){return a.indexOf(b.iso2)>-1})}else if(this.d.excludeCountries.length){var b=this.d.excludeCountries.map(function(a){return a.toLowerCase()});this.p=f.filter(function(a){return-1===b.indexOf(a.iso2)})}else this.p=f}},{key:"_d0",value:function(){for(var a=0;a<this.p.length;a++){var b=this.p[a].iso2.toLowerCase();this.d.localizedCountries.hasOwnProperty(b)&&(this.p[a].name=this.d.localizedCountries[b])}}},{key:"_d1",value:function(a,b){return a.name.localeCompare(b.name)}},{key:"_d2",value:function(){this.q={};for(var a=0;a<this.p.length;a++){var b=this.p[a];if(this._c(b.iso2,b.dialCode,b.priority),b.areaCodes)for(var c=0;c<b.areaCodes.length;c++)this._c(b.iso2,b.dialCode+b.areaCodes[c])}}},{key:"_e",value:function(){this.preferredCountries=[];for(var a=0;a<this.d.preferredCountries.length;a++){var b=this.d.preferredCountries[a].toLowerCase(),c=this._y(b,!1,!0);c&&this.preferredCountries.push(c)}}},{key:"_e2",value:function(a,c,d){var e=b.createElement(a);return c&&l(c,function(a,b){return e.setAttribute(a,b)}),d&&d.appendChild(e),e}},{key:"_f",value:function(){this.a.setAttribute("autocomplete","off");var a="intl-tel-input";this.d.allowDropdown&&(a+=" allow-dropdown"),this.d.separateDialCode&&(a+=" separate-dial-code"),this.d.customContainer&&(a+=" ",a+=this.d.customContainer);var b=this._e2("div",{"class":a});if(this.a.parentNode.insertBefore(b,this.a),this.k=this._e2("div",{"class":"flag-container"},b),b.appendChild(this.a),this.selectedFlag=this._e2("div",{"class":"selected-flag",role:"combobox","aria-owns":"country-listbox"},this.k),this.l=this._e2("div",{"class":"iti-flag"},this.selectedFlag),this.d.separateDialCode&&(this.t=this._e2("div",{"class":"selected-dial-code"},this.selectedFlag)),this.d.allowDropdown&&(this.selectedFlag.setAttribute("tabindex","0"),this.u=this._e2("div",{"class":"iti-arrow"},this.selectedFlag),this.m=this._e2("ul",{"class":"country-list hide",id:"country-listbox","aria-expanded":"false",role:"listbox"}),this.preferredCountries.length&&(this._g(this.preferredCountries,"preferred"),this._e2("li",{"class":"divider",role:"separator","aria-disabled":"true"},this.m)),this._g(this.p,"standard"),this.d.dropdownContainer?(this.dropdown=this._e2("div",{"class":"intl-tel-input iti-container"}),this.dropdown.appendChild(this.m)):this.k.appendChild(this.m)),this.d.hiddenInput){var c=this.d.hiddenInput,d=this.a.getAttribute("name");if(d){var e=d.lastIndexOf("[");-1!==e&&(c="".concat(d.substr(0,e),"[").concat(c,"]"))}this.hiddenInput=this._e2("input",{type:"hidden",name:c}),b.appendChild(this.hiddenInput)}}},{key:"_g",value:function(a,b){for(var c="",d=0;d<a.length;d++){var e=a[d];c+="<li class='country ".concat(b,"' tabIndex='-1' id='iti-item-").concat(e.iso2,"' role='option' data-dial-code='").concat(e.dialCode,"' data-country-code='").concat(e.iso2,"'>"),c+="<div class='flag-box'><div class='iti-flag ".concat(e.iso2,"'></div></div>"),c+="<span class='country-name'>".concat(e.name,"</span>"),c+="<span class='dial-code'>+".concat(e.dialCode,"</span>"),c+="</li>"}this.m.insertAdjacentHTML("beforeend",c)}},{key:"_h",value:function(){var a=this.a.value,b=this._5(a),c=this._w(a),d=this.d,e=d.initialCountry,f=d.nationalMode,g=d.autoHideDialCode,h=d.separateDialCode;b&&!c?this._v(a):"auto"!==e&&(e?this._z(e.toLowerCase()):b&&c?this._z("us"):(this.j=this.preferredCountries.length?this.preferredCountries[0].iso2:this.p[0].iso2,a||this._z(this.j)),a||f||g||h||(this.a.value="+".concat(this.s.dialCode))),a&&this._u(a)}},{key:"_i",value:function(){this._j(),this.d.autoHideDialCode&&this._l(),this.d.allowDropdown&&this._i2(),this.hiddenInput&&this._i0()}},{key:"_i0",value:function(){var a=this;this._a14=function(){a.hiddenInput.value=a.getNumber()},this.a.form&&this.a.form.addEventListener("submit",this._a14)}},{key:"_i1",value:function(){for(var a=this.a;a&&"LABEL"!==a.tagName;)a=a.parentNode;return a}},{key:"_i2",value:function(){var a=this;this._a9=function(b){a.m.classList.contains("hide")?a.a.focus():b.preventDefault()};var b=this._i1();b&&b.addEventListener("click",this._a9),this._a10=function(){!a.m.classList.contains("hide")||a.a.disabled||a.a.readOnly||a._n()},this.selectedFlag.addEventListener("click",this._a10),this._a11=function(b){a.m.classList.contains("hide")&&-1!==["ArrowUp","ArrowDown"," ","Enter"].indexOf(b.key)&&(b.preventDefault(),b.stopPropagation(),a._n()),"Tab"===b.key&&a._2()},this.k.addEventListener("keydown",this._a11)}},{key:"_i3",value:function(){var b=this;this.d.utilsScript&&!a.intlTelInputUtils?a.intlTelInputGlobals.windowLoaded?a.intlTelInputGlobals.loadUtils(this.d.utilsScript):a.addEventListener("load",function(){a.intlTelInputGlobals.loadUtils(b.d.utilsScript)}):this.i0(),"auto"===this.d.initialCountry?this._i4():this.h()}},{key:"_i4",value:function(){a.intlTelInputGlobals.autoCountry?this.handleAutoCountry():a.intlTelInputGlobals.startedLoadingAutoCountry||(a.intlTelInputGlobals.startedLoadingAutoCountry=!0,"function"==typeof this.d.geoIpLookup&&this.d.geoIpLookup(function(b){a.intlTelInputGlobals.autoCountry=b.toLowerCase(),setTimeout(function(){return m("handleAutoCountry")})},function(){return m("rejectAutoCountryPromise")}))}},{key:"_j",value:function(){var a=this;this._a12=function(){a._v(a.a.value)&&a._8()},this.a.addEventListener("keyup",this._a12),this._a13=function(){setTimeout(a._a12)},this.a.addEventListener("cut",this._a13),this.a.addEventListener("paste",this._a13)}},{key:"_j2",value:function(a){var b=this.a.getAttribute("maxlength");return b&&a.length>b?a.substr(0,b):a}},{key:"_l",value:function(){var a=this;this._a8=function(){a._l2()},this.a.form&&this.a.form.addEventListener("submit",this._a8),this.a.addEventListener("blur",this._a8)}},{key:"_l2",value:function(){if("+"===this.a.value.charAt(0)){var a=this._m(this.a.value);a&&this.s.dialCode!==a||(this.a.value="")}}},{key:"_m",value:function(a){return a.replace(/\D/g,"")}},{key:"_m2",value:function(a){var c=b.createEvent("Event");c.initEvent(a,!0,!0),this.a.dispatchEvent(c)}},{key:"_n",value:function(){this.m.classList.remove("hide"),this.m.setAttribute("aria-expanded","true"),this._o(),this.b&&(this._x(this.b,!1),this._3(this.b,!0)),this._p(),this.u.classList.add("up"),this._m2("open:countrydropdown")}},{key:"_n2",value:function(a,b,c){c&&!a.classList.contains(b)?a.classList.add(b):!c&&a.classList.contains(b)&&a.classList.remove(b)}},{key:"_o",value:function(){var c=this;if(this.d.dropdownContainer&&this.d.dropdownContainer.appendChild(this.dropdown),!this.g){var d=this.a.getBoundingClientRect(),e=a.pageYOffset||b.documentElement.scrollTop,f=d.top+e,g=this.m.offsetHeight,h=f+this.a.offsetHeight+g<e+a.innerHeight,i=f-g>e;if(this._n2(this.m,"dropup",!h&&i),this.d.dropdownContainer){var j=!h&&i?0:this.a.offsetHeight;this.dropdown.style.top="".concat(f+j,"px"),this.dropdown.style.left="".concat(d.left+b.body.scrollLeft,"px"),this._a4=function(){return c._2()},a.addEventListener("scroll",this._a4)}}}},{key:"_o2",value:function(a){for(var b=a;b&&b!==this.m&&!b.classList.contains("country");)b=b.parentNode;return b===this.m?null:b}},{key:"_p",value:function(){var a=this;this._a0=function(b){var c=a._o2(b.target);c&&a._x(c,!1)},this.m.addEventListener("mouseover",this._a0),this._a1=function(b){var c=a._o2(b.target);c&&a._1(c)},this.m.addEventListener("click",this._a1);var c=!0;this._a2=function(){c||a._2(),c=!1},b.documentElement.addEventListener("click",this._a2);var d="",e=null;this._a3=function(b){b.preventDefault(),"ArrowUp"===b.key||"ArrowDown"===b.key?a._q(b.key):"Enter"===b.key?a._r():"Escape"===b.key?a._2():/^[a-zA-ZÀ-ÿ ]$/.test(b.key)&&(e&&clearTimeout(e),d+=b.key.toLowerCase(),a._s(d),e=setTimeout(function(){d=""},1e3))},b.addEventListener("keydown",this._a3)}},{key:"_q",value:function(a){var b="ArrowUp"===a?this.c.previousElementSibling:this.c.nextElementSibling;b&&(b.classList.contains("divider")&&(b="ArrowUp"===a?b.previousElementSibling:b.nextElementSibling),this._x(b,!0))}},{key:"_r",value:function(){this.c&&this._1(this.c)}},{key:"_s",value:function(a){for(var b=0;b<this.p.length;b++)if(this._t(this.p[b].name,a)){var c=this.m.querySelector("#iti-item-".concat(this.p[b].iso2));this._x(c,!1),this._3(c,!0);break}}},{key:"_t",value:function(a,b){return a.substr(0,b.length).toLowerCase()===b}},{key:"_u",value:function(b){var c=b;if(this.d.formatOnDisplay&&a.intlTelInputUtils&&this.s){var d=!this.d.separateDialCode&&(this.d.nationalMode||"+"!==c.charAt(0)),e=intlTelInputUtils.numberFormat,f=e.NATIONAL,g=e.INTERNATIONAL,h=d?f:g;c=intlTelInputUtils.formatNumber(c,this.s.iso2,h)}c=this._7(c),this.a.value=c}},{key:"_v",value:function(a){var b=a,c="1"===this.s.dialCode;b&&this.d.nationalMode&&c&&"+"!==b.charAt(0)&&("1"!==b.charAt(0)&&(b="1".concat(b)),b="+".concat(b));var d=this._5(b),e=this._m(b),f=null;if(d){var g=this.q[this._m(d)],h=-1!==g.indexOf(this.s.iso2),i="+1"===d&&e.length>=4;if(!("1"===this.s.dialCode&&this._w(e))&&(!h||i))for(var j=0;j<g.length;j++)if(g[j]){f=g[j];break}}else"+"===b.charAt(0)&&e.length?f="":b&&"+"!==b||(f=this.j);return null!==f&&this._z(f)}},{key:"_w",value:function(a){var b=this._m(a);if("1"===b.charAt(0)){var c=b.substr(1,3);return-1!==k.indexOf(c)}return!1}},{key:"_x",value:function(a,b){var c=this.c;c&&c.classList.remove("highlight"),this.c=a,this.c.classList.add("highlight"),b&&this.c.focus()}},{key:"_y",value:function(a,b,c){for(var d=b?f:this.p,e=0;e<d.length;e++)if(d[e].iso2===a)return d[e];if(c)return null;throw new Error("No country data for '".concat(a,"'"))}},{key:"_z",value:function(a){var b=this.s.iso2?this.s:{};this.s=a?this._y(a,!1,!1):{},this.s.iso2&&(this.j=this.s.iso2),this.l.setAttribute("class","iti-flag ".concat(a));var c=a?"".concat(this.s.name,": +").concat(this.s.dialCode):"Unknown";if(this.selectedFlag.setAttribute("title",c),this.d.separateDialCode){var d=this.s.dialCode?"+".concat(this.s.dialCode):"";this.t.innerHTML=d,this.a.style.paddingLeft="".concat(this.selectedFlag.offsetWidth+6,"px")}if(this._0(),this.d.allowDropdown){var e=this.b;if(e&&(e.classList.remove("active"),e.setAttribute("aria-selected","false")),a){var f=this.m.querySelector("#iti-item-".concat(a));f.setAttribute("aria-selected","true"),f.classList.add("active"),this.b=f,this.m.setAttribute("aria-activedescendant",f.getAttribute("id"))}}return b.iso2!==a}},{key:"_0",value:function(){var b="aggressive"===this.d.autoPlaceholder||!this.e&&"polite"===this.d.autoPlaceholder;if(a.intlTelInputUtils&&b){var c=intlTelInputUtils.numberType[this.d.placeholderNumberType],d=this.s.iso2?intlTelInputUtils.getExampleNumber(this.s.iso2,this.d.nationalMode,c):"";d=this._7(d),"function"==typeof this.d.customPlaceholder&&(d=this.d.customPlaceholder(d,this.s)),this.a.setAttribute("placeholder",d)}}},{key:"_1",value:function(a){var b=this._z(a.getAttribute("data-country-code"));this._2(),this._4(a.getAttribute("data-dial-code"),!0),this.a.focus();var c=this.a.value.length;this.a.setSelectionRange(c,c),b&&this._8()}},{key:"_2",value:function(){this.m.classList.add("hide"),this.m.setAttribute("aria-expanded","false"),this.u.classList.remove("up"),b.removeEventListener("keydown",this._a3),b.documentElement.removeEventListener("click",this._a2),this.m.removeEventListener("mouseover",this._a0),this.m.removeEventListener("click",this._a1),this.d.dropdownContainer&&(this.g||a.removeEventListener("scroll",this._a4),this.dropdown.parentNode&&this.dropdown.parentNode.removeChild(this.dropdown)),this._m2("close:countrydropdown")}},{key:"_3",value:function(c,d){var e=this.m,f=a.pageYOffset||b.documentElement.scrollTop,g=e.offsetHeight,h=e.getBoundingClientRect().top+f,i=h+g,j=c.offsetHeight,k=c.getBoundingClientRect().top+f,l=k+j,m=k-h+e.scrollTop,n=g/2-j/2;if(k<h)d&&(m-=n),e.scrollTop=m;else if(l>i){d&&(m+=n);var o=g-j;e.scrollTop=m-o}}},{key:"_4",value:function(a,b){var c,d=this.a.value,e="+".concat(a);if("+"===d.charAt(0)){var f=this._5(d);c=f?d.replace(f,e):e}else{if(this.d.nationalMode||this.d.separateDialCode)return;if(d)c=e+d;else{if(!b&&this.d.autoHideDialCode)return;c=e}}this.a.value=c}},{key:"_5",value:function(a){var b="";if("+"===a.charAt(0))for(var c="",d=0;d<a.length;d++){var e=a.charAt(d);if(!isNaN(parseInt(e,10))&&(c+=e,this.q[c]&&(b=a.substr(0,d+1)),4===c.length))break}return b}},{key:"_6",value:function(){var a=this.a.value.trim(),b=this.s.dialCode,c=this._m(a),d="1"===c.charAt(0)?c:"1".concat(c);return(this.d.separateDialCode&&"+"!==a.charAt(0)?"+".concat(b):a&&"+"!==a.charAt(0)&&"1"!==a.charAt(0)&&b&&"1"===b.charAt(0)&&4===b.length&&b!==d.substr(0,4)?b.substr(1):"")+a}},{key:"_7",value:function(a){var b=a;if(this.d.separateDialCode){var c=this._5(b);if(c){null!==this.s.areaCodes&&(c="+".concat(this.s.dialCode));var d=" "===b[c.length]||"-"===b[c.length]?c.length+1:c.length;b=b.substr(d)}}return this._j2(b)}},{key:"_8",value:function(){this._m2("countrychange")}},{key:"handleAutoCountry",value:function(){"auto"===this.d.initialCountry&&(this.j=a.intlTelInputGlobals.autoCountry,this.a.value||this.setCountry(this.j),this.h())}},{key:"handleUtils",value:function(){a.intlTelInputUtils&&(this.a.value&&this._u(this.a.value),this._0()),this.i0()}},{key:"destroy",value:function(){var b=this.a.form;if(this.d.allowDropdown){this._2(),this.selectedFlag.removeEventListener("click",this._a10),this.k.removeEventListener("keydown",this._a11);var c=this._i1();c&&c.removeEventListener("click",this._a9)}this.hiddenInput&&b&&b.removeEventListener("submit",this._a14),this.d.autoHideDialCode&&(b&&b.removeEventListener("submit",this._a8),this.a.removeEventListener("blur",this._a8)),this.a.removeEventListener("keyup",this._a12),this.a.removeEventListener("cut",this._a13),this.a.removeEventListener("paste",this._a13),this.a.removeAttribute("data-intl-tel-input-id");var d=this.a.parentNode;d.parentNode.insertBefore(this.a,d),d.parentNode.removeChild(d),delete a.intlTelInputGlobals.instances[this.id]}},{key:"getExtension",value:function(){return a.intlTelInputUtils?intlTelInputUtils.getExtension(this._6(),this.s.iso2):""}},{key:"getNumber",value:function(b){if(a.intlTelInputUtils){var c=this.s.iso2;return intlTelInputUtils.formatNumber(this._6(),c,b)}return""}},{key:"getNumberType",value:function(){return a.intlTelInputUtils?intlTelInputUtils.getNumberType(this._6(),this.s.iso2):-99}},{key:"getSelectedCountryData",value:function(){return this.s}},{key:"getValidationError",value:function(){if(a.intlTelInputUtils){var b=this.s.iso2;return intlTelInputUtils.getValidationError(this._6(),b)}return-99}},{key:"isValidNumber",value:function(){var b=this._6().trim(),c=this.d.nationalMode?this.s.iso2:"";return a.intlTelInputUtils?intlTelInputUtils.isValidNumber(b,c):null}},{key:"setCountry",value:function(a){var b=a.toLowerCase();this.l.classList.contains(b)||(this._z(b),this._4(this.s.dialCode,!1),this._8())}},{key:"setNumber",value:function(a){var b=this._v(a);this._u(a),b&&this._8()}},{key:"setPlaceholderNumberType",value:function(a){this.d.placeholderNumberType=a,this._0()}}]),d}();a.intlTelInputGlobals.getCountryData=function(){return f};var o=function(a,c,d){var e=b.createElement("script");e.onload=function(){m("handleUtils"),c&&c()},e.onerror=function(){m("rejectUtilsScriptPromise"),d&&d()},e.className="iti-load-utils",e.async=!0,e.src=a,b.body.appendChild(e)};return a.intlTelInputGlobals.loadUtils=function(b){if(!a.intlTelInputUtils&&!a.intlTelInputGlobals.startedLoadingUtilsScript){if(a.intlTelInputGlobals.startedLoadingUtilsScript=!0,"undefined"!=typeof Promise)return new Promise(function(a,c){return o(b,a,c)});o(b)}return null},a.intlTelInputGlobals.defaults=j,a.intlTelInputGlobals.version="15.1.0",function(b,c){var d=new n(b,c);return d._init(),b.setAttribute("data-intl-tel-input-id",d.id),a.intlTelInputGlobals.instances[d.id]=d,d}}()}(window,document);"object"==typeof module&&module.exports?module.exports=b:window.intlTelInput=b}();;
var Drupal = Drupal || {};
(function ($, Drupal) {
  /* ----------------------------------------------- */
  /* ------------- FrontEnd Functions -------------- */
  /* ----------------------------------------------- */
  /* OnLoad Page */
  'use strict'
  Drupal.behaviors.iotProfileValidation = {
    attach: function (context, settings) {
      $.validator.addMethod("internationalPhone", function (phone_number, element) {
        phone_number = phone_number.replace(/\s+/g, "");
        return this.optional(element) || phone_number.match(/^(([(]?[+]?[(]?[0-9]{1,3}[)]?)|([(]?[0-9]{4}[)]?))\s*[)]?[-\s\.]?[(]?[0-9]{1,3}[)]?([-\s\.]?[0-9]{3})([-\s\.]?[0-9]{3,4})$/m);
      }, Drupal.t("Please specify a valid phone number."));

      // Move all error msg to after input
      if ($(".reg-login-form .form-item").length) {
        $(".reg-login-form .form-item").each(function (index, elm) {
          if ($(elm).next('em.error').length) {
            $(elm).find('.form-control').after($(elm).next('em.error'));
            $(elm).find('em.error').show();
          }
          if ($(elm).next('button.show-pass').length) {
            $(elm).find('.form-control').after($(elm).next('button.show-pass'));
          }
        })
      }

      // Validate form login.
      var value = $("#password_reg").val();

      $.validator.addMethod("checklower", function (value) {
        return /[a-z]/.test(value);
      });
      $.validator.addMethod("checkupper", function (value) {
        return /[A-Z]/.test(value);
      });
      $.validator.addMethod("checkdigit", function (value) {
        return /[0-9]/.test(value);
      });
      $.validator.addMethod("checkspace", function (value) {
        return  !(/\s/g.test(value));
      });
      $.validator.addMethod("checkphone", function (value) {
        return  /^[+]?[\s0-9]+[0-9\-\(\)\s]*$/.test(value);
      });
      $.validator.addMethod("pwcheck", function (value) {
        return /^[A-Za-z0-9\d=!\-@._*]*$/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[A-Z]/.test(value);
      });

      $("#iot-profile-login-form").validate({
        rules: {
          account: "required",
          phone: {
            required: true,
            checkphone: true,
            minlength: 6
          },
          password: {
            required: true,
            checkspace: true,
            // minlength: 8,
          },
        },
        messages: {
          account: Drupal.t("Please enter your username."),
          phone: {
            required: Drupal.t("Please enter your phone number."),
            checkphone: Drupal.t("The phone number is invalid."),
            minlength: Drupal.t("Your phone number too short."),
          },
          password: {
            required: Drupal.t("Please enter your password."),
          },
        },
        errorElement: "em",
        errorPlacement: function (error, element) {
          // Remove prev error element
          if ($(element).closest('.form-item').find('em.error').length) {
            $(element).closest('.form-item').find('em.error').remove();
          }
          // Add the `help-block` class to the error element
          error.addClass("help-block");
          if (element.prop("type") === "checkbox") {
            error.insertAfter(element.parent("label"));
          }
          else {
            error.insertAfter(element);
          }
        },
        highlight: function (element, errorClass, validClass) {
          $(element).parent().addClass("has-error").removeClass("has-success");
        },
        unhighlight: function (element, errorClass, validClass) {
          $(element).parent().addClass("has-success").removeClass("has-error");
          $(element).next('.error').empty();
        },
        invalidHandler: function(event, validator) {
          $('#iot-profile-login-form button.btn-process').removeClass("disabled");
          $('#iot-profile-login-form button.btn-process').html(Drupal.t("Login"));
        }
      });

      // Validate form register.
      $("#iot-profile-register-form").validate({
        rules: {
          account: {
            required: true,
            email: true
          },
          phone: {
            required: true,
            checkphone: true,
            minlength: 6,
          },
          password: {
            required: true,
            checkspace: true,
            minlength: 8,
          },
          confirm_password: {
            required: true,
            minlength: 8,
            equalTo: "#edit-password"
          },
          // verification_code: "required"
        },
        messages: {
          account: {
            required: Drupal.t("We need an email address to contact you."),
            email: Drupal.t("Your email address is not valid.")
          },
          phone: {
            required: Drupal.t("Please enter your phone number."),
            checkphone: Drupal.t("The phone number is invalid."),
            minlength: Drupal.t("Your phone number too short.")
          },
          password: {
            required: Drupal.t("Please provide a password."),
            checkspace: Drupal.t("Your password must not contain spaces."),
            minlength: Drupal.t("Your password must be at least 8 characters long."),
          },
          confirm_password: {
            required: Drupal.t("Please confirm password."),
            minlength: Drupal.t("Your password must be at least 8 characters long."),
            equalTo: Drupal.t("Please enter the same password as above.")
          },
          // verification_code: Drupal.t("Please enter SMS verification code."),
        },
        errorElement: "em",
        errorPlacement: function (error, element) {
          // Remove prev error element
          if ($(element).closest('.form-item').find('em.error').length) {
            $(element).closest('.form-item').find('em.error').remove();
          }
          // Add the `help-block` class to the error element
          error.addClass("help-block");

          if (element.prop("type") === "checkbox") {
            error.insertAfter(element.parent("label"));
          }
          else {
            error.insertAfter(element);
          }
        },
        highlight: function (element, errorClass, validClass) {
          $(element).parent().addClass("has-error").removeClass("has-success");
        },
        unhighlight: function (element, errorClass, validClass) {
          $(element).parent().addClass("has-success").removeClass("has-error");
          $(element).next('.error').empty();
        },
        invalidHandler: function(event, validator) {
          $('#iot-profile-register-form button.btn-process').removeClass("disabled");
          $('#iot-profile-register-form button.btn-process').html(Drupal.t("Register"));
        }
      });

      // Validate form mobile number.
      $("#modal-mobile-verify").validate({
        rules: {
          phone: {
            required: true,
            minlength: 6,
            internationalPhone: true
          },
          smsCode: "required"
        },
        messages: {
          phone: {
            required: Drupal.t("Please enter your phone number."),
            minlength: Drupal.t("Your phone number too short.")
          },
          verification_code: Drupal.t("Please enter SMS verification code."),
        },
        errorElement: "em",
        errorPlacement: function (error, element) {
          // Remove prev error element
          if ($(element).closest('.form-item').find('em.error').length) {
            $(element).closest('.form-item').find('em.error').remove();
          }
          // Add the `help-block` class to the error element
          error.addClass("help-block");

          if (element.prop("type") === "checkbox") {
            error.insertAfter(element.parent("label"));
          }
          else {
            error.insertAfter(element);
          }
        },
        highlight: function (element, errorClass, validClass) {
          $(element).parent().addClass("has-error").removeClass("has-success");
        },
        unhighlight: function (element, errorClass, validClass) {
          // $(element).parent().addClass("has-success").removeClass("has-error");
        }
      });

      // Validate form study abroad.
      function validateFormStudyAbroad(element) {
        $(element).validate({
          rules: {
            practicing_reason: {
              required: true
            },
            destination: {
              required: true
            },
            user_applied: {
              required: true
            }
          },
          // ignore: ".ignore",
          errorPlacement: function (label, element) {
            if (element.is(':radio')) {

              var parent_applied = $(element).parents('.applied-box');
              if (parent_applied.length) {
                parent_applied.find('.radios-error').text($(label).text());
              }

              var parent_reason = $(element).parents('.reason-practice__options');
              if (parent_reason.length) {
                parent_reason.find('.radios-error').text($(label).text());
              }

              var parent_destination = $(element).parents('.destination');
              if (parent_destination.length) {
                parent_destination.find('.radios-error').text($(label).text());
              }
            }
            else {
              label.insertAfter(element);
            }
          }
        });

        var destination = $(element + " input[data-drupal-selector*='edit-destination']");
        var practicing_reason = $(element + " input[data-drupal-selector*='edit-practicing-reason']");
        var user_applied = $(element + " input[data-drupal-selector*='edit-user-applied']");
        var other_destination = $(element + " select[name='other_destination']");
        if (destination.filter(":checked").val() !== '' && destination.filter(":checked").val() !== undefined) {
          other_destination.val('');
          other_destination.selectpicker('refresh');
        }
        if (other_destination.val() !== '') {
          destination.prop('checked', false);
          destination.attr('name', 'destination_ignore');
        }
        destination.change(function () {
          if ($(this).val() !== '') {
            other_destination.val('');
            other_destination.selectpicker('refresh');
            destination.attr('name', 'destination');
          }
        })
        other_destination.change(function () {
          if ($(this).val() !== '') {
            destination.prop('checked', false);
            destination.attr('name', 'destination_ignore');
          }
        });
        practicing_reason.change(function () {
          if ($(this).val() !== 'Study abroad') {
            destination.attr('name', 'destination_ignore');
            user_applied.attr('name', 'user_applied_ignore')
          }
          else {
            if (other_destination.val() !== '') {
              destination.attr('name', 'destination_ignore');
            }
            else {
              destination.attr('name', 'destination');
            }
            user_applied.attr('name', 'user_applied')
          }
        })
        var subjects = $(element + ' input[name="subjects-intend-study"]');
        if (subjects.filter(':checked').length >= 2) {
          subjects.filter(':not(:checked)').attr("disabled", true);
        }
        subjects.change(function () {
          if (subjects.filter(':checked').length >= 2) {
            subjects.filter(':not(:checked)').attr("disabled", true);
          }
          else {
            subjects.removeAttr("disabled");
          }
        });
      }

      // Page /user/profile-create/study-broad-questions.
      if ($("#study-broad-questions-form").length) {
        validateFormStudyAbroad("#study-broad-questions-form");
      }

      // Page /account/my-profile/study-abroad.
      if ($("#my-interest-form").length) {
        validateFormStudyAbroad("#my-interest-form");
      }
    }
  };

})(jQuery, Drupal);


;
(function ($, Drupal) {
  Drupal.behaviors.iot_profile = {
    attach: function (context, settings) {
      if ($('#edit-send-sms-code').length > 0) {
        $('#recaptcha-submit').click(function() {
          $(document).ajaxComplete(function (event, xhr, settings) {
            if (settings.data && settings.data.indexOf("form_id=iot_profile_register_form") != -1) {
              jQuery('.has-error #edit-verification_code-error.help-block').hide();
              jQuery('.has-error #edit-verification_code-error.help-block').html('');
            }
          });
        });
      }
    }
  }
})(jQuery, Drupal);

var itis = [];
(function ($, Drupal) {
  let register_email = getCookie("register_email");
  let register_phone = getCookie("register_phone");
  $.fn.phoneError = function (data) {
    if ($(data).length) {
      $(data).show()
      $(data).closest('.form-item').addClass('has-error 1234')
    }
  }

  function validatePhoneNumber() {
    $('.phone-number').on('keypress keyup', function (event) {
      $(this).val($(this).val().replace(/[^\d].+/, ''))
      if (event.which !== 46 && (event.which < 48 || event.which > 57) || $(this).val().length > 12) {
        event.preventDefault()
      }
      if ($(this).val().length < 6) {
        $(this).focus()
      }
    })
  }

  function checkPathForgotPassword() {
    var pathname = window.location.pathname
    var path_forgot_password = '/account/password'
    if (!pathname.includes(path_forgot_password)) {
      localStorage.removeItem('forgot_password')
    }
  }

  function switchMethodLogin() {
    if ($('.login-box__tab-item.-active').length) {
      var cur_type = $('.login-box__tab-item.-active').data('type');
      if (localStorage.getItem('forget_password') !== null) {
        var type = localStorage.getItem('forget_password')
        cur_type = type
        localStorage.removeItem('forget_password')
        if ($('.login-box__tab-item[data-type="' + type + '"]:not(.-active)').length) {
          setTimeout(function () {
            $('.login-box__tab-item[data-type="' + type + '"]:not(.-active)').trigger('click')
          }, 0)
        }
      }
      else {
        if ($('.login-box__tab-item[data-type="' + type + '"]:not(.-active)').length) {
          setTimeout(function () {
            $('.login-box__tab-item[data-type="' + type + '"]:not(.-active)').trigger('click')
          }, 0)
        }
      }
      // Change link forgot password.
      $('.login-box__tab-item.-active').closest('form').find('.sms-field').hide();
      if ($('.login-box__tab a.login-box__tab-item.first.-active').length) {
        $('.login-box__tab-item.-active').closest('form').find('.sms-field').show();
      }

      if ($('form#iot-profile-login-form').length) {
        var href = $('.login-box__forgot-pass').attr('href');
        var href_forgot_password = $.trim(href.split('?')[0]);
        if (cur_type === 'phone') {
          var new_href_forgot_password = href_forgot_password + '?type=' + cur_type
          if ($('.login-box__forgot-pass_sms').length) {
            $('.login-box__forgot-pass_sms').attr('href', new_href_forgot_password)
          }
        }
        else {
          if ($('.login-box__forgot-pass_sms').length) {
            $('.login-box__forgot-pass_sms').attr('href', href_forgot_password)
          }
        }
      }
    }
    $('.login-box__tab-item').click(function (event) {
      event.preventDefault()
      if ($(this).hasClass('-active')) {
        return false
      }
      else {
        $('.login-box__tab-item').removeClass('-active')
        $(this).addClass('-active')
        $('.toggle-field').toggle()
      }
      var cur_type = $(this).data('type')
      $(this).closest('form').find('[name="login_type"]').val(cur_type)
      if (cur_type === 'phone') {
        // Change link forgot password.
        if ($('form#iot-profile-login-form').length) {
          var new_href_forgot_password = href_forgot_password + '?type=' + cur_type;
          if ($('.login-box__forgot-pass_sms').length) {
            $('.login-box__forgot-pass_sms').attr('href', new_href_forgot_password)
          }
        }
        $(this).closest('form').find('.sms-field').show()
        $(this).closest('form').find('[name="phone"]').attr('required', 'required')
        $(this).closest('form').find('[name="account"]').removeAttr('required')
      }
      else {
        if ($('form#iot-profile-login-form .login-box__forgot-pass_sms').length) {
          $('.login-box__forgot-pass_sms').attr('href', href_forgot_password)
        }
        $(this).closest('form').find('.sms-field').hide()
        $(this).closest('form').find('[name="account"]').attr('required', 'required')
        $(this).closest('form').find('[name="phone"]').removeAttr('required')
      }
    })
    if ($('.login-box__forgot-pass').length) {
      $('.login-box__forgot-pass').click(function () {
        localStorage.removeItem('forget_password')
      })
    }
  }

  function triggerRememberMe() {
    $('input[name="rememberUser"]').click(function () {
      $('input[name="persistent_login"]').prop('checked', $(this).is(':checked'))
    })
  }

  // Detect mobile.
  function is_mobile() {
    var is_mobile = false;
    (function (a, b) {
      if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) {
        is_mobile = true
      }
    })(navigator.userAgent || navigator.vendor || window.opera, 'http://detectmobilebrowser.com/mobile')
    return is_mobile
  }

  // Show password.
  function showInputPassword(context) {
    //button.show-pass
    $('.reg-login-form', context).click(function (e) {
      if ($(e.target).hasClass('show-pass')) {
        $(e.target).toggleClass('active')
        if ($(e.target).hasClass('active')) {
          $(e.target).siblings('input').attr('type', 'text')
        }
        else {
          $(e.target).siblings('input').attr('type', 'password')
        }
      }
    })
  }

  function switchForgotForm() {
    if ($('.forgot-box').length) {
      // Change link login.
      if ($('.forgot-box__tab-item.-active').length) {
        var cur_type = $('.forgot-box__tab-item.-active').data('type');
        if (localStorage.getItem('forget_password') === null) {
          localStorage.setItem('forget_password', cur_type)
        }
      }
      if (localStorage.getItem('forget_password') !== null) {
        var type = localStorage.getItem('forget_password');
        if (type == 'phone') {
          if ($('.alert.alert-dismissible[aria-label="Error message"]').length) {
            $('.alert.alert-dismissible[aria-label="Error message"]').remove()
          }
        }
        if ($('.forgot-box__tab-item[data-type="' + type + '"]:not(.-active)').length) {
          setTimeout(function () {
            $('.forgot-box__tab-item[data-type="' + type + '"]:not(.-active)').trigger('click');
          }, 0)
        }
      }
      $('.forgot-box__tab-item').click(function (event) {
        event.preventDefault()
        var cur_type = $(this).data('type')
        localStorage.setItem('forget_password', cur_type)
        if ($(this).hasClass('-active')) {
          return false
        }
        else {
          $('.forgot-box__tab-item').removeClass('-active')
          $(this).addClass('-active')
          $('.toggle-field').toggle()
        }
      })

    }

  }

  // Set Cookie.
  function setCookie(name, value, days) {
    var expires = "";
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
  }

  // Get Cookie.
  function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1, c.length);
      }
      if (c.indexOf(nameEQ) == 0) {
        return c.substring(nameEQ.length, c.length);
      }
    }
    return null;
  }

  function handlerSaveTypeRegisterAccount() {
    if(!$('form#iot-profile-register-form').length) {
      return;
    }
    // Check account registration and save registration in cookie.
    if ($('form#iot-profile-register-form').valid()) {
      if (register_email == null) {
        if (register_phone != null) {
          document.cookie = "register_phone=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        }
        if ($('input#edit-account').val() != '') {
          setCookie("register_email", 'closed');
        }
      }

      if (register_phone == null) {
        if (register_email != null) {
          document.cookie = "register_email=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        }
        if ($('input#phone-number').val() != '' && $('input#phone-number').val() != null) {
          setCookie("register_phone", 'closed');
        }
      }
    }
  }

  function changeLoginType() {
    if ($('.login-box__tab-item.last.-active').length) {
      $('label.login-box__label.label_last').removeClass('hide');
      $('label.login-box__label.label_first').addClass('hide');
      $('input#phone-number').val('');
    }
    else {
      $('label.login-box__label.label_last').addClass('hide');
      $('label.login-box__label.label_first').removeClass('hide');
      $('input#edit-account').val('');
    }
  }
  Drupal.behaviors.profileOptimization = {
    attach: function (context, settings) {
      $(document).ready(function () {
        switchForgotForm()
        showInputPassword(context)
        // triggerRememberMe();
        // Open wechat login on mobile device
        if ($('#login-with-wechat').length && is_mobile()) {
          $('#login-with-wechat').hide()
          var wlb = $('#login-with-wechat')
          if ($(wlb.data('target')).length) {
            wlb.removeAttr('data-toggle').attr('href', $(wlb.data('target')).data('auth'))
          }
        }

        if ($('.phone-number').length) {
          var intlTelInputOptions = {
            initialCountry: 'auto',
            preferredCountries: ['cn', 'gb', 'vn', 'in'],
            utilsScript: '/modules/custom/iot_profile/js/utils.js'
          }

          $('.phone-number').each(function (index, input) {
            var initInput = input.value
            var country_default = input.dataset.country
            if (input.dataset.country != undefined) {
              country_default = input.dataset.country
            }
            else {
              country_default = localStorage.getItem('country_code')
            }
            intlTelInputOptions.initialCountry = country_default
            var iti = itis[input.name] || window.intlTelInput(input, intlTelInputOptions)
            itis[input.name] = iti

            // Update dialCode
            var selected = iti.getSelectedCountryData()
            if ($('[name="dial_code"]').val() != '') {
              selected['dialCode'] = $('[name="dial_code"]').val()
            }
            else {
              if (settings.language == 'zh-hans') {
                iti.setCountry('cn')
                $('[name="dial_code"]').val('86')
              }
              else {
                // Update dialCode.
                var selected = iti.getSelectedCountryData()
                $('[name="dial_code"]').val(selected.dialCode)
              }
            }

            input.addEventListener('countrychange', function () {
              var selected = iti.getSelectedCountryData()
              if (selected.iso2 == 'vn' && selected.dialCode != '84') {
                selected.dialCode = '84'
              }
              if (selected.iso2 == 'cn' && selected.dialCode != '86') {
                selected.dialCode = '86'
              }
              $('[name="dial_code"]').val(selected.dialCode)
            })

            if (initInput.indexOf('+') == 0) {
              var initialPhone = initInput
            }
            else {
              var initialPhone = '+' + $('[name="dial_code"]').val() + initInput
            }
            if (initInput !== '') {
              iti.setNumber(initialPhone)
            }
            input.value = initInput

            switchMethodLogin()

            //my-interest-form
            if ($('form[data-drupal-selector="my-interest-form"]').length) {
              $('form[data-drupal-selector="my-interest-form"]').on('submit', function (event) {
                input.value = iti.getNumber()
              })
            }
            //study-broad-questions-form
            if ($('form[data-drupal-selector="study-broad-questions-form"]').length) {
              $('form[data-drupal-selector="study-broad-questions-form"]').on('submit', function (event) {
                input.value = iti.getNumber()
              })
            }

            if ($('#edit-send-sms .disable-click, #edit-check-phone-send-sms .disable-click, #edit-send-sms-code .disable-click').length) {
              if ($('.form-item-verification-code.form-item.has-error').length) {
                $('.form-item-verification-code.form-item.has-error').removeClass('has-error error')
                $('#edit-verification_code-error').show()
              }
              if ($('.form-item-phone.form-item.has-error').length) {
                $('.form-item-phone.form-item.has-error').removeClass('has-error error')
                $('#edit-phone-error').empty()
              }
              $('#edit-send-sms .disable-click, #edit-send-sms-code .disable-click, #recaptcha-submit .disable-click, #edit-check-phone-send-sms .disable-click').once('disable_msg_btn').each(function (index, elm) {
                $(elm).parent().attr('disabled', true)
                var timeout = parseInt(elm.dataset['seconds_to_expire']) || 60

                var s = timeout
                $(elm).text(Drupal.t('Use again (@countdowns)', { '@countdown': s }))
                var count_down = setInterval(function () {
                  $(elm).text(Drupal.t('Use again (@countdowns)', { '@countdown': s }))
                  s--
                }, 1000)

                setTimeout(function () {
                  $(elm).parent().removeAttr('disabled')
                  $(elm).remove()

                  if (count_down) {
                    clearInterval(count_down)
                  }
                }, timeout * 1000)
              })
            }
          })
        }
        if ($('#iot-profile-register-corporate-form').length) {
          if (drupalSettings.signup_new_edit_verification_code != undefined) {
            if (drupalSettings.signup_new_edit_verification_code.result == false) {
              $('#iot-profile-register-corporate-form .form-item-verification-code').addClass('has-error')
              $('#iot-profile-register-corporate-form .form-item-verification-code').removeClass('has-ajax')
            }
            else if (drupalSettings.signup_new_edit_verification_code.result == true) {
              $('#iot-profile-register-corporate-form .form-item-verification-code').removeClass('has-error')
              $('#iot-profile-register-corporate-form .form-item-verification-code').addClass('has-ajax')
            }
            else {
              $('#iot-profile-register-corporate-form .form-item-verification-code').removeClass('has-error')
              $('#iot-profile-register-corporate-form .form-item-verification-code').removeClass('has-ajax')
            }
          }
          if ($('.form-type-password').length) {
            $('.form-type-password input').on('keyup keydown', function () {
              if (this.value.length >= 8) {
                $(this).next('em.help-block').text('')
              }
            })
          }
        }

        if ($('.custom-twitter').length) {
          $('.custom-twitter').on('click', function (e) {
            e.preventDefault()
            var $this = $(this)
            $.get($this.attr('href') + '&_format=json', function (res) {
              if (typeof res == 'object' && res.url && typeof res.url == 'string') {
                window.location.href = res.url
              }
              else {
                window.location.href = $this.attr('href')
              }
            })
          })
        }
        if ($('#iot-profile-register-corporate-form').length) {
          if (settings.redirect) {
            $('em.help-block').text('')
            window.location.assign(settings.redirect)
          }
        }

        $('.login-box__tab .login-box__tab-item').click(function () {
          changeLoginType();
        });

        $('.login-box__left .btn-submit').click(function () {
          handlerSaveTypeRegisterAccount();
        });

        checkPathForgotPassword()
      })
    }
  }
}(jQuery, Drupal))
;
