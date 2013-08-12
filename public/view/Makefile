all: history.html

history.html: history.markdown ../index.css
	pandoc -s -t html5 -c /index.css history.markdown -o history.html

clean:
	rm history.html
