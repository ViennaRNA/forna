all: htdocs/js/fornac.js

htdocs/js/fornac.js:
	git submodule init fornac
	git submodule update fornac
	cd fornac && $(MAKE) all
	cp fornac/js/fornac.js htdocs/js/fornac.js

clean:
	rm -f htdocs/js/fornac.js

.PHONY: all
