window.REBASE = window.REBASE || {};
REBASE.theme = {};
REBASE.theme.collection = {};

(function($) {
  $(function() {
    // Collection sidebar
    $(document).on('click', '.collection-header__filtering-toggle', function(e) {
      var btn_text = $(this).find('span');
      btn_text.text() === 'Help Me Choose' ? btn_text.text('Close') : btn_text.text('Help Me Choose');
      $('.collection-sidebar').slideToggle();
    });

    $(document).on('click', '.filtering-list-item-toggle', function(e) {
      var _this = $(this), icon = _this.find('span');
      (icon.html() == '+') ? icon.html('&minus;') : icon.html('&plus;');
      _this.next().slideToggle();
    });

    REBASE.theme.collection.noneFoundHTML = $('#no-product-found-message').html();
    REBASE.theme.collection.originalProductList = $('.product');
    REBASE.theme.collection.filteredProductList = [];
    REBASE.theme.collection.productListHasBeenFiltered = false;
    REBASE.theme.collection.sortKey = getUrlParameter('sort_by');
    REBASE.theme.collection.productFilters = {
      bait: [],
      'lure-line-wt': [],
      structure: [],
      'cast-or-spin': [],
      power: [],
      length: [],
      price: []
    };

    function getUrlParameter(name) {
      name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
      var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
      var results = regex.exec(location.search);
      return results === null ? '' : decodeURIComponent(results[1]);
    };

    function getInitialFilterFromParams() {
      if ( location.search ) {
        Object.keys(REBASE.theme.collection.productFilters).forEach(function(group) {
          var values = getUrlParameter( group );

          if ( values ) {
            REBASE.theme.collection.productFilters[group] = values.split(',');
            REBASE.theme.collection.productFilters[group].forEach(function(value) {
              $('.filtering-list li[data-group="'+ group +'"][data-value="'+ value +'"]').toggleClass('selected');
            });
          }
        });
      }
    }

    function setFilterURLParams() {
      var queryString = Object.keys(REBASE.theme.collection.productFilters).map(function(key) {
        var item = '';

        if ( REBASE.theme.collection.productFilters[key].length ) {
          item = key + '=' + encodeURIComponent(REBASE.theme.collection.productFilters[key].join(','))
        } else {
          item = null;
        }

        return item;
      });

      // add in sort by key if it exists
      if ( REBASE.theme.collection.sortKey !== '' ) {
        queryString.push('sort_by='+REBASE.theme.collection.sortKey)
      }

      queryString = queryString.filter(function(value) {
        return value !== null;
      })

      history.pushState({}, '', '?' + queryString.join('&'))
      // location.search = '?' + queryString.join('&')
    }

    // Add a `between()` method on number to check if value is in between a range
    Number.prototype.between = function(a, b) {
      var min = Math.min.apply(Math, [a, b]),
        max = Math.max.apply(Math, [a, b]);
      return this > min && this < max;
    };

    /**
     *
     * @param {array} range - array of int values to check between
     * @param {integer/string} price - price to compare
     */
    function priceIsInRange( range, price ) {
      var is_shown = false;
      if ( range.length >= 2 ) {
        if ( parseInt(price).between(parseInt(range[0]), parseInt(range[1]))) {
          is_shown = true;
        }
      } else {
        if ( parseInt(price) < parseInt(range[0]) ) {
          is_shown = true;
        }
      }
      return is_shown;
    }

    function filterProducts() {
      REBASE.theme.collection.filteredProductList = REBASE.theme.collection.originalProductList.filter(function(index, product) {
        var _product = $(product),
          isShown = true;

        for (var key in REBASE.theme.collection.productFilters) {
          if (REBASE.theme.collection.productFilters[key].length) {
            var product_data_array = _product.data(key).toString().split(',');
            var has_visible_product = REBASE.theme.collection.productFilters[key].some(function(item) {
              if ( key == 'price' ) {
                var range = item.toString().split('-'),
                  result = false;

                product_data_array.forEach(function(price) {
                  if ( priceIsInRange(range, price) ) {result = true;}
                });
                return result;
              } else if ( key === 'bait' ) {
                /**
                * Normally, we reduce items across filter groups and add inside of.
                * For baits, they wanted inside of baits group to also reduce items.
                * - this exception says 'only show me items that have *all* of the bait selections applied
                */
                return REBASE.theme.collection.productFilters[key].every(function(i) {
                  return product_data_array.indexOf(i.toString()) >= 0
                });
             } else {
                return product_data_array.indexOf(item.toString()) >= 0;
              }
            })

            if ( !has_visible_product ) {
              isShown = false;
              break;
            }
          }
        }
        return isShown;
      });

      // we set a flag up front to only animate in products if we've been filtered at least once
      // this sets that flag if filtered length != original length
      if ( REBASE.theme.collection.filteredProductList.length !== REBASE.theme.collection.originalProductList.length ) {
        REBASE.theme.collection.productListHasBeenFiltered = true
      }

      if ( REBASE.theme.collection.productListHasBeenFiltered ) {
        $('.products').fadeOut(100, function() {
          $('.products').html(REBASE.theme.collection.filteredProductList.length <= 0 ? REBASE.theme.collection.noneFoundHTML : REBASE.theme.collection.filteredProductList );
          $(this).fadeIn(200);
        });
      }
      return REBASE.theme.collection.filteredProductList.length;
    }

    function updateAvailableFilters() {
      var filters = $('.filtering-list-items li');

      filters.addClass('disabled');

      filters.each(function(indx, filter) {
        var _filter = $(filter),
          group = _filter.data('group'),
          value = _filter.data('value').toString();

        // automatically remove disabled from selected items
        if ( _filter.hasClass('selected') ) {
          _filter.removeClass('disabled')
        }

        // remove disabled from items that are still available
        REBASE.theme.collection.filteredProductList.each(function(indx, product) {
          var _product = $(product),
            data = _product.data(group);

          if ( group == 'price' ) {
            if ( priceIsInRange(value.trim().toString().split('-'), data) ){
              _filter.removeClass('disabled');
            }
          } else {
            if (
              (typeof data === 'number' && data.toString() === value ) ||
              (typeof data === 'string' && data.includes(value))
            ) {
              _filter.removeClass('disabled');
            }
          }
        });
      });
    }

    function hasFiltersApplied() {
      var hasFilters = false;
      for (var key in REBASE.theme.collection.productFilters) {
        if (REBASE.theme.collection.productFilters[key].length) {
          hasFilters = true;
          break;
        }
      }
      return hasFilters;
    }

    function clearAllFilters() {
      REBASE.theme.collection.productFilters = {
        bait: [],
        'lure-line-wt': [],
        structure: [],
        'cast-or-spin': [],
        power: [],
        length: [],
        price: []
      };

      $('.filtering-list-items li').toggleClass('selected', false)

      setFilterURLParams();
      filterProducts();
      updateAvailableFilters();

      $('.clear-filtering-selections button').attr('disabled', !hasFiltersApplied());
    }

    $(document).on('click', '.filtering-list-items li', function(e) {
      e.preventDefault();
      var _this = $(this),
        group = _this.data('group'),
        value = _this.data('value').toString();

      // bail if we're disabled
      if (_this.hasClass('disabled')) {
        return false;
      }

      _this.toggleClass('selected');

      if (REBASE.theme.collection.productFilters[group].includes(value)) {
        REBASE.theme.collection.productFilters[group] = REBASE.theme.collection.productFilters[group].filter(function(existing) {
          return value !== existing;
        });
      } else {
        REBASE.theme.collection.productFilters[group].push(value);
      }

      setFilterURLParams();
      filterProducts();
      updateAvailableFilters();

      $('.clear-filtering-selections button').attr('disabled', !hasFiltersApplied());
    });

    $(document).on('click', '.clear-filtering-selections', clearAllFilters);
    $(document).on('collection_sort_by_change', setFilterURLParams)

    getInitialFilterFromParams();
    filterProducts();
    updateAvailableFilters();
  });
})(jQuery);
