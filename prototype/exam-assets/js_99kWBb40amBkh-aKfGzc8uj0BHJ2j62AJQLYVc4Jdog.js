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
document.execCommand("defaultParagraphSeparator", false, "p");

// Convert setting time from minute to string.
function convertTimeToString(time) {
  // 2
  var hours = Math.floor(time / 60 / 60);

  // 37
  var minutes = Math.floor(time / 60) - (hours * 60);
  if (minutes >= 0 && minutes < 10) {
    minutes = '0' + minutes;
  }
  // 42
  var seconds = time % 60;
  if (seconds >= 0 && seconds < 10) {
    seconds = '0' + seconds;
  }
  return minutes + ":" + seconds;
}

// Countdown.
function countDown(time, renderElm, callback, update) {
  var f1 = new Date().getTime();
  var countDownInt = setInterval(function () {
    var now = new Date().getTime();
    var diff = (now - f1) / 1000 | 0;
    if (time < diff) {
      clearInterval(countDownInt);
      if (typeof callback === 'function') {
        callback();
      }
    }
    else {
      var time_new = time - diff;
      if (typeof update === 'function') {
        update(time_new);
      }
      // console.log(time_new);
      // console.log(convertTimeToString(time_new));
      renderElm.innerHTML = convertTimeToString(time_new);
      renderElm.setAttribute('data-time', time_new)
    }
  }, 100);

  return countDownInt;
}

// Countdown.
function countDownWriting(time, renderElm, callback, update) {
  var f1 = new Date().getTime();
  var countDownInt = setInterval(function () {
    var now = new Date().getTime();
    var diff = (now - f1) / 1000 | 0;
    if (time < diff) {
      clearInterval(countDownInt);
      if (typeof callback === 'function') {
        callback();
      }
    }
    else {
      var time_new = time - diff;
      if (typeof update === 'function') {
        update(time_new);
      }
    }
  }, 100);

  return countDownInt;
}

// count words.
function countWords(elm) {
  try {
    var text = '';
    if (elm.innerText !== '') {
      text = elm.innerText;
    }
    else if (elm.value !== '') {
      text = elm.value;
    }
    if (text !== undefined) {
      var string = text.replace(/\s+/g, ' ').match(/\S+/g);
      return string ? string.length : 0;
    }
  }
  catch (err) {
    console.warn(err);
  }

  return 0;
}
;
var currentTask = 0,
  started = false,
  draf = false,
  redirect;
(function ($, Drupal) {
  var form = $('#real-form');
  var mode = form.find('[name="hidden_mode_field"]').val();
  var btnSubmit = $('[data-drupal-selector="submit-test"]');
  var btnTestReview = $('[data-drupal-selector="test-review"]');
  var btnRetake = $('[data-drupal-selector="review-retake-modal"]');
  var btnReviewEssay = $('[data-drupal-selector="review-essay"]');
  var btnRetakeTest = $('[data-drupal-selector="retake-test"]');
  var timerInterval;
  var shouldShowBeforeUnload = true;

  // ── Task time tracking ────────────────────────────────────────────────────
  // Tổng số giây học sinh đã làm trên từng task.
  var writingTaskTimes = { task_1: 0, task_2: 0 };
  // Task đang được focus (mặc định task_1).
  var activeTask = 'task_1';
  // Tổng elapsed seconds ở lần tick cuối cùng, dùng để tính delta.
  var lastElapsedTracked = 0;
  // Key lưu localStorage.
  // Bao gồm mode trong key để Simulation và Practice mode không dùng chung localStorage.
  var TASK_TIMES_KEY = 'wot_task_times_' + (window.drupalSettings && drupalSettings.wot2 ? drupalSettings.wot2.quizID : 'unknown') + '_' + mode;

  /**
   * Cập nhật activeTask khi học sinh chuyển task.
   * @param {string} task - 'task_1' hoặc 'task_2'
   */
  function setActiveTask(task) {
    activeTask = task;
  }

  /**
   * Cộng dồn thời gian elapsed vào activeTask.
   * Được gọi mỗi giây bởi timer tick.
   * @param {number} elapsedSeconds - Tổng số giây đã trôi qua kể từ khi bắt đầu thi.
   */
  function syncTaskTimeByElapsed(elapsedSeconds) {
    var delta = elapsedSeconds - lastElapsedTracked;
    if (delta > 0) {
      writingTaskTimes[activeTask] += delta;
      lastElapsedTracked = elapsedSeconds;
      persistTaskTimes();
    }
  }

  /**
   * Lưu writingTaskTimes vào localStorage để tránh mất dữ liệu khi F5.
   */
  function persistTaskTimes() {
    try {
      localStorage.setItem(TASK_TIMES_KEY, JSON.stringify(writingTaskTimes));
    } catch (e) {}
  }

  /**
   * Khôi phục writingTaskTimes từ localStorage (nếu có).
   */
  function restoreTaskTimes() {
    try {
      var saved = localStorage.getItem(TASK_TIMES_KEY);
      if (saved) {
        var parsed = JSON.parse(saved);
        if (parsed && typeof parsed.task_1 === 'number') {
          writingTaskTimes = parsed;
        }
      }
    } catch (e) {}
  }

  /**
   * Ghi writingTaskTimes vào các hidden input trước khi submit form.
   */
  function syncTaskValueToField() {
    form.find('[name="field_task_1_time_spent"]').val(writingTaskTimes.task_1);
    form.find('[name="field_task_2_time_spent"]').val(writingTaskTimes.task_2);
  }

  /**
   * Xoá dữ liệu task times khỏi localStorage sau khi submit.
   */
  function clearTaskTimes() {
    try {
      localStorage.removeItem(TASK_TIMES_KEY);
    } catch (e) {}
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Function autoSavedText.
  function autoSavedText() {
    var $textArea = $('.writing-box__answer');
    var $autoSavedButton = $('.realtest-header__btn-save');

    $textArea.on('keydown', function(event) {
      if (event.which === 32) {
        setTimeout(function () {
          // $autoSavedButton.addClass('hide');
          $autoSavedButton.addClass('save_hidden');
        }, 500)
        var trimmedValue = $.trim($textArea.val());

        if (trimmedValue !== '' && trimmedValue.slice(-1) === '') {
          setTimeout(function () {
            $autoSavedButton.addClass('save_hidden');
          }, 500)
        }
      } else {
        $autoSavedButton.removeClass('save_hidden');
      }
    });
    $textArea.on('blur', function() {
      $autoSavedButton.addClass('save_hidden');
    });
  }

  /**
   * Function count words in the textarea.
   * @param {*} textAreaElm
   * @returns {void}
   */
  function countWords(textAreaElm) {
    var count = textAreaElm.val();
    count = count.match(/\S+/g);
    var words = count ? count.length : 0;
    var index = textAreaElm.data('questionItem') - 1;
    if (words == 0) {
      $('.question-palette__part').eq(index).removeClass('-finished');
    }
    $(textAreaElm).closest('.writing-box__answer-wrapper').find('.writing-box__words-num').text(words);
  }

  /**
   * Function update icon for task when completed.
   * @param {*} textAreaElm
   * @returns {void}
   */
  function updateIconTask(textAreaElm) {
    $('.question-palette__part').on('click', function() {
      var count = textAreaElm.val();
      count = count.match(/\S+/g);
      var words = count ? count.length : 0;
      var index = textAreaElm.data('questionItem') - 1;
      if (words) {
        $('.question-palette__part').eq(index).addClass('-finished');
      } else {
        $('.question-palette__part').eq(index).removeClass('-finished');
      }
    });
  }

  // Function click submit test button.
  function submitTest(quizID) {
    btnSubmit.on('click', function (event) {
      event.stopPropagation();
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      var check_empty = false;
      $('textarea.task-item__answer').each(function(index) {
        if($.trim($(this).val()) !== '') {
          check_empty = true;
        }
      });
      if (mode == 'full_test') {
        shouldShowBeforeUnload = false;
        form.find('[data-drupal-selector="edit-submit"]').trigger('click');
        return;
      }
      if (check_empty) {
        shouldShowBeforeUnload = false;
        $('#modal-submit-essay').modal({
          keyboard: false,
          show: true,
          backdrop: 'static'
        });

        if (mode != 'practice_test') {
          // Ghi thời gian task vào hidden fields trước khi submit (fix: simulation time = 0).
          syncTaskValueToField();
          clearTaskTimes();
          form.find('[data-drupal-selector="edit-submit"]').trigger('click');
        }
      }
      else {
        $('#modal-not-taketest').modal({
          keyboard: false,
          show: true,
          backdrop: 'static'
        });
      }
    });
  }

  function startTest(time) {
    started = true;
    timerInterval = countDownWriting(
      time,
      document.querySelector('.realtest-header__time-val'),
      function () {
        finishTest();
      },
      function (t) {
        updateCurrentTime(t);
      }
    );
  }

  function finishTest() {
    syncTaskValueToField();
    clearTaskTimes();
  }

  function updateCurrentTime(t) {
    try {
      var totalInitial = parseInt(form.find('[name="field_total_time"]').data('initial') || form.find('[name="field_total_time"]').val());
      var remaining = parseInt(t);
      // Lưu initial value lần đầu tiên để tính elapsed.
      if (!form.find('[name="field_total_time"]').data('initial')) {
        form.find('[name="field_total_time"]').data('initial', remaining);
        totalInitial = remaining;
      }
      var elapsedSeconds = totalInitial - remaining;
      syncTaskTimeByElapsed(elapsedSeconds);
      form.find('[name="field_total_time"]').val(t);
    } catch (err) {}
  }

  /* OnLoad Window */
  function initTimer() {
    if ($('.writing-test.full-test-wrong').length) {
      shouldShowBeforeUnload = false;
      return;
    }
    var elmDisplay = document.querySelector('#time-clock');
    if (elmDisplay) {
      if (mode === 'practice_test') {
        var totalTime = form.find('[name="field_total_time"]').val();
        // Hide count down when select unlimit time.
        if (totalTime > 24*60*60) {
          $('.realtest-header__time').addClass('hide');
        }
        $('#time-clock').html('');
        var timeDuration = totalTime,
          timer = new Drupal.CountDownTimer(timeDuration),
          timeObj = Drupal.CountDownTimer.parse(timeDuration);
      } else {
        $('#time-clock').html('');
        var timeDuration = elmDisplay.dataset.time,
          timer = new Drupal.CountDownTimer(timeDuration),
          timeObj = Drupal.CountDownTimer.parse(timeDuration);
      }
      formatClockTime(timeObj.minutes, timeObj.seconds);
      timer.onTick(formatClockTime);
      timer.onTick(timeEnd);
      timer.start();
    }

    function timeEnd() {
      if (this.expired()) {
        // End time the test will be auto submit.
        var check_empty = false;
        $('textarea.task-item__answer').each(function(index) {
          if($.trim($(this).val()) !== '') {
            check_empty = true;
          }
        });
        if (check_empty && mode !== 'practice_test') {
          shouldShowBeforeUnload = false;
          form.find('[data-drupal-selector="edit-submit"]').trigger('click');
        }
        else if (check_empty && mode === 'practice_test') {
          shouldShowBeforeUnload = false;
          $('#modal-submit-essay').each(function (event) {
            var modal = $(this)
            modal.find('.close-modal').hide();
            modal.find('.modal-submit-essay__title').html(Drupal.t('Time is up!'));
            modal.find('.modal-submit-essay__caption').hide();
            modal.find('.iot-bt.-grey-blue').hide();
            modal.find('[data-drupal-selector="test-review"]').text(Drupal.t('Submit for evaluation')).addClass('center practice-menu__submit');
          })
          $('#modal-submit-essay').modal({
            keyboard: false,
            show: true,
            backdrop: 'static'
          });
        }
        else {
          $('#modal-not-taketest').each(function (event) {
            var modal = $(this)
            modal.find('.close-modal').hide();
            modal.find('.modal-caption').html(Drupal.t('Time is up!'));
            modal.find('.modal-des').html(Drupal.t('However, we realize that you have not completed the test yet. <br> Please click the "Retake" button below to take the test again before submitting.'));
            modal.find('.iot-bt').text(Drupal.t('Retake'));
            modal.find('.iot-bt').removeAttr('data-dismiss');
          })
          $('#modal-not-taketest').modal({
            keyboard: false,
            show: true,
            backdrop: 'static'
          });
        }
      }
    }

    function formatClockTime(minutes, seconds) {
      minutes = minutes < 10 ? "0" + minutes : minutes;
      seconds = seconds < 10 ? "0" + seconds : seconds;
      var timeValue = minutes >= 1 ? minutes : seconds;
      var timeText = minutes >= 1 ? 'minutes remaining' : 'seconds remaining';

      if (minutes < 1) {
        $('.realtest-header').addClass('time-up');
      }

      if (timeValue >= 1 && seconds != "00") {
        timeValue = parseInt(timeValue) + 1;
        timeValue = timeValue < 10 ? "0" + timeValue : timeValue;
      }

      if (elmDisplay) {
        elmDisplay.innerHTML = '<span class="realtest-header__time-val">'+ timeValue + '</span>'+ '<span class="realtest-header__time-text">'+ timeText +'</span>';
      }
    }
  };

  Drupal.behaviors.WotNewTestResult = {
    attach: function (context, settings) {
      // Practice mode.
      if (settings.save_draft) {
        $('#modal-save-draft-message').modal('show');
        draf = false;
        if(!draf){
          if($('.exit-the-test').hasClass('draf')){
            $('.exit-the-test.draf').removeClass('hidden');
          }
          if($('.exit-the-test').hasClass('no-draf')){
            $('.exit-the-test.no-draf').addClass('hidden');
          }
        }
        if (redirect) {
          window.location.href = redirect;
        }
      }

      $('.practice-menu__save-draft').on('click', function(e) {
        e.preventDefault();
        redirect = $(this).parent().children('a').attr('href');
        $('#modal-save-draft').modal('hide');
        $('[data-drupal-selector="edit-save-draft"]').trigger('click');
      });
      // End practice mode.

      $(document).ready(function ($) {
        window.onload = function () {
          initTimer()
        }
        var quizID = settings.wot2.quizID;
        // Call function autoSavedText.
        autoSavedText();

        // Call function countWords.
        $('.writing-box__answer').each(function () {
          countWords($(this));
        });
        $('.writing-box__answer').on('keyup', function () {
          countWords($(this));
        });

        // ── Task time tracking: restore & detect active task ────────────────
        restoreTaskTimes();

        // Detect active task khi học sinh focus vào textarea.
        $('.writing-box__answer').on('focus', function () {
          var questionItem = parseInt($(this).data('questionItem'));
          setActiveTask('task_' + questionItem);
        });

        // Detect active task khi học sinh bấm Question Palette.
        $('.question-palette__part').on('click', function () {
          var idx = $('.question-palette__part').index(this) + 1;
          setActiveTask('task_' + idx);
        });
        // ────────────────────────────────────────────────────────────────────

        // Call function updateIconTask.
        $('.writing-box__answer').each(function () {
          updateIconTask($(this));
        });

        // Check if has content of tasks.
        if (settings.wot) {
          // Show modal finish test.
          submitTest(quizID);

          $('#modal-not-taketest').on('click', '.iot-bt', function(event) {
            event.stopPropagation();
            shouldShowBeforeUnload = false;
            $('#modal-not-taketest').modal('hide');
          });

          $('.writing-test .modal-exit-test__footer a').on('click', function(event) {
            shouldShowBeforeUnload = false;
          });

          $('.anonymous-user.writing-test .test-notice .iot-bt, .anonymous-user.writing-test .test-notice .test-notice__link').on('click', function(event) {
            shouldShowBeforeUnload = false;
          });

          // Go to test review.
          btnTestReview.on('click', function (e) {
            e.preventDefault();
            syncTaskValueToField();
            $('#modal-submit-essay').modal('hide');
            // Trigger submit the test.
            form.find('[data-drupal-selector="edit-submit"]').trigger('click');
          });

          // Show retake modal.
          btnRetake.on('click', function (e) {
            e.preventDefault();
            $('#modal-retake-test').modal('show');
          });

          // Retake test.
          btnRetakeTest.on('click', function (e) {
            e.preventDefault();
            // resetTest(settings.wot);
            $('#modal-retake-test').modal('hide');
          });

          // Submit test.
          btnReviewEssay.on('click', function (e) {
            e.preventDefault();
            syncTaskValueToField();
            clearTaskTimes();
            // Reset local storage.
            localStorage.setItem('notes_'+quizID, '');
            form.find('[data-drupal-selector="edit-submit"]').trigger('click');
          });

          // Start if this test has draft.
          if (form.find('[name="field_total_time"]').val() <= 3600) {
            setTimeout(function() {
              var time = form.find('[name="field_total_time"]').val();
              startTest(time);
            }, 1500);
          }

          // Re-enable the beforeunload event after a short delay
          if (shouldShowBeforeUnload) {
            setTimeout(function() {
              $(window).on('beforeunload', function(event) {
                // When reload page reset local storage.
                if (quizID) {
                  localStorage.setItem('notes_'+quizID, '');
                }
                if (shouldShowBeforeUnload) {
                  return Drupal.t('Changes you made may not be saved.');
                }
              });
            }, 500);
          }
        }
      });
    }
  };
}(jQuery, Drupal));
;
!function o(a,s,l){function c(t,e){if(!s[t]){if(!a[t]){var n="function"==typeof require&&require;if(!e&&n)return n(t,!0);if(u)return u(t,!0);var r=new Error("Cannot find module '"+t+"'");throw r.code="MODULE_NOT_FOUND",r}var i=s[t]={exports:{}};a[t][0].call(i.exports,function(e){return c(a[t][1][e]||e)},i,i.exports,o,a,s,l)}return s[t].exports}for(var u="function"==typeof require&&require,e=0;e<l.length;e++)c(l[e]);return c}({1:[function(e,t,n){e("../modules/es.symbol"),e("../modules/es.symbol.async-iterator"),e("../modules/es.symbol.description"),e("../modules/es.symbol.has-instance"),e("../modules/es.symbol.is-concat-spreadable"),e("../modules/es.symbol.iterator"),e("../modules/es.symbol.match"),e("../modules/es.symbol.match-all"),e("../modules/es.symbol.replace"),e("../modules/es.symbol.search"),e("../modules/es.symbol.species"),e("../modules/es.symbol.split"),e("../modules/es.symbol.to-primitive"),e("../modules/es.symbol.to-string-tag"),e("../modules/es.symbol.unscopables"),e("../modules/es.object.assign"),e("../modules/es.object.create"),e("../modules/es.object.define-property"),e("../modules/es.object.define-properties"),e("../modules/es.object.entries"),e("../modules/es.object.freeze"),e("../modules/es.object.from-entries"),e("../modules/es.object.get-own-property-descriptor"),e("../modules/es.object.get-own-property-descriptors"),e("../modules/es.object.get-own-property-names"),e("../modules/es.object.get-prototype-of"),e("../modules/es.object.is"),e("../modules/es.object.is-extensible"),e("../modules/es.object.is-frozen"),e("../modules/es.object.is-sealed"),e("../modules/es.object.keys"),e("../modules/es.object.prevent-extensions"),e("../modules/es.object.seal"),e("../modules/es.object.set-prototype-of"),e("../modules/es.object.values"),e("../modules/es.object.to-string"),e("../modules/es.object.define-getter"),e("../modules/es.object.define-setter"),e("../modules/es.object.lookup-getter"),e("../modules/es.object.lookup-setter"),e("../modules/es.function.bind"),e("../modules/es.function.name"),e("../modules/es.function.has-instance"),e("../modules/es.array.from"),e("../modules/es.array.is-array"),e("../modules/es.array.of"),e("../modules/es.array.concat"),e("../modules/es.array.copy-within"),e("../modules/es.array.every"),e("../modules/es.array.fill"),e("../modules/es.array.filter"),e("../modules/es.array.find"),e("../modules/es.array.find-index"),e("../modules/es.array.flat"),e("../modules/es.array.flat-map"),e("../modules/es.array.for-each"),e("../modules/es.array.includes"),e("../modules/es.array.index-of"),e("../modules/es.array.join"),e("../modules/es.array.last-index-of"),e("../modules/es.array.map"),e("../modules/es.array.reduce"),e("../modules/es.array.reduce-right"),e("../modules/es.array.reverse"),e("../modules/es.array.slice"),e("../modules/es.array.some"),e("../modules/es.array.sort"),e("../modules/es.array.splice"),e("../modules/es.array.species"),e("../modules/es.array.unscopables.flat"),e("../modules/es.array.unscopables.flat-map"),e("../modules/es.array.iterator"),e("../modules/es.string.from-code-point"),e("../modules/es.string.raw"),e("../modules/es.string.code-point-at"),e("../modules/es.string.ends-with"),e("../modules/es.string.includes"),e("../modules/es.string.match"),e("../modules/es.string.match-all"),e("../modules/es.string.pad-end"),e("../modules/es.string.pad-start"),e("../modules/es.string.repeat"),e("../modules/es.string.replace"),e("../modules/es.string.search"),e("../modules/es.string.split"),e("../modules/es.string.starts-with"),e("../modules/es.string.trim"),e("../modules/es.string.trim-start"),e("../modules/es.string.trim-end"),e("../modules/es.string.iterator"),e("../modules/es.string.anchor"),e("../modules/es.string.big"),e("../modules/es.string.blink"),e("../modules/es.string.bold"),e("../modules/es.string.fixed"),e("../modules/es.string.fontcolor"),e("../modules/es.string.fontsize"),e("../modules/es.string.italics"),e("../modules/es.string.link"),e("../modules/es.string.small"),e("../modules/es.string.strike"),e("../modules/es.string.sub"),e("../modules/es.string.sup"),e("../modules/es.regexp.constructor"),e("../modules/es.regexp.exec"),e("../modules/es.regexp.flags"),e("../modules/es.regexp.to-string"),e("../modules/es.parse-int"),e("../modules/es.parse-float"),e("../modules/es.number.constructor"),e("../modules/es.number.epsilon"),e("../modules/es.number.is-finite"),e("../modules/es.number.is-integer"),e("../modules/es.number.is-nan"),e("../modules/es.number.is-safe-integer"),e("../modules/es.number.max-safe-integer"),e("../modules/es.number.min-safe-integer"),e("../modules/es.number.parse-float"),e("../modules/es.number.parse-int"),e("../modules/es.number.to-fixed"),e("../modules/es.number.to-precision"),e("../modules/es.math.acosh"),e("../modules/es.math.asinh"),e("../modules/es.math.atanh"),e("../modules/es.math.cbrt"),e("../modules/es.math.clz32"),e("../modules/es.math.cosh"),e("../modules/es.math.expm1"),e("../modules/es.math.fround"),e("../modules/es.math.hypot"),e("../modules/es.math.imul"),e("../modules/es.math.log10"),e("../modules/es.math.log1p"),e("../modules/es.math.log2"),e("../modules/es.math.sign"),e("../modules/es.math.sinh"),e("../modules/es.math.tanh"),e("../modules/es.math.to-string-tag"),e("../modules/es.math.trunc"),e("../modules/es.date.now"),e("../modules/es.date.to-json"),e("../modules/es.date.to-iso-string"),e("../modules/es.date.to-string"),e("../modules/es.date.to-primitive"),e("../modules/es.json.to-string-tag"),e("../modules/es.promise"),e("../modules/es.promise.all-settled"),e("../modules/es.promise.finally"),e("../modules/es.map"),e("../modules/es.set"),e("../modules/es.weak-map"),e("../modules/es.weak-set"),e("../modules/es.array-buffer.constructor"),e("../modules/es.array-buffer.is-view"),e("../modules/es.array-buffer.slice"),e("../modules/es.data-view"),e("../modules/es.typed-array.int8-array"),e("../modules/es.typed-array.uint8-array"),e("../modules/es.typed-array.uint8-clamped-array"),e("../modules/es.typed-array.int16-array"),e("../modules/es.typed-array.uint16-array"),e("../modules/es.typed-array.int32-array"),e("../modules/es.typed-array.uint32-array"),e("../modules/es.typed-array.float32-array"),e("../modules/es.typed-array.float64-array"),e("../modules/es.typed-array.from"),e("../modules/es.typed-array.of"),e("../modules/es.typed-array.copy-within"),e("../modules/es.typed-array.every"),e("../modules/es.typed-array.fill"),e("../modules/es.typed-array.filter"),e("../modules/es.typed-array.find"),e("../modules/es.typed-array.find-index"),e("../modules/es.typed-array.for-each"),e("../modules/es.typed-array.includes"),e("../modules/es.typed-array.index-of"),e("../modules/es.typed-array.iterator"),e("../modules/es.typed-array.join"),e("../modules/es.typed-array.last-index-of"),e("../modules/es.typed-array.map"),e("../modules/es.typed-array.reduce"),e("../modules/es.typed-array.reduce-right"),e("../modules/es.typed-array.reverse"),e("../modules/es.typed-array.set"),e("../modules/es.typed-array.slice"),e("../modules/es.typed-array.some"),e("../modules/es.typed-array.sort"),e("../modules/es.typed-array.subarray"),e("../modules/es.typed-array.to-locale-string"),e("../modules/es.typed-array.to-string"),e("../modules/es.reflect.apply"),e("../modules/es.reflect.construct"),e("../modules/es.reflect.define-property"),e("../modules/es.reflect.delete-property"),e("../modules/es.reflect.get"),e("../modules/es.reflect.get-own-property-descriptor"),e("../modules/es.reflect.get-prototype-of"),e("../modules/es.reflect.has"),e("../modules/es.reflect.is-extensible"),e("../modules/es.reflect.own-keys"),e("../modules/es.reflect.prevent-extensions"),e("../modules/es.reflect.set"),e("../modules/es.reflect.set-prototype-of"),t.exports=e("../internals/path")},{"../internals/path":107,"../modules/es.array-buffer.constructor":148,"../modules/es.array-buffer.is-view":149,"../modules/es.array-buffer.slice":150,"../modules/es.array.concat":151,"../modules/es.array.copy-within":152,"../modules/es.array.every":153,"../modules/es.array.fill":154,"../modules/es.array.filter":155,"../modules/es.array.find":157,"../modules/es.array.find-index":156,"../modules/es.array.flat":159,"../modules/es.array.flat-map":158,"../modules/es.array.for-each":160,"../modules/es.array.from":161,"../modules/es.array.includes":162,"../modules/es.array.index-of":163,"../modules/es.array.is-array":164,"../modules/es.array.iterator":165,"../modules/es.array.join":166,"../modules/es.array.last-index-of":167,"../modules/es.array.map":168,"../modules/es.array.of":169,"../modules/es.array.reduce":171,"../modules/es.array.reduce-right":170,"../modules/es.array.reverse":172,"../modules/es.array.slice":173,"../modules/es.array.some":174,"../modules/es.array.sort":175,"../modules/es.array.species":176,"../modules/es.array.splice":177,"../modules/es.array.unscopables.flat":179,"../modules/es.array.unscopables.flat-map":178,"../modules/es.data-view":180,"../modules/es.date.now":181,"../modules/es.date.to-iso-string":182,"../modules/es.date.to-json":183,"../modules/es.date.to-primitive":184,"../modules/es.date.to-string":185,"../modules/es.function.bind":186,"../modules/es.function.has-instance":187,"../modules/es.function.name":188,"../modules/es.json.to-string-tag":189,"../modules/es.map":190,"../modules/es.math.acosh":191,"../modules/es.math.asinh":192,"../modules/es.math.atanh":193,"../modules/es.math.cbrt":194,"../modules/es.math.clz32":195,"../modules/es.math.cosh":196,"../modules/es.math.expm1":197,"../modules/es.math.fround":198,"../modules/es.math.hypot":199,"../modules/es.math.imul":200,"../modules/es.math.log10":201,"../modules/es.math.log1p":202,"../modules/es.math.log2":203,"../modules/es.math.sign":204,"../modules/es.math.sinh":205,"../modules/es.math.tanh":206,"../modules/es.math.to-string-tag":207,"../modules/es.math.trunc":208,"../modules/es.number.constructor":209,"../modules/es.number.epsilon":210,"../modules/es.number.is-finite":211,"../modules/es.number.is-integer":212,"../modules/es.number.is-nan":213,"../modules/es.number.is-safe-integer":214,"../modules/es.number.max-safe-integer":215,"../modules/es.number.min-safe-integer":216,"../modules/es.number.parse-float":217,"../modules/es.number.parse-int":218,"../modules/es.number.to-fixed":219,"../modules/es.number.to-precision":220,"../modules/es.object.assign":221,"../modules/es.object.create":222,"../modules/es.object.define-getter":223,"../modules/es.object.define-properties":224,"../modules/es.object.define-property":225,"../modules/es.object.define-setter":226,"../modules/es.object.entries":227,"../modules/es.object.freeze":228,"../modules/es.object.from-entries":229,"../modules/es.object.get-own-property-descriptor":230,"../modules/es.object.get-own-property-descriptors":231,"../modules/es.object.get-own-property-names":232,"../modules/es.object.get-prototype-of":233,"../modules/es.object.is":237,"../modules/es.object.is-extensible":234,"../modules/es.object.is-frozen":235,"../modules/es.object.is-sealed":236,"../modules/es.object.keys":238,"../modules/es.object.lookup-getter":239,"../modules/es.object.lookup-setter":240,"../modules/es.object.prevent-extensions":241,"../modules/es.object.seal":242,"../modules/es.object.set-prototype-of":243,"../modules/es.object.to-string":244,"../modules/es.object.values":245,"../modules/es.parse-float":246,"../modules/es.parse-int":247,"../modules/es.promise":250,"../modules/es.promise.all-settled":248,"../modules/es.promise.finally":249,"../modules/es.reflect.apply":251,"../modules/es.reflect.construct":252,"../modules/es.reflect.define-property":253,"../modules/es.reflect.delete-property":254,"../modules/es.reflect.get":257,"../modules/es.reflect.get-own-property-descriptor":255,"../modules/es.reflect.get-prototype-of":256,"../modules/es.reflect.has":258,"../modules/es.reflect.is-extensible":259,"../modules/es.reflect.own-keys":260,"../modules/es.reflect.prevent-extensions":261,"../modules/es.reflect.set":263,"../modules/es.reflect.set-prototype-of":262,"../modules/es.regexp.constructor":264,"../modules/es.regexp.exec":265,"../modules/es.regexp.flags":266,"../modules/es.regexp.to-string":267,"../modules/es.set":268,"../modules/es.string.anchor":269,"../modules/es.string.big":270,"../modules/es.string.blink":271,"../modules/es.string.bold":272,"../modules/es.string.code-point-at":273,"../modules/es.string.ends-with":274,"../modules/es.string.fixed":275,"../modules/es.string.fontcolor":276,"../modules/es.string.fontsize":277,"../modules/es.string.from-code-point":278,"../modules/es.string.includes":279,"../modules/es.string.italics":280,"../modules/es.string.iterator":281,"../modules/es.string.link":282,"../modules/es.string.match":284,"../modules/es.string.match-all":283,"../modules/es.string.pad-end":285,"../modules/es.string.pad-start":286,"../modules/es.string.raw":287,"../modules/es.string.repeat":288,"../modules/es.string.replace":289,"../modules/es.string.search":290,"../modules/es.string.small":291,"../modules/es.string.split":292,"../modules/es.string.starts-with":293,"../modules/es.string.strike":294,"../modules/es.string.sub":295,"../modules/es.string.sup":296,"../modules/es.string.trim":299,"../modules/es.string.trim-end":297,"../modules/es.string.trim-start":298,"../modules/es.symbol":305,"../modules/es.symbol.async-iterator":300,"../modules/es.symbol.description":301,"../modules/es.symbol.has-instance":302,"../modules/es.symbol.is-concat-spreadable":303,"../modules/es.symbol.iterator":304,"../modules/es.symbol.match":307,"../modules/es.symbol.match-all":306,"../modules/es.symbol.replace":308,"../modules/es.symbol.search":309,"../modules/es.symbol.species":310,"../modules/es.symbol.split":311,"../modules/es.symbol.to-primitive":312,"../modules/es.symbol.to-string-tag":313,"../modules/es.symbol.unscopables":314,"../modules/es.typed-array.copy-within":315,"../modules/es.typed-array.every":316,"../modules/es.typed-array.fill":317,"../modules/es.typed-array.filter":318,"../modules/es.typed-array.find":320,"../modules/es.typed-array.find-index":319,"../modules/es.typed-array.float32-array":321,"../modules/es.typed-array.float64-array":322,"../modules/es.typed-array.for-each":323,"../modules/es.typed-array.from":324,"../modules/es.typed-array.includes":325,"../modules/es.typed-array.index-of":326,"../modules/es.typed-array.int16-array":327,"../modules/es.typed-array.int32-array":328,"../modules/es.typed-array.int8-array":329,"../modules/es.typed-array.iterator":330,"../modules/es.typed-array.join":331,"../modules/es.typed-array.last-index-of":332,"../modules/es.typed-array.map":333,"../modules/es.typed-array.of":334,"../modules/es.typed-array.reduce":336,"../modules/es.typed-array.reduce-right":335,"../modules/es.typed-array.reverse":337,"../modules/es.typed-array.set":338,"../modules/es.typed-array.slice":339,"../modules/es.typed-array.some":340,"../modules/es.typed-array.sort":341,"../modules/es.typed-array.subarray":342,"../modules/es.typed-array.to-locale-string":343,"../modules/es.typed-array.to-string":344,"../modules/es.typed-array.uint16-array":345,"../modules/es.typed-array.uint32-array":346,"../modules/es.typed-array.uint8-array":347,"../modules/es.typed-array.uint8-clamped-array":348,"../modules/es.weak-map":349,"../modules/es.weak-set":350}],2:[function(e,t,n){t.exports=function(e){if("function"!=typeof e)throw TypeError(String(e)+" is not a function");return e}},{}],3:[function(e,t,n){var r=e("../internals/is-object");t.exports=function(e){if(!r(e)&&null!==e)throw TypeError("Can't set "+String(e)+" as a prototype");return e}},{"../internals/is-object":71}],4:[function(e,t,n){var r=e("../internals/well-known-symbol"),i=e("../internals/object-create"),o=e("../internals/hide"),a=r("unscopables"),s=Array.prototype;null==s[a]&&o(s,a,i(null)),t.exports=function(e){s[a][e]=!0}},{"../internals/hide":59,"../internals/object-create":90,"../internals/well-known-symbol":145}],5:[function(e,t,n){"use strict";var r=e("../internals/string-multibyte").charAt;t.exports=function(e,t,n){return t+(n?r(e,t).length:1)}},{"../internals/string-multibyte":125}],6:[function(e,t,n){t.exports=function(e,t,n){if(!(e instanceof t))throw TypeError("Incorrect "+(n?n+" ":"")+"invocation");return e}},{}],7:[function(e,t,n){var r=e("../internals/is-object");t.exports=function(e){if(!r(e))throw TypeError(String(e)+" is not an object");return e}},{"../internals/is-object":71}],8:[function(e,t,n){"use strict";function r(e){return s(e)&&l(I,c(e))}var i,o=e("../internals/descriptors"),a=e("../internals/global"),s=e("../internals/is-object"),l=e("../internals/has"),c=e("../internals/classof"),u=e("../internals/hide"),f=e("../internals/redefine"),p=e("../internals/object-define-property").f,d=e("../internals/object-get-prototype-of"),h=e("../internals/object-set-prototype-of"),g=e("../internals/well-known-symbol"),y=e("../internals/uid"),m=a.DataView,b=m&&m.prototype,v=a.Int8Array,x=v&&v.prototype,w=a.Uint8ClampedArray,j=w&&w.prototype,E=v&&d(v),T=x&&d(x),S=Object.prototype,A=S.isPrototypeOf,O=g("toStringTag"),k=y("TYPED_ARRAY_TAG"),N=!(!a.ArrayBuffer||!m),R=N&&!!h&&"Opera"!==c(a.opera),P=!1,I={Int8Array:1,Uint8Array:1,Uint8ClampedArray:1,Int16Array:2,Uint16Array:2,Int32Array:4,Uint32Array:4,Float32Array:4,Float64Array:8};for(i in I)a[i]||(R=!1);if((!R||"function"!=typeof E||E===Function.prototype)&&(E=function(){throw TypeError("Incorrect invocation")},R))for(i in I)a[i]&&h(a[i],E);if((!R||!T||T===S)&&(T=E.prototype,R))for(i in I)a[i]&&h(a[i].prototype,T);if(R&&d(j)!==T&&h(j,T),o&&!l(T,O))for(i in P=!0,p(T,O,{get:function(){return s(this)?this[k]:void 0}}),I)a[i]&&u(a[i],k,i);N&&h&&d(b)!==S&&h(b,S),t.exports={NATIVE_ARRAY_BUFFER:N,NATIVE_ARRAY_BUFFER_VIEWS:R,TYPED_ARRAY_TAG:P&&k,aTypedArray:function(e){if(r(e))return e;throw TypeError("Target is not a typed array")},aTypedArrayConstructor:function(e){if(h){if(A.call(E,e))return e}else for(var t in I)if(l(I,i)){var n=a[t];if(n&&(e===n||A.call(n,e)))return e}throw TypeError("Target is not a typed array constructor")},exportProto:function(e,t,n){if(o){if(n)for(var r in I){var i=a[r];i&&l(i.prototype,e)&&delete i.prototype[e]}T[e]&&!n||f(T,e,n?t:R&&x[e]||t)}},exportStatic:function(e,t,n){var r,i;if(o){if(h){if(n)for(r in I)(i=a[r])&&l(i,e)&&delete i[e];if(E[e]&&!n)return;try{return f(E,e,n?t:R&&v[e]||t)}catch(e){}}for(r in I)!(i=a[r])||i[e]&&!n||f(i,e,t)}},isView:function(e){var t=c(e);return"DataView"===t||l(I,t)},isTypedArray:r,TypedArray:E,TypedArrayPrototype:T}},{"../internals/classof":24,"../internals/descriptors":39,"../internals/global":56,"../internals/has":57,"../internals/hide":59,"../internals/is-object":71,"../internals/object-define-property":92,"../internals/object-get-prototype-of":97,"../internals/object-set-prototype-of":101,"../internals/redefine":112,"../internals/uid":142,"../internals/well-known-symbol":145}],9:[function(e,t,n){"use strict";function r(e,t,n){var r,i,o,a=new Array(n),s=8*n-t-1,l=(1<<s)-1,c=l>>1,u=23===t?z(2,-24)-z(2,-77):0,f=e<0||0===e&&1/e<0?1:0,p=0;for((e=U(e))!=e||e===1/0?(i=e!=e?1:0,r=l):(r=q(B(e)/G),e*(o=z(2,-r))<1&&(r--,o*=2),2<=(e+=1<=r+c?u/o:u*z(2,1-c))*o&&(r++,o/=2),l<=r+c?(i=0,r=l):1<=r+c?(i=(e*o-1)*z(2,t),r+=c):(i=e*z(2,c-1)*z(2,t),r=0));8<=t;a[p++]=255&i,i/=256,t-=8);for(r=r<<t|i,s+=t;0<s;a[p++]=255&r,r/=256,s-=8);return a[--p]|=128*f,a}function i(e,t){var n,r=e.length,i=8*r-t-1,o=(1<<i)-1,a=o>>1,s=i-7,l=r-1,c=e[l--],u=127&c;for(c>>=7;0<s;u=256*u+e[l],l--,s-=8);for(n=u&(1<<-s)-1,u>>=-s,s+=t;0<s;n=256*n+e[l],l--,s-=8);if(0===u)u=1-a;else{if(u===o)return n?NaN:c?-1/0:1/0;n+=z(2,t),u-=a}return(c?-1:1)*n*z(2,u-t)}function o(e){return e[3]<<24|e[2]<<16|e[1]<<8|e[0]}function a(e){return[255&e]}function s(e){return[255&e,e>>8&255]}function l(e){return[255&e,e>>8&255,e>>16&255,e>>24&255]}function c(e){return r(e,23,4)}function u(e){return r(e,52,8)}function f(e,t){S(e[_],t,{get:function(){return N(this)[t]}})}function p(e,t,n,r){var i=E(+n),o=N(e);if(i+t>o.byteLength)throw F(M);var a=N(o.buffer).bytes,s=i+o.byteOffset,l=a.slice(s,s+t);return r?l:l.reverse()}function d(e,t,n,r,i,o){var a=E(+n),s=N(e);if(a+t>s.byteLength)throw F(M);for(var l=N(s.buffer).bytes,c=a+s.byteOffset,u=r(+i),f=0;f<t;f++)l[c+f]=u[o?f:t-f-1]}var h=e("../internals/global"),g=e("../internals/descriptors"),y=e("../internals/array-buffer-view-core").NATIVE_ARRAY_BUFFER,m=e("../internals/hide"),b=e("../internals/redefine-all"),v=e("../internals/fails"),x=e("../internals/an-instance"),w=e("../internals/to-integer"),j=e("../internals/to-length"),E=e("../internals/to-index"),T=e("../internals/object-get-own-property-names").f,S=e("../internals/object-define-property").f,A=e("../internals/array-fill"),O=e("../internals/set-to-string-tag"),k=e("../internals/internal-state"),N=k.get,R=k.set,P="ArrayBuffer",I="DataView",_="prototype",M="Wrong index",L=h[P],C=L,D=h[I],H=h.Math,F=h.RangeError,U=H.abs,z=H.pow,q=H.floor,B=H.log,G=H.LN2;if(y){if(!v(function(){L(1)})||!v(function(){new L(-1)})||v(function(){return new L,new L(1.5),new L(NaN),L.name!=P})){for(var V,W=(C=function(e){return x(this,C),new L(E(e))})[_]=L[_],Y=T(L),X=0;Y.length>X;)(V=Y[X++])in C||m(C,V,L[V]);W.constructor=C}var J=new D(new C(2)),$=D[_].setInt8;J.setInt8(0,2147483648),J.setInt8(1,2147483649),!J.getInt8(0)&&J.getInt8(1)||b(D[_],{setInt8:function(e,t){$.call(this,e,t<<24>>24)},setUint8:function(e,t){$.call(this,e,t<<24>>24)}},{unsafe:!0})}else C=function(e){x(this,C,P);var t=E(e);R(this,{bytes:A.call(new Array(t),0),byteLength:t}),g||(this.byteLength=t)},D=function(e,t,n){x(this,D,I),x(e,C,I);var r=N(e).byteLength,i=w(t);if(i<0||r<i)throw F("Wrong offset");if(r<i+(n=void 0===n?r-i:j(n)))throw F("Wrong length");R(this,{buffer:e,byteLength:n,byteOffset:i}),g||(this.buffer=e,this.byteLength=n,this.byteOffset=i)},g&&(f(C,"byteLength"),f(D,"buffer"),f(D,"byteLength"),f(D,"byteOffset")),b(D[_],{getInt8:function(e){return p(this,1,e)[0]<<24>>24},getUint8:function(e){return p(this,1,e)[0]},getInt16:function(e,t){var n=p(this,2,e,1<arguments.length?t:void 0);return(n[1]<<8|n[0])<<16>>16},getUint16:function(e,t){var n=p(this,2,e,1<arguments.length?t:void 0);return n[1]<<8|n[0]},getInt32:function(e,t){return o(p(this,4,e,1<arguments.length?t:void 0))},getUint32:function(e,t){return o(p(this,4,e,1<arguments.length?t:void 0))>>>0},getFloat32:function(e,t){return i(p(this,4,e,1<arguments.length?t:void 0),23)},getFloat64:function(e,t){return i(p(this,8,e,1<arguments.length?t:void 0),52)},setInt8:function(e,t){d(this,1,e,a,t)},setUint8:function(e,t){d(this,1,e,a,t)},setInt16:function(e,t,n){d(this,2,e,s,t,2<arguments.length?n:void 0)},setUint16:function(e,t,n){d(this,2,e,s,t,2<arguments.length?n:void 0)},setInt32:function(e,t,n){d(this,4,e,l,t,2<arguments.length?n:void 0)},setUint32:function(e,t,n){d(this,4,e,l,t,2<arguments.length?n:void 0)},setFloat32:function(e,t,n){d(this,4,e,c,t,2<arguments.length?n:void 0)},setFloat64:function(e,t,n){d(this,8,e,u,t,2<arguments.length?n:void 0)}});O(C,P),O(D,I),n[P]=C,n[I]=D},{"../internals/an-instance":6,"../internals/array-buffer-view-core":8,"../internals/array-fill":11,"../internals/descriptors":39,"../internals/fails":44,"../internals/global":56,"../internals/hide":59,"../internals/internal-state":66,"../internals/object-define-property":92,"../internals/object-get-own-property-names":95,"../internals/redefine-all":111,"../internals/set-to-string-tag":120,"../internals/to-index":132,"../internals/to-integer":134,"../internals/to-length":135}],10:[function(e,t,n){"use strict";var u=e("../internals/to-object"),f=e("../internals/to-absolute-index"),p=e("../internals/to-length"),d=Math.min;t.exports=[].copyWithin||function(e,t,n){var r=u(this),i=p(r.length),o=f(e,i),a=f(t,i),s=2<arguments.length?n:void 0,l=d((void 0===s?i:f(s,i))-a,i-o),c=1;for(a<o&&o<a+l&&(c=-1,a+=l-1,o+=l-1);0<l--;)a in r?r[o]=r[a]:delete r[o],o+=c,a+=c;return r}},{"../internals/to-absolute-index":131,"../internals/to-length":135,"../internals/to-object":136}],11:[function(e,t,n){"use strict";var c=e("../internals/to-object"),u=e("../internals/to-absolute-index"),f=e("../internals/to-length");t.exports=function(e,t,n){for(var r=c(this),i=f(r.length),o=arguments.length,a=u(1<o?t:void 0,i),s=2<o?n:void 0,l=void 0===s?i:u(s,i);a<l;)r[a++]=e;return r}},{"../internals/to-absolute-index":131,"../internals/to-length":135,"../internals/to-object":136}],12:[function(e,t,n){"use strict";var r=e("../internals/array-iteration").forEach,i=e("../internals/sloppy-array-method");t.exports=i("forEach")?function(e,t){return r(this,e,1<arguments.length?t:void 0)}:[].forEach},{"../internals/array-iteration":15,"../internals/sloppy-array-method":123}],13:[function(e,t,n){"use strict";var h=e("../internals/bind-context"),g=e("../internals/to-object"),y=e("../internals/call-with-safe-iteration-closing"),m=e("../internals/is-array-iterator-method"),b=e("../internals/to-length"),v=e("../internals/create-property"),x=e("../internals/get-iterator-method");t.exports=function(e,t,n){var r,i,o,a,s=g(e),l="function"==typeof this?this:Array,c=arguments.length,u=1<c?t:void 0,f=void 0!==u,p=0,d=x(s);if(f&&(u=h(u,2<c?n:void 0,2)),null==d||l==Array&&m(d))for(i=new l(r=b(s.length));p<r;p++)v(i,p,f?u(s[p],p):s[p]);else for(a=d.call(s),i=new l;!(o=a.next()).done;p++)v(i,p,f?y(a,u,[o.value,p],!0):o.value);return i.length=p,i}},{"../internals/bind-context":20,"../internals/call-with-safe-iteration-closing":21,"../internals/create-property":34,"../internals/get-iterator-method":54,"../internals/is-array-iterator-method":67,"../internals/to-length":135,"../internals/to-object":136}],14:[function(e,t,n){function r(s){return function(e,t,n){var r,i=l(e),o=c(i.length),a=u(n,o);if(s&&t!=t){for(;a<o;)if((r=i[a++])!=r)return!0}else for(;a<o;a++)if((s||a in i)&&i[a]===t)return s||a||0;return!s&&-1}}var l=e("../internals/to-indexed-object"),c=e("../internals/to-length"),u=e("../internals/to-absolute-index");t.exports={includes:r(!0),indexOf:r(!1)}},{"../internals/to-absolute-index":131,"../internals/to-indexed-object":133,"../internals/to-length":135}],15:[function(e,t,n){function r(d){var h=1==d,g=2==d,y=3==d,m=4==d,b=6==d,v=5==d||b;return function(e,t,n,r){for(var i,o,a=j(e),s=w(a),l=x(t,n,3),c=E(s.length),u=0,f=r||T,p=h?f(e,c):g?f(e,0):void 0;u<c;u++)if((v||u in s)&&(o=l(i=s[u],u,a),d))if(h)p[u]=o;else if(o)switch(d){case 3:return!0;case 5:return i;case 6:return u;case 2:S.call(p,i)}else if(m)return!1;return b?-1:y||m?m:p}}var x=e("../internals/bind-context"),w=e("../internals/indexed-object"),j=e("../internals/to-object"),E=e("../internals/to-length"),T=e("../internals/array-species-create"),S=[].push;t.exports={forEach:r(0),map:r(1),filter:r(2),some:r(3),every:r(4),find:r(5),findIndex:r(6)}},{"../internals/array-species-create":19,"../internals/bind-context":20,"../internals/indexed-object":63,"../internals/to-length":135,"../internals/to-object":136}],16:[function(e,t,n){"use strict";var o=e("../internals/to-indexed-object"),a=e("../internals/to-integer"),s=e("../internals/to-length"),r=e("../internals/sloppy-array-method"),l=Math.min,c=[].lastIndexOf,u=!!c&&1/[1].lastIndexOf(1,-0)<0,i=r("lastIndexOf");t.exports=u||i?function(e,t){if(u)return c.apply(this,arguments)||0;var n=o(this),r=s(n.length),i=r-1;for(1<arguments.length&&(i=l(i,a(t))),i<0&&(i=r+i);0<=i;i--)if(i in n&&n[i]===e)return i||0;return-1}:c},{"../internals/sloppy-array-method":123,"../internals/to-indexed-object":133,"../internals/to-integer":134,"../internals/to-length":135}],17:[function(e,t,n){var r=e("../internals/fails"),i=e("../internals/well-known-symbol")("species");t.exports=function(t){return!r(function(){var e=[];return(e.constructor={})[i]=function(){return{foo:1}},1!==e[t](Boolean).foo})}},{"../internals/fails":44,"../internals/well-known-symbol":145}],18:[function(e,t,n){function r(c){return function(e,t,n,r){u(t);var i=f(e),o=p(i),a=d(i.length),s=c?a-1:0,l=c?-1:1;if(n<2)for(;;){if(s in o){r=o[s],s+=l;break}if(s+=l,c?s<0:a<=s)throw TypeError("Reduce of empty array with no initial value")}for(;c?0<=s:s<a;s+=l)s in o&&(r=t(r,o[s],s,i));return r}}var u=e("../internals/a-function"),f=e("../internals/to-object"),p=e("../internals/indexed-object"),d=e("../internals/to-length");t.exports={left:r(!1),right:r(!0)}},{"../internals/a-function":2,"../internals/indexed-object":63,"../internals/to-length":135,"../internals/to-object":136}],19:[function(e,t,n){var r=e("../internals/is-object"),i=e("../internals/is-array"),o=e("../internals/well-known-symbol")("species");t.exports=function(e,t){var n;return i(e)&&("function"!=typeof(n=e.constructor)||n!==Array&&!i(n.prototype)?r(n)&&null===(n=n[o])&&(n=void 0):n=void 0),new(void 0===n?Array:n)(0===t?0:t)}},{"../internals/is-array":68,"../internals/is-object":71,"../internals/well-known-symbol":145}],20:[function(e,t,n){var o=e("../internals/a-function");t.exports=function(r,i,e){if(o(r),void 0===i)return r;switch(e){case 0:return function(){return r.call(i)};case 1:return function(e){return r.call(i,e)};case 2:return function(e,t){return r.call(i,e,t)};case 3:return function(e,t,n){return r.call(i,e,t,n)}}return function(){return r.apply(i,arguments)}}},{"../internals/a-function":2}],21:[function(e,t,n){var o=e("../internals/an-object");t.exports=function(t,e,n,r){try{return r?e(o(n)[0],n[1]):e(n)}catch(e){var i=t.return;throw void 0!==i&&o(i.call(t)),e}}},{"../internals/an-object":7}],22:[function(e,t,n){var i=e("../internals/well-known-symbol")("iterator"),o=!1;try{var r=0,a={next:function(){return{done:!!r++}},return:function(){o=!0}};a[i]=function(){return this},Array.from(a,function(){throw 2})}catch(e){}t.exports=function(e,t){if(!t&&!o)return!1;var n=!1;try{var r={};r[i]=function(){return{next:function(){return{done:n=!0}}}},e(r)}catch(e){}return n}},{"../internals/well-known-symbol":145}],23:[function(e,t,n){var r={}.toString;t.exports=function(e){return r.call(e).slice(8,-1)}},{}],24:[function(e,t,n){var i=e("../internals/classof-raw"),o=e("../internals/well-known-symbol")("toStringTag"),a="Arguments"==i(function(){return arguments}());t.exports=function(e){var t,n,r;return void 0===e?"Undefined":null===e?"Null":"string"==typeof(n=function(e,t){try{return e[t]}catch(e){}}(t=Object(e),o))?n:a?i(t):"Object"==(r=i(t))&&"function"==typeof t.callee?"Arguments":r}},{"../internals/classof-raw":23,"../internals/well-known-symbol":145}],25:[function(e,t,n){"use strict";var c=e("../internals/object-define-property").f,u=e("../internals/object-create"),f=e("../internals/redefine-all"),p=e("../internals/bind-context"),d=e("../internals/an-instance"),h=e("../internals/iterate"),a=e("../internals/define-iterator"),s=e("../internals/set-species"),g=e("../internals/descriptors"),y=e("../internals/internal-metadata").fastKey,r=e("../internals/internal-state"),m=r.set,b=r.getterFor;t.exports={getConstructor:function(e,n,r,i){function o(e,t,n){var r,i,o=s(e),a=l(e,t);return a?a.value=n:(o.last=a={index:i=y(t,!0),key:t,value:n,previous:r=o.last,next:void 0,removed:!1},o.first||(o.first=a),r&&(r.next=a),g?o.size++:e.size++,"F"!==i&&(o.index[i]=a)),e}var a=e(function(e,t){d(e,a,n),m(e,{type:n,index:u(null),first:void 0,last:void 0,size:0}),g||(e.size=0),null!=t&&h(t,e[i],e,r)}),s=b(n),l=function(e,t){var n,r=s(e),i=y(t);if("F"!==i)return r.index[i];for(n=r.first;n;n=n.next)if(n.key==t)return n};return f(a.prototype,{clear:function(){for(var e=s(this),t=e.index,n=e.first;n;)n.removed=!0,n.previous&&(n.previous=n.previous.next=void 0),delete t[n.index],n=n.next;e.first=e.last=void 0,g?e.size=0:this.size=0},delete:function(e){var t=s(this),n=l(this,e);if(n){var r=n.next,i=n.previous;delete t.index[n.index],n.removed=!0,i&&(i.next=r),r&&(r.previous=i),t.first==n&&(t.first=r),t.last==n&&(t.last=i),g?t.size--:this.size--}return!!n},forEach:function(e,t){for(var n,r=s(this),i=p(e,1<arguments.length?t:void 0,3);n=n?n.next:r.first;)for(i(n.value,n.key,this);n&&n.removed;)n=n.previous},has:function(e){return!!l(this,e)}}),f(a.prototype,r?{get:function(e){var t=l(this,e);return t&&t.value},set:function(e,t){return o(this,0===e?0:e,t)}}:{add:function(e){return o(this,e=0===e?0:e,e)}}),g&&c(a.prototype,"size",{get:function(){return s(this).size}}),a},setStrong:function(e,t,n){var r=t+" Iterator",i=b(t),o=b(r);a(e,t,function(e,t){m(this,{type:r,target:e,state:i(e),kind:t,last:void 0})},function(){for(var e=o(this),t=e.kind,n=e.last;n&&n.removed;)n=n.previous;return e.target&&(e.last=n=n?n.next:e.state.first)?"keys"==t?{value:n.key,done:!1}:"values"==t?{value:n.value,done:!1}:{value:[n.key,n.value],done:!1}:{value:e.target=void 0,done:!0}},n?"entries":"values",!n,!0),s(t)}}},{"../internals/an-instance":6,"../internals/bind-context":20,"../internals/define-iterator":37,"../internals/descriptors":39,"../internals/internal-metadata":65,"../internals/internal-state":66,"../internals/iterate":74,"../internals/object-create":90,"../internals/object-define-property":92,"../internals/redefine-all":111,"../internals/set-species":119}],26:[function(e,t,n){"use strict";function l(e){return e.frozen||(e.frozen=new v)}function r(e,t){return a(e.entries,function(e){return e[0]===t})}var c=e("../internals/redefine-all"),u=e("../internals/internal-metadata").getWeakData,f=e("../internals/an-object"),p=e("../internals/is-object"),d=e("../internals/an-instance"),h=e("../internals/iterate"),i=e("../internals/array-iteration"),g=e("../internals/has"),o=e("../internals/internal-state"),y=o.set,m=o.getterFor,a=i.find,s=i.findIndex,b=0,v=function(){this.entries=[]};v.prototype={get:function(e){var t=r(this,e);if(t)return t[1]},has:function(e){return!!r(this,e)},set:function(e,t){var n=r(this,e);n?n[1]=t:this.entries.push([e,t])},delete:function(t){var e=s(this.entries,function(e){return e[0]===t});return~e&&this.entries.splice(e,1),!!~e}},t.exports={getConstructor:function(e,n,r,i){function o(e,t,n){var r=s(e),i=u(f(t),!0);return!0===i?l(r).set(t,n):i[r.id]=n,e}var a=e(function(e,t){d(e,a,n),y(e,{type:n,id:b++,frozen:void 0}),null!=t&&h(t,e[i],e,r)}),s=m(n);return c(a.prototype,{delete:function(e){var t=s(this);if(!p(e))return!1;var n=u(e);return!0===n?l(t).delete(e):n&&g(n,t.id)&&delete n[t.id]},has:function(e){var t=s(this);if(!p(e))return!1;var n=u(e);return!0===n?l(t).has(e):n&&g(n,t.id)}}),c(a.prototype,r?{get:function(e){var t=s(this);if(p(e)){var n=u(e);return!0===n?l(t).get(e):n?n[t.id]:void 0}},set:function(e,t){return o(this,e,t)}}:{add:function(e){return o(this,e,!0)}}),a}}},{"../internals/an-instance":6,"../internals/an-object":7,"../internals/array-iteration":15,"../internals/has":57,"../internals/internal-metadata":65,"../internals/internal-state":66,"../internals/is-object":71,"../internals/iterate":74,"../internals/redefine-all":111}],27:[function(e,t,n){"use strict";var y=e("../internals/export"),m=e("../internals/global"),b=e("../internals/is-forced"),v=e("../internals/redefine"),x=e("../internals/internal-metadata"),w=e("../internals/iterate"),j=e("../internals/an-instance"),E=e("../internals/is-object"),T=e("../internals/fails"),S=e("../internals/check-correctness-of-iteration"),A=e("../internals/set-to-string-tag"),O=e("../internals/inherit-if-required");t.exports=function(r,e,t,i,o){function n(e){var n=s[e];v(s,e,"add"==e?function(e){return n.call(this,0===e?0:e),this}:"delete"==e?function(e){return!(o&&!E(e))&&n.call(this,0===e?0:e)}:"get"==e?function(e){return o&&!E(e)?void 0:n.call(this,0===e?0:e)}:"has"==e?function(e){return!(o&&!E(e))&&n.call(this,0===e?0:e)}:function(e,t){return n.call(this,0===e?0:e,t),this})}var a=m[r],s=a&&a.prototype,l=a,c=i?"set":"add",u={};if(b(r,"function"!=typeof a||!(o||s.forEach&&!T(function(){(new a).entries().next()}))))l=t.getConstructor(e,r,i,c),x.REQUIRED=!0;else if(b(r,!0)){var f=new l,p=f[c](o?{}:-0,1)!=f,d=T(function(){f.has(1)}),h=S(function(e){new a(e)}),g=!o&&T(function(){for(var e=new a,t=5;t--;)e[c](t,t);return!e.has(-0)});h||(((l=e(function(e,t){j(e,l,r);var n=O(new a,e,l);return null!=t&&w(t,n[c],n,i),n})).prototype=s).constructor=l),(d||g)&&(n("delete"),n("has"),i&&n("get")),(g||p)&&n(c),o&&s.clear&&delete s.clear}return u[r]=l,y({global:!0,forced:l!=a},u),A(l,r),o||t.setStrong(l,r,i),l}},{"../internals/an-instance":6,"../internals/check-correctness-of-iteration":22,"../internals/export":43,"../internals/fails":44,"../internals/global":56,"../internals/inherit-if-required":64,"../internals/internal-metadata":65,"../internals/is-forced":69,"../internals/is-object":71,"../internals/iterate":74,"../internals/redefine":112,"../internals/set-to-string-tag":120}],28:[function(e,t,n){var s=e("../internals/has"),l=e("../internals/own-keys"),c=e("../internals/object-get-own-property-descriptor"),u=e("../internals/object-define-property");t.exports=function(e,t){for(var n=l(t),r=u.f,i=c.f,o=0;o<n.length;o++){var a=n[o];s(e,a)||r(e,a,i(t,a))}}},{"../internals/has":57,"../internals/object-define-property":92,"../internals/object-get-own-property-descriptor":93,"../internals/own-keys":104}],29:[function(e,t,n){var r=e("../internals/well-known-symbol")("match");t.exports=function(t){var n=/./;try{"/./"[t](n)}catch(e){try{return n[r]=!1,"/./"[t](n)}catch(e){}}return!1}},{"../internals/well-known-symbol":145}],30:[function(e,t,n){var r=e("../internals/fails");t.exports=!r(function(){function e(){}return e.prototype.constructor=null,Object.getPrototypeOf(new e)!==e.prototype})},{"../internals/fails":44}],31:[function(e,t,n){var a=e("../internals/require-object-coercible"),s=/"/g;t.exports=function(e,t,n,r){var i=String(a(e)),o="<"+t;return""!==n&&(o+=" "+n+'="'+String(r).replace(s,"&quot;")+'"'),o+">"+i+"</"+t+">"}},{"../internals/require-object-coercible":116}],32:[function(e,t,n){"use strict";function i(){return this}var o=e("../internals/iterators-core").IteratorPrototype,a=e("../internals/object-create"),s=e("../internals/create-property-descriptor"),l=e("../internals/set-to-string-tag"),c=e("../internals/iterators");t.exports=function(e,t,n){var r=t+" Iterator";return e.prototype=a(o,{next:s(1,n)}),l(e,r,!1,!0),c[r]=i,e}},{"../internals/create-property-descriptor":33,"../internals/iterators":76,"../internals/iterators-core":75,"../internals/object-create":90,"../internals/set-to-string-tag":120}],33:[function(e,t,n){t.exports=function(e,t){return{enumerable:!(1&e),configurable:!(2&e),writable:!(4&e),value:t}}},{}],34:[function(e,t,n){"use strict";var i=e("../internals/to-primitive"),o=e("../internals/object-define-property"),a=e("../internals/create-property-descriptor");t.exports=function(e,t,n){var r=i(t);r in e?o.f(e,r,a(0,n)):e[r]=n}},{"../internals/create-property-descriptor":33,"../internals/object-define-property":92,"../internals/to-primitive":138}],35:[function(e,t,n){"use strict";var r=e("../internals/fails"),i=e("../internals/string-pad").start,o=Math.abs,a=Date.prototype,s=a.getTime,l=a.toISOString;t.exports=r(function(){return"0385-07-25T07:06:39.999Z"!=l.call(new Date(-5e13-1))})||!r(function(){l.call(new Date(NaN))})?function(){if(!isFinite(s.call(this)))throw RangeError("Invalid time value");var e=this,t=e.getUTCFullYear(),n=e.getUTCMilliseconds(),r=t<0?"-":9999<t?"+":"";return r+i(o(t),r?6:4,0)+"-"+i(e.getUTCMonth()+1,2,0)+"-"+i(e.getUTCDate(),2,0)+"T"+i(e.getUTCHours(),2,0)+":"+i(e.getUTCMinutes(),2,0)+":"+i(e.getUTCSeconds(),2,0)+"."+i(n,3,0)+"Z"}:l},{"../internals/fails":44,"../internals/string-pad":126}],36:[function(e,t,n){"use strict";var r=e("../internals/an-object"),i=e("../internals/to-primitive");t.exports=function(e){if("string"!==e&&"number"!==e&&"default"!==e)throw TypeError("Incorrect hint");return i(r(this),"number"!==e)}},{"../internals/an-object":7,"../internals/to-primitive":138}],37:[function(e,t,n){"use strict";function m(){return this}var b=e("../internals/export"),v=e("../internals/create-iterator-constructor"),x=e("../internals/object-get-prototype-of"),w=e("../internals/object-set-prototype-of"),j=e("../internals/set-to-string-tag"),E=e("../internals/hide"),T=e("../internals/redefine"),r=e("../internals/well-known-symbol"),S=e("../internals/is-pure"),A=e("../internals/iterators"),i=e("../internals/iterators-core"),O=i.IteratorPrototype,k=i.BUGGY_SAFARI_ITERATORS,N=r("iterator"),R="values",P="entries";t.exports=function(e,t,n,r,i,o,a){v(n,t,r);function s(e){if(e===i&&g)return g;if(!k&&e in d)return d[e];switch(e){case"keys":case R:case P:return function(){return new n(this,e)}}return function(){return new n(this)}}var l,c,u,f=t+" Iterator",p=!1,d=e.prototype,h=d[N]||d["@@iterator"]||i&&d[i],g=!k&&h||s(i),y="Array"==t&&d.entries||h;if(y&&(l=x(y.call(new e)),O!==Object.prototype&&l.next&&(S||x(l)===O||(w?w(l,O):"function"!=typeof l[N]&&E(l,N,m)),j(l,f,!0,!0),S&&(A[f]=m))),i==R&&h&&h.name!==R&&(p=!0,g=function(){return h.call(this)}),S&&!a||d[N]===g||E(d,N,g),A[t]=g,i)if(c={values:s(R),keys:o?g:s("keys"),entries:s(P)},a)for(u in c)!k&&!p&&u in d||T(d,u,c[u]);else b({target:t,proto:!0,forced:k||p},c);return c}},{"../internals/create-iterator-constructor":32,"../internals/export":43,"../internals/hide":59,"../internals/is-pure":72,"../internals/iterators":76,"../internals/iterators-core":75,"../internals/object-get-prototype-of":97,"../internals/object-set-prototype-of":101,"../internals/redefine":112,"../internals/set-to-string-tag":120,"../internals/well-known-symbol":145}],38:[function(e,t,n){var r=e("../internals/path"),i=e("../internals/has"),o=e("../internals/wrapped-well-known-symbol"),a=e("../internals/object-define-property").f;t.exports=function(e){var t=r.Symbol||(r.Symbol={});i(t,e)||a(t,e,{value:o.f(e)})}},{"../internals/has":57,"../internals/object-define-property":92,"../internals/path":107,"../internals/wrapped-well-known-symbol":147}],39:[function(e,t,n){var r=e("../internals/fails");t.exports=!r(function(){return 7!=Object.defineProperty({},"a",{get:function(){return 7}}).a})},{"../internals/fails":44}],40:[function(e,t,n){var r=e("../internals/global"),i=e("../internals/is-object"),o=r.document,a=i(o)&&i(o.createElement);t.exports=function(e){return a?o.createElement(e):{}}},{"../internals/global":56,"../internals/is-object":71}],41:[function(e,t,n){t.exports={CSSRuleList:0,CSSStyleDeclaration:0,CSSValueList:0,ClientRectList:0,DOMRectList:0,DOMStringList:0,DOMTokenList:1,DataTransferItemList:0,FileList:0,HTMLAllCollection:0,HTMLCollection:0,HTMLFormElement:0,HTMLSelectElement:0,MediaList:0,MimeTypeArray:0,NamedNodeMap:0,NodeList:1,PaintRequestList:0,Plugin:0,PluginArray:0,SVGLengthList:0,SVGNumberList:0,SVGPathSegList:0,SVGPointList:0,SVGStringList:0,SVGTransformList:0,SourceBufferList:0,StyleSheetList:0,TextTrackCueList:0,TextTrackList:0,TouchList:0}},{}],42:[function(e,t,n){t.exports=["constructor","hasOwnProperty","isPrototypeOf","propertyIsEnumerable","toLocaleString","toString","valueOf"]},{}],43:[function(e,t,n){var u=e("../internals/global"),f=e("../internals/object-get-own-property-descriptor").f,p=e("../internals/hide"),d=e("../internals/redefine"),h=e("../internals/set-global"),g=e("../internals/copy-constructor-properties"),y=e("../internals/is-forced");t.exports=function(e,t){var n,r,i,o,a,s=e.target,l=e.global,c=e.stat;if(n=l?u:c?u[s]||h(s,{}):(u[s]||{}).prototype)for(r in t){if(o=t[r],i=e.noTargetGet?(a=f(n,r))&&a.value:n[r],!y(l?r:s+(c?".":"#")+r,e.forced)&&void 0!==i){if(typeof o==typeof i)continue;g(o,i)}(e.sham||i&&i.sham)&&p(o,"sham",!0),d(n,r,o,e)}}},{"../internals/copy-constructor-properties":28,"../internals/global":56,"../internals/hide":59,"../internals/is-forced":69,"../internals/object-get-own-property-descriptor":93,"../internals/redefine":112,"../internals/set-global":118}],44:[function(e,t,n){t.exports=function(e){try{return!!e()}catch(e){return!0}}},{}],45:[function(e,t,n){"use strict";var f=e("../internals/hide"),p=e("../internals/redefine"),d=e("../internals/fails"),h=e("../internals/well-known-symbol"),g=e("../internals/regexp-exec"),y=h("species"),m=!d(function(){var e=/./;return e.exec=function(){var e=[];return e.groups={a:"7"},e},"7"!=="".replace(e,"$<a>")}),b=!d(function(){var e=/(?:)/,t=e.exec;e.exec=function(){return t.apply(this,arguments)};var n="ab".split(e);return 2!==n.length||"a"!==n[0]||"b"!==n[1]});t.exports=function(n,e,t,r){var i=h(n),o=!d(function(){var e={};return e[i]=function(){return 7},7!=""[n](e)}),a=o&&!d(function(){var e=!1,t=/a/;return t.exec=function(){return e=!0,null},"split"===n&&(t.constructor={},t.constructor[y]=function(){return t}),t[i](""),!e});if(!o||!a||"replace"===n&&!m||"split"===n&&!b){var s=/./[i],l=t(i,""[n],function(e,t,n,r,i){return t.exec===g?o&&!i?{done:!0,value:s.call(t,n,r)}:{done:!0,value:e.call(n,t,r)}:{done:!1}}),c=l[0],u=l[1];p(String.prototype,n,c),p(RegExp.prototype,i,2==e?function(e,t){return u.call(e,this,t)}:function(e){return u.call(e,this)}),r&&f(RegExp.prototype[i],"sham",!0)}}},{"../internals/fails":44,"../internals/hide":59,"../internals/redefine":112,"../internals/regexp-exec":114,"../internals/well-known-symbol":145}],46:[function(e,t,n){"use strict";var p=e("../internals/is-array"),d=e("../internals/to-length"),h=e("../internals/bind-context"),g=function(e,t,n,r,i,o,a,s){for(var l,c=i,u=0,f=!!a&&h(a,s,3);u<r;){if(u in n){if(l=f?f(n[u],u,t):n[u],0<o&&p(l))c=g(e,t,l,d(l.length),c,o-1)-1;else{if(9007199254740991<=c)throw TypeError("Exceed the acceptable array length");e[c]=l}c++}u++}return c};t.exports=g},{"../internals/bind-context":20,"../internals/is-array":68,"../internals/to-length":135}],47:[function(e,t,n){"use strict";var r=e("../internals/is-pure"),i=e("../internals/global"),o=e("../internals/fails");t.exports=r||!o(function(){var e=Math.random();__defineSetter__.call(null,e,function(){}),delete i[e]})},{"../internals/fails":44,"../internals/global":56,"../internals/is-pure":72}],48:[function(e,t,n){var r=e("../internals/fails");t.exports=function(t){return r(function(){var e=""[t]('"');return e!==e.toLowerCase()||3<e.split('"').length})}},{"../internals/fails":44}],49:[function(e,t,n){var r=e("../internals/fails"),i=e("../internals/whitespaces");t.exports=function(e){return r(function(){return!!i[e]()||"​᠎"!="​᠎"[e]()||i[e].name!==e})}},{"../internals/fails":44,"../internals/whitespaces":146}],50:[function(e,t,n){var r=e("../internals/fails");t.exports=!r(function(){return Object.isExtensible(Object.preventExtensions({}))})},{"../internals/fails":44}],51:[function(e,t,n){"use strict";var o=e("../internals/a-function"),a=e("../internals/is-object"),s=[].slice,l={};t.exports=Function.bind||function(t){var n=o(this),r=s.call(arguments,1),i=function(){var e=r.concat(s.call(arguments));return this instanceof i?function(e,t,n){if(!(t in l)){for(var r=[],i=0;i<t;i++)r[i]="a["+i+"]";l[t]=Function("C,a","return new C("+r.join(",")+")")}return l[t](e,n)}(n,e.length,e):n.apply(t,e)};return a(n.prototype)&&(i.prototype=n.prototype),i}},{"../internals/a-function":2,"../internals/is-object":71}],52:[function(e,t,n){var r=e("../internals/shared");t.exports=r("native-function-to-string",Function.toString)},{"../internals/shared":122}],53:[function(e,t,n){function r(e){return"function"==typeof e?e:void 0}var i=e("../internals/path"),o=e("../internals/global");t.exports=function(e,t){return arguments.length<2?r(i[e])||r(o[e]):i[e]&&i[e][t]||o[e]&&o[e][t]}},{"../internals/global":56,"../internals/path":107}],54:[function(e,t,n){var r=e("../internals/classof"),i=e("../internals/iterators"),o=e("../internals/well-known-symbol")("iterator");t.exports=function(e){if(null!=e)return e[o]||e["@@iterator"]||i[r(e)]}},{"../internals/classof":24,"../internals/iterators":76,"../internals/well-known-symbol":145}],55:[function(e,t,n){var r=e("../internals/an-object"),i=e("../internals/get-iterator-method");t.exports=function(e){var t=i(e);if("function"!=typeof t)throw TypeError(String(e)+" is not iterable");return r(t.call(e))}},{"../internals/an-object":7,"../internals/get-iterator-method":54}],56:[function(e,r,t){(function(n){(function(){function e(e){return e&&e.Math==Math&&e}var t="object";r.exports=e(typeof globalThis==t&&globalThis)||e(typeof window==t&&window)||e(typeof self==t&&self)||e(typeof n==t&&n)||Function("return this")()}).call(this)}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],57:[function(e,t,n){var r={}.hasOwnProperty;t.exports=function(e,t){return r.call(e,t)}},{}],58:[function(e,t,n){t.exports={}},{}],59:[function(e,t,n){var r=e("../internals/descriptors"),i=e("../internals/object-define-property"),o=e("../internals/create-property-descriptor");t.exports=r?function(e,t,n){return i.f(e,t,o(1,n))}:function(e,t,n){return e[t]=n,e}},{"../internals/create-property-descriptor":33,"../internals/descriptors":39,"../internals/object-define-property":92}],60:[function(e,t,n){var r=e("../internals/global");t.exports=function(e,t){var n=r.console;n&&n.error&&(1===arguments.length?n.error(e):n.error(e,t))}},{"../internals/global":56}],61:[function(e,t,n){var r=e("../internals/get-built-in");t.exports=r("document","documentElement")},{"../internals/get-built-in":53}],62:[function(e,t,n){var r=e("../internals/descriptors"),i=e("../internals/fails"),o=e("../internals/document-create-element");t.exports=!r&&!i(function(){return 7!=Object.defineProperty(o("div"),"a",{get:function(){return 7}}).a})},{"../internals/descriptors":39,"../internals/document-create-element":40,"../internals/fails":44}],63:[function(e,t,n){var r=e("../internals/fails"),i=e("../internals/classof-raw"),o="".split;t.exports=r(function(){return!Object("z").propertyIsEnumerable(0)})?function(e){return"String"==i(e)?o.call(e,""):Object(e)}:Object},{"../internals/classof-raw":23,"../internals/fails":44}],64:[function(e,t,n){var o=e("../internals/is-object"),a=e("../internals/object-set-prototype-of");t.exports=function(e,t,n){var r,i;return a&&"function"==typeof(r=t.constructor)&&r!==n&&o(i=r.prototype)&&i!==n.prototype&&a(e,i),e}},{"../internals/is-object":71,"../internals/object-set-prototype-of":101}],65:[function(e,t,n){function r(e){s(e,u,{value:{objectID:"O"+ ++f,weakData:{}}})}var i=e("../internals/hidden-keys"),o=e("../internals/is-object"),a=e("../internals/has"),s=e("../internals/object-define-property").f,l=e("../internals/uid"),c=e("../internals/freezing"),u=l("meta"),f=0,p=Object.isExtensible||function(){return!0},d=t.exports={REQUIRED:!1,fastKey:function(e,t){if(!o(e))return"symbol"==typeof e?e:("string"==typeof e?"S":"P")+e;if(!a(e,u)){if(!p(e))return"F";if(!t)return"E";r(e)}return e[u].objectID},getWeakData:function(e,t){if(!a(e,u)){if(!p(e))return!0;if(!t)return!1;r(e)}return e[u].weakData},onFreeze:function(e){return c&&d.REQUIRED&&p(e)&&!a(e,u)&&r(e),e}};i[u]=!0},{"../internals/freezing":50,"../internals/has":57,"../internals/hidden-keys":58,"../internals/is-object":71,"../internals/object-define-property":92,"../internals/uid":142}],66:[function(e,t,n){var r,i,o,a=e("../internals/native-weak-map"),s=e("../internals/global"),l=e("../internals/is-object"),c=e("../internals/hide"),u=e("../internals/has"),f=e("../internals/shared-key"),p=e("../internals/hidden-keys"),d=s.WeakMap;if(a){var h=new d,g=h.get,y=h.has,m=h.set;r=function(e,t){return m.call(h,e,t),t},i=function(e){return g.call(h,e)||{}},o=function(e){return y.call(h,e)}}else{var b=f("state");p[b]=!0,r=function(e,t){return c(e,b,t),t},i=function(e){return u(e,b)?e[b]:{}},o=function(e){return u(e,b)}}t.exports={set:r,get:i,has:o,enforce:function(e){return o(e)?i(e):r(e,{})},getterFor:function(n){return function(e){var t;if(!l(e)||(t=i(e)).type!==n)throw TypeError("Incompatible receiver, "+n+" required");return t}}}},{"../internals/global":56,"../internals/has":57,"../internals/hidden-keys":58,"../internals/hide":59,"../internals/is-object":71,"../internals/native-weak-map":85,"../internals/shared-key":121}],67:[function(e,t,n){var r=e("../internals/well-known-symbol"),i=e("../internals/iterators"),o=r("iterator"),a=Array.prototype;t.exports=function(e){return void 0!==e&&(i.Array===e||a[o]===e)}},{"../internals/iterators":76,"../internals/well-known-symbol":145}],68:[function(e,t,n){var r=e("../internals/classof-raw");t.exports=Array.isArray||function(e){return"Array"==r(e)}},{"../internals/classof-raw":23}],69:[function(e,t,n){function r(e,t){var n=s[a(e)];return n==c||n!=l&&("function"==typeof t?i(t):!!t)}var i=e("../internals/fails"),o=/#|\.prototype\./,a=r.normalize=function(e){return String(e).replace(o,".").toLowerCase()},s=r.data={},l=r.NATIVE="N",c=r.POLYFILL="P";t.exports=r},{"../internals/fails":44}],70:[function(e,t,n){var r=e("../internals/is-object"),i=Math.floor;t.exports=function(e){return!r(e)&&isFinite(e)&&i(e)===e}},{"../internals/is-object":71}],71:[function(e,t,n){t.exports=function(e){return"object"==typeof e?null!==e:"function"==typeof e}},{}],72:[function(e,t,n){t.exports=!1},{}],73:[function(e,t,n){var r=e("../internals/is-object"),i=e("../internals/classof-raw"),o=e("../internals/well-known-symbol")("match");t.exports=function(e){var t;return r(e)&&(void 0!==(t=e[o])?!!t:"RegExp"==i(e))}},{"../internals/classof-raw":23,"../internals/is-object":71,"../internals/well-known-symbol":145}],74:[function(e,t,n){function p(e,t){this.stopped=e,this.result=t}var d=e("../internals/an-object"),h=e("../internals/is-array-iterator-method"),g=e("../internals/to-length"),y=e("../internals/bind-context"),m=e("../internals/get-iterator-method"),b=e("../internals/call-with-safe-iteration-closing");(t.exports=function(e,t,n,r,i){var o,a,s,l,c,u,f=y(t,n,r?2:1);if(i)o=e;else{if("function"!=typeof(a=m(e)))throw TypeError("Target is not iterable");if(h(a)){for(s=0,l=g(e.length);s<l;s++)if((c=r?f(d(u=e[s])[0],u[1]):f(e[s]))&&c instanceof p)return c;return new p(!1)}o=a.call(e)}for(;!(u=o.next()).done;)if((c=b(o,f,u.value,r))&&c instanceof p)return c;return new p(!1)}).stop=function(e){return new p(!0,e)}},{"../internals/an-object":7,"../internals/bind-context":20,"../internals/call-with-safe-iteration-closing":21,"../internals/get-iterator-method":54,"../internals/is-array-iterator-method":67,"../internals/to-length":135}],75:[function(e,t,n){"use strict";var r,i,o,a=e("../internals/object-get-prototype-of"),s=e("../internals/hide"),l=e("../internals/has"),c=e("../internals/well-known-symbol"),u=e("../internals/is-pure"),f=c("iterator"),p=!1;[].keys&&("next"in(o=[].keys())?(i=a(a(o)))!==Object.prototype&&(r=i):p=!0),null==r&&(r={}),u||l(r,f)||s(r,f,function(){return this}),t.exports={IteratorPrototype:r,BUGGY_SAFARI_ITERATORS:p}},{"../internals/has":57,"../internals/hide":59,"../internals/is-pure":72,"../internals/object-get-prototype-of":97,"../internals/well-known-symbol":145}],76:[function(e,t,n){arguments[4][58][0].apply(n,arguments)},{dup:58}],77:[function(e,t,n){var r=Math.expm1,i=Math.exp;t.exports=!r||22025.465794806718<r(10)||r(10)<22025.465794806718||-2e-17!=r(-2e-17)?function(e){return 0==(e=+e)?e:-1e-6<e&&e<1e-6?e+e*e/2:i(e)-1}:r},{}],78:[function(e,t,n){var o=e("../internals/math-sign"),a=Math.abs,r=Math.pow,s=r(2,-52),l=r(2,-23),c=r(2,127)*(2-l),u=r(2,-126);t.exports=Math.fround||function(e){var t,n,r=a(e),i=o(e);return r<u?i*function(e){return e+1/s-1/s}(r/u/l)*u*l:c<(n=(t=(1+l/s)*r)-(t-r))||n!=n?i*(1/0):i*n}},{"../internals/math-sign":80}],79:[function(e,t,n){var r=Math.log;t.exports=Math.log1p||function(e){return-1e-8<(e=+e)&&e<1e-8?e-e*e/2:r(1+e)}},{}],80:[function(e,t,n){t.exports=Math.sign||function(e){return 0==(e=+e)||e!=e?e:e<0?-1:1}},{}],81:[function(e,t,n){var r,i,o,a,s,l,c,u,f=e("../internals/global"),p=e("../internals/object-get-own-property-descriptor").f,d=e("../internals/classof-raw"),h=e("../internals/task").set,g=e("../internals/user-agent"),y=f.MutationObserver||f.WebKitMutationObserver,m=f.process,b=f.Promise,v="process"==d(m),x=p(f,"queueMicrotask"),w=x&&x.value;w||(r=function(){var e,t;for(v&&(e=m.domain)&&e.exit();i;){t=i.fn,i=i.next;try{t()}catch(e){throw i?a():o=void 0,e}}o=void 0,e&&e.enter()},a=v?function(){m.nextTick(r)}:y&&!/(iphone|ipod|ipad).*applewebkit/i.test(g)?(s=!0,l=document.createTextNode(""),new y(r).observe(l,{characterData:!0}),function(){l.data=s=!s}):b&&b.resolve?(c=b.resolve(void 0),u=c.then,function(){u.call(c,r)}):function(){h.call(f,r)}),t.exports=w||function(e){var t={fn:e,next:void 0};o&&(o.next=t),i||(i=t,a()),o=t}},{"../internals/classof-raw":23,"../internals/global":56,"../internals/object-get-own-property-descriptor":93,"../internals/task":129,"../internals/user-agent":143}],82:[function(e,t,n){var r=e("../internals/global");t.exports=r.Promise},{"../internals/global":56}],83:[function(e,t,n){var r=e("../internals/fails");t.exports=!!Object.getOwnPropertySymbols&&!r(function(){return!String(Symbol())})},{"../internals/fails":44}],84:[function(e,t,n){var r=e("../internals/fails"),i=e("../internals/well-known-symbol"),o=e("../internals/is-pure"),a=i("iterator");t.exports=!r(function(){var e=new URL("b?e=1","http://a"),t=e.searchParams;return e.pathname="c%20d",o&&!e.toJSON||!t.sort||"http://a/c%20d?e=1"!==e.href||"1"!==t.get("e")||"a=1"!==String(new URLSearchParams("?a=1"))||!t[a]||"a"!==new URL("https://a@b").username||"b"!==new URLSearchParams(new URLSearchParams("a=b")).get("a")||"xn--e1aybc"!==new URL("http://тест").host||"#%D0%B1"!==new URL("http://a#б").hash})},{"../internals/fails":44,"../internals/is-pure":72,"../internals/well-known-symbol":145}],85:[function(e,t,n){var r=e("../internals/global"),i=e("../internals/function-to-string"),o=r.WeakMap;t.exports="function"==typeof o&&/native code/.test(i.call(o))},{"../internals/function-to-string":52,"../internals/global":56}],86:[function(e,t,n){"use strict";function r(e){var n,r;this.promise=new e(function(e,t){if(void 0!==n||void 0!==r)throw TypeError("Bad Promise constructor");n=e,r=t}),this.resolve=i(n),this.reject=i(r)}var i=e("../internals/a-function");t.exports.f=function(e){return new r(e)}},{"../internals/a-function":2}],87:[function(e,t,n){var r=e("../internals/is-regexp");t.exports=function(e){if(r(e))throw TypeError("The method doesn't accept regular expressions");return e}},{"../internals/is-regexp":73}],88:[function(e,t,n){var r=e("../internals/global").isFinite;t.exports=Number.isFinite||function(e){return"number"==typeof e&&r(e)}},{"../internals/global":56}],89:[function(e,t,n){"use strict";var p=e("../internals/descriptors"),r=e("../internals/fails"),d=e("../internals/object-keys"),h=e("../internals/object-get-own-property-symbols"),g=e("../internals/object-property-is-enumerable"),y=e("../internals/to-object"),m=e("../internals/indexed-object"),i=Object.assign;t.exports=!i||r(function(){var e={},t={},n=Symbol(),r="abcdefghijklmnopqrst";return e[n]=7,r.split("").forEach(function(e){t[e]=e}),7!=i({},e)[n]||d(i({},t)).join("")!=r})?function(e,t){for(var n=y(e),r=arguments.length,i=1,o=h.f,a=g.f;i<r;)for(var s,l=m(arguments[i++]),c=o?d(l).concat(o(l)):d(l),u=c.length,f=0;f<u;)s=c[f++],p&&!a.call(l,s)||(n[s]=l[s]);return n}:i},{"../internals/descriptors":39,"../internals/fails":44,"../internals/indexed-object":63,"../internals/object-get-own-property-symbols":96,"../internals/object-keys":99,"../internals/object-property-is-enumerable":100,"../internals/to-object":136}],90:[function(e,t,n){function r(){}var i=e("../internals/an-object"),o=e("../internals/object-define-properties"),a=e("../internals/enum-bug-keys"),s=e("../internals/hidden-keys"),l=e("../internals/html"),c=e("../internals/document-create-element"),u=e("../internals/shared-key")("IE_PROTO"),f="prototype",p=function(){var e,t=c("iframe"),n=a.length,r="script";for(t.style.display="none",l.appendChild(t),t.src=String("javascript:"),(e=t.contentWindow.document).open(),e.write("<script>document.F=Object</"+r+">"),e.close(),p=e.F;n--;)delete p[f][a[n]];return p()};t.exports=Object.create||function(e,t){var n;return null!==e?(r[f]=i(e),n=new r,r[f]=null,n[u]=e):n=p(),void 0===t?n:o(n,t)},s[u]=!0},{"../internals/an-object":7,"../internals/document-create-element":40,"../internals/enum-bug-keys":42,"../internals/hidden-keys":58,"../internals/html":61,"../internals/object-define-properties":91,"../internals/shared-key":121}],91:[function(e,t,n){var r=e("../internals/descriptors"),a=e("../internals/object-define-property"),s=e("../internals/an-object"),l=e("../internals/object-keys");t.exports=r?Object.defineProperties:function(e,t){s(e);for(var n,r=l(t),i=r.length,o=0;o<i;)a.f(e,n=r[o++],t[n]);return e}},{"../internals/an-object":7,"../internals/descriptors":39,"../internals/object-define-property":92,"../internals/object-keys":99}],92:[function(e,t,n){var r=e("../internals/descriptors"),i=e("../internals/ie8-dom-define"),o=e("../internals/an-object"),a=e("../internals/to-primitive"),s=Object.defineProperty;n.f=r?s:function(e,t,n){if(o(e),t=a(t,!0),o(n),i)try{return s(e,t,n)}catch(e){}if("get"in n||"set"in n)throw TypeError("Accessors not supported");return"value"in n&&(e[t]=n.value),e}},{"../internals/an-object":7,"../internals/descriptors":39,"../internals/ie8-dom-define":62,"../internals/to-primitive":138}],93:[function(e,t,n){var r=e("../internals/descriptors"),i=e("../internals/object-property-is-enumerable"),o=e("../internals/create-property-descriptor"),a=e("../internals/to-indexed-object"),s=e("../internals/to-primitive"),l=e("../internals/has"),c=e("../internals/ie8-dom-define"),u=Object.getOwnPropertyDescriptor;n.f=r?u:function(e,t){if(e=a(e),t=s(t,!0),c)try{return u(e,t)}catch(e){}if(l(e,t))return o(!i.f.call(e,t),e[t])}},{"../internals/create-property-descriptor":33,"../internals/descriptors":39,"../internals/has":57,"../internals/ie8-dom-define":62,"../internals/object-property-is-enumerable":100,"../internals/to-indexed-object":133,"../internals/to-primitive":138}],94:[function(e,t,n){var r=e("../internals/to-indexed-object"),i=e("../internals/object-get-own-property-names").f,o={}.toString,a="object"==typeof window&&window&&Object.getOwnPropertyNames?Object.getOwnPropertyNames(window):[];t.exports.f=function(e){return a&&"[object Window]"==o.call(e)?function(e){try{return i(e)}catch(e){return a.slice()}}(e):i(r(e))}},{"../internals/object-get-own-property-names":95,"../internals/to-indexed-object":133}],95:[function(e,t,n){var r=e("../internals/object-keys-internal"),i=e("../internals/enum-bug-keys").concat("length","prototype");n.f=Object.getOwnPropertyNames||function(e){return r(e,i)}},{"../internals/enum-bug-keys":42,"../internals/object-keys-internal":98}],96:[function(e,t,n){n.f=Object.getOwnPropertySymbols},{}],97:[function(e,t,n){var r=e("../internals/has"),i=e("../internals/to-object"),o=e("../internals/shared-key"),a=e("../internals/correct-prototype-getter"),s=o("IE_PROTO"),l=Object.prototype;t.exports=a?Object.getPrototypeOf:function(e){return e=i(e),r(e,s)?e[s]:"function"==typeof e.constructor&&e instanceof e.constructor?e.constructor.prototype:e instanceof Object?l:null}},{"../internals/correct-prototype-getter":30,"../internals/has":57,"../internals/shared-key":121,"../internals/to-object":136}],98:[function(e,t,n){var a=e("../internals/has"),s=e("../internals/to-indexed-object"),l=e("../internals/array-includes").indexOf,c=e("../internals/hidden-keys");t.exports=function(e,t){var n,r=s(e),i=0,o=[];for(n in r)!a(c,n)&&a(r,n)&&o.push(n);for(;t.length>i;)a(r,n=t[i++])&&(~l(o,n)||o.push(n));return o}},{"../internals/array-includes":14,"../internals/has":57,"../internals/hidden-keys":58,"../internals/to-indexed-object":133}],99:[function(e,t,n){var r=e("../internals/object-keys-internal"),i=e("../internals/enum-bug-keys");t.exports=Object.keys||function(e){return r(e,i)}},{"../internals/enum-bug-keys":42,"../internals/object-keys-internal":98}],100:[function(e,t,n){"use strict";var r={}.propertyIsEnumerable,i=Object.getOwnPropertyDescriptor,o=i&&!r.call({1:2},1);n.f=o?function(e){var t=i(this,e);return!!t&&t.enumerable}:r},{}],101:[function(e,t,n){var i=e("../internals/an-object"),o=e("../internals/a-possible-prototype");t.exports=Object.setPrototypeOf||("__proto__"in{}?function(){var n,r=!1,e={};try{(n=Object.getOwnPropertyDescriptor(Object.prototype,"__proto__").set).call(e,[]),r=e instanceof Array}catch(e){}return function(e,t){return i(e),o(t),r?n.call(e,t):e.__proto__=t,e}}():void 0)},{"../internals/a-possible-prototype":3,"../internals/an-object":7}],102:[function(e,t,n){function r(s){return function(e){for(var t,n=u(e),r=c(n),i=r.length,o=0,a=[];o<i;)t=r[o++],l&&!f.call(n,t)||a.push(s?[t,n[t]]:n[t]);return a}}var l=e("../internals/descriptors"),c=e("../internals/object-keys"),u=e("../internals/to-indexed-object"),f=e("../internals/object-property-is-enumerable").f;t.exports={entries:r(!0),values:r(!1)}},{"../internals/descriptors":39,"../internals/object-keys":99,"../internals/object-property-is-enumerable":100,"../internals/to-indexed-object":133}],103:[function(e,t,n){"use strict";var r=e("../internals/classof"),i={};i[e("../internals/well-known-symbol")("toStringTag")]="z",t.exports="[object z]"!==String(i)?function(){return"[object "+r(this)+"]"}:i.toString},{"../internals/classof":24,"../internals/well-known-symbol":145}],104:[function(e,t,n){var r=e("../internals/get-built-in"),i=e("../internals/object-get-own-property-names"),o=e("../internals/object-get-own-property-symbols"),a=e("../internals/an-object");t.exports=r("Reflect","ownKeys")||function(e){var t=i.f(a(e)),n=o.f;return n?t.concat(n(e)):t}},{"../internals/an-object":7,"../internals/get-built-in":53,"../internals/object-get-own-property-names":95,"../internals/object-get-own-property-symbols":96}],105:[function(e,t,n){var r=e("../internals/global"),i=e("../internals/string-trim").trim,o=e("../internals/whitespaces"),a=r.parseFloat,s=1/a(o+"-0")!=-1/0;t.exports=s?function(e){var t=i(String(e)),n=a(t);return 0===n&&"-"==t.charAt(0)?-0:n}:a},{"../internals/global":56,"../internals/string-trim":128,"../internals/whitespaces":146}],106:[function(e,t,n){var r=e("../internals/global"),i=e("../internals/string-trim").trim,o=e("../internals/whitespaces"),a=r.parseInt,s=/^[+-]?0[Xx]/,l=8!==a(o+"08")||22!==a(o+"0x16");t.exports=l?function(e,t){var n=i(String(e));return a(n,t>>>0||(s.test(n)?16:10))}:a},{"../internals/global":56,"../internals/string-trim":128,"../internals/whitespaces":146}],107:[function(e,t,n){t.exports=e("../internals/global")},{"../internals/global":56}],108:[function(e,t,n){t.exports=function(e){try{return{error:!1,value:e()}}catch(e){return{error:!0,value:e}}}},{}],109:[function(e,t,n){var r=e("../internals/an-object"),i=e("../internals/is-object"),o=e("../internals/new-promise-capability");t.exports=function(e,t){if(r(e),i(t)&&t.constructor===e)return t;var n=o.f(e);return(0,n.resolve)(t),n.promise}},{"../internals/an-object":7,"../internals/is-object":71,"../internals/new-promise-capability":86}],110:[function(e,t,n){"use strict";function m(e){return e+22+75*(e<26)}function b(e,t,n){var r=0;for(e=n?w(e/700):e>>1,e+=w(e/t);455<e;r+=36)e=w(e/35);return w(r+36*e/(e+38))}function o(e){var t,n,r=[],i=(e=function(e){for(var t=[],n=0,r=e.length;n<r;){var i=e.charCodeAt(n++);if(55296<=i&&i<=56319&&n<r){var o=e.charCodeAt(n++);56320==(64512&o)?t.push(((1023&i)<<10)+(1023&o)+65536):(t.push(i),n--)}else t.push(i)}return t}(e)).length,o=128,a=0,s=72;for(t=0;t<e.length;t++)(n=e[t])<128&&r.push(j(n));var l=r.length,c=l;for(l&&r.push("-");c<i;){var u=v;for(t=0;t<e.length;t++)o<=(n=e[t])&&n<u&&(u=n);var f=c+1;if(u-o>w((v-a)/f))throw RangeError(x);for(a+=(u-o)*f,o=u,t=0;t<e.length;t++){if((n=e[t])<o&&++a>v)throw RangeError(x);if(n==o){for(var p=a,d=36;;d+=36){var h=d<=s?1:s+26<=d?26:d-s;if(p<h)break;var g=p-h,y=36-h;r.push(j(m(h+g%y))),p=w(g/y)}r.push(j(m(p))),s=b(a,f,c==l),a=0,++c}}++a,++o}return r.join("")}var v=2147483647,a=/[^\0-\u007E]/,s=/[.\u3002\uFF0E\uFF61]/g,x="Overflow: input needs wider integers to process",w=Math.floor,j=String.fromCharCode;t.exports=function(e){var t,n,r=[],i=e.toLowerCase().replace(s,".").split(".");for(t=0;t<i.length;t++)n=i[t],r.push(a.test(n)?"xn--"+o(n):n);return r.join(".")}},{}],111:[function(e,t,n){var i=e("../internals/redefine");t.exports=function(e,t,n){for(var r in t)i(e,r,t[r],n);return e}},{"../internals/redefine":112}],112:[function(e,t,n){var s=e("../internals/global"),r=e("../internals/shared"),l=e("../internals/hide"),c=e("../internals/has"),u=e("../internals/set-global"),i=e("../internals/function-to-string"),o=e("../internals/internal-state"),a=o.get,f=o.enforce,p=String(i).split("toString");r("inspectSource",function(e){return i.call(e)}),(t.exports=function(e,t,n,r){var i=!!r&&!!r.unsafe,o=!!r&&!!r.enumerable,a=!!r&&!!r.noTargetGet;"function"==typeof n&&("string"!=typeof t||c(n,"name")||l(n,"name",t),f(n).source=p.join("string"==typeof t?t:"")),e!==s?(i?!a&&e[t]&&(o=!0):delete e[t],o?e[t]=n:l(e,t,n)):o?e[t]=n:u(t,n)})(Function.prototype,"toString",function(){return"function"==typeof this&&a(this).source||i.call(this)})},{"../internals/function-to-string":52,"../internals/global":56,"../internals/has":57,"../internals/hide":59,"../internals/internal-state":66,"../internals/set-global":118,"../internals/shared":122}],113:[function(e,t,n){var i=e("./classof-raw"),o=e("./regexp-exec");t.exports=function(e,t){var n=e.exec;if("function"==typeof n){var r=n.call(e,t);if("object"!=typeof r)throw TypeError("RegExp exec method returned something other than an Object or null");return r}if("RegExp"!==i(e))throw TypeError("RegExp#exec called on incompatible receiver");return o.call(e,t)}},{"./classof-raw":23,"./regexp-exec":114}],114:[function(e,t,n){"use strict";var r,i,a=e("./regexp-flags"),s=RegExp.prototype.exec,l=String.prototype.replace,o=s,c=(r=/a/,i=/b*/g,s.call(r,"a"),s.call(i,"a"),0!==r.lastIndex||0!==i.lastIndex),u=void 0!==/()??/.exec("")[1];(c||u)&&(o=function(e){var t,n,r,i,o=this;return u&&(n=new RegExp("^"+o.source+"$(?!\\s)",a.call(o))),c&&(t=o.lastIndex),r=s.call(o,e),c&&r&&(o.lastIndex=o.global?r.index+r[0].length:t),u&&r&&1<r.length&&l.call(r[0],n,function(){for(i=1;i<arguments.length-2;i++)void 0===arguments[i]&&(r[i]=void 0)}),r}),t.exports=o},{"./regexp-flags":115}],115:[function(e,t,n){"use strict";var r=e("../internals/an-object");t.exports=function(){var e=r(this),t="";return e.global&&(t+="g"),e.ignoreCase&&(t+="i"),e.multiline&&(t+="m"),e.dotAll&&(t+="s"),e.unicode&&(t+="u"),e.sticky&&(t+="y"),t}},{"../internals/an-object":7}],116:[function(e,t,n){t.exports=function(e){if(null==e)throw TypeError("Can't call method on "+e);return e}},{}],117:[function(e,t,n){t.exports=Object.is||function(e,t){return e===t?0!==e||1/e==1/t:e!=e&&t!=t}},{}],118:[function(e,t,n){var r=e("../internals/global"),i=e("../internals/hide");t.exports=function(t,n){try{i(r,t,n)}catch(e){r[t]=n}return n}},{"../internals/global":56,"../internals/hide":59}],119:[function(e,t,n){"use strict";var r=e("../internals/get-built-in"),i=e("../internals/object-define-property"),o=e("../internals/well-known-symbol"),a=e("../internals/descriptors"),s=o("species");t.exports=function(e){var t=r(e),n=i.f;a&&t&&!t[s]&&n(t,s,{configurable:!0,get:function(){return this}})}},{"../internals/descriptors":39,"../internals/get-built-in":53,"../internals/object-define-property":92,"../internals/well-known-symbol":145}],120:[function(e,t,n){var r=e("../internals/object-define-property").f,i=e("../internals/has"),o=e("../internals/well-known-symbol")("toStringTag");t.exports=function(e,t,n){e&&!i(e=n?e:e.prototype,o)&&r(e,o,{configurable:!0,value:t})}},{"../internals/has":57,"../internals/object-define-property":92,"../internals/well-known-symbol":145}],121:[function(e,t,n){var r=e("../internals/shared"),i=e("../internals/uid"),o=r("keys");t.exports=function(e){return o[e]||(o[e]=i(e))}},{"../internals/shared":122,"../internals/uid":142}],122:[function(e,t,n){var r=e("../internals/global"),i=e("../internals/set-global"),o=e("../internals/is-pure"),a="__core-js_shared__",s=r[a]||i(a,{});(t.exports=function(e,t){return s[e]||(s[e]=void 0!==t?t:{})})("versions",[]).push({version:"3.2.1",mode:o?"pure":"global",copyright:"© 2019 Denis Pushkarev (zloirock.ru)"})},{"../internals/global":56,"../internals/is-pure":72,"../internals/set-global":118}],123:[function(e,t,n){"use strict";var r=e("../internals/fails");t.exports=function(e,t){var n=[][e];return!n||!r(function(){n.call(null,t||function(){throw 1},1)})}},{"../internals/fails":44}],124:[function(e,t,n){var i=e("../internals/an-object"),o=e("../internals/a-function"),a=e("../internals/well-known-symbol")("species");t.exports=function(e,t){var n,r=i(e).constructor;return void 0===r||null==(n=i(r)[a])?t:o(n)}},{"../internals/a-function":2,"../internals/an-object":7,"../internals/well-known-symbol":145}],125:[function(e,t,n){function r(s){return function(e,t){var n,r,i=String(c(e)),o=l(t),a=i.length;return o<0||a<=o?s?"":void 0:(n=i.charCodeAt(o))<55296||56319<n||o+1===a||(r=i.charCodeAt(o+1))<56320||57343<r?s?i.charAt(o):n:s?i.slice(o,o+2):r-56320+(n-55296<<10)+65536}}var l=e("../internals/to-integer"),c=e("../internals/require-object-coercible");t.exports={codeAt:r(!1),charAt:r(!0)}},{"../internals/require-object-coercible":116,"../internals/to-integer":134}],126:[function(e,t,n){function r(c){return function(e,t,n){var r,i,o=String(p(e)),a=o.length,s=void 0===n?" ":String(n),l=u(t);return l<=a||""==s?o:(r=l-a,(i=f.call(s,d(r/s.length))).length>r&&(i=i.slice(0,r)),c?o+i:i+o)}}var u=e("../internals/to-length"),f=e("../internals/string-repeat"),p=e("../internals/require-object-coercible"),d=Math.ceil;t.exports={start:r(!1),end:r(!0)}},{"../internals/require-object-coercible":116,"../internals/string-repeat":127,"../internals/to-length":135}],127:[function(e,t,n){"use strict";var i=e("../internals/to-integer"),o=e("../internals/require-object-coercible");t.exports="".repeat||function(e){var t=String(o(this)),n="",r=i(e);if(r<0||r==1/0)throw RangeError("Wrong number of repetitions");for(;0<r;(r>>>=1)&&(t+=t))1&r&&(n+=t);return n}},{"../internals/require-object-coercible":116,"../internals/to-integer":134}],128:[function(e,t,n){function r(n){return function(e){var t=String(i(e));return 1&n&&(t=t.replace(a,"")),2&n&&(t=t.replace(s,"")),t}}var i=e("../internals/require-object-coercible"),o="["+e("../internals/whitespaces")+"]",a=RegExp("^"+o+o+"*"),s=RegExp(o+o+"*$");t.exports={start:r(1),end:r(2),trim:r(3)}},{"../internals/require-object-coercible":116,"../internals/whitespaces":146}],129:[function(e,t,n){function r(e){if(E.hasOwnProperty(e)){var t=E[e];delete E[e],t()}}function i(e){return function(){r(e)}}function o(e){r(e.data)}function a(e){u.postMessage(e+"",y.protocol+"//"+y.host)}var s,l,c,u=e("../internals/global"),f=e("../internals/fails"),p=e("../internals/classof-raw"),d=e("../internals/bind-context"),h=e("../internals/html"),g=e("../internals/document-create-element"),y=u.location,m=u.setImmediate,b=u.clearImmediate,v=u.process,x=u.MessageChannel,w=u.Dispatch,j=0,E={},T="onreadystatechange";m&&b||(m=function(e){for(var t=[],n=1;n<arguments.length;)t.push(arguments[n++]);return E[++j]=function(){("function"==typeof e?e:Function(e)).apply(void 0,t)},s(j),j},b=function(e){delete E[e]},"process"==p(v)?s=function(e){v.nextTick(i(e))}:w&&w.now?s=function(e){w.now(i(e))}:x?(c=(l=new x).port2,l.port1.onmessage=o,s=d(c.postMessage,c,1)):!u.addEventListener||"function"!=typeof postMessage||u.importScripts||f(a)?s=T in g("script")?function(e){h.appendChild(g("script"))[T]=function(){h.removeChild(this),r(e)}}:function(e){setTimeout(i(e),0)}:(s=a,u.addEventListener("message",o,!1))),t.exports={set:m,clear:b}},{"../internals/bind-context":20,"../internals/classof-raw":23,"../internals/document-create-element":40,"../internals/fails":44,"../internals/global":56,"../internals/html":61}],130:[function(e,t,n){var r=e("../internals/classof-raw");t.exports=function(e){if("number"!=typeof e&&"Number"!=r(e))throw TypeError("Incorrect invocation");return+e}},{"../internals/classof-raw":23}],131:[function(e,t,n){var r=e("../internals/to-integer"),i=Math.max,o=Math.min;t.exports=function(e,t){var n=r(e);return n<0?i(n+t,0):o(n,t)}},{"../internals/to-integer":134}],132:[function(e,t,n){var r=e("../internals/to-integer"),i=e("../internals/to-length");t.exports=function(e){if(void 0===e)return 0;var t=r(e),n=i(t);if(t!==n)throw RangeError("Wrong length or index");return n}},{"../internals/to-integer":134,"../internals/to-length":135}],133:[function(e,t,n){var r=e("../internals/indexed-object"),i=e("../internals/require-object-coercible");t.exports=function(e){return r(i(e))}},{"../internals/indexed-object":63,"../internals/require-object-coercible":116}],134:[function(e,t,n){var r=Math.ceil,i=Math.floor;t.exports=function(e){return isNaN(e=+e)?0:(0<e?i:r)(e)}},{}],135:[function(e,t,n){var r=e("../internals/to-integer"),i=Math.min;t.exports=function(e){return 0<e?i(r(e),9007199254740991):0}},{"../internals/to-integer":134}],136:[function(e,t,n){var r=e("../internals/require-object-coercible");t.exports=function(e){return Object(r(e))}},{"../internals/require-object-coercible":116}],137:[function(e,t,n){var r=e("../internals/to-integer");t.exports=function(e,t){var n=r(e);if(n<0||n%t)throw RangeError("Wrong offset");return n}},{"../internals/to-integer":134}],138:[function(e,t,n){var i=e("../internals/is-object");t.exports=function(e,t){if(!i(e))return e;var n,r;if(t&&"function"==typeof(n=e.toString)&&!i(r=n.call(e)))return r;if("function"==typeof(n=e.valueOf)&&!i(r=n.call(e)))return r;if(!t&&"function"==typeof(n=e.toString)&&!i(r=n.call(e)))return r;throw TypeError("Can't convert object to primitive value")}},{"../internals/is-object":71}],139:[function(e,t,n){"use strict";function h(e,t){for(var n=0,r=t.length,i=new(W(e))(r);n<r;)i[n]=t[n++];return i}function r(e,t){C(e,t,{get:function(){return M(this)[t]}})}function g(e){var t;return e instanceof U||"ArrayBuffer"==(t=E(e))||"SharedArrayBuffer"==t}function i(e,t){return Y(e)&&"symbol"!=typeof t&&t in e&&String(+t)==String(t)}function o(e,t){return i(e,t=d(t,!0))?p(2,e[t]):D(e,t)}function a(e,t,n){return!(i(e,t=d(t,!0))&&T(n)&&j(n,"value"))||j(n,"get")||j(n,"set")||n.configurable||j(n,"writable")&&!n.writable||j(n,"enumerable")&&!n.enumerable?C(e,t,n):(e[t]=n.value,e)}var l=e("../internals/export"),c=e("../internals/global"),s=e("../internals/descriptors"),y=e("../internals/typed-arrays-constructors-requires-wrappers"),u=e("../internals/array-buffer-view-core"),f=e("../internals/array-buffer"),m=e("../internals/an-instance"),p=e("../internals/create-property-descriptor"),b=e("../internals/hide"),v=e("../internals/to-length"),x=e("../internals/to-index"),w=e("../internals/to-offset"),d=e("../internals/to-primitive"),j=e("../internals/has"),E=e("../internals/classof"),T=e("../internals/is-object"),S=e("../internals/object-create"),A=e("../internals/object-set-prototype-of"),O=e("../internals/object-get-own-property-names").f,k=e("../internals/typed-array-from"),N=e("../internals/array-iteration").forEach,R=e("../internals/set-species"),P=e("../internals/object-define-property"),I=e("../internals/object-get-own-property-descriptor"),_=e("../internals/internal-state"),M=_.get,L=_.set,C=P.f,D=I.f,H=Math.round,F=c.RangeError,U=f.ArrayBuffer,z=f.DataView,q=u.NATIVE_ARRAY_BUFFER_VIEWS,B=u.TYPED_ARRAY_TAG,G=u.TypedArray,V=u.TypedArrayPrototype,W=u.aTypedArrayConstructor,Y=u.isTypedArray,X="BYTES_PER_ELEMENT",J="Wrong length";s?(q||(I.f=o,P.f=a,r(V,"buffer"),r(V,"byteOffset"),r(V,"byteLength"),r(V,"length")),l({target:"Object",stat:!0,forced:!q},{getOwnPropertyDescriptor:o,defineProperty:a}),t.exports=function(e,u,t,i){function f(e,t){C(e,t,{get:function(){return function(e,t){var n=M(e);return n.view[r](t*u+n.byteOffset,!0)}(this,t)},set:function(e){return function(e,t,n){var r=M(e);i&&(n=(n=H(n))<0?0:255<n?255:255&n),r.view[o](t*u+r.byteOffset,n,!0)}(this,t,e)},enumerable:!0})}var p=e+(i?"Clamped":"")+"Array",r="get"+e,o="set"+e,a=c[p],d=a,n=d&&d.prototype,s={};q?y&&(d=t(function(e,t,n,r){return m(e,d,p),T(t)?g(t)?void 0!==r?new a(t,w(n,u),r):void 0!==n?new a(t,w(n,u)):new a(t):Y(t)?h(d,t):k.call(d,t):new a(x(t))}),A&&A(d,G),N(O(a),function(e){e in d||b(d,e,a[e])}),d.prototype=n):(d=t(function(e,t,n,r){m(e,d,p);var i,o,a,s=0,l=0;if(T(t)){if(!g(t))return Y(t)?h(d,t):k.call(d,t);i=t,l=w(n,u);var c=t.byteLength;if(void 0===r){if(c%u)throw F(J);if((o=c-l)<0)throw F(J)}else if(c<(o=v(r)*u)+l)throw F(J);a=o/u}else a=x(t),i=new U(o=a*u);for(L(e,{buffer:i,byteOffset:l,byteLength:o,length:a,view:new z(i)});s<a;)f(e,s++)}),A&&A(d,G),n=d.prototype=S(V)),n.constructor!==d&&b(n,"constructor",d),B&&b(n,B,p),s[p]=d,l({global:!0,forced:d!=a,sham:!q},s),X in d||b(d,X,u),X in n||b(n,X,u),R(p)}):t.exports=function(){}},{"../internals/an-instance":6,"../internals/array-buffer":9,"../internals/array-buffer-view-core":8,"../internals/array-iteration":15,"../internals/classof":24,"../internals/create-property-descriptor":33,"../internals/descriptors":39,"../internals/export":43,"../internals/global":56,"../internals/has":57,"../internals/hide":59,"../internals/internal-state":66,"../internals/is-object":71,"../internals/object-create":90,"../internals/object-define-property":92,"../internals/object-get-own-property-descriptor":93,"../internals/object-get-own-property-names":95,"../internals/object-set-prototype-of":101,"../internals/set-species":119,"../internals/to-index":132,"../internals/to-length":135,"../internals/to-offset":137,"../internals/to-primitive":138,"../internals/typed-array-from":140,"../internals/typed-arrays-constructors-requires-wrappers":141}],140:[function(e,t,n){var d=e("../internals/to-object"),h=e("../internals/to-length"),g=e("../internals/get-iterator-method"),y=e("../internals/is-array-iterator-method"),m=e("../internals/bind-context"),b=e("../internals/array-buffer-view-core").aTypedArrayConstructor;t.exports=function(e,t,n){var r,i,o,a,s,l=d(e),c=arguments.length,u=1<c?t:void 0,f=void 0!==u,p=g(l);if(null!=p&&!y(p))for(s=p.call(l),l=[];!(a=s.next()).done;)l.push(a.value);for(f&&2<c&&(u=m(u,n,2)),i=h(l.length),o=new(b(this))(i),r=0;r<i;r++)o[r]=f?u(l[r],r):l[r];return o}},{"../internals/array-buffer-view-core":8,"../internals/bind-context":20,"../internals/get-iterator-method":54,"../internals/is-array-iterator-method":67,"../internals/to-length":135,"../internals/to-object":136}],141:[function(e,t,n){var r=e("../internals/global"),i=e("../internals/fails"),o=e("../internals/check-correctness-of-iteration"),a=e("../internals/array-buffer-view-core").NATIVE_ARRAY_BUFFER_VIEWS,s=r.ArrayBuffer,l=r.Int8Array;t.exports=!a||!i(function(){l(1)})||!i(function(){new l(-1)})||!o(function(e){new l,new l(null),new l(1.5),new l(e)},!0)||i(function(){return 1!==new l(new s(2),1,void 0).length})},{"../internals/array-buffer-view-core":8,"../internals/check-correctness-of-iteration":22,"../internals/fails":44,"../internals/global":56}],142:[function(e,t,n){var r=0,i=Math.random();t.exports=function(e){return"Symbol("+String(void 0===e?"":e)+")_"+(++r+i).toString(36)}},{}],143:[function(e,t,n){var r=e("../internals/get-built-in");t.exports=r("navigator","userAgent")||""},{"../internals/get-built-in":53}],144:[function(e,t,n){var r=e("../internals/user-agent");t.exports=/Version\/10\.\d+(\.\d+)?( Mobile\/\w+)? Safari\//.test(r)},{"../internals/user-agent":143}],145:[function(e,t,n){var r=e("../internals/global"),i=e("../internals/shared"),o=e("../internals/uid"),a=e("../internals/native-symbol"),s=r.Symbol,l=i("wks");t.exports=function(e){return l[e]||(l[e]=a&&s[e]||(a?s:o)("Symbol."+e))}},{"../internals/global":56,"../internals/native-symbol":83,"../internals/shared":122,"../internals/uid":142}],146:[function(e,t,n){t.exports="\t\n\v\f\r                　\u2028\u2029\ufeff"},{}],147:[function(e,t,n){n.f=e("../internals/well-known-symbol")},{"../internals/well-known-symbol":145}],148:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/global"),o=e("../internals/array-buffer"),a=e("../internals/set-species"),s="ArrayBuffer",l=o[s];r({global:!0,forced:i[s]!==l},{ArrayBuffer:l}),a(s)},{"../internals/array-buffer":9,"../internals/export":43,"../internals/global":56,"../internals/set-species":119}],149:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/array-buffer-view-core");r({target:"ArrayBuffer",stat:!0,forced:!i.NATIVE_ARRAY_BUFFER_VIEWS},{isView:i.isView})},{"../internals/array-buffer-view-core":8,"../internals/export":43}],150:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/fails"),o=e("../internals/array-buffer"),c=e("../internals/an-object"),u=e("../internals/to-absolute-index"),f=e("../internals/to-length"),p=e("../internals/species-constructor"),d=o.ArrayBuffer,h=o.DataView,g=d.prototype.slice;r({target:"ArrayBuffer",proto:!0,unsafe:!0,forced:i(function(){return!new d(2).slice(1,void 0).byteLength})},{slice:function(e,t){if(void 0!==g&&void 0===t)return g.call(c(this),e);for(var n=c(this).byteLength,r=u(e,n),i=u(void 0===t?n:t,n),o=new(p(this,d))(f(i-r)),a=new h(this),s=new h(o),l=0;r<i;)s.setUint8(l++,a.getUint8(r++));return o}})},{"../internals/an-object":7,"../internals/array-buffer":9,"../internals/export":43,"../internals/fails":44,"../internals/species-constructor":124,"../internals/to-absolute-index":131,"../internals/to-length":135}],151:[function(e,t,n){"use strict";function c(e){if(!a(e))return!1;var t=e[l];return void 0!==t?!!t:o(e)}var r=e("../internals/export"),i=e("../internals/fails"),o=e("../internals/is-array"),a=e("../internals/is-object"),u=e("../internals/to-object"),f=e("../internals/to-length"),p=e("../internals/create-property"),d=e("../internals/array-species-create"),s=e("../internals/array-method-has-species-support"),l=e("../internals/well-known-symbol")("isConcatSpreadable"),h=9007199254740991,g="Maximum allowed index exceeded",y=!i(function(){var e=[];return e[l]=!1,e.concat()[0]!==e}),m=s("concat");r({target:"Array",proto:!0,forced:!y||!m},{concat:function(e){var t,n,r,i,o,a=u(this),s=d(a,0),l=0;for(t=-1,r=arguments.length;t<r;t++)if(c(o=-1===t?a:arguments[t])){if(i=f(o.length),h<l+i)throw TypeError(g);for(n=0;n<i;n++,l++)n in o&&p(s,l,o[n])}else{if(h<=l)throw TypeError(g);p(s,l++,o)}return s.length=l,s}})},{"../internals/array-method-has-species-support":17,"../internals/array-species-create":19,"../internals/create-property":34,"../internals/export":43,"../internals/fails":44,"../internals/is-array":68,"../internals/is-object":71,"../internals/to-length":135,"../internals/to-object":136,"../internals/well-known-symbol":145}],152:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/array-copy-within"),o=e("../internals/add-to-unscopables");r({target:"Array",proto:!0},{copyWithin:i}),o("copyWithin")},{"../internals/add-to-unscopables":4,"../internals/array-copy-within":10,"../internals/export":43}],153:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/array-iteration").every;r({target:"Array",proto:!0,forced:e("../internals/sloppy-array-method")("every")},{every:function(e,t){return i(this,e,1<arguments.length?t:void 0)}})},{"../internals/array-iteration":15,"../internals/export":43,"../internals/sloppy-array-method":123}],154:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/array-fill"),o=e("../internals/add-to-unscopables");r({target:"Array",proto:!0},{fill:i}),o("fill")},{"../internals/add-to-unscopables":4,"../internals/array-fill":11,"../internals/export":43}],155:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/array-iteration").filter;r({target:"Array",proto:!0,forced:!e("../internals/array-method-has-species-support")("filter")},{filter:function(e,t){return i(this,e,1<arguments.length?t:void 0)}})},{"../internals/array-iteration":15,"../internals/array-method-has-species-support":17,"../internals/export":43}],156:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/array-iteration").findIndex,o=e("../internals/add-to-unscopables"),a="findIndex",s=!0;a in[]&&Array(1)[a](function(){s=!1}),r({target:"Array",proto:!0,forced:s},{findIndex:function(e,t){return i(this,e,1<arguments.length?t:void 0)}}),o(a)},{"../internals/add-to-unscopables":4,"../internals/array-iteration":15,"../internals/export":43}],157:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/array-iteration").find,o=e("../internals/add-to-unscopables"),a="find",s=!0;a in[]&&Array(1)[a](function(){s=!1}),r({target:"Array",proto:!0,forced:s},{find:function(e,t){return i(this,e,1<arguments.length?t:void 0)}}),o(a)},{"../internals/add-to-unscopables":4,"../internals/array-iteration":15,"../internals/export":43}],158:[function(e,t,n){"use strict";var r=e("../internals/export"),o=e("../internals/flatten-into-array"),a=e("../internals/to-object"),s=e("../internals/to-length"),l=e("../internals/a-function"),c=e("../internals/array-species-create");r({target:"Array",proto:!0},{flatMap:function(e,t){var n,r=a(this),i=s(r.length);return l(e),(n=c(r,0)).length=o(n,r,r,i,0,1,e,1<arguments.length?t:void 0),n}})},{"../internals/a-function":2,"../internals/array-species-create":19,"../internals/export":43,"../internals/flatten-into-array":46,"../internals/to-length":135,"../internals/to-object":136}],159:[function(e,t,n){"use strict";var r=e("../internals/export"),o=e("../internals/flatten-into-array"),a=e("../internals/to-object"),s=e("../internals/to-length"),l=e("../internals/to-integer"),c=e("../internals/array-species-create");r({target:"Array",proto:!0},{flat:function(e){var t=arguments.length?e:void 0,n=a(this),r=s(n.length),i=c(n,0);return i.length=o(i,n,n,r,0,void 0===t?1:l(t)),i}})},{"../internals/array-species-create":19,"../internals/export":43,"../internals/flatten-into-array":46,"../internals/to-integer":134,"../internals/to-length":135,"../internals/to-object":136}],160:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/array-for-each");r({target:"Array",proto:!0,forced:[].forEach!=i},{forEach:i})},{"../internals/array-for-each":12,"../internals/export":43}],161:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/array-from");r({target:"Array",stat:!0,forced:!e("../internals/check-correctness-of-iteration")(function(e){Array.from(e)})},{from:i})},{"../internals/array-from":13,"../internals/check-correctness-of-iteration":22,"../internals/export":43}],162:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/array-includes").includes,o=e("../internals/add-to-unscopables");r({target:"Array",proto:!0},{includes:function(e,t){return i(this,e,1<arguments.length?t:void 0)}}),o("includes")},{"../internals/add-to-unscopables":4,"../internals/array-includes":14,"../internals/export":43}],163:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/array-includes").indexOf,o=e("../internals/sloppy-array-method"),a=[].indexOf,s=!!a&&1/[1].indexOf(1,-0)<0,l=o("indexOf");r({target:"Array",proto:!0,forced:s||l},{indexOf:function(e,t){return s?a.apply(this,arguments)||0:i(this,e,1<arguments.length?t:void 0)}})},{"../internals/array-includes":14,"../internals/export":43,"../internals/sloppy-array-method":123}],164:[function(e,t,n){e("../internals/export")({target:"Array",stat:!0},{isArray:e("../internals/is-array")})},{"../internals/export":43,"../internals/is-array":68}],165:[function(e,t,n){"use strict";var r=e("../internals/to-indexed-object"),i=e("../internals/add-to-unscopables"),o=e("../internals/iterators"),a=e("../internals/internal-state"),s=e("../internals/define-iterator"),l="Array Iterator",c=a.set,u=a.getterFor(l);t.exports=s(Array,"Array",function(e,t){c(this,{type:l,target:r(e),index:0,kind:t})},function(){var e=u(this),t=e.target,n=e.kind,r=e.index++;return!t||r>=t.length?{value:e.target=void 0,done:!0}:"keys"==n?{value:r,done:!1}:"values"==n?{value:t[r],done:!1}:{value:[r,t[r]],done:!1}},"values"),o.Arguments=o.Array,i("keys"),i("values"),i("entries")},{"../internals/add-to-unscopables":4,"../internals/define-iterator":37,"../internals/internal-state":66,"../internals/iterators":76,"../internals/to-indexed-object":133}],166:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/indexed-object"),o=e("../internals/to-indexed-object"),a=e("../internals/sloppy-array-method"),s=[].join,l=i!=Object,c=a("join",",");r({target:"Array",proto:!0,forced:l||c},{join:function(e){return s.call(o(this),void 0===e?",":e)}})},{"../internals/export":43,"../internals/indexed-object":63,"../internals/sloppy-array-method":123,"../internals/to-indexed-object":133}],167:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/array-last-index-of");r({target:"Array",proto:!0,forced:i!==[].lastIndexOf},{lastIndexOf:i})},{"../internals/array-last-index-of":16,"../internals/export":43}],168:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/array-iteration").map;r({target:"Array",proto:!0,forced:!e("../internals/array-method-has-species-support")("map")},{map:function(e,t){return i(this,e,1<arguments.length?t:void 0)}})},{"../internals/array-iteration":15,"../internals/array-method-has-species-support":17,"../internals/export":43}],169:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/fails"),o=e("../internals/create-property");r({target:"Array",stat:!0,forced:i(function(){function e(){}return!(Array.of.call(e)instanceof e)})},{of:function(){for(var e=0,t=arguments.length,n=new("function"==typeof this?this:Array)(t);e<t;)o(n,e,arguments[e++]);return n.length=t,n}})},{"../internals/create-property":34,"../internals/export":43,"../internals/fails":44}],170:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/array-reduce").right;r({target:"Array",proto:!0,forced:e("../internals/sloppy-array-method")("reduceRight")},{reduceRight:function(e,t){return i(this,e,arguments.length,1<arguments.length?t:void 0)}})},{"../internals/array-reduce":18,"../internals/export":43,"../internals/sloppy-array-method":123}],171:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/array-reduce").left;r({target:"Array",proto:!0,forced:e("../internals/sloppy-array-method")("reduce")},{reduce:function(e,t){return i(this,e,arguments.length,1<arguments.length?t:void 0)}})},{"../internals/array-reduce":18,"../internals/export":43,"../internals/sloppy-array-method":123}],172:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/is-array"),o=[].reverse,a=[1,2];r({target:"Array",proto:!0,forced:String(a)===String(a.reverse())},{reverse:function(){return i(this)&&(this.length=this.length),o.call(this)}})},{"../internals/export":43,"../internals/is-array":68}],173:[function(e,t,n){"use strict";var r=e("../internals/export"),c=e("../internals/is-object"),u=e("../internals/is-array"),f=e("../internals/to-absolute-index"),p=e("../internals/to-length"),d=e("../internals/to-indexed-object"),h=e("../internals/create-property"),i=e("../internals/array-method-has-species-support"),g=e("../internals/well-known-symbol")("species"),y=[].slice,m=Math.max;r({target:"Array",proto:!0,forced:!i("slice")},{slice:function(e,t){var n,r,i,o=d(this),a=p(o.length),s=f(e,a),l=f(void 0===t?a:t,a);if(u(o)&&("function"!=typeof(n=o.constructor)||n!==Array&&!u(n.prototype)?c(n)&&null===(n=n[g])&&(n=void 0):n=void 0,n===Array||void 0===n))return y.call(o,s,l);for(r=new(void 0===n?Array:n)(m(l-s,0)),i=0;s<l;s++,i++)s in o&&h(r,i,o[s]);return r.length=i,r}})},{"../internals/array-method-has-species-support":17,"../internals/create-property":34,"../internals/export":43,"../internals/is-array":68,"../internals/is-object":71,"../internals/to-absolute-index":131,"../internals/to-indexed-object":133,"../internals/to-length":135,"../internals/well-known-symbol":145}],174:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/array-iteration").some;r({target:"Array",proto:!0,forced:e("../internals/sloppy-array-method")("some")},{some:function(e,t){return i(this,e,1<arguments.length?t:void 0)}})},{"../internals/array-iteration":15,"../internals/export":43,"../internals/sloppy-array-method":123}],175:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/a-function"),o=e("../internals/to-object"),a=e("../internals/fails"),s=e("../internals/sloppy-array-method"),l=[].sort,c=[1,2,3],u=a(function(){c.sort(void 0)}),f=a(function(){c.sort(null)}),p=s("sort");r({target:"Array",proto:!0,forced:u||!f||p},{sort:function(e){return void 0===e?l.call(o(this)):l.call(o(this),i(e))}})},{"../internals/a-function":2,"../internals/export":43,"../internals/fails":44,"../internals/sloppy-array-method":123,"../internals/to-object":136}],176:[function(e,t,n){e("../internals/set-species")("Array")},{"../internals/set-species":119}],177:[function(e,t,n){"use strict";var r=e("../internals/export"),p=e("../internals/to-absolute-index"),d=e("../internals/to-integer"),h=e("../internals/to-length"),g=e("../internals/to-object"),y=e("../internals/array-species-create"),m=e("../internals/create-property"),i=e("../internals/array-method-has-species-support"),b=Math.max,v=Math.min;r({target:"Array",proto:!0,forced:!i("splice")},{splice:function(e,t){var n,r,i,o,a,s,l=g(this),c=h(l.length),u=p(e,c),f=arguments.length;if(0===f?n=r=0:r=1===f?(n=0,c-u):(n=f-2,v(b(d(t),0),c-u)),9007199254740991<c+n-r)throw TypeError("Maximum allowed length exceeded");for(i=y(l,r),o=0;o<r;o++)(a=u+o)in l&&m(i,o,l[a]);if(n<(i.length=r)){for(o=u;o<c-r;o++)s=o+n,(a=o+r)in l?l[s]=l[a]:delete l[s];for(o=c;c-r+n<o;o--)delete l[o-1]}else if(r<n)for(o=c-r;u<o;o--)s=o+n-1,(a=o+r-1)in l?l[s]=l[a]:delete l[s];for(o=0;o<n;o++)l[o+u]=arguments[o+2];return l.length=c-r+n,i}})},{"../internals/array-method-has-species-support":17,"../internals/array-species-create":19,"../internals/create-property":34,"../internals/export":43,"../internals/to-absolute-index":131,"../internals/to-integer":134,"../internals/to-length":135,"../internals/to-object":136}],178:[function(e,t,n){e("../internals/add-to-unscopables")("flatMap")},{"../internals/add-to-unscopables":4}],179:[function(e,t,n){e("../internals/add-to-unscopables")("flat")},{"../internals/add-to-unscopables":4}],180:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/array-buffer");r({global:!0,forced:!e("../internals/array-buffer-view-core").NATIVE_ARRAY_BUFFER},{DataView:i.DataView})},{"../internals/array-buffer":9,"../internals/array-buffer-view-core":8,"../internals/export":43}],181:[function(e,t,n){e("../internals/export")({target:"Date",stat:!0},{now:function(){return(new Date).getTime()}})},{"../internals/export":43}],182:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/date-to-iso-string");r({target:"Date",proto:!0,forced:Date.prototype.toISOString!==i},{toISOString:i})},{"../internals/date-to-iso-string":35,"../internals/export":43}],183:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/fails"),o=e("../internals/to-object"),a=e("../internals/to-primitive");r({target:"Date",proto:!0,forced:i(function(){return null!==new Date(NaN).toJSON()||1!==Date.prototype.toJSON.call({toISOString:function(){return 1}})})},{toJSON:function(e){var t=o(this),n=a(t);return"number"!=typeof n||isFinite(n)?t.toISOString():null}})},{"../internals/export":43,"../internals/fails":44,"../internals/to-object":136,"../internals/to-primitive":138}],184:[function(e,t,n){var r=e("../internals/hide"),i=e("../internals/date-to-primitive"),o=e("../internals/well-known-symbol")("toPrimitive"),a=Date.prototype;o in a||r(a,o,i)},{"../internals/date-to-primitive":36,"../internals/hide":59,"../internals/well-known-symbol":145}],185:[function(e,t,n){var r=e("../internals/redefine"),i=Date.prototype,o="Invalid Date",a="toString",s=i[a],l=i.getTime;new Date(NaN)+""!=o&&r(i,a,function(){var e=l.call(this);return e==e?s.call(this):o})},{"../internals/redefine":112}],186:[function(e,t,n){e("../internals/export")({target:"Function",proto:!0},{bind:e("../internals/function-bind")})},{"../internals/export":43,"../internals/function-bind":51}],187:[function(e,t,n){"use strict";var r=e("../internals/is-object"),i=e("../internals/object-define-property"),o=e("../internals/object-get-prototype-of"),a=e("../internals/well-known-symbol")("hasInstance"),s=Function.prototype;a in s||i.f(s,a,{value:function(e){if("function"!=typeof this||!r(e))return!1;if(!r(this.prototype))return e instanceof this;for(;e=o(e);)if(this.prototype===e)return!0;return!1}})},{"../internals/is-object":71,"../internals/object-define-property":92,"../internals/object-get-prototype-of":97,"../internals/well-known-symbol":145}],188:[function(e,t,n){var r=e("../internals/descriptors"),i=e("../internals/object-define-property").f,o=Function.prototype,a=o.toString,s=/^\s*function ([^ (]*)/;!r||"name"in o||i(o,"name",{configurable:!0,get:function(){try{return a.call(this).match(s)[1]}catch(e){return""}}})},{"../internals/descriptors":39,"../internals/object-define-property":92}],189:[function(e,t,n){var r=e("../internals/global");e("../internals/set-to-string-tag")(r.JSON,"JSON",!0)},{"../internals/global":56,"../internals/set-to-string-tag":120}],190:[function(e,t,n){"use strict";var r=e("../internals/collection"),i=e("../internals/collection-strong");t.exports=r("Map",function(t){return function(e){return t(this,arguments.length?e:void 0)}},i,!0)},{"../internals/collection":27,"../internals/collection-strong":25}],191:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/math-log1p"),o=Math.acosh,a=Math.log,s=Math.sqrt,l=Math.LN2;r({target:"Math",stat:!0,forced:!o||710!=Math.floor(o(Number.MAX_VALUE))||o(1/0)!=1/0},{acosh:function(e){return(e=+e)<1?NaN:94906265.62425156<e?a(e)+l:i(e-1+s(e-1)*s(e+1))}})},{"../internals/export":43,"../internals/math-log1p":79}],192:[function(e,t,n){var r=e("../internals/export"),i=Math.asinh,o=Math.log,a=Math.sqrt;r({target:"Math",stat:!0,forced:!(i&&0<1/i(0))},{asinh:function e(t){return isFinite(t=+t)&&0!=t?t<0?-e(-t):o(t+a(t*t+1)):t}})},{"../internals/export":43}],193:[function(e,t,n){var r=e("../internals/export"),i=Math.atanh,o=Math.log;r({target:"Math",stat:!0,forced:!(i&&1/i(-0)<0)},{atanh:function(e){return 0==(e=+e)?e:o((1+e)/(1-e))/2}})},{"../internals/export":43}],194:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/math-sign"),o=Math.abs,a=Math.pow;r({target:"Math",stat:!0},{cbrt:function(e){return i(e=+e)*a(o(e),1/3)}})},{"../internals/export":43,"../internals/math-sign":80}],195:[function(e,t,n){var r=e("../internals/export"),i=Math.floor,o=Math.log,a=Math.LOG2E;r({target:"Math",stat:!0},{clz32:function(e){return(e>>>=0)?31-i(o(e+.5)*a):32}})},{"../internals/export":43}],196:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/math-expm1"),o=Math.cosh,a=Math.abs,s=Math.E;r({target:"Math",stat:!0,forced:!o||o(710)===1/0},{cosh:function(e){var t=i(a(e)-1)+1;return(t+1/(t*s*s))*(s/2)}})},{"../internals/export":43,"../internals/math-expm1":77}],197:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/math-expm1");r({target:"Math",stat:!0,forced:i!=Math.expm1},{expm1:i})},{"../internals/export":43,"../internals/math-expm1":77}],198:[function(e,t,n){e("../internals/export")({target:"Math",stat:!0},{fround:e("../internals/math-fround")})},{"../internals/export":43,"../internals/math-fround":78}],199:[function(e,t,n){var r=e("../internals/export"),i=Math.hypot,l=Math.abs,c=Math.sqrt;r({target:"Math",stat:!0,forced:!!i&&i(1/0,NaN)!==1/0},{hypot:function(e,t){for(var n,r,i=0,o=0,a=arguments.length,s=0;o<a;)s<(n=l(arguments[o++]))?(i=i*(r=s/n)*r+1,s=n):i+=0<n?(r=n/s)*r:n;return s===1/0?1/0:s*c(i)}})},{"../internals/export":43}],200:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/fails"),o=Math.imul;r({target:"Math",stat:!0,forced:i(function(){return-5!=o(4294967295,5)||2!=o.length})},{imul:function(e,t){var n=65535,r=+e,i=+t,o=n&r,a=n&i;return 0|o*a+((n&r>>>16)*a+o*(n&i>>>16)<<16>>>0)}})},{"../internals/export":43,"../internals/fails":44}],201:[function(e,t,n){var r=e("../internals/export"),i=Math.log,o=Math.LOG10E;r({target:"Math",stat:!0},{log10:function(e){return i(e)*o}})},{"../internals/export":43}],202:[function(e,t,n){e("../internals/export")({target:"Math",stat:!0},{log1p:e("../internals/math-log1p")})},{"../internals/export":43,"../internals/math-log1p":79}],203:[function(e,t,n){var r=e("../internals/export"),i=Math.log,o=Math.LN2;r({target:"Math",stat:!0},{log2:function(e){return i(e)/o}})},{"../internals/export":43}],204:[function(e,t,n){e("../internals/export")({target:"Math",stat:!0},{sign:e("../internals/math-sign")})},{"../internals/export":43,"../internals/math-sign":80}],205:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/fails"),o=e("../internals/math-expm1"),a=Math.abs,s=Math.exp,l=Math.E;r({target:"Math",stat:!0,forced:i(function(){return-2e-17!=Math.sinh(-2e-17)})},{sinh:function(e){return a(e=+e)<1?(o(e)-o(-e))/2:(s(e-1)-s(-e-1))*(l/2)}})},{"../internals/export":43,"../internals/fails":44,"../internals/math-expm1":77}],206:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/math-expm1"),o=Math.exp;r({target:"Math",stat:!0},{tanh:function(e){var t=i(e=+e),n=i(-e);return t==1/0?1:n==1/0?-1:(t-n)/(o(e)+o(-e))}})},{"../internals/export":43,"../internals/math-expm1":77}],207:[function(e,t,n){e("../internals/set-to-string-tag")(Math,"Math",!0)},{"../internals/set-to-string-tag":120}],208:[function(e,t,n){var r=e("../internals/export"),i=Math.ceil,o=Math.floor;r({target:"Math",stat:!0},{trunc:function(e){return(0<e?o:i)(e)}})},{"../internals/export":43}],209:[function(e,t,n){"use strict";function r(e){var t,n,r,i,o,a,s,l,c=f(e,!1);if("string"==typeof c&&2<c.length)if(43===(t=(c=m(c)).charCodeAt(0))||45===t){if(88===(n=c.charCodeAt(2))||120===n)return NaN}else if(48===t){switch(c.charCodeAt(1)){case 66:case 98:r=2,i=49;break;case 79:case 111:r=8,i=55;break;default:return+c}for(a=(o=c.slice(2)).length,s=0;s<a;s++)if((l=o.charCodeAt(s))<48||i<l)return NaN;return parseInt(o,r)}return+c}var i=e("../internals/descriptors"),o=e("../internals/global"),a=e("../internals/is-forced"),s=e("../internals/redefine"),l=e("../internals/has"),c=e("../internals/classof-raw"),u=e("../internals/inherit-if-required"),f=e("../internals/to-primitive"),p=e("../internals/fails"),d=e("../internals/object-create"),h=e("../internals/object-get-own-property-names").f,g=e("../internals/object-get-own-property-descriptor").f,y=e("../internals/object-define-property").f,m=e("../internals/string-trim").trim,b="Number",v=o[b],x=v.prototype,w=c(d(x))==b;if(a(b,!v(" 0o1")||!v("0b1")||v("+0x1"))){for(var j,E=function(e){var t=arguments.length<1?0:e,n=this;return n instanceof E&&(w?p(function(){x.valueOf.call(n)}):c(n)!=b)?u(new v(r(t)),n,E):r(t)},T=i?h(v):"MAX_VALUE,MIN_VALUE,NaN,NEGATIVE_INFINITY,POSITIVE_INFINITY,EPSILON,isFinite,isInteger,isNaN,isSafeInteger,MAX_SAFE_INTEGER,MIN_SAFE_INTEGER,parseFloat,parseInt,isInteger".split(","),S=0;T.length>S;S++)l(v,j=T[S])&&!l(E,j)&&y(E,j,g(v,j));(E.prototype=x).constructor=E,s(o,b,E)}},{"../internals/classof-raw":23,"../internals/descriptors":39,"../internals/fails":44,"../internals/global":56,"../internals/has":57,"../internals/inherit-if-required":64,"../internals/is-forced":69,"../internals/object-create":90,"../internals/object-define-property":92,"../internals/object-get-own-property-descriptor":93,"../internals/object-get-own-property-names":95,"../internals/redefine":112,"../internals/string-trim":128,"../internals/to-primitive":138}],210:[function(e,t,n){e("../internals/export")({target:"Number",stat:!0},{EPSILON:Math.pow(2,-52)})},{"../internals/export":43}],211:[function(e,t,n){e("../internals/export")({target:"Number",stat:!0},{isFinite:e("../internals/number-is-finite")})},{"../internals/export":43,"../internals/number-is-finite":88}],212:[function(e,t,n){e("../internals/export")({target:"Number",stat:!0},{isInteger:e("../internals/is-integer")})},{"../internals/export":43,"../internals/is-integer":70}],213:[function(e,t,n){e("../internals/export")({target:"Number",stat:!0},{isNaN:function(e){return e!=e}})},{"../internals/export":43}],214:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/is-integer"),o=Math.abs;r({target:"Number",stat:!0},{isSafeInteger:function(e){return i(e)&&o(e)<=9007199254740991}})},{"../internals/export":43,"../internals/is-integer":70}],215:[function(e,t,n){e("../internals/export")({target:"Number",stat:!0},{MAX_SAFE_INTEGER:9007199254740991})},{"../internals/export":43}],216:[function(e,t,n){e("../internals/export")({target:"Number",stat:!0},{MIN_SAFE_INTEGER:-9007199254740991})},{"../internals/export":43}],217:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/parse-float");r({target:"Number",stat:!0,forced:Number.parseFloat!=i},{parseFloat:i})},{"../internals/export":43,"../internals/parse-float":105}],218:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/parse-int");r({target:"Number",stat:!0,forced:Number.parseInt!=i},{parseInt:i})},{"../internals/export":43,"../internals/parse-int":106}],219:[function(e,t,n){"use strict";var r=e("../internals/export"),d=e("../internals/to-integer"),h=e("../internals/this-number-value"),g=e("../internals/string-repeat"),i=e("../internals/fails"),o=1..toFixed,y=Math.floor,m=function(e,t,n){return 0===t?n:t%2==1?m(e,t-1,n*e):m(e*e,t/2,n)};r({target:"Number",proto:!0,forced:o&&("0.000"!==8e-5.toFixed(3)||"1"!==.9.toFixed(0)||"1.25"!==1.255.toFixed(2)||"1000000000000000128"!==(0xde0b6b3a7640080).toFixed(0))||!i(function(){o.call({})})},{toFixed:function(e){function t(e,t){for(var n=-1,r=t;++n<6;)r+=e*u[n],u[n]=r%1e7,r=y(r/1e7)}function n(e){for(var t=6,n=0;0<=--t;)n+=u[t],u[t]=y(n/e),n=n%e*1e7}function r(){for(var e=6,t="";0<=--e;)if(""!==t||0===e||0!==u[e]){var n=String(u[e]);t=""===t?n:t+g.call("0",7-n.length)+n}return t}var i,o,a,s,l=h(this),c=d(e),u=[0,0,0,0,0,0],f="",p="0";if(c<0||20<c)throw RangeError("Incorrect fraction digits");if(l!=l)return"NaN";if(l<=-1e21||1e21<=l)return String(l);if(l<0&&(f="-",l=-l),1e-21<l)if(o=(i=function(e){for(var t=0,n=e;4096<=n;)t+=12,n/=4096;for(;2<=n;)t+=1,n/=2;return t}(l*m(2,69,1))-69)<0?l*m(2,-i,1):l/m(2,i,1),o*=4503599627370496,0<(i=52-i)){for(t(0,o),a=c;7<=a;)t(1e7,0),a-=7;for(t(m(10,a,1),0),a=i-1;23<=a;)n(1<<23),a-=23;n(1<<a),t(1,1),n(2),p=r()}else t(0,o),t(1<<-i,0),p=r()+g.call("0",c);return p=0<c?f+((s=p.length)<=c?"0."+g.call("0",c-s)+p:p.slice(0,s-c)+"."+p.slice(s-c)):f+p}})},{"../internals/export":43,"../internals/fails":44,"../internals/string-repeat":127,"../internals/this-number-value":130,"../internals/to-integer":134}],220:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/fails"),o=e("../internals/this-number-value"),a=1..toPrecision;r({target:"Number",proto:!0,forced:i(function(){return"1"!==a.call(1,void 0)})||!i(function(){a.call({})})},{toPrecision:function(e){return void 0===e?a.call(o(this)):a.call(o(this),e)}})},{"../internals/export":43,"../internals/fails":44,"../internals/this-number-value":130}],221:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/object-assign");r({target:"Object",stat:!0,forced:Object.assign!==i},{assign:i})},{"../internals/export":43,"../internals/object-assign":89}],222:[function(e,t,n){e("../internals/export")({target:"Object",stat:!0,sham:!e("../internals/descriptors")},{create:e("../internals/object-create")})},{"../internals/descriptors":39,"../internals/export":43,"../internals/object-create":90}],223:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/descriptors"),o=e("../internals/forced-object-prototype-accessors-methods"),a=e("../internals/to-object"),s=e("../internals/a-function"),l=e("../internals/object-define-property");i&&r({target:"Object",proto:!0,forced:o},{__defineGetter__:function(e,t){l.f(a(this),e,{get:s(t),enumerable:!0,configurable:!0})}})},{"../internals/a-function":2,"../internals/descriptors":39,"../internals/export":43,"../internals/forced-object-prototype-accessors-methods":47,"../internals/object-define-property":92,"../internals/to-object":136}],224:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/descriptors");r({target:"Object",stat:!0,forced:!i,sham:!i},{defineProperties:e("../internals/object-define-properties")})},{"../internals/descriptors":39,"../internals/export":43,"../internals/object-define-properties":91}],225:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/descriptors");r({target:"Object",stat:!0,forced:!i,sham:!i},{defineProperty:e("../internals/object-define-property").f})},{"../internals/descriptors":39,"../internals/export":43,"../internals/object-define-property":92}],226:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/descriptors"),o=e("../internals/forced-object-prototype-accessors-methods"),a=e("../internals/to-object"),s=e("../internals/a-function"),l=e("../internals/object-define-property");i&&r({target:"Object",proto:!0,forced:o},{__defineSetter__:function(e,t){l.f(a(this),e,{set:s(t),enumerable:!0,configurable:!0})}})},{"../internals/a-function":2,"../internals/descriptors":39,"../internals/export":43,"../internals/forced-object-prototype-accessors-methods":47,"../internals/object-define-property":92,"../internals/to-object":136}],227:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/object-to-array").entries;r({target:"Object",stat:!0},{entries:function(e){return i(e)}})},{"../internals/export":43,"../internals/object-to-array":102}],228:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/freezing"),o=e("../internals/fails"),a=e("../internals/is-object"),s=e("../internals/internal-metadata").onFreeze,l=Object.freeze;r({target:"Object",stat:!0,forced:o(function(){l(1)}),sham:!i},{freeze:function(e){return l&&a(e)?l(s(e)):e}})},{"../internals/export":43,"../internals/fails":44,"../internals/freezing":50,"../internals/internal-metadata":65,"../internals/is-object":71}],229:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/iterate"),o=e("../internals/create-property");r({target:"Object",stat:!0},{fromEntries:function(e){var n={};return i(e,function(e,t){o(n,e,t)},void 0,!0),n}})},{"../internals/create-property":34,"../internals/export":43,"../internals/iterate":74}],230:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/fails"),o=e("../internals/to-indexed-object"),a=e("../internals/object-get-own-property-descriptor").f,s=e("../internals/descriptors"),l=i(function(){a(1)});r({target:"Object",stat:!0,forced:!s||l,sham:!s},{getOwnPropertyDescriptor:function(e,t){return a(o(e),t)}})},{"../internals/descriptors":39,"../internals/export":43,"../internals/fails":44,"../internals/object-get-own-property-descriptor":93,"../internals/to-indexed-object":133}],231:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/descriptors"),l=e("../internals/own-keys"),c=e("../internals/to-indexed-object"),u=e("../internals/object-get-own-property-descriptor"),f=e("../internals/create-property");r({target:"Object",stat:!0,sham:!i},{getOwnPropertyDescriptors:function(e){for(var t,n,r=c(e),i=u.f,o=l(r),a={},s=0;o.length>s;)void 0!==(n=i(r,t=o[s++]))&&f(a,t,n);return a}})},{"../internals/create-property":34,"../internals/descriptors":39,"../internals/export":43,"../internals/object-get-own-property-descriptor":93,"../internals/own-keys":104,"../internals/to-indexed-object":133}],232:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/fails"),o=e("../internals/object-get-own-property-names-external").f;r({target:"Object",stat:!0,forced:i(function(){return!Object.getOwnPropertyNames(1)})},{getOwnPropertyNames:o})},{"../internals/export":43,"../internals/fails":44,"../internals/object-get-own-property-names-external":94}],233:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/fails"),o=e("../internals/to-object"),a=e("../internals/object-get-prototype-of"),s=e("../internals/correct-prototype-getter");r({target:"Object",stat:!0,forced:i(function(){a(1)}),sham:!s},{getPrototypeOf:function(e){return a(o(e))}})},{"../internals/correct-prototype-getter":30,"../internals/export":43,"../internals/fails":44,"../internals/object-get-prototype-of":97,"../internals/to-object":136}],234:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/fails"),o=e("../internals/is-object"),a=Object.isExtensible;r({target:"Object",stat:!0,forced:i(function(){a(1)})},{isExtensible:function(e){return!!o(e)&&(!a||a(e))}})},{"../internals/export":43,"../internals/fails":44,"../internals/is-object":71}],235:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/fails"),o=e("../internals/is-object"),a=Object.isFrozen;r({target:"Object",stat:!0,forced:i(function(){a(1)})},{isFrozen:function(e){return!o(e)||!!a&&a(e)}})},{"../internals/export":43,"../internals/fails":44,"../internals/is-object":71}],236:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/fails"),o=e("../internals/is-object"),a=Object.isSealed;r({target:"Object",stat:!0,forced:i(function(){a(1)})},{isSealed:function(e){return!o(e)||!!a&&a(e)}})},{"../internals/export":43,"../internals/fails":44,"../internals/is-object":71}],237:[function(e,t,n){e("../internals/export")({target:"Object",stat:!0},{is:e("../internals/same-value")})},{"../internals/export":43,"../internals/same-value":117}],238:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/to-object"),o=e("../internals/object-keys");r({target:"Object",stat:!0,forced:e("../internals/fails")(function(){o(1)})},{keys:function(e){return o(i(e))}})},{"../internals/export":43,"../internals/fails":44,"../internals/object-keys":99,"../internals/to-object":136}],239:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/descriptors"),o=e("../internals/forced-object-prototype-accessors-methods"),a=e("../internals/to-object"),s=e("../internals/to-primitive"),l=e("../internals/object-get-prototype-of"),c=e("../internals/object-get-own-property-descriptor").f;i&&r({target:"Object",proto:!0,forced:o},{__lookupGetter__:function(e){var t,n=a(this),r=s(e,!0);do{if(t=c(n,r))return t.get}while(n=l(n))}})},{"../internals/descriptors":39,"../internals/export":43,"../internals/forced-object-prototype-accessors-methods":47,"../internals/object-get-own-property-descriptor":93,"../internals/object-get-prototype-of":97,"../internals/to-object":136,"../internals/to-primitive":138}],240:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/descriptors"),o=e("../internals/forced-object-prototype-accessors-methods"),a=e("../internals/to-object"),s=e("../internals/to-primitive"),l=e("../internals/object-get-prototype-of"),c=e("../internals/object-get-own-property-descriptor").f;i&&r({target:"Object",proto:!0,forced:o},{__lookupSetter__:function(e){var t,n=a(this),r=s(e,!0);do{if(t=c(n,r))return t.set}while(n=l(n))}})},{"../internals/descriptors":39,"../internals/export":43,"../internals/forced-object-prototype-accessors-methods":47,"../internals/object-get-own-property-descriptor":93,"../internals/object-get-prototype-of":97,"../internals/to-object":136,"../internals/to-primitive":138}],241:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/is-object"),o=e("../internals/internal-metadata").onFreeze,a=e("../internals/freezing"),s=e("../internals/fails"),l=Object.preventExtensions;r({target:"Object",stat:!0,forced:s(function(){l(1)}),sham:!a},{preventExtensions:function(e){return l&&i(e)?l(o(e)):e}})},{"../internals/export":43,"../internals/fails":44,"../internals/freezing":50,"../internals/internal-metadata":65,"../internals/is-object":71}],242:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/is-object"),o=e("../internals/internal-metadata").onFreeze,a=e("../internals/freezing"),s=e("../internals/fails"),l=Object.seal;r({target:"Object",stat:!0,forced:s(function(){l(1)}),sham:!a},{seal:function(e){return l&&i(e)?l(o(e)):e}})},{"../internals/export":43,"../internals/fails":44,"../internals/freezing":50,"../internals/internal-metadata":65,"../internals/is-object":71}],243:[function(e,t,n){e("../internals/export")({target:"Object",stat:!0},{setPrototypeOf:e("../internals/object-set-prototype-of")})},{"../internals/export":43,"../internals/object-set-prototype-of":101}],244:[function(e,t,n){var r=e("../internals/redefine"),i=e("../internals/object-to-string"),o=Object.prototype;i!==o.toString&&r(o,"toString",i,{unsafe:!0})},{"../internals/object-to-string":103,"../internals/redefine":112}],245:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/object-to-array").values;r({target:"Object",stat:!0},{values:function(e){return i(e)}})},{"../internals/export":43,"../internals/object-to-array":102}],246:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/parse-float");r({global:!0,forced:parseFloat!=i},{parseFloat:i})},{"../internals/export":43,"../internals/parse-float":105}],247:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/parse-int");r({global:!0,forced:parseInt!=i},{parseInt:i})},{"../internals/export":43,"../internals/parse-int":106}],248:[function(e,t,n){"use strict";var r=e("../internals/export"),c=e("../internals/a-function"),i=e("../internals/new-promise-capability"),o=e("../internals/perform"),u=e("../internals/iterate");r({target:"Promise",stat:!0},{allSettled:function(e){var s=this,t=i.f(s),l=t.resolve,n=t.reject,r=o(function(){var r=c(s.resolve),i=[],o=0,a=1;u(e,function(e){var t=o++,n=!1;i.push(void 0),a++,r.call(s,e).then(function(e){n||(n=!0,i[t]={status:"fulfilled",value:e},--a||l(i))},function(e){n||(n=!0,i[t]={status:"rejected",reason:e},--a||l(i))})}),--a||l(i)});return r.error&&n(r.value),t.promise}})},{"../internals/a-function":2,"../internals/export":43,"../internals/iterate":74,"../internals/new-promise-capability":86,"../internals/perform":108}],249:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/is-pure"),o=e("../internals/native-promise-constructor"),a=e("../internals/get-built-in"),s=e("../internals/species-constructor"),l=e("../internals/promise-resolve"),c=e("../internals/redefine");r({target:"Promise",proto:!0,real:!0},{finally:function(t){var n=s(this,a("Promise")),e="function"==typeof t;return this.then(e?function(e){return l(n,t()).then(function(){return e})}:t,e?function(e){return l(n,t()).then(function(){throw e})}:t)}}),i||"function"!=typeof o||o.prototype.finally||c(o.prototype,"finally",a("Promise").prototype.finally)},{"../internals/export":43,"../internals/get-built-in":53,"../internals/is-pure":72,"../internals/native-promise-constructor":82,"../internals/promise-resolve":109,"../internals/redefine":112,"../internals/species-constructor":124}],250:[function(e,t,n){"use strict";function g(e){var t;return!(!w(e)||"function"!=typeof(t=e.then))&&t}function o(f,p,d){if(!p.notified){p.notified=!0;var h=p.reactions;N(function(){for(var e=p.value,t=1==p.state,n=0;h.length>n;){var r,i,o,a=h[n++],s=t?a.ok:a.fail,l=a.resolve,c=a.reject,u=a.domain;try{s?(t||(2===p.rejection&&ie(f,p),p.rejection=1),!0===s?r=e:(u&&u.enter(),r=s(e),u&&(u.exit(),o=!0)),r===a.promise?c(B("Promise-chain cycle")):(i=g(r))?i.call(r,l,c):l(r)):c(e)}catch(e){u&&!o&&u.exit(),c(e)}}p.reactions=[],p.notified=!1,d&&!p.rejection&&ne(f,p)})}}function i(e,t,n){var r,i;K?((r=G.createEvent("Event")).promise=t,r.reason=n,r.initEvent(e,!1,!0),d.dispatchEvent(r)):r={promise:t,reason:n},(i=d["on"+e])?i(r):e===Z&&P("Unhandled promise rejection",n)}function a(t,n,r,i){return function(e){t(n,r,e,i)}}function s(e,t,n,r){t.done||(t.done=!0,r&&(t=r),t.value=n,t.state=2,o(e,t,!0))}var r,l,c,u,f=e("../internals/export"),p=e("../internals/is-pure"),d=e("../internals/global"),h=e("../internals/path"),y=e("../internals/native-promise-constructor"),m=e("../internals/redefine"),b=e("../internals/redefine-all"),v=e("../internals/set-to-string-tag"),x=e("../internals/set-species"),w=e("../internals/is-object"),j=e("../internals/a-function"),E=e("../internals/an-instance"),T=e("../internals/classof-raw"),S=e("../internals/iterate"),A=e("../internals/check-correctness-of-iteration"),O=e("../internals/species-constructor"),k=e("../internals/task").set,N=e("../internals/microtask"),R=e("../internals/promise-resolve"),P=e("../internals/host-report-errors"),I=e("../internals/new-promise-capability"),_=e("../internals/perform"),M=e("../internals/user-agent"),L=e("../internals/internal-state"),C=e("../internals/is-forced"),D=e("../internals/well-known-symbol")("species"),H="Promise",F=L.get,U=L.set,z=L.getterFor(H),q=y,B=d.TypeError,G=d.document,V=d.process,W=d.fetch,Y=V&&V.versions,X=Y&&Y.v8||"",J=I.f,$=J,Q="process"==T(V),K=!!(G&&G.createEvent&&d.dispatchEvent),Z="unhandledrejection",ee=C(H,function(){function t(){}var e=q.resolve(1),n=(e.constructor={})[D]=function(e){e(t,t)};return!((Q||"function"==typeof PromiseRejectionEvent)&&(!p||e.finally)&&e.then(t)instanceof n&&0!==X.indexOf("6.6")&&-1===M.indexOf("Chrome/66"))}),te=ee||!A(function(e){q.all(e).catch(function(){})}),ne=function(n,r){k.call(d,function(){var e,t=r.value;if(re(r)&&(e=_(function(){Q?V.emit("unhandledRejection",t,n):i(Z,n,t)}),r.rejection=Q||re(r)?2:1,e.error))throw e.value})},re=function(e){return 1!==e.rejection&&!e.parent},ie=function(e,t){k.call(d,function(){Q?V.emit("rejectionHandled",e):i("rejectionhandled",e,t.value)})},oe=function(n,r,e,t){if(!r.done){r.done=!0,t&&(r=t);try{if(n===e)throw B("Promise can't be resolved itself");var i=g(e);i?N(function(){var t={done:!1};try{i.call(e,a(oe,n,t,r),a(s,n,t,r))}catch(e){s(n,t,e,r)}}):(r.value=e,r.state=1,o(n,r,!1))}catch(e){s(n,{done:!1},e,r)}}};ee&&(q=function(e){E(this,q,H),j(e),r.call(this);var t=F(this);try{e(a(oe,this,t),a(s,this,t))}catch(e){s(this,t,e)}},(r=function(e){U(this,{type:H,done:!1,notified:!1,parent:!1,reactions:[],rejection:!1,state:0,value:void 0})}).prototype=b(q.prototype,{then:function(e,t){var n=z(this),r=J(O(this,q));return r.ok="function"!=typeof e||e,r.fail="function"==typeof t&&t,r.domain=Q?V.domain:void 0,n.parent=!0,n.reactions.push(r),0!=n.state&&o(this,n,!1),r.promise},catch:function(e){return this.then(void 0,e)}}),l=function(){var e=new r,t=F(e);this.promise=e,this.resolve=a(oe,e,t),this.reject=a(s,e,t)},I.f=J=function(e){return e===q||e===c?new l(e):$(e)},p||"function"!=typeof y||(u=y.prototype.then,m(y.prototype,"then",function(e,t){var n=this;return new q(function(e,t){u.call(n,e,t)}).then(e,t)}),"function"==typeof W&&f({global:!0,enumerable:!0,forced:!0},{fetch:function(e){return R(q,W.apply(d,arguments))}}))),f({global:!0,wrap:!0,forced:ee},{Promise:q}),v(q,H,!1,!0),x(H),c=h[H],f({target:H,stat:!0,forced:ee},{reject:function(e){var t=J(this);return t.reject.call(void 0,e),t.promise}}),f({target:H,stat:!0,forced:p||ee},{resolve:function(e){return R(p&&this===c?q:this,e)}}),f({target:H,stat:!0,forced:te},{all:function(e){var s=this,t=J(s),l=t.resolve,c=t.reject,n=_(function(){var r=j(s.resolve),i=[],o=0,a=1;S(e,function(e){var t=o++,n=!1;i.push(void 0),a++,r.call(s,e).then(function(e){n||(n=!0,i[t]=e,--a||l(i))},c)}),--a||l(i)});return n.error&&c(n.value),t.promise},race:function(e){var n=this,r=J(n),i=r.reject,t=_(function(){var t=j(n.resolve);S(e,function(e){t.call(n,e).then(r.resolve,i)})});return t.error&&i(t.value),r.promise}})},{"../internals/a-function":2,"../internals/an-instance":6,"../internals/check-correctness-of-iteration":22,"../internals/classof-raw":23,"../internals/export":43,"../internals/global":56,"../internals/host-report-errors":60,"../internals/internal-state":66,"../internals/is-forced":69,"../internals/is-object":71,"../internals/is-pure":72,"../internals/iterate":74,"../internals/microtask":81,"../internals/native-promise-constructor":82,"../internals/new-promise-capability":86,"../internals/path":107,"../internals/perform":108,"../internals/promise-resolve":109,"../internals/redefine":112,"../internals/redefine-all":111,"../internals/set-species":119,"../internals/set-to-string-tag":120,"../internals/species-constructor":124,"../internals/task":129,"../internals/user-agent":143,"../internals/well-known-symbol":145}],251:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/get-built-in"),o=e("../internals/a-function"),a=e("../internals/an-object"),s=e("../internals/fails"),l=i("Reflect","apply"),c=Function.apply;r({target:"Reflect",stat:!0,forced:!s(function(){l(function(){})})},{apply:function(e,t,n){return o(e),a(n),l?l(e,t,n):c.call(e,t,n)}})},{"../internals/a-function":2,"../internals/an-object":7,"../internals/export":43,"../internals/fails":44,"../internals/get-built-in":53}],252:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/get-built-in"),l=e("../internals/a-function"),c=e("../internals/an-object"),u=e("../internals/is-object"),f=e("../internals/object-create"),p=e("../internals/function-bind"),o=e("../internals/fails"),d=i("Reflect","construct"),h=o(function(){function e(){}return!(d(function(){},[],e)instanceof e)}),g=!o(function(){d(function(){})}),a=h||g;r({target:"Reflect",stat:!0,forced:a,sham:a},{construct:function(e,t,n){l(e),c(t);var r=arguments.length<3?e:l(n);if(g&&!h)return d(e,t,r);if(e==r){switch(t.length){case 0:return new e;case 1:return new e(t[0]);case 2:return new e(t[0],t[1]);case 3:return new e(t[0],t[1],t[2]);case 4:return new e(t[0],t[1],t[2],t[3])}var i=[null];return i.push.apply(i,t),new(p.apply(e,i))}var o=r.prototype,a=f(u(o)?o:Object.prototype),s=Function.apply.call(e,a,t);return u(s)?s:a}})},{"../internals/a-function":2,"../internals/an-object":7,"../internals/export":43,"../internals/fails":44,"../internals/function-bind":51,"../internals/get-built-in":53,"../internals/is-object":71,"../internals/object-create":90}],253:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/descriptors"),o=e("../internals/an-object"),a=e("../internals/to-primitive"),s=e("../internals/object-define-property");r({target:"Reflect",stat:!0,forced:e("../internals/fails")(function(){Reflect.defineProperty(s.f({},1,{value:1}),1,{value:2})}),sham:!i},{defineProperty:function(e,t,n){o(e);var r=a(t,!0);o(n);try{return s.f(e,r,n),!0}catch(e){return!1}}})},{"../internals/an-object":7,"../internals/descriptors":39,"../internals/export":43,"../internals/fails":44,"../internals/object-define-property":92,"../internals/to-primitive":138}],254:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/an-object"),o=e("../internals/object-get-own-property-descriptor").f;r({target:"Reflect",stat:!0},{deleteProperty:function(e,t){var n=o(i(e),t);return!(n&&!n.configurable)&&delete e[t]}})},{"../internals/an-object":7,"../internals/export":43,"../internals/object-get-own-property-descriptor":93}],255:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/descriptors"),o=e("../internals/an-object"),a=e("../internals/object-get-own-property-descriptor");r({target:"Reflect",stat:!0,sham:!i},{getOwnPropertyDescriptor:function(e,t){return a.f(o(e),t)}})},{"../internals/an-object":7,"../internals/descriptors":39,"../internals/export":43,"../internals/object-get-own-property-descriptor":93}],256:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/an-object"),o=e("../internals/object-get-prototype-of");r({target:"Reflect",stat:!0,sham:!e("../internals/correct-prototype-getter")},{getPrototypeOf:function(e){return o(i(e))}})},{"../internals/an-object":7,"../internals/correct-prototype-getter":30,"../internals/export":43,"../internals/object-get-prototype-of":97}],257:[function(e,t,n){var r=e("../internals/export"),a=e("../internals/is-object"),s=e("../internals/an-object"),l=e("../internals/has"),c=e("../internals/object-get-own-property-descriptor"),u=e("../internals/object-get-prototype-of");r({target:"Reflect",stat:!0},{get:function e(t,n){var r,i,o=arguments.length<3?t:arguments[2];return s(t)===o?t[n]:(r=c.f(t,n))?l(r,"value")?r.value:void 0===r.get?void 0:r.get.call(o):a(i=u(t))?e(i,n,o):void 0}})},{"../internals/an-object":7,"../internals/export":43,"../internals/has":57,"../internals/is-object":71,"../internals/object-get-own-property-descriptor":93,"../internals/object-get-prototype-of":97}],258:[function(e,t,n){e("../internals/export")({target:"Reflect",stat:!0},{has:function(e,t){return t in e}})},{"../internals/export":43}],259:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/an-object"),o=Object.isExtensible;r({target:"Reflect",stat:!0},{isExtensible:function(e){return i(e),!o||o(e)}})},{"../internals/an-object":7,"../internals/export":43}],260:[function(e,t,n){e("../internals/export")({target:"Reflect",stat:!0},{ownKeys:e("../internals/own-keys")})},{"../internals/export":43,"../internals/own-keys":104}],261:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/get-built-in"),o=e("../internals/an-object");r({target:"Reflect",stat:!0,sham:!e("../internals/freezing")},{preventExtensions:function(e){o(e);try{var t=i("Object","preventExtensions");return t&&t(e),!0}catch(e){return!1}}})},{"../internals/an-object":7,"../internals/export":43,"../internals/freezing":50,"../internals/get-built-in":53}],262:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/an-object"),o=e("../internals/a-possible-prototype"),a=e("../internals/object-set-prototype-of");a&&r({target:"Reflect",stat:!0},{setPrototypeOf:function(e,t){i(e),o(t);try{return a(e,t),!0}catch(e){return!1}}})},{"../internals/a-possible-prototype":3,"../internals/an-object":7,"../internals/export":43,"../internals/object-set-prototype-of":101}],263:[function(e,t,n){var r=e("../internals/export"),l=e("../internals/an-object"),c=e("../internals/is-object"),u=e("../internals/has"),f=e("../internals/object-define-property"),p=e("../internals/object-get-own-property-descriptor"),d=e("../internals/object-get-prototype-of"),h=e("../internals/create-property-descriptor");r({target:"Reflect",stat:!0},{set:function e(t,n,r){var i,o,a=arguments.length<4?t:arguments[3],s=p.f(l(t),n);if(!s){if(c(o=d(t)))return e(o,n,r,a);s=h(0)}if(u(s,"value")){if(!1===s.writable||!c(a))return!1;if(i=p.f(a,n)){if(i.get||i.set||!1===i.writable)return!1;i.value=r,f.f(a,n,i)}else f.f(a,n,h(0,r));return!0}return void 0!==s.set&&(s.set.call(a,r),!0)}})},{"../internals/an-object":7,"../internals/create-property-descriptor":33,"../internals/export":43,"../internals/has":57,"../internals/is-object":71,"../internals/object-define-property":92,"../internals/object-get-own-property-descriptor":93,"../internals/object-get-prototype-of":97}],264:[function(e,t,n){var r=e("../internals/descriptors"),i=e("../internals/global"),o=e("../internals/is-forced"),a=e("../internals/inherit-if-required"),s=e("../internals/object-define-property").f,l=e("../internals/object-get-own-property-names").f,c=e("../internals/is-regexp"),u=e("../internals/regexp-flags"),f=e("../internals/redefine"),p=e("../internals/fails"),d=e("../internals/set-species"),h=e("../internals/well-known-symbol")("match"),g=i.RegExp,y=g.prototype,m=/a/g,b=/a/g,v=new g(m)!==m;if(r&&o("RegExp",!v||p(function(){return b[h]=!1,g(m)!=m||g(b)==b||"/a/i"!=g(m,"i")}))){function x(t){t in w||s(w,t,{configurable:!0,get:function(){return g[t]},set:function(e){g[t]=e}})}for(var w=function(e,t){var n=this instanceof w,r=c(e),i=void 0===t;return!n&&r&&e.constructor===w&&i?e:a(v?new g(r&&!i?e.source:e,t):g((r=e instanceof w)?e.source:e,r&&i?u.call(e):t),n?this:y,w)},j=l(g),E=0;j.length>E;)x(j[E++]);(y.constructor=w).prototype=y,f(i,"RegExp",w)}d("RegExp")},{"../internals/descriptors":39,"../internals/fails":44,"../internals/global":56,"../internals/inherit-if-required":64,"../internals/is-forced":69,"../internals/is-regexp":73,"../internals/object-define-property":92,"../internals/object-get-own-property-names":95,"../internals/redefine":112,"../internals/regexp-flags":115,"../internals/set-species":119,"../internals/well-known-symbol":145}],265:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/regexp-exec");r({target:"RegExp",proto:!0,forced:/./.exec!==i},{exec:i})},{"../internals/export":43,"../internals/regexp-exec":114}],266:[function(e,t,n){var r=e("../internals/descriptors"),i=e("../internals/object-define-property"),o=e("../internals/regexp-flags");r&&"g"!=/./g.flags&&i.f(RegExp.prototype,"flags",{configurable:!0,get:o})},{"../internals/descriptors":39,"../internals/object-define-property":92,"../internals/regexp-flags":115}],267:[function(e,t,n){"use strict";var r=e("../internals/redefine"),i=e("../internals/an-object"),o=e("../internals/fails"),a=e("../internals/regexp-flags"),s="toString",l=RegExp.prototype,c=l[s],u=o(function(){return"/a/b"!=c.call({source:"a",flags:"b"})}),f=c.name!=s;(u||f)&&r(RegExp.prototype,s,function(){var e=i(this),t=String(e.source),n=e.flags;return"/"+t+"/"+String(void 0===n&&e instanceof RegExp&&!("flags"in l)?a.call(e):n)},{unsafe:!0})},{"../internals/an-object":7,"../internals/fails":44,"../internals/redefine":112,"../internals/regexp-flags":115}],268:[function(e,t,n){"use strict";var r=e("../internals/collection"),i=e("../internals/collection-strong");t.exports=r("Set",function(t){return function(e){return t(this,arguments.length?e:void 0)}},i)},{"../internals/collection":27,"../internals/collection-strong":25}],269:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/create-html");r({target:"String",proto:!0,forced:e("../internals/forced-string-html-method")("anchor")},{anchor:function(e){return i(this,"a","name",e)}})},{"../internals/create-html":31,"../internals/export":43,"../internals/forced-string-html-method":48}],270:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/create-html");r({target:"String",proto:!0,forced:e("../internals/forced-string-html-method")("big")},{big:function(){return i(this,"big","","")}})},{"../internals/create-html":31,"../internals/export":43,"../internals/forced-string-html-method":48}],271:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/create-html");r({target:"String",proto:!0,forced:e("../internals/forced-string-html-method")("blink")},{blink:function(){return i(this,"blink","","")}})},{"../internals/create-html":31,"../internals/export":43,"../internals/forced-string-html-method":48}],272:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/create-html");r({target:"String",proto:!0,forced:e("../internals/forced-string-html-method")("bold")},{bold:function(){return i(this,"b","","")}})},{"../internals/create-html":31,"../internals/export":43,"../internals/forced-string-html-method":48}],273:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/string-multibyte").codeAt;r({target:"String",proto:!0},{codePointAt:function(e){return i(this,e)}})},{"../internals/export":43,"../internals/string-multibyte":125}],274:[function(e,t,n){"use strict";var r=e("../internals/export"),s=e("../internals/to-length"),l=e("../internals/not-a-regexp"),c=e("../internals/require-object-coercible"),i=e("../internals/correct-is-regexp-logic"),u="".endsWith,f=Math.min;r({target:"String",proto:!0,forced:!i("endsWith")},{endsWith:function(e,t){var n=String(c(this));l(e);var r=1<arguments.length?t:void 0,i=s(n.length),o=void 0===r?i:f(s(r),i),a=String(e);return u?u.call(n,a,o):n.slice(o-a.length,o)===a}})},{"../internals/correct-is-regexp-logic":29,"../internals/export":43,"../internals/not-a-regexp":87,"../internals/require-object-coercible":116,"../internals/to-length":135}],275:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/create-html");r({target:"String",proto:!0,forced:e("../internals/forced-string-html-method")("fixed")},{fixed:function(){return i(this,"tt","","")}})},{"../internals/create-html":31,"../internals/export":43,"../internals/forced-string-html-method":48}],276:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/create-html");r({target:"String",proto:!0,forced:e("../internals/forced-string-html-method")("fontcolor")},{fontcolor:function(e){return i(this,"font","color",e)}})},{"../internals/create-html":31,"../internals/export":43,"../internals/forced-string-html-method":48}],277:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/create-html");r({target:"String",proto:!0,forced:e("../internals/forced-string-html-method")("fontsize")},{fontsize:function(e){return i(this,"font","size",e)}})},{"../internals/create-html":31,"../internals/export":43,"../internals/forced-string-html-method":48}],278:[function(e,t,n){var r=e("../internals/export"),o=e("../internals/to-absolute-index"),a=String.fromCharCode,i=String.fromCodePoint;r({target:"String",stat:!0,forced:!!i&&1!=i.length},{fromCodePoint:function(e){for(var t,n=[],r=arguments.length,i=0;i<r;){if(t=+arguments[i++],o(t,1114111)!==t)throw RangeError(t+" is not a valid code point");n.push(t<65536?a(t):a(55296+((t-=65536)>>10),t%1024+56320))}return n.join("")}})},{"../internals/export":43,"../internals/to-absolute-index":131}],279:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/not-a-regexp"),o=e("../internals/require-object-coercible");r({target:"String",proto:!0,forced:!e("../internals/correct-is-regexp-logic")("includes")},{includes:function(e,t){return!!~String(o(this)).indexOf(i(e),1<arguments.length?t:void 0)}})},{"../internals/correct-is-regexp-logic":29,"../internals/export":43,"../internals/not-a-regexp":87,"../internals/require-object-coercible":116}],280:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/create-html");r({target:"String",proto:!0,forced:e("../internals/forced-string-html-method")("italics")},{italics:function(){return i(this,"i","","")}})},{"../internals/create-html":31,"../internals/export":43,"../internals/forced-string-html-method":48}],281:[function(e,t,n){"use strict";var i=e("../internals/string-multibyte").charAt,r=e("../internals/internal-state"),o=e("../internals/define-iterator"),a="String Iterator",s=r.set,l=r.getterFor(a);o(String,"String",function(e){s(this,{type:a,string:String(e),index:0})},function(){var e,t=l(this),n=t.string,r=t.index;return r>=n.length?{value:void 0,done:!0}:(e=i(n,r),t.index+=e.length,{value:e,done:!1})})},{"../internals/define-iterator":37,"../internals/internal-state":66,"../internals/string-multibyte":125}],282:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/create-html");r({target:"String",proto:!0,forced:e("../internals/forced-string-html-method")("link")},{link:function(e){return i(this,"a","href",e)}})},{"../internals/create-html":31,"../internals/export":43,"../internals/forced-string-html-method":48}],283:[function(e,t,n){"use strict";function o(e){var t,n,r,i,o,a,s=u(this),l=String(e);return t=h(s,RegExp),void 0===(n=s.flags)&&s instanceof RegExp&&!("flags"in E)&&(n=f.call(s)),r=void 0===n?"":String(n),i=new t(t===RegExp?s.source:s,r),o=!!~r.indexOf("g"),a=!!~r.indexOf("u"),i.lastIndex=c(s.lastIndex),new S(i,l,o,a)}var r=e("../internals/export"),i=e("../internals/create-iterator-constructor"),a=e("../internals/require-object-coercible"),c=e("../internals/to-length"),s=e("../internals/a-function"),u=e("../internals/an-object"),l=e("../internals/classof"),f=e("../internals/regexp-flags"),p=e("../internals/hide"),d=e("../internals/well-known-symbol"),h=e("../internals/species-constructor"),g=e("../internals/advance-string-index"),y=e("../internals/internal-state"),m=e("../internals/is-pure"),b=d("matchAll"),v="RegExp String",x=v+" Iterator",w=y.set,j=y.getterFor(x),E=RegExp.prototype,T=E.exec,S=i(function(e,t,n,r){w(this,{type:x,regexp:e,string:t,global:n,unicode:r,done:!1})},v,function(){var e=j(this);if(e.done)return{value:void 0,done:!0};var t=e.regexp,n=e.string,r=function(e,t){var n,r=e.exec;if("function"!=typeof r)return T.call(e,t);if("object"!=typeof(n=r.call(e,t)))throw TypeError("Incorrect exec result");return n}(t,n);return null===r?{value:void 0,done:e.done=!0}:e.global?(""==String(r[0])&&(t.lastIndex=g(n,c(t.lastIndex),e.unicode)),{value:r,done:!1}):{value:r,done:!(e.done=!0)}});r({target:"String",proto:!0},{matchAll:function(e){var t,n,r,i=a(this);return null!=e&&(void 0===(n=e[b])&&m&&"RegExp"==l(e)&&(n=o),null!=n)?s(n).call(e,i):(t=String(i),r=new RegExp(e,"g"),m?o.call(r,t):r[b](t))}}),m||b in E||p(E,b,o)},{"../internals/a-function":2,"../internals/advance-string-index":5,"../internals/an-object":7,"../internals/classof":24,"../internals/create-iterator-constructor":32,"../internals/export":43,"../internals/hide":59,"../internals/internal-state":66,"../internals/is-pure":72,"../internals/regexp-flags":115,"../internals/require-object-coercible":116,"../internals/species-constructor":124,"../internals/to-length":135,"../internals/well-known-symbol":145}],284:[function(e,t,n){"use strict";var r=e("../internals/fix-regexp-well-known-symbol-logic"),f=e("../internals/an-object"),p=e("../internals/to-length"),i=e("../internals/require-object-coercible"),d=e("../internals/advance-string-index"),h=e("../internals/regexp-exec-abstract");r("match",1,function(r,c,u){return[function(e){var t=i(this),n=null==e?void 0:e[r];return void 0!==n?n.call(e,t):new RegExp(e)[r](String(t))},function(e){var t=u(c,e,this);if(t.done)return t.value;var n=f(e),r=String(this);if(!n.global)return h(n,r);for(var i,o=n.unicode,a=[],s=n.lastIndex=0;null!==(i=h(n,r));){var l=String(i[0]);""===(a[s]=l)&&(n.lastIndex=d(r,p(n.lastIndex),o)),s++}return 0===s?null:a}]})},{"../internals/advance-string-index":5,"../internals/an-object":7,"../internals/fix-regexp-well-known-symbol-logic":45,"../internals/regexp-exec-abstract":113,"../internals/require-object-coercible":116,"../internals/to-length":135}],285:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/string-pad").end;r({target:"String",proto:!0,forced:e("../internals/webkit-string-pad-bug")},{padEnd:function(e,t){return i(this,e,1<arguments.length?t:void 0)}})},{"../internals/export":43,"../internals/string-pad":126,"../internals/webkit-string-pad-bug":144}],286:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/string-pad").start;r({target:"String",proto:!0,forced:e("../internals/webkit-string-pad-bug")},{padStart:function(e,t){return i(this,e,1<arguments.length?t:void 0)}})},{"../internals/export":43,"../internals/string-pad":126,"../internals/webkit-string-pad-bug":144}],287:[function(e,t,n){var r=e("../internals/export"),a=e("../internals/to-indexed-object"),s=e("../internals/to-length");r({target:"String",stat:!0},{raw:function(e){for(var t=a(e.raw),n=s(t.length),r=arguments.length,i=[],o=0;o<n;)i.push(String(t[o++])),o<r&&i.push(String(arguments[o]));return i.join("")}})},{"../internals/export":43,"../internals/to-indexed-object":133,"../internals/to-length":135}],288:[function(e,t,n){e("../internals/export")({target:"String",proto:!0},{repeat:e("../internals/string-repeat")})},{"../internals/export":43,"../internals/string-repeat":127}],289:[function(e,t,n){"use strict";var r=e("../internals/fix-regexp-well-known-symbol-logic"),T=e("../internals/an-object"),p=e("../internals/to-object"),S=e("../internals/to-length"),A=e("../internals/to-integer"),o=e("../internals/require-object-coercible"),O=e("../internals/advance-string-index"),k=e("../internals/regexp-exec-abstract"),N=Math.max,R=Math.min,d=Math.floor,h=/\$([$&'`]|\d\d?|<[^>]*>)/g,g=/\$([$&'`]|\d\d?)/g;r("replace",2,function(i,w,j){return[function(e,t){var n=o(this),r=null==e?void 0:e[i];return void 0!==r?r.call(e,n,t):w.call(String(n),e,t)},function(e,t){var n=j(w,e,this,t);if(n.done)return n.value;var r=T(e),i=String(this),o="function"==typeof t;o||(t=String(t));var a=r.global;if(a){var s=r.unicode;r.lastIndex=0}for(var l=[];;){var c=k(r,i);if(null===c)break;if(l.push(c),!a)break;""===String(c[0])&&(r.lastIndex=O(i,S(r.lastIndex),s))}for(var u,f="",p=0,d=0;d<l.length;d++){c=l[d];for(var h=String(c[0]),g=N(R(A(c.index),i.length),0),y=[],m=1;m<c.length;m++)y.push(void 0===(u=c[m])?u:String(u));var b=c.groups;if(o){var v=[h].concat(y,g,i);void 0!==b&&v.push(b);var x=String(t.apply(void 0,v))}else x=E(h,i,g,y,b,t);p<=g&&(f+=i.slice(p,g)+x,p=g+h.length)}return f+i.slice(p)}];function E(o,a,s,l,c,e){var u=s+o.length,f=l.length,t=g;return void 0!==c&&(c=p(c),t=h),w.call(e,t,function(e,t){var n;switch(t.charAt(0)){case"$":return"$";case"&":return o;case"`":return a.slice(0,s);case"'":return a.slice(u);case"<":n=c[t.slice(1,-1)];break;default:var r=+t;if(0==r)return e;if(f<r){var i=d(r/10);return 0===i?e:i<=f?void 0===l[i-1]?t.charAt(1):l[i-1]+t.charAt(1):e}n=l[r-1]}return void 0===n?"":n})}})},{"../internals/advance-string-index":5,"../internals/an-object":7,"../internals/fix-regexp-well-known-symbol-logic":45,"../internals/regexp-exec-abstract":113,"../internals/require-object-coercible":116,"../internals/to-integer":134,"../internals/to-length":135,"../internals/to-object":136}],290:[function(e,t,n){"use strict";var r=e("../internals/fix-regexp-well-known-symbol-logic"),l=e("../internals/an-object"),i=e("../internals/require-object-coercible"),c=e("../internals/same-value"),u=e("../internals/regexp-exec-abstract");r("search",1,function(r,a,s){return[function(e){var t=i(this),n=null==e?void 0:e[r];return void 0!==n?n.call(e,t):new RegExp(e)[r](String(t))},function(e){var t=s(a,e,this);if(t.done)return t.value;var n=l(e),r=String(this),i=n.lastIndex;c(i,0)||(n.lastIndex=0);var o=u(n,r);return c(n.lastIndex,i)||(n.lastIndex=i),null===o?-1:o.index}]})},{"../internals/an-object":7,"../internals/fix-regexp-well-known-symbol-logic":45,"../internals/regexp-exec-abstract":113,"../internals/require-object-coercible":116,"../internals/same-value":117}],291:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/create-html");r({target:"String",proto:!0,forced:e("../internals/forced-string-html-method")("small")},{small:function(){return i(this,"small","","")}})},{"../internals/create-html":31,"../internals/export":43,"../internals/forced-string-html-method":48}],292:[function(e,t,n){"use strict";var r=e("../internals/fix-regexp-well-known-symbol-logic"),f=e("../internals/is-regexp"),v=e("../internals/an-object"),p=e("../internals/require-object-coercible"),x=e("../internals/species-constructor"),w=e("../internals/advance-string-index"),j=e("../internals/to-length"),E=e("../internals/regexp-exec-abstract"),d=e("../internals/regexp-exec"),i=e("../internals/fails"),h=[].push,T=Math.min,S=4294967295,A=!i(function(){return!RegExp(S,"y")});r("split",2,function(i,y,m){var b;return b="c"=="abbc".split(/(b)*/)[1]||4!="test".split(/(?:)/,-1).length||2!="ab".split(/(?:ab)*/).length||4!=".".split(/(.?)(.?)/).length||1<".".split(/()()/).length||"".split(/.?/).length?function(e,t){var n=String(p(this)),r=void 0===t?S:t>>>0;if(0==r)return[];if(void 0===e)return[n];if(!f(e))return y.call(n,e,r);for(var i,o,a,s=[],l=(e.ignoreCase?"i":"")+(e.multiline?"m":"")+(e.unicode?"u":"")+(e.sticky?"y":""),c=0,u=new RegExp(e.source,l+"g");(i=d.call(u,n))&&!(c<(o=u.lastIndex)&&(s.push(n.slice(c,i.index)),1<i.length&&i.index<n.length&&h.apply(s,i.slice(1)),a=i[0].length,c=o,s.length>=r));)u.lastIndex===i.index&&u.lastIndex++;return c===n.length?!a&&u.test("")||s.push(""):s.push(n.slice(c)),s.length>r?s.slice(0,r):s}:"0".split(void 0,0).length?function(e,t){return void 0===e&&0===t?[]:y.call(this,e,t)}:y,[function(e,t){var n=p(this),r=null==e?void 0:e[i];return void 0!==r?r.call(e,n,t):b.call(String(n),e,t)},function(e,t){var n=m(b,e,this,t,b!==y);if(n.done)return n.value;var r=v(e),i=String(this),o=x(r,RegExp),a=r.unicode,s=(r.ignoreCase?"i":"")+(r.multiline?"m":"")+(r.unicode?"u":"")+(A?"y":"g"),l=new o(A?r:"^(?:"+r.source+")",s),c=void 0===t?S:t>>>0;if(0==c)return[];if(0===i.length)return null===E(l,i)?[i]:[];for(var u=0,f=0,p=[];f<i.length;){l.lastIndex=A?f:0;var d,h=E(l,A?i:i.slice(f));if(null===h||(d=T(j(l.lastIndex+(A?0:f)),i.length))===u)f=w(i,f,a);else{if(p.push(i.slice(u,f)),p.length===c)return p;for(var g=1;g<=h.length-1;g++)if(p.push(h[g]),p.length===c)return p;f=u=d}}return p.push(i.slice(u)),p}]},!A)},{"../internals/advance-string-index":5,"../internals/an-object":7,"../internals/fails":44,"../internals/fix-regexp-well-known-symbol-logic":45,"../internals/is-regexp":73,"../internals/regexp-exec":114,"../internals/regexp-exec-abstract":113,"../internals/require-object-coercible":116,"../internals/species-constructor":124,"../internals/to-length":135}],293:[function(e,t,n){"use strict";var r=e("../internals/export"),o=e("../internals/to-length"),a=e("../internals/not-a-regexp"),s=e("../internals/require-object-coercible"),i=e("../internals/correct-is-regexp-logic"),l="".startsWith,c=Math.min;r({target:"String",proto:!0,forced:!i("startsWith")},{startsWith:function(e,t){var n=String(s(this));a(e);var r=o(c(1<arguments.length?t:void 0,n.length)),i=String(e);return l?l.call(n,i,r):n.slice(r,r+i.length)===i}})},{"../internals/correct-is-regexp-logic":29,"../internals/export":43,"../internals/not-a-regexp":87,"../internals/require-object-coercible":116,"../internals/to-length":135}],294:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/create-html");r({target:"String",proto:!0,forced:e("../internals/forced-string-html-method")("strike")},{strike:function(){return i(this,"strike","","")}})},{"../internals/create-html":31,"../internals/export":43,"../internals/forced-string-html-method":48}],295:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/create-html");r({target:"String",proto:!0,forced:e("../internals/forced-string-html-method")("sub")},{sub:function(){return i(this,"sub","","")}})},{"../internals/create-html":31,"../internals/export":43,"../internals/forced-string-html-method":48}],296:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/create-html");r({target:"String",proto:!0,forced:e("../internals/forced-string-html-method")("sup")},{sup:function(){return i(this,"sup","","")}})},{"../internals/create-html":31,"../internals/export":43,"../internals/forced-string-html-method":48}],297:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/string-trim").end,o=e("../internals/forced-string-trim-method")("trimEnd"),a=o?function(){return i(this)}:"".trimEnd;r({target:"String",proto:!0,forced:o},{trimEnd:a,trimRight:a})},{"../internals/export":43,"../internals/forced-string-trim-method":49,"../internals/string-trim":128}],298:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/string-trim").start,o=e("../internals/forced-string-trim-method")("trimStart"),a=o?function(){return i(this)}:"".trimStart;r({target:"String",proto:!0,forced:o},{trimStart:a,trimLeft:a})},{"../internals/export":43,"../internals/forced-string-trim-method":49,"../internals/string-trim":128}],299:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/string-trim").trim;r({target:"String",proto:!0,forced:e("../internals/forced-string-trim-method")("trim")},{trim:function(){return i(this)}})},{"../internals/export":43,"../internals/forced-string-trim-method":49,"../internals/string-trim":128}],300:[function(e,t,n){e("../internals/define-well-known-symbol")("asyncIterator")},{"../internals/define-well-known-symbol":38}],301:[function(e,t,n){"use strict";var r=e("../internals/export"),i=e("../internals/descriptors"),o=e("../internals/global"),a=e("../internals/has"),s=e("../internals/is-object"),l=e("../internals/object-define-property").f,c=e("../internals/copy-constructor-properties"),u=o.Symbol;if(i&&"function"==typeof u&&(!("description"in u.prototype)||void 0!==u().description)){var f={},p=function(e){var t=arguments.length<1||void 0===e?void 0:String(e),n=this instanceof p?new u(t):void 0===t?u():u(t);return""===t&&(f[n]=!0),n};c(p,u);var d=p.prototype=u.prototype;d.constructor=p;var h=d.toString,g="Symbol(test)"==String(u("test")),y=/^Symbol\((.*)\)[^)]+$/;l(d,"description",{configurable:!0,get:function(){var e=s(this)?this.valueOf():this,t=h.call(e);if(a(f,e))return"";var n=g?t.slice(7,-1):t.replace(y,"$1");return""===n?void 0:n}}),r({global:!0,forced:!0},{Symbol:p})}},{"../internals/copy-constructor-properties":28,"../internals/descriptors":39,"../internals/export":43,"../internals/global":56,"../internals/has":57,"../internals/is-object":71,"../internals/object-define-property":92}],302:[function(e,t,n){e("../internals/define-well-known-symbol")("hasInstance")},{"../internals/define-well-known-symbol":38}],303:[function(e,t,n){e("../internals/define-well-known-symbol")("isConcatSpreadable")},{"../internals/define-well-known-symbol":38}],304:[function(e,t,n){e("../internals/define-well-known-symbol")("iterator")},{"../internals/define-well-known-symbol":38}],305:[function(e,t,n){"use strict";function i(e,t){var n=te[e]=w(X[B]);return V(n,{type:q,tag:e,description:t}),u||(n.description=t),n}function r(t,e){y(t);var n=b(e),r=j(n).concat(pe(n));return U(r,function(e){u&&!fe.call(n,e)||ue(t,e,n[e])}),t}function o(e,t){var n=b(e),r=v(t,!0);if(n!==Y||!d(te,r)||d(ne,r)){var i=Q(n,r);return!i||!d(te,r)||d(n,z)&&n[z][r]||(i.enumerable=!0),i}}function a(e){var t=Z(b(e)),n=[];return U(t,function(e){d(te,e)||d(_,e)||n.push(e)}),n}var s=e("../internals/export"),l=e("../internals/global"),c=e("../internals/is-pure"),u=e("../internals/descriptors"),f=e("../internals/native-symbol"),p=e("../internals/fails"),d=e("../internals/has"),h=e("../internals/is-array"),g=e("../internals/is-object"),y=e("../internals/an-object"),m=e("../internals/to-object"),b=e("../internals/to-indexed-object"),v=e("../internals/to-primitive"),x=e("../internals/create-property-descriptor"),w=e("../internals/object-create"),j=e("../internals/object-keys"),E=e("../internals/object-get-own-property-names"),T=e("../internals/object-get-own-property-names-external"),S=e("../internals/object-get-own-property-symbols"),A=e("../internals/object-get-own-property-descriptor"),O=e("../internals/object-define-property"),k=e("../internals/object-property-is-enumerable"),N=e("../internals/hide"),R=e("../internals/redefine"),P=e("../internals/shared"),I=e("../internals/shared-key"),_=e("../internals/hidden-keys"),M=e("../internals/uid"),L=e("../internals/well-known-symbol"),C=e("../internals/wrapped-well-known-symbol"),D=e("../internals/define-well-known-symbol"),H=e("../internals/set-to-string-tag"),F=e("../internals/internal-state"),U=e("../internals/array-iteration").forEach,z=I("hidden"),q="Symbol",B="prototype",G=L("toPrimitive"),V=F.set,W=F.getterFor(q),Y=Object[B],X=l.Symbol,J=l.JSON,$=J&&J.stringify,Q=A.f,K=O.f,Z=T.f,ee=k.f,te=P("symbols"),ne=P("op-symbols"),re=P("string-to-symbol-registry"),ie=P("symbol-to-string-registry"),oe=P("wks"),ae=l.QObject,se=!ae||!ae[B]||!ae[B].findChild,le=u&&p(function(){return 7!=w(K({},"a",{get:function(){return K(this,"a",{value:7}).a}})).a})?function(e,t,n){var r=Q(Y,t);r&&delete Y[t],K(e,t,n),r&&e!==Y&&K(Y,t,r)}:K,ce=f&&"symbol"==typeof X.iterator?function(e){return"symbol"==typeof e}:function(e){return Object(e)instanceof X},ue=function(e,t,n){e===Y&&ue(ne,t,n),y(e);var r=v(t,!0);return y(n),d(te,r)?(n.enumerable?(d(e,z)&&e[z][r]&&(e[z][r]=!1),n=w(n,{enumerable:x(0,!1)})):(d(e,z)||K(e,z,x(1,{})),e[z][r]=!0),le(e,r,n)):K(e,r,n)},fe=function(e){var t=v(e,!0),n=ee.call(this,t);return!(this===Y&&d(te,t)&&!d(ne,t))&&(!(n||!d(this,t)||!d(te,t)||d(this,z)&&this[z][t])||n)},pe=function(e){var t=e===Y,n=Z(t?ne:b(e)),r=[];return U(n,function(e){!d(te,e)||t&&!d(Y,e)||r.push(te[e])}),r};f||(R((X=function(e){if(this instanceof X)throw TypeError("Symbol is not a constructor");var t=arguments.length&&void 0!==e?String(e):void 0,n=M(t),r=function(e){this===Y&&r.call(ne,e),d(this,z)&&d(this[z],n)&&(this[z][n]=!1),le(this,n,x(1,e))};return u&&se&&le(Y,n,{configurable:!0,set:r}),i(n,t)})[B],"toString",function(){return W(this).tag}),k.f=fe,O.f=ue,A.f=o,E.f=T.f=a,S.f=pe,u&&(K(X[B],"description",{configurable:!0,get:function(){return W(this).description}}),c||R(Y,"propertyIsEnumerable",fe,{unsafe:!0})),C.f=function(e){return i(L(e),e)}),s({global:!0,wrap:!0,forced:!f,sham:!f},{Symbol:X}),U(j(oe),function(e){D(e)}),s({target:q,stat:!0,forced:!f},{for:function(e){var t=String(e);if(d(re,t))return re[t];var n=X(t);return re[t]=n,ie[n]=t,n},keyFor:function(e){if(!ce(e))throw TypeError(e+" is not a symbol");if(d(ie,e))return ie[e]},useSetter:function(){se=!0},useSimple:function(){se=!1}}),s({target:"Object",stat:!0,forced:!f,sham:!u},{create:function(e,t){return void 0===t?w(e):r(w(e),t)},defineProperty:ue,defineProperties:r,getOwnPropertyDescriptor:o}),s({target:"Object",stat:!0,forced:!f},{getOwnPropertyNames:a,getOwnPropertySymbols:pe}),s({target:"Object",stat:!0,forced:p(function(){S.f(1)})},{getOwnPropertySymbols:function(e){return S.f(m(e))}}),J&&s({target:"JSON",stat:!0,forced:!f||p(function(){var e=X();return"[null]"!=$([e])||"{}"!=$({a:e})||"{}"!=$(Object(e))})},{stringify:function(e){for(var t,n,r=[e],i=1;i<arguments.length;)r.push(arguments[i++]);if(n=t=r[1],(g(t)||void 0!==e)&&!ce(e))return h(t)||(t=function(e,t){if("function"==typeof n&&(t=n.call(this,e,t)),!ce(t))return t}),r[1]=t,$.apply(J,r)}}),X[B][G]||N(X[B],G,X[B].valueOf),H(X,q),_[z]=!0},{"../internals/an-object":7,"../internals/array-iteration":15,"../internals/create-property-descriptor":33,"../internals/define-well-known-symbol":38,"../internals/descriptors":39,"../internals/export":43,"../internals/fails":44,"../internals/global":56,"../internals/has":57,"../internals/hidden-keys":58,"../internals/hide":59,"../internals/internal-state":66,"../internals/is-array":68,"../internals/is-object":71,"../internals/is-pure":72,"../internals/native-symbol":83,"../internals/object-create":90,"../internals/object-define-property":92,"../internals/object-get-own-property-descriptor":93,"../internals/object-get-own-property-names":95,"../internals/object-get-own-property-names-external":94,"../internals/object-get-own-property-symbols":96,"../internals/object-keys":99,"../internals/object-property-is-enumerable":100,"../internals/redefine":112,"../internals/set-to-string-tag":120,"../internals/shared":122,"../internals/shared-key":121,"../internals/to-indexed-object":133,"../internals/to-object":136,"../internals/to-primitive":138,"../internals/uid":142,"../internals/well-known-symbol":145,"../internals/wrapped-well-known-symbol":147}],306:[function(e,t,n){e("../internals/define-well-known-symbol")("matchAll")},{"../internals/define-well-known-symbol":38}],307:[function(e,t,n){e("../internals/define-well-known-symbol")("match")},{"../internals/define-well-known-symbol":38}],308:[function(e,t,n){e("../internals/define-well-known-symbol")("replace")},{"../internals/define-well-known-symbol":38}],309:[function(e,t,n){e("../internals/define-well-known-symbol")("search")},{"../internals/define-well-known-symbol":38}],310:[function(e,t,n){e("../internals/define-well-known-symbol")("species")},{"../internals/define-well-known-symbol":38}],311:[function(e,t,n){e("../internals/define-well-known-symbol")("split")},{"../internals/define-well-known-symbol":38}],312:[function(e,t,n){e("../internals/define-well-known-symbol")("toPrimitive")},{"../internals/define-well-known-symbol":38}],313:[function(e,t,n){e("../internals/define-well-known-symbol")("toStringTag")},{"../internals/define-well-known-symbol":38}],314:[function(e,t,n){e("../internals/define-well-known-symbol")("unscopables")},{"../internals/define-well-known-symbol":38}],315:[function(e,t,n){"use strict";var r=e("../internals/array-buffer-view-core"),i=e("../internals/array-copy-within"),o=r.aTypedArray;r.exportProto("copyWithin",function(e,t,n){return i.call(o(this),e,t,2<arguments.length?n:void 0)})},{"../internals/array-buffer-view-core":8,"../internals/array-copy-within":10}],316:[function(e,t,n){"use strict";var r=e("../internals/array-buffer-view-core"),i=e("../internals/array-iteration").every,o=r.aTypedArray;r.exportProto("every",function(e,t){return i(o(this),e,1<arguments.length?t:void 0)})},{"../internals/array-buffer-view-core":8,"../internals/array-iteration":15}],317:[function(e,t,n){"use strict";var r=e("../internals/array-buffer-view-core"),i=e("../internals/array-fill"),o=r.aTypedArray;r.exportProto("fill",function(e){return i.apply(o(this),arguments)})},{"../internals/array-buffer-view-core":8,"../internals/array-fill":11}],318:[function(e,t,n){"use strict";var r=e("../internals/array-buffer-view-core"),s=e("../internals/array-iteration").filter,l=e("../internals/species-constructor"),c=r.aTypedArray,u=r.aTypedArrayConstructor;r.exportProto("filter",function(e,t){for(var n=s(c(this),e,1<arguments.length?t:void 0),r=l(this,this.constructor),i=0,o=n.length,a=new(u(r))(o);i<o;)a[i]=n[i++];return a})},{"../internals/array-buffer-view-core":8,"../internals/array-iteration":15,"../internals/species-constructor":124}],319:[function(e,t,n){"use strict";var r=e("../internals/array-buffer-view-core"),i=e("../internals/array-iteration").findIndex,o=r.aTypedArray;r.exportProto("findIndex",function(e,t){return i(o(this),e,1<arguments.length?t:void 0)})},{"../internals/array-buffer-view-core":8,"../internals/array-iteration":15}],320:[function(e,t,n){"use strict";var r=e("../internals/array-buffer-view-core"),i=e("../internals/array-iteration").find,o=r.aTypedArray;r.exportProto("find",function(e,t){return i(o(this),e,1<arguments.length?t:void 0)})},{"../internals/array-buffer-view-core":8,"../internals/array-iteration":15}],321:[function(e,t,n){e("../internals/typed-array-constructor")("Float32",4,function(r){return function(e,t,n){return r(this,e,t,n)}})},{"../internals/typed-array-constructor":139}],322:[function(e,t,n){e("../internals/typed-array-constructor")("Float64",8,function(r){return function(e,t,n){return r(this,e,t,n)}})},{"../internals/typed-array-constructor":139}],323:[function(e,t,n){"use strict";var r=e("../internals/array-buffer-view-core"),i=e("../internals/array-iteration").forEach,o=r.aTypedArray;r.exportProto("forEach",function(e,t){i(o(this),e,1<arguments.length?t:void 0)})},{"../internals/array-buffer-view-core":8,"../internals/array-iteration":15}],324:[function(e,t,n){"use strict";var r=e("../internals/typed-arrays-constructors-requires-wrappers"),i=e("../internals/array-buffer-view-core"),o=e("../internals/typed-array-from");i.exportStatic("from",o,r)},{"../internals/array-buffer-view-core":8,"../internals/typed-array-from":140,"../internals/typed-arrays-constructors-requires-wrappers":141}],325:[function(e,t,n){"use strict";var r=e("../internals/array-buffer-view-core"),i=e("../internals/array-includes").includes,o=r.aTypedArray;r.exportProto("includes",function(e,t){return i(o(this),e,1<arguments.length?t:void 0)})},{"../internals/array-buffer-view-core":8,"../internals/array-includes":14}],326:[function(e,t,n){"use strict";var r=e("../internals/array-buffer-view-core"),i=e("../internals/array-includes").indexOf,o=r.aTypedArray;r.exportProto("indexOf",function(e,t){return i(o(this),e,1<arguments.length?t:void 0)})},{"../internals/array-buffer-view-core":8,"../internals/array-includes":14}],327:[function(e,t,n){e("../internals/typed-array-constructor")("Int16",2,function(r){return function(e,t,n){return r(this,e,t,n)}})},{"../internals/typed-array-constructor":139}],328:[function(e,t,n){e("../internals/typed-array-constructor")("Int32",4,function(r){return function(e,t,n){return r(this,e,t,n)}})},{"../internals/typed-array-constructor":139}],329:[function(e,t,n){e("../internals/typed-array-constructor")("Int8",1,function(r){return function(e,t,n){return r(this,e,t,n)}})},{"../internals/typed-array-constructor":139}],330:[function(e,t,n){"use strict";function r(){return c.call(p(this))}var i=e("../internals/global"),o=e("../internals/array-buffer-view-core"),a=e("../modules/es.array.iterator"),s=e("../internals/well-known-symbol")("iterator"),l=i.Uint8Array,c=a.values,u=a.keys,f=a.entries,p=o.aTypedArray,d=o.exportProto,h=l&&l.prototype[s],g=!!h&&("values"==h.name||null==h.name);d("entries",function(){return f.call(p(this))}),d("keys",function(){return u.call(p(this))}),d("values",r,!g),d(s,r,!g)},{"../internals/array-buffer-view-core":8,"../internals/global":56,"../internals/well-known-symbol":145,"../modules/es.array.iterator":165}],331:[function(e,t,n){"use strict";var r=e("../internals/array-buffer-view-core"),i=r.aTypedArray,o=[].join;r.exportProto("join",function(e){return o.apply(i(this),arguments)})},{"../internals/array-buffer-view-core":8}],332:[function(e,t,n){"use strict";var r=e("../internals/array-buffer-view-core"),i=e("../internals/array-last-index-of"),o=r.aTypedArray;r.exportProto("lastIndexOf",function(e){return i.apply(o(this),arguments)})},{"../internals/array-buffer-view-core":8,"../internals/array-last-index-of":16}],333:[function(e,t,n){"use strict";var r=e("../internals/array-buffer-view-core"),i=e("../internals/array-iteration").map,o=e("../internals/species-constructor"),a=r.aTypedArray,s=r.aTypedArrayConstructor;r.exportProto("map",function(e,t){return i(a(this),e,1<arguments.length?t:void 0,function(e,t){return new(s(o(e,e.constructor)))(t)})})},{"../internals/array-buffer-view-core":8,"../internals/array-iteration":15,"../internals/species-constructor":124}],334:[function(e,t,n){"use strict";var r=e("../internals/array-buffer-view-core"),i=e("../internals/typed-arrays-constructors-requires-wrappers"),o=r.aTypedArrayConstructor;r.exportStatic("of",function(){for(var e=0,t=arguments.length,n=new(o(this))(t);e<t;)n[e]=arguments[e++];return n},i)},{"../internals/array-buffer-view-core":8,"../internals/typed-arrays-constructors-requires-wrappers":141}],335:[function(e,t,n){"use strict";var r=e("../internals/array-buffer-view-core"),i=e("../internals/array-reduce").right,o=r.aTypedArray;r.exportProto("reduceRight",function(e,t){return i(o(this),e,arguments.length,1<arguments.length?t:void 0)})},{"../internals/array-buffer-view-core":8,"../internals/array-reduce":18}],336:[function(e,t,n){"use strict";var r=e("../internals/array-buffer-view-core"),i=e("../internals/array-reduce").left,o=r.aTypedArray;r.exportProto("reduce",function(e,t){return i(o(this),e,arguments.length,1<arguments.length?t:void 0)})},{"../internals/array-buffer-view-core":8,"../internals/array-reduce":18}],337:[function(e,t,n){"use strict";var r=e("../internals/array-buffer-view-core"),i=r.aTypedArray,o=Math.floor;r.exportProto("reverse",function(){for(var e,t=i(this).length,n=o(t/2),r=0;r<n;)e=this[r],this[r++]=this[--t],this[t]=e;return this})},{"../internals/array-buffer-view-core":8}],338:[function(e,t,n){"use strict";var r=e("../internals/array-buffer-view-core"),s=e("../internals/to-length"),l=e("../internals/to-offset"),c=e("../internals/to-object"),i=e("../internals/fails"),u=r.aTypedArray,o=i(function(){new Int8Array(1).set({})});r.exportProto("set",function(e,t){u(this);var n=l(1<arguments.length?t:void 0,1),r=this.length,i=c(e),o=s(i.length),a=0;if(r<o+n)throw RangeError("Wrong length");for(;a<o;)this[n+a]=i[a++]},o)},{"../internals/array-buffer-view-core":8,"../internals/fails":44,"../internals/to-length":135,"../internals/to-object":136,"../internals/to-offset":137}],339:[function(e,t,n){"use strict";var r=e("../internals/array-buffer-view-core"),s=e("../internals/species-constructor"),i=e("../internals/fails"),l=r.aTypedArray,c=r.aTypedArrayConstructor,u=[].slice,o=i(function(){new Int8Array(1).slice()});r.exportProto("slice",function(e,t){for(var n=u.call(l(this),e,t),r=s(this,this.constructor),i=0,o=n.length,a=new(c(r))(o);i<o;)a[i]=n[i++];return a},o)},{"../internals/array-buffer-view-core":8,"../internals/fails":44,"../internals/species-constructor":124}],340:[function(e,t,n){"use strict";var r=e("../internals/array-buffer-view-core"),i=e("../internals/array-iteration").some,o=r.aTypedArray;r.exportProto("some",function(e,t){return i(o(this),e,1<arguments.length?t:void 0)})},{"../internals/array-buffer-view-core":8,"../internals/array-iteration":15}],341:[function(e,t,n){"use strict";var r=e("../internals/array-buffer-view-core"),i=r.aTypedArray,o=[].sort;r.exportProto("sort",function(e){return o.call(i(this),e)})},{"../internals/array-buffer-view-core":8}],342:[function(e,t,n){"use strict";var r=e("../internals/array-buffer-view-core"),o=e("../internals/to-length"),a=e("../internals/to-absolute-index"),s=e("../internals/species-constructor"),l=r.aTypedArray;r.exportProto("subarray",function(e,t){var n=l(this),r=n.length,i=a(e,r);return new(s(n,n.constructor))(n.buffer,n.byteOffset+i*n.BYTES_PER_ELEMENT,o((void 0===t?r:a(t,r))-i))})},{"../internals/array-buffer-view-core":8,"../internals/species-constructor":124,"../internals/to-absolute-index":131,"../internals/to-length":135}],343:[function(e,t,n){"use strict";var r=e("../internals/global"),i=e("../internals/array-buffer-view-core"),o=e("../internals/fails"),a=r.Int8Array,s=i.aTypedArray,l=[].toLocaleString,c=[].slice,u=!!a&&o(function(){l.call(new a(1))}),f=o(function(){return[1,2].toLocaleString()!=new a([1,2]).toLocaleString()})||!o(function(){a.prototype.toLocaleString.call([1,2])});i.exportProto("toLocaleString",function(){return l.apply(u?c.call(s(this)):s(this),arguments)},f)},{"../internals/array-buffer-view-core":8,"../internals/fails":44,"../internals/global":56}],344:[function(e,t,n){"use strict";var r=e("../internals/global"),i=e("../internals/array-buffer-view-core"),o=e("../internals/fails"),a=r.Uint8Array,s=a&&a.prototype,l=[].toString,c=[].join;o(function(){l.call({})})&&(l=function(){return c.call(this)}),i.exportProto("toString",l,(s||{}).toString!=l)},{"../internals/array-buffer-view-core":8,"../internals/fails":44,"../internals/global":56}],345:[function(e,t,n){e("../internals/typed-array-constructor")("Uint16",2,function(r){return function(e,t,n){return r(this,e,t,n)}})},{"../internals/typed-array-constructor":139}],346:[function(e,t,n){e("../internals/typed-array-constructor")("Uint32",4,function(r){return function(e,t,n){return r(this,e,t,n)}})},{"../internals/typed-array-constructor":139}],347:[function(e,t,n){e("../internals/typed-array-constructor")("Uint8",1,function(r){return function(e,t,n){return r(this,e,t,n)}})},{"../internals/typed-array-constructor":139}],348:[function(e,t,n){e("../internals/typed-array-constructor")("Uint8",1,function(r){return function(e,t,n){return r(this,e,t,n)}},!0)},{"../internals/typed-array-constructor":139}],349:[function(e,t,n){"use strict";function r(t){return function(e){return t(this,arguments.length?e:void 0)}}var i,o=e("../internals/global"),a=e("../internals/redefine-all"),s=e("../internals/internal-metadata"),l=e("../internals/collection"),c=e("../internals/collection-weak"),u=e("../internals/is-object"),f=e("../internals/internal-state").enforce,p=e("../internals/native-weak-map"),d=!o.ActiveXObject&&"ActiveXObject"in o,h=Object.isExtensible,g=t.exports=l("WeakMap",r,c,!0,!0);if(p&&d){i=c.getConstructor(r,"WeakMap",!0),s.REQUIRED=!0;var y=g.prototype,m=y.delete,b=y.has,v=y.get,x=y.set;a(y,{delete:function(e){if(!u(e)||h(e))return m.call(this,e);var t=f(this);return t.frozen||(t.frozen=new i),m.call(this,e)||t.frozen.delete(e)},has:function(e){if(!u(e)||h(e))return b.call(this,e);var t=f(this);return t.frozen||(t.frozen=new i),b.call(this,e)||t.frozen.has(e)},get:function(e){if(!u(e)||h(e))return v.call(this,e);var t=f(this);return t.frozen||(t.frozen=new i),b.call(this,e)?v.call(this,e):t.frozen.get(e)},set:function(e,t){if(u(e)&&!h(e)){var n=f(this);n.frozen||(n.frozen=new i),b.call(this,e)?x.call(this,e,t):n.frozen.set(e,t)}else x.call(this,e,t);return this}})}},{"../internals/collection":27,"../internals/collection-weak":26,"../internals/global":56,"../internals/internal-metadata":65,"../internals/internal-state":66,"../internals/is-object":71,"../internals/native-weak-map":85,"../internals/redefine-all":111}],350:[function(e,t,n){"use strict";e("../internals/collection")("WeakSet",function(t){return function(e){return t(this,arguments.length?e:void 0)}},e("../internals/collection-weak"),!1,!0)},{"../internals/collection":27,"../internals/collection-weak":26}],351:[function(e,t,n){var r=e("../internals/global"),i=e("../internals/dom-iterables"),o=e("../internals/array-for-each"),a=e("../internals/hide");for(var s in i){var l=r[s],c=l&&l.prototype;if(c&&c.forEach!==o)try{a(c,"forEach",o)}catch(e){c.forEach=o}}},{"../internals/array-for-each":12,"../internals/dom-iterables":41,"../internals/global":56,"../internals/hide":59}],352:[function(e,t,n){var r=e("../internals/global"),i=e("../internals/dom-iterables"),o=e("../modules/es.array.iterator"),a=e("../internals/hide"),s=e("../internals/well-known-symbol"),l=s("iterator"),c=s("toStringTag"),u=o.values;for(var f in i){var p=r[f],d=p&&p.prototype;if(d){if(d[l]!==u)try{a(d,l,u)}catch(e){d[l]=u}if(d[c]||a(d,c,f),i[f])for(var h in o)if(d[h]!==o[h])try{a(d,h,o[h])}catch(e){d[h]=o[h]}}}},{"../internals/dom-iterables":41,"../internals/global":56,"../internals/hide":59,"../internals/well-known-symbol":145,"../modules/es.array.iterator":165}],353:[function(e,t,n){var r=e("../internals/global"),i=e("../internals/task"),o=!r.setImmediate||!r.clearImmediate;e("../internals/export")({global:!0,bind:!0,enumerable:!0,forced:o},{setImmediate:i.set,clearImmediate:i.clear})},{"../internals/export":43,"../internals/global":56,"../internals/task":129}],354:[function(e,t,n){var r=e("../internals/export"),i=e("../internals/global"),o=e("../internals/microtask"),a=e("../internals/classof-raw"),s=i.process,l="process"==a(s);r({global:!0,enumerable:!0,noTargetGet:!0},{queueMicrotask:function(e){var t=l&&s.domain;o(t?t.bind(e):e)}})},{"../internals/classof-raw":23,"../internals/export":43,"../internals/global":56,"../internals/microtask":81}],355:[function(e,t,n){function r(i){return function(e,t){var n=2<arguments.length,r=n?s.call(arguments,2):void 0;return i(n?function(){("function"==typeof e?e:Function(e)).apply(this,r)}:e,t)}}var i=e("../internals/export"),o=e("../internals/global"),a=e("../internals/user-agent"),s=[].slice;i({global:!0,bind:!0,forced:/MSIE .\./.test(a)},{setTimeout:r(o.setTimeout),setInterval:r(o.setInterval)})},{"../internals/export":43,"../internals/global":56,"../internals/user-agent":143}],356:[function(e,t,n){"use strict";e("../modules/es.array.iterator");function i(t){try{return decodeURIComponent(t)}catch(e){return t}}function a(e){var t,n=e.replace(R," "),r=4;try{return decodeURIComponent(n)}catch(e){for(;r;)n=n.replace((t=r--,P[t-1]||(P[t-1]=RegExp("((?:%[\\da-f]{2}){"+t+"})","gi"))),i);return n}}function r(e){return _[e]}function o(e){return encodeURIComponent(e).replace(I,r)}function u(e,t){if(t)for(var n,r,i=t.split("&"),o=0;o<i.length;)(n=i[o++]).length&&(r=n.split("="),e.push({key:a(r.shift()),value:a(r.join("="))}))}function f(e){this.entries.length=0,u(this.entries,e)}function c(e,t){if(e<t)throw TypeError("Not enough arguments")}var s=e("../internals/export"),l=e("../internals/native-url"),p=e("../internals/redefine"),d=e("../internals/redefine-all"),h=e("../internals/set-to-string-tag"),g=e("../internals/create-iterator-constructor"),y=e("../internals/internal-state"),m=e("../internals/an-instance"),b=e("../internals/has"),v=e("../internals/bind-context"),x=e("../internals/an-object"),w=e("../internals/is-object"),j=e("../internals/get-iterator"),E=e("../internals/get-iterator-method"),T=e("../internals/well-known-symbol")("iterator"),S="URLSearchParams",A=S+"Iterator",O=y.set,k=y.getterFor(S),N=y.getterFor(A),R=/\+/g,P=Array(4),I=/[!'()~]|%20/g,_={"!":"%21","'":"%27","(":"%28",")":"%29","~":"%7E","%20":"+"},M=g(function(e,t){O(this,{type:A,iterator:j(k(e).entries),kind:t})},"Iterator",function(){var e=N(this),t=e.kind,n=e.iterator.next(),r=n.value;return n.done||(n.value="keys"===t?r.key:"values"===t?r.value:[r.key,r.value]),n}),L=function(e){m(this,L,S);var t,n,r,i,o,a,s,l=0<arguments.length?e:void 0,c=[];if(O(this,{type:S,entries:c,updateURL:function(){},updateSearchParams:f}),void 0!==l)if(w(l))if("function"==typeof(t=E(l)))for(n=t.call(l);!(r=n.next()).done;){if((o=(i=j(x(r.value))).next()).done||(a=i.next()).done||!i.next().done)throw TypeError("Expected sequence with length 2");c.push({key:o.value+"",value:a.value+""})}else for(s in l)b(l,s)&&c.push({key:s,value:l[s]+""});else u(c,"string"==typeof l?"?"===l.charAt(0)?l.slice(1):l:l+"")},C=L.prototype;d(C,{append:function(e,t){c(arguments.length,2);var n=k(this);n.entries.push({key:e+"",value:t+""}),n.updateURL()},delete:function(e){c(arguments.length,1);for(var t=k(this),n=t.entries,r=e+"",i=0;i<n.length;)n[i].key===r?n.splice(i,1):i++;t.updateURL()},get:function(e){c(arguments.length,1);for(var t=k(this).entries,n=e+"",r=0;r<t.length;r++)if(t[r].key===n)return t[r].value;return null},getAll:function(e){c(arguments.length,1);for(var t=k(this).entries,n=e+"",r=[],i=0;i<t.length;i++)t[i].key===n&&r.push(t[i].value);return r},has:function(e){c(arguments.length,1);for(var t=k(this).entries,n=e+"",r=0;r<t.length;)if(t[r++].key===n)return!0;return!1},set:function(e,t){c(arguments.length,1);for(var n,r=k(this),i=r.entries,o=!1,a=e+"",s=t+"",l=0;l<i.length;l++)(n=i[l]).key===a&&(o?i.splice(l--,1):(o=!0,n.value=s));o||i.push({key:a,value:s}),r.updateURL()},sort:function(){var e,t,n,r=k(this),i=r.entries,o=i.slice();for(n=i.length=0;n<o.length;n++){for(e=o[n],t=0;t<n;t++)if(i[t].key>e.key){i.splice(t,0,e);break}t===n&&i.push(e)}r.updateURL()},forEach:function(e,t){for(var n,r=k(this).entries,i=v(e,1<arguments.length?t:void 0,3),o=0;o<r.length;)i((n=r[o++]).value,n.key,this)},keys:function(){return new M(this,"keys")},values:function(){return new M(this,"values")},entries:function(){return new M(this,"entries")}},{enumerable:!0}),p(C,T,C.entries),p(C,"toString",function(){for(var e,t=k(this).entries,n=[],r=0;r<t.length;)e=t[r++],n.push(o(e.key)+"="+o(e.value));return n.join("&")},{enumerable:!0}),h(L,S),s({global:!0,forced:!l},{URLSearchParams:L}),t.exports={URLSearchParams:L,getState:k}},{"../internals/an-instance":6,"../internals/an-object":7,"../internals/bind-context":20,"../internals/create-iterator-constructor":32,"../internals/export":43,"../internals/get-iterator":55,"../internals/get-iterator-method":54,"../internals/has":57,"../internals/internal-state":66,"../internals/is-object":71,"../internals/native-url":84,"../internals/redefine":112,"../internals/redefine-all":111,"../internals/set-to-string-tag":120,"../internals/well-known-symbol":145,"../modules/es.array.iterator":165}],357:[function(e,t,n){"use strict";e("../modules/es.string.iterator");function x(e,t){var n,r,i;if("["==t.charAt(0)){if("]"!=t.charAt(t.length-1))return C;if(!(n=$(t.slice(1,-1))))return C;e.host=n}else if(re(e)){if(t=y(t),V.test(t))return C;if(null===(n=J(t)))return C;e.host=n}else{if(W.test(t))return C;for(n="",r=O(t),i=0;i<r.length;i++)n+=te(r[i],Q);e.host=n}}function u(e){var t,n,r,i;if("number"==typeof e){for(t=[],n=0;n<4;n++)t.unshift(e%256),e=_(e/256);return t.join(".")}if("object"!=typeof e)return e;for(t="",r=function(e){for(var t=null,n=1,r=null,i=0,o=0;o<8;o++)0!==e[o]?(n<i&&(t=r,n=i),r=null,i=0):(null===r&&(r=o),++i);return n<i&&(t=r,n=i),t}(e),n=0;n<8;n++)i&&0===e[n]||(i=i&&!1,r===n?(t+=n?":":"::",i=!0):(t+=e[n].toString(16),n<7&&(t+=":")));return"["+t+"]"}function w(e){return""!=e.username||""!=e.password}function i(e){return!e.host||e.cannotBeABaseURL||"file"==e.scheme}function j(e,t){var n;return 2==e.length&&H.test(e.charAt(0))&&(":"==(n=e.charAt(1))||!t&&"|"==n)}function E(e){var t;return 1<e.length&&j(e.slice(0,2))&&(2==e.length||"/"===(t=e.charAt(2))||"\\"===t||"?"===t||"#"===t)}function T(e){var t=e.path,n=t.length;!n||"file"==e.scheme&&1==n&&j(t[0],!0)||t.pop()}function f(e,t,n,r){var i,o,a,s,l,c,u=n||ie,f=0,p="",d=!1,h=!1,g=!1;for(n||(e.scheme="",e.username="",e.password="",e.host=null,e.port=null,e.path=[],e.query=null,e.fragment=null,e.cannotBeABaseURL=!1,t=t.replace(Y,"")),t=t.replace(X,""),i=O(t);f<=i.length;){switch(o=i[f],u){case ie:if(!o||!H.test(o)){if(n)return L;u=ae;continue}p+=o.toLowerCase(),u=oe;break;case oe:if(o&&(F.test(o)||"+"==o||"-"==o||"."==o))p+=o.toLowerCase();else{if(":"!=o){if(n)return L;p="",u=ae,f=0;continue}if(n&&(re(e)!=A(ne,p)||"file"==p&&(w(e)||null!==e.port)||"file"==e.scheme&&!e.host))return;if(e.scheme=p,n)return void(re(e)&&ne[e.scheme]==e.port&&(e.port=null));p="","file"==e.scheme?u=me:re(e)&&r&&r.scheme==e.scheme?u=se:re(e)?u=fe:"/"==i[f+1]?(u=le,f++):(e.cannotBeABaseURL=!0,e.path.push(""),u=je)}break;case ae:if(!r||r.cannotBeABaseURL&&"#"!=o)return L;if(r.cannotBeABaseURL&&"#"==o){e.scheme=r.scheme,e.path=r.path.slice(),e.query=r.query,e.fragment="",e.cannotBeABaseURL=!0,u=Te;break}u="file"==r.scheme?me:ce;continue;case se:if("/"!=o||"/"!=i[f+1]){u=ce;continue}u=pe,f++;break;case le:if("/"==o){u=de;break}u=we;continue;case ce:if(e.scheme=r.scheme,o==S)e.username=r.username,e.password=r.password,e.host=r.host,e.port=r.port,e.path=r.path.slice(),e.query=r.query;else if("/"==o||"\\"==o&&re(e))u=ue;else if("?"==o)e.username=r.username,e.password=r.password,e.host=r.host,e.port=r.port,e.path=r.path.slice(),e.query="",u=Ee;else{if("#"!=o){e.username=r.username,e.password=r.password,e.host=r.host,e.port=r.port,e.path=r.path.slice(),e.path.pop(),u=we;continue}e.username=r.username,e.password=r.password,e.host=r.host,e.port=r.port,e.path=r.path.slice(),e.query=r.query,e.fragment="",u=Te}break;case ue:if(!re(e)||"/"!=o&&"\\"!=o){if("/"!=o){e.username=r.username,e.password=r.password,e.host=r.host,e.port=r.port,u=we;continue}u=de}else u=pe;break;case fe:if(u=pe,"/"!=o||"/"!=p.charAt(f+1))continue;f++;break;case pe:if("/"==o||"\\"==o)break;u=de;continue;case de:if("@"==o){d&&(p="%40"+p),d=!0,a=O(p);for(var y=0;y<a.length;y++){var m=a[y];if(":"!=m||g){var b=te(m,ee);g?e.password+=b:e.username+=b}else g=!0}p=""}else if(o==S||"/"==o||"?"==o||"#"==o||"\\"==o&&re(e)){if(d&&""==p)return"Invalid authority";f-=O(p).length+1,p="",u=he}else p+=o;break;case he:case ge:if(n&&"file"==e.scheme){u=ve;continue}if(":"!=o||h){if(o==S||"/"==o||"?"==o||"#"==o||"\\"==o&&re(e)){if(re(e)&&""==p)return C;if(n&&""==p&&(w(e)||null!==e.port))return;if(s=x(e,p))return s;if(p="",u=xe,n)return;continue}"["==o?h=!0:"]"==o&&(h=!1),p+=o}else{if(""==p)return C;if(s=x(e,p))return s;if(p="",u=ye,n==ge)return}break;case ye:if(!U.test(o)){if(o==S||"/"==o||"?"==o||"#"==o||"\\"==o&&re(e)||n){if(""!=p){var v=parseInt(p,10);if(65535<v)return D;e.port=re(e)&&v===ne[e.scheme]?null:v,p=""}if(n)return;u=xe;continue}return D}p+=o;break;case me:if(e.scheme="file","/"==o||"\\"==o)u=be;else{if(!r||"file"!=r.scheme){u=we;continue}if(o==S)e.host=r.host,e.path=r.path.slice(),e.query=r.query;else if("?"==o)e.host=r.host,e.path=r.path.slice(),e.query="",u=Ee;else{if("#"!=o){E(i.slice(f).join(""))||(e.host=r.host,e.path=r.path.slice(),T(e)),u=we;continue}e.host=r.host,e.path=r.path.slice(),e.query=r.query,e.fragment="",u=Te}}break;case be:if("/"==o||"\\"==o){u=ve;break}r&&"file"==r.scheme&&!E(i.slice(f).join(""))&&(j(r.path[0],!0)?e.path.push(r.path[0]):e.host=r.host),u=we;continue;case ve:if(o==S||"/"==o||"\\"==o||"?"==o||"#"==o){if(!n&&j(p))u=we;else if(""==p){if(e.host="",n)return;u=xe}else{if(s=x(e,p))return s;if("localhost"==e.host&&(e.host=""),n)return;p="",u=xe}continue}p+=o;break;case xe:if(re(e)){if(u=we,"/"!=o&&"\\"!=o)continue}else if(n||"?"!=o)if(n||"#"!=o){if(o!=S&&(u=we,"/"!=o))continue}else e.fragment="",u=Te;else e.query="",u=Ee;break;case we:if(o==S||"/"==o||"\\"==o&&re(e)||!n&&("?"==o||"#"==o)){if(".."===(c=(c=p).toLowerCase())||"%2e."===c||".%2e"===c||"%2e%2e"===c?(T(e),"/"==o||"\\"==o&&re(e)||e.path.push("")):"."===(l=p)||"%2e"===l.toLowerCase()?"/"==o||"\\"==o&&re(e)||e.path.push(""):("file"==e.scheme&&!e.path.length&&j(p)&&(e.host&&(e.host=""),p=p.charAt(0)+":"),e.path.push(p)),p="","file"==e.scheme&&(o==S||"?"==o||"#"==o))for(;1<e.path.length&&""===e.path[0];)e.path.shift();"?"==o?(e.query="",u=Ee):"#"==o&&(e.fragment="",u=Te)}else p+=te(o,Z);break;case je:"?"==o?(e.query="",u=Ee):"#"==o?(e.fragment="",u=Te):o!=S&&(e.path[0]+=te(o,Q));break;case Ee:n||"#"!=o?o!=S&&("'"==o&&re(e)?e.query+="%27":e.query+="#"==o?"%23":te(o,Q)):(e.fragment="",u=Te);break;case Te:o!=S&&(e.fragment+=te(o,K))}f++}}function r(e,t){return{get:e,set:t,configurable:!0,enumerable:!0}}var S,o=e("../internals/export"),p=e("../internals/descriptors"),a=e("../internals/native-url"),s=e("../internals/global"),l=e("../internals/object-define-properties"),c=e("../internals/redefine"),d=e("../internals/an-instance"),A=e("../internals/has"),h=e("../internals/object-assign"),O=e("../internals/array-from"),g=e("../internals/string-multibyte").codeAt,y=e("../internals/punycode-to-ascii"),m=e("../internals/set-to-string-tag"),b=e("../modules/web.url-search-params"),v=e("../internals/internal-state"),k=s.URL,N=b.URLSearchParams,R=b.getState,P=v.set,I=v.getterFor("URL"),_=Math.floor,M=Math.pow,L="Invalid scheme",C="Invalid host",D="Invalid port",H=/[A-Za-z]/,F=/[\d+\-.A-Za-z]/,U=/\d/,z=/^(0x|0X)/,q=/^[0-7]+$/,B=/^\d+$/,G=/^[\dA-Fa-f]+$/,V=/[\u0000\u0009\u000A\u000D #%/:?@[\\]]/,W=/[\u0000\u0009\u000A\u000D #/:?@[\\]]/,Y=/^[\u0000-\u001F ]+|[\u0000-\u001F ]+$/g,X=/[\u0009\u000A\u000D]/g,J=function(e){var t,n,r,i,o,a,s,l=e.split(".");if(l.length&&""==l[l.length-1]&&l.pop(),4<(t=l.length))return e;for(n=[],r=0;r<t;r++){if(""==(i=l[r]))return e;if(o=10,1<i.length&&"0"==i.charAt(0)&&(o=z.test(i)?16:8,i=i.slice(8==o?1:2)),""===i)a=0;else{if(!(10==o?B:8==o?q:G).test(i))return e;a=parseInt(i,o)}n.push(a)}for(r=0;r<t;r++)if(a=n[r],r==t-1){if(a>=M(256,5-t))return null}else if(255<a)return null;for(s=n.pop(),r=0;r<n.length;r++)s+=n[r]*M(256,3-r);return s},$=function(e){function t(){return e.charAt(p)}var n,r,i,o,a,s,l,c=[0,0,0,0,0,0,0,0],u=0,f=null,p=0;if(":"==t()){if(":"!=e.charAt(1))return;p+=2,f=++u}for(;t();){if(8==u)return;if(":"!=t()){for(n=r=0;r<4&&G.test(t());)n=16*n+parseInt(t(),16),p++,r++;if("."==t()){if(0==r)return;if(p-=r,6<u)return;for(i=0;t();){if(o=null,0<i){if(!("."==t()&&i<4))return;p++}if(!U.test(t()))return;for(;U.test(t());){if(a=parseInt(t(),10),null===o)o=a;else{if(0==o)return;o=10*o+a}if(255<o)return;p++}c[u]=256*c[u]+o,2!=++i&&4!=i||u++}if(4!=i)return;break}if(":"==t()){if(p++,!t())return}else if(t())return;c[u++]=n}else{if(null!==f)return;p++,f=++u}}if(null!==f)for(s=u-f,u=7;0!=u&&0<s;)l=c[u],c[u--]=c[f+s-1],c[f+--s]=l;else if(8!=u)return;return c},Q={},K=h({},Q,{" ":1,'"':1,"<":1,">":1,"`":1}),Z=h({},K,{"#":1,"?":1,"{":1,"}":1}),ee=h({},Z,{"/":1,":":1,";":1,"=":1,"@":1,"[":1,"\\":1,"]":1,"^":1,"|":1}),te=function(e,t){var n=g(e,0);return 32<n&&n<127&&!A(t,e)?e:encodeURIComponent(e)},ne={ftp:21,file:null,gopher:70,http:80,https:443,ws:80,wss:443},re=function(e){return A(ne,e.scheme)},ie={},oe={},ae={},se={},le={},ce={},ue={},fe={},pe={},de={},he={},ge={},ye={},me={},be={},ve={},xe={},we={},je={},Ee={},Te={},Se=function(e,t){var n,r,i=d(this,Se,"URL"),o=1<arguments.length?t:void 0,a=String(e),s=P(i,{type:"URL"});if(void 0!==o)if(o instanceof Se)n=I(o);else if(r=f(n={},String(o)))throw TypeError(r);if(r=f(s,a,null,n))throw TypeError(r);var l=s.searchParams=new N,c=R(l);c.updateSearchParams(s.query),c.updateURL=function(){s.query=String(l)||null},p||(i.href=Oe.call(i),i.origin=ke.call(i),i.protocol=Ne.call(i),i.username=Re.call(i),i.password=Pe.call(i),i.host=Ie.call(i),i.hostname=_e.call(i),i.port=Me.call(i),i.pathname=Le.call(i),i.search=Ce.call(i),i.searchParams=De.call(i),i.hash=He.call(i))},Ae=Se.prototype,Oe=function(){var e=I(this),t=e.scheme,n=e.username,r=e.password,i=e.host,o=e.port,a=e.path,s=e.query,l=e.fragment,c=t+":";return null!==i?(c+="//",w(e)&&(c+=n+(r?":"+r:"")+"@"),c+=u(i),null!==o&&(c+=":"+o)):"file"==t&&(c+="//"),c+=e.cannotBeABaseURL?a[0]:a.length?"/"+a.join("/"):"",null!==s&&(c+="?"+s),null!==l&&(c+="#"+l),c},ke=function(){var e=I(this),t=e.scheme,n=e.port;if("blob"==t)try{return new URL(t.path[0]).origin}catch(e){return"null"}return"file"!=t&&re(e)?t+"://"+u(e.host)+(null!==n?":"+n:""):"null"},Ne=function(){return I(this).scheme+":"},Re=function(){return I(this).username},Pe=function(){return I(this).password},Ie=function(){var e=I(this),t=e.host,n=e.port;return null===t?"":null===n?u(t):u(t)+":"+n},_e=function(){var e=I(this).host;return null===e?"":u(e)},Me=function(){var e=I(this).port;return null===e?"":String(e)},Le=function(){var e=I(this),t=e.path;return e.cannotBeABaseURL?t[0]:t.length?"/"+t.join("/"):""},Ce=function(){var e=I(this).query;return e?"?"+e:""},De=function(){return I(this).searchParams},He=function(){var e=I(this).fragment;return e?"#"+e:""};if(p&&l(Ae,{href:r(Oe,function(e){var t=I(this),n=String(e),r=f(t,n);if(r)throw TypeError(r);R(t.searchParams).updateSearchParams(t.query)}),origin:r(ke),protocol:r(Ne,function(e){var t=I(this);f(t,String(e)+":",ie)}),username:r(Re,function(e){var t=I(this),n=O(String(e));if(!i(t)){t.username="";for(var r=0;r<n.length;r++)t.username+=te(n[r],ee)}}),password:r(Pe,function(e){var t=I(this),n=O(String(e));if(!i(t)){t.password="";for(var r=0;r<n.length;r++)t.password+=te(n[r],ee)}}),host:r(Ie,function(e){var t=I(this);t.cannotBeABaseURL||f(t,String(e),he)}),hostname:r(_e,function(e){var t=I(this);t.cannotBeABaseURL||f(t,String(e),ge)}),port:r(Me,function(e){var t=I(this);i(t)||(""==(e=String(e))?t.port=null:f(t,e,ye))}),pathname:r(Le,function(e){var t=I(this);t.cannotBeABaseURL||(t.path=[],f(t,e+"",xe))}),search:r(Ce,function(e){var t=I(this);""==(e=String(e))?t.query=null:("?"==e.charAt(0)&&(e=e.slice(1)),t.query="",f(t,e,Ee)),R(t.searchParams).updateSearchParams(t.query)}),searchParams:r(De),hash:r(He,function(e){var t=I(this);""!=(e=String(e))?("#"==e.charAt(0)&&(e=e.slice(1)),t.fragment="",f(t,e,Te)):t.fragment=null})}),c(Ae,"toJSON",function(){return Oe.call(this)},{enumerable:!0}),c(Ae,"toString",function(){return Oe.call(this)},{enumerable:!0}),k){var Fe=k.createObjectURL,Ue=k.revokeObjectURL;Fe&&c(Se,"createObjectURL",function(e){return Fe.apply(k,arguments)}),Ue&&c(Se,"revokeObjectURL",function(e){return Ue.apply(k,arguments)})}m(Se,"URL"),o({global:!0,forced:!a,sham:!p},{URL:Se})},{"../internals/an-instance":6,"../internals/array-from":13,"../internals/descriptors":39,"../internals/export":43,"../internals/global":56,"../internals/has":57,"../internals/internal-state":66,"../internals/native-url":84,"../internals/object-assign":89,"../internals/object-define-properties":91,"../internals/punycode-to-ascii":110,"../internals/redefine":112,"../internals/set-to-string-tag":120,"../internals/string-multibyte":125,"../modules/es.string.iterator":281,"../modules/web.url-search-params":356}],358:[function(e,t,n){"use strict";e("../internals/export")({target:"URL",proto:!0,enumerable:!0},{toJSON:function(){return URL.prototype.toString.call(this)}})},{"../internals/export":43}],359:[function(e,t,n){e("../es"),e("../web"),t.exports=e("../internals/path")},{"../es":1,"../internals/path":107,"../web":360}],360:[function(e,t,n){e("../modules/web.dom-collections.for-each"),e("../modules/web.dom-collections.iterator"),e("../modules/web.immediate"),e("../modules/web.queue-microtask"),e("../modules/web.timers"),e("../modules/web.url"),e("../modules/web.url.to-json"),e("../modules/web.url-search-params"),t.exports=e("../internals/path")},{"../internals/path":107,"../modules/web.dom-collections.for-each":351,"../modules/web.dom-collections.iterator":352,"../modules/web.immediate":353,"../modules/web.queue-microtask":354,"../modules/web.timers":355,"../modules/web.url":357,"../modules/web.url-search-params":356,"../modules/web.url.to-json":358}],361:[function(e,t,n){var r=function(o){"use strict";var l,e=Object.prototype,c=e.hasOwnProperty,t="function"==typeof Symbol?Symbol:{},i=t.iterator||"@@iterator",n=t.asyncIterator||"@@asyncIterator",r=t.toStringTag||"@@toStringTag";function a(e,t,n,r){var i=t&&t.prototype instanceof s?t:s,o=Object.create(i.prototype),a=new O(r||[]);return o._invoke=function(o,a,s){var l=f;return function(e,t){if(l===d)throw new Error("Generator is already running");if(l===h){if("throw"===e)throw t;return N()}for(s.method=e,s.arg=t;;){var n=s.delegate;if(n){var r=T(n,s);if(r){if(r===g)continue;return r}}if("next"===s.method)s.sent=s._sent=s.arg;else if("throw"===s.method){if(l===f)throw l=h,s.arg;s.dispatchException(s.arg)}else"return"===s.method&&s.abrupt("return",s.arg);l=d;var i=u(o,a,s);if("normal"===i.type){if(l=s.done?h:p,i.arg===g)continue;return{value:i.arg,done:s.done}}"throw"===i.type&&(l=h,s.method="throw",s.arg=i.arg)}}}(e,n,a),o}function u(e,t,n){try{return{type:"normal",arg:e.call(t,n)}}catch(e){return{type:"throw",arg:e}}}o.wrap=a;var f="suspendedStart",p="suspendedYield",d="executing",h="completed",g={};function s(){}function y(){}function m(){}var b={};b[i]=function(){return this};var v=Object.getPrototypeOf,x=v&&v(v(k([])));x&&x!==e&&c.call(x,i)&&(b=x);var w=m.prototype=s.prototype=Object.create(b);function j(e){["next","throw","return"].forEach(function(t){e[t]=function(e){return this._invoke(t,e)}})}function E(l){var t;this._invoke=function(n,r){function e(){return new Promise(function(e,t){!function t(e,n,r,i){var o=u(l[e],l,n);if("throw"!==o.type){var a=o.arg,s=a.value;return s&&"object"==typeof s&&c.call(s,"__await")?Promise.resolve(s.__await).then(function(e){t("next",e,r,i)},function(e){t("throw",e,r,i)}):Promise.resolve(s).then(function(e){a.value=e,r(a)},function(e){return t("throw",e,r,i)})}i(o.arg)}(n,r,e,t)})}return t=t?t.then(e,e):e()}}function T(e,t){var n=e.iterator[t.method];if(n===l){if(t.delegate=null,"throw"===t.method){if(e.iterator.return&&(t.method="return",t.arg=l,T(e,t),"throw"===t.method))return g;t.method="throw",t.arg=new TypeError("The iterator does not provide a 'throw' method")}return g}var r=u(n,e.iterator,t.arg);if("throw"===r.type)return t.method="throw",t.arg=r.arg,t.delegate=null,g;var i=r.arg;return i?i.done?(t[e.resultName]=i.value,t.next=e.nextLoc,"return"!==t.method&&(t.method="next",t.arg=l),t.delegate=null,g):i:(t.method="throw",t.arg=new TypeError("iterator result is not an object"),t.delegate=null,g)}function S(e){var t={tryLoc:e[0]};1 in e&&(t.catchLoc=e[1]),2 in e&&(t.finallyLoc=e[2],t.afterLoc=e[3]),this.tryEntries.push(t)}function A(e){var t=e.completion||{};t.type="normal",delete t.arg,e.completion=t}function O(e){this.tryEntries=[{tryLoc:"root"}],e.forEach(S,this),this.reset(!0)}function k(t){if(t){var e=t[i];if(e)return e.call(t);if("function"==typeof t.next)return t;if(!isNaN(t.length)){var n=-1,r=function e(){for(;++n<t.length;)if(c.call(t,n))return e.value=t[n],e.done=!1,e;return e.value=l,e.done=!0,e};return r.next=r}}return{next:N}}function N(){return{value:l,done:!0}}return y.prototype=w.constructor=m,m.constructor=y,m[r]=y.displayName="GeneratorFunction",o.isGeneratorFunction=function(e){var t="function"==typeof e&&e.constructor;return!!t&&(t===y||"GeneratorFunction"===(t.displayName||t.name))},o.mark=function(e){return Object.setPrototypeOf?Object.setPrototypeOf(e,m):(e.__proto__=m,r in e||(e[r]="GeneratorFunction")),e.prototype=Object.create(w),e},o.awrap=function(e){return{__await:e}},j(E.prototype),E.prototype[n]=function(){return this},o.AsyncIterator=E,o.async=function(e,t,n,r){var i=new E(a(e,t,n,r));return o.isGeneratorFunction(t)?i:i.next().then(function(e){return e.done?e.value:i.next()})},j(w),w[r]="Generator",w[i]=function(){return this},w.toString=function(){return"[object Generator]"},o.keys=function(n){var r=[];for(var e in n)r.push(e);return r.reverse(),function e(){for(;r.length;){var t=r.pop();if(t in n)return e.value=t,e.done=!1,e}return e.done=!0,e}},o.values=k,O.prototype={constructor:O,reset:function(e){if(this.prev=0,this.next=0,this.sent=this._sent=l,this.done=!1,this.delegate=null,this.method="next",this.arg=l,this.tryEntries.forEach(A),!e)for(var t in this)"t"===t.charAt(0)&&c.call(this,t)&&!isNaN(+t.slice(1))&&(this[t]=l)},stop:function(){this.done=!0;var e=this.tryEntries[0].completion;if("throw"===e.type)throw e.arg;return this.rval},dispatchException:function(n){if(this.done)throw n;var r=this;function e(e,t){return o.type="throw",o.arg=n,r.next=e,t&&(r.method="next",r.arg=l),!!t}for(var t=this.tryEntries.length-1;0<=t;--t){var i=this.tryEntries[t],o=i.completion;if("root"===i.tryLoc)return e("end");if(i.tryLoc<=this.prev){var a=c.call(i,"catchLoc"),s=c.call(i,"finallyLoc");if(a&&s){if(this.prev<i.catchLoc)return e(i.catchLoc,!0);if(this.prev<i.finallyLoc)return e(i.finallyLoc)}else if(a){if(this.prev<i.catchLoc)return e(i.catchLoc,!0)}else{if(!s)throw new Error("try statement without catch or finally");if(this.prev<i.finallyLoc)return e(i.finallyLoc)}}}},abrupt:function(e,t){for(var n=this.tryEntries.length-1;0<=n;--n){var r=this.tryEntries[n];if(r.tryLoc<=this.prev&&c.call(r,"finallyLoc")&&this.prev<r.finallyLoc){var i=r;break}}i&&("break"===e||"continue"===e)&&i.tryLoc<=t&&t<=i.finallyLoc&&(i=null);var o=i?i.completion:{};return o.type=e,o.arg=t,i?(this.method="next",this.next=i.finallyLoc,g):this.complete(o)},complete:function(e,t){if("throw"===e.type)throw e.arg;return"break"===e.type||"continue"===e.type?this.next=e.arg:"return"===e.type?(this.rval=this.arg=e.arg,this.method="return",this.next="end"):"normal"===e.type&&t&&(this.next=t),g},finish:function(e){for(var t=this.tryEntries.length-1;0<=t;--t){var n=this.tryEntries[t];if(n.finallyLoc===e)return this.complete(n.completion,n.afterLoc),A(n),g}},catch:function(e){for(var t=this.tryEntries.length-1;0<=t;--t){var n=this.tryEntries[t];if(n.tryLoc===e){var r=n.completion;if("throw"===r.type){var i=r.arg;A(n)}return i}}throw new Error("illegal catch attempt")},delegateYield:function(e,t,n){return this.delegate={iterator:k(e),resultName:t,nextLoc:n},"next"===this.method&&(this.arg=l),g}},o}("object"==typeof t?t.exports:{});try{regeneratorRuntime=r}catch(e){Function("r","regeneratorRuntime = r")(r)}},{}],362:[function(e,t,n){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.IGNORE_TAGS=n.LENGTH_ATTR=n.START_OFFSET_ATTR=n.TIMESTAMP_ATTR=n.DATA_ATTR=void 0;n.DATA_ATTR="data-highlighted";n.TIMESTAMP_ATTR="data-timestamp";n.START_OFFSET_ATTR="data-start-offset";n.LENGTH_ATTR="data-length";n.IGNORE_TAGS=["SCRIPT","STYLE","SELECT","OPTION","BUTTON","OBJECT","APPLET","VIDEO","AUDIO","CANVAS","EMBED","PARAM","METER","PROGRESS"]},{}],363:[function(i,e,t){(function(r){(function(){"use strict";i("core-js/stable"),i("regenerator-runtime/runtime");var e,t=(e=i("./text-highlighter"))&&e.__esModule?e:{default:e},n=i("./utils/highlights");i("./jquery-plugin"),r.TextHighlighter=t.default,r.findNodesAndOffsets=n.findNodesAndOffsets}).call(this)}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{"./jquery-plugin":366,"./text-highlighter":367,"./utils/highlights":371,"core-js/stable":359,"regenerator-runtime/runtime":361}],364:[function(e,t,n){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.default=void 0;var r,g=e("../utils/highlights"),u=e("../config"),y=(r=e("../utils/dom"))&&r.__esModule?r:{default:r};function i(t,e){var n=Object.keys(t);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(t);e&&(r=r.filter(function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable})),n.push.apply(n,r)}return n}function o(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function a(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}var s=function(){function n(e,t){!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,n),this.el=e,this.options=t,this.removedHighlights={}}return function(e,t,n){t&&a(e.prototype,t),n&&a(e,n)}(n,[{key:"doHighlight",value:function(e){var t,n,r=(0,y.default)(this.el).getRange();if(r&&!r.collapsed){var i=(0,g.extractRangeRelativeToRootElement)(r,this.el);if(i){var o=[];if((0,y.default)(this.el).turnOffEventHandlers(o),!0===this.options.onBeforeHighlight(r)){n=+new Date,(t=(0,g.createWrapper)(this.options,this.el.ownerDocument)).setAttribute(u.TIMESTAMP_ATTR,n);var a=(0,g.createDescriptors)({rootElement:this.el,range:i,wrapper:t,excludeNodeNames:this.options.excludeNodes,dataAttr:this.options.namespaceDataAttribute,excludeWhiteSpaceAndReturns:this.options.excludeWhiteSpaceAndReturns}),s=this.options.preprocessDescriptors(i,a,n),l=s.descriptors,c=s.meta;c[this.options.cancelProperty]||(this.deserializeHighlights(JSON.stringify(l)),this.options.onAfterHighlight(i,l,n,c))}e||(0,y.default)(this.el).removeAllRanges(),(0,y.default)(this.el).turnOnEventHandlers(o)}}}},{key:"normalizeHighlights",value:function(){(0,y.default)(this.el).normalizeElements(this.options.highlightedClass,this.options.namespaceDataAttribute)}},{key:"removeHighlights",value:function(e,n){var t=e||this.el,r=this.getHighlights({container:t,dataAttr:this.options.namespaceDataAttribute}),i=this;r.forEach(function(e){if(!n||n&&e.classList.contains(n)){var t=1<e.classList.length?e.classList[1]:null;t&&i.removedHighlights[t]?(0,y.default)(e).unwrap():!0===i.options.onRemoveHighlight(e)&&((0,y.default)(e).unwrap(),t&&(i.removedHighlights[t]=!0))}}),this.options.normalizeElements&&this.normalizeHighlights(r)}},{key:"getHighlights",value:function(e){var t=function(t){for(var e=1;e<arguments.length;e++){var n=null!=arguments[e]?arguments[e]:{};e%2?i(n,!0).forEach(function(e){o(t,e,n[e])}):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(n)):i(n).forEach(function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(n,e))})}return t}({container:this.el,dataAttr:e.dataAttr,timestampAttr:u.TIMESTAMP_ATTR},e);return(0,g.retrieveHighlights)(t)}},{key:"isHighlight",value:function(e,t){return(0,g.isElementHighlight)(e,t)}},{key:"serializeHighlights",value:function(t){var e=this.getHighlights({dataAttr:this.options.namespaceDataAttribute});if((0,g.sortByDepth)(e,!1),0===e.length)return[];var n=[];(0,y.default)(this.el).turnOffEventHandlers(n);var r=e.find(function(e){return e.classList.contains(t)});if(!r)return[];var i=r.getAttribute(u.LENGTH_ATTR),o=r.getAttribute(u.START_OFFSET_ATTR),a=r.cloneNode(!0);a.innerHTML="";var s=[a.outerHTML,(0,g.getHighlightedTextRelativeToRoot)({rootElement:this.el,startOffset:o,length:i,excludeTags:this.options.excludeNodes,excludeWhiteSpaceAndReturns:this.options.excludeWhiteSpaceAndReturns},this.el.ownerDocument),o,i];return(0,y.default)(this.el).turnOnEventHandlers(n),JSON.stringify([s])}},{key:"deserializeHighlights",value:function(e){var t,d=[],h=this;if(!e)return d;try{t=JSON.parse(e)}catch(e){throw"Can't parse JSON: "+e}var n=[];return(0,y.default)(this.el).turnOffEventHandlers(n),t.forEach(function(e){try{(0,g.validateIndependenciaDescriptors)(e)?function(e){var l,c,u={wrapper:e[0],text:e[1],offset:Number.parseInt(e[2]),length:Number.parseInt(e[3])},f=h.options.highlightWhiteSpaceChars,p=h.el;(0,g.findNodesAndOffsets)(u,p,h.options.excludeNodes,h.options.excludeWhiteSpaceAndReturns).nodesAndOffsets.forEach(function(e){var t=e.node,n=e.offset,r=e.length,i=h.options,o=i.priorities,a=i.namespaceDataAttribute,s=(0,g.findHigherPriorityHighlights)(p,t,o,a);(0<t.textContent.trim().replace(/(\r\n|\n|\r)/gm,"").length||f&&0<t.textContent.length)&&((l=t.splitText(n)).splitText(r),l.nextSibling&&!l.nextSibling.nodeValue&&(0,y.default)(l.nextSibling).remove(),l.previousSibling&&!l.previousSibling.nodeValue&&(0,y.default)(l.previousSibling).remove(),s.forEach(function(e){var t=e.cloneNode(!1);l=(0,y.default)(l).wrap(t)}),c=(0,y.default)(l).wrap((0,y.default)().fromHTML(u.wrapper,p.ownerDocument)[0]),d.push(c))})}(e):console.warn("Can't deserialize highlight descriptors. Cause: descriptors are not valid.")}catch(e){console&&console.warn&&console.warn("Can't deserialize highlight descriptor. Cause: "+e)}}),this.options.normalizeElements&&this.normalizeHighlights(),(0,y.default)(this.el).turnOnEventHandlers(n),d}},{key:"focusUsingId",value:function(e,t){var n=this.el.querySelectorAll(".".concat(e,"[").concat(this.options.namespaceDataAttribute,'="true"]')),r=[];if((0,y.default)(this.el).turnOffEventHandlers(r),0<n.length){var i=n[0],o=(0,g.findNodesAndOffsets)({offset:Number.parseInt(i.getAttribute(u.START_OFFSET_ATTR)),length:Number.parseInt(i.getAttribute(u.LENGTH_ATTR))},this.el,this.options.excludeNodes,this.options.excludeWhiteSpaceAndReturns).nodesAndOffsets,a=i.cloneNode(!0);a.innerHTML="",(0,g.focusHighlightNodes)(e,o,a,this.el,this.options.highlightedClass,this.options.normalizeElements,this.options.priorities,this.options.namespaceDataAttribute)}else t&&this.deserializeHighlights(t);(0,y.default)(this.el).turnOnEventHandlers(r)}},{key:"deselectUsingId",value:function(e,t){var n=this,r=this.el.querySelector(".".concat(e));if(r){var i=Number.parseInt(r.getAttribute(u.START_OFFSET_ATTR)),o=Number.parseInt(r.getAttribute(u.LENGTH_ATTR)),a=t.map(function(e){return{id:e.id,descriptor:JSON.parse(e.serialisedDescriptor)}}).filter(function(e){var t=e.descriptor[0],n=Number.parseInt(t[2]),r=Number.parseInt(t[3]);return i<=n&&n+r<=i+o});a.sort(function(e,t){var n=Number.parseInt(e.descriptor[0][3]);return Number.parseInt(t.descriptor[0][3])<n?-1:1}),a.forEach(function(e){n.focusUsingId(e.id,JSON.stringify(e.descriptor))})}}}]),n}();n.default=s},{"../config":362,"../utils/dom":369,"../utils/highlights":371}],365:[function(e,t,n){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.default=void 0;var p=e("../utils/highlights"),d=function(e){{if(e&&e.__esModule)return e;var t={};if(null!=e)for(var n in e)if(Object.prototype.hasOwnProperty.call(e,n)){var r=Object.defineProperty&&Object.getOwnPropertyDescriptor?Object.getOwnPropertyDescriptor(e,n):{};r.get||r.set?Object.defineProperty(t,n,r):t[n]=e[n]}return t.default=e,t}}(e("../utils/dom")),h=e("../config"),r=e("../utils/arrays");function i(t,e){var n=Object.keys(t);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(t);e&&(r=r.filter(function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable})),n.push.apply(n,r)}return n}function o(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function a(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}var s=function(){function n(e,t){!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,n),this.el=e,this.options=t}return function(e,t,n){t&&a(e.prototype,t),n&&a(e,n)}(n,[{key:"highlightRange",value:function(e,t){if(!e||e.collapsed)return[];for(var n,r,i,o=(0,p.refineRangeBoundaries)(e),a=o.startContainer,s=o.endContainer,l=o.goDeeper,c=!1,u=a,f=[];l&&u.nodeType===d.NODE_TYPE.TEXT_NODE&&(-1===h.IGNORE_TAGS.indexOf(u.parentNode.tagName)&&""!==u.nodeValue.trim()&&((r=t.cloneNode(!0)).setAttribute(h.DATA_ATTR,!0),i=u.parentNode,!(0,d.default)(this.el).contains(i)&&i!==this.el||(n=(0,d.default)(u).wrap(r),f.push(n))),l=!1),u!==s||s.hasChildNodes()&&l||(c=!0),u.tagName&&-1<h.IGNORE_TAGS.indexOf(u.tagName)&&(s.parentNode===u&&(c=!0),l=!1),l&&u.hasChildNodes()?u=u.firstChild:l=u.nextSibling?(u=u.nextSibling,!0):(u=u.parentNode,!1),!c;);return f}},{key:"normalizeHighlights",value:function(e){var t;return this.flattenNestedHighlights(e),this.mergeSiblingHighlights(e),t=e.filter(function(e){return e.parentElement?e:null}),(t=(0,r.unique)(t)).sort(function(e,t){return e.offsetTop-t.offsetTop||e.offsetLeft-t.offsetLeft}),t}},{key:"flattenNestedHighlights",value:function(c){var u=this;function e(){var l=!1;return c.forEach(function(e,t){var n=e.parentElement,r=n.previousSibling,i=n.nextSibling;if(u.isHighlight(n,h.DATA_ATTR))if((0,p.haveSameColor)(n,e))n.replaceChild(e.firstChild,e),c[t]=n,l=!0;else{if(e.nextSibling||(i?(0,d.default)(e).insertBefore(i):(0,d.default)(e).insertAfter(n),(0,d.default)(e).insertBefore(i||n),l=!0),e.previousSibling||(r?(0,d.default)(e).insertAfter(r):(0,d.default)(e).insertBefore(n),(0,d.default)(e).insertAfter(r||n),l=!0),e.previousSibling&&3==e.previousSibling.nodeType&&e.nextSibling&&3==e.nextSibling.nodeType){var o=u.el.ownerDocument.createElement("span");o.style.backgroundColor=n.style.backgroundColor,o.className=n.className;var a=n.attributes[h.TIMESTAMP_ATTR].nodeValue;o.setAttribute(h.TIMESTAMP_ATTR,a),o.setAttribute(h.DATA_ATTR,!0);var s=o.cloneNode(!0);(0,d.default)(e.previousSibling).wrap(o),(0,d.default)(e.nextSibling).wrap(s),Array.prototype.slice.call(n.childNodes).forEach(function(e){(0,d.default)(e).insertBefore(e.parentNode)}),l=!0}n.hasChildNodes()||(0,d.default)(n).remove()}}),l}for((0,p.sortByDepth)(c,!0);e(););}},{key:"mergeSiblingHighlights",value:function(e){var n=this;function r(e,t){return t&&t.nodeType===d.NODE_TYPE.ELEMENT_NODE&&(0,p.haveSameColor)(e,t)&&n.isHighlight(t,h.DATA_ATTR)}e.forEach(function(e){var t=e.previousSibling,n=e.nextSibling;r(e,t)&&((0,d.default)(e).prepend(t.childNodes),(0,d.default)(t).remove()),r(e,n)&&((0,d.default)(e).append(n.childNodes),(0,d.default)(n).remove()),(0,d.default)(e).normalizeTextNodes()})}},{key:"doHighlight",value:function(e){var t,n,r,i,o=(0,d.default)(this.el).getRange();o&&!o.collapsed&&(!0===this.options.onBeforeHighlight(o)&&(i=+new Date,(t=(0,p.createWrapper)(this.options,this.el.ownerDocument)).setAttribute(h.TIMESTAMP_ATTR,i),n=this.highlightRange(o,t),r=this.normalizeHighlights(n),this.options.onAfterHighlight(o,r,i)),e||(0,d.default)(this.el).removeAllRanges())}},{key:"removeHighlights",value:function(e){var t=e||this.el,n=this.getHighlights({container:t}),r=this;function i(e){(0,d.default)(e).unwrap().forEach(function(e){!function(e){var t=e.previousSibling,n=e.nextSibling;t&&t.nodeType===d.NODE_TYPE.TEXT_NODE&&(e.nodeValue=t.nodeValue+e.nodeValue,(0,d.default)(t).remove()),n&&n.nodeType===d.NODE_TYPE.TEXT_NODE&&(e.nodeValue=e.nodeValue+n.nodeValue,(0,d.default)(n).remove())}(e)})}(0,p.sortByDepth)(n,!0),n.forEach(function(e){!0===r.options.onRemoveHighlight(e)&&i(e)})}},{key:"getHighlights",value:function(e){var t=function(t){for(var e=1;e<arguments.length;e++){var n=null!=arguments[e]?arguments[e]:{};e%2?i(n,!0).forEach(function(e){o(t,e,n[e])}):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(n)):i(n).forEach(function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(n,e))})}return t}({container:this.el,dataAttr:h.DATA_ATTR,timestampAttr:h.TIMESTAMP_ATTR},e);return(0,p.retrieveHighlights)(t)}},{key:"isHighlight",value:function(e,t){return(0,p.isElementHighlight)(e,t)}},{key:"serializeHighlights",value:function(){var e=this.getHighlights(),o=this.el,a=[];return(0,p.sortByDepth)(e,!1),e.forEach(function(e){var t=0,n=e.textContent.length,r=function(e,t){for(var n,r=[];n=Array.prototype.slice.call(e.parentNode.childNodes),r.unshift(n.indexOf(e)),(e=e.parentNode)!==t||!e;);return r}(e,o),i=e.cloneNode(!0);i.innerHTML="",i=i.outerHTML,e.previousSibling&&e.previousSibling.nodeType===d.NODE_TYPE.TEXT_NODE&&(t=e.previousSibling.length),a.push([i,e.textContent,r.join(":"),t,n])}),JSON.stringify(a)}},{key:"deserializeHighlights",value:function(e){var t,s=[],l=this;if(!e)return s;try{t=JSON.parse(e)}catch(e){throw"Can't parse JSON: "+e}return t.forEach(function(e){try{!function(e){for(var t,n,r,i={wrapper:e[0],text:e[1],path:e[2].split(":"),offset:e[3],length:e[4]},o=i.path.pop(),a=l.el;r=i.path.shift();)a=a.childNodes[r];a.childNodes[o-1]&&a.childNodes[o-1].nodeType===d.NODE_TYPE.TEXT_NODE&&(o-=1),(t=(a=a.childNodes[o]).splitText(i.offset)).splitText(i.length),t.nextSibling&&!t.nextSibling.nodeValue&&(0,d.default)(t.nextSibling).remove(),t.previousSibling&&!t.previousSibling.nodeValue&&(0,d.default)(t.previousSibling).remove(),n=(0,d.default)(t).wrap((0,d.default)().fromHTML(i.wrapper,parentNode.ownerDocument)[0]),s.push(n)}(e)}catch(e){console&&console.warn&&console.warn("Can't deserialize highlight descriptor. Cause: "+e)}}),s}}]),n}();n.default=s},{"../config":362,"../utils/arrays":368,"../utils/dom":369,"../utils/highlights":371}],366:[function(e,t,n){"use strict";var r,i;"undefined"!=typeof jQuery&&(r=jQuery,i="textHighlighter",r.fn.textHighlighter=function(e){return this.each(function(){var t,n=this;r.data(n,i)||((t=new TextHighlighter(n,e)).destroy=function(e,t){return function(){t.call(this,e)}}(t.destroy,function(e){e.call(t),r(n).removeData(i)}),r.data(n,i,t))})},r.fn.getHighlighter=function(){return this.data(i)})},{}],367:[function(e,t,n){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.default=void 0;var s=c(e("./utils/dom")),i=e("./utils/events"),r=c(e("./highlighters/primitivo")),o=c(e("./highlighters/independencia")),a=e("./config"),l=e("./utils/highlights");function c(e){return e&&e.__esModule?e:{default:e}}function u(t,e){var n=Object.keys(t);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(t);e&&(r=r.filter(function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable})),n.push.apply(n,r)}return n}function f(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function p(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}function d(e,t,n){return t&&p(e.prototype,t),n&&p(e,n),e}var h={primitivo:r.default,"v1-2014":r.default,independencia:o.default,"v2-2019":o.default},g={"v1-2014":"Primitivo (v1-2014)",primitivo:"Primitivo (v1-2014)","v2-2019":"Independencia (v2-2019)",independencia:"Independencia (v2-2019)"},y=function(){function r(e){var t=1<arguments.length&&void 0!==arguments[1]?arguments[1]:{},n=!(2<arguments.length&&void 0!==arguments[2])||arguments[2];if(function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,r),!e)throw new Error("Missing anchor element");if(this.el=e,this.options=function(t){for(var e=1;e<arguments.length;e++){var n=null!=arguments[e]?arguments[e]:{};e%2?u(n,!0).forEach(function(e){f(t,e,n[e])}):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(n)):u(n).forEach(function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(n,e))})}return t}({color:"#ffff7b",highlightedClass:"highlighted",contextClass:"highlighter-context",version:"independencia",useDefaultEvents:!0,excludeNodes:a.IGNORE_TAGS,excludeWhiteSpaceAndReturns:!1,namespaceDataAttribute:a.DATA_ATTR,priorities:{},normalizeElements:!1,keepRange:!1,highlightWhiteSpaceChars:!1,cancelProperty:"cancel",onRemoveHighlight:function(){return!0},onBeforeHighlight:function(){return!0},preprocessDescriptors:function(e,t){return{descriptors:t,meta:{}}},onAfterHighlight:function(){}},t),this.highlightHandler=this.highlightHandler.bind(this),!h[this.options.version])throw new Error("Please provide a valid version of the text highlighting functionality");this.highlighter=new h[this.options.version](this.el,this.options),(0,s.default)(this.el).addClass(this.options.contextClass),n&&this.registerDefaultEvents()}return d(r,null,[{key:"createWrapper",value:function(e,t){var n=1<arguments.length&&void 0!==t?t:document;return(0,l.createWrapper)(e,n)}}]),d(r,[{key:"destroy",value:function(){this.options.useDefaultEvents&&(0,i.unbindEvents)(this.el,this),(0,s.default)(this.el).removeClass(this.options.contextClass)}},{key:"registerDefaultEvents",value:function(){this.options.useDefaultEvents&&(0,i.bindEvents)(this.el,this)}},{key:"highlightHandler",value:function(){this.doHighlight()}},{key:"doHighlight",value:function(){this.highlighter.doHighlight(this.options.keepRange)}},{key:"highlightRange",value:function(e,t){return this.highlighter.highlightRange(e,t)}},{key:"normalizeHighlights",value:function(e){return this.highlighter.normalizeHighlights(e)}},{key:"setColor",value:function(e){this.options.color=e}},{key:"getColor",value:function(){return this.options.color}},{key:"removeHighlights",value:function(e,t){this.highlighter.removeHighlights(e,t)}},{key:"getHighlights",value:function(e){return this.highlighter.getHighlights(e)}},{key:"isHighlight",value:function(e,t){var n=1<arguments.length&&void 0!==t?t:a.DATA_ATTR;return this.highlighter.isHighlight(e,n)}},{key:"serializeHighlights",value:function(e){return this.highlighter.serializeHighlights(e)}},{key:"deserializeHighlights",value:function(e){return this.highlighter.deserializeHighlights(e)}},{key:"find",value:function(e,t){var n=(0,s.default)(this.el).getWindow(),r=n.scrollX,i=n.scrollY,o=void 0===t||t;if((0,s.default)(this.el).removeAllRanges(),n.find)for(;n.find(e,o);)this.doHighlight(!0);else if(n.document.body.createTextRange){var a=n.document.body.createTextRange();for(a.moveToElementText(this.el);a.findText(e,1,o?4:0)&&((0,s.default)(this.el).contains(a.parentElement())||a.parentElement()===this.el);)a.select(),this.doHighlight(!0),a.collapse(!1)}(0,s.default)(this.el).removeAllRanges(),n.scrollTo(r,i)}},{key:"focusUsingId",value:function(e,t){this.highlighter.focusUsingId?this.highlighter.focusUsingId(e,t):console.warn("The ".concat(g[this.options.version]," version of the text highlighter does not support focusing highlights."))}},{key:"deselectUsingId",value:function(e,t){this.highlighter.deselectUsingId?this.highlighter.deselectUsingId(e,t):console.warn("The ".concat(g[this.options.version]," version of the text highlighter does not support deselecting highlights."))}}]),r}();n.default=y},{"./config":362,"./highlighters/independencia":364,"./highlighters/primitivo":365,"./utils/dom":369,"./utils/events":370,"./utils/highlights":371}],368:[function(e,t,n){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.unique=function(e){return e.filter(function(e,t,n){return n.indexOf(e)===t})},n.arrayToLower=function(e){return e.map(Function.prototype.call,String.prototype.toLowerCase)}},{}],369:[function(e,t,n){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.default=n.NODE_TYPE=void 0;var o=e("./highlights"),s=e("../config");function r(e){return function(e){if(Array.isArray(e)){for(var t=0,n=new Array(e.length);t<e.length;t++)n[t]=e[t];return n}}(e)||function(e){if(Symbol.iterator in Object(e)||"[object Arguments]"===Object.prototype.toString.call(e))return Array.from(e)}(e)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance")}()}var l={ELEMENT_NODE:1,TEXT_NODE:3,COMMENT_NODE:8};n.NODE_TYPE=l;function c(a){return{addClass:function(e){a.classList?a.classList.add(e):a.className+=" "+e},removeClass:function(e){a.classList?a.classList.remove(e):a.className=a.className.replace(new RegExp("(^|\\b)"+e+"(\\b|$)","gi")," ")},prepend:function(e){for(var t=Array.prototype.slice.call(e),n=t.length;n--;)a.insertBefore(t[n],a.firstChild)},append:function(e){for(var t=Array.prototype.slice.call(e),n=0,r=t.length;n<r;++n)a.appendChild(t[n])},insertAfter:function(e){return e.parentNode.insertBefore(a,e.nextSibling)},insertBefore:function(e){return e.parentNode.insertBefore(a,e)},remove:function(){a.parentNode.removeChild(a),a=null},contains:function(e){return a!==e&&a.contains(e)},wrap:function(e){return a.parentNode&&a.parentNode.insertBefore(e,a),e.appendChild(a),e},unwrap:function(){var t,e=Array.prototype.slice.call(a.childNodes);return e.forEach(function(e){t=e.parentNode,c(e).insertBefore(e.parentNode)}),t&&c(t).remove(),e},parents:function(){for(var e,t=[];e=a.parentNode;)t.push(e),a=e;return t},parentsUpTo:function(e){for(var t,n=[];(t=a.parentNode)&&t!==e;)n.push(t),a=t;return n},parentsWithoutDocument:function(){return this.parents().filter(function(e){return e!==a.ownerDocument})},nextClosestSibling:function(e){for(var t,n=a;t=n.nextSibling,n=n.parentNode,!t&&n.parentNode&&e.contains(n););return e.contains(n)||(t=null),t},previousClosestSibling:function(e){for(var t,n=a;t=n.previousSibling,n=n.parentNode,!t&&n.parentNode&&e.contains(n););return e.contains(n)||(t=null),t},normalizeTextNodes:function(){if(a){if(a.nodeType===l.TEXT_NODE)for(;a.nextSibling&&a.nextSibling.nodeType===l.TEXT_NODE;)a.nodeValue+=a.nextSibling.nodeValue,a.parentNode.removeChild(a.nextSibling);else c(a.firstChild).normalizeTextNodes();c(a.nextSibling).normalizeTextNodes()}},normalizeElements:function(e,t){var n=1<arguments.length&&void 0!==t?t:s.DATA_ATTR;if(a){if(a.nodeType!==l.TEXT_NODE)if((0,o.isElementHighlight)(a,n)){for(var r=a.className;r&&a.nextSibling&&a.nextSibling.nodeType!==l.TEXT_NODE&&a.nextSibling.className===r&&r!==e;)a.innerHTML+=a.nextSibling.innerHTML,a.parentNode.removeChild(a.nextSibling);c(a.firstChild).normalizeElements(e,n)}else{for(var i=a.id;i&&a.nextSibling&&a.nextSibling.nodeType!==l.TEXT_NODE&&a.nextSibling.id===i;)a.innerHTML+=a.nextSibling.innerHTML,a.parentNode.removeChild(a.nextSibling);c(a.firstChild).normalizeElements(e,n)}else c(a).normalizeTextNodes();c(a.nextSibling).normalizeElements(e,n)}},color:function(){return a.style.backgroundColor},fromHTML:function(e,t){var n=(1<arguments.length&&void 0!==t?t:document).createElement("div");return n.innerHTML=e,n.childNodes},getRange:function(){var e,t=c(a).getSelection();return 0<t.rangeCount&&(e=t.getRangeAt(0)),e},removeAllRanges:function(){c(a).getSelection().removeAllRanges()},getSelection:function(){return c(a).getWindow().getSelection()},getWindow:function(){return c(a).getDocument().defaultView},getDocument:function(){return a.ownerDocument||a},isAfter:function(e,t){for(var n=a.nextSibling,r=!1;n&&!r;)n===e?r=!0:n=n.nextSibling?n.nextSibling:a.parentNode.nextSibling;return r},textContentExcludingTags:function(e){if(a&&a.nodeType===l.COMMENT_NODE)return"";if(a&&a.nodeType!==l.TEXT_NODE){var n=a.cloneNode(!0);return[n.querySelectorAll("*")].filter(function(e){return e.nodeType===l.COMMENT_NODE}).forEach(function(e){e.remove()}),e.reduce(function(e,t){return[].concat(r(e),r(n.querySelectorAll(t)))},[]).forEach(function(e){e.remove()}),n.textContent}return a.textContent},getChildIndex:function(e){for(var t=a.firstChild,n=0;t&&e!==t;)t!==e&&(t=t.nextSibling,n++);return t?n:-1},turnOffEventHandlers:function(e){if(a){if(a.childNodes&&0<a.childNodes.length)c(a.firstChild).turnOffEventHandlers(e);else if(a.nodeType!==l.TEXT_NODE&&a.attributes){var t=c(a).turnOffEventHandlersForElement();t&&e.push(t)}c(a.nextSibling).turnOffEventHandlers(e)}},turnOnEventHandlers:function(e){if(a&&e&&0!==e.length){var i=Array.prototype.slice.call(a.querySelectorAll("[temp-id]"));e.forEach(function(e){var t=e.tempId,n=e.listOfAttributes,r=i.filter(function(e){return e.getAttribute("temp-id")===t})[0];r&&(c(r).addAttributes(n),r.removeAttribute("temp-id"))})}},turnOffEventHandlersForElement:function(){if(!a)return null;if(a.nodeType!==l.TEXT_NODE&&a.nodeType!==l.COMMENT_NODE&&a.childNodes&&0===a.childNodes.length){var e,t=[].slice.call(a.attributes),n=[];for(e=0;e<t.length;e++){var r=t[e].name;if(0===r.indexOf("on")){var i={};i.attribute=t[e].name,i.value=t[e].value,n.push(i),a.attributes.removeNamedItem(r)}}if(0<n.length){var o="hlt-".concat(Math.random().toString(36).substring(2,15)+Math.random().toString(36).substring(2,15));return a.setAttribute("temp-id",o),{tempId:o,listOfAttributes:n}}}},addAttributes:function(e){var t;if(a)for(t=0;t<e.length;t++){var n=e[t];a.setAttribute(n.attribute,n.value)}}}}n.default=c},{"../config":362,"./highlights":371}],370:[function(e,t,n){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.bindEvents=function(e,t){e.addEventListener("mouseup",t.highlightHandler),e.addEventListener("touchend",t.highlightHandler)},n.unbindEvents=function(e,t){e.removeEventListener("mouseup",t.highlightHandler),e.removeEventListener("touchend",t.highlightHandler)}},{}],371:[function(e,t,n){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.refineRangeBoundaries=function(e){var t=e.startContainer,n=e.endContainer,r=e.commonAncestorContainer,i=!0;if(0===e.endOffset){for(;!n.previousSibling&&n.parentNode!==r;)n=n.parentNode;n=n.previousSibling}else n.nodeType===S.NODE_TYPE.TEXT_NODE?e.endOffset<n.nodeValue.length&&n.splitText(e.endOffset):0<e.endOffset&&(n=n.childNodes.item(e.endOffset-1));t.nodeType===S.NODE_TYPE.TEXT_NODE?e.startOffset===t.nodeValue.length?i=!1:0<e.startOffset&&(t=t.splitText(e.startOffset),n===t.previousSibling&&(n=t)):t=e.startOffset<t.childNodes.length?t.childNodes.item(e.startOffset):t.nextSibling;return{startContainer:t,endContainer:n,goDeeper:i}},n.sortByDepth=function(e,n){e.sort(function(e,t){return(0,S.default)(n?t:e).parents().length-(0,S.default)(n?e:t).parents().length})},n.haveSameColor=function(e,t){return(0,S.default)(e).color()===(0,S.default)(t).color()},n.createWrapper=function(e){var t=(1<arguments.length&&void 0!==arguments[1]?arguments[1]:document).createElement("span");return t.style.backgroundColor=e.color,t.className=e.highlightedClass,t},n.findTextNodeAtLocation=function(e,t){var n=e;for(;n&&n.nodeType!==S.NODE_TYPE.TEXT_NODE;){if("start"===t)n=0<n.childNodes.length?n.childNodes[0]:n.nextSibling;else if("end"===t)if(0<n.childNodes.length){var r=n.childNodes.length-1;n=n.childNodes[r]}else n=n.previousSibling;else n=null;0}return n},n.findNodesAndOffsets=function(e,t){var n=2<arguments.length&&void 0!==arguments[2]?arguments[2]:A.IGNORE_TAGS,r=3<arguments.length&&void 0!==arguments[3]&&arguments[3],i=[],o=t,a=0,s=e.offset+e.length,l="";for(;o&&a<s;)if(n.includes(o.nodeName))o=(0,S.default)(o).nextClosestSibling(t);else{var c=(E=o,T=n,(0,S.default)(E).textContentExcludingTags((0,O.arrayToLower)(T))),u=r?k(o,t,c):"";o==t&&(l=r?u:c);var f=c.length,p=k(o,t,c).length,d=a+f,h=r?a+p:d;if(h>e.offset)if(0===o.childNodes.length){if(o.nodeType===S.NODE_TYPE.TEXT_NODE){var g=e.offset>a?e.offset-a:0,y=r&&0===i.length?N(g,c):g,m=Math.abs(y-g),b=c.substr(y),v=r?b.length-k(o,t,b).length:0,x=d-m-v,w=x<=s?f-g:s-a-g+v,j=r&&0===i.length?w-m:w;0<j&&i.push({node:o,offset:y,length:j,normalisedText:r?k(o,t,o.textContent):o.textContent}),a=x}o=(0,S.default)(o).nextClosestSibling(t)}else o=o.childNodes[0];else a=h,o=o!==t?o.nextSibling:null}var E,T;return{nodesAndOffsets:i,allText:l}},n.getElementOffset=g,n.findFirstNonSharedParent=c,n.nodesInBetween=function(e,t){if(e===t)return[];var n=u(e,t),r=n.foundEndNodeSibling,i=n.gatheredSiblings;if(r)return i;var o=c({childElement:e,otherElement:t});if(o){var a=u(o,t),s=a.foundEndNodeSibling,l=a.gatheredSiblings;if(s)return l}return[]},n.groupHighlights=o,n.retrieveHighlights=function(e){var t=(e=function(t){for(var e=1;e<arguments.length;e++){var n=null!=arguments[e]?arguments[e]:{};e%2?r(n,!0).forEach(function(e){i(t,e,n[e])}):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(n)):r(n).forEach(function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(n,e))})}return t}({andSelf:!0,grouped:!1},e)).container.querySelectorAll("["+e.dataAttr+"]"),n=Array.prototype.slice.call(t);!0===e.andSelf&&e.container.hasAttribute(e.dataAttr)&&n.push(e.container);e.grouped&&(n=o(n,e.timestampAttr));return n},n.isElementHighlight=f,n.addNodesToHighlightAfterElement=function(e){var t=e.element,n=e.elementAncestor,r=e.highlightWrapper,i=e.highlightedClass;n?n.classList.contains(i)?n.childNodes.forEach(function(e){n.appendChild(e)}):r.appendChild(n):r.appendChild(t)},n.getHighlightedTextForRange=y,n.getHighlightedTextRelativeToRoot=function(e){var t=e.rootElement,n=e.startOffset,r=e.length,i=e.excludeTags,o=void 0===i?A.IGNORE_TAGS:i,a=e.excludeWhiteSpaceAndReturns,s=void 0!==a&&a,l=1<arguments.length&&void 0!==arguments[1]?arguments[1]:document,c=(0,S.default)(t).textContentExcludingTags((0,O.arrayToLower)(o)),u=(s?d(c):c).substring(n,Number.parseInt(n)+Number.parseInt(r)),f=l.createTextNode(u),p=l.createElement("div");return p.appendChild(f),p.innerText},n.createDescriptors=function(e){var t=e.rootElement,n=e.range,r=e.wrapper,i=e.excludeNodeNames,o=void 0===i?A.IGNORE_TAGS:i,a=e.dataAttr,s=void 0===a?A.DATA_ATTR:a,l=e.excludeWhiteSpaceAndReturns,c=void 0!==l&&l,u=r.cloneNode(!0),f=c?N(n.startOffset,n.startContainer.textContent):n.startOffset,p=g(n.startContainer,t,o,c,f,!0),d=c?N(n.endOffset,n.endContainer.textContent):n.endOffset,h=(n.startContainer===n.endContainer?p+(d-f):g(n.endContainer,t,o,c,d,!1))-p;return u.setAttribute(s,!0),u.setAttribute(A.START_OFFSET_ATTR,p),u.setAttribute(A.LENGTH_ATTR,h),u.innerHTML="",[[u.outerHTML,y(n,o),p,h]]},n.findHigherPriorityHighlights=p,n.focusHighlightNodes=function(o,e,a,s,t,n,l){var c=7<arguments.length&&void 0!==arguments[7]?arguments[7]:A.DATA_ATTR;e.forEach(function(e){var n=e.node,t=p(s,n,l,c),r=function(e,t){var n=2<arguments.length&&void 0!==arguments[2]?arguments[2]:A.DATA_ATTR,r=3<arguments.length&&void 0!==arguments[3]?arguments[3]:null,i=!0,o=e.parentNode,a=0;for(;o&&o!==t&&i;)if(f(o,n)){var s=r&&!o.classList.contains(r);a+=1,s?i=!1:o=o.parentNode}else o=o.parentNode;return 0!==a&&i}(n,s,c,o);if(0===t.length&&!r){(0,S.default)(n).parentsUpTo(s).forEach(function(e){f(e,c)&&e.classList.contains(o)&&(e.childNodes.forEach(function(e){if(!e.contains(n)){var t=a.cloneNode(!0);(0,S.default)(e).wrap(t)}}),(0,S.default)(e).unwrap())});var i=n;0<e.offset&&(i=n.splitText(e.offset)),e.length<i.textContent.length&&i.splitText(e.length),(0,S.default)(i).wrap(a.cloneNode(!0))}}),n&&(0,S.default)(s).normalizeElements(t,c)},n.validateIndependenciaDescriptors=function(e){if(e&&4===e.length)return!0;return!1},n.extractRangeRelativeToRootElement=function(e,t){var n=(0,S.default)(t).contains(e.startContainer),r=(0,S.default)(t).contains(e.endContainer);if(!n&&!r)return null;if(n&&!r){var i=function(e){var t=e;for(;0<t.childNodes.length;)t=t.childNodes[t.childNodes.length-1];return t}(t),o=new t.ownerDocument.defaultView.Range;return o.setStart(e.startContainer,e.startOffset),o.setEnd(i,i.textContent.length-1),o}if(n||!r)return e;var a=function(e){var t=e;for(;0<t.childNodes.length;)t=t.childNodes[0];return t}(t),s=new t.ownerDocument.defaultView.Range;return s.setStart(a,0),s.setEnd(e.endContainer,e.endOffset),s};var S=function(e){{if(e&&e.__esModule)return e;var t={};if(null!=e)for(var n in e)if(Object.prototype.hasOwnProperty.call(e,n)){var r=Object.defineProperty&&Object.getOwnPropertyDescriptor?Object.getOwnPropertyDescriptor(e,n):{};r.get||r.set?Object.defineProperty(t,n,r):t[n]=e[n]}return t.default=e,t}}(e("./dom")),A=e("../config"),O=e("./arrays");function r(t,e){var n=Object.keys(t);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(t);e&&(r=r.filter(function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable})),n.push.apply(n,r)}return n}function i(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function d(e){return e.replace(/((\r\n|\n\r|\n|\r)\s*)/g,"")}function k(e,t,n){var r=(0,S.default)(e).previousClosestSibling(t);if(r){if(/((\r\n|\n\r|\n|\r)\s*)$/.test(r.textContent))return function(e){return e.replace(/(((\r\n|\n\r|\n|\r)\s*)|(^\s+))/g,"")}(n)}return d(n)}function N(e,t){var n=t.match(/^((\r\n|\n\r|\n|\r)\s*)/g);return n?e+n[0].length:e}function g(e,t){var n=2<arguments.length&&void 0!==arguments[2]?arguments[2]:A.IGNORE_TAGS,r=3<arguments.length&&void 0!==arguments[3]&&arguments[3],i=4<arguments.length&&void 0!==arguments[4]?arguments[4]:0,o=5<arguments.length&&void 0!==arguments[5]&&arguments[5],a=0,s=e;do{if(!n.includes(s.nodeName))a+=l(s.parentNode.childNodes,(0,S.default)(s.parentNode).getChildIndex(s),n,r);s=s.parentNode}while(s!==t||!s);return r&&o?a:a+i}function l(e,t,n,r){for(var i=3<arguments.length&&void 0!==r&&r,o=0,a=0;a<t;a++){var s=e[a],l=(0,S.default)(s).textContentExcludingTags((0,O.arrayToLower)(n));!n.includes(s.nodeName)&&l&&0<l.length&&(o+=i?d(l).length:l.length)}return o}function c(e){for(var t=e.childElement,n=e.otherElement,r=(0,S.default)(t).parentsWithoutDocument(),i=0,o=null,a=!1;!o&&!a&&i<r.length;){r[i].contains(n)&&(0<i?o=r[i-1]:a=!0),i++}return o}function u(e,t){for(var n=[],r=!1,i=e.nextSibling;i&&!r;)i===t||i.contains(t)?r=!0:(n.push(i),i=i.nextSibling);return{gatheredSiblings:n,foundEndNodeSibling:r}}function o(e,n){var r=[],i={},o=[];return e.forEach(function(e){var t=e.getAttribute(n);void 0===i[t]&&(i[t]=[],r.push(t)),i[t].push(e)}),r.forEach(function(e){var t=i[e];o.push({chunks:t,timestamp:e,toString:function(){return t.map(function(e){return e.textContent}).join("")}})}),o}function f(e,t){return e&&e.nodeType===S.NODE_TYPE.ELEMENT_NODE&&e.hasAttribute(t)}function y(e){var t=1<arguments.length&&void 0!==arguments[1]?arguments[1]:A.IGNORE_TAGS;return(0,S.default)(e.cloneContents()).textContentExcludingTags((0,O.arrayToLower)(t)).replace(/\s{2,}/g," ").replace("\r\n","").replace("\r","").replace("\n","")}function p(e,t,n,r){var i=(0,S.default)(t).parentsUpTo(e),o=n[r],a=[];return i.forEach(function(e){var t=function(t,e){return e.find(function(e){return!!t.getAttribute(e)})}(e,Object.keys(n));t&&n[t]>o&&a.push({element:e,namespacePriority:n[t]})}),a.sort(function(e,t){return t.namespacePriority-e.namespacePriority}),a.map(function(e){return e.element})}},{"../config":362,"./arrays":368,"./dom":369}]},{},[363]);;
/* nicescroll v3.7.4 InuYaksa - MIT - https://nicescroll.areaaperta.com */
!function(e){"function"==typeof define&&define.amd?define(["jquery"],e):"object"==typeof exports?module.exports=e(require("jquery")):e(jQuery)}(function(e){"use strict";var o=!1,t=!1,r=0,i=2e3,s=0,n=e,l=document,a=window,c=n(a),d=[],u=a.requestAnimationFrame||a.webkitRequestAnimationFrame||a.mozRequestAnimationFrame||!1,h=a.cancelAnimationFrame||a.webkitCancelAnimationFrame||a.mozCancelAnimationFrame||!1;if(u)a.cancelAnimationFrame||(h=function(e){});else{var p=0;u=function(e,o){var t=(new Date).getTime(),r=Math.max(0,16-(t-p)),i=a.setTimeout(function(){e(t+r)},r);return p=t+r,i},h=function(e){a.clearTimeout(e)}}var m=a.MutationObserver||a.WebKitMutationObserver||!1,f=Date.now||function(){return(new Date).getTime()},g={zindex:"auto",cursoropacitymin:0,cursoropacitymax:1,cursorcolor:"#424242",cursorwidth:"6px",cursorborder:"1px solid #fff",cursorborderradius:"5px",scrollspeed:40,mousescrollstep:27,touchbehavior:!1,emulatetouch:!1,hwacceleration:!0,usetransition:!0,boxzoom:!1,dblclickzoom:!0,gesturezoom:!0,grabcursorenabled:!0,autohidemode:!0,background:"",iframeautoresize:!0,cursorminheight:32,preservenativescrolling:!0,railoffset:!1,railhoffset:!1,bouncescroll:!0,spacebarenabled:!0,railpadding:{top:0,right:0,left:0,bottom:0},disableoutline:!0,horizrailenabled:!0,railalign:"right",railvalign:"bottom",enabletranslate3d:!0,enablemousewheel:!0,enablekeyboard:!0,smoothscroll:!0,sensitiverail:!0,enablemouselockapi:!0,cursorfixedheight:!1,directionlockdeadzone:6,hidecursordelay:400,nativeparentscrolling:!0,enablescrollonselection:!0,overflowx:!0,overflowy:!0,cursordragspeed:.3,rtlmode:"auto",cursordragontouch:!1,oneaxismousemode:"auto",scriptpath:function(){var e=l.currentScript||function(){var e=l.getElementsByTagName("script");return!!e.length&&e[e.length-1]}(),o=e?e.src.split("?")[0]:"";return o.split("/").length>0?o.split("/").slice(0,-1).join("/")+"/":""}(),preventmultitouchscrolling:!0,disablemutationobserver:!1,enableobserver:!0,scrollbarid:!1},v=!1,w=function(){if(v)return v;var e=l.createElement("DIV"),o=e.style,t=navigator.userAgent,r=navigator.platform,i={};return i.haspointerlock="pointerLockElement"in l||"webkitPointerLockElement"in l||"mozPointerLockElement"in l,i.isopera="opera"in a,i.isopera12=i.isopera&&"getUserMedia"in navigator,i.isoperamini="[object OperaMini]"===Object.prototype.toString.call(a.operamini),i.isie="all"in l&&"attachEvent"in e&&!i.isopera,i.isieold=i.isie&&!("msInterpolationMode"in o),i.isie7=i.isie&&!i.isieold&&(!("documentMode"in l)||7===l.documentMode),i.isie8=i.isie&&"documentMode"in l&&8===l.documentMode,i.isie9=i.isie&&"performance"in a&&9===l.documentMode,i.isie10=i.isie&&"performance"in a&&10===l.documentMode,i.isie11="msRequestFullscreen"in e&&l.documentMode>=11,i.ismsedge="msCredentials"in a,i.ismozilla="MozAppearance"in o,i.iswebkit=!i.ismsedge&&"WebkitAppearance"in o,i.ischrome=i.iswebkit&&"chrome"in a,i.ischrome38=i.ischrome&&"touchAction"in o,i.ischrome22=!i.ischrome38&&i.ischrome&&i.haspointerlock,i.ischrome26=!i.ischrome38&&i.ischrome&&"transition"in o,i.cantouch="ontouchstart"in l.documentElement||"ontouchstart"in a,i.hasw3ctouch=(a.PointerEvent||!1)&&(navigator.MaxTouchPoints>0||navigator.msMaxTouchPoints>0),i.hasmstouch=!i.hasw3ctouch&&(a.MSPointerEvent||!1),i.ismac=/^mac$/i.test(r),i.isios=i.cantouch&&/iphone|ipad|ipod/i.test(r),i.isios4=i.isios&&!("seal"in Object),i.isios7=i.isios&&"webkitHidden"in l,i.isios8=i.isios&&"hidden"in l,i.isios10=i.isios&&a.Proxy,i.isandroid=/android/i.test(t),i.haseventlistener="addEventListener"in e,i.trstyle=!1,i.hastransform=!1,i.hastranslate3d=!1,i.transitionstyle=!1,i.hastransition=!1,i.transitionend=!1,i.trstyle="transform",i.hastransform="transform"in o||function(){for(var e=["msTransform","webkitTransform","MozTransform","OTransform"],t=0,r=e.length;t<r;t++)if(void 0!==o[e[t]]){i.trstyle=e[t];break}i.hastransform=!!i.trstyle}(),i.hastransform&&(o[i.trstyle]="translate3d(1px,2px,3px)",i.hastranslate3d=/translate3d/.test(o[i.trstyle])),i.transitionstyle="transition",i.prefixstyle="",i.transitionend="transitionend",i.hastransition="transition"in o||function(){i.transitionend=!1;for(var e=["webkitTransition","msTransition","MozTransition","OTransition","OTransition","KhtmlTransition"],t=["-webkit-","-ms-","-moz-","-o-","-o","-khtml-"],r=["webkitTransitionEnd","msTransitionEnd","transitionend","otransitionend","oTransitionEnd","KhtmlTransitionEnd"],s=0,n=e.length;s<n;s++)if(e[s]in o){i.transitionstyle=e[s],i.prefixstyle=t[s],i.transitionend=r[s];break}i.ischrome26&&(i.prefixstyle=t[1]),i.hastransition=i.transitionstyle}(),i.cursorgrabvalue=function(){var e=["grab","-webkit-grab","-moz-grab"];(i.ischrome&&!i.ischrome38||i.isie)&&(e=[]);for(var t=0,r=e.length;t<r;t++){var s=e[t];if(o.cursor=s,o.cursor==s)return s}return"url(https://cdnjs.cloudflare.com/ajax/libs/slider-pro/1.3.0/css/images/openhand.cur),n-resize"}(),i.hasmousecapture="setCapture"in e,i.hasMutationObserver=!1!==m,e=null,v=i,i},b=function(e,p){function v(){var e=T.doc.css(N.trstyle);return!(!e||"matrix"!=e.substr(0,6))&&e.replace(/^.*\((.*)\)$/g,"$1").replace(/px/g,"").split(/, +/)}function b(){var e=T.win;if("zIndex"in e)return e.zIndex();for(;e.length>0;){if(9==e[0].nodeType)return!1;var o=e.css("zIndex");if(!isNaN(o)&&0!==o)return parseInt(o);e=e.parent()}return!1}function x(e,o,t){var r=e.css(o),i=parseFloat(r);if(isNaN(i)){var s=3==(i=I[r]||0)?t?T.win.outerHeight()-T.win.innerHeight():T.win.outerWidth()-T.win.innerWidth():1;return T.isie8&&i&&(i+=1),s?i:0}return i}function S(e,o,t,r){T._bind(e,o,function(r){var i={original:r=r||a.event,target:r.target||r.srcElement,type:"wheel",deltaMode:"MozMousePixelScroll"==r.type?0:1,deltaX:0,deltaZ:0,preventDefault:function(){return r.preventDefault?r.preventDefault():r.returnValue=!1,!1},stopImmediatePropagation:function(){r.stopImmediatePropagation?r.stopImmediatePropagation():r.cancelBubble=!0}};return"mousewheel"==o?(r.wheelDeltaX&&(i.deltaX=-.025*r.wheelDeltaX),r.wheelDeltaY&&(i.deltaY=-.025*r.wheelDeltaY),!i.deltaY&&!i.deltaX&&(i.deltaY=-.025*r.wheelDelta)):i.deltaY=r.detail,t.call(e,i)},r)}function z(e,o,t,r){T.scrollrunning||(T.newscrolly=T.getScrollTop(),T.newscrollx=T.getScrollLeft(),D=f());var i=f()-D;if(D=f(),i>350?A=1:A+=(2-A)/10,e=e*A|0,o=o*A|0,e){if(r)if(e<0){if(T.getScrollLeft()>=T.page.maxw)return!0}else if(T.getScrollLeft()<=0)return!0;var s=e>0?1:-1;X!==s&&(T.scrollmom&&T.scrollmom.stop(),T.newscrollx=T.getScrollLeft(),X=s),T.lastdeltax-=e}if(o){if(function(){var e=T.getScrollTop();if(o<0){if(e>=T.page.maxh)return!0}else if(e<=0)return!0}()){if(M.nativeparentscrolling&&t&&!T.ispage&&!T.zoomactive)return!0;var n=T.view.h>>1;T.newscrolly<-n?(T.newscrolly=-n,o=-1):T.newscrolly>T.page.maxh+n?(T.newscrolly=T.page.maxh+n,o=1):o=0}var l=o>0?1:-1;B!==l&&(T.scrollmom&&T.scrollmom.stop(),T.newscrolly=T.getScrollTop(),B=l),T.lastdeltay-=o}(o||e)&&T.synched("relativexy",function(){var e=T.lastdeltay+T.newscrolly;T.lastdeltay=0;var o=T.lastdeltax+T.newscrollx;T.lastdeltax=0,T.rail.drag||T.doScrollPos(o,e)})}function k(e,o,t){var r,i;return!(t||!q)||(0===e.deltaMode?(r=-e.deltaX*(M.mousescrollstep/54)|0,i=-e.deltaY*(M.mousescrollstep/54)|0):1===e.deltaMode&&(r=-e.deltaX*M.mousescrollstep*50/80|0,i=-e.deltaY*M.mousescrollstep*50/80|0),o&&M.oneaxismousemode&&0===r&&i&&(r=i,i=0,t&&(r<0?T.getScrollLeft()>=T.page.maxw:T.getScrollLeft()<=0)&&(i=r,r=0)),T.isrtlmode&&(r=-r),z(r,i,t,!0)?void(t&&(q=!0)):(q=!1,e.stopImmediatePropagation(),e.preventDefault()))}var T=this;this.version="3.7.4",this.name="nicescroll",this.me=p;var E=n("body"),M=this.opt={doc:E,win:!1};if(n.extend(M,g),M.snapbackspeed=80,e)for(var L in M)void 0!==e[L]&&(M[L]=e[L]);if(M.disablemutationobserver&&(m=!1),this.doc=M.doc,this.iddoc=this.doc&&this.doc[0]?this.doc[0].id||"":"",this.ispage=/^BODY|HTML/.test(M.win?M.win[0].nodeName:this.doc[0].nodeName),this.haswrapper=!1!==M.win,this.win=M.win||(this.ispage?c:this.doc),this.docscroll=this.ispage&&!this.haswrapper?c:this.win,this.body=E,this.viewport=!1,this.isfixed=!1,this.iframe=!1,this.isiframe="IFRAME"==this.doc[0].nodeName&&"IFRAME"==this.win[0].nodeName,this.istextarea="TEXTAREA"==this.win[0].nodeName,this.forcescreen=!1,this.canshowonmouseevent="scroll"!=M.autohidemode,this.onmousedown=!1,this.onmouseup=!1,this.onmousemove=!1,this.onmousewheel=!1,this.onkeypress=!1,this.ongesturezoom=!1,this.onclick=!1,this.onscrollstart=!1,this.onscrollend=!1,this.onscrollcancel=!1,this.onzoomin=!1,this.onzoomout=!1,this.view=!1,this.page=!1,this.scroll={x:0,y:0},this.scrollratio={x:0,y:0},this.cursorheight=20,this.scrollvaluemax=0,"auto"==M.rtlmode){var C=this.win[0]==a?this.body:this.win,P=C.css("writing-mode")||C.css("-webkit-writing-mode")||C.css("-ms-writing-mode")||C.css("-moz-writing-mode");"horizontal-tb"==P||"lr-tb"==P||""===P?(this.isrtlmode="rtl"==C.css("direction"),this.isvertical=!1):(this.isrtlmode="vertical-rl"==P||"tb"==P||"tb-rl"==P||"rl-tb"==P,this.isvertical="vertical-rl"==P||"tb"==P||"tb-rl"==P)}else this.isrtlmode=!0===M.rtlmode,this.isvertical=!1;if(this.scrollrunning=!1,this.scrollmom=!1,this.observer=!1,this.observerremover=!1,this.observerbody=!1,!1!==M.scrollbarid)this.id=M.scrollbarid;else do{this.id="ascrail"+i++}while(l.getElementById(this.id));this.rail=!1,this.cursor=!1,this.cursorfreezed=!1,this.selectiondrag=!1,this.zoom=!1,this.zoomactive=!1,this.hasfocus=!1,this.hasmousefocus=!1,this.visibility=!0,this.railslocked=!1,this.locked=!1,this.hidden=!1,this.cursoractive=!0,this.wheelprevented=!1,this.overflowx=M.overflowx,this.overflowy=M.overflowy,this.nativescrollingarea=!1,this.checkarea=0,this.events=[],this.saved={},this.delaylist={},this.synclist={},this.lastdeltax=0,this.lastdeltay=0,this.detected=w();var N=n.extend({},this.detected);this.canhwscroll=N.hastransform&&M.hwacceleration,this.ishwscroll=this.canhwscroll&&T.haswrapper,this.isrtlmode?this.isvertical?this.hasreversehr=!(N.iswebkit||N.isie||N.isie11):this.hasreversehr=!(N.iswebkit||N.isie&&!N.isie10&&!N.isie11):this.hasreversehr=!1,this.istouchcapable=!1,N.cantouch||!N.hasw3ctouch&&!N.hasmstouch?!N.cantouch||N.isios||N.isandroid||!N.iswebkit&&!N.ismozilla||(this.istouchcapable=!0):this.istouchcapable=!0,M.enablemouselockapi||(N.hasmousecapture=!1,N.haspointerlock=!1),this.debounced=function(e,o,t){T&&(T.delaylist[e]||!1||(T.delaylist[e]={h:u(function(){T.delaylist[e].fn.call(T),T.delaylist[e]=!1},t)},o.call(T)),T.delaylist[e].fn=o)},this.synched=function(e,o){T.synclist[e]?T.synclist[e]=o:(T.synclist[e]=o,u(function(){T&&(T.synclist[e]&&T.synclist[e].call(T),T.synclist[e]=null)}))},this.unsynched=function(e){T.synclist[e]&&(T.synclist[e]=!1)},this.css=function(e,o){for(var t in o)T.saved.css.push([e,t,e.css(t)]),e.css(t,o[t])},this.scrollTop=function(e){return void 0===e?T.getScrollTop():T.setScrollTop(e)},this.scrollLeft=function(e){return void 0===e?T.getScrollLeft():T.setScrollLeft(e)};var R=function(e,o,t,r,i,s,n){this.st=e,this.ed=o,this.spd=t,this.p1=r||0,this.p2=i||1,this.p3=s||0,this.p4=n||1,this.ts=f(),this.df=o-e};if(R.prototype={B2:function(e){return 3*(1-e)*(1-e)*e},B3:function(e){return 3*(1-e)*e*e},B4:function(e){return e*e*e},getPos:function(){return(f()-this.ts)/this.spd},getNow:function(){var e=(f()-this.ts)/this.spd,o=this.B2(e)+this.B3(e)+this.B4(e);return e>=1?this.ed:this.st+this.df*o|0},update:function(e,o){return this.st=this.getNow(),this.ed=e,this.spd=o,this.ts=f(),this.df=this.ed-this.st,this}},this.ishwscroll){this.doc.translate={x:0,y:0,tx:"0px",ty:"0px"},N.hastranslate3d&&N.isios&&this.doc.css("-webkit-backface-visibility","hidden"),this.getScrollTop=function(e){if(!e){var o=v();if(o)return 16==o.length?-o[13]:-o[5];if(T.timerscroll&&T.timerscroll.bz)return T.timerscroll.bz.getNow()}return T.doc.translate.y},this.getScrollLeft=function(e){if(!e){var o=v();if(o)return 16==o.length?-o[12]:-o[4];if(T.timerscroll&&T.timerscroll.bh)return T.timerscroll.bh.getNow()}return T.doc.translate.x},this.notifyScrollEvent=function(e){var o=l.createEvent("UIEvents");o.initUIEvent("scroll",!1,!1,a,1),o.niceevent=!0,e.dispatchEvent(o)};var _=this.isrtlmode?1:-1;N.hastranslate3d&&M.enabletranslate3d?(this.setScrollTop=function(e,o){T.doc.translate.y=e,T.doc.translate.ty=-1*e+"px",T.doc.css(N.trstyle,"translate3d("+T.doc.translate.tx+","+T.doc.translate.ty+",0)"),o||T.notifyScrollEvent(T.win[0])},this.setScrollLeft=function(e,o){T.doc.translate.x=e,T.doc.translate.tx=e*_+"px",T.doc.css(N.trstyle,"translate3d("+T.doc.translate.tx+","+T.doc.translate.ty+",0)"),o||T.notifyScrollEvent(T.win[0])}):(this.setScrollTop=function(e,o){T.doc.translate.y=e,T.doc.translate.ty=-1*e+"px",T.doc.css(N.trstyle,"translate("+T.doc.translate.tx+","+T.doc.translate.ty+")"),o||T.notifyScrollEvent(T.win[0])},this.setScrollLeft=function(e,o){T.doc.translate.x=e,T.doc.translate.tx=e*_+"px",T.doc.css(N.trstyle,"translate("+T.doc.translate.tx+","+T.doc.translate.ty+")"),o||T.notifyScrollEvent(T.win[0])})}else this.getScrollTop=function(){return T.docscroll.scrollTop()},this.setScrollTop=function(e){T.docscroll.scrollTop(e)},this.getScrollLeft=function(){return T.hasreversehr?T.detected.ismozilla?T.page.maxw-Math.abs(T.docscroll.scrollLeft()):T.page.maxw-T.docscroll.scrollLeft():T.docscroll.scrollLeft()},this.setScrollLeft=function(e){return setTimeout(function(){if(T)return T.hasreversehr&&(e=T.detected.ismozilla?-(T.page.maxw-e):T.page.maxw-e),T.docscroll.scrollLeft(e)},1)};this.getTarget=function(e){return!!e&&(e.target?e.target:!!e.srcElement&&e.srcElement)},this.hasParent=function(e,o){if(!e)return!1;for(var t=e.target||e.srcElement||e||!1;t&&t.id!=o;)t=t.parentNode||!1;return!1!==t};var I={thin:1,medium:3,thick:5};this.getDocumentScrollOffset=function(){return{top:a.pageYOffset||l.documentElement.scrollTop,left:a.pageXOffset||l.documentElement.scrollLeft}},this.getOffset=function(){if(T.isfixed){var e=T.win.offset(),o=T.getDocumentScrollOffset();return e.top-=o.top,e.left-=o.left,e}var t=T.win.offset();if(!T.viewport)return t;var r=T.viewport.offset();return{top:t.top-r.top,left:t.left-r.left}},this.updateScrollBar=function(e){var o,t;if(T.ishwscroll)T.rail.css({height:T.win.innerHeight()-(M.railpadding.top+M.railpadding.bottom)}),T.railh&&T.railh.css({width:T.win.innerWidth()-(M.railpadding.left+M.railpadding.right)});else{var r=T.getOffset();if(o={top:r.top,left:r.left-(M.railpadding.left+M.railpadding.right)},o.top+=x(T.win,"border-top-width",!0),o.left+=T.rail.align?T.win.outerWidth()-x(T.win,"border-right-width")-T.rail.width:x(T.win,"border-left-width"),(t=M.railoffset)&&(t.top&&(o.top+=t.top),t.left&&(o.left+=t.left)),T.railslocked||T.rail.css({top:o.top,left:o.left,height:(e?e.h:T.win.innerHeight())-(M.railpadding.top+M.railpadding.bottom)}),T.zoom&&T.zoom.css({top:o.top+1,left:1==T.rail.align?o.left-20:o.left+T.rail.width+4}),T.railh&&!T.railslocked){o={top:r.top,left:r.left},(t=M.railhoffset)&&(t.top&&(o.top+=t.top),t.left&&(o.left+=t.left));var i=T.railh.align?o.top+x(T.win,"border-top-width",!0)+T.win.innerHeight()-T.railh.height:o.top+x(T.win,"border-top-width",!0),s=o.left+x(T.win,"border-left-width");T.railh.css({top:i-(M.railpadding.top+M.railpadding.bottom),left:s,width:T.railh.width})}}},this.doRailClick=function(e,o,t){var r,i,s,n;T.railslocked||(T.cancelEvent(e),"pageY"in e||(e.pageX=e.clientX+l.documentElement.scrollLeft,e.pageY=e.clientY+l.documentElement.scrollTop),o?(r=t?T.doScrollLeft:T.doScrollTop,s=t?(e.pageX-T.railh.offset().left-T.cursorwidth/2)*T.scrollratio.x:(e.pageY-T.rail.offset().top-T.cursorheight/2)*T.scrollratio.y,T.unsynched("relativexy"),r(0|s)):(r=t?T.doScrollLeftBy:T.doScrollBy,s=t?T.scroll.x:T.scroll.y,n=t?e.pageX-T.railh.offset().left:e.pageY-T.rail.offset().top,i=t?T.view.w:T.view.h,r(s>=n?i:-i)))},T.newscrolly=T.newscrollx=0,T.hasanimationframe="requestAnimationFrame"in a,T.hascancelanimationframe="cancelAnimationFrame"in a,T.hasborderbox=!1,this.init=function(){if(T.saved.css=[],N.isoperamini)return!0;if(N.isandroid&&!("hidden"in l))return!0;M.emulatetouch=M.emulatetouch||M.touchbehavior,T.hasborderbox=a.getComputedStyle&&"border-box"===a.getComputedStyle(l.body)["box-sizing"];var e={"overflow-y":"hidden"};if((N.isie11||N.isie10)&&(e["-ms-overflow-style"]="none"),T.ishwscroll&&(this.doc.css(N.transitionstyle,N.prefixstyle+"transform 0ms ease-out"),N.transitionend&&T.bind(T.doc,N.transitionend,T.onScrollTransitionEnd,!1)),T.zindex="auto",T.ispage||"auto"!=M.zindex?T.zindex=M.zindex:T.zindex=b()||"auto",!T.ispage&&"auto"!=T.zindex&&T.zindex>s&&(s=T.zindex),T.isie&&0===T.zindex&&"auto"==M.zindex&&(T.zindex="auto"),!T.ispage||!N.isieold){var i=T.docscroll;T.ispage&&(i=T.haswrapper?T.win:T.doc),T.css(i,e),T.ispage&&(N.isie11||N.isie)&&T.css(n("html"),e),!N.isios||T.ispage||T.haswrapper||T.css(E,{"-webkit-overflow-scrolling":"touch"});var d=n(l.createElement("div"));d.css({position:"relative",top:0,float:"right",width:M.cursorwidth,height:0,"background-color":M.cursorcolor,border:M.cursorborder,"background-clip":"padding-box","-webkit-border-radius":M.cursorborderradius,"-moz-border-radius":M.cursorborderradius,"border-radius":M.cursorborderradius}),d.addClass("nicescroll-cursors"),T.cursor=d;var u=n(l.createElement("div"));u.attr("id",T.id),u.addClass("nicescroll-rails nicescroll-rails-vr");var h,p,f=["left","right","top","bottom"];for(var g in f)p=f[g],(h=M.railpadding[p]||0)&&u.css("padding-"+p,h+"px");u.append(d),u.width=Math.max(parseFloat(M.cursorwidth),d.outerWidth()),u.css({width:u.width+"px",zIndex:T.zindex,background:M.background,cursor:"default"}),u.visibility=!0,u.scrollable=!0,u.align="left"==M.railalign?0:1,T.rail=u,T.rail.drag=!1;var v=!1;!M.boxzoom||T.ispage||N.isieold||(v=l.createElement("div"),T.bind(v,"click",T.doZoom),T.bind(v,"mouseenter",function(){T.zoom.css("opacity",M.cursoropacitymax)}),T.bind(v,"mouseleave",function(){T.zoom.css("opacity",M.cursoropacitymin)}),T.zoom=n(v),T.zoom.css({cursor:"pointer",zIndex:T.zindex,backgroundImage:"url("+M.scriptpath+"zoomico.png)",height:18,width:18,backgroundPosition:"0 0"}),M.dblclickzoom&&T.bind(T.win,"dblclick",T.doZoom),N.cantouch&&M.gesturezoom&&(T.ongesturezoom=function(e){return e.scale>1.5&&T.doZoomIn(e),e.scale<.8&&T.doZoomOut(e),T.cancelEvent(e)},T.bind(T.win,"gestureend",T.ongesturezoom))),T.railh=!1;var w;if(M.horizrailenabled&&(T.css(i,{overflowX:"hidden"}),(d=n(l.createElement("div"))).css({position:"absolute",top:0,height:M.cursorwidth,width:0,backgroundColor:M.cursorcolor,border:M.cursorborder,backgroundClip:"padding-box","-webkit-border-radius":M.cursorborderradius,"-moz-border-radius":M.cursorborderradius,"border-radius":M.cursorborderradius}),N.isieold&&d.css("overflow","hidden"),d.addClass("nicescroll-cursors"),T.cursorh=d,(w=n(l.createElement("div"))).attr("id",T.id+"-hr"),w.addClass("nicescroll-rails nicescroll-rails-hr"),w.height=Math.max(parseFloat(M.cursorwidth),d.outerHeight()),w.css({height:w.height+"px",zIndex:T.zindex,background:M.background}),w.append(d),w.visibility=!0,w.scrollable=!0,w.align="top"==M.railvalign?0:1,T.railh=w,T.railh.drag=!1),T.ispage)u.css({position:"fixed",top:0,height:"100%"}),u.css(u.align?{right:0}:{left:0}),T.body.append(u),T.railh&&(w.css({position:"fixed",left:0,width:"100%"}),w.css(w.align?{bottom:0}:{top:0}),T.body.append(w));else{if(T.ishwscroll){"static"==T.win.css("position")&&T.css(T.win,{position:"relative"});var x="HTML"==T.win[0].nodeName?T.body:T.win;n(x).scrollTop(0).scrollLeft(0),T.zoom&&(T.zoom.css({position:"absolute",top:1,right:0,"margin-right":u.width+4}),x.append(T.zoom)),u.css({position:"absolute",top:0}),u.css(u.align?{right:0}:{left:0}),x.append(u),w&&(w.css({position:"absolute",left:0,bottom:0}),w.css(w.align?{bottom:0}:{top:0}),x.append(w))}else{T.isfixed="fixed"==T.win.css("position");var S=T.isfixed?"fixed":"absolute";T.isfixed||(T.viewport=T.getViewport(T.win[0])),T.viewport&&(T.body=T.viewport,/fixed|absolute/.test(T.viewport.css("position"))||T.css(T.viewport,{position:"relative"})),u.css({position:S}),T.zoom&&T.zoom.css({position:S}),T.updateScrollBar(),T.body.append(u),T.zoom&&T.body.append(T.zoom),T.railh&&(w.css({position:S}),T.body.append(w))}N.isios&&T.css(T.win,{"-webkit-tap-highlight-color":"rgba(0,0,0,0)","-webkit-touch-callout":"none"}),M.disableoutline&&(N.isie&&T.win.attr("hideFocus","true"),N.iswebkit&&T.win.css("outline","none"))}if(!1===M.autohidemode?(T.autohidedom=!1,T.rail.css({opacity:M.cursoropacitymax}),T.railh&&T.railh.css({opacity:M.cursoropacitymax})):!0===M.autohidemode||"leave"===M.autohidemode?(T.autohidedom=n().add(T.rail),N.isie8&&(T.autohidedom=T.autohidedom.add(T.cursor)),T.railh&&(T.autohidedom=T.autohidedom.add(T.railh)),T.railh&&N.isie8&&(T.autohidedom=T.autohidedom.add(T.cursorh))):"scroll"==M.autohidemode?(T.autohidedom=n().add(T.rail),T.railh&&(T.autohidedom=T.autohidedom.add(T.railh))):"cursor"==M.autohidemode?(T.autohidedom=n().add(T.cursor),T.railh&&(T.autohidedom=T.autohidedom.add(T.cursorh))):"hidden"==M.autohidemode&&(T.autohidedom=!1,T.hide(),T.railslocked=!1),N.cantouch||T.istouchcapable||M.emulatetouch||N.hasmstouch){T.scrollmom=new y(T);T.ontouchstart=function(e){if(T.locked)return!1;if(e.pointerType&&("mouse"===e.pointerType||e.pointerType===e.MSPOINTER_TYPE_MOUSE))return!1;if(T.hasmoving=!1,T.scrollmom.timer&&(T.triggerScrollEnd(),T.scrollmom.stop()),!T.railslocked){var o=T.getTarget(e);if(o&&/INPUT/i.test(o.nodeName)&&/range/i.test(o.type))return T.stopPropagation(e);var t="mousedown"===e.type;if(!("clientX"in e)&&"changedTouches"in e&&(e.clientX=e.changedTouches[0].clientX,e.clientY=e.changedTouches[0].clientY),T.forcescreen){var r=e;(e={original:e.original?e.original:e}).clientX=r.screenX,e.clientY=r.screenY}if(T.rail.drag={x:e.clientX,y:e.clientY,sx:T.scroll.x,sy:T.scroll.y,st:T.getScrollTop(),sl:T.getScrollLeft(),pt:2,dl:!1,tg:o},T.ispage||!M.directionlockdeadzone)T.rail.drag.dl="f";else{var i={w:c.width(),h:c.height()},s=T.getContentSize(),l=s.h-i.h,a=s.w-i.w;T.rail.scrollable&&!T.railh.scrollable?T.rail.drag.ck=l>0&&"v":!T.rail.scrollable&&T.railh.scrollable?T.rail.drag.ck=a>0&&"h":T.rail.drag.ck=!1}if(M.emulatetouch&&T.isiframe&&N.isie){var d=T.win.position();T.rail.drag.x+=d.left,T.rail.drag.y+=d.top}if(T.hasmoving=!1,T.lastmouseup=!1,T.scrollmom.reset(e.clientX,e.clientY),o&&t){if(!/INPUT|SELECT|BUTTON|TEXTAREA/i.test(o.nodeName))return N.hasmousecapture&&o.setCapture(),M.emulatetouch?(o.onclick&&!o._onclick&&(o._onclick=o.onclick,o.onclick=function(e){if(T.hasmoving)return!1;o._onclick.call(this,e)}),T.cancelEvent(e)):T.stopPropagation(e);/SUBMIT|CANCEL|BUTTON/i.test(n(o).attr("type"))&&(T.preventclick={tg:o,click:!1})}}},T.ontouchend=function(e){if(!T.rail.drag)return!0;if(2==T.rail.drag.pt){if(e.pointerType&&("mouse"===e.pointerType||e.pointerType===e.MSPOINTER_TYPE_MOUSE))return!1;T.rail.drag=!1;var o="mouseup"===e.type;if(T.hasmoving&&(T.scrollmom.doMomentum(),T.lastmouseup=!0,T.hideCursor(),N.hasmousecapture&&l.releaseCapture(),o))return T.cancelEvent(e)}else if(1==T.rail.drag.pt)return T.onmouseup(e)};var z=M.emulatetouch&&T.isiframe&&!N.hasmousecapture,k=.3*M.directionlockdeadzone|0;T.ontouchmove=function(e,o){if(!T.rail.drag)return!0;if(e.targetTouches&&M.preventmultitouchscrolling&&e.targetTouches.length>1)return!0;if(e.pointerType&&("mouse"===e.pointerType||e.pointerType===e.MSPOINTER_TYPE_MOUSE))return!0;if(2==T.rail.drag.pt){"changedTouches"in e&&(e.clientX=e.changedTouches[0].clientX,e.clientY=e.changedTouches[0].clientY);var t,r;if(r=t=0,z&&!o){var i=T.win.position();r=-i.left,t=-i.top}var s=e.clientY+t,n=s-T.rail.drag.y,a=e.clientX+r,c=a-T.rail.drag.x,d=T.rail.drag.st-n;if(T.ishwscroll&&M.bouncescroll)d<0?d=Math.round(d/2):d>T.page.maxh&&(d=T.page.maxh+Math.round((d-T.page.maxh)/2));else if(d<0?(d=0,s=0):d>T.page.maxh&&(d=T.page.maxh,s=0),0===s&&!T.hasmoving)return T.ispage||(T.rail.drag=!1),!0;var u=T.getScrollLeft();if(T.railh&&T.railh.scrollable&&(u=T.isrtlmode?c-T.rail.drag.sl:T.rail.drag.sl-c,T.ishwscroll&&M.bouncescroll?u<0?u=Math.round(u/2):u>T.page.maxw&&(u=T.page.maxw+Math.round((u-T.page.maxw)/2)):(u<0&&(u=0,a=0),u>T.page.maxw&&(u=T.page.maxw,a=0))),!T.hasmoving){if(T.rail.drag.y===e.clientY&&T.rail.drag.x===e.clientX)return T.cancelEvent(e);var h=Math.abs(n),p=Math.abs(c),m=M.directionlockdeadzone;if(T.rail.drag.ck?"v"==T.rail.drag.ck?p>m&&h<=k?T.rail.drag=!1:h>m&&(T.rail.drag.dl="v"):"h"==T.rail.drag.ck&&(h>m&&p<=k?T.rail.drag=!1:p>m&&(T.rail.drag.dl="h")):h>m&&p>m?T.rail.drag.dl="f":h>m?T.rail.drag.dl=p>k?"f":"v":p>m&&(T.rail.drag.dl=h>k?"f":"h"),!T.rail.drag.dl)return T.cancelEvent(e);T.triggerScrollStart(e.clientX,e.clientY,0,0,0),T.hasmoving=!0}return T.preventclick&&!T.preventclick.click&&(T.preventclick.click=T.preventclick.tg.onclick||!1,T.preventclick.tg.onclick=T.onpreventclick),T.rail.drag.dl&&("v"==T.rail.drag.dl?u=T.rail.drag.sl:"h"==T.rail.drag.dl&&(d=T.rail.drag.st)),T.synched("touchmove",function(){T.rail.drag&&2==T.rail.drag.pt&&(T.prepareTransition&&T.resetTransition(),T.rail.scrollable&&T.setScrollTop(d),T.scrollmom.update(a,s),T.railh&&T.railh.scrollable?(T.setScrollLeft(u),T.showCursor(d,u)):T.showCursor(d),N.isie10&&l.selection.clear())}),T.cancelEvent(e)}return 1==T.rail.drag.pt?T.onmousemove(e):void 0},T.ontouchstartCursor=function(e,o){if(!T.rail.drag||3==T.rail.drag.pt){if(T.locked)return T.cancelEvent(e);T.cancelScroll(),T.rail.drag={x:e.touches[0].clientX,y:e.touches[0].clientY,sx:T.scroll.x,sy:T.scroll.y,pt:3,hr:!!o};var t=T.getTarget(e);return!T.ispage&&N.hasmousecapture&&t.setCapture(),T.isiframe&&!N.hasmousecapture&&(T.saved.csspointerevents=T.doc.css("pointer-events"),T.css(T.doc,{"pointer-events":"none"})),T.cancelEvent(e)}},T.ontouchendCursor=function(e){if(T.rail.drag){if(N.hasmousecapture&&l.releaseCapture(),T.isiframe&&!N.hasmousecapture&&T.doc.css("pointer-events",T.saved.csspointerevents),3!=T.rail.drag.pt)return;return T.rail.drag=!1,T.cancelEvent(e)}},T.ontouchmoveCursor=function(e){if(T.rail.drag){if(3!=T.rail.drag.pt)return;if(T.cursorfreezed=!0,T.rail.drag.hr){T.scroll.x=T.rail.drag.sx+(e.touches[0].clientX-T.rail.drag.x),T.scroll.x<0&&(T.scroll.x=0);var o=T.scrollvaluemaxw;T.scroll.x>o&&(T.scroll.x=o)}else{T.scroll.y=T.rail.drag.sy+(e.touches[0].clientY-T.rail.drag.y),T.scroll.y<0&&(T.scroll.y=0);var t=T.scrollvaluemax;T.scroll.y>t&&(T.scroll.y=t)}return T.synched("touchmove",function(){T.rail.drag&&3==T.rail.drag.pt&&(T.showCursor(),T.rail.drag.hr?T.doScrollLeft(Math.round(T.scroll.x*T.scrollratio.x),M.cursordragspeed):T.doScrollTop(Math.round(T.scroll.y*T.scrollratio.y),M.cursordragspeed))}),T.cancelEvent(e)}}}if(T.onmousedown=function(e,o){if(!T.rail.drag||1==T.rail.drag.pt){if(T.railslocked)return T.cancelEvent(e);T.cancelScroll(),T.rail.drag={x:e.clientX,y:e.clientY,sx:T.scroll.x,sy:T.scroll.y,pt:1,hr:o||!1};var t=T.getTarget(e);return N.hasmousecapture&&t.setCapture(),T.isiframe&&!N.hasmousecapture&&(T.saved.csspointerevents=T.doc.css("pointer-events"),T.css(T.doc,{"pointer-events":"none"})),T.hasmoving=!1,T.cancelEvent(e)}},T.onmouseup=function(e){if(T.rail.drag)return 1!=T.rail.drag.pt||(N.hasmousecapture&&l.releaseCapture(),T.isiframe&&!N.hasmousecapture&&T.doc.css("pointer-events",T.saved.csspointerevents),T.rail.drag=!1,T.cursorfreezed=!1,T.hasmoving&&T.triggerScrollEnd(),T.cancelEvent(e))},T.onmousemove=function(e){if(T.rail.drag){if(1!==T.rail.drag.pt)return;if(N.ischrome&&0===e.which)return T.onmouseup(e);if(T.cursorfreezed=!0,T.hasmoving||T.triggerScrollStart(e.clientX,e.clientY,0,0,0),T.hasmoving=!0,T.rail.drag.hr){T.scroll.x=T.rail.drag.sx+(e.clientX-T.rail.drag.x),T.scroll.x<0&&(T.scroll.x=0);var o=T.scrollvaluemaxw;T.scroll.x>o&&(T.scroll.x=o)}else{T.scroll.y=T.rail.drag.sy+(e.clientY-T.rail.drag.y),T.scroll.y<0&&(T.scroll.y=0);var t=T.scrollvaluemax;T.scroll.y>t&&(T.scroll.y=t)}return T.synched("mousemove",function(){T.cursorfreezed&&(T.showCursor(),T.rail.drag.hr?T.scrollLeft(Math.round(T.scroll.x*T.scrollratio.x)):T.scrollTop(Math.round(T.scroll.y*T.scrollratio.y)))}),T.cancelEvent(e)}T.checkarea=0},N.cantouch||M.emulatetouch)T.onpreventclick=function(e){if(T.preventclick)return T.preventclick.tg.onclick=T.preventclick.click,T.preventclick=!1,T.cancelEvent(e)},T.onclick=!N.isios&&function(e){return!T.lastmouseup||(T.lastmouseup=!1,T.cancelEvent(e))},M.grabcursorenabled&&N.cursorgrabvalue&&(T.css(T.ispage?T.doc:T.win,{cursor:N.cursorgrabvalue}),T.css(T.rail,{cursor:N.cursorgrabvalue}));else{var L=function(e){if(T.selectiondrag){if(e){var o=T.win.outerHeight(),t=e.pageY-T.selectiondrag.top;t>0&&t<o&&(t=0),t>=o&&(t-=o),T.selectiondrag.df=t}if(0!==T.selectiondrag.df){var r=-2*T.selectiondrag.df/6|0;T.doScrollBy(r),T.debounced("doselectionscroll",function(){L()},50)}}};T.hasTextSelected="getSelection"in l?function(){return l.getSelection().rangeCount>0}:"selection"in l?function(){return"None"!=l.selection.type}:function(){return!1},T.onselectionstart=function(e){T.ispage||(T.selectiondrag=T.win.offset())},T.onselectionend=function(e){T.selectiondrag=!1},T.onselectiondrag=function(e){T.selectiondrag&&T.hasTextSelected()&&T.debounced("selectionscroll",function(){L(e)},250)}}if(N.hasw3ctouch?(T.css(T.ispage?n("html"):T.win,{"touch-action":"none"}),T.css(T.rail,{"touch-action":"none"}),T.css(T.cursor,{"touch-action":"none"}),T.bind(T.win,"pointerdown",T.ontouchstart),T.bind(l,"pointerup",T.ontouchend),T.delegate(l,"pointermove",T.ontouchmove)):N.hasmstouch?(T.css(T.ispage?n("html"):T.win,{"-ms-touch-action":"none"}),T.css(T.rail,{"-ms-touch-action":"none"}),T.css(T.cursor,{"-ms-touch-action":"none"}),T.bind(T.win,"MSPointerDown",T.ontouchstart),T.bind(l,"MSPointerUp",T.ontouchend),T.delegate(l,"MSPointerMove",T.ontouchmove),T.bind(T.cursor,"MSGestureHold",function(e){e.preventDefault()}),T.bind(T.cursor,"contextmenu",function(e){e.preventDefault()})):N.cantouch&&(T.bind(T.win,"touchstart",T.ontouchstart,!1,!0),T.bind(l,"touchend",T.ontouchend,!1,!0),T.bind(l,"touchcancel",T.ontouchend,!1,!0),T.delegate(l,"touchmove",T.ontouchmove,!1,!0)),M.emulatetouch&&(T.bind(T.win,"mousedown",T.ontouchstart,!1,!0),T.bind(l,"mouseup",T.ontouchend,!1,!0),T.bind(l,"mousemove",T.ontouchmove,!1,!0)),(M.cursordragontouch||!N.cantouch&&!M.emulatetouch)&&(T.rail.css({cursor:"default"}),T.railh&&T.railh.css({cursor:"default"}),T.jqbind(T.rail,"mouseenter",function(){if(!T.ispage&&!T.win.is(":visible"))return!1;T.canshowonmouseevent&&T.showCursor(),T.rail.active=!0}),T.jqbind(T.rail,"mouseleave",function(){T.rail.active=!1,T.rail.drag||T.hideCursor()}),M.sensitiverail&&(T.bind(T.rail,"click",function(e){T.doRailClick(e,!1,!1)}),T.bind(T.rail,"dblclick",function(e){T.doRailClick(e,!0,!1)}),T.bind(T.cursor,"click",function(e){T.cancelEvent(e)}),T.bind(T.cursor,"dblclick",function(e){T.cancelEvent(e)})),T.railh&&(T.jqbind(T.railh,"mouseenter",function(){if(!T.ispage&&!T.win.is(":visible"))return!1;T.canshowonmouseevent&&T.showCursor(),T.rail.active=!0}),T.jqbind(T.railh,"mouseleave",function(){T.rail.active=!1,T.rail.drag||T.hideCursor()}),M.sensitiverail&&(T.bind(T.railh,"click",function(e){T.doRailClick(e,!1,!0)}),T.bind(T.railh,"dblclick",function(e){T.doRailClick(e,!0,!0)}),T.bind(T.cursorh,"click",function(e){T.cancelEvent(e)}),T.bind(T.cursorh,"dblclick",function(e){T.cancelEvent(e)})))),M.cursordragontouch&&(this.istouchcapable||N.cantouch)&&(T.bind(T.cursor,"touchstart",T.ontouchstartCursor),T.bind(T.cursor,"touchmove",T.ontouchmoveCursor),T.bind(T.cursor,"touchend",T.ontouchendCursor),T.cursorh&&T.bind(T.cursorh,"touchstart",function(e){T.ontouchstartCursor(e,!0)}),T.cursorh&&T.bind(T.cursorh,"touchmove",T.ontouchmoveCursor),T.cursorh&&T.bind(T.cursorh,"touchend",T.ontouchendCursor)),N.cantouch||M.emulatetouch?(T.bind(N.hasmousecapture?T.win:l,"mouseup",T.ontouchend),T.onclick&&T.bind(l,"click",T.onclick),M.cursordragontouch?(T.bind(T.cursor,"mousedown",T.onmousedown),T.bind(T.cursor,"mouseup",T.onmouseup),T.cursorh&&T.bind(T.cursorh,"mousedown",function(e){T.onmousedown(e,!0)}),T.cursorh&&T.bind(T.cursorh,"mouseup",T.onmouseup)):(T.bind(T.rail,"mousedown",function(e){e.preventDefault()}),T.railh&&T.bind(T.railh,"mousedown",function(e){e.preventDefault()}))):(T.bind(N.hasmousecapture?T.win:l,"mouseup",T.onmouseup),T.bind(l,"mousemove",T.onmousemove),T.onclick&&T.bind(l,"click",T.onclick),T.bind(T.cursor,"mousedown",T.onmousedown),T.bind(T.cursor,"mouseup",T.onmouseup),T.railh&&(T.bind(T.cursorh,"mousedown",function(e){T.onmousedown(e,!0)}),T.bind(T.cursorh,"mouseup",T.onmouseup)),!T.ispage&&M.enablescrollonselection&&(T.bind(T.win[0],"mousedown",T.onselectionstart),T.bind(l,"mouseup",T.onselectionend),T.bind(T.cursor,"mouseup",T.onselectionend),T.cursorh&&T.bind(T.cursorh,"mouseup",T.onselectionend),T.bind(l,"mousemove",T.onselectiondrag)),T.zoom&&(T.jqbind(T.zoom,"mouseenter",function(){T.canshowonmouseevent&&T.showCursor(),T.rail.active=!0}),T.jqbind(T.zoom,"mouseleave",function(){T.rail.active=!1,T.rail.drag||T.hideCursor()}))),M.enablemousewheel&&(T.isiframe||T.mousewheel(N.isie&&T.ispage?l:T.win,T.onmousewheel),T.mousewheel(T.rail,T.onmousewheel),T.railh&&T.mousewheel(T.railh,T.onmousewheelhr)),T.ispage||N.cantouch||/HTML|^BODY/.test(T.win[0].nodeName)||(T.win.attr("tabindex")||T.win.attr({tabindex:++r}),T.bind(T.win,"focus",function(e){o=T.getTarget(e).id||T.getTarget(e)||!1,T.hasfocus=!0,T.canshowonmouseevent&&T.noticeCursor()}),T.bind(T.win,"blur",function(e){o=!1,T.hasfocus=!1}),T.bind(T.win,"mouseenter",function(e){t=T.getTarget(e).id||T.getTarget(e)||!1,T.hasmousefocus=!0,T.canshowonmouseevent&&T.noticeCursor()}),T.bind(T.win,"mouseleave",function(e){t=!1,T.hasmousefocus=!1,T.rail.drag||T.hideCursor()})),T.onkeypress=function(e){if(T.railslocked&&0===T.page.maxh)return!0;e=e||a.event;var r=T.getTarget(e);if(r&&/INPUT|TEXTAREA|SELECT|OPTION/.test(r.nodeName)&&(!(r.getAttribute("type")||r.type||!1)||!/submit|button|cancel/i.tp))return!0;if(n(r).attr("contenteditable"))return!0;if(T.hasfocus||T.hasmousefocus&&!o||T.ispage&&!o&&!t){var i=e.keyCode;if(T.railslocked&&27!=i)return T.cancelEvent(e);var s=e.ctrlKey||!1,l=e.shiftKey||!1,c=!1;switch(i){case 38:case 63233:T.doScrollBy(72),c=!0;break;case 40:case 63235:T.doScrollBy(-72),c=!0;break;case 37:case 63232:T.railh&&(s?T.doScrollLeft(0):T.doScrollLeftBy(72),c=!0);break;case 39:case 63234:T.railh&&(s?T.doScrollLeft(T.page.maxw):T.doScrollLeftBy(-72),c=!0);break;case 33:case 63276:T.doScrollBy(T.view.h),c=!0;break;case 34:case 63277:T.doScrollBy(-T.view.h),c=!0;break;case 36:case 63273:T.railh&&s?T.doScrollPos(0,0):T.doScrollTo(0),c=!0;break;case 35:case 63275:T.railh&&s?T.doScrollPos(T.page.maxw,T.page.maxh):T.doScrollTo(T.page.maxh),c=!0;break;case 32:M.spacebarenabled&&(l?T.doScrollBy(T.view.h):T.doScrollBy(-T.view.h),c=!0);break;case 27:T.zoomactive&&(T.doZoom(),c=!0)}if(c)return T.cancelEvent(e)}},M.enablekeyboard&&T.bind(l,N.isopera&&!N.isopera12?"keypress":"keydown",T.onkeypress),T.bind(l,"keydown",function(e){(e.ctrlKey||!1)&&(T.wheelprevented=!0)}),T.bind(l,"keyup",function(e){e.ctrlKey||!1||(T.wheelprevented=!1)}),T.bind(a,"blur",function(e){T.wheelprevented=!1}),T.bind(a,"resize",T.onscreenresize),T.bind(a,"orientationchange",T.onscreenresize),T.bind(a,"load",T.lazyResize),N.ischrome&&!T.ispage&&!T.haswrapper){var C=T.win.attr("style"),P=parseFloat(T.win.css("width"))+1;T.win.css("width",P),T.synched("chromefix",function(){T.win.attr("style",C)})}T.onAttributeChange=function(e){T.lazyResize(T.isieold?250:30)},M.enableobserver&&(T.isie11||!1===m||(T.observerbody=new m(function(e){if(e.forEach(function(e){if("attributes"==e.type)return E.hasClass("modal-open")&&E.hasClass("modal-dialog")&&!n.contains(n(".modal-dialog")[0],T.doc[0])?T.hide():T.show()}),T.me.clientWidth!=T.page.width||T.me.clientHeight!=T.page.height)return T.lazyResize(30)}),T.observerbody.observe(l.body,{childList:!0,subtree:!0,characterData:!1,attributes:!0,attributeFilter:["class"]})),T.ispage||T.haswrapper||(!1!==m?(T.observer=new m(function(e){e.forEach(T.onAttributeChange)}),T.observer.observe(T.win[0],{childList:!0,characterData:!1,attributes:!0,subtree:!1}),T.observerremover=new m(function(e){e.forEach(function(e){if(e.removedNodes.length>0)for(var o in e.removedNodes)if(T&&e.removedNodes[o]==T.win[0])return T.remove()})}),T.observerremover.observe(T.win[0].parentNode,{childList:!0,characterData:!1,attributes:!1,subtree:!1})):(T.bind(T.win,N.isie&&!N.isie9?"propertychange":"DOMAttrModified",T.onAttributeChange),N.isie9&&T.win[0].attachEvent("onpropertychange",T.onAttributeChange),T.bind(T.win,"DOMNodeRemoved",function(e){e.target==T.win[0]&&T.remove()})))),!T.ispage&&M.boxzoom&&T.bind(a,"resize",T.resizeZoom),T.istextarea&&(T.bind(T.win,"keydown",T.lazyResize),T.bind(T.win,"mouseup",T.lazyResize)),T.lazyResize(30)}if("IFRAME"==this.doc[0].nodeName){var R=function(){T.iframexd=!1;var o;try{(o="contentDocument"in this?this.contentDocument:this.contentWindow._doc).domain}catch(e){T.iframexd=!0,o=!1}if(T.iframexd)return"console"in a&&console.log("NiceScroll error: policy restriced iframe"),!0;if(T.forcescreen=!0,T.isiframe&&(T.iframe={doc:n(o),html:T.doc.contents().find("html")[0],body:T.doc.contents().find("body")[0]},T.getContentSize=function(){return{w:Math.max(T.iframe.html.scrollWidth,T.iframe.body.scrollWidth),h:Math.max(T.iframe.html.scrollHeight,T.iframe.body.scrollHeight)}},T.docscroll=n(T.iframe.body)),!N.isios&&M.iframeautoresize&&!T.isiframe){T.win.scrollTop(0),T.doc.height("");var t=Math.max(o.getElementsByTagName("html")[0].scrollHeight,o.body.scrollHeight);T.doc.height(t)}T.lazyResize(30),T.css(n(T.iframe.body),e),N.isios&&T.haswrapper&&T.css(n(o.body),{"-webkit-transform":"translate3d(0,0,0)"}),"contentWindow"in this?T.bind(this.contentWindow,"scroll",T.onscroll):T.bind(o,"scroll",T.onscroll),M.enablemousewheel&&T.mousewheel(o,T.onmousewheel),M.enablekeyboard&&T.bind(o,N.isopera?"keypress":"keydown",T.onkeypress),N.cantouch?(T.bind(o,"touchstart",T.ontouchstart),T.bind(o,"touchmove",T.ontouchmove)):M.emulatetouch&&(T.bind(o,"mousedown",T.ontouchstart),T.bind(o,"mousemove",function(e){return T.ontouchmove(e,!0)}),M.grabcursorenabled&&N.cursorgrabvalue&&T.css(n(o.body),{cursor:N.cursorgrabvalue})),T.bind(o,"mouseup",T.ontouchend),T.zoom&&(M.dblclickzoom&&T.bind(o,"dblclick",T.doZoom),T.ongesturezoom&&T.bind(o,"gestureend",T.ongesturezoom))};this.doc[0].readyState&&"complete"===this.doc[0].readyState&&setTimeout(function(){R.call(T.doc[0],!1)},500),T.bind(this.doc,"load",R)}},this.showCursor=function(e,o){if(T.cursortimeout&&(clearTimeout(T.cursortimeout),T.cursortimeout=0),T.rail){if(T.autohidedom&&(T.autohidedom.stop().css({opacity:M.cursoropacitymax}),T.cursoractive=!0),T.rail.drag&&1==T.rail.drag.pt||(void 0!==e&&!1!==e&&(T.scroll.y=e/T.scrollratio.y|0),void 0!==o&&(T.scroll.x=o/T.scrollratio.x|0)),T.cursor.css({height:T.cursorheight,top:T.scroll.y}),T.cursorh){var t=T.hasreversehr?T.scrollvaluemaxw-T.scroll.x:T.scroll.x;T.cursorh.css({width:T.cursorwidth,left:!T.rail.align&&T.rail.visibility?t+T.rail.width:t}),T.cursoractive=!0}T.zoom&&T.zoom.stop().css({opacity:M.cursoropacitymax})}},this.hideCursor=function(e){T.cursortimeout||T.rail&&T.autohidedom&&(T.hasmousefocus&&"leave"===M.autohidemode||(T.cursortimeout=setTimeout(function(){T.rail.active&&T.showonmouseevent||(T.autohidedom.stop().animate({opacity:M.cursoropacitymin}),T.zoom&&T.zoom.stop().animate({opacity:M.cursoropacitymin}),T.cursoractive=!1),T.cursortimeout=0},e||M.hidecursordelay)))},this.noticeCursor=function(e,o,t){T.showCursor(o,t),T.rail.active||T.hideCursor(e)},this.getContentSize=T.ispage?function(){return{w:Math.max(l.body.scrollWidth,l.documentElement.scrollWidth),h:Math.max(l.body.scrollHeight,l.documentElement.scrollHeight)}}:T.haswrapper?function(){return{w:T.doc[0].offsetWidth,h:T.doc[0].offsetHeight}}:function(){return{w:T.docscroll[0].scrollWidth,h:T.docscroll[0].scrollHeight}},this.onResize=function(e,o){if(!T||!T.win)return!1;var t=T.page.maxh,r=T.page.maxw,i=T.view.h,s=T.view.w;if(T.view={w:T.ispage?T.win.width():T.win[0].clientWidth,h:T.ispage?T.win.height():T.win[0].clientHeight},T.page=o||T.getContentSize(),T.page.maxh=Math.max(0,T.page.h-T.view.h),T.page.maxw=Math.max(0,T.page.w-T.view.w),T.page.maxh==t&&T.page.maxw==r&&T.view.w==s&&T.view.h==i){if(T.ispage)return T;var n=T.win.offset();if(T.lastposition){var l=T.lastposition;if(l.top==n.top&&l.left==n.left)return T}T.lastposition=n}return 0===T.page.maxh?(T.hideRail(),T.scrollvaluemax=0,T.scroll.y=0,T.scrollratio.y=0,T.cursorheight=0,T.setScrollTop(0),T.rail&&(T.rail.scrollable=!1)):(T.page.maxh-=M.railpadding.top+M.railpadding.bottom,T.rail.scrollable=!0),0===T.page.maxw?(T.hideRailHr(),T.scrollvaluemaxw=0,T.scroll.x=0,T.scrollratio.x=0,T.cursorwidth=0,T.setScrollLeft(0),T.railh&&(T.railh.scrollable=!1)):(T.page.maxw-=M.railpadding.left+M.railpadding.right,T.railh&&(T.railh.scrollable=M.horizrailenabled)),T.railslocked=T.locked||0===T.page.maxh&&0===T.page.maxw,T.railslocked?(T.ispage||T.updateScrollBar(T.view),!1):(T.hidden||T.visibility?!T.railh||T.hidden||T.railh.visibility||T.showRailHr():T.showRail().showRailHr(),T.istextarea&&T.win.css("resize")&&"none"!=T.win.css("resize")&&(T.view.h-=20),T.cursorheight=Math.min(T.view.h,Math.round(T.view.h*(T.view.h/T.page.h))),T.cursorheight=M.cursorfixedheight?M.cursorfixedheight:Math.max(M.cursorminheight,T.cursorheight),T.cursorwidth=Math.min(T.view.w,Math.round(T.view.w*(T.view.w/T.page.w))),T.cursorwidth=M.cursorfixedheight?M.cursorfixedheight:Math.max(M.cursorminheight,T.cursorwidth),T.scrollvaluemax=T.view.h-T.cursorheight-(M.railpadding.top+M.railpadding.bottom),T.hasborderbox||(T.scrollvaluemax-=T.cursor[0].offsetHeight-T.cursor[0].clientHeight),T.railh&&(T.railh.width=T.page.maxh>0?T.view.w-T.rail.width:T.view.w,T.scrollvaluemaxw=T.railh.width-T.cursorwidth-(M.railpadding.left+M.railpadding.right)),T.ispage||T.updateScrollBar(T.view),T.scrollratio={x:T.page.maxw/T.scrollvaluemaxw,y:T.page.maxh/T.scrollvaluemax},T.getScrollTop()>T.page.maxh?T.doScrollTop(T.page.maxh):(T.scroll.y=T.getScrollTop()/T.scrollratio.y|0,T.scroll.x=T.getScrollLeft()/T.scrollratio.x|0,T.cursoractive&&T.noticeCursor()),T.scroll.y&&0===T.getScrollTop()&&T.doScrollTo(T.scroll.y*T.scrollratio.y|0),T)},this.resize=T.onResize;var O=0;this.onscreenresize=function(e){clearTimeout(O);var o=!T.ispage&&!T.haswrapper;o&&T.hideRails(),O=setTimeout(function(){T&&(o&&T.showRails(),T.resize()),O=0},120)},this.lazyResize=function(e){return clearTimeout(O),O=setTimeout(function(){T&&T.resize(),O=0},e||240),T},this.jqbind=function(e,o,t){T.events.push({e:e,n:o,f:t,q:!0}),n(e).on(o,t)},this.mousewheel=function(e,o,t){var r="jquery"in e?e[0]:e;if("onwheel"in l.createElement("div"))T._bind(r,"wheel",o,t||!1);else{var i=void 0!==l.onmousewheel?"mousewheel":"DOMMouseScroll";S(r,i,o,t||!1),"DOMMouseScroll"==i&&S(r,"MozMousePixelScroll",o,t||!1)}};var Y=!1;if(N.haseventlistener){try{var H=Object.defineProperty({},"passive",{get:function(){Y=!0}});a.addEventListener("test",null,H)}catch(e){}this.stopPropagation=function(e){return!!e&&((e=e.original?e.original:e).stopPropagation(),!1)},this.cancelEvent=function(e){return e.cancelable&&e.preventDefault(),e.stopImmediatePropagation(),e.preventManipulation&&e.preventManipulation(),!1}}else Event.prototype.preventDefault=function(){this.returnValue=!1},Event.prototype.stopPropagation=function(){this.cancelBubble=!0},a.constructor.prototype.addEventListener=l.constructor.prototype.addEventListener=Element.prototype.addEventListener=function(e,o,t){this.attachEvent("on"+e,o)},a.constructor.prototype.removeEventListener=l.constructor.prototype.removeEventListener=Element.prototype.removeEventListener=function(e,o,t){this.detachEvent("on"+e,o)},this.cancelEvent=function(e){return(e=e||a.event)&&(e.cancelBubble=!0,e.cancel=!0,e.returnValue=!1),!1},this.stopPropagation=function(e){return(e=e||a.event)&&(e.cancelBubble=!0),!1};this.delegate=function(e,o,t,r,i){var s=d[o]||!1;s||(s={a:[],l:[],f:function(e){for(var o=s.l,t=!1,r=o.length-1;r>=0;r--)if(!1===(t=o[r].call(e.target,e)))return!1;return t}},T.bind(e,o,s.f,r,i),d[o]=s),T.ispage?(s.a=[T.id].concat(s.a),s.l=[t].concat(s.l)):(s.a.push(T.id),s.l.push(t))},this.undelegate=function(e,o,t,r,i){var s=d[o]||!1;if(s)for(var n=0,l=s.l.length;n<l;n++)s.a[n]===T.id&&(s.a.splice(n),s.l.splice(n),0===s.a.length&&(T._unbind(e,o,del.f),d[o]=null))},this.bind=function(e,o,t,r,i){var s="jquery"in e?e[0]:e;T._bind(s,o,t,r||!1,i||!1)},this._bind=function(e,o,t,r,i){T.events.push({e:e,n:o,f:t,b:r,q:!1}),Y&&i?e.addEventListener(o,t,{passive:!1,capture:r}):e.addEventListener(o,t,r||!1)},this._unbind=function(e,o,t,r){d[o]?T.undelegate(e,o,t,r):e.removeEventListener(o,t,r)},this.unbindAll=function(){for(var e=0;e<T.events.length;e++){var o=T.events[e];o.q?o.e.unbind(o.n,o.f):T._unbind(o.e,o.n,o.f,o.b)}},this.showRails=function(){return T.showRail().showRailHr()},this.showRail=function(){return 0===T.page.maxh||!T.ispage&&"none"==T.win.css("display")||(T.visibility=!0,T.rail.visibility=!0,T.rail.css("display","block")),T},this.showRailHr=function(){return T.railh&&(0===T.page.maxw||!T.ispage&&"none"==T.win.css("display")||(T.railh.visibility=!0,T.railh.css("display","block"))),T},this.hideRails=function(){return T.hideRail().hideRailHr()},this.hideRail=function(){return T.visibility=!1,T.rail.visibility=!1,T.rail.css("display","none"),T},this.hideRailHr=function(){return T.railh&&(T.railh.visibility=!1,T.railh.css("display","none")),T},this.show=function(){return T.hidden=!1,T.railslocked=!1,T.showRails()},this.hide=function(){return T.hidden=!0,T.railslocked=!0,T.hideRails()},this.toggle=function(){return T.hidden?T.show():T.hide()},this.remove=function(){T.stop(),T.cursortimeout&&clearTimeout(T.cursortimeout);for(var e in T.delaylist)T.delaylist[e]&&h(T.delaylist[e].h);T.doZoomOut(),T.unbindAll(),N.isie9&&T.win[0].detachEvent("onpropertychange",T.onAttributeChange),!1!==T.observer&&T.observer.disconnect(),!1!==T.observerremover&&T.observerremover.disconnect(),!1!==T.observerbody&&T.observerbody.disconnect(),T.events=null,T.cursor&&T.cursor.remove(),T.cursorh&&T.cursorh.remove(),T.rail&&T.rail.remove(),T.railh&&T.railh.remove(),T.zoom&&T.zoom.remove();for(var o=0;o<T.saved.css.length;o++){var t=T.saved.css[o];t[0].css(t[1],void 0===t[2]?"":t[2])}T.saved=!1,T.me.data("__nicescroll","");var r=n.nicescroll;r.each(function(e){if(this&&this.id===T.id){delete r[e];for(var o=++e;o<r.length;o++,e++)r[e]=r[o];--r.length&&delete r[r.length]}});for(var i in T)T[i]=null,delete T[i];T=null},this.scrollstart=function(e){return this.onscrollstart=e,T},this.scrollend=function(e){return this.onscrollend=e,T},this.scrollcancel=function(e){return this.onscrollcancel=e,T},this.zoomin=function(e){return this.onzoomin=e,T},this.zoomout=function(e){return this.onzoomout=e,T},this.isScrollable=function(e){var o=e.target?e.target:e;if("OPTION"==o.nodeName)return!0;for(;o&&1==o.nodeType&&o!==this.me[0]&&!/^BODY|HTML/.test(o.nodeName);){var t=n(o),r=t.css("overflowY")||t.css("overflowX")||t.css("overflow")||"";if(/scroll|auto/.test(r))return o.clientHeight!=o.scrollHeight;o=!!o.parentNode&&o.parentNode}return!1},this.getViewport=function(e){for(var o=!(!e||!e.parentNode)&&e.parentNode;o&&1==o.nodeType&&!/^BODY|HTML/.test(o.nodeName);){var t=n(o);if(/fixed|absolute/.test(t.css("position")))return t;var r=t.css("overflowY")||t.css("overflowX")||t.css("overflow")||"";if(/scroll|auto/.test(r)&&o.clientHeight!=o.scrollHeight)return t;if(t.getNiceScroll().length>0)return t;o=!!o.parentNode&&o.parentNode}return!1},this.triggerScrollStart=function(e,o,t,r,i){if(T.onscrollstart){var s={type:"scrollstart",current:{x:e,y:o},request:{x:t,y:r},end:{x:T.newscrollx,y:T.newscrolly},speed:i};T.onscrollstart.call(T,s)}},this.triggerScrollEnd=function(){if(T.onscrollend){var e=T.getScrollLeft(),o=T.getScrollTop(),t={type:"scrollend",current:{x:e,y:o},end:{x:e,y:o}};T.onscrollend.call(T,t)}};var B=0,X=0,D=0,A=1,q=!1;if(this.onmousewheel=function(e){if(T.wheelprevented||T.locked)return!1;if(T.railslocked)return T.debounced("checkunlock",T.resize,250),!1;if(T.rail.drag)return T.cancelEvent(e);if("auto"===M.oneaxismousemode&&0!==e.deltaX&&(M.oneaxismousemode=!1),M.oneaxismousemode&&0===e.deltaX&&!T.rail.scrollable)return!T.railh||!T.railh.scrollable||T.onmousewheelhr(e);var o=f(),t=!1;if(M.preservenativescrolling&&T.checkarea+600<o&&(T.nativescrollingarea=T.isScrollable(e),t=!0),T.checkarea=o,T.nativescrollingarea)return!0;var r=k(e,!1,t);return r&&(T.checkarea=0),r},this.onmousewheelhr=function(e){if(!T.wheelprevented){if(T.railslocked||!T.railh.scrollable)return!0;if(T.rail.drag)return T.cancelEvent(e);var o=f(),t=!1;return M.preservenativescrolling&&T.checkarea+600<o&&(T.nativescrollingarea=T.isScrollable(e),t=!0),T.checkarea=o,!!T.nativescrollingarea||(T.railslocked?T.cancelEvent(e):k(e,!0,t))}},this.stop=function(){return T.cancelScroll(),T.scrollmon&&T.scrollmon.stop(),T.cursorfreezed=!1,T.scroll.y=Math.round(T.getScrollTop()*(1/T.scrollratio.y)),T.noticeCursor(),T},this.getTransitionSpeed=function(e){return 80+e/72*M.scrollspeed|0},M.smoothscroll)if(T.ishwscroll&&N.hastransition&&M.usetransition&&M.smoothscroll){var j="";this.resetTransition=function(){j="",T.doc.css(N.prefixstyle+"transition-duration","0ms")},this.prepareTransition=function(e,o){var t=o?e:T.getTransitionSpeed(e),r=t+"ms";return j!==r&&(j=r,T.doc.css(N.prefixstyle+"transition-duration",r)),t},this.doScrollLeft=function(e,o){var t=T.scrollrunning?T.newscrolly:T.getScrollTop();T.doScrollPos(e,t,o)},this.doScrollTop=function(e,o){var t=T.scrollrunning?T.newscrollx:T.getScrollLeft();T.doScrollPos(t,e,o)},this.cursorupdate={running:!1,start:function(){var e=this;if(!e.running){e.running=!0;var o=function(){e.running&&u(o),T.showCursor(T.getScrollTop(),T.getScrollLeft()),T.notifyScrollEvent(T.win[0])};u(o)}},stop:function(){this.running=!1}},this.doScrollPos=function(e,o,t){var r=T.getScrollTop(),i=T.getScrollLeft();if(((T.newscrolly-r)*(o-r)<0||(T.newscrollx-i)*(e-i)<0)&&T.cancelScroll(),M.bouncescroll?(o<0?o=o/2|0:o>T.page.maxh&&(o=T.page.maxh+(o-T.page.maxh)/2|0),e<0?e=e/2|0:e>T.page.maxw&&(e=T.page.maxw+(e-T.page.maxw)/2|0)):(o<0?o=0:o>T.page.maxh&&(o=T.page.maxh),e<0?e=0:e>T.page.maxw&&(e=T.page.maxw)),T.scrollrunning&&e==T.newscrollx&&o==T.newscrolly)return!1;T.newscrolly=o,T.newscrollx=e;var s=T.getScrollTop(),n=T.getScrollLeft(),l={};l.x=e-n,l.y=o-s;var a=0|Math.sqrt(l.x*l.x+l.y*l.y),c=T.prepareTransition(a);T.scrollrunning||(T.scrollrunning=!0,T.triggerScrollStart(n,s,e,o,c),T.cursorupdate.start()),T.scrollendtrapped=!0,N.transitionend||(T.scrollendtrapped&&clearTimeout(T.scrollendtrapped),T.scrollendtrapped=setTimeout(T.onScrollTransitionEnd,c)),T.setScrollTop(T.newscrolly),T.setScrollLeft(T.newscrollx)},this.cancelScroll=function(){if(!T.scrollendtrapped)return!0;var e=T.getScrollTop(),o=T.getScrollLeft();return T.scrollrunning=!1,N.transitionend||clearTimeout(N.transitionend),T.scrollendtrapped=!1,T.resetTransition(),T.setScrollTop(e),T.railh&&T.setScrollLeft(o),T.timerscroll&&T.timerscroll.tm&&clearInterval(T.timerscroll.tm),T.timerscroll=!1,T.cursorfreezed=!1,T.cursorupdate.stop(),T.showCursor(e,o),T},this.onScrollTransitionEnd=function(){if(T.scrollendtrapped){var e=T.getScrollTop(),o=T.getScrollLeft();if(e<0?e=0:e>T.page.maxh&&(e=T.page.maxh),o<0?o=0:o>T.page.maxw&&(o=T.page.maxw),e!=T.newscrolly||o!=T.newscrollx)return T.doScrollPos(o,e,M.snapbackspeed);T.scrollrunning&&T.triggerScrollEnd(),T.scrollrunning=!1,T.scrollendtrapped=!1,T.resetTransition(),T.timerscroll=!1,T.setScrollTop(e),T.railh&&T.setScrollLeft(o),T.cursorupdate.stop(),T.noticeCursor(!1,e,o),T.cursorfreezed=!1}}}else this.doScrollLeft=function(e,o){var t=T.scrollrunning?T.newscrolly:T.getScrollTop();T.doScrollPos(e,t,o)},this.doScrollTop=function(e,o){var t=T.scrollrunning?T.newscrollx:T.getScrollLeft();T.doScrollPos(t,e,o)},this.doScrollPos=function(e,o,t){var r=T.getScrollTop(),i=T.getScrollLeft();((T.newscrolly-r)*(o-r)<0||(T.newscrollx-i)*(e-i)<0)&&T.cancelScroll();var s=!1;if(T.bouncescroll&&T.rail.visibility||(o<0?(o=0,s=!0):o>T.page.maxh&&(o=T.page.maxh,s=!0)),T.bouncescroll&&T.railh.visibility||(e<0?(e=0,s=!0):e>T.page.maxw&&(e=T.page.maxw,s=!0)),T.scrollrunning&&T.newscrolly===o&&T.newscrollx===e)return!0;T.newscrolly=o,T.newscrollx=e,T.dst={},T.dst.x=e-i,T.dst.y=o-r,T.dst.px=i,T.dst.py=r;var n=0|Math.sqrt(T.dst.x*T.dst.x+T.dst.y*T.dst.y),l=T.getTransitionSpeed(n);T.bzscroll={};var a=s?1:.58;T.bzscroll.x=new R(i,T.newscrollx,l,0,0,a,1),T.bzscroll.y=new R(r,T.newscrolly,l,0,0,a,1);f();var c=function(){if(T.scrollrunning){var e=T.bzscroll.y.getPos();T.setScrollLeft(T.bzscroll.x.getNow()),T.setScrollTop(T.bzscroll.y.getNow()),e<=1?T.timer=u(c):(T.scrollrunning=!1,T.timer=0,T.triggerScrollEnd())}};T.scrollrunning||(T.triggerScrollStart(i,r,e,o,l),T.scrollrunning=!0,T.timer=u(c))},this.cancelScroll=function(){return T.timer&&h(T.timer),T.timer=0,T.bzscroll=!1,T.scrollrunning=!1,T};else this.doScrollLeft=function(e,o){var t=T.getScrollTop();T.doScrollPos(e,t,o)},this.doScrollTop=function(e,o){var t=T.getScrollLeft();T.doScrollPos(t,e,o)},this.doScrollPos=function(e,o,t){var r=e>T.page.maxw?T.page.maxw:e;r<0&&(r=0);var i=o>T.page.maxh?T.page.maxh:o;i<0&&(i=0),T.synched("scroll",function(){T.setScrollTop(i),T.setScrollLeft(r)})},this.cancelScroll=function(){};this.doScrollBy=function(e,o){z(0,e)},this.doScrollLeftBy=function(e,o){z(e,0)},this.doScrollTo=function(e,o){var t=o?Math.round(e*T.scrollratio.y):e;t<0?t=0:t>T.page.maxh&&(t=T.page.maxh),T.cursorfreezed=!1,T.doScrollTop(e)},this.checkContentSize=function(){var e=T.getContentSize();e.h==T.page.h&&e.w==T.page.w||T.resize(!1,e)},T.onscroll=function(e){T.rail.drag||T.cursorfreezed||T.synched("scroll",function(){T.scroll.y=Math.round(T.getScrollTop()/T.scrollratio.y),T.railh&&(T.scroll.x=Math.round(T.getScrollLeft()/T.scrollratio.x)),T.noticeCursor()})},T.bind(T.docscroll,"scroll",T.onscroll),this.doZoomIn=function(e){if(!T.zoomactive){T.zoomactive=!0,T.zoomrestore={style:{}};var o=["position","top","left","zIndex","backgroundColor","marginTop","marginBottom","marginLeft","marginRight"],t=T.win[0].style;for(var r in o){var i=o[r];T.zoomrestore.style[i]=void 0!==t[i]?t[i]:""}T.zoomrestore.style.width=T.win.css("width"),T.zoomrestore.style.height=T.win.css("height"),T.zoomrestore.padding={w:T.win.outerWidth()-T.win.width(),h:T.win.outerHeight()-T.win.height()},N.isios4&&(T.zoomrestore.scrollTop=c.scrollTop(),c.scrollTop(0)),T.win.css({position:N.isios4?"absolute":"fixed",top:0,left:0,zIndex:s+100,margin:0});var n=T.win.css("backgroundColor");return(""===n||/transparent|rgba\(0, 0, 0, 0\)|rgba\(0,0,0,0\)/.test(n))&&T.win.css("backgroundColor","#fff"),T.rail.css({zIndex:s+101}),T.zoom.css({zIndex:s+102}),T.zoom.css("backgroundPosition","0 -18px"),T.resizeZoom(),T.onzoomin&&T.onzoomin.call(T),T.cancelEvent(e)}},this.doZoomOut=function(e){if(T.zoomactive)return T.zoomactive=!1,T.win.css("margin",""),T.win.css(T.zoomrestore.style),N.isios4&&c.scrollTop(T.zoomrestore.scrollTop),T.rail.css({"z-index":T.zindex}),T.zoom.css({"z-index":T.zindex}),T.zoomrestore=!1,T.zoom.css("backgroundPosition","0 0"),T.onResize(),T.onzoomout&&T.onzoomout.call(T),T.cancelEvent(e)},this.doZoom=function(e){return T.zoomactive?T.doZoomOut(e):T.doZoomIn(e)},this.resizeZoom=function(){if(T.zoomactive){var e=T.getScrollTop();T.win.css({width:c.width()-T.zoomrestore.padding.w+"px",height:c.height()-T.zoomrestore.padding.h+"px"}),T.onResize(),T.setScrollTop(Math.min(T.page.maxh,e))}},this.init(),n.nicescroll.push(this)},y=function(e){var o=this;this.nc=e,this.lastx=0,this.lasty=0,this.speedx=0,this.speedy=0,this.lasttime=0,this.steptime=0,this.snapx=!1,this.snapy=!1,this.demulx=0,this.demuly=0,this.lastscrollx=-1,this.lastscrolly=-1,this.chkx=0,this.chky=0,this.timer=0,this.reset=function(e,t){o.stop(),o.steptime=0,o.lasttime=f(),o.speedx=0,o.speedy=0,o.lastx=e,o.lasty=t,o.lastscrollx=-1,o.lastscrolly=-1},this.update=function(e,t){var r=f();o.steptime=r-o.lasttime,o.lasttime=r;var i=t-o.lasty,s=e-o.lastx,n=o.nc.getScrollTop()+i,l=o.nc.getScrollLeft()+s;o.snapx=l<0||l>o.nc.page.maxw,o.snapy=n<0||n>o.nc.page.maxh,o.speedx=s,o.speedy=i,o.lastx=e,o.lasty=t},this.stop=function(){o.nc.unsynched("domomentum2d"),o.timer&&clearTimeout(o.timer),o.timer=0,o.lastscrollx=-1,o.lastscrolly=-1},this.doSnapy=function(e,t){var r=!1;t<0?(t=0,r=!0):t>o.nc.page.maxh&&(t=o.nc.page.maxh,r=!0),e<0?(e=0,r=!0):e>o.nc.page.maxw&&(e=o.nc.page.maxw,r=!0),r?o.nc.doScrollPos(e,t,o.nc.opt.snapbackspeed):o.nc.triggerScrollEnd()},this.doMomentum=function(e){var t=f(),r=e?t+e:o.lasttime,i=o.nc.getScrollLeft(),s=o.nc.getScrollTop(),n=o.nc.page.maxh,l=o.nc.page.maxw;o.speedx=l>0?Math.min(60,o.speedx):0,o.speedy=n>0?Math.min(60,o.speedy):0;var a=r&&t-r<=60;(s<0||s>n||i<0||i>l)&&(a=!1);var c=!(!o.speedy||!a)&&o.speedy,d=!(!o.speedx||!a)&&o.speedx;if(c||d){var u=Math.max(16,o.steptime);if(u>50){var h=u/50;o.speedx*=h,o.speedy*=h,u=50}o.demulxy=0,o.lastscrollx=o.nc.getScrollLeft(),o.chkx=o.lastscrollx,o.lastscrolly=o.nc.getScrollTop(),o.chky=o.lastscrolly;var p=o.lastscrollx,m=o.lastscrolly,g=function(){var e=f()-t>600?.04:.02;o.speedx&&(p=Math.floor(o.lastscrollx-o.speedx*(1-o.demulxy)),o.lastscrollx=p,(p<0||p>l)&&(e=.1)),o.speedy&&(m=Math.floor(o.lastscrolly-o.speedy*(1-o.demulxy)),o.lastscrolly=m,(m<0||m>n)&&(e=.1)),o.demulxy=Math.min(1,o.demulxy+e),o.nc.synched("domomentum2d",function(){if(o.speedx){o.nc.getScrollLeft();o.chkx=p,o.nc.setScrollLeft(p)}if(o.speedy){o.nc.getScrollTop();o.chky=m,o.nc.setScrollTop(m)}o.timer||(o.nc.hideCursor(),o.doSnapy(p,m))}),o.demulxy<1?o.timer=setTimeout(g,u):(o.stop(),o.nc.hideCursor(),o.doSnapy(p,m))};g()}else o.doSnapy(o.nc.getScrollLeft(),o.nc.getScrollTop())}},x=e.fn.scrollTop;e.cssHooks.pageYOffset={get:function(e,o,t){var r=n.data(e,"__nicescroll")||!1;return r&&r.ishwscroll?r.getScrollTop():x.call(e)},set:function(e,o){var t=n.data(e,"__nicescroll")||!1;return t&&t.ishwscroll?t.setScrollTop(parseInt(o)):x.call(e,o),this}},e.fn.scrollTop=function(e){if(void 0===e){var o=!!this[0]&&(n.data(this[0],"__nicescroll")||!1);return o&&o.ishwscroll?o.getScrollTop():x.call(this)}return this.each(function(){var o=n.data(this,"__nicescroll")||!1;o&&o.ishwscroll?o.setScrollTop(parseInt(e)):x.call(n(this),e)})};var S=e.fn.scrollLeft;n.cssHooks.pageXOffset={get:function(e,o,t){var r=n.data(e,"__nicescroll")||!1;return r&&r.ishwscroll?r.getScrollLeft():S.call(e)},set:function(e,o){var t=n.data(e,"__nicescroll")||!1;return t&&t.ishwscroll?t.setScrollLeft(parseInt(o)):S.call(e,o),this}},e.fn.scrollLeft=function(e){if(void 0===e){var o=!!this[0]&&(n.data(this[0],"__nicescroll")||!1);return o&&o.ishwscroll?o.getScrollLeft():S.call(this)}return this.each(function(){var o=n.data(this,"__nicescroll")||!1;o&&o.ishwscroll?o.setScrollLeft(parseInt(e)):S.call(n(this),e)})};var z=function(e){var o=this;if(this.length=0,this.name="nicescrollarray",this.each=function(e){return n.each(o,e),o},this.push=function(e){o[o.length]=e,o.length++},this.eq=function(e){return o[e]},e)for(var t=0;t<e.length;t++){var r=n.data(e[t],"__nicescroll")||!1;r&&(this[this.length]=r,this.length++)}return this};!function(e,o,t){for(var r=0,i=o.length;r<i;r++)t(e,o[r])}(z.prototype,["show","hide","toggle","onResize","resize","remove","stop","doScrollPos"],function(e,o){e[o]=function(){var e=arguments;return this.each(function(){this[o].apply(this,e)})}}),e.fn.getNiceScroll=function(e){return void 0===e?new z(this):this[e]&&n.data(this[e],"__nicescroll")||!1},(e.expr.pseudos||e.expr[":"]).nicescroll=function(e){return void 0!==n.data(e,"__nicescroll")},n.fn.niceScroll=function(e,o){void 0!==o||"object"!=typeof e||"jquery"in e||(o=e,e=!1);var t=new z;return this.each(function(){var r=n(this),i=n.extend({},o);if(e){var s=n(e);i.doc=s.length>1?n(e,r):s,i.win=r}!("doc"in i)||"win"in i||(i.win=r);var l=r.data("__nicescroll")||!1;l||(i.doc=i.doc||r,l=new b(i,r),r.data("__nicescroll",l)),t.push(l)}),1===t.length?t[0]:t},a.NiceScroll={getjQuery:function(){return e}},n.nicescroll||(n.nicescroll=new z,n.nicescroll.options=g)});;
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):(t="undefined"!=typeof globalThis?globalThis:t||self).uuidv4=e()}(this,(function(){"use strict";var t,e=new Uint8Array(16);function o(){if(!t&&!(t="undefined"!=typeof crypto&&crypto.getRandomValues&&crypto.getRandomValues.bind(crypto)||"undefined"!=typeof msCrypto&&"function"==typeof msCrypto.getRandomValues&&msCrypto.getRandomValues.bind(msCrypto)))throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");return t(e)}var n=/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;function r(t){return"string"==typeof t&&n.test(t)}for(var i=[],u=0;u<256;++u)i.push((u+256).toString(16).substr(1));return function(t,e,n){var u=(t=t||{}).random||(t.rng||o)();if(u[6]=15&u[6]|64,u[8]=63&u[8]|128,e){n=n||0;for(var f=0;f<16;++f)e[n+f]=u[f];return e}return function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0,o=(i[t[e+0]]+i[t[e+1]]+i[t[e+2]]+i[t[e+3]]+"-"+i[t[e+4]]+i[t[e+5]]+"-"+i[t[e+6]]+i[t[e+7]]+"-"+i[t[e+8]]+i[t[e+9]]+"-"+i[t[e+10]]+i[t[e+11]]+i[t[e+12]]+i[t[e+13]]+i[t[e+14]]+i[t[e+15]]).toLowerCase();if(!r(o))throw TypeError("Stringified UUID is invalid");return o}(u)}}));;
/*! Split.js - v1.3.5 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
      (global.Split = factory());
}(this, (function () { 'use strict';

  // The programming goals of Split.js are to deliver readable, understandable and
  // maintainable code, while at the same time manually optimizing for tiny minified file size,
  // browser compatibility without additional requirements, graceful fallback (IE8 is supported)
  // and very few assumptions about the user's page layout.
  var global = window;
  var document = global.document;

  // Save a couple long function names that are used frequently.
  // This optimization saves around 400 bytes.
  var addEventListener = 'addEventListener';
  var removeEventListener = 'removeEventListener';
  var getBoundingClientRect = 'getBoundingClientRect';
  var NOOP = function () { return false; };

  // Figure out if we're in IE8 or not. IE8 will still render correctly,
  // but will be static instead of draggable.
  var isIE8 = global.attachEvent && !global[addEventListener];

  // This library only needs two helper functions:
  //
  // The first determines which prefixes of CSS calc we need.
  // We only need to do this once on startup, when this anonymous function is called.
  //
  // Tests -webkit, -moz and -o prefixes. Modified from StackOverflow:
  // http://stackoverflow.com/questions/16625140/js-feature-detection-to-detect-the-usage-of-webkit-calc-over-calc/16625167#16625167
  var calc = (['', '-webkit-', '-moz-', '-o-'].filter(function (prefix) {
    var el = document.createElement('div');
    el.style.cssText = "width:" + prefix + "calc(9px)";

    return (!!el.style.length)
  }).shift()) + "calc";

  // The second helper function allows elements and string selectors to be used
  // interchangeably. In either case an element is returned. This allows us to
  // do `Split([elem1, elem2])` as well as `Split(['#id1', '#id2'])`.
  var elementOrSelector = function (el) {
    if (typeof el === 'string' || el instanceof String) {
      return document.querySelector(el)
    }

    return el
  };

  // The main function to initialize a split. Split.js thinks about each pair
  // of elements as an independant pair. Dragging the gutter between two elements
  // only changes the dimensions of elements in that pair. This is key to understanding
  // how the following functions operate, since each function is bound to a pair.
  //
  // A pair object is shaped like this:
  //
  // {
  //     a: DOM element,
  //     b: DOM element,
  //     aMin: Number,
  //     bMin: Number,
  //     dragging: Boolean,
  //     parent: DOM element,
  //     isFirst: Boolean,
  //     isLast: Boolean,
  //     direction: 'horizontal' | 'vertical'
  // }
  //
  // The basic sequence:
  //
  // 1. Set defaults to something sane. `options` doesn't have to be passed at all.
  // 2. Initialize a bunch of strings based on the direction we're splitting.
  //    A lot of the behavior in the rest of the library is paramatized down to
  //    rely on CSS strings and classes.
  // 3. Define the dragging helper functions, and a few helpers to go with them.
  // 4. Loop through the elements while pairing them off. Every pair gets an
  //    `pair` object, a gutter, and special isFirst/isLast properties.
  // 5. Actually size the pair elements, insert gutters and attach event listeners.
  var Split = function (ids, options) {
    if ( options === void 0 ) options = {};

    var dimension;
    var clientDimension;
    var clientAxis;
    var position;
    var paddingA;
    var paddingB;
    var elements;

    // All DOM elements in the split should have a common parent. We can grab
    // the first elements parent and hope users read the docs because the
    // behavior will be whacky otherwise.
    var parent = elementOrSelector(ids[0]).parentNode;
    var parentFlexDirection = global.getComputedStyle(parent).flexDirection;

    // Set default options.sizes to equal percentages of the parent element.
    var sizes = options.sizes || ids.map(function () { return 100 / ids.length; });

    // Standardize minSize to an array if it isn't already. This allows minSize
    // to be passed as a number.
    var minSize = options.minSize !== undefined ? options.minSize : 100;
    var minSizes = Array.isArray(minSize) ? minSize : ids.map(function () { return minSize; });
    var gutterSize = options.gutterSize !== undefined ? options.gutterSize : 10;
    var snapOffset = options.snapOffset !== undefined ? options.snapOffset : 30;
    var direction = options.direction || 'horizontal';
    var cursor = options.cursor || (direction === 'horizontal' ? 'ew-resize' : 'ns-resize');
    var gutter = options.gutter || (function (i, gutterDirection) {
      var gut = document.createElement('div');
      gut.className = "gutter gutter-" + gutterDirection;
      return gut
    });
    var elementStyle = options.elementStyle || (function (dim, size, gutSize) {
      var style = {};

      if (typeof size !== 'string' && !(size instanceof String)) {
        if (!isIE8) {
          style[dim] = calc + "(" + size + "% - " + gutSize + "px)";
        } else {
          style[dim] = size + "%";
        }
      } else {
        style[dim] = size;
      }

      return style
    });
    var gutterStyle = options.gutterStyle || (function (dim, gutSize) { return (( obj = {}, obj[dim] = (gutSize + "px"), obj ))
      var obj; });

    // 2. Initialize a bunch of strings based on the direction we're splitting.
    // A lot of the behavior in the rest of the library is paramatized down to
    // rely on CSS strings and classes.
    if (direction === 'horizontal') {
      dimension = 'width';
      clientDimension = 'clientWidth';
      clientAxis = 'clientX';
      position = 'left';
      paddingA = 'paddingLeft';
      paddingB = 'paddingRight';
    } else if (direction === 'vertical') {
      dimension = 'height';
      clientDimension = 'clientHeight';
      clientAxis = 'clientY';
      position = 'top';
      paddingA = 'paddingTop';
      paddingB = 'paddingBottom';
    }

    // 3. Define the dragging helper functions, and a few helpers to go with them.
    // Each helper is bound to a pair object that contains it's metadata. This
    // also makes it easy to store references to listeners that that will be
    // added and removed.
    //
    // Even though there are no other functions contained in them, aliasing
    // this to self saves 50 bytes or so since it's used so frequently.
    //
    // The pair object saves metadata like dragging state, position and
    // event listener references.

    function setElementSize (el, size, gutSize) {
      // Split.js allows setting sizes via numbers (ideally), or if you must,
      // by string, like '300px'. This is less than ideal, because it breaks
      // the fluid layout that `calc(% - px)` provides. You're on your own if you do that,
      // make sure you calculate the gutter size by hand.
      var style = elementStyle(dimension, size, gutSize);

      // eslint-disable-next-line no-param-reassign
      Object.keys(style).forEach(function (prop) { return (el.style[prop] = style[prop]); });
    }

    function setGutterSize (gutterElement, gutSize) {
      var style = gutterStyle(dimension, gutSize);

      // eslint-disable-next-line no-param-reassign
      Object.keys(style).forEach(function (prop) { return (gutterElement.style[prop] = style[prop]); });
    }

    // Actually adjust the size of elements `a` and `b` to `offset` while dragging.
    // calc is used to allow calc(percentage + gutterpx) on the whole split instance,
    // which allows the viewport to be resized without additional logic.
    // Element a's size is the same as offset. b's size is total size - a size.
    // Both sizes are calculated from the initial parent percentage,
    // then the gutter size is subtracted.
    function adjust (offset) {
      var a = elements[this.a];
      var b = elements[this.b];
      var percentage = a.size + b.size;

      a.size = (offset / this.size) * percentage;
      b.size = (percentage - ((offset / this.size) * percentage));

      setElementSize(a.element, a.size, this.aGutterSize);
      setElementSize(b.element, b.size, this.bGutterSize);
    }

    // drag, where all the magic happens. The logic is really quite simple:
    //
    // 1. Ignore if the pair is not dragging.
    // 2. Get the offset of the event.
    // 3. Snap offset to min if within snappable range (within min + snapOffset).
    // 4. Actually adjust each element in the pair to offset.
    //
    // ---------------------------------------------------------------------
    // |    | <- a.minSize               ||              b.minSize -> |    |
    // |    |  | <- this.snapOffset      ||     this.snapOffset -> |  |    |
    // |    |  |                         ||                        |  |    |
    // |    |  |                         ||                        |  |    |
    // ---------------------------------------------------------------------
    // | <- this.start                                        this.size -> |
    function drag (e) {
      var offset;

      if (!this.dragging) { return }

      // Get the offset of the event from the first side of the
      // pair `this.start`. Supports touch events, but not multitouch, so only the first
      // finger `touches[0]` is counted.
      if ('touches' in e) {
        offset = e.touches[0][clientAxis] - this.start;
      } else {
        offset = e[clientAxis] - this.start;
      }

      // If within snapOffset of min or max, set offset to min or max.
      // snapOffset buffers a.minSize and b.minSize, so logic is opposite for both.
      // Include the appropriate gutter sizes to prevent overflows.
      if (offset <= elements[this.a].minSize + snapOffset + this.aGutterSize) {
        offset = elements[this.a].minSize + this.aGutterSize;
      } else if (offset >= this.size - (elements[this.b].minSize + snapOffset + this.bGutterSize)) {
        offset = this.size - (elements[this.b].minSize + this.bGutterSize);
      }

      // Actually adjust the size.
      adjust.call(this, offset);

      // Call the drag callback continously. Don't do anything too intensive
      // in this callback.
      if (options.onDrag) {
        options.onDrag();
      }
    }

    // Cache some important sizes when drag starts, so we don't have to do that
    // continously:
    //
    // `size`: The total size of the pair. First + second + first gutter + second gutter.
    // `start`: The leading side of the first element.
    //
    // ------------------------------------------------
    // |      aGutterSize -> |||                      |
    // |                     |||                      |
    // |                     |||                      |
    // |                     ||| <- bGutterSize       |
    // ------------------------------------------------
    // | <- start                             size -> |
    function calculateSizes () {
      // Figure out the parent size minus padding.
      var a = elements[this.a].element;
      var b = elements[this.b].element;

      this.size = a[getBoundingClientRect]()[dimension] + b[getBoundingClientRect]()[dimension] + this.aGutterSize + this.bGutterSize;
      this.start = a[getBoundingClientRect]()[position];
    }

    // stopDragging is very similar to startDragging in reverse.
    function stopDragging () {
      var self = this;
      var a = elements[self.a].element;
      var b = elements[self.b].element;

      if (self.dragging && options.onDragEnd) {
        options.onDragEnd();
      }

      self.dragging = false;

      // Remove the stored event listeners. This is why we store them.
      global[removeEventListener]('mouseup', self.stop);
      global[removeEventListener]('touchend', self.stop);
      global[removeEventListener]('touchcancel', self.stop);

      self.parent[removeEventListener]('mousemove', self.move);
      self.parent[removeEventListener]('touchmove', self.move);

      // Delete them once they are removed. I think this makes a difference
      // in memory usage with a lot of splits on one page. But I don't know for sure.
      delete self.stop;
      delete self.move;

      a[removeEventListener]('selectstart', NOOP);
      a[removeEventListener]('dragstart', NOOP);
      b[removeEventListener]('selectstart', NOOP);
      b[removeEventListener]('dragstart', NOOP);

      a.style.userSelect = '';
      a.style.webkitUserSelect = '';
      a.style.MozUserSelect = '';
      a.style.pointerEvents = '';

      b.style.userSelect = '';
      b.style.webkitUserSelect = '';
      b.style.MozUserSelect = '';
      b.style.pointerEvents = '';

      self.gutter.style.cursor = '';
      self.parent.style.cursor = '';
    }

    // startDragging calls `calculateSizes` to store the inital size in the pair object.
    // It also adds event listeners for mouse/touch events,
    // and prevents selection while dragging so avoid the selecting text.
    function startDragging (e) {
      // Alias frequently used variables to save space. 200 bytes.
      var self = this;
      var a = elements[self.a].element;
      var b = elements[self.b].element;

      // Call the onDragStart callback.
      if (!self.dragging && options.onDragStart) {
        options.onDragStart();
      }

      // Don't actually drag the element. We emulate that in the drag function.
      e.preventDefault();

      // Set the dragging property of the pair object.
      self.dragging = true;

      // Create two event listeners bound to the same pair object and store
      // them in the pair object.
      self.move = drag.bind(self);
      self.stop = stopDragging.bind(self);

      // All the binding. `window` gets the stop events in case we drag out of the elements.
      global[addEventListener]('mouseup', self.stop);
      global[addEventListener]('touchend', self.stop);
      global[addEventListener]('touchcancel', self.stop);

      self.parent[addEventListener]('mousemove', self.move);
      self.parent[addEventListener]('touchmove', self.move);

      // Disable selection. Disable!
      a[addEventListener]('selectstart', NOOP);
      a[addEventListener]('dragstart', NOOP);
      b[addEventListener]('selectstart', NOOP);
      b[addEventListener]('dragstart', NOOP);

      a.style.userSelect = 'none';
      a.style.webkitUserSelect = 'none';
      a.style.MozUserSelect = 'none';
      a.style.pointerEvents = 'none';

      b.style.userSelect = 'none';
      b.style.webkitUserSelect = 'none';
      b.style.MozUserSelect = 'none';
      b.style.pointerEvents = 'none';

      // Set the cursor, both on the gutter and the parent element.
      // Doing only a, b and gutter causes flickering.
      self.gutter.style.cursor = cursor;
      self.parent.style.cursor = cursor;

      // Cache the initial sizes of the pair.
      calculateSizes.call(self);
    }

    // 5. Create pair and element objects. Each pair has an index reference to
    // elements `a` and `b` of the pair (first and second elements).
    // Loop through the elements while pairing them off. Every pair gets a
    // `pair` object, a gutter, and isFirst/isLast properties.
    //
    // Basic logic:
    //
    // - Starting with the second element `i > 0`, create `pair` objects with
    //   `a = i - 1` and `b = i`
    // - Set gutter sizes based on the _pair_ being first/last. The first and last
    //   pair have gutterSize / 2, since they only have one half gutter, and not two.
    // - Create gutter elements and add event listeners.
    // - Set the size of the elements, minus the gutter sizes.
    //
    // -----------------------------------------------------------------------
    // |     i=0     |         i=1         |        i=2       |      i=3     |
    // |             |       isFirst       |                  |     isLast   |
    // |           pair 0                pair 1             pair 2           |
    // |             |                     |                  |              |
    // -----------------------------------------------------------------------
    var pairs = [];
    elements = ids.map(function (id, i) {
      // Create the element object.
      var element = {
        element: elementOrSelector(id),
        size: sizes[i],
        minSize: minSizes[i],
      };

      var pair;

      if (i > 0) {
        // Create the pair object with it's metadata.
        pair = {
          a: i - 1,
          b: i,
          dragging: false,
          isFirst: (i === 1),
          isLast: (i === ids.length - 1),
          direction: direction,
          parent: parent,
        };

        // For first and last pairs, first and last gutter width is half.
        pair.aGutterSize = gutterSize;
        pair.bGutterSize = gutterSize;

        if (pair.isFirst) {
          pair.aGutterSize = gutterSize / 2;
        }

        if (pair.isLast) {
          pair.bGutterSize = gutterSize / 2;
        }

        // if the parent has a reverse flex-direction, switch the pair elements.
        if (parentFlexDirection === 'row-reverse' || parentFlexDirection === 'column-reverse') {
          var temp = pair.a;
          pair.a = pair.b;
          pair.b = temp;
        }
      }

      // Determine the size of the current element. IE8 is supported by
      // staticly assigning sizes without draggable gutters. Assigns a string
      // to `size`.
      //
      // IE9 and above
      if (!isIE8) {
        // Create gutter elements for each pair.
        if (i > 0) {
          var gutterElement = gutter(i, direction);
          setGutterSize(gutterElement, gutterSize);

          gutterElement[addEventListener]('mousedown', startDragging.bind(pair));
          gutterElement[addEventListener]('touchstart', startDragging.bind(pair));

          parent.insertBefore(gutterElement, element.element);

          pair.gutter = gutterElement;
        }
      }

      // Set the element size to our determined size.
      // Half-size gutters for first and last elements.
      if (i === 0 || i === ids.length - 1) {
        setElementSize(element.element, element.size, gutterSize / 2);
      } else {
        setElementSize(element.element, element.size, gutterSize);
      }

      var computedSize = element.element[getBoundingClientRect]()[dimension];

      if (computedSize < element.minSize) {
        element.minSize = computedSize;
      }

      // After the first iteration, and we have a pair object, append it to the
      // list of pairs.
      if (i > 0) {
        pairs.push(pair);
      }

      return element
    });

    function setSizes (newSizes) {
      newSizes.forEach(function (newSize, i) {
        if (i > 0) {
          var pair = pairs[i - 1];
          var a = elements[pair.a];
          var b = elements[pair.b];

          a.size = newSizes[i - 1];
          b.size = newSize;

          setElementSize(a.element, a.size, pair.aGutterSize);
          setElementSize(b.element, b.size, pair.bGutterSize);
        }
      });
    }

    function destroy () {
      pairs.forEach(function (pair) {
        pair.parent.removeChild(pair.gutter);
        elements[pair.a].element.style[dimension] = '';
        elements[pair.b].element.style[dimension] = '';
      });
    }

    if (isIE8) {
      return {
        setSizes: setSizes,
        destroy: destroy,
      }
    }

    return {
      setSizes: setSizes,
      getSizes: function getSizes () {
        return elements.map(function (element) { return element.size; })
      },
      collapse: function collapse (i) {
        if (i === pairs.length) {
          var pair = pairs[i - 1];

          calculateSizes.call(pair);

          if (!isIE8) {
            adjust.call(pair, pair.size - pair.bGutterSize);
          }
        } else {
          var pair$1 = pairs[i];

          calculateSizes.call(pair$1);

          if (!isIE8) {
            adjust.call(pair$1, pair$1.aGutterSize);
          }
        }
      },
      destroy: destroy,
    }
  };

  return Split;

})));
;
/*! Sortable 1.15.0 - MIT | git://github.com/SortableJS/Sortable.git */
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):(t=t||self).Sortable=e()}(this,function(){"use strict";function e(e,t){var n,o=Object.keys(e);return Object.getOwnPropertySymbols&&(n=Object.getOwnPropertySymbols(e),t&&(n=n.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),o.push.apply(o,n)),o}function M(o){for(var t=1;t<arguments.length;t++){var i=null!=arguments[t]?arguments[t]:{};t%2?e(Object(i),!0).forEach(function(t){var e,n;e=o,t=i[n=t],n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t}):Object.getOwnPropertyDescriptors?Object.defineProperties(o,Object.getOwnPropertyDescriptors(i)):e(Object(i)).forEach(function(t){Object.defineProperty(o,t,Object.getOwnPropertyDescriptor(i,t))})}return o}function o(t){return(o="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}function a(){return(a=Object.assign||function(t){for(var e=1;e<arguments.length;e++){var n,o=arguments[e];for(n in o)Object.prototype.hasOwnProperty.call(o,n)&&(t[n]=o[n])}return t}).apply(this,arguments)}function i(t,e){if(null==t)return{};var n,o=function(t,e){if(null==t)return{};for(var n,o={},i=Object.keys(t),r=0;r<i.length;r++)n=i[r],0<=e.indexOf(n)||(o[n]=t[n]);return o}(t,e);if(Object.getOwnPropertySymbols)for(var i=Object.getOwnPropertySymbols(t),r=0;r<i.length;r++)n=i[r],0<=e.indexOf(n)||Object.prototype.propertyIsEnumerable.call(t,n)&&(o[n]=t[n]);return o}function r(t){return function(t){if(Array.isArray(t))return l(t)}(t)||function(t){if("undefined"!=typeof Symbol&&null!=t[Symbol.iterator]||null!=t["@@iterator"])return Array.from(t)}(t)||function(t,e){if(t){if("string"==typeof t)return l(t,e);var n=Object.prototype.toString.call(t).slice(8,-1);return"Map"===(n="Object"===n&&t.constructor?t.constructor.name:n)||"Set"===n?Array.from(t):"Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?l(t,e):void 0}}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function l(t,e){(null==e||e>t.length)&&(e=t.length);for(var n=0,o=new Array(e);n<e;n++)o[n]=t[n];return o}function t(t){if("undefined"!=typeof window&&window.navigator)return!!navigator.userAgent.match(t)}var y=t(/(?:Trident.*rv[ :]?11\.|msie|iemobile|Windows Phone)/i),w=t(/Edge/i),s=t(/firefox/i),u=t(/safari/i)&&!t(/chrome/i)&&!t(/android/i),n=t(/iP(ad|od|hone)/i),c=t(/chrome/i)&&t(/android/i),d={capture:!1,passive:!1};function h(t,e,n){t.addEventListener(e,n,!y&&d)}function f(t,e,n){t.removeEventListener(e,n,!y&&d)}function p(t,e){if(e&&(">"===e[0]&&(e=e.substring(1)),t))try{if(t.matches)return t.matches(e);if(t.msMatchesSelector)return t.msMatchesSelector(e);if(t.webkitMatchesSelector)return t.webkitMatchesSelector(e)}catch(t){return}}function N(t,e,n,o){if(t){n=n||document;do{if(null!=e&&(">"!==e[0]||t.parentNode===n)&&p(t,e)||o&&t===n)return t}while(t!==n&&(t=(i=t).host&&i!==document&&i.host.nodeType?i.host:i.parentNode))}var i;return null}var g,m=/\s+/g;function I(t,e,n){var o;t&&e&&(t.classList?t.classList[n?"add":"remove"](e):(o=(" "+t.className+" ").replace(m," ").replace(" "+e+" "," "),t.className=(o+(n?" "+e:"")).replace(m," ")))}function P(t,e,n){var o=t&&t.style;if(o){if(void 0===n)return document.defaultView&&document.defaultView.getComputedStyle?n=document.defaultView.getComputedStyle(t,""):t.currentStyle&&(n=t.currentStyle),void 0===e?n:n[e];o[e=!(e in o||-1!==e.indexOf("webkit"))?"-webkit-"+e:e]=n+("string"==typeof n?"":"px")}}function v(t,e){var n="";if("string"==typeof t)n=t;else do{var o=P(t,"transform")}while(o&&"none"!==o&&(n=o+" "+n),!e&&(t=t.parentNode));var i=window.DOMMatrix||window.WebKitCSSMatrix||window.CSSMatrix||window.MSCSSMatrix;return i&&new i(n)}function b(t,e,n){if(t){var o=t.getElementsByTagName(e),i=0,r=o.length;if(n)for(;i<r;i++)n(o[i],i);return o}return[]}function O(){var t=document.scrollingElement;return t||document.documentElement}function k(t,e,n,o,i){if(t.getBoundingClientRect||t===window){var r,a,l,s,c,u,d=t!==window&&t.parentNode&&t!==O()?(a=(r=t.getBoundingClientRect()).top,l=r.left,s=r.bottom,c=r.right,u=r.height,r.width):(l=a=0,s=window.innerHeight,c=window.innerWidth,u=window.innerHeight,window.innerWidth);if((e||n)&&t!==window&&(i=i||t.parentNode,!y))do{if(i&&i.getBoundingClientRect&&("none"!==P(i,"transform")||n&&"static"!==P(i,"position"))){var h=i.getBoundingClientRect();a-=h.top+parseInt(P(i,"border-top-width")),l-=h.left+parseInt(P(i,"border-left-width")),s=a+r.height,c=l+r.width;break}}while(i=i.parentNode);return o&&t!==window&&(o=(e=v(i||t))&&e.a,t=e&&e.d,e&&(s=(a/=t)+(u/=t),c=(l/=o)+(d/=o))),{top:a,left:l,bottom:s,right:c,width:d,height:u}}}function R(t,e,n){for(var o=A(t,!0),i=k(t)[e];o;){var r=k(o)[n];if(!("top"===n||"left"===n?r<=i:i<=r))return o;if(o===O())break;o=A(o,!1)}return!1}function X(t,e,n,o){for(var i=0,r=0,a=t.children;r<a.length;){if("none"!==a[r].style.display&&a[r]!==Bt.ghost&&(o||a[r]!==Bt.dragged)&&N(a[r],n.draggable,t,!1)){if(i===e)return a[r];i++}r++}return null}function Y(t,e){for(var n=t.lastElementChild;n&&(n===Bt.ghost||"none"===P(n,"display")||e&&!p(n,e));)n=n.previousElementSibling;return n||null}function B(t,e){var n=0;if(!t||!t.parentNode)return-1;for(;t=t.previousElementSibling;)"TEMPLATE"===t.nodeName.toUpperCase()||t===Bt.clone||e&&!p(t,e)||n++;return n}function E(t){var e=0,n=0,o=O();if(t)do{var i=v(t),r=i.a,i=i.d}while(e+=t.scrollLeft*r,n+=t.scrollTop*i,t!==o&&(t=t.parentNode));return[e,n]}function A(t,e){if(!t||!t.getBoundingClientRect)return O();var n=t,o=!1;do{if(n.clientWidth<n.scrollWidth||n.clientHeight<n.scrollHeight){var i=P(n);if(n.clientWidth<n.scrollWidth&&("auto"==i.overflowX||"scroll"==i.overflowX)||n.clientHeight<n.scrollHeight&&("auto"==i.overflowY||"scroll"==i.overflowY)){if(!n.getBoundingClientRect||n===document.body)return O();if(o||e)return n;o=!0}}}while(n=n.parentNode);return O()}function D(t,e){return Math.round(t.top)===Math.round(e.top)&&Math.round(t.left)===Math.round(e.left)&&Math.round(t.height)===Math.round(e.height)&&Math.round(t.width)===Math.round(e.width)}function S(e,n){return function(){var t;g||(1===(t=arguments).length?e.call(this,t[0]):e.apply(this,t),g=setTimeout(function(){g=void 0},n))}}function F(t,e,n){t.scrollLeft+=e,t.scrollTop+=n}function _(t){var e=window.Polymer,n=window.jQuery||window.Zepto;return e&&e.dom?e.dom(t).cloneNode(!0):n?n(t).clone(!0)[0]:t.cloneNode(!0)}function C(t,e){P(t,"position","absolute"),P(t,"top",e.top),P(t,"left",e.left),P(t,"width",e.width),P(t,"height",e.height)}function T(t){P(t,"position",""),P(t,"top",""),P(t,"left",""),P(t,"width",""),P(t,"height","")}var j="Sortable"+(new Date).getTime();function x(){var e,o=[];return{captureAnimationState:function(){o=[],this.options.animation&&[].slice.call(this.el.children).forEach(function(t){var e,n;"none"!==P(t,"display")&&t!==Bt.ghost&&(o.push({target:t,rect:k(t)}),e=M({},o[o.length-1].rect),!t.thisAnimationDuration||(n=v(t,!0))&&(e.top-=n.f,e.left-=n.e),t.fromRect=e)})},addAnimationState:function(t){o.push(t)},removeAnimationState:function(t){o.splice(function(t,e){for(var n in t)if(t.hasOwnProperty(n))for(var o in e)if(e.hasOwnProperty(o)&&e[o]===t[n][o])return Number(n);return-1}(o,{target:t}),1)},animateAll:function(t){var c=this;if(!this.options.animation)return clearTimeout(e),void("function"==typeof t&&t());var u=!1,d=0;o.forEach(function(t){var e=0,n=t.target,o=n.fromRect,i=k(n),r=n.prevFromRect,a=n.prevToRect,l=t.rect,s=v(n,!0);s&&(i.top-=s.f,i.left-=s.e),n.toRect=i,n.thisAnimationDuration&&D(r,i)&&!D(o,i)&&(l.top-i.top)/(l.left-i.left)==(o.top-i.top)/(o.left-i.left)&&(t=l,s=r,r=a,a=c.options,e=Math.sqrt(Math.pow(s.top-t.top,2)+Math.pow(s.left-t.left,2))/Math.sqrt(Math.pow(s.top-r.top,2)+Math.pow(s.left-r.left,2))*a.animation),D(i,o)||(n.prevFromRect=o,n.prevToRect=i,e=e||c.options.animation,c.animate(n,l,i,e)),e&&(u=!0,d=Math.max(d,e),clearTimeout(n.animationResetTimer),n.animationResetTimer=setTimeout(function(){n.animationTime=0,n.prevFromRect=null,n.fromRect=null,n.prevToRect=null,n.thisAnimationDuration=null},e),n.thisAnimationDuration=e)}),clearTimeout(e),u?e=setTimeout(function(){"function"==typeof t&&t()},d):"function"==typeof t&&t(),o=[]},animate:function(t,e,n,o){var i,r;o&&(P(t,"transition",""),P(t,"transform",""),i=(r=v(this.el))&&r.a,r=r&&r.d,i=(e.left-n.left)/(i||1),r=(e.top-n.top)/(r||1),t.animatingX=!!i,t.animatingY=!!r,P(t,"transform","translate3d("+i+"px,"+r+"px,0)"),this.forRepaintDummy=t.offsetWidth,P(t,"transition","transform "+o+"ms"+(this.options.easing?" "+this.options.easing:"")),P(t,"transform","translate3d(0,0,0)"),"number"==typeof t.animated&&clearTimeout(t.animated),t.animated=setTimeout(function(){P(t,"transition",""),P(t,"transform",""),t.animated=!1,t.animatingX=!1,t.animatingY=!1},o))}}}var H=[],L={initializeByDefault:!0},K={mount:function(e){for(var t in L)!L.hasOwnProperty(t)||t in e||(e[t]=L[t]);H.forEach(function(t){if(t.pluginName===e.pluginName)throw"Sortable: Cannot mount plugin ".concat(e.pluginName," more than once")}),H.push(e)},pluginEvent:function(e,n,o){var t=this;this.eventCanceled=!1,o.cancel=function(){t.eventCanceled=!0};var i=e+"Global";H.forEach(function(t){n[t.pluginName]&&(n[t.pluginName][i]&&n[t.pluginName][i](M({sortable:n},o)),n.options[t.pluginName]&&n[t.pluginName][e]&&n[t.pluginName][e](M({sortable:n},o)))})},initializePlugins:function(n,o,i,t){for(var e in H.forEach(function(t){var e=t.pluginName;(n.options[e]||t.initializeByDefault)&&((t=new t(n,o,n.options)).sortable=n,t.options=n.options,n[e]=t,a(i,t.defaults))}),n.options){var r;n.options.hasOwnProperty(e)&&(void 0!==(r=this.modifyOption(n,e,n.options[e]))&&(n.options[e]=r))}},getEventProperties:function(e,n){var o={};return H.forEach(function(t){"function"==typeof t.eventProperties&&a(o,t.eventProperties.call(n[t.pluginName],e))}),o},modifyOption:function(e,n,o){var i;return H.forEach(function(t){e[t.pluginName]&&t.optionListeners&&"function"==typeof t.optionListeners[n]&&(i=t.optionListeners[n].call(e[t.pluginName],o))}),i}};function W(t){var e=t.sortable,n=t.rootEl,o=t.name,i=t.targetEl,r=t.cloneEl,a=t.toEl,l=t.fromEl,s=t.oldIndex,c=t.newIndex,u=t.oldDraggableIndex,d=t.newDraggableIndex,h=t.originalEvent,f=t.putSortable,p=t.extraEventProperties;if(e=e||n&&n[j]){var g,m=e.options,t="on"+o.charAt(0).toUpperCase()+o.substr(1);!window.CustomEvent||y||w?(g=document.createEvent("Event")).initEvent(o,!0,!0):g=new CustomEvent(o,{bubbles:!0,cancelable:!0}),g.to=a||n,g.from=l||n,g.item=i||n,g.clone=r,g.oldIndex=s,g.newIndex=c,g.oldDraggableIndex=u,g.newDraggableIndex=d,g.originalEvent=h,g.pullMode=f?f.lastPutMode:void 0;var v,b=M(M({},p),K.getEventProperties(o,e));for(v in b)g[v]=b[v];n&&n.dispatchEvent(g),m[t]&&m[t].call(e,g)}}function z(t,e){var n=(o=2<arguments.length&&void 0!==arguments[2]?arguments[2]:{}).evt,o=i(o,G);K.pluginEvent.bind(Bt)(t,e,M({dragEl:q,parentEl:V,ghostEl:Z,rootEl:$,nextEl:Q,lastDownEl:J,cloneEl:tt,cloneHidden:et,dragStarted:pt,putSortable:lt,activeSortable:Bt.active,originalEvent:n,oldIndex:nt,oldDraggableIndex:it,newIndex:ot,newDraggableIndex:rt,hideGhostForTarget:kt,unhideGhostForTarget:Rt,cloneNowHidden:function(){et=!0},cloneNowShown:function(){et=!1},dispatchSortableEvent:function(t){U({sortable:e,name:t,originalEvent:n})}},o))}var G=["evt"];function U(t){W(M({putSortable:lt,cloneEl:tt,targetEl:q,rootEl:$,oldIndex:nt,oldDraggableIndex:it,newIndex:ot,newDraggableIndex:rt},t))}var q,V,Z,$,Q,J,tt,et,nt,ot,it,rt,at,lt,st,ct,ut,dt,ht,ft,pt,gt,mt,vt,bt,yt=!1,wt=!1,Et=[],Dt=!1,St=!1,_t=[],Ct=!1,Tt=[],xt="undefined"!=typeof document,Ot=n,At=w||y?"cssFloat":"float",Mt=xt&&!c&&!n&&"draggable"in document.createElement("div"),Nt=function(){if(xt){if(y)return!1;var t=document.createElement("x");return t.style.cssText="pointer-events:auto","auto"===t.style.pointerEvents}}(),It=function(t,e){var n=P(t),o=parseInt(n.width)-parseInt(n.paddingLeft)-parseInt(n.paddingRight)-parseInt(n.borderLeftWidth)-parseInt(n.borderRightWidth),i=X(t,0,e),r=X(t,1,e),a=i&&P(i),l=r&&P(r),s=a&&parseInt(a.marginLeft)+parseInt(a.marginRight)+k(i).width,t=l&&parseInt(l.marginLeft)+parseInt(l.marginRight)+k(r).width;if("flex"===n.display)return"column"===n.flexDirection||"column-reverse"===n.flexDirection?"vertical":"horizontal";if("grid"===n.display)return n.gridTemplateColumns.split(" ").length<=1?"vertical":"horizontal";if(i&&a.float&&"none"!==a.float){e="left"===a.float?"left":"right";return!r||"both"!==l.clear&&l.clear!==e?"horizontal":"vertical"}return i&&("block"===a.display||"flex"===a.display||"table"===a.display||"grid"===a.display||o<=s&&"none"===n[At]||r&&"none"===n[At]&&o<s+t)?"vertical":"horizontal"},Pt=function(t){function l(r,a){return function(t,e,n,o){var i=t.options.group.name&&e.options.group.name&&t.options.group.name===e.options.group.name;if(null==r&&(a||i))return!0;if(null==r||!1===r)return!1;if(a&&"clone"===r)return r;if("function"==typeof r)return l(r(t,e,n,o),a)(t,e,n,o);e=(a?t:e).options.group.name;return!0===r||"string"==typeof r&&r===e||r.join&&-1<r.indexOf(e)}}var e={},n=t.group;n&&"object"==o(n)||(n={name:n}),e.name=n.name,e.checkPull=l(n.pull,!0),e.checkPut=l(n.put),e.revertClone=n.revertClone,t.group=e},kt=function(){!Nt&&Z&&P(Z,"display","none")},Rt=function(){!Nt&&Z&&P(Z,"display","")};xt&&!c&&document.addEventListener("click",function(t){if(wt)return t.preventDefault(),t.stopPropagation&&t.stopPropagation(),t.stopImmediatePropagation&&t.stopImmediatePropagation(),wt=!1},!0);function Xt(t){if(q){t=t.touches?t.touches[0]:t;var e=(i=t.clientX,r=t.clientY,Et.some(function(t){var e=t[j].options.emptyInsertThreshold;if(e&&!Y(t)){var n=k(t),o=i>=n.left-e&&i<=n.right+e,e=r>=n.top-e&&r<=n.bottom+e;return o&&e?a=t:void 0}}),a);if(e){var n,o={};for(n in t)t.hasOwnProperty(n)&&(o[n]=t[n]);o.target=o.rootEl=e,o.preventDefault=void 0,o.stopPropagation=void 0,e[j]._onDragOver(o)}}var i,r,a}function Yt(t){q&&q.parentNode[j]._isOutsideThisEl(t.target)}function Bt(t,e){if(!t||!t.nodeType||1!==t.nodeType)throw"Sortable: `el` must be an HTMLElement, not ".concat({}.toString.call(t));this.el=t,this.options=e=a({},e),t[j]=this;var n,o,i={group:null,sort:!0,disabled:!1,store:null,handle:null,draggable:/^[uo]l$/i.test(t.nodeName)?">li":">*",swapThreshold:1,invertSwap:!1,invertedSwapThreshold:null,removeCloneOnHide:!0,direction:function(){return It(t,this.options)},ghostClass:"sortable-ghost",chosenClass:"sortable-chosen",dragClass:"sortable-drag",ignore:"a, img",filter:null,preventOnFilter:!0,animation:0,easing:null,setData:function(t,e){t.setData("Text",e.textContent)},dropBubble:!1,dragoverBubble:!1,dataIdAttr:"data-id",delay:0,delayOnTouchOnly:!1,touchStartThreshold:(Number.parseInt?Number:window).parseInt(window.devicePixelRatio,10)||1,forceFallback:!1,fallbackClass:"sortable-fallback",fallbackOnBody:!1,fallbackTolerance:0,fallbackOffset:{x:0,y:0},supportPointer:!1!==Bt.supportPointer&&"PointerEvent"in window&&!u,emptyInsertThreshold:5};for(n in K.initializePlugins(this,t,i),i)n in e||(e[n]=i[n]);for(o in Pt(e),this)"_"===o.charAt(0)&&"function"==typeof this[o]&&(this[o]=this[o].bind(this));this.nativeDraggable=!e.forceFallback&&Mt,this.nativeDraggable&&(this.options.touchStartThreshold=1),e.supportPointer?h(t,"pointerdown",this._onTapStart):(h(t,"mousedown",this._onTapStart),h(t,"touchstart",this._onTapStart)),this.nativeDraggable&&(h(t,"dragover",this),h(t,"dragenter",this)),Et.push(this.el),e.store&&e.store.get&&this.sort(e.store.get(this)||[]),a(this,x())}function Ft(t,e,n,o,i,r,a,l){var s,c,u=t[j],d=u.options.onMove;return!window.CustomEvent||y||w?(s=document.createEvent("Event")).initEvent("move",!0,!0):s=new CustomEvent("move",{bubbles:!0,cancelable:!0}),s.to=e,s.from=t,s.dragged=n,s.draggedRect=o,s.related=i||e,s.relatedRect=r||k(e),s.willInsertAfter=l,s.originalEvent=a,t.dispatchEvent(s),c=d?d.call(u,s,a):c}function jt(t){t.draggable=!1}function Ht(){Ct=!1}function Lt(t){return setTimeout(t,0)}function Kt(t){return clearTimeout(t)}Bt.prototype={constructor:Bt,_isOutsideThisEl:function(t){this.el.contains(t)||t===this.el||(gt=null)},_getDirection:function(t,e){return"function"==typeof this.options.direction?this.options.direction.call(this,t,e,q):this.options.direction},_onTapStart:function(e){if(e.cancelable){var n=this,o=this.el,t=this.options,i=t.preventOnFilter,r=e.type,a=e.touches&&e.touches[0]||e.pointerType&&"touch"===e.pointerType&&e,l=(a||e).target,s=e.target.shadowRoot&&(e.path&&e.path[0]||e.composedPath&&e.composedPath()[0])||l,c=t.filter;if(!function(t){Tt.length=0;var e=t.getElementsByTagName("input"),n=e.length;for(;n--;){var o=e[n];o.checked&&Tt.push(o)}}(o),!q&&!(/mousedown|pointerdown/.test(r)&&0!==e.button||t.disabled)&&!s.isContentEditable&&(this.nativeDraggable||!u||!l||"SELECT"!==l.tagName.toUpperCase())&&!((l=N(l,t.draggable,o,!1))&&l.animated||J===l)){if(nt=B(l),it=B(l,t.draggable),"function"==typeof c){if(c.call(this,e,l,this))return U({sortable:n,rootEl:s,name:"filter",targetEl:l,toEl:o,fromEl:o}),z("filter",n,{evt:e}),void(i&&e.cancelable&&e.preventDefault())}else if(c=c&&c.split(",").some(function(t){if(t=N(s,t.trim(),o,!1))return U({sortable:n,rootEl:t,name:"filter",targetEl:l,fromEl:o,toEl:o}),z("filter",n,{evt:e}),!0}))return void(i&&e.cancelable&&e.preventDefault());t.handle&&!N(s,t.handle,o,!1)||this._prepareDragStart(e,a,l)}}},_prepareDragStart:function(t,e,n){var o,i=this,r=i.el,a=i.options,l=r.ownerDocument;n&&!q&&n.parentNode===r&&(o=k(n),$=r,V=(q=n).parentNode,Q=q.nextSibling,J=n,at=a.group,st={target:Bt.dragged=q,clientX:(e||t).clientX,clientY:(e||t).clientY},ht=st.clientX-o.left,ft=st.clientY-o.top,this._lastX=(e||t).clientX,this._lastY=(e||t).clientY,q.style["will-change"]="all",o=function(){z("delayEnded",i,{evt:t}),Bt.eventCanceled?i._onDrop():(i._disableDelayedDragEvents(),!s&&i.nativeDraggable&&(q.draggable=!0),i._triggerDragStart(t,e),U({sortable:i,name:"choose",originalEvent:t}),I(q,a.chosenClass,!0))},a.ignore.split(",").forEach(function(t){b(q,t.trim(),jt)}),h(l,"dragover",Xt),h(l,"mousemove",Xt),h(l,"touchmove",Xt),h(l,"mouseup",i._onDrop),h(l,"touchend",i._onDrop),h(l,"touchcancel",i._onDrop),s&&this.nativeDraggable&&(this.options.touchStartThreshold=4,q.draggable=!0),z("delayStart",this,{evt:t}),!a.delay||a.delayOnTouchOnly&&!e||this.nativeDraggable&&(w||y)?o():Bt.eventCanceled?this._onDrop():(h(l,"mouseup",i._disableDelayedDrag),h(l,"touchend",i._disableDelayedDrag),h(l,"touchcancel",i._disableDelayedDrag),h(l,"mousemove",i._delayedDragTouchMoveHandler),h(l,"touchmove",i._delayedDragTouchMoveHandler),a.supportPointer&&h(l,"pointermove",i._delayedDragTouchMoveHandler),i._dragStartTimer=setTimeout(o,a.delay)))},_delayedDragTouchMoveHandler:function(t){t=t.touches?t.touches[0]:t;Math.max(Math.abs(t.clientX-this._lastX),Math.abs(t.clientY-this._lastY))>=Math.floor(this.options.touchStartThreshold/(this.nativeDraggable&&window.devicePixelRatio||1))&&this._disableDelayedDrag()},_disableDelayedDrag:function(){q&&jt(q),clearTimeout(this._dragStartTimer),this._disableDelayedDragEvents()},_disableDelayedDragEvents:function(){var t=this.el.ownerDocument;f(t,"mouseup",this._disableDelayedDrag),f(t,"touchend",this._disableDelayedDrag),f(t,"touchcancel",this._disableDelayedDrag),f(t,"mousemove",this._delayedDragTouchMoveHandler),f(t,"touchmove",this._delayedDragTouchMoveHandler),f(t,"pointermove",this._delayedDragTouchMoveHandler)},_triggerDragStart:function(t,e){e=e||"touch"==t.pointerType&&t,!this.nativeDraggable||e?this.options.supportPointer?h(document,"pointermove",this._onTouchMove):h(document,e?"touchmove":"mousemove",this._onTouchMove):(h(q,"dragend",this),h($,"dragstart",this._onDragStart));try{document.selection?Lt(function(){document.selection.empty()}):window.getSelection().removeAllRanges()}catch(t){}},_dragStarted:function(t,e){var n;yt=!1,$&&q?(z("dragStarted",this,{evt:e}),this.nativeDraggable&&h(document,"dragover",Yt),n=this.options,t||I(q,n.dragClass,!1),I(q,n.ghostClass,!0),Bt.active=this,t&&this._appendGhost(),U({sortable:this,name:"start",originalEvent:e})):this._nulling()},_emulateDragOver:function(){if(ct){this._lastX=ct.clientX,this._lastY=ct.clientY,kt();for(var t=document.elementFromPoint(ct.clientX,ct.clientY),e=t;t&&t.shadowRoot&&(t=t.shadowRoot.elementFromPoint(ct.clientX,ct.clientY))!==e;)e=t;if(q.parentNode[j]._isOutsideThisEl(t),e)do{if(e[j])if(e[j]._onDragOver({clientX:ct.clientX,clientY:ct.clientY,target:t,rootEl:e})&&!this.options.dragoverBubble)break}while(e=(t=e).parentNode);Rt()}},_onTouchMove:function(t){if(st){var e=this.options,n=e.fallbackTolerance,o=e.fallbackOffset,i=t.touches?t.touches[0]:t,r=Z&&v(Z,!0),a=Z&&r&&r.a,l=Z&&r&&r.d,e=Ot&&bt&&E(bt),a=(i.clientX-st.clientX+o.x)/(a||1)+(e?e[0]-_t[0]:0)/(a||1),l=(i.clientY-st.clientY+o.y)/(l||1)+(e?e[1]-_t[1]:0)/(l||1);if(!Bt.active&&!yt){if(n&&Math.max(Math.abs(i.clientX-this._lastX),Math.abs(i.clientY-this._lastY))<n)return;this._onDragStart(t,!0)}Z&&(r?(r.e+=a-(ut||0),r.f+=l-(dt||0)):r={a:1,b:0,c:0,d:1,e:a,f:l},r="matrix(".concat(r.a,",").concat(r.b,",").concat(r.c,",").concat(r.d,",").concat(r.e,",").concat(r.f,")"),P(Z,"webkitTransform",r),P(Z,"mozTransform",r),P(Z,"msTransform",r),P(Z,"transform",r),ut=a,dt=l,ct=i),t.cancelable&&t.preventDefault()}},_appendGhost:function(){if(!Z){var t=this.options.fallbackOnBody?document.body:$,e=k(q,!0,Ot,!0,t),n=this.options;if(Ot){for(bt=t;"static"===P(bt,"position")&&"none"===P(bt,"transform")&&bt!==document;)bt=bt.parentNode;bt!==document.body&&bt!==document.documentElement?(bt===document&&(bt=O()),e.top+=bt.scrollTop,e.left+=bt.scrollLeft):bt=O(),_t=E(bt)}I(Z=q.cloneNode(!0),n.ghostClass,!1),I(Z,n.fallbackClass,!0),I(Z,n.dragClass,!0),P(Z,"transition",""),P(Z,"transform",""),P(Z,"box-sizing","border-box"),P(Z,"margin",0),P(Z,"top",e.top),P(Z,"left",e.left),P(Z,"width",e.width),P(Z,"height",e.height),P(Z,"opacity","0.8"),P(Z,"position",Ot?"absolute":"fixed"),P(Z,"zIndex","100000"),P(Z,"pointerEvents","none"),Bt.ghost=Z,t.appendChild(Z),P(Z,"transform-origin",ht/parseInt(Z.style.width)*100+"% "+ft/parseInt(Z.style.height)*100+"%")}},_onDragStart:function(t,e){var n=this,o=t.dataTransfer,i=n.options;z("dragStart",this,{evt:t}),Bt.eventCanceled?this._onDrop():(z("setupClone",this),Bt.eventCanceled||((tt=_(q)).removeAttribute("id"),tt.draggable=!1,tt.style["will-change"]="",this._hideClone(),I(tt,this.options.chosenClass,!1),Bt.clone=tt),n.cloneId=Lt(function(){z("clone",n),Bt.eventCanceled||(n.options.removeCloneOnHide||$.insertBefore(tt,q),n._hideClone(),U({sortable:n,name:"clone"}))}),e||I(q,i.dragClass,!0),e?(wt=!0,n._loopId=setInterval(n._emulateDragOver,50)):(f(document,"mouseup",n._onDrop),f(document,"touchend",n._onDrop),f(document,"touchcancel",n._onDrop),o&&(o.effectAllowed="move",i.setData&&i.setData.call(n,o,q)),h(document,"drop",n),P(q,"transform","translateZ(0)")),yt=!0,n._dragStartId=Lt(n._dragStarted.bind(n,e,t)),h(document,"selectstart",n),pt=!0,u&&P(document.body,"user-select","none"))},_onDragOver:function(n){var o,i,r,t,a=this.el,l=n.target,e=this.options,s=e.group,c=Bt.active,u=at===s,d=e.sort,h=lt||c,f=this,p=!1;if(!Ct){if(void 0!==n.preventDefault&&n.cancelable&&n.preventDefault(),l=N(l,e.draggable,a,!0),T("dragOver"),Bt.eventCanceled)return p;if(q.contains(n.target)||l.animated&&l.animatingX&&l.animatingY||f._ignoreWhileAnimating===l)return O(!1);if(wt=!1,c&&!e.disabled&&(u?d||(i=V!==$):lt===this||(this.lastPutMode=at.checkPull(this,c,q,n))&&s.checkPut(this,c,q,n))){if(r="vertical"===this._getDirection(n,l),o=k(q),T("dragOverValid"),Bt.eventCanceled)return p;if(i)return V=$,x(),this._hideClone(),T("revert"),Bt.eventCanceled||(Q?$.insertBefore(q,Q):$.appendChild(q)),O(!0);var g=Y(a,e.draggable);if(!g||function(t,e,n){n=k(Y(n.el,n.options.draggable));return e?t.clientX>n.right+10||t.clientX<=n.right&&t.clientY>n.bottom&&t.clientX>=n.left:t.clientX>n.right&&t.clientY>n.top||t.clientX<=n.right&&t.clientY>n.bottom+10}(n,r,this)&&!g.animated){if(g===q)return O(!1);if((l=g&&a===n.target?g:l)&&(w=k(l)),!1!==Ft($,a,q,o,l,w,n,!!l))return x(),g&&g.nextSibling?a.insertBefore(q,g.nextSibling):a.appendChild(q),V=a,A(),O(!0)}else if(g&&function(t,e,n){n=k(X(n.el,0,n.options,!0));return e?t.clientX<n.left-10||t.clientY<n.top&&t.clientX<n.right:t.clientY<n.top-10||t.clientY<n.bottom&&t.clientX<n.left}(n,r,this)){var m=X(a,0,e,!0);if(m===q)return O(!1);if(w=k(l=m),!1!==Ft($,a,q,o,l,w,n,!1))return x(),a.insertBefore(q,m),V=a,A(),O(!0)}else if(l.parentNode===a){var v,b,y,w=k(l),E=q.parentNode!==a,D=(D=q.animated&&q.toRect||o,C=l.animated&&l.toRect||w,S=(t=r)?D.left:D.top,s=t?D.right:D.bottom,g=t?D.width:D.height,m=t?C.left:C.top,D=t?C.right:C.bottom,C=t?C.width:C.height,!(S===m||s===D||S+g/2===m+C/2)),S=r?"top":"left",g=R(l,"top","top")||R(q,"top","top"),m=g?g.scrollTop:void 0;if(gt!==l&&(b=w[S],Dt=!1,St=!D&&e.invertSwap||E),0!==(v=function(t,e,n,o,i,r,a,l){var s=o?t.clientY:t.clientX,c=o?n.height:n.width,t=o?n.top:n.left,o=o?n.bottom:n.right,n=!1;if(!a)if(l&&vt<c*i){if(Dt=!Dt&&(1===mt?t+c*r/2<s:s<o-c*r/2)?!0:Dt)n=!0;else if(1===mt?s<t+vt:o-vt<s)return-mt}else if(t+c*(1-i)/2<s&&s<o-c*(1-i)/2)return function(t){return B(q)<B(t)?1:-1}(e);if((n=n||a)&&(s<t+c*r/2||o-c*r/2<s))return t+c/2<s?1:-1;return 0}(n,l,w,r,D?1:e.swapThreshold,null==e.invertedSwapThreshold?e.swapThreshold:e.invertedSwapThreshold,St,gt===l)))for(var _=B(q);(y=V.children[_-=v])&&("none"===P(y,"display")||y===Z););if(0===v||y===l)return O(!1);mt=v;var C=(gt=l).nextElementSibling,E=!1,D=Ft($,a,q,o,l,w,n,E=1===v);if(!1!==D)return 1!==D&&-1!==D||(E=1===D),Ct=!0,setTimeout(Ht,30),x(),E&&!C?a.appendChild(q):l.parentNode.insertBefore(q,E?C:l),g&&F(g,0,m-g.scrollTop),V=q.parentNode,void 0===b||St||(vt=Math.abs(b-k(l)[S])),A(),O(!0)}if(a.contains(q))return O(!1)}return!1}function T(t,e){z(t,f,M({evt:n,isOwner:u,axis:r?"vertical":"horizontal",revert:i,dragRect:o,targetRect:w,canSort:d,fromSortable:h,target:l,completed:O,onMove:function(t,e){return Ft($,a,q,o,t,k(t),n,e)},changed:A},e))}function x(){T("dragOverAnimationCapture"),f.captureAnimationState(),f!==h&&h.captureAnimationState()}function O(t){return T("dragOverCompleted",{insertion:t}),t&&(u?c._hideClone():c._showClone(f),f!==h&&(I(q,(lt||c).options.ghostClass,!1),I(q,e.ghostClass,!0)),lt!==f&&f!==Bt.active?lt=f:f===Bt.active&&lt&&(lt=null),h===f&&(f._ignoreWhileAnimating=l),f.animateAll(function(){T("dragOverAnimationComplete"),f._ignoreWhileAnimating=null}),f!==h&&(h.animateAll(),h._ignoreWhileAnimating=null)),(l===q&&!q.animated||l===a&&!l.animated)&&(gt=null),e.dragoverBubble||n.rootEl||l===document||(q.parentNode[j]._isOutsideThisEl(n.target),t||Xt(n)),!e.dragoverBubble&&n.stopPropagation&&n.stopPropagation(),p=!0}function A(){ot=B(q),rt=B(q,e.draggable),U({sortable:f,name:"change",toEl:a,newIndex:ot,newDraggableIndex:rt,originalEvent:n})}},_ignoreWhileAnimating:null,_offMoveEvents:function(){f(document,"mousemove",this._onTouchMove),f(document,"touchmove",this._onTouchMove),f(document,"pointermove",this._onTouchMove),f(document,"dragover",Xt),f(document,"mousemove",Xt),f(document,"touchmove",Xt)},_offUpEvents:function(){var t=this.el.ownerDocument;f(t,"mouseup",this._onDrop),f(t,"touchend",this._onDrop),f(t,"pointerup",this._onDrop),f(t,"touchcancel",this._onDrop),f(document,"selectstart",this)},_onDrop:function(t){var e=this.el,n=this.options;ot=B(q),rt=B(q,n.draggable),z("drop",this,{evt:t}),V=q&&q.parentNode,ot=B(q),rt=B(q,n.draggable),Bt.eventCanceled||(Dt=St=yt=!1,clearInterval(this._loopId),clearTimeout(this._dragStartTimer),Kt(this.cloneId),Kt(this._dragStartId),this.nativeDraggable&&(f(document,"drop",this),f(e,"dragstart",this._onDragStart)),this._offMoveEvents(),this._offUpEvents(),u&&P(document.body,"user-select",""),P(q,"transform",""),t&&(pt&&(t.cancelable&&t.preventDefault(),n.dropBubble||t.stopPropagation()),Z&&Z.parentNode&&Z.parentNode.removeChild(Z),($===V||lt&&"clone"!==lt.lastPutMode)&&tt&&tt.parentNode&&tt.parentNode.removeChild(tt),q&&(this.nativeDraggable&&f(q,"dragend",this),jt(q),q.style["will-change"]="",pt&&!yt&&I(q,(lt||this).options.ghostClass,!1),I(q,this.options.chosenClass,!1),U({sortable:this,name:"unchoose",toEl:V,newIndex:null,newDraggableIndex:null,originalEvent:t}),$!==V?(0<=ot&&(U({rootEl:V,name:"add",toEl:V,fromEl:$,originalEvent:t}),U({sortable:this,name:"remove",toEl:V,originalEvent:t}),U({rootEl:V,name:"sort",toEl:V,fromEl:$,originalEvent:t}),U({sortable:this,name:"sort",toEl:V,originalEvent:t})),lt&&lt.save()):ot!==nt&&0<=ot&&(U({sortable:this,name:"update",toEl:V,originalEvent:t}),U({sortable:this,name:"sort",toEl:V,originalEvent:t})),Bt.active&&(null!=ot&&-1!==ot||(ot=nt,rt=it),U({sortable:this,name:"end",toEl:V,originalEvent:t}),this.save())))),this._nulling()},_nulling:function(){z("nulling",this),$=q=V=Z=Q=tt=J=et=st=ct=pt=ot=rt=nt=it=gt=mt=lt=at=Bt.dragged=Bt.ghost=Bt.clone=Bt.active=null,Tt.forEach(function(t){t.checked=!0}),Tt.length=ut=dt=0},handleEvent:function(t){switch(t.type){case"drop":case"dragend":this._onDrop(t);break;case"dragenter":case"dragover":q&&(this._onDragOver(t),function(t){t.dataTransfer&&(t.dataTransfer.dropEffect="move");t.cancelable&&t.preventDefault()}(t));break;case"selectstart":t.preventDefault()}},toArray:function(){for(var t,e=[],n=this.el.children,o=0,i=n.length,r=this.options;o<i;o++)N(t=n[o],r.draggable,this.el,!1)&&e.push(t.getAttribute(r.dataIdAttr)||function(t){var e=t.tagName+t.className+t.src+t.href+t.textContent,n=e.length,o=0;for(;n--;)o+=e.charCodeAt(n);return o.toString(36)}(t));return e},sort:function(t,e){var n={},o=this.el;this.toArray().forEach(function(t,e){e=o.children[e];N(e,this.options.draggable,o,!1)&&(n[t]=e)},this),e&&this.captureAnimationState(),t.forEach(function(t){n[t]&&(o.removeChild(n[t]),o.appendChild(n[t]))}),e&&this.animateAll()},save:function(){var t=this.options.store;t&&t.set&&t.set(this)},closest:function(t,e){return N(t,e||this.options.draggable,this.el,!1)},option:function(t,e){var n=this.options;if(void 0===e)return n[t];var o=K.modifyOption(this,t,e);n[t]=void 0!==o?o:e,"group"===t&&Pt(n)},destroy:function(){z("destroy",this);var t=this.el;t[j]=null,f(t,"mousedown",this._onTapStart),f(t,"touchstart",this._onTapStart),f(t,"pointerdown",this._onTapStart),this.nativeDraggable&&(f(t,"dragover",this),f(t,"dragenter",this)),Array.prototype.forEach.call(t.querySelectorAll("[draggable]"),function(t){t.removeAttribute("draggable")}),this._onDrop(),this._disableDelayedDragEvents(),Et.splice(Et.indexOf(this.el),1),this.el=t=null},_hideClone:function(){et||(z("hideClone",this),Bt.eventCanceled||(P(tt,"display","none"),this.options.removeCloneOnHide&&tt.parentNode&&tt.parentNode.removeChild(tt),et=!0))},_showClone:function(t){"clone"===t.lastPutMode?et&&(z("showClone",this),Bt.eventCanceled||(q.parentNode!=$||this.options.group.revertClone?Q?$.insertBefore(tt,Q):$.appendChild(tt):$.insertBefore(tt,q),this.options.group.revertClone&&this.animate(q,tt),P(tt,"display",""),et=!1)):this._hideClone()}},xt&&h(document,"touchmove",function(t){(Bt.active||yt)&&t.cancelable&&t.preventDefault()}),Bt.utils={on:h,off:f,css:P,find:b,is:function(t,e){return!!N(t,e,t,!1)},extend:function(t,e){if(t&&e)for(var n in e)e.hasOwnProperty(n)&&(t[n]=e[n]);return t},throttle:S,closest:N,toggleClass:I,clone:_,index:B,nextTick:Lt,cancelNextTick:Kt,detectDirection:It,getChild:X},Bt.get=function(t){return t[j]},Bt.mount=function(){for(var t=arguments.length,e=new Array(t),n=0;n<t;n++)e[n]=arguments[n];(e=e[0].constructor===Array?e[0]:e).forEach(function(t){if(!t.prototype||!t.prototype.constructor)throw"Sortable: Mounted plugin must be a constructor function, not ".concat({}.toString.call(t));t.utils&&(Bt.utils=M(M({},Bt.utils),t.utils)),K.mount(t)})},Bt.create=function(t,e){return new Bt(t,e)};var Wt,zt,Gt,Ut,qt,Vt,Zt=[],$t=!(Bt.version="1.15.0");function Qt(){Zt.forEach(function(t){clearInterval(t.pid)}),Zt=[]}function Jt(){clearInterval(Vt)}var te,ee=S(function(n,t,e,o){if(t.scroll){var i,r=(n.touches?n.touches[0]:n).clientX,a=(n.touches?n.touches[0]:n).clientY,l=t.scrollSensitivity,s=t.scrollSpeed,c=O(),u=!1;zt!==e&&(zt=e,Qt(),Wt=t.scroll,i=t.scrollFn,!0===Wt&&(Wt=A(e,!0)));var d=0,h=Wt;do{var f=h,p=k(f),g=p.top,m=p.bottom,v=p.left,b=p.right,y=p.width,w=p.height,E=void 0,D=void 0,S=f.scrollWidth,_=f.scrollHeight,C=P(f),T=f.scrollLeft,p=f.scrollTop,D=f===c?(E=y<S&&("auto"===C.overflowX||"scroll"===C.overflowX||"visible"===C.overflowX),w<_&&("auto"===C.overflowY||"scroll"===C.overflowY||"visible"===C.overflowY)):(E=y<S&&("auto"===C.overflowX||"scroll"===C.overflowX),w<_&&("auto"===C.overflowY||"scroll"===C.overflowY)),T=E&&(Math.abs(b-r)<=l&&T+y<S)-(Math.abs(v-r)<=l&&!!T),p=D&&(Math.abs(m-a)<=l&&p+w<_)-(Math.abs(g-a)<=l&&!!p);if(!Zt[d])for(var x=0;x<=d;x++)Zt[x]||(Zt[x]={});Zt[d].vx==T&&Zt[d].vy==p&&Zt[d].el===f||(Zt[d].el=f,Zt[d].vx=T,Zt[d].vy=p,clearInterval(Zt[d].pid),0==T&&0==p||(u=!0,Zt[d].pid=setInterval(function(){o&&0===this.layer&&Bt.active._onTouchMove(qt);var t=Zt[this.layer].vy?Zt[this.layer].vy*s:0,e=Zt[this.layer].vx?Zt[this.layer].vx*s:0;"function"==typeof i&&"continue"!==i.call(Bt.dragged.parentNode[j],e,t,n,qt,Zt[this.layer].el)||F(Zt[this.layer].el,e,t)}.bind({layer:d}),24))),d++}while(t.bubbleScroll&&h!==c&&(h=A(h,!1)));$t=u}},30),c=function(t){var e=t.originalEvent,n=t.putSortable,o=t.dragEl,i=t.activeSortable,r=t.dispatchSortableEvent,a=t.hideGhostForTarget,t=t.unhideGhostForTarget;e&&(i=n||i,a(),e=e.changedTouches&&e.changedTouches.length?e.changedTouches[0]:e,e=document.elementFromPoint(e.clientX,e.clientY),t(),i&&!i.el.contains(e)&&(r("spill"),this.onSpill({dragEl:o,putSortable:n})))};function ne(){}function oe(){}ne.prototype={startIndex:null,dragStart:function(t){t=t.oldDraggableIndex;this.startIndex=t},onSpill:function(t){var e=t.dragEl,n=t.putSortable;this.sortable.captureAnimationState(),n&&n.captureAnimationState();t=X(this.sortable.el,this.startIndex,this.options);t?this.sortable.el.insertBefore(e,t):this.sortable.el.appendChild(e),this.sortable.animateAll(),n&&n.animateAll()},drop:c},a(ne,{pluginName:"revertOnSpill"}),oe.prototype={onSpill:function(t){var e=t.dragEl,t=t.putSortable||this.sortable;t.captureAnimationState(),e.parentNode&&e.parentNode.removeChild(e),t.animateAll()},drop:c},a(oe,{pluginName:"removeOnSpill"});var ie,re,ae,le,se,ce=[],ue=[],de=!1,he=!1,fe=!1;function pe(n,o){ue.forEach(function(t,e){e=o.children[t.sortableIndex+(n?Number(e):0)];e?o.insertBefore(t,e):o.appendChild(t)})}function ge(){ce.forEach(function(t){t!==ae&&t.parentNode&&t.parentNode.removeChild(t)})}return Bt.mount(new function(){function t(){for(var t in this.defaults={scroll:!0,forceAutoScrollFallback:!1,scrollSensitivity:30,scrollSpeed:10,bubbleScroll:!0},this)"_"===t.charAt(0)&&"function"==typeof this[t]&&(this[t]=this[t].bind(this))}return t.prototype={dragStarted:function(t){t=t.originalEvent;this.sortable.nativeDraggable?h(document,"dragover",this._handleAutoScroll):this.options.supportPointer?h(document,"pointermove",this._handleFallbackAutoScroll):t.touches?h(document,"touchmove",this._handleFallbackAutoScroll):h(document,"mousemove",this._handleFallbackAutoScroll)},dragOverCompleted:function(t){t=t.originalEvent;this.options.dragOverBubble||t.rootEl||this._handleAutoScroll(t)},drop:function(){this.sortable.nativeDraggable?f(document,"dragover",this._handleAutoScroll):(f(document,"pointermove",this._handleFallbackAutoScroll),f(document,"touchmove",this._handleFallbackAutoScroll),f(document,"mousemove",this._handleFallbackAutoScroll)),Jt(),Qt(),clearTimeout(g),g=void 0},nulling:function(){qt=zt=Wt=$t=Vt=Gt=Ut=null,Zt.length=0},_handleFallbackAutoScroll:function(t){this._handleAutoScroll(t,!0)},_handleAutoScroll:function(e,n){var o,i=this,r=(e.touches?e.touches[0]:e).clientX,a=(e.touches?e.touches[0]:e).clientY,t=document.elementFromPoint(r,a);qt=e,n||this.options.forceAutoScrollFallback||w||y||u?(ee(e,this.options,t,n),o=A(t,!0),!$t||Vt&&r===Gt&&a===Ut||(Vt&&Jt(),Vt=setInterval(function(){var t=A(document.elementFromPoint(r,a),!0);t!==o&&(o=t,Qt()),ee(e,i.options,t,n)},10),Gt=r,Ut=a)):this.options.bubbleScroll&&A(t,!0)!==O()?ee(e,this.options,A(t,!1),!1):Qt()}},a(t,{pluginName:"scroll",initializeByDefault:!0})}),Bt.mount(oe,ne),Bt.mount(new function(){function t(){this.defaults={swapClass:"sortable-swap-highlight"}}return t.prototype={dragStart:function(t){t=t.dragEl;te=t},dragOverValid:function(t){var e=t.completed,n=t.target,o=t.onMove,i=t.activeSortable,r=t.changed,a=t.cancel;i.options.swap&&(t=this.sortable.el,i=this.options,n&&n!==t&&(t=te,te=!1!==o(n)?(I(n,i.swapClass,!0),n):null,t&&t!==te&&I(t,i.swapClass,!1)),r(),e(!0),a())},drop:function(t){var e,n,o=t.activeSortable,i=t.putSortable,r=t.dragEl,a=i||this.sortable,l=this.options;te&&I(te,l.swapClass,!1),te&&(l.swap||i&&i.options.swap)&&r!==te&&(a.captureAnimationState(),a!==o&&o.captureAnimationState(),n=te,t=(e=r).parentNode,l=n.parentNode,t&&l&&!t.isEqualNode(n)&&!l.isEqualNode(e)&&(i=B(e),r=B(n),t.isEqualNode(l)&&i<r&&r++,t.insertBefore(n,t.children[i]),l.insertBefore(e,l.children[r])),a.animateAll(),a!==o&&o.animateAll())},nulling:function(){te=null}},a(t,{pluginName:"swap",eventProperties:function(){return{swapItem:te}}})}),Bt.mount(new function(){function t(o){for(var t in this)"_"===t.charAt(0)&&"function"==typeof this[t]&&(this[t]=this[t].bind(this));o.options.avoidImplicitDeselect||(o.options.supportPointer?h(document,"pointerup",this._deselectMultiDrag):(h(document,"mouseup",this._deselectMultiDrag),h(document,"touchend",this._deselectMultiDrag))),h(document,"keydown",this._checkKeyDown),h(document,"keyup",this._checkKeyUp),this.defaults={selectedClass:"sortable-selected",multiDragKey:null,avoidImplicitDeselect:!1,setData:function(t,e){var n="";ce.length&&re===o?ce.forEach(function(t,e){n+=(e?", ":"")+t.textContent}):n=e.textContent,t.setData("Text",n)}}}return t.prototype={multiDragKeyDown:!1,isMultiDrag:!1,delayStartGlobal:function(t){t=t.dragEl;ae=t},delayEnded:function(){this.isMultiDrag=~ce.indexOf(ae)},setupClone:function(t){var e=t.sortable,t=t.cancel;if(this.isMultiDrag){for(var n=0;n<ce.length;n++)ue.push(_(ce[n])),ue[n].sortableIndex=ce[n].sortableIndex,ue[n].draggable=!1,ue[n].style["will-change"]="",I(ue[n],this.options.selectedClass,!1),ce[n]===ae&&I(ue[n],this.options.chosenClass,!1);e._hideClone(),t()}},clone:function(t){var e=t.sortable,n=t.rootEl,o=t.dispatchSortableEvent,t=t.cancel;this.isMultiDrag&&(this.options.removeCloneOnHide||ce.length&&re===e&&(pe(!0,n),o("clone"),t()))},showClone:function(t){var e=t.cloneNowShown,n=t.rootEl,t=t.cancel;this.isMultiDrag&&(pe(!1,n),ue.forEach(function(t){P(t,"display","")}),e(),se=!1,t())},hideClone:function(t){var e=this,n=(t.sortable,t.cloneNowHidden),t=t.cancel;this.isMultiDrag&&(ue.forEach(function(t){P(t,"display","none"),e.options.removeCloneOnHide&&t.parentNode&&t.parentNode.removeChild(t)}),n(),se=!0,t())},dragStartGlobal:function(t){t.sortable;!this.isMultiDrag&&re&&re.multiDrag._deselectMultiDrag(),ce.forEach(function(t){t.sortableIndex=B(t)}),ce=ce.sort(function(t,e){return t.sortableIndex-e.sortableIndex}),fe=!0},dragStarted:function(t){var e,n=this,t=t.sortable;this.isMultiDrag&&(this.options.sort&&(t.captureAnimationState(),this.options.animation&&(ce.forEach(function(t){t!==ae&&P(t,"position","absolute")}),e=k(ae,!1,!0,!0),ce.forEach(function(t){t!==ae&&C(t,e)}),de=he=!0)),t.animateAll(function(){de=he=!1,n.options.animation&&ce.forEach(function(t){T(t)}),n.options.sort&&ge()}))},dragOver:function(t){var e=t.target,n=t.completed,t=t.cancel;he&&~ce.indexOf(e)&&(n(!1),t())},revert:function(t){var n,o,e=t.fromSortable,i=t.rootEl,r=t.sortable,a=t.dragRect;1<ce.length&&(ce.forEach(function(t){r.addAnimationState({target:t,rect:he?k(t):a}),T(t),t.fromRect=a,e.removeAnimationState(t)}),he=!1,n=!this.options.removeCloneOnHide,o=i,ce.forEach(function(t,e){e=o.children[t.sortableIndex+(n?Number(e):0)];e?o.insertBefore(t,e):o.appendChild(t)}))},dragOverCompleted:function(t){var e,n=t.sortable,o=t.isOwner,i=t.insertion,r=t.activeSortable,a=t.parentEl,l=t.putSortable,t=this.options;i&&(o&&r._hideClone(),de=!1,t.animation&&1<ce.length&&(he||!o&&!r.options.sort&&!l)&&(e=k(ae,!1,!0,!0),ce.forEach(function(t){t!==ae&&(C(t,e),a.appendChild(t))}),he=!0),o||(he||ge(),1<ce.length?(o=se,r._showClone(n),r.options.animation&&!se&&o&&ue.forEach(function(t){r.addAnimationState({target:t,rect:le}),t.fromRect=le,t.thisAnimationDuration=null})):r._showClone(n)))},dragOverAnimationCapture:function(t){var e=t.dragRect,n=t.isOwner,t=t.activeSortable;ce.forEach(function(t){t.thisAnimationDuration=null}),t.options.animation&&!n&&t.multiDrag.isMultiDrag&&(le=a({},e),e=v(ae,!0),le.top-=e.f,le.left-=e.e)},dragOverAnimationComplete:function(){he&&(he=!1,ge())},drop:function(t){var e=t.originalEvent,n=t.rootEl,o=t.parentEl,i=t.sortable,r=t.dispatchSortableEvent,a=t.oldIndex,l=t.putSortable,s=l||this.sortable;if(e){var c,u,d,h=this.options,f=o.children;if(!fe)if(h.multiDragKey&&!this.multiDragKeyDown&&this._deselectMultiDrag(),I(ae,h.selectedClass,!~ce.indexOf(ae)),~ce.indexOf(ae))ce.splice(ce.indexOf(ae),1),ie=null,W({sortable:i,rootEl:n,name:"deselect",targetEl:ae,originalEvent:e});else{if(ce.push(ae),W({sortable:i,rootEl:n,name:"select",targetEl:ae,originalEvent:e}),e.shiftKey&&ie&&i.el.contains(ie)){var p=B(ie),t=B(ae);if(~p&&~t&&p!==t)for(var g,m=p<t?(g=p,t):(g=t,p+1);g<m;g++)~ce.indexOf(f[g])||(I(f[g],h.selectedClass,!0),ce.push(f[g]),W({sortable:i,rootEl:n,name:"select",targetEl:f[g],originalEvent:e}))}else ie=ae;re=s}fe&&this.isMultiDrag&&(he=!1,(o[j].options.sort||o!==n)&&1<ce.length&&(c=k(ae),u=B(ae,":not(."+this.options.selectedClass+")"),!de&&h.animation&&(ae.thisAnimationDuration=null),s.captureAnimationState(),de||(h.animation&&(ae.fromRect=c,ce.forEach(function(t){var e;t.thisAnimationDuration=null,t!==ae&&(e=he?k(t):c,t.fromRect=e,s.addAnimationState({target:t,rect:e}))})),ge(),ce.forEach(function(t){f[u]?o.insertBefore(t,f[u]):o.appendChild(t),u++}),a===B(ae)&&(d=!1,ce.forEach(function(t){t.sortableIndex!==B(t)&&(d=!0)}),d&&r("update"))),ce.forEach(function(t){T(t)}),s.animateAll()),re=s),(n===o||l&&"clone"!==l.lastPutMode)&&ue.forEach(function(t){t.parentNode&&t.parentNode.removeChild(t)})}},nullingGlobal:function(){this.isMultiDrag=fe=!1,ue.length=0},destroyGlobal:function(){this._deselectMultiDrag(),f(document,"pointerup",this._deselectMultiDrag),f(document,"mouseup",this._deselectMultiDrag),f(document,"touchend",this._deselectMultiDrag),f(document,"keydown",this._checkKeyDown),f(document,"keyup",this._checkKeyUp)},_deselectMultiDrag:function(t){if(!(void 0!==fe&&fe||re!==this.sortable||t&&N(t.target,this.options.draggable,this.sortable.el,!1)||t&&0!==t.button))for(;ce.length;){var e=ce[0];I(e,this.options.selectedClass,!1),ce.shift(),W({sortable:this.sortable,rootEl:this.sortable.el,name:"deselect",targetEl:e,originalEvent:t})}},_checkKeyDown:function(t){t.key===this.options.multiDragKey&&(this.multiDragKeyDown=!0)},_checkKeyUp:function(t){t.key===this.options.multiDragKey&&(this.multiDragKeyDown=!1)}},a(t,{pluginName:"multiDrag",utils:{select:function(t){var e=t.parentNode[j];e&&e.options.multiDrag&&!~ce.indexOf(t)&&(re&&re!==e&&(re.multiDrag._deselectMultiDrag(),re=e),I(t,e.options.selectedClass,!0),ce.push(t))},deselect:function(t){var e=t.parentNode[j],n=ce.indexOf(t);e&&e.options.multiDrag&&~n&&(I(t,e.options.selectedClass,!1),ce.splice(n,1))}},eventProperties:function(){var n=this,o=[],i=[];return ce.forEach(function(t){var e;o.push({multiDragElement:t,index:t.sortableIndex}),e=he&&t!==ae?-1:he?B(t,":not(."+n.options.selectedClass+")"):B(t),i.push({multiDragElement:t,index:e})}),{items:r(ce),clones:[].concat(ue),oldIndicies:o,newIndicies:i}},optionListeners:{multiDragKey:function(t){return"ctrl"===(t=t.toLowerCase())?t="Control":1<t.length&&(t=t.charAt(0).toUpperCase()+t.substr(1)),t}}})}),Bt});;
(function ($) {
  // Handle drag drop question.
  function runDragDropTestElement() {
    var  onSpill = false;
    // Loop for each drag panel
    $('.drag-panel__list-answer').each(function (index, el) {
      var id_question = $(this).data('id');
      sharedName = `shared-${id_question}`;
      parentDragList = this;
      new Sortable(this, {
        revertOnSpill: true, // Enable plugin
        // Called when item is spilled
        onSpill: function (/**Event*/evt) {
          evt.item // The spilled item
        },
        sort: false,
        group: sharedName, // set both lists to same group
        swap: true, // Enable swap plugin
        animation: 150,
        onEnd: function (/**Event*/evt) {
          $('.drag-panel .spilled').remove();

          var itemEl = evt.item;  // dragged HTMLElement
          updateTestPanel(evt.to);
          onSpill = false;
          $(evt.to).addClass('active');
          evt.to;    // target list
          evt.from;  // previous list
          evt.oldIndex;  // element's old index within old parent
          evt.newIndex;  // element's new index within new parent
          evt.oldDraggableIndex; // element's old index within old parent, only counting draggable elements
          evt.newDraggableIndex; // element's new index within new parent, only counting draggable elements
          evt.clone // the clone element
          evt.pullMode;  // when item is in another sortable: `"clone"` if cloning, `true` if moving
        }
      });

      // Loop for each drag answer input element
      $('.drag-panel__group-' + id_question).each(function (index, el) {
        var itemId = this.id;
        var inputItemBlock = document.getElementById(itemId);
        var parentRep = parentDragList;
        new Sortable(this, {
          removeOnSpill: true, // Enable plugin
          // Called when item is spilled
          onSpill: function (/**Event*/evt) {
            onSpill = true;
            const emptyNode = document.createElement("div");

            emptyNode.classList.add('drag-panel__list-group-item', 'spilled');
            setTimeout(function () {
              parentRep.appendChild(evt.item);
              inputItemBlock.appendChild(emptyNode);
            }, 0)

            evt.item // The spilled item

          },
          swap: true, // Enable swap plugin
          group: sharedName,
          animation: 150,
          onEnd: function (/**Event*/evt) {
            var itemEl = evt.item;  // dragged HTMLElement
            if($(evt.from).is($(evt.to)) && onSpill == true) {
              $(evt.from).removeClass('active');
            }
            else if($(evt.from).is($(evt.to)) && !$(evt.from).children().hasClass('spilled')) {
              $(evt.to).addClass('active');
            }
            else if($(evt.from).hasClass('active') && !$(evt.to).hasClass('active')) {
              if($(evt.to).is('.drag-panel__list-answer')) {
                $(evt.from).addClass('active')
              } else {
                $(evt.from).removeClass('active');
              }
              $(evt.to).addClass('active');

            } else if(!$(evt.from).hasClass('active') && $(evt.to).hasClass('active')) {
              $(evt.from).addClass('active');
              $(evt.to).removeClass('active');
            }
            onSpill = false;
            updateTestPanel(evt.to);
            updateTestPanel(evt.from);
            evt.to;    // target list
            evt.from;  // previous list
            evt.oldIndex;  // element's old index within old parent
            evt.newIndex;  // element's new index within new parent
            evt.oldDraggableIndex; // element's old index within old parent, only counting draggable elements
            evt.newDraggableIndex; // element's new index within new parent, only counting draggable elements
            evt.clone // the clone element
            evt.pullMode;  // when item is in another sortable: `"clone"` if cloning, `true` if moving
          },
          onRemove: function (/**Event*/evt) {
            console.log('Element removed!')
          },
        });
      });

    });
  }

  // Update test panel.
  function updateTestPanel(item) {
    var numberQuestion = $(item).data('num');
    var answer = $(item).children('.drag-panel__list-group-item').text();
    var dropdown = $('select[data-num="' + numberQuestion + '"]');
    dropdown.val(answer);
    // set value for dropdown.
    var questionPalette = '#question-palette-table .question-palette__item';
    if (!$(questionPalette + '[data-num="' + numberQuestion + '"]').length) {
      return;
    }
    var parent = $(item).closest('.test-panel__answer');
    var itemsSpilled = parent.find('.drag-panel__drag-answer-input[data-num=' + numberQuestion + '] .drag-panel__list-group-item:not(.spilled)').length;

    if (itemsSpilled) {
      $(questionPalette + '[data-num="' + numberQuestion + '"]').addClass('-checked').attr('data-answer', answer);
    }
    else {
      $(questionPalette + '[data-num="' + numberQuestion + '"]').removeClass('-checked').removeAttr('data-answer');
    }
    // Update answered questions in list question palette.
    Drupal.updateAnsweredQuestions();
  }

  function handleDropdown() {
    $('.iot-drag-drop_dropdown').change(function (index, el) {
      var parent = $(this).closest('.test-panel__item');
      var selectValue = $(this).val();
      var numberQuestion = $(this).data('num');
      var drag_drop_question = parent.find('.drag-panel__drag-answer-input[data-num="' + numberQuestion + '"]');
      var drag_drop_item = drag_drop_question.find('.drag-panel__list-group-item');
      var drag_panel_item = parent.find('.drag-panel .drag-panel__list-group-item');
      var drag_panel_item_group = parent.find('.drag-panel .drag-panel__list-answer');
      var questionPalette = '#question-palette-table .question-palette__item';
      var value_old  = $(questionPalette + '[data-num="' + numberQuestion + '"]').attr('data-answer');
      if (selectValue) {
        $(questionPalette + '[data-num="' + numberQuestion + '"]').addClass('-checked').attr('data-answer', selectValue);
      }
      else {
        $(questionPalette + '[data-num="' + numberQuestion + '"]').removeClass('-checked').removeAttr('data-answer');
      }

      // Update answered questions in list question palette.
      Drupal.updateAnsweredQuestions();

      if (!parent.hasClass('removed-drag')) {
        return;
      }
      if (value_old !== undefined) {
        drag_panel_item_group.append('<div class="drag-panel__list-group-item">' + value_old + '</div>');
      }
      drag_drop_item.addClass('spilled').html('').removeAttr('draggable');
      drag_drop_question.removeClass('active');
      // Find element in drag panel have text equal answer and remove element.
      drag_panel_item.each(function (index, el) {
        if ($(this).text() === selectValue) {
          drag_drop_item.removeClass('spilled').attr('draggable', 'false').html(selectValue);
          $(this).remove();
          drag_drop_question.addClass('active');
          // break loop.
          return false;
        }
      })

    });
  }

  // Switch to Drag and Drop and Dropdown.
  function fixDragAndDrop() {
    $('.drag-panel__suggest-link').click(function (event) {
      var parent = $(this).closest('.test-panel__item');
      parent.toggleClass('removed-drag');
      if (!parent.hasClass('removed-drag')) {
        var question_drag_drop = parent.find('.drag-panel__drag-answer-input');

        question_drag_drop.each(function () {
          var numberQuestion = $(this).data('num');
          if ($(this).find('.drag-panel__list-group-item.spilled').length) {
            parent.find('select[data-num="' + numberQuestion + '"]').val('');
            var questionPalette = '#question-palette-table .question-palette__item';
            $(questionPalette + '[data-num="' + numberQuestion + '"]').removeClass('-checked').removeAttr('data-answer');
            // Update answered questions in list question palette.
            Drupal.updateAnsweredQuestions();
          }
        })
      }
      $(this).toggleClass('active');
      if ($(this).hasClass('active')) {
        $(this).text('Back to Drag and Drop');
      }
      else {
        $(this).text('Fix Drag & Drop');
      }
    });
  }

  Drupal.behaviors.QuestionDragDrop = {
    attach: function (context, settings) {
      fixDragAndDrop();
      runDragDropTestElement();
      handleDropdown();
    }
  }
})(jQuery, Drupal, drupalSettings);

;
(function ($, Drupal, drupalSettings) {
  "use strict";
  // -------- GLOBAL variables --------
  var tooltipVisible = false;
  var previousRange = null;
  var totalTestPart = $('.question-palette__part').length;
  var userSelectedRange = '';
  var clickOutNotetHandler;
  var noting = false;
  var originalNoteContent = '';
  var noteString = '';
  var noteTimestamp = '';
  var noteInput = $('#js-note-content');
  var highlightTooltip = $('#highlight-box');
  var highlighterContent = $('#highlighter-contents');
  var currentActivePart = $('.question-palette__part.-active').data('part');
  var NoteIds = [];
  var newAddedNote = 0;
  var notes = [];
  var noteSerialized = {};
  var initNiceScroll = false;
  var timer;
  var iosCheck = isiPhoneOriPad();
  var quiz_id;
  // -------- End GLOBAL variables --------
  function isiPhoneOriPad() {
    var userAgent = navigator.userAgent;
    var isiPhone = /iPhone/i.test(userAgent);
    var isiPad = /iPad/i.test(userAgent);
    var iOS13_iPad = (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return isiPhone || isiPad || iOS13_iPad;
  }

  function checkMobileTablet() {
    // Check iphone/ipad, mobile, tablet.
    var isTablet = false;
    var isMobileAndroid = false;
    var isMobile = false;

    // Get the User-Agent string
    var userAgent = navigator.userAgent.toLowerCase();
    // Detect if the device is a tablet
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
      isTablet = true;
    }
    if (/mobile/i.test(userAgent)) {
      isMobile = true;
    }
    // Detect if the device is a mobile Android device
    if (/android/i.test(userAgent) && /mobile/i.test(userAgent)) {
      isMobileAndroid = true;
    }
    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    var iOS13_iPad = (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS || iOS13_iPad || isMobileAndroid || isTablet || isMobile) {
      return true;
    }
    return false;
  }
  var generateQuizMode = function () {
    var mode = drupalSettings.take_test.mode;
    var quiz_id = drupalSettings.take_test.quiz_id;
    // Random string for quiz id.
    var random_string = Math.random().toString(36).substring(2, 15);
    return quiz_id + '_' + random_string + '_' + mode;
  }

  Drupal.getQuizMode = function () {
    if (quiz_id) {
      return quiz_id;
    }
    quiz_id = generateQuizMode();
  }
  // Get quiz mode.
  Drupal.getQuizMode();

  // Define countdown timer prototype
  Drupal.CountDownTimer = function (duration, duration_default, granularity) {
    this.duration = duration;
    this.granularity = granularity || 1000;
    this.tickFtns = [];
    this.running = false;
    this.pending = false;
    this.diff = parseInt(duration);
    this.duration_default = duration_default;
  }

  Drupal.CountDownTimer.prototype.start = function () {
    if (this.running) {
      return;
    }

    this.running = true;
    var start = Date.now(),
      that = this,
      diff, obj;

    (function timer() {
      if (that.pending) {
        return;
      }
      var obj_default = Drupal.CountDownTimer.parse(that.duration_default);
      if (that.duration_default == 0) {
        diff = parseInt(that.duration) + (((Date.now() - start) / 1000) | 0);
        if (diff >= 0) {
          setTimeout(timer, that.granularity);
        }
        obj = Drupal.CountDownTimer.parse(diff);
        var time_over = that.duration_default + diff;
        that.diff = Drupal.CountDownTimer.parse(time_over);
      }
      else {
        diff = that.duration - (((Date.now() - start) / 1000) | 0);
        if (diff > 0) {
          setTimeout(timer, that.granularity);
        }
        else {
          diff = 0;
          that.running = false;
        }
        obj = Drupal.CountDownTimer.parse(diff);
        var time_over = that.duration_default - diff;
        that.diff = Drupal.CountDownTimer.parse(time_over);
      }

      that.tickFtns.forEach(function (ftn) {
        ftn.call(this, obj.minutes, obj.seconds, obj_default.minutes);
      }, that);
    }());
  };

  Drupal.CountDownTimer.prototype.onTick = function (ftn) {
    if (typeof ftn === 'function') {
      this.tickFtns.push(ftn);
    }
    return this;
  };

  Drupal.CountDownTimer.prototype.expired = function () {
    return !this.running;
  };

  Drupal.CountDownTimer.prototype.timecurrent = function () {
    return this.diff;
  };
  Drupal.CountDownTimer.prototype.pendingTime = function () {
    this.pending = true;
  }
  Drupal.CountDownTimer.parse = function (seconds) {
    return {
      'minutes': (seconds / 60) | 0,
      'seconds': (seconds % 60) | 0
    };
  };

  // End countdown timer prototype
  // Run time clock.
  Drupal.runTimeClock = function (timeEndCallback) {
    var elmDisplay = document.querySelector('#time-clock');
    if (elmDisplay) {
      var timeDuration = elmDisplay.dataset.time,
        timeDurationDefault = elmDisplay.dataset.durationDefault;

      timer = new Drupal.CountDownTimer(timeDuration, timeDurationDefault);
      var timeObj = Drupal.CountDownTimer.parse(timeDuration);
      formatClockTime(timeObj.minutes, timeObj.seconds, timeObj.minutes);
      timer.onTick(formatClockTime);
      // Provided custom callback function will be called at timer end.
      if (typeof timeEndCallback === 'function') {
        timer.onTick(timeEndCallback);
      }
      else {
        timer.onTick(timeEnd);
      }
      timer.onTick(timeTakeTest);
      timer.start();
    }

    function timeEnd() {
      if (this.expired()) {
        // showTimeIsUpModal();
      }
    }

    function timeEndAlertModal() {
      if (this.expired()) {
        console.log('Time is up! please write your function to submit form here.')
      }
    }

    // Save time current to local storage.
    function timeTakeTest() {
      var timecurrent = this.timecurrent();
      var minutes = timecurrent.minutes < 10 ? "0" + timecurrent.minutes : timecurrent.minutes;
      var seconds = timecurrent.seconds < 10 ? "0" + timecurrent.seconds : timecurrent.seconds;
      if (timecurrent === undefined) {
        return;
      }
      var taketest_string = Drupal.getCookie('taketest');
      if (!taketest_string) {
        return;
      }
      localStorage.setItem(taketest_string + quiz_id + '_timecurrent', minutes + ':' + seconds);
    }

    // Set flag default for time clock.
    function formatClockTime(minutes, seconds, minutes_default) {
      minutes = minutes < 10 ? "0" + minutes : minutes;
      seconds = seconds < 10 ? seconds : seconds;
      var timeValue = minutes >= 1 ? minutes : seconds;
      var timeText = minutes >= 1 ? 'minutes remaining' : 'seconds remaining';
      if (minutes < 1) {
        $('.realtest-header').addClass('time-up');
      }
      if (elmDisplay) {
        if (parseInt(minutes) < parseInt(minutes_default) &&  parseInt(minutes) >= 1) {
          if (parseInt(seconds) == 0 &&  parseInt(minutes) == 1) {
            timeValue = "01";
          }
          else {
            timeValue = parseInt(minutes) + 1;
            if (parseInt(minutes) < 9) {
              timeValue = "0" + timeValue;
            }
          }
        }
        elmDisplay.innerHTML = '<span class="realtest-header__time-val">' + timeValue + '</span>' + '<span class="realtest-header__time-text">' + timeText + '</span>';
      }
    }

    function formatEndTimeAlert(minutes, seconds) {
      var countDownText = document.getElementById("js-countdown-text");
      var seconds = seconds;
      timeDisplayElm.textContent = seconds;
      countDownText.textContent = seconds <= 1 ? "sec" : "secs";
    }

    function showTimeIsUpModal() {
      $("#modal-time-up").modal({ backdrop: 'static', keyboard: false });
      var timeDisplayElm = document.querySelector('#js-countdown-number');
      if (timeDisplayElm) {
        var timeDuration = timeDisplayElm.dataset.time,
          timer = new Drupal.CountDownTimer(timeDuration),
          timeObj = Drupal.CountDownTimer.parse(timeDuration);
        formatEndTimeAlert(timeObj.minutes, timeObj.seconds);
        timer.onTick(formatEndTimeAlert);
        timer.onTick(timeEndAlertModal);
        timer.start();
      }
    }
  }
  Drupal.pendingTimeClock = function () {
    // Stop time clock.
    timer.pendingTime();
  }
  // End function countdown timer.
  // --------------------------------

  // ------ Global functions ------

  // Handle show full screen.
  function showFullScreen() {
    if (iosCheck) {
      $('#js-full-screen').hide();
      return;
    }
    var isFullscreen = false;
    var fullScreenTooltip = "Full Screen Mode";
    var exitFullScreenTooltip = "Exit Full Screen Mode";

    // Function to toggle tooltip content based on isFullscreen state
    function updateTooltip() {
      var tooltipTitle = isFullscreen ? exitFullScreenTooltip : fullScreenTooltip;
      $('#js-full-screen').attr({
        'data-original-title': tooltipTitle,
        'data-placement': "bottom",
        'data-trigger': "hover",
      });
    }

    $('#js-full-screen').click(function () {
      var elem = document.documentElement;
      $(this).toggleClass('active');
      if (!isFullscreen) {
        // if browser is not fullscreen, then request fullscreen
        if (elem.requestFullscreen) {
          elem.requestFullscreen();
        } else if (elem.mozRequestFullScreen) {
          elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullscreen) {
          elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
          elem.msRequestFullscreen();
        }
        isFullscreen = true;
      } else {
        // if current browser is fullscreen, then exit fullscreen
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
        isFullscreen = false;
      }

      // Update the tooltip content after fullscreen change
      updateTooltip();
      setTimeout(function () {
        $('#notes-container').getNiceScroll().resize();
      }, 1000);
    });
    // Check if browser is fullscreen
    document.addEventListener('fullscreenchange', (event) => {
      if (document.fullscreenElement != null) {
        $('#js-full-screen').addClass('active');
        isFullscreen = true;
        updateTooltip();
      }
      else {
        $('#js-full-screen').removeClass('active');
        isFullscreen = false;
        updateTooltip();
      }
    });
    // Call updateTooltip initially to set the correct tooltip
    updateTooltip();
  }

  // --------------------------------
  // NOTE/HIGHLIGHT FUNCTIONS
  function getQuizId() {
    // Quiz ID for Listening/Reading test.
    if (drupalSettings.take_test.quiz_id !== undefined && drupalSettings.take_test.quiz_id !== '' && drupalSettings.take_test.quiz_id != null) {
      return drupalSettings.take_test.quiz_id;
    }
    return '';

    if (drupalSettings.wot2.quizID !== undefined && drupalSettings.wot2.quizID !== '' && drupalSettings.wot2.quizID != null) {
      return drupalSettings.wot2.quizID;
    }
  }

  // (Notepad) Setup note - Black out the text show active note and highlight.
  function setupNoteApp() {
    // var quizID = getQuizId();
    // // let notes = [];
    // // Check if localstorage contains any data
    // const localData = localStorage.getItem('notes_' + quizID);
    // // Retrieve the list of notes from localstorage
    // if (localData) {
    //   notes = JSON.parse(localData);
    // }
    //
    // if (notes && notes.length > 0) {
    //   // Display the saved notes
    //   renderNotes();
    // }

    // Handle "input" event on the search input
    $('#note-search').on('input', function () {
      const searchTerm = $(this).val().trim().toLowerCase();
      if (searchTerm === '') {
        // If the search term is empty, display the original notes
        $('#search-results').empty();
        $('#notes-container').show();
        renderNotes();
      }
      else {
        const filteredNotes = filterNotes(searchTerm);

        // Render the filtered notes
        renderSearchResults(filteredNotes);
      }
    });

    function filterNotes(searchTerm) {
      // Filter notes that contain the search term in either selectedText or
      // noteText
      return notes.filter((note) => {
        const selectedText = note.selectedText.toLowerCase();
        const noteText = note.noteText.toLowerCase();

        return selectedText.includes(searchTerm) || noteText.includes(searchTerm);
      });
    }

    function renderSearchResults(searchResults) {
      const searchResultsContainer = $('#search-results');
      searchResultsContainer.empty();

      if (searchResults.length > 0) {
        $.each(searchResults, function (index, note) {
          const searchResultDiv = `
          <div class="notepad__item" data-note-id="${note.id}" data-note-part="${note.noteOfPart}"  data-ref-id="${note.noteRefId}">
            <div class="notepad__item-title">${note.selectedText}</div>
            <div class="notepad__item-content-wrap">
              <div class="notepad__item-content">${note.noteText}</div>
            </div>
            <span class="notepad__item-more">
              <span class="notepad__item-more-icon ioticon-more-vertical"></span>
              <span class="notepad__more-card">
                <span class="notepad__more-item-row -edit">Edit <span class="notepad__more-item-icon ioticon-edit"></span></span>
                <span class="notepad__more-item-row">
                  Delete <span class="notepad__more-item-icon ioticon-trash-3 -delete"></span>
                  <span class="notepad__delete-confirm">Are you sure to delete this note?
                    <span class="notepad__text-confirm-wrap">
                      <span class="notepad__text-confirm -delete" data-id="${note.id}">Yes</span>
                      <span class="notepad__text-confirm -cancel">No</span>
                    </span>
                  </span>
                </span>
              </span>
            </span>
          </div>
        `;

          // Add search results with delete and cancel function
          const searchResultElement = $(searchResultDiv);
          searchResultsContainer.prepend(searchResultElement);
        });
        $('#notes-container').hide();
      }
      else {
        const noResultsDiv = `<div class="notepad__no-results">No matching note found.</div>`;
        searchResultsContainer.append(noResultsDiv);
      }
    }

    function deleteNote(noteId) {
      // Find a note by its unique ID.
      const noteIndex = notes.findIndex(note => note.id === noteId);
      if (noteIndex !== -1) {
        // Remove a note from the notes array using the found index.
        notes.splice(noteIndex, 1);

        // Save the notes array to local storage.
        // localStorage.setItem('notes_' + quizID, JSON.stringify(notes));

        // Display the search results again.
        const searchTerm = $('#note-search').val().trim().toLowerCase();
        if (searchTerm === '') {
          $('#search-results').empty();
          $('#notes-container').show();
          renderNotes();
        }
        else {
          const filteredNotes = filterNotes(searchTerm);
          renderSearchResults(filteredNotes);
        }
      }
    }

    function scrollToNotedItem(refItemId, noteOfPart) {
      if ($(`.noted.${refItemId}`).length) {
        if (currentActivePart != noteOfPart) {
          $('.question-palette__part[data-part="' + noteOfPart + '"]').trigger('click', false);
          highlighterContent.on('transitionend', function () {
            $(`.noted.${refItemId}`)[0].scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
            highlighterContent.off('transitionend');
          });
        }
        else {
          $(`.noted.${refItemId}`)[0].scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }
    }

    // Handle click event on "Save" button
    $('#save-note').click(function () {
      saveNote();
    });

    // Event delegation for handling delete and cancel click events
    $(document).on('click', '.notepad__item-more', function (event) {
      $('.notepad__item-more').removeClass('active');
      $(this).toggleClass('active');
    });

    $(document).on('click', '.notepad__text-confirm.-delete', function (event) {
      const noteId = $(this).closest('.notepad__item').data('noteId');
      const refNoteId = $(this).closest('.notepad__item').data('refId');
      deleteNote(noteId);
      removeNoteOnTestPanel(refNoteId)
    });

    $(document).on('click', '.notepad__delete-confirm', function (event) {
      event.stopPropagation();
    });

    $(document).on('click', '.notepad__item-title', function (event) {
      event.stopPropagation();
      var itemNote = $(this).closest('.notepad__item');
      var refItemId = itemNote.data('refId');
      var noteOfPart = itemNote.data('notePart');
      scrollToNotedItem(refItemId, noteOfPart);
    });

    $(document).on('click', '.notepad__more-item-row.-edit', function (event) {
      var editableDiv = $(this).closest('.notepad__item').find('.notepad__item-content');
      var editableDivWrap = $(this).closest('.notepad__item').find('.notepad__item-content-wrap');
      var noteId = $(this).closest('.notepad__item').data('noteId');
      var btnEditTemplate = `<div class="notepad__btns-edit">
                              <button class="notepad__btn-cancel iot-grbt -white">Cancel</button>
                              <button class="notepad__btn-save iot-grbt" data-note-id="${noteId}">Save</button>
                            </div>`;

      originalNoteContent = editableDiv.text();
      $(this).closest('.notepad__item-more').removeClass('active');
      editableDiv.attr("contentEditable", "true").focus();
      editableDivWrap.append(btnEditTemplate);
      $('#notes-container').getNiceScroll().resize();
    });

    $(document).on('click', '.notepad__btn-cancel', function (event) {
      var editableDiv = $(this).closest('.notepad__item').find('.notepad__item-content');
      editableDiv.text(originalNoteContent).attr("contentEditable", "false");
      $(this).closest('.notepad__btns-edit').remove();
    });

    $(document).on('click', '.notepad__btn-save', function (event) {

      const noteId = $(this).data('note-id');
      const updatedContent = $(this).closest('.notepad__item').find('.notepad__item-content').text().trim();

      // Find the note by its unique ID.
      const noteIndex = notes.findIndex(note => note.id === noteId);

      if (noteIndex !== -1) {
        // Update the note's content.
        notes[noteIndex].noteText = updatedContent;

        // Save the updated notes array to local storage.
        // localStorage.setItem('notes_' + quizID, JSON.stringify(notes));

        // Optionally, you can re-render the notes to display the updated
        // content.
        renderNotes();
      }

      $(this).closest('.notepad__item-content-wrap').find('.notepad__item-content').attr("contentEditable", "false");
      $(this).closest('.notepad__btns-edit').remove();

    });

    $(document).on('click', '.notepad__more-item-row', function (event) {
      event.stopPropagation();
      $(this).toggleClass('active');
      const confirmDeleteElm = this.querySelector('.notepad__delete-confirm');
      const confirmEditElm = this.closest(".notepad__item").querySelector('.notepad__item-content-wrap');
      document.addEventListener('click', clickDeleteItemHandler);
      document.addEventListener('click', clickEditItemHandler);

      function clickDeleteItemHandler(event) {

        if (confirmDeleteElm) {
          const isInsideConfirmDeleteElm = confirmDeleteElm.contains(event.target);
          if (!isInsideConfirmDeleteElm) {
            document.removeEventListener('click', clickDeleteItemHandler);
            $(confirmDeleteElm).closest('.notepad__item-more').removeClass('active');
            $(confirmDeleteElm).closest('.notepad__more-item-row').removeClass('active');
          }
          else {
            if ($(event.target).is('.notepad__text-confirm')) {
              document.removeEventListener('click', clickDeleteItemHandler);
            }
          }
        }
      }

      function clickEditItemHandler(event) {

        if (confirmEditElm) {
          const isInsideConfirmEditElm = confirmEditElm.contains(event.target);
          if (!isInsideConfirmEditElm) {
            document.removeEventListener('click', clickEditItemHandler);
            $('.notepad__btns-edit').remove();
            $('.notepad__item-content').attr("contentEditable", "false");
          }
          else {
            if ($(event.target).is('.iot-grbt')) {
              document.removeEventListener('click', clickEditItemHandler);
            }
          }
        }
      }
    });

    document.addEventListener('click', function (event) {
      const moreNote = document.querySelector('.notepad__item-more.active');
      if (moreNote) {
        const isClickInsideMoreNote = moreNote.contains(event.target);
        if (!isClickInsideMoreNote) {
          $(moreNote).removeClass('active')
        }
      }
    });

    $(document).on('click', '.notepad__text-confirm.-cancel', function (event) {
      event.stopPropagation();
      $(this).closest('.notepad__item-more').removeClass('active');
      $(this).closest('.notepad__more-item-row').removeClass('active');
    });

    function saveNote() {
      const inputTextarea = $('#user-note-input');
      const noteText = inputTextarea.val().trim();
      const selectedText = noteString;
      const noteOfPart = currentActivePart;
      const noteRefId = $('#js-note-content').data('id');

      if (noteText && selectedText) {
        // Create a new note object
        const newNote = {
          selectedText: selectedText,
          noteText: noteText,
          noteOfPart: noteOfPart,
          noteRefId: noteRefId
        };

        // Add the note to the notes array
        notes.push(newNote);

        // Save the notes array to local storage
        // localStorage.setItem('notes_' + quizID, JSON.stringify(notes));

        // Render the notes again
        renderNotes();

        // Clear the textarea content
        inputTextarea.val('');
        noteString = '';

        // Hide the tooltip
        hideHighlightTooltip();

        //toggle new note status icon
        newAddedNote += 1;
        checkNewNote();
      }
    }

  }

  function checkNewNote() {
    if (newAddedNote > 0) {
      $('#js-bt-notepad').addClass('active');
    }
    else {
      $('#js-bt-notepad').removeClass('active');
    }
  }

  function removeNoteOnTestPanel(noteId) {
    // Ensure all highlights are serialised first!
    NoteIds.forEach(function (noteId) {
      noteSerialized[noteId] = userNote.serializeHighlights(noteId);
    });

    if (noteId) {
      userNote.removeHighlights(null, noteId);
      NoteIds = NoteIds.filter((id) => id !== noteId);
    }
    hideHighlightTooltip();
  }

  function renderNotes() {
    const notesContainer = $('#notes-container');
    if (notesContainer.length) {
      notesContainer.empty();

      $.each(notes, function (index, note) {
        const noteId = uuidv4(); // Create a unique ID for each note.
        note.id = noteId; // Save the ID into the note.
        const noteDiv = `
          <div class="notepad__item" data-note-id="${noteId}" data-note-part="${note.noteOfPart}" data-ref-id="${note.noteRefId}">
            <div class="notepad__item-title">${note.selectedText}</div>
            <div class="notepad__item-content-wrap">
              <div class="notepad__item-content">${note.noteText}</div>
            </div>
            <span class="notepad__item-more">
              <span class="notepad__item-more-icon ioticon-more-vertical"></span>
              <span class="notepad__more-card">
                <span class="notepad__more-item-row -edit">Edit <span class="notepad__more-item-icon ioticon-edit"></span></span>
                <span class="notepad__more-item-row">
                  Delete <span class="notepad__more-item-icon ioticon-trash-3 -delete"></span>
                  <span class="notepad__delete-confirm">Are you sure to delete this note?
                    <span class="notepad__text-confirm-wrap">
                      <span class="notepad__text-confirm -delete" data-id="${noteId}">Yes</span>
                      <span class="notepad__text-confirm -cancel">No</span>
                    </span>
                  </span>
                </span>
              </span>
            </span>
          </div>
        `;

        notesContainer.prepend(noteDiv);
      });
    }
  }

  function initNote() {
    var quizID = getQuizId();
    if (highlighterContent.length) {
      var sandbox = document.getElementById("highlighter-contents");
      window.userNote = new TextHighlighter(sandbox, {
        version: "independencia",
        useDefaultEvents: false,
        color: "var(--main-color)",
        highlightedClass: 'noted',
        preprocessDescriptors: function (range, descriptors) {
          var uniqueId = "hlt-" + Math.random()
              .toString(36)
              .substring(2, 15) +
            Math.random()
              .toString(36)
              .substring(2, 15);
          NoteIds.push(uniqueId);
          addNoteId(uniqueId)
          var descriptorsWithIds = descriptors.map(function (descriptor) {
            var wrapper = descriptor[0];
            var highlightedText = descriptor[1];
            var offset = descriptor[2];
            var length = descriptor[3];
            var timestamp = $(wrapper).data('timestamp');
            addNoteTimestamp(timestamp);
            noteString = descriptor[1];
            return [
              wrapper.replace(
                'class="noted"',
                "class=\"noted " + uniqueId + "\"" + " id=\"" + uniqueId + "\""
              ),
              highlightedText,
              offset,
              length
            ];
          });
          return { descriptors: descriptorsWithIds, meta: { id: uniqueId } };
        },
      });

      $("#user-note-input").on("blur", function () {
        if (previousRange) {
          // Select the previous region again
          var selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(previousRange);
        }
      });

      highlighterContent.on("mouseup", function () {
        var selection = window.getSelection();
        if (selection.rangeCount > 0) {
          var range = selection.getRangeAt(0);
          var selectedText = getSelectedText();
          if (selectedText !== "") {
            showHighlightControl(range);
            // Update the previous selection with the new selection
            previousRange = range.cloneRange();
          }
          else {
            // If there is no new selection, set previousRange to null.
            previousRange = null;
          }
        }
      });

      $(document).on('click', '#js-remove-note', function (event) {
        // Ensure all highlights are serialised first!
        NoteIds.forEach(function (noteId) {
          noteSerialized[noteId] = userNote.serializeHighlights(noteId);
        });

        var noteId = $(this).data('id');
        if (noteId) {
          userNote.removeHighlights(null, noteId);
          NoteIds = NoteIds.filter((id) => id !== noteId)
          deleteNote(noteId);
        }
        hideHighlightTooltip();
        newAddedNote -= 1;
        checkNewNote();
      });

      function deleteNote(noteId) {
        var noteRefId = $('[data-ref-id="' + noteId + '"]').data('noteId');
        // Find a note by its unique ID.
        const noteIndex = notes.findIndex(note => note.id === noteRefId);
        if (noteIndex !== -1) {
          // Remove a note from the notes array using the found index.
          notes.splice(noteIndex, 1);

          // Save the notes array to local storage.
          // localStorage.setItem('notes_' + quizID, JSON.stringify(notes));

          // Display the search results again.
          const searchTerm = $('#note-search').val().trim().toLowerCase();
          if (searchTerm === '') {
            $('#search-results').empty();
            $('#notes-container').show();
            renderNotes();
          }
          else {
            const filteredNotes = filterNotes(searchTerm);
            renderSearchResults(filteredNotes);
          }
        }
      }

      function getSelectedText() {
        if (window.getSelection) {
          return window.getSelection().toString();
        }
        else if (document.selection && document.selection.type != "Control") {
          return document.selection.createRange().text;
        }
        return "";
      }

      function addNoteTimestamp(timestamp) {
        $('#js-note-content').data('timestamp', timestamp);
        noteTimestamp = timestamp;
      }

      function addNoteId(uniqueId) {
        $('#js-note-content').data('id', uniqueId);
      }

      clickOutNotetHandler = function clickOutNotetHandler(event) {

        if (!highlightTooltip.is(event.target) && highlightTooltip.has(event.target).length === 0) {
          hideHighlightTooltip();

          cancelNote(noteTimestamp);
        }
      }

      function addClassSavedNote(timestamp) {
        $(`[data-timestamp="${timestamp}"]`).each(function (index, el) {
          $(this).addClass('saved-note');
        });
      }

      function replaceNoteToHightlight(timestamp) {
        $(`[data-timestamp="${timestamp}"]`).each(function (index, el) {
          $(this).removeClass('noted').addClass('highlighted');

          const currentClass = $(this).attr('class');
          const newClass = currentClass.replace(/note-up/g, 'hltr-');
          $(this).attr('class', newClass);
        });
      }

      $('#cancel-note').on('click', function (event) {
        var timestamp = $('#js-note-content').data('timestamp');
        cancelNote(timestamp);
      });

      $('#save-note').on('click', function (event) {
        var timestamp = $('#js-note-content').data('timestamp');
        addClassSavedNote(timestamp);
      });

      // const highlightHandler = hltr.highlightHandler.bind(hltr);
      const noteHandler = () => userNote.highlightHandler();

      $('#js-btn-note').on("click", function () {
        noting = true;
        noteHandler();
        $(document).on('click', '#highlighter-contents', clickOutNotetHandler);
      });

      $('#js-btn-highlight').on('click', function (event) {
        if (noting) {
          var timestamp = $('#js-note-content').data('timestamp');
          replaceNoteToHightlight(timestamp);
        }
      });
    }

  }

  function initHighlighter() {
    if (highlighterContent.length) {
      var highlightIds = [];
      var sandbox = document.getElementById("highlighter-contents");
      var removeHighlightBtn = document.getElementById("js-remove-highlight");
      window.hltr = new TextHighlighter(sandbox, {
        version: "independencia",
        useDefaultEvents: false,
        preprocessDescriptors: function (range, descriptors) {
          var uniqueId = "hlt-" + Math.random()
              .toString(36)
              .substring(2, 15) +
            Math.random()
              .toString(36)
              .substring(2, 15);
          highlightIds.push(uniqueId);

          var descriptorsWithIds = descriptors.map(function (descriptor) {
            var wrapper = descriptor[0];
            var highlightedText = descriptor[1];
            var offset = descriptor[2];
            var length = descriptor[3];

            return [
              wrapper.replace(
                'class="highlighted"',
                "class=\"highlighted " + uniqueId + "\"" + " id=\"" + uniqueId + "\""
              ),
              highlightedText,
              offset,
              length
            ];
          });
          return { descriptors: descriptorsWithIds, meta: { id: uniqueId } };
        },
      });

      var serialized = {};

      $("#user-note-input").on("blur", function () {
        if (previousRange) {
          // Select the previous region again
          var selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(previousRange);
        }
      });

      highlighterContent.on("mouseup", function () {
        var selection = window.getSelection();
        if (selection.rangeCount > 0) {
          var range = selection.getRangeAt(0);
          var selectedText = getSelectedText();
          if (selectedText !== "") {
            showHighlightControl(range);
            // Update the previous selection with the new selection
            previousRange = range.cloneRange();
          }
          else {
            // If there is no new selection, set previousRange to null.
            previousRange = null;
          }
        }
      });

      $(document).on('click', '#js-remove-highlight', function (event) {
        // Ensure all highlights are serialised first!
        highlightIds.forEach(function (highlightId) {
          serialized[highlightId] = hltr.serializeHighlights(highlightId);
        });

        var highlightId = $(this).data('id');
        if (highlightId) {
          hltr.removeHighlights(null, highlightId);
          highlightIds = highlightIds.filter((id) => id !== highlightId)
        }
        hideHighlightTooltip();
        cancelNote(noteTimestamp);
      });

      function getSelectedText() {
        if (window.getSelection) {
          return window.getSelection().toString();
        }
        else if (document.selection && document.selection.type != "Control") {
          return document.selection.createRange().text;
        }
        return "";
      }

      // const highlightHandler = hltr.highlightHandler.bind(hltr);
      const highlightHandler = () => hltr.highlightHandler();

      $('#js-btn-highlight').on("click", highlightHandler);
    }

  }

  function cancelNote(timestamp) {
    $(`[data-timestamp="${timestamp}"]`).each(function (index, el) {
      const notedText = el.textContent;
      const parent = el.parentElement;
      const textNode = document.createTextNode(notedText);
      parent.replaceChild(textNode, el);
    });
    $(document).off('click', '#highlighter-contents', clickOutNotetHandler);
  }

  function clampValue(value, min, max) {
    if (max < min) {
      return min;
    }

    return Math.min(Math.max(value, min), max);
  }

  function getVisibleHighlightBounds() {
    var edgeOffset = 8;
    var bounds = {
      top: edgeOffset,
      left: edgeOffset,
      right: $(window).width() - edgeOffset,
      bottom: $(window).height() - edgeOffset
    };

    if (highlighterContent.length) {
      var contentRect = highlighterContent[0].getBoundingClientRect();
      bounds.top = Math.max(bounds.top, contentRect.top + edgeOffset);
      bounds.left = Math.max(bounds.left, contentRect.left + edgeOffset);
      bounds.right = Math.min(bounds.right, contentRect.right - edgeOffset);
      bounds.bottom = Math.min(bounds.bottom, contentRect.bottom - edgeOffset);
    }

    $('.take-test__bottom-palette:visible, .footer-test-bar:visible').each(function () {
      var $fixedPanel = $(this);
      var panelRect = this.getBoundingClientRect();
      var isVisiblePanel = $fixedPanel.css('visibility') !== 'hidden' && panelRect.height > 0;
      var overlapsContent = panelRect.bottom > bounds.top && panelRect.top < bounds.bottom;

      if (isVisiblePanel && overlapsContent && panelRect.top > bounds.top) {
        bounds.bottom = Math.min(bounds.bottom, panelRect.top - edgeOffset);
      }
    });

    if (bounds.right <= bounds.left) {
      bounds.left = edgeOffset;
      bounds.right = $(window).width() - edgeOffset;
    }

    if (bounds.bottom <= bounds.top) {
      bounds.top = edgeOffset;
      bounds.bottom = $(window).height() - edgeOffset;
    }

    return bounds;
  }

  function getOuterSize($element, fallbackWidth, fallbackHeight) {
    var elementStyle = $element.attr('style');
    var tooltipStyle = highlightTooltip.attr('style');
    var tooltipVisible = highlightTooltip.is(':visible');

    if (!tooltipVisible) {
      highlightTooltip.css({
        display: 'block',
        visibility: 'hidden'
      });
    }

    $element.css({
      display: 'block',
      visibility: 'hidden'
    });

    var size = {
      width: $element.outerWidth() || fallbackWidth,
      height: $element.outerHeight() || fallbackHeight
    };

    if (typeof elementStyle === 'undefined') {
      $element.removeAttr('style');
    } else {
      $element.attr('style', elementStyle);
    }

    if (!tooltipVisible) {
      if (typeof tooltipStyle === 'undefined') {
        highlightTooltip.removeAttr('style');
      } else {
        highlightTooltip.attr('style', tooltipStyle);
      }
    }

    return size;
  }

  function showHighlightControl(range) {
    var rect = range.getBoundingClientRect();

    if (!rect) {
      return;
    }

    noteInput.removeAttr('style');

    var bounds = getVisibleHighlightBounds();
    var highlightMenuSize = getOuterSize(highlightTooltip, 110, 30);
    var noteSize = getOuterSize(noteInput, 300, 128);
    var selectionCenter = rect.left + rect.width / 2;
    var highlightMenuLeft = clampValue(
      selectionCenter - highlightMenuSize.width / 2,
      bounds.left,
      bounds.right - highlightMenuSize.width
    );
    var noteLeft = clampValue(
      selectionCenter - noteSize.width / 2,
      bounds.left,
      bounds.right - noteSize.width
    );
    var highlightMenuTop = rect.top - highlightMenuSize.height;
    var showMenuBelow = false;
    var showNoteAbove = false;

    if (highlightMenuTop < bounds.top) {
      highlightMenuTop = rect.bottom;
      showMenuBelow = true;
    }

    highlightMenuTop = clampValue(
      highlightMenuTop,
      bounds.top,
      bounds.bottom - highlightMenuSize.height
    );

    if (highlightMenuTop + highlightMenuSize.height + noteSize.height > bounds.bottom) {
      var spaceAboveMenu = highlightMenuTop - bounds.top;
      var spaceBelowMenu = bounds.bottom - (highlightMenuTop + highlightMenuSize.height);
      showNoteAbove = spaceAboveMenu >= noteSize.height || spaceAboveMenu > spaceBelowMenu;
    }

    if (showNoteAbove) {
      highlightMenuTop = clampValue(
        highlightMenuTop,
        bounds.top + noteSize.height,
        bounds.bottom - highlightMenuSize.height
      );
    } else {
      highlightMenuTop = clampValue(
        highlightMenuTop,
        bounds.top,
        bounds.bottom - highlightMenuSize.height - noteSize.height
      );
    }

    showMenuBelow = highlightMenuTop >= rect.bottom - 1;

    highlightTooltip
      .removeClass('left right highlight-box--below highlight-box--note-up')
      .toggleClass('highlight-box--below', showMenuBelow)
      .toggleClass('highlight-box--note-up', showNoteAbove);

    noteInput.css({
      left: noteLeft - highlightMenuLeft,
      right: 'initial',
      transform: 'none'
    });

    highlightTooltip.css({
      top: highlightMenuTop,
      left: highlightMenuLeft
    });
  }

  function showHighlightTooltip() {
    $(document).on('click', '#highlighter-contents', function (event) {
      var selection = window.getSelection(),
        range;
      if ($(event.target).is('input, textarea')) {
        hideHighlightTooltip(false);
        return true;
      }
      if (selection.rangeCount > 0) {
        range = selection.getRangeAt(0);

        if (!range.collapsed || $(event.target).hasClass('highlighted') || $(event.target).hasClass('noted')) {
          // Display the tooltip for the first time
          highlightTooltip.show();
          tooltipVisible = true;
          highlightTooltip.removeClass('reactive-note reactive no-range');

          if ($(event.target).hasClass('highlighted')) {
            showHighlightControl($(event.target)[0]);
            var highlightId = $(event.target).attr('id');
            $('#js-remove-highlight').data('id', highlightId);
            highlightTooltip.addClass('reactive');
          }
          if ($(event.target).hasClass('noted')) {
            showHighlightControl($(event.target)[0]);
            var noteId = $(event.target).attr('id');
            $('#js-remove-note').data('id', noteId);
            highlightTooltip.addClass('reactive-note');
          }
          if (range.collapsed) {
            highlightTooltip.addClass('no-range');
            noteTimestamp = '';
            $('#js-note-content').data('timestamp', '');
          }
        }
        else if (!highlightTooltip.is(event.target) && highlightTooltip.has(event.target).length === 0) {
          hideHighlightTooltip();
        }
      }

    });

    $('#js-btn-highlight').on('click', function (event) {
      event.preventDefault();
      hideHighlightTooltip();
      clearUserSelection();
    });

    var divParent = $('.test-contents, .test-panel');
    divParent.on('scroll', function () {
      if (tooltipVisible) {
        hideHighlightTooltip();
      }
    });
  }

  function hideHighlightTooltip(clearSelection = true) {
    $('#user-note-input').val('');
    highlightTooltip.hide();
    tooltipVisible = false;
    noting = false;
    highlightTooltip.removeClass('reactive reactive-note no-range');
    noteInput.hide();
    userSelectedRange = '';
    if (clearSelection) {
      clearUserSelection();
    }
    $(document).off('click', '#highlighter-contents', clickOutNotetHandler);
  }

  // Get user selected text.
  function getUserSelection() {
    let selectedText = '';
    if (typeof window.getSelection !== 'undefined') {
      selectedText = window.getSelection().toString();
    }
    else if (typeof document.selection !== 'undefined' && document.selection.type === 'Text') {
      selectedText = document.selection.createRange().text;
    }
    return selectedText;
  }

  function clearUserSelection() {
    if (window.getSelection) {
      if (window.getSelection().empty) { // Chrome, Firefox, Opera, Safari
        window.getSelection().empty();
      }
      else if (window.getSelection().removeAllRanges) { // IE
        window.getSelection().removeAllRanges();
      }
    }
    else if (document.selection) {  // IE 8 and below
      document.selection.empty();
    }
  }

  function showNotePad() {
    if (iosCheck) {
      $('#js-bt-notepad').hide();
      return;
    }
    $('#js-bt-notepad, .notepad__close-icon').click(function (event) {
      $('body').toggleClass('notepad-open');
      if ($('body').hasClass('notepad-open')) {
        var notePadWidth = $('#notepad').outerWidth();
        highlighterContent.css({
          'width': `calc(100% - ${notePadWidth}px)`,
          'margin-left': 0
        });
      }
      else {
        highlighterContent.removeAttr('style');
      }

      $('.test-panel, .test-contents').getNiceScroll().hide();
      highlighterContent.on('transitionstart', function () {
        $('body').addClass('transitioning');
        $('.test-panel, .test-contents').getNiceScroll().hide();
        highlighterContent.off('transitionstart');
      });

      highlighterContent.on('transitionend', function () {
        $('body').removeClass('transitioning');
        $('.test-panel, .test-contents').getNiceScroll().show().resize();
        highlighterContent.off('transitionend');
      });
    });

    $('#js-bt-notepad, #notepad').click(function (event) {
      newAddedNote = 0;
      $('#js-bt-notepad').removeClass('active');
    });

    $('#js-btn-note').click(function (event) {
      $(".highlight-box__note-content").show();
    });

    $('#cancel-note').click(function (event) {
      $(highlightTooltip, noteInput).hide();
      userSelectedRange = '';
      $('#user-note-input').val('');
      clearUserSelection();
    });
  }

  function setNotepadHeight() {
    var headerHeight = $('.realtest-header').outerHeight();
    var questionPaletteHeight = $('.question-palette').outerHeight();
    var windowHeight = $(window).height();
    var notepadHeight = windowHeight - (headerHeight + questionPaletteHeight);
    $('#notepad').css({
      height: notepadHeight,
    });
  }

  // Run nice scroll bar for notes.
  function runNotesNiceScroll() {
    var noteContainer = $('#notes-container');
    noteContainer.niceScroll({
      autohidemode: true,
      cursorborderradius: 6,
      cursorwidth: "2px",
      cursorcolor: "#dfdfdf",
    });
  }

  // Clear data note.
  function clearDataNote() {
    var quizID = getQuizId();
    localStorage.removeItem('notes_' + quizID);
  }

  // End NOTE/HIGHLIGHT functions
  //-----------------------------------

  // Handle next and previous button for take test.
  function nextPreviousPart() {
    // Check body have class 'listening-test' or 'reading-test'
    if (!checkMobileTablet() && ($('body').hasClass('listening-test') || $('body').hasClass('reading-test'))) {
      return;
    }

    var buttons = $('#js-btn-previous, #js-btn-next');
    var currentPartIndex, nextPartIndex;
    var viewElms = ['.test-contents', '.test-panel'];
    var partPaletteElement = $('.question-palette__part');
    var $nav = $('#question-palette-table');

    buttons.click(function (event) {
      currentPartIndex = $('#js-btn-wrap').data('partShow');
      if ($(this).hasClass('-next')) {
        nextPartIndex = currentPartIndex + 1;
      } else {
        nextPartIndex = currentPartIndex - 1;
      }
      if (nextPartIndex === totalTestPart || nextPartIndex < 0) {
        event.preventDefault();
        return true;
      } else {
        updateNavButtons(nextPartIndex);
      }

      //active current palette
      partPaletteElement.eq(nextPartIndex).trigger('click');
      currentActivePart = $('.question-palette__part.-active').data('part');

      var scrollLeft = 0;
      var itemGap = 0;
      var elementIndex = nextPartIndex;

      // scroll for palette navigation on the tablet
      for (var i = 0; i <= elementIndex; i++) {
        if (elementIndex == 0) {
          scrollLeft = 0;
        } else {
          if (i == elementIndex - 1) {
            scrollLeft = scrollLeft + $('.question-palette__part').eq(i).innerWidth() / 2;
          } else if (i < elementIndex) {
            scrollLeft = scrollLeft + $('.question-palette__part').eq(i).innerWidth();
          }
          itemGap += 20;
        }
      }
      $nav.animate({ scrollLeft: scrollLeft + itemGap / 2 }, 'slow');
    });

    $(document).on('click', '.question-palette__part', function (event, scrollDefault = true) {
      var scrollLeft = 0;
      var itemGap = 0;
      var elementIndex = $(this).index();
      var clickActive = $(this).data('clickActive');
      if (clickActive == false) {
        return true;
      }

      if (!$(this).hasClass('-active')) {
        $(partPaletteElement).removeClass('-active');
        $(this).addClass('-active');
      } else {
        return;
      }

      // scroll for palette navigation on the tablet
      for (var i = 0; i <= elementIndex; i++) {
        if (elementIndex == 0) {
          scrollLeft = 0;
        } else {
          if (i == elementIndex - 1) {
            scrollLeft = scrollLeft + $('.question-palette__part').eq(i).innerWidth() / 2;
          } else if (i < elementIndex) {
            scrollLeft = scrollLeft + $('.question-palette__part').eq(i).innerWidth();
          }
          itemGap += 20;
        }
      }
      $nav.animate({ scrollLeft: scrollLeft + itemGap / 2 }, 'slow');

      viewElms.forEach(function (currentValue, index, arr) {
        if ($(currentValue + ':eq(' + elementIndex + ')').length) {
          $(currentValue).hide();
          $(currentValue).eq(elementIndex).show();
          if (scrollDefault) {
            if (initNiceScroll) {
              $(currentValue + ':eq(' + elementIndex + ')').getNiceScroll(0).doScrollTop(0, 1000);
            } else {
              $(currentValue + ':eq(' + elementIndex + ')').animate({ scrollTop: 0 }, 'slow');
            }
          }
        }
      });
      updateNavButtons(elementIndex, scrollDefault);
      currentActivePart = $('.question-palette__part.-active').data('part');
    });

    function updateNavButtons(paletteIndex, scrollDefault = true) {
      var nextPartIndex = paletteIndex;
      $('#js-btn-wrap').data('partShow', nextPartIndex);
      if (nextPartIndex === totalTestPart - 1) {
        $('#js-btn-next').addClass('-disabled');
        $('#js-btn-submit').addClass('-show');
      } else {
        $('#js-btn-next').removeClass('-disabled');
        $('#js-btn-submit').removeClass('-show');
      }
      nextPartIndex === 0 ? $('#js-btn-previous').addClass('-disabled') : $('#js-btn-previous').removeClass('-disabled');
      viewElms.forEach(function (value) {
        if ($(value + ':eq(' + nextPartIndex + ')').length) {
          $(value).hide();
          $(value).eq(nextPartIndex).show();
          if (scrollDefault) {
            if (initNiceScroll) {
              $(value + ':eq(' + nextPartIndex + ')').getNiceScroll(0).doScrollTop(0, 1000);
            } else {
              $(value + ':eq(' + nextPartIndex + ')').animate({ scrollTop: 0 }, 'slow');
            }
          }
        }
      });
    }
  }

  // Handle next and previous button for take test.
  function handleNextPreviousLRPart() {
    // Check body have class 'listening-test' or 'reading-test'
    if (!($('body').hasClass('listening-test') || $('body').hasClass('reading-test'))) {
      return;
    }
    if (checkMobileTablet()) {
      return;
    }
    var buttons = $('#js-btn-previous, #js-btn-next');
    var currentPartIndex, nextPartIndex;
    var viewElms = ['.test-contents', '.test-panel'];
    var $nav = $('#question-palette-table');
    var question_first = $('.question-palette__part.-active .question-palette__item').eq(0);
    var num_question_first = question_first.attr(`data-num`);
    var partPaletteElement = $('.question-palette__part');
    var totalTestPart = partPaletteElement.length;
    var number_last_question = partPaletteElement.last().find('.question-palette__item:last-child').attr('data-num');
    if (number_last_question.toString().indexOf('-') !== -1) {
      number_last_question = number_last_question.toString().split('-')[1];
    }
    // Default active focus on first question.
    question_first.addClass('is-selected');
    $('.iot-lr-question[data-num="' + num_question_first + '"]').focus();

    // Click next/previous button.
    buttons.click(function (event) {
      currentPartIndex = $('#js-btn-wrap').data('partShow');
      // Handle next button.
      if ($(this).hasClass('-next')) {
        var part, element_question;
        var part_active = $('.question-palette__part.-active').attr('data-part');
        // Get number of question active.
        var num_question = $('.question-palette__item.is-selected').attr('data-num');
        if (num_question.toString().indexOf('-') !== -1) {
          num_question = num_question.toString().split('-')[1];
        }
        num_question++;
        // Check next question is exist.
        if ($('.question-palette__item[data-num="' + num_question + '"]').length) {
          element_question = $('.question-palette__item[data-num="' + num_question + '"]');
          part = element_question.closest('.question-palette__part').attr('data-part');
        }
        // Check question elm is multi question.
        else if ($('.question-palette__item[data-num-start="' + num_question + '"]').length) {
          element_question = $('.question-palette__item[data-num-start="' + num_question + '"]');
          part = element_question.closest('.question-palette__part').attr('data-part');
          num_question = element_question.attr('data-num-end');
        }
        // Check part of next question is active.
        if (part === part_active) {
          // Trigger click focus next question.
          element_question.trigger('click');
          // Check next question is last question.
          if (num_question >= parseInt(number_last_question) && part_active == totalTestPart) {
            $('#js-btn-next').addClass('-disabled');
            return;
          }
          return;
        }
        // Next part.
        nextPartIndex = currentPartIndex + 1;
      } else {
        nextPartIndex = currentPartIndex - 1;
      }
      if (nextPartIndex === totalTestPart || nextPartIndex < 0) {
        event.preventDefault();
        return true;
      } else {
        updateNavButtons(nextPartIndex);
      }

      // Active previous or next part.
      partPaletteElement.eq(nextPartIndex).trigger('click');
      currentActivePart = $('.question-palette__part.-active').data('part');
      // Clear active question.
      $('.question-palette__item').removeClass('is-selected');
      // Get first question of previous or next part.
      var question_first = partPaletteElement.eq(nextPartIndex).find('.question-palette__item').eq(0);
      var num_question_first = question_first.attr(`data-num`);
      $('.iot-lr-question[data-num="' + num_question_first + '"]').focus();
      $('.question-palette__item[data-num="' + num_question_first + '"]').addClass('is-selected');

      // Scroll for palette navigation on the tablet
      var scrollLeft = 0;
      var itemGap = 0;
      var elementIndex = nextPartIndex;
      for (var i = 0; i <= elementIndex; i++) {
        if (elementIndex == 0) {
          scrollLeft = 0;
        } else {
          if (i == elementIndex - 1) {
            scrollLeft = scrollLeft + $('.question-palette__part').eq(i).innerWidth() / 2;
          } else if (i < elementIndex) {
            scrollLeft = scrollLeft + $('.question-palette__part').eq(i).innerWidth();
          }
          itemGap += 20;
        }
      }
      $nav.animate({ scrollLeft: scrollLeft + itemGap / 2 }, 'slow');
    });
    $('.iot-lr-question').focus(function (event) {
      // Get number of question active.
      var itemIndex = $(this).attr('data-num');
      $('.question-palette__item').removeClass('is-selected');
      $('.question-palette__item[data-num="' + itemIndex + '"]').addClass('is-selected');
      if (itemIndex != number_last_question) {
        $('#js-btn-next').removeClass('-disabled');
      }
      else {
        $('#js-btn-next').addClass('-disabled');
      }
    });
    $('.question-palette__item').click(function (event) {
      $('.question-palette__item').removeClass('is-selected');
      $(this).addClass('is-selected');
      var itemIndex = $(this).data('num');
      if (itemIndex != number_last_question) {
        $('#js-btn-next').removeClass('-disabled');
      }
      else {
        $('#js-btn-next').addClass('-disabled');
      }
    });
    $(document).on('click', '.question-palette__part', function (event, scrollDefault = true) {
      var scrollLeft = 0;
      var itemGap = 0;
      var elementIndex = $(this).index();
      var clickActive = $(this).data('clickActive');
      if (clickActive == false) {
        return true;
      }

      if ($(this).hasClass('-active')) {
        return;
      }
      $(partPaletteElement).removeClass('-active');
      $(this).addClass('-active');

      // scroll for palette navigation on the tablet
      for (var i = 0; i <= elementIndex; i++) {
        if (elementIndex == 0) {
          scrollLeft = 0;
        } else {
          if (i == elementIndex - 1) {
            scrollLeft = scrollLeft + $('.question-palette__part').eq(i).innerWidth() / 2;
          } else if (i < elementIndex) {
            scrollLeft = scrollLeft + $('.question-palette__part').eq(i).innerWidth();
          }
          itemGap += 20;
        }
      }
      $nav.animate({ scrollLeft: scrollLeft + itemGap / 2 }, 'slow');

      viewElms.forEach(function (currentValue, index, arr) {
        if ($(currentValue + ':eq(' + elementIndex + ')').length) {
          $(currentValue).hide();
          $(currentValue).eq(elementIndex).show();
          if (scrollDefault) {
            if (initNiceScroll) {
              $(currentValue + ':eq(' + elementIndex + ')').getNiceScroll(0).doScrollTop(0, 1000);
            } else {
              $(currentValue + ':eq(' + elementIndex + ')').animate({ scrollTop: 0 }, 'slow');
            }
          }
        }
      });
      updateNavButtons(elementIndex, scrollDefault);
      currentActivePart = $('.question-palette__part.-active').data('part');

      // @Note: Disable by request from issue#4190 by Danny.
      // Get first question of previous or next part.
      // Trigger focus first question.
      // var question_first = $(this).find('.question-palette__item').eq(0);
      // question_first.trigger('click');
    });

    function updateNavButtons(paletteIndex, scrollDefault = true) {
      var nextPartIndex = paletteIndex;
      $('#js-btn-wrap').data('partShow', nextPartIndex);
      if (nextPartIndex === totalTestPart - 1) {
        // $('#js-btn-next').addClass('-disabled');
        $('#js-btn-submit').addClass('-show');
      } else {
        $('#js-btn-next').removeClass('-disabled');
        $('#js-btn-submit').removeClass('-show');
      }
      if (nextPartIndex === 0) {
        $('#js-btn-previous').addClass('-disabled')
      } else {
        $('#js-btn-previous').removeClass('-disabled')
      }
      viewElms.forEach(function (value) {
        if ($(value + ':eq(' + nextPartIndex + ')').length) {
          $(value).hide();
          $(value).eq(nextPartIndex).show();
          if (scrollDefault) {
            if (initNiceScroll) {
              $(value + ':eq(' + nextPartIndex + ')').getNiceScroll(0).doScrollTop(0, 1000);
            } else {
              $(value + ':eq(' + nextPartIndex + ')').animate({ scrollTop: 0 }, 'slow');
            }
          }
        }
      });
    }
  }

  function splitReadingTestScreen() {
    var spliter;
    var panelDirection;
    if ($('.gutter.gutter-horizontal').length) {
      return;
    }

    function initializeSpliter() {
      var windowWidth = $(window).width();
      panelDirection = (windowWidth < 768) ? 'vertical' : 'horizontal';

      if ($('#split-one').length && $('#split-two').length) {
        spliter = Split(['#split-one', '#split-two'], {
          gutterSize: 4,
          sizes: [50, 50],
          direction: panelDirection,
          onDrag: onDragFunction
        });
      }
    }

    function onDragFunction() {
      $('.test-panel, .test-contents').getNiceScroll().resize();
    }

    function destroyAndRecreateSpliter() {
      if (spliter) {
        spliter.destroy();
        initializeSpliter();
      }
    }

    function handleWindowResize() {
      var windowWidth = $(window).width();
      var panelDirectionResize = (windowWidth < 768) ? 'vertical' : 'horizontal';

      if (panelDirectionResize !== panelDirection) {
        destroyAndRecreateSpliter();
        panelDirection = panelDirectionResize;
      }
    }

    $(window).resize(handleWindowResize);

    initializeSpliter();
  }

  // Run nice scroll bar for course introduction.
  function runTestPanelNiceScroll() {
    var windowWidth = $(window).width();
    var elements = $('.test-panel, .test-contents');
    if (windowWidth > 1024) {
      elements.niceScroll({
        autohidemode: false,
        cursorborderradius: 6,
        cursorwidth: "8px",
        cursorcolor: "#dfdfdf",
        horizrailenabled: false,
      });
      initNiceScroll = true;
    } else {
      elements.each(function(index, el) {
        $(el).getNiceScroll().remove();
        initNiceScroll = false;
      });
    }
  }

  // Show tooltip buttons.
  function showButtonsTooltip() {
    $('#js-full-screen').tooltip({
      title: 'Full Screen Mode',
      placement: "bottom",
      trigger: "hover"
    });
    if ($('.-practice-mode').length) {
      return;
    }
    $('.realtest-header__bt-submit').tooltip({
      title: 'This function is not available in the real IELTS on computer test',
      placement: "bottom",
      trigger: "hover"
    });

  }

  function reloadPage() {
    if ($('.-practice-mode').length) {
      return;
    }
    if ($('body').hasClass('anonymous-user')) {
      return;
    }
    var unloadCallback = function (event) {
      if ($('.-test_time-up').length || event.target.id === 'edit-submit') {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", unloadCallback);
    var someButton = $('.realtest-header__bt-submit, .modal-view-solution__btn, .waiting-card__btn.iot-grbt, #take-test-form #edit-submit, .speaking-test-page .realtest-header__btn-exit, .modal__button-wrap a, .writing-test .modal-body .iot-bt, .writing-test .modal-exit-test__footer a, #step-test-mic a#js-next-part, .wot2-take-test-form button#edit-submit, .practice-menu__submit, .modal-exit-test .modal--yes');
    someButton.on("click", function () {
      window.removeEventListener("beforeunload", unloadCallback);
    });

    // Disable reload page when submit form SOT.
    var takeTestForm = document.getElementById('take-test-form');
    if (takeTestForm) {
      $(takeTestForm).on('submit', function () {
        window.removeEventListener('beforeunload', unloadCallback);
      });
    }
  }

  function togglePracticeMenu() {
    $('#js-practice-menu').once().click(function () {
      $(this).toggleClass('is-active');
    });
    $('.practice-menu__item.-has-child').click(function (event) {
      event.stopPropagation();
      var subMenu = $(this).find('ul');
      $(this).toggleClass('active');
      subMenu.stop().slideToggle();
    });

    document.addEventListener('click', function (event) {
      const menu = document.querySelector('.practice-nav');

      if (menu) {
        const isClickInsideMenu = menu.contains(event.target);

        if (!isClickInsideMenu) {
          $('#js-practice-menu').removeClass('is-active');
          $('.practice-menu__item.-has-child').removeClass('active');
          $('.practice-menu__sub-menu').hide();
        }
      }
    });
  }

  //*** Change the fonsize on the test pages
  function changeTestPageFontSize() {
    var fonts = ["font-large", "font-medium", "font-small"];
    $.each(fonts, function (i, sector) {
      $('a.' + sector).on("click", function (e) {
        $('body').addClass(sector);
        $('.fontsize-menu__font-link').removeClass('active');
        $(this).addClass('active');
        fonts.forEach(function (value) {
          if (value !== sector) {
            $('body').removeClass(value);
          }
        });
        $('.mega-menu').toggleClass('active');
        $('.mega-menu__font-size').stop().slideUp();
      });
    })
  }
  function directGuidancePage() {
    $('.-btn-redirect-guidance-page').on('click', function (event) {
      event.preventDefault();
      var url_general_guidance = drupalSettings.take_test.url_general_guidance;
       // Load the url general guidance.
      window.location.href = url_general_guidance;
    });
  }

  function isMacOSAndSafari() {
    var userAgent = navigator.userAgent;
    var platform = navigator.platform;
    var macOSPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
    var isMacOS = macOSPlatforms.indexOf(platform) !== -1;
    var isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);

    return isMacOS && isSafari;
  }

  function checkMacOsAndSafari() {
    return false;
  }

  // Create function close popup will redirect to previous url.
  function closePopup() {
    $('.close-speaking-test-mode').on('click', function() {
      var url_redirect = $(this).data('url-redirect');
      window.location.href = url_redirect;
    });
  }

  // ------End GLOBAL functions ------

  Drupal.behaviors.UserTakeTest = {
    attach: function (context, settings) {
      /* ----------------------------------------------- */
      /* ------------- FrontEnd Functions -------------- */
      /* ----------------------------------------------- */
      /* OnLoad Page */


      $(document).ready(function ($) {
        // Check full_test_fail show modal.
        var fullTestFail = drupalSettings.take_test.full_test_fail;
        if (fullTestFail) {
          $('#modal-full-test-notice').modal('show');
          $('body').addClass('disabled-controls full-test-wrong');
          directGuidancePage();
          return ;
        }

        if ($('.speaking-test').length || $('#modal-refusal').length) {
          closePopup();
          var ioscheck = isiPhoneOriPad();
          if(ioscheck) {
            $('#modal-refusal').modal('show')
            return true;
          }
        }

        // Global functions.

        // -----------------------------------
        // Call functions for highlight and take note features.

        // Clear data note.
        /*clearDataNote();*/
        // Show notepad.
        showNotePad();

        //Handle notepad.
        setupNoteApp();

        setNotepadHeight();
        $(window).resize(function () {
          setNotepadHeight();
        });

        // Run nice scroll bar for notes.
        runNotesNiceScroll();

        // Show button note and highlight when black out the text.
        initHighlighter();
        initNote();
        // Show tooltip.
        showHighlightTooltip();
        // End handle for highlight and take note features.
        // -----------------------------------

        // -----------------------------------
        // Handle click to switch parts.
        // Init part panel run nice scroll bar.
        runTestPanelNiceScroll();

        // Next and previous part.
        nextPreviousPart();
        handleNextPreviousLRPart();

        splitReadingTestScreen();
        // -----------------------------------

        // Full Screen Mode.
        showFullScreen();

        // Reload page show warning message.
        reloadPage();

        // Click navbar show submenus.
        togglePracticeMenu()

        // Change the font size on the test pages.
        changeTestPageFontSize()

        showButtonsTooltip();
        // -----------------------------------
        // ------End Global functions ------
        // -----------------------------------
      })
    }
  }

})(jQuery, Drupal, drupalSettings);
;
