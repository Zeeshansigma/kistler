window.REBASE = window.REBASE || {};
REBASE.theme = REBASE.theme || {};

(function($) {
  /* ----------------------------------------------------------------
  -------------------------------------------------------------------
  Main Script
  -------------------------------------------------------------------
  -----------------------------------------------------------------*/

  $(function() {
    /* ----------------------------------------------------------------
    Initializations
    -----------------------------------------------------------------*/
    // Initiate Lazy Loading
    window.REBASE_LazyLoad = new LazyLoad({
      elements_selector: '.lazy',
      class_loading: 'lazyloading',
      class_loaded: 'lazyloaded'
    });

    // Re-initialize Lazy Loading on theme editor change
    document.addEventListener('shopify:section:load', function(event) {
      window.REBASE_LazyLoad = new LazyLoad({
        elements_selector: '.lazy',
        class_loading: 'lazyloading',
        class_loaded: 'lazyloaded'
      });
    });

    /* ----------------------------------------------------------------
    Navigation
    -----------------------------------------------------------------*/
    // Mobile Navigation
    var mmStatus = 'closed';

    function closeMM() {
      mmStatus = 'closed';
      $('#mobile-navigation-toggle').toggleClass('opened');
      $('body').removeClass('nav-opened');
    }

    function openMM() {
      mmStatus = 'opened';
      $('body').addClass('nav-opened');
      $('#mobile-navigation-toggle').toggleClass('opened');
    }

    $('#mobile-navigation-toggle').on('click', function() {
      if (mmStatus == 'closed') {
        openMM();
      } else if (mmStatus == 'opened') {
        closeMM();
      }
      return false;
    });

    $('.mobile-dropdown-toggle').on('click', function() {
      $(this).toggleClass('opened').next().toggle();
    });

    function showDD() {
      $('.hover-intent').removeClass('hovered');
      $(this).toggleClass('hovered');
      if ( $(this).hasClass('has-children') ){
        $('body').addClass('nav-opened');
      }
    }

    function hideDD() {
      $(this).removeClass('hovered');
    }

    function headerHoverOut() {
      if ( window.innerWidth > 960 ) {
        $('body').removeClass('nav-opened');
      }
    }

    /* main navigation */
    $('.hover-intent').hoverIntent({
      over: showDD,
      out: hideDD,
      timeout: 200
    });

    $('.header').hoverIntent({
      out: headerHoverOut,
      timeout: 200
    })

    // JS for closing minicart with swipe to right
    $(document).on('touchstart', '.minicart.minicart--visible', function(e) {
      touchstartX = e.changedTouches[0].screenX;
    });

    $(document).on('touchend', '.minicart.minicart--visible', function(e) {
      touchendX = event.changedTouches[0].screenX;
      if ( touchendX - touchstartX > 100 ) {
        $('.minicart__header span').trigger('click')
      }
    });


    /* ----------------------------------------------------------------
    jQuery toggles
    -----------------------------------------------------------------*/

    // Footer Menu
    $(document).on('click', '.footer-navigation__heading', function(e) {
      e.preventDefault();
      $(this).parents('.footer-navigation__item').toggleClass('open');
    })

    //Login Page - forgot password toggle
    $('#forgot-password').on('click', function() {
      $('#recover-password-form').show();
      $('#customer-login-form').hide();
    });

    $('#forgot-password-cancel').on('click', function() {
      $('#recover-password-form').hide();
      $('#customer-login-form').show();
    });

    /* ----------------------------------------------------------------
    FAQ Question toggle
    -----------------------------------------------------------------*/
    $(document).on('click', '.faq-item', function(e) {
      var _this = $(this),
        toggle_icon = _this.find('.faq-item__title-toggle-icon');

      if (!_this.hasClass('faq-item--selected')) {
        // reset all faqs
        $('.faq-item').removeClass('faq-item--selected');
        $('.faq-item__content').slideUp();
        $('.faq-item__title-toggle-icon').html('&plus;');

        // update this faq
        _this.addClass('faq-item--selected');
        _this.find('.faq-item__content').slideDown();
        (toggle_icon.html() === '+') ? toggle_icon.html('&minus;') : toggle_icon.html('&plus;');
      }
    });

    $(document).on('click', '.cart-faq-item', function(e) {
      var _this = $(this),
        toggle_icon = _this.find('.cart-faq-item__title-toggle-icon');

      _this.toggleClass('cart-faq-item--selected');
      _this.find('.cart-faq-item__content').slideToggle();
      (toggle_icon.html() === '+') ? toggle_icon.html('&minus;') : toggle_icon.html('&plus;');
    });

    // Recommended Product Feature
    function displayRecommendedProducts(products) {
      var unique_products = [...new Map(products.map(item => [item['id'], item])).values()];
      var recommended_5_prod = unique_products.slice(0, 5);

      recommended_5_prod.forEach(function(product) {
        var product_loop_template = $('#related-product__template').html();
        var compiled_html = _.template(product_loop_template, product);
        $('.section--related-products .products').append(compiled_html({ product: product }));
        // if (REBASE && REBASE.lists) {
        //   REBASE.lists.updateActiveProductVariant({
        //     product_id: product.id,
        //     variant_id: product.variants[0].id
        //   });
        // }
      });
    }

    function getRecommendedProducts(id) {
      $.getJSON('/recommendations/products.json?product_id=' + id + '&limit=5', function(resp) {
        if (resp.products && resp.products.length || window.rehash_related_products && window.rehash_related_products.length) {
          var recommeded_products = window.rehash_related_products || [];
          var response_products = resp.products || [];

          recommeded_products = recommeded_products.concat(response_products);

          displayRecommendedProducts(recommeded_products);
        } else {
          $('.section--related-products').hide();
        }
      });
    }

    if ( $('body').hasClass('product-template') || $('body').hasClass('article-template') ) {
      if (window.rehash_related_products && window.rehash_related_products.length >= 5) {
        displayRecommendedProducts(rehash_related_products);
      } else {
        getRecommendedProducts(JSON.parse(document.getElementById('product__json').innerHTML).id);
      }
    }


    /* ----------------------------------------------------------------
    PDP
    -----------------------------------------------------------------*/

    if ($('body').hasClass('product-template')) {

      // Fixed position add to cart on mobile
      // ---------------------------------------------------------------
      const FLOATING_CLASS = 'mobile-atc-floating';
      let observer;
      
      const bindAtcObserver = () => {
        const atcTrigger = $('.product-action-intersection').get(0);
        
        observer = new IntersectionObserver((entries) => { 
          const bodyHasFloatingClass = $('body').hasClass(FLOATING_CLASS);

          entries.forEach(entry => {
            if (entry.intersectionRatio != 1 && !bodyHasFloatingClass) {
              $('body').addClass(FLOATING_CLASS);
            } else if (entry.intersectionRatio == 1 && bodyHasFloatingClass) {
              $('body').removeClass(FLOATING_CLASS);
            }
          });
        }, {threshold: 1});

        observer.observe(atcTrigger);
      };

      const setupMobileAtc = () => {
        if (window.innerWidth < 960 && !observer) {
          bindAtcObserver();
        } else if (window.innerWidth >= 960 && observer) {
          observer.disconnect();
          observer = null;
          $('body').removeClass(FLOATING_CLASS);
        }
      };

      // On page load
      setupMobileAtc();

      // On window resize
      $(window).on('resize', $.throttle(250, setupMobileAtc));
    }

    
  });
})(jQuery);


// based on https://stackoverflow.com/a/57996406
// Needed for video-slideshow section (multiple instances on same page)
(function () {
  var isReady = false;
  var callbacks = [];

  window.queueOnYoutubeIframeAPIReady = function (callback) {
    if (isReady) {
      callback();
    } else {
      callbacks.push(callback);
    }
  }

  window.onYouTubeIframeAPIReady = function () {
    isReady = true;
    
    callbacks.forEach(function (callback) {
      callback();
    });

    callbacks.splice(0); // clear callbacks array
  }
})()


// avaiabilty filter
