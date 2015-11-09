/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013, 2014, 2015 School of Business and Engineering Vaud, Comem
 * Licensed under the MIT License
 */
/**
 * @fileoverview
 * @author Maxence Laurent (maxence.laurent gmail.com)
 */
YUI.add("wegas-number-input", function (Y) {
	"use strict";
	var CONTENTBOX = "contentBox", AbstractNumberInput,
		NumberInput, BoxesNumberInput,
		Wegas = Y.Wegas;

	AbstractNumberInput = Y.Base.create("wegas-abstract-number-input", Y.Widget, [Y.WidgetChild, Wegas.Widget, Wegas.Editable], {
		initializer: function () {
			this.handlers = [];
			this._initialValue = undefined;
		},
		destructor: function () {
			Y.Array.each(this.handlers, function (h) {
				h.detach();
			});
		},
		_getValue: function () {
			return this.get("variable.evaluated").getInstance().get("value");
		},
		/**
		 * Try to save value.
		 * The value must, indeed, be a number and must valisates against 
		 * the descriptor bounds (if provided...). 
		 * An error message is displayed whether the value could not been saved
		 * 
		 * @param {type} value the new numeric value to save
		 * @returns {Boolean} true is the value has been saved, false otherwise
		 */
		updateValue: function (raw_value) {
			var desc = this.get("variable.evaluated"),
				inst = desc.getInstance(),
				min = desc.get("minValue"),
				max = desc.get("maxValue"),
				value = +raw_value;
			if (Y.Lang.isNumber(value)) {
				if (Y.Lang.isNumber(min)) {
					if (Y.Lang.isNumber(max)) {
						if (value < min || value > max) {
							// Out of bound
							this.showMessage("error", Y.Wegas.I18n.t('errors.outOfBounds', {value: value, min: min, max: max}));
							return false;
						}
					} else {
						if (value < min) {
							this.showMessage("error", Y.Wegas.I18n.t('errors.lessThan', {value: value, min: min}));
							return false;
						}
					}
				} else if (Y.Lang.isNumber(max)) {
					this.showMessage("error", Y.Wegas.I18n.t('errors.greaterThan', {value: value, max: max}));
					return false;
				}

				if (inst.get("value") !== value) {
					inst.set("value", value);
					Y.Wegas.Facade.Variable.cache.put(inst.toObject());
				}
				return true;
			} else {
				this.showMessage("error", Y.Wegas.I18n.t('errors.nan', {value: raw_value}));
				return false;
			}
		}
	}, {
		/** @lends Y.Wegas.AbstractNumberInput */
		EDITORNAME: "AbstractNumberInput",
		ATTRS: {
			/**
			 * The target variable, returned either based on the name attribute,
			 * and if absent by evaluating the expr attribute.
			 */
			variable: {
				getter: Y.Wegas.Widget.VARIABLEDESCRIPTORGETTER,
				_inputex: {
					_type: "variableselect",
					label: "variable",
					classFilter: ["NumberDescriptor"]
				}
			},
			readonly: {
				getter: Wegas.Widget.VARIABLEDESCRIPTORGETTER,
				type: "boolean",
				value: false,
				optional: true,
				_inputex: {
					_type: "script",
					expects: "condition"
				}
			},
			label: {
				type: "string",
				optional: true
			}
		}
	});
	Wegas.AbstractNumberInput = AbstractNumberInput;

	/**
	 * Simple Number input
	 *  -> input 
	 *  -> slider if number has lower and upper bounds
	 */
	NumberInput = Y.Base.create("wegas-number-input", Y.Wegas.AbstractNumberInput, [], {
		CONTENT_TEMPLATE: "<div>" +
			"<div class=\"wegas-input-label\"></div>" +
			"<div class=\"wegas-input-slider\"></div>" +
			"<div class=\"wegas-input-container\">" +
			"<input class=\"wegas-input\" />" +
			"</div>" +
			"</div>",
		initializer: function () {
			this.xSlider = null;
		},
		renderUI: function () {
			var desc = this.get("variable.evaluated"),
				inst = desc.getInstance(),
				CB = this.get("contentBox");

			if (this.get("label")){
				CB.one(".wegas-input-label").setContent(this.get("label"));
			}

			if (!this.get("readonly.evaluated")) {
				if (Y.Lang.isNumber(desc.get("minValue")) && Y.Lang.isNumber(desc.get("maxValue"))) {
					this.xSlider = new Y.Slider({
						min: desc.get("minValue"),
						max: desc.get("maxValue"),
						value: +inst.get("value")
					}).render(CB.one(".wegas-input-slider"));
					this.get(CONTENTBOX).one(".wegas-input").set("disabled", true);
				}
			} else {
				this.get(CONTENTBOX).one(".wegas-input-container").setContent('<p>' +
					inst.get("value") + '</p>');
			}
		},
		syncUI: function () {
			var desc = this.get("variable.evaluated"),
				inst = desc.getInstance(),
				CB = this.get("contentBox"),
				value = inst.get("value");

			if (!this.get("readonly.evaluated")) {
				if (this._initialValue !== value) {
					this._initialValue = value;
					CB.one(".wegas-input").set("value", value);
					if (this.xSlider && this.xSlider.get("value") !== inst.get("value")) {
						this.xSlider.set("value", inst.get("value"));
					}
				}
			} else {
				this.get(CONTENTBOX).one(".wegas-input-container").setContent('<p>' +
					inst.get("value") + '</p>');
			}

		},
		bindUI: function () {
			var input = this.get(CONTENTBOX).one(".wegas-input");
			this.handlers.push(Y.Wegas.Facade.Variable.after("update", this.syncUI, this));
			if (this.xSlider) {
				this.handlers.push(this.xSlider.after("slideEnd", this.updateFromSlider, this));
				this.handlers.push(this.xSlider.after("railMouseDown", this.updateFromSlider, this));
				this.handlers.push(this.xSlider.after("valueChange", this.updateInput, this));
			}
			if (input) {
				this.handlers.push(input.on("blur", this.updateFromInput, this));
			}
		},
		destructor: function () {
		},
		updateInput: function (e) {
			var input = this.get(CONTENTBOX).one(".wegas-input"),
				value = this.xSlider.get("value");

			//this.updateValue(value);
			input.set("value", value);
		},
		updateFromSlider: function (e) {
			var value = this.xSlider.get("value");

			this.updateValue(value);
		},
		updateFromInput: function (e) {
			var input = this.get(CONTENTBOX).one(".wegas-input"),
				data = input.getData(),
				value = input.get("value");

			if (data.wait) {
				data.wait.cancel();
			}
			data.wait = Y.later(200, this, function () {
				data.wait = null;
				this.updateValue(value);
			});
		}
	}, {
		/** @lends Y.Wegas.NumberInput */
		EDITORNAME: "NumberInput"
	});
	Wegas.NumberInput = NumberInput;

	/**
	 * Boxes Number input
	 * Number must be bounded
	 */
	BoxesNumberInput = Y.Base.create("wegas-boxes-number-input", Y.Wegas.AbstractNumberInput, [], {
		CONTENT_TEMPLATE: "<div>" +
			"<div class=\"wegas-input-label\"></div>" +
			"<div class=\"boxes\"></div>" +
			"<div style=\"clear: both;\"></div>" +
			"</div>",
		initializer: function () {
		},
		renderUI: function () {
			var boxes = this.get(CONTENTBOX).one(".boxes"),
				desc = this.get("variable.evaluated"),
				min = desc.get("minValue"),
				max = desc.get("maxValue"),
				n = max - min + 1,
				i;

			if (this.get("label")){
				this.get("contentBox").one(".wegas-input-label").setContent(this.get("label"));
			}

			if (n < 100) {
				if (Y.Lang.isNumber(min) && Y.Lang.isNumber(max)) {
					for (i = min; i <= max; i += 1) {
						boxes.append("<div class=\"box\" data-value=\"" + i + "\" data-position=\"\"><div class=\"value\">" + i + "</div></div>");
					}
				} else {
					boxes.setContent("<p class=\"error\">Variable in not bounded !</p>");
				}
			}
		},
		syncUI: function () {
			var boxes = this.get(CONTENTBOX).one(".boxes"),
				desc = this.get("variable.evaluated"),
				min = desc.get("minValue"),
				max = desc.get("maxValue"),
				value = desc.getInstance().get("value"),
				i, box, pos;

			this._readonly = this.get("readonly.evaluated");

			/*
		     * Let set clickable class according to _readonly status: 
			 * ro | hasCl | will Have class
			 *  0 | 0     | 1   (== !hasClass)
			 *  0 | 1     | 1   (== hasClass)
			 *  1 | 0     | 0   (== hasClass)
			 *  1 | 1     | 0   (== !hasClass)
			 *  
			 *  if ro !== hasCl -> toogle
			 */
			if (boxes.hasClass("clickable") !== !this._readonly) {
				boxes.toggleClass("clickable");
			}

			if (this._initialValue !== value) {
				this._initialValue = value;

				if (Y.Lang.isNumber(min) && Y.Lang.isNumber(max)) {
					for (i = min; i <= max; i += 1) {
						box = boxes.one("[data-value=\"" + i + "\"]");
						if (box) {
							if (i < value) {
								pos = "below";
							} else if (i === value) {
								pos = "value";
							} else {
								pos = "above";
							}
							box.setAttribute("data-position", pos);
						}
					}
				}
			}
		},
		bindUI: function () {
			this.handlers.push(Y.Wegas.Facade.Variable.after("update", this.syncUI, this));
			this.handlers.push(this.get(CONTENTBOX).delegate("click", this.onBoxClick, ".box", this));
		},
		destructor: function () {
		},
		onBoxClick: function (e) {
			var value;
			if (!this._readonly) {
				value = e.currentTarget.getAttribute("data-value");
				this.updateValue(value);
			}
		}
	}, {
		/** @lends Y.Wegas.BoxesNumberInput */
		EDITORNAME: "BoxesNumberInput"
	});
	Wegas.BoxesNumberInput = BoxesNumberInput;
});
