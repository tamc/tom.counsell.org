all: 2012-09-26-the-common-problem-of-consensus.html some-copying-is-great.html

2012-09-26-the-common-problem-of-consensus.html: 2012-09-26-the-common-problem-of-consensus.markdown
	pandoc -s -t html5 -c '/index.css' 2012-09-26-the-common-problem-of-consensus.markdown -o 2012-09-26-the-common-problem-of-consensus.html

some-copying-is-great.html: some-copying-is-great.markdown
	pandoc -s -t html5 -c '/index.css' some-copying-is-great.markdown -o some-copying-is-great.html

clean:
	rm 2012-09-26-the-common-problem-of-consensus.html
	rm some-copying-is-great.html

