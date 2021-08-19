.PHONY: help install lint test release clean clean-test clean-build all

help:
	@echo "test - Run tests"
	@echo "install - Install"
	@echo "lint - Check style with prettier"
	@echo "release - Publish package on npmjs"

clean-build:
	rm -rf ./node_modules
	rm -rf ./esm/node_modules
	rm -f ./esm/package-lock.json

clean-test:
	rm -fr ./coverage
	rm -f ./coverage.xml
	find . -name '*.js,cover' -exec rm -f {} +

install:
	npm install .

clean: clean-build clean-test

lint: clean-test
	npx prettier --write .

test: clean-test install
	npm test; \
	status=$$?; \
	exit $$status

release: clean
	npm publish --access public

all: clean lint install test release
