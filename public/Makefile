all: index.html bio.html

index.html: index.markdown index.css
	pandoc -s -t html5 -c index.css index.markdown -o index.html

bio.html: bio.markdown index.css
	pandoc -s -t html5 -c index.css bio.markdown -o bio.html

clean:
	rm index.html
