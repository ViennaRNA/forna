/* bootstra-bindings.js
* Custom Bindings for knockout.js borrowed from several places from the web!
*
* Author: Stefan Hammer <jango@tbi.univie.ac.at>
* Version: 0.1
* Date: 2014-10-15
*/

// an observable that retrieves its value when first bound
// thanks to http://www.knockmeout.net/2011/06/lazy-loading-observable-in-knockoutjs.html
ko.onDemandObservable = function(callback, target) {
    var _value = ko.observable();  //private observable

    var result = ko.computed({
        read: function() {
            //if it has not been loaded, execute the supplied function
            if (!result.loaded()) {
                callback.call(target);
            }
            //always return the current value
            return _value();
        },
        write: function(newValue) {
            //indicate that the value is now loaded and set it
            result.loaded(true);
            _value(newValue);
        },
        deferEvaluation: true  //do not evaluate immediately when created
    });

    //expose the current state, which can be bound against
    result.loaded = ko.observable();
    //load it again
    result.refresh = function() {
        result.loaded(false);
    };

    return result;
};

// thanks to http://jsfiddle.net/meno/MBLP9/
ko.bindingHandlers.bootstrapSwitchOn = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
        $elem = $(element);
        $(element).bootstrapSwitch();
        $(element).bootstrapSwitch('setState', ko.utils.unwrapObservable(valueAccessor())); // Set intial state
        $elem.on('switch-change', function (e, data) {
            valueAccessor()(data.value);
        }); // Update the model when changed.
    },
    update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
        var vStatus = $(element).bootstrapSwitch('state');
        var vmStatus = ko.utils.unwrapObservable(valueAccessor());
        if (vStatus != vmStatus) {
            $(element).bootstrapSwitch('setState', vmStatus);
        }
    }
};

// thanks to http://cosminstefanxp.github.io/bootstrap-slider-knockout-binding/
ko.bindingHandlers.sliderValue = {
	init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
		var params = valueAccessor();

		// Check whether the value observable is either placed directly or in the paramaters object.
		if (!(ko.isObservable(params) || params['value']))
			throw "You need to define an observable value for the sliderValue. Either pass the observable directly or as the 'value' field in the parameters.";

		// Identify the value and initialize the slider
		var valueObservable;
		if (ko.isObservable(params)) {
			valueObservable = params;
			$(element).slider({value: ko.unwrap(params)});
		}
		else {
			valueObservable = params['value'];
			// Replace the 'value' field in the options object with the actual value
			params['value'] = ko.unwrap(valueObservable);
			$(element).slider(params);
		}

		// Make sure we update the observable when changing the slider value
		$(element).on('slide', function (ev) {
			valueObservable(ev.value);
		});

	},
	update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
		var modelValue = valueAccessor();
		var valueObservable;
		if (ko.isObservable(modelValue))
			valueObservable = modelValue;
		else
			valueObservable = modelValue['value'];

		$(element).slider('setValue', parseFloat(valueObservable()));
	}
};


