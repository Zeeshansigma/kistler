window.REBASE = window.REBASE || {};

// Add a `between()` method on number to check if value is in between a range
Number.prototype.between = function(a, b) {
  var min = Math.min.apply(Math, [a, b]),
    max = Math.max.apply(Math, [a, b]);
  return this > min && this < max;
};

(function($) {
  REBASE.RodFinder = (function() {
    function RodFinder(options) {
      this.data = options.variantData;
      this.lures = options.lures;
      this.filteredData = [];
      this.filters = {
        'cast-or-spin':'',
        lure_type: '',
        baits: '',
        wts: '',
        structures: '',
        price: ''
      }
      this.filteredData = [];

      if ( this.data && this.lures ) {
        this._init();
      }
    }

    RodFinder.prototype = $.extend({}, RodFinder.prototype, {
      _init: function() {
        this._filterData();
      },
      _decodeHTML: function (html) {
        var txt = document.createElement('textarea');
        txt.innerHTML = html;
        return txt.value;
      },
      _getBaitOptions: function(lure) {
        var response = '<option value="">Select a bait...</option>';

        if ( lure !== 'Swimbaits/Glidebaits' ) {
          this.lures[lure].forEach( function(el) {
            response += '<option value="'+ el.value.replace('+', ' ') +'" class="lure--'+ el.key +'">' + el.value + '</option>';
          });
        }

        return response;
      },
      _priceIsInRange: function( range, price ) {
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
      },
      _applyFilter: function(key, value) {
        this.filters[key] = value;
        this._filterData();
      },
      _clearFilters: function() {
        for (var key in this.filters) {
          this.filters[key] = ''
        }
        this._filterData();
      },
      _filterData: function(){
        this.filteredData = this.data.filter( function(variant) {
          var keep = true;

          for (var key in this.filters) {
            if ( this.filters[key] === '' ){ continue }
            if ( key === 'price' ) {
              keep = this._priceIsInRange( this.filters.price.split('-'), variant.price );
              break;
            } else if ( !this._decodeHTML(variant[key]).replace('+', ' ').includes(this.filters[key]) ) {
              keep = false;
              break;
            }
          }

          return keep;
        }.bind(this));
      },
      _isOptionDisabled: function( type, value ) {
        var disabled = true;

        this.filteredData.forEach(function(item) {
          if ( type === 'price' ) {
            if ( this._priceIsInRange(value.split('-'), item.price ) ){
              disabled = false;
              return false;
            }
          } else {
            if ( item[type].includes(value) ) {
              disabled = false;
              return false;
            }
          }
        }.bind(this));

        return disabled;
      }
    });

    return RodFinder;
  })();

})(jQuery);
