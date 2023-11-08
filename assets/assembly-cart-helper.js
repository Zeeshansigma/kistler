/*
 * Assembly Cart Helper script - v0.1.8
 * Allows updating quantity and removing assembler builds in cart
 * Notes:
 * 	- only include on the cart page (with the cart-template)
 * Copyright (c) 2018-2019 Rehash
 */

// Production steps of ECMA-262, Edition 5, 15.4.4.17
// Reference: http://es5.github.io/#x15.4.4.17
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some
if (!Array.prototype.some) {
	Array.prototype.some = function (fun, thisArg) {
		'use strict';

		if (this == null) {
			throw new TypeError('Array.prototype.some called on null or undefined');
		}

		if (typeof fun !== 'function') {
			throw new TypeError();
		}

		var t = Object(this);
		var len = t.length >>> 0;

		for (var i = 0; i < len; i++) {
			if (i in t && fun.call(thisArg, t[i], i, t)) {
				return true;
			}
		}

		return false;
	};
}

/*
 * jQuery throttle / debounce - v1.1 - 3/7/2010
 * http://benalman.com/projects/jquery-throttle-debounce-plugin/
 * 
 * Copyright (c) 2010 "Cowboy" Ben Alman
 * Dual licensed under the MIT and GPL licenses.
 * http://benalman.com/about/license/
 */
(function(b,c){var $=b.jQuery||b.Cowboy||(b.Cowboy={}),a;$.throttle=a=function(e,f,j,i){var h,d=0;if(typeof f!=="boolean"){i=j;j=f;f=c}function g(){var o=this,m=+new Date()-d,n=arguments;function l(){d=+new Date();j.apply(o,n)}function k(){h=c}if(i&&!h){l()}h&&clearTimeout(h);if(i===c&&m>e){l()}else{if(f!==true){h=setTimeout(i?k:l,i===c?e-m:e)}}}if($.guid){g.guid=j.guid=j.guid||$.guid++}return g};$.debounce=function(d,e,f){return f===c?a(d,e,false):a(d,f,e!==false)}})(this);

/*
 * Assembly cart helper starts here
 */
