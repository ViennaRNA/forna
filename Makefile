all: compiler.jar htdocs/js/fornac.js

htdocs/js/fornac.js:
	git submodule init fornac
	git submodule update fornac 
	java -jar compiler.jar --compilation_level=SIMPLE_OPTIMIZATIONS fornac/fornaf.js fornac/rnagraph.js fornac/rnautils.js fornac/simplernaplot.js > htdocs/js/fornac.js

compiler.jar:
	git submodule init closure-compiler
	git submodule update closure-compiler
	cd closure-compiler; ant jar
	cp closure-compiler/build/compiler.jar .

clean:
	rm -f compiler.jar htdocs/js/fornac.js

.PHONY: all
