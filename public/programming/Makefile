all: index.html

index.html: index.markdown
	pandoc -s -t html5 -c '/index.css' index.markdown -o index.html

clean:
	rm index.html