(function ($) {
	$(function () {

		console.warn('Assembly cart helper v0.1.8')

		var WARN_ON_QUANTITY_ZERO = true,
			REMOVE_ERROR = 'Something went wrong, we were unable to remove, please try again.<br /> If you continue to see this error you can <a href="/cart/clear">try clearing the entire cart</a>',
			UPDATE_ERROR = 'Something went wrong, we were unable to update quantity, please try again.',
			VIEW_DETAILS = 'View Details',
			HIDE_DETAILS = 'Hide Details',

			REMOVE_BTN_SELECTOR = '.assembly-build-remove', // NOTE: remove and quantity wrapper should be hidden by default (js will unhide them)
			VIEW_DETAILS_BTN_SELECTOR = '.assembly-view-details',
			QUANTITY_WRAPPER_SELECTOR = '.assembly-build-cart-quantity',
			QUANTITY_ACTION_SELECTOR = '.assembly-build-cart-quantity-action',
			QUANTITY_INPUT_SELECTOR = '.assembly-build-cart-quantity-input',
			CART_ROW_SELECTOR = '.assembly-build-row',
			CART_ROW_INVALID_SELECTOR = '.assembly-build-row-invalid',
			META_SELECTOR = '.assembly-meta-details',
			
			IS_REMOVING_CLASS = 'assembly-is-removing',
			IS_UPDATING_CLASS = 'assembly-is-updating',
			ERROR_MSG_CLASS = 'assembly-build-error',

			QUANTITY_ACTION_DATA = 'assemblyBuildCartQuantityAction', // e.g. data-assembly-build-cart-quantity-action
			BUILD_ID_DATA = 'assemblerBuildId', // e.g. data-assembler-build-id
			ADD_ACTION = 'add',
			SUBTRACT_ACTION = 'subtract',

			CART_BUILD_ID_KEY = '_build_id',
			CART_BASE_PRODUCT_KEY = '_assembly_base_prod',
			CART_ADD_ON_PRODUCT_KEY = '_assembly_add_on_prod',
			CART_ADD_QUANTITY_KEY = '_assembly_add_quantity',

			BUILD_QUANTITY_CACHE = {}, // NOTE: used to keep track of initial quantity values

			_checkCartHasBuild = function (build_id) {
				var def = $.Deferred();

				$.ajax({
					dataType: 'json',
					url:'/cart.js'
				}).done(function (data) {
					var has_build_items;

					if (data.items && data.items.length) {
						has_build_items = data.items.some(function (x) {
							return x.properties && x.properties[CART_BUILD_ID_KEY] === build_id;
						});

						if (has_build_items) {
							def.resolve(data);
							return; // NOTE: to stop execution and not resolve early on accident
						}
					}

					def.resolve(); // NOTE: no cart items or no build items found, resolve with empty data
				}).fail(function () {
					def.reject();
				});

				return def.promise();
			},
			_updateBuildQuantity = function (build_id, qty) {
				var def = $.Deferred();

				_checkCartHasBuild(build_id).done(function (data) {
					if (data) {
						// NOTE: must use array to update all quantites because of possible shared variant ids
						var update_arr = $.map(data.items, function (x) {
							var add_qty = 1;

							if (x.properties && x.properties[CART_BUILD_ID_KEY] === build_id) {
								if (x.properties[CART_ADD_QUANTITY_KEY]) { // NOTE: if the add-on-product or additional-cost-product requires multiple this takes care of it
									add_qty = parseInt(x.properties[CART_ADD_QUANTITY_KEY]);
									if (typeof add_qty !== 'number' || isNaN(add_qty)) { add_qty = 1; }
								}
								return add_qty * qty;
							} else {
								return x.quantity;
							}
						});

						_updateCart({updates: update_arr}).done(function () {
							def.resolve();
						}).fail(function () {
							def.reject();
						});
					} else {
						def.reject(); // NOTE: no existing build items so we cant update! 
					}
				}).fail(function () {
					def.reject();
				});

				return def.promise();
			}, 
			_removeBuild = function (build_id) {
				var def = $.Deferred();

				_checkCartHasBuild(build_id).done(function (data) {
					if (data) {
						// NOTE: must use array to update all quantites because of possible shared variant ids
						var update_arr = $.map(data.items, function (x) {
							if (x.properties && x.properties[CART_BUILD_ID_KEY] === build_id) {
								return 0; // NOTE: this removes the item from cart
							} else {
								return x.quantity;
							}
						});

						_updateCart({updates: update_arr}).done(function () {
							def.resolve();
						}).fail(function () {
							def.reject();
						});
					} else {
						def.resolve(); // NOTE: no existing build items so nothing to remove, we can resolve immediately 
					}
				}).fail(function () {
					def.reject();
				});

				return def.promise();
			},
			_updateCart = function (data) {
				return $.ajax({
					method: 'POST',
					dataType: 'json',
					url:'/cart/update.js',
					data: data
				});
			},
			_getInputValWithDefault = function ($input, default_val) {
				var input_val = parseInt($input.val());

				if (typeof default_val !== 'number' || isNaN(default_val)) { default_val = 0; }
				if (typeof input_val !== 'number' || isNaN(input_val)) { input_val = default_val; }

				return input_val;
			},
			_showErrorMessage = function (parent, message) {
				_removeErrorMessage(parent);

				var error_html = $('<div/>')
					.addClass(ERROR_MSG_CLASS)
					.html(message);

				parent.prepend(error_html);
			},
			_removeErrorMessage = function (parent) {
				$('.' + ERROR_MSG_CLASS, parent).remove();
			},
			_resetQuantityIfNeeded = function (parent, build_id) {
				if (_getInputValWithDefault($(QUANTITY_INPUT_SELECTOR, parent)) <= 0) {
					_resetToInitialQuantity(parent, build_id);
				}
			},
			_resetToInitialQuantity = function (parent, build_id) {
				var quantity_input = $(QUANTITY_INPUT_SELECTOR, parent),
					new_val = BUILD_QUANTITY_CACHE[build_id] || 1;

				quantity_input.val(new_val); // IMPORTANT: dont trigger a change event
			};


		// Quantity input
		// ------------------------------------
		$(QUANTITY_INPUT_SELECTOR, QUANTITY_WRAPPER_SELECTOR).each(function () {
			// NOTE: Keep track of initial quantity values
			var target = $(this),
				row_parent = target.parents(CART_ROW_SELECTOR),
				build_id = row_parent.data(BUILD_ID_DATA),
				qty_val = _getInputValWithDefault(target, 1);

			if (build_id) {
				BUILD_QUANTITY_CACHE[build_id] = qty_val;
			} else {
				console.warn('Can\'t find initial build quantity... missing build id');
			}	
		}).on('change', $.debounce(250, function (e) {
			var target = $(this),
				row_parent = target.parents(CART_ROW_SELECTOR),
				build_id = row_parent.data(BUILD_ID_DATA),
				qty_val = _getInputValWithDefault(target),
				_failed = function (show_error) {
					if (typeof show_error !== 'boolean') { show_error = true; }

					row_parent.removeClass(IS_UPDATING_CLASS);
					_resetToInitialQuantity(row_parent, build_id);
					if (show_error) { _showErrorMessage(row_parent, UPDATE_ERROR); }
				};

			if (!row_parent.hasClass(IS_UPDATING_CLASS)) {

				row_parent.addClass(IS_UPDATING_CLASS);
				_removeErrorMessage(row_parent);

				if (build_id) {
					if (qty_val <= 0) {
						// NOTE: trigger remove
						if (!WARN_ON_QUANTITY_ZERO || (WARN_ON_QUANTITY_ZERO && confirm('Are you sure? Removing a custom build cannot be undone'))) {
							row_parent.removeClass(IS_UPDATING_CLASS);
							$(REMOVE_BTN_SELECTOR, row_parent).trigger('click');
						} else {
							_failed(false);
						}
					} else {
						$.when(_updateBuildQuantity(build_id, qty_val)).done(function () {
							// NOTE: refresh to show latest everything (items, summary, etc)
							window.location.reload();
						}).fail(_failed);
					}
				} else {
					_failed();
					console.warn('Can\'t update build... missing build id');
				}
			}
		}));


		// Plus & Minus buttons
		// ------------------------------------
		$(QUANTITY_ACTION_SELECTOR, QUANTITY_WRAPPER_SELECTOR).on('click', function (e) {
			e.preventDefault();

			var parent = $(this).parent(QUANTITY_WRAPPER_SELECTOR),
				quantity_input = $(QUANTITY_INPUT_SELECTOR, parent),
				qty_val = _getInputValWithDefault(quantity_input),
				current_action = $(this).data(QUANTITY_ACTION_DATA);

			if (current_action === ADD_ACTION) {
				qty_val += 1;
			} else if (current_action === SUBTRACT_ACTION) {
				qty_val -= 1;
				if (qty_val < 0) { qty_val = 0; }
			}
			
			quantity_input.val(qty_val).trigger('change');
		});


		// Remove link (button)
		// ------------------------------------
		$(REMOVE_BTN_SELECTOR).on('click', function (e) {
			e.preventDefault();

			var target = $(this),
				row_parent = target.parents(CART_ROW_SELECTOR),
				build_id = row_parent.data(BUILD_ID_DATA),
				_failed = function () {
					row_parent.removeClass(IS_REMOVING_CLASS);
					_showErrorMessage(row_parent, REMOVE_ERROR);
					_resetQuantityIfNeeded(row_parent, build_id);
				};


			if (!row_parent.hasClass(IS_REMOVING_CLASS)) {
				
				row_parent.addClass(IS_REMOVING_CLASS);
				_removeErrorMessage(row_parent);

				if (build_id) {
					$.when(_removeBuild(build_id)).done(function () {
						// NOTE: refresh to show latest everything (items, summary, etc)
						window.location.reload();
					}).fail(_failed);
				} else {
					_failed();
					console.warn('Can\'t remove build... missing build id');
				}
			}
		});


		// Show / Hide details
		// ------------------------------------
		$(VIEW_DETAILS_BTN_SELECTOR).on('click', function (e) {
			e.preventDefault();

			var target = $(this),
				old_text = target.text();

			if (old_text === VIEW_DETAILS) {
				target.text(HIDE_DETAILS);
				target.parents(CART_ROW_SELECTOR).find(META_SELECTOR).show();
			} else {
				target.text(VIEW_DETAILS);
				target.parents(CART_ROW_SELECTOR).find(META_SELECTOR).hide();
			}
		}).text(VIEW_DETAILS); // NOTE: setting initial text


		// Unhide ui
		// ------------------------------------
		$(REMOVE_BTN_SELECTOR).show();
		$(META_SELECTOR).hide();
		$(CART_ROW_SELECTOR).not(CART_ROW_INVALID_SELECTOR).find(QUANTITY_WRAPPER_SELECTOR).show(); // NOTE: only show quantity ui on valid builds
	});
})(jQuery);