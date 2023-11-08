window.REBASE = window.REBASE || {};
REBASE.theme = REBASE.theme || {};

(function($) {
  window.addEventListener('load', function() {
    // Resize refreshes sliders
    // $(window).resize();
    REBASE.theme.bindProductControls();
  }, false);


  $(function() {


    // Product Details
    $('.product-detail__tabs li, .mobile-tab-heading').on('click', function() {
      var was_mobile_selected =  window.innerWidth < 960 ? $(this).hasClass('selected') : false;
      
      $('.product-detail__tabs li, .product-detail__tab, .mobile-tab-heading').removeClass('selected');
      
      if (!was_mobile_selected) {
        $(this).addClass('selected');
        $('.product-detail__tab[data-handle="' + $(this).data('handle') + '"]').addClass('selected');
      } 
    });


    function removeTabSelectedOnMobile() {
      if ( window.innerWidth < 960 ) {
        $('.product-detail__tabs li, .product-detail__tab').removeClass('selected');
      } else {
        $('.product-detail__tabs li').first().addClass('selected');
        $('.product-detail__tab').first().addClass('selected');
      }
    }

    removeTabSelectedOnMobile();
  });

  /* ----------------------------------------------------------------
  -------------------------------------------------------------------
  Setup Product page controls (needs to run on product pages and when quickview is opened)
  -------------------------------------------------------------------
  -----------------------------------------------------------------*/
  REBASE.theme.appendToFilename = function(filename, str) {
    var dot_indx = filename.lastIndexOf('.');

    if (dot_indx === -1) {
      return filename + str;
    } else {
      return filename.substring(0, dot_indx) + str + filename.substring(dot_indx);
    }
  };

  REBASE.theme.unbindProductControls = function() {
    $('.add-item-section__toggle--add-on, #product-qty-input, #product-rating, #product-content-sections').off('.rbProduct');
  };

  REBASE.theme.bindProductControls = function() {
    document.dispatchEvent(new Event('REBASE:bindProductControls'));

    // Product Reviews
    $(document).on('click.rbProduct', '.product-header__reviews', function(e) {
      $('.product-detail__tabs li[data-handle="reviews"]').trigger('click');
      $('html, body').animate({ scrollTop: $('#product-reviews').offset().top - 104 }, 500);
    });

    // Image Galleries
    if ($('.product__part--gallery').length) {
      REBASE.theme.product_photo_gallery = new Swiper('.gallery', {
        effect: 'fade',
        fadeEffect: {
          crossFade: true
        },
        loop: false,
        speed: 500,
        pagination: {
          el: '.swiper-pagination',
          type: 'bullets'
        },
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        }
      });
      // REBASE.theme.product_photo_gallery.on('init', function() {
      //   $(window).trigger('resize')
      // });
    }

    // Option Selectors & Swatches
    // NOTE: must come after image gallery (for selected variant to show correct image when loading page)
    product = new REBASE.theme.Product({
      $container: $('#minicart-add-to-cart-form')
    });
  };

  /* ----------------------------------------------------------------
  -------------------------------------------------------------------
  Product class
  -------------------------------------------------------------------
  -----------------------------------------------------------------*/

  REBASE.theme.Product = (function() {
    function Product(options) {
      var inputs, input_type, single_variant_inputs;

      this.variants = null;
      this.$container = options.$container;
      this.data = JSON.parse(document.getElementById('product__json').innerHTML);
      this.variant_inventory = JSON.parse(document.getElementById('variant__inventory').innerHTML);

      this.settings = {
        single_variant_selector: '.single-variant-select',
        single_option_selector: '.single-option-select',
        original_select_id: 'select#product-select'
      };



      if (this.data) {
        this._initVariants();

        // NOTE: custom variant "swatches" for kistler
        single_variant_inputs = $(this.settings.single_variant_selector, this.$container);

        if (single_variant_inputs.length) {
          inputs = single_variant_inputs;
        } else {
          // NOTE: traiditonal option swatches way of doing things
          // Trigger change to sync up images, etc on initial page load
          inputs = $(this.settings.single_option_selector, this.$container);
        }

        input_type = inputs.first().attr('type');

        if (input_type === 'radio' || input_type === 'checkbox') {
          inputs.filter(':checked:first').trigger('change');
        } else {
          inputs.first().trigger('change');
        }
      } else {
        if (console) {console.log('Missing product json data!');}
      }
    }

    Product.prototype = $.extend({}, Product.prototype, {
      _initVariants: function() {
        var options = {
          $container: this.$container,
          enable_history_state: true,
          single_variant_selector: this.settings.single_variant_selector,
          single_option_selector: this.settings.single_option_selector,
          original_select_id: this.settings.original_select_id,
          product: this.data
        };

        this.variants = new REBASE.theme.Variants(options);

        this.$container.on('variantChange', this._updateAddToCart.bind(this));
        this.$container.on('variantSpecsChange', this._updateSpecsData.bind(this));
        this.$container.on('variantImageChange', this._updateImages.bind(this));
        this.$container.on('variantPriceChange', this._updatePrice.bind(this));
        this.$container.on('variantSKUChange', this._updateSKU.bind(this));
      },
      _updateAddToCart: function(e) {
        var variant = e.variant,
          all_variants_match_option1 = e.all_variants_match_option1,
          target = $(e.target),
          input_type = target.attr('type'),
          add_to_cart_btn = $('#add-to-cart'),
          btn_txt = $('#add-to-cart-text'),
          sold_out_text = btn_txt.data('sold-out-text'),
          not_available_text = btn_txt.data('not-available-text'),
          add_to_cart_text = btn_txt.data('add-to-cart-text'),
          backorder_text = btn_txt.data('backorder-text'),
          backorder = $('.product-backorder'),
          variant_inventory = variant && this.variant_inventory.filter(function(v) { return v.id === variant.id })[0].quantity;

        if (!variant) {
          add_to_cart_btn.addClass('disabled').attr('disabled', 'disabled');
          btn_txt.text(not_available_text);
          $('.product-header__price').html('<span>' + not_available_text + '</span>').removeClass('on-sale');
          $('.product-header__price--old').empty();
          backorder.hide();
          $("#preorder_property").remove();
          $('.mobile-variant-summary').empty();
        } else {
          if (variant.available) {
            // add_to_cart_btn.show();
            add_to_cart_btn.removeClass('disabled').removeAttr('disabled');
            btn_txt.text(variant_inventory <= 0 ? backorder_text : add_to_cart_text);
            $("#preorder_property").remove();
          } else {
            // add_to_cart_btn.hide();
            add_to_cart_btn.addClass('disabled').attr('disabled', 'disabled');
            btn_txt.text(sold_out_text);
            $("#preorder_property").remove();
          }
          // backorder messaging
          if( variant_inventory <= 0 && variant.available ) {
            backorder.toggle(true).append('<input id="preorder_property" type="hidden" name="properties[_backorder]" value="true" />');
          } else {
            backorder.toggle(false);
            $("#preorder_property").remove();
          }

          $('.mobile-variant-summary').html(variant.options.join(' / '));
        }

        if (input_type === 'radio' || input_type === 'checkbox') {
          if (target.is(this.settings.single_variant_selector)) {
            // NOTE: custom kistler single variant swatch inputs
            target.parent('.variant-element').addClass('selected-variant').siblings().removeClass('selected-variant');
          } else {
            // NOTE: old swatch option inputs
            target.parent('.swatch-element').addClass('selected-swatch').siblings().removeClass('selected-swatch');

            // MODDED FOR SWATCH AVAILABILITY (only one level deep, option2)
            var option2_inputs = $('input[data-index="option2"]'),
              option2_vals = option2_inputs.map(function() {return $(this).val();}).get(),
              option2_not_available = $.map(option2_vals, function(option_val) {
                var is_available = false;

                $.each(all_variants_match_option1, function(i, match_variant) {
                  if (match_variant.option2 === option_val) {
                    if (match_variant.available) {
                      is_available = true;
                    }
                  }
                });

                if (is_available) {
                  return undefined;
                } else {
                  return option_val;
                }
              });

            option2_inputs.parent('.swatch-element').removeClass('swatch-unavailable');

            $.each(option2_not_available, function(indx, option_val) {
              option2_inputs.each(function() {
                var current_option_input = $(this);

                if (current_option_input.val() === option_val) {
                  current_option_input.parent('.swatch-element').addClass('swatch-unavailable');
                }
              });
            });
          }
        }
      },
      _updateSpecsData: function(e) {
        var product_options, variant_options, specs;
        $('.product-option-spec, .product-variant-spec').remove();
        if ( !e.variant ) { return false; } // bail early if we don't have a variant

        // handle displaying variant specs
        product_options = this.data.options.slice().reverse(); // we have to slice to not mutate original, and reverse option arrays so that the jquery prepend method inserts in desired order
        variant_options = e.variant.options.slice().reverse(); // we have to slice to not mutate original, and reverse option arrays so that the jquery prepend method inserts in desired order

        variant_options.forEach( function( value, indx ) {
          $('.product-detail__tab[data-handle="specs"] table, .product-detail__tabs li[data-handle="specs"] .mobile-tab-content table').prepend('<tr class="product-option-spec"><td>'+product_options[indx]+'</td><td>'+ value +'</td></tr>')
        });

        // handle displaying variant specs
        specs = e.variant.specs;
        if ( specs !== '' ) {
          specs.split('|').forEach( function( spec ) {
            var label = spec.split(':')[0];
            var value = spec.split(':')[1]

            $('.product-detail__tab[data-handle="specs"] table, .product-detail__tabs li[data-handle="specs"] .mobile-tab-content table').append('<tr class="product-variant-spec"><td>'+label+'</td><td>'+ value +'</td></tr>')
          });
        }

      },
      _updateImages: function(e) {
        var variant = e.variant, images = $('.product__part--gallery figure');
        images.each( function( indx, img ) {
          var $img = $(img);
          if ( variant.featured_image && variant.featured_image.id === parseInt($img.data('image-id')) ){
            REBASE.theme.product_photo_gallery.slideTo(parseInt($img.data('swiper-slide-index')))
          }
        })
      },
      _updatePrice: function(e) {
        var variant = e.variant,
          main_price = $('.product-header__price:not(.product-header__price--old)'),
          old_price = $('.product-header__price--old'),
          compare_price = variant.compare_at_price;

        main_price.html(Shopify.formatMoney(variant.price, Shopify.money_format));

        if (compare_price && compare_price > variant.price) {
          old_price.html( Shopify.formatMoney(compare_price, Shopify.money_format) );
          main_price.addClass('on-sale')
        } else {
          old_price.empty();
          main_price.removeClass('on-sale')
        }
      },
      _updateSKU: function(e) {
        $('#product-sku .product-meta-item-content').text(e.variant.sku);
      }
    });

    return Product;
  })();

  /* ----------------------------------------------------------------
  -------------------------------------------------------------------
  Product Variants class - based on Shopify debut
  -------------------------------------------------------------------
  -----------------------------------------------------------------*/

  REBASE.theme.Variants = (function() {
    function Variants(options) {
      this.$container = options.$container;
      this.product = options.product;
      this.single_variant_selector = options.single_variant_selector;
      this.single_option_selector = options.single_option_selector;
      this.original_select_id = options.original_select_id;
      this.enable_history_state = options.enable_history_state;
      this.current_variant = {},
      this.specs = JSON.parse(document.getElementById('variant__specs').innerHTML);

      $(this.single_variant_selector, this.$container).on('change', this._onSingleVariantChange.bind(this));
      $(this.single_option_selector, this.$container).on('change', this._onSelectChange.bind(this));
    }

    Variants.prototype = $.extend({}, Variants.prototype, {
      /**
       * Get the currently selected options from add-to-cart form. Works with all
       * form input elements.
       *
       * @return {array} options - Values of currently selected variants
       */
      _getCurrentOptions: function() {
        var should_filter = false,
          the_options = $.map($(this.single_option_selector, this.$container), function(element) {
            var $element = $(element),
              type = $element.attr('type'),
              current_option = {};

            if (type === 'radio' || type === 'checkbox') {
              should_filter = true;

              if ($element[0].checked) {
                current_option.value = $element.val();
                current_option.index = $element.data('index');
                return current_option;
              } else {
                return false;
              }
            } else {
              current_option.value = $element.val();
              current_option.index = $element.data('index');
              return current_option;
            }
          });

        // Remove any unchecked input values if using radio buttons or checkboxes
        // Removes all falsy values (Boolean constructor is a function, if the value is omitted or is 0, -0, null, false, NaN, undefined, or the empty string ("") then it will get removed)
        if (should_filter) {
          the_options = the_options.filter(Boolean);
        }

        return the_options;
      },

      /**
       * Find variant based on selected values.
       *
       * @param  {array} selected_values - Values of variant inputs
       * @return {object || undefined} found - Variant object from product.variants
       */
      _getVariantFromOptions: function() {
        var selected_values = this._getCurrentOptions(),
          variants = this.product.variants,
          all_variants_match_option1,
          found;

        found = $.grep(variants, function(variant) {
          return selected_values.every(function(values) {
            return variant[values.index] === values.value;
          });
        });

        all_variants_match_option1 = $.grep(variants, function(variant) {
          return variant[selected_values[0].index] === selected_values[0].value;
        });

        if (found.length) {
          found = found[0];
        } else {
          found = undefined;
        }

        return {
          variant_match: found,
          all_variants_match_option1: all_variants_match_option1
        };
      },

      /**
       * Event handler for when the custom kistler single variant input changes.
       */
      _onSingleVariantChange: function (e) {
        var variant_id = parseInt($(e.target).val()),
          variant;

        variant = this.product.variants.find(function (x) {
          return x.id === variant_id;
        });


        this.$container.trigger({
          type: 'variantChange',
          variant: variant,
          all_variants_match_option1: null,
          target: e.target
        });

        if (!variant) {
          this.current_variant = {};
          return;
        }

        this._updateMasterSelect(variant);
        this._updateImages(variant);
        this._updateSpecs(variant);
        this._updatePrice(variant);
        this._updateSKU(variant);
        this.current_variant = variant;

        if (this.enable_history_state) {
          this._updateHistoryState(variant);
        }
      },

      /**
       * Event handler for when a variant input changes.
       */
      _onSelectChange: function(e) {
        var variant_from_options = this._getVariantFromOptions(),
          variant;

        variant = variant_from_options.variant_match;

        this.$container.trigger({
          type: 'variantChange',
          variant: variant,
          all_variants_match_option1: variant_from_options.all_variants_match_option1,
          target: e.target
        });

        if (!variant) {
          this.current_variant = {};
          return;
        }

        this._updateMasterSelect(variant);
        this._updateImages(variant);
        this._updateSpecs(variant);
        this._updatePrice(variant);
        this._updateSKU(variant);
        this.current_variant = variant;

        if (this.enable_history_state) {
          this._updateHistoryState(variant);
        }
      },

      /**
       * Trigger event when variant image changes
       *
       * @param  {object} variant - Currently selected variant
       * @return {event}  variantImageChange
       */
      _updateImages: function(variant) {
        var variant_image = variant.featured_image || {},
          current_variant_image = this.current_variant.featured_image || {};

        if (!variant.featured_image || variant_image.src === current_variant_image.src) {return;}

        this.$container.trigger({
          type: 'variantImageChange',
          variant: variant
        });
      },

      /**
       * Trigger event when variant specs changes
       *
       * @param  {object} variant - Currently selected variant
       * @return {event}  variantSpecsChange
       */
      _updateSpecs: function(variant) {
        var specs = this.specs.filter(function(item){ return variant.id === item.id });
        if ( specs && specs[0] ) {
          variant.specs = specs[0].specs
        }

        this.$container.trigger({
          type: 'variantSpecsChange',
          variant: variant
        });
      },

      /**
       * Trigger event when variant price changes.
       *
       * @param  {object} variant - Currently selected variant
       * @return {event} variantPriceChange
       */
      _updatePrice: function(variant) {
        if (variant.price === this.current_variant.price && variant.compare_at_price === this.current_variant.compare_at_price) {return;}

        this.$container.trigger({
          type: 'variantPriceChange',
          variant: variant
        });
      },

      /**
       * Trigger event when variant sku changes.
       *
       * @param  {object} variant - Currently selected variant
       * @return {event} variantSKUChange
       */
      _updateSKU: function(variant) {
        if (variant.sku === this.current_variant.sku) {return;}

        this.$container.trigger({
          type: 'variantSKUChange',
          variant: variant
        });
      },

      /**
       * Update history state for product deeplinking
       *
       * @param  {variant} variant - Currently selected variant
       * @return {k}         [description]
       */
      _updateHistoryState: function(variant) {
        if (!history.replaceState || !variant) {return;}
        var newurl = window.location.protocol + '//' + window.location.host + window.location.pathname + '?variant=' + variant.id;
        window.history.replaceState({ path: newurl }, '', newurl);
      },

      /**
       * Update hidden master select of variant change
       *
       * @param  {variant} variant - Currently selected variant
       */
      _updateMasterSelect: function(variant) {
        $(this.original_select_id, this.$container).val(variant.id);
        $('#product-supplier-style').text($('option:selected', this.original_select_id, this.$container).data('variant-ss'));
      }
    });

    return Variants;
  })();
})(jQuery);
