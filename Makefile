all: htdocs/js/fornac.js

htdocs/js/fornac.js:
	git submodule init fornac
	git submodule update fornac
	cd fornac && $(MAKE) all
	cp fornac/js/fornac.js htdocs/js/
	cp fornac/css/fornac.css htdocs/css/

clean:
	rm -f htdocs/js/fornac.js htdocs/css/fornac.css

.PHONY: all
