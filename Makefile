TESTS += test/backoff.test.js
TESTS += test/reconnector.test.js
TESTS += test/radar_client.alloc.test.js
TESTS += test/radar_client.events.test.js
TESTS += test/radar_client.test.js
TESTS += test/state.test.js

REPORTER = spec

build:
	@echo 'Building dist/radar_client'
	@./node_modules/gluejs/bin/gluejs \
	--include ./lib \
	--npm microee \
	--replace engine.io-client=window.eio,minilog=window.Minilog \
	--global RadarClient \
	--main lib/index.js \
	--out dist/radar_client.js

	# @./node_modules/gluejs/bin/gluejs \
	# --include ./lib \
	# --include ./node_modules/minilog/dist/minilog.js \
	# --include ./node_modules/engine.io-client/dist/engine.io.js \
	# --replace 'engine.io-client="node_modules/engine.io-client/dist/engine.io.js",minilog="node_modules/minilog/dist/minilog.js"' \
	# --npm microee \
	# --global RadarClient \
	# --main lib/index.js \
	# --out dist/radar_client.js

	# @echo 'Building public/radar_client.js'
	# @./node_modules/gluejs/bin/gluejs \
	# --include ./node_modules/minilog/dist/minilog.js \
	# --include ./node_modules/engine.io-client/dist/engine.io.js \
	# --include dist/radar_client.js \
	# --out dist/radar_client.js
	# uncomment if you want to use uglifyJS to further minify the file @uglifyjs --overwrite public/radar_client.js
	# @echo 'recombined eio and minilog to radar_client.js'

test:
	@sudo -E ./node_modules/.bin/mocha \
		--ui exports \
		--reporter $(REPORTER) \
		--slow 2000ms \
		--bail \
		$(TESTS)

jshint: build
	jshint --config=.jshintrc dist/

.PHONY: test build jshint
