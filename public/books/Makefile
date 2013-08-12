all: thinking-in-time.html

thinking-in-time.html: thinking-in-time.markdown
	pandoc -s -t html5 -c '/index.css' thinking-in-time.markdown -o thinking-in-time.html

clean:
	rm thinking-in-time.html
