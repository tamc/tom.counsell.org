---
title: "An Acronym finder"
css:
  - /index.css
---

Catherine wanted to put a glossary in her thesis. To help find all the acronyms in her latex files I wrote this two line ruby script, maybe you will find it useful as well.

```
#/usr/bin/ruby
# Usage: ruby acronymfinder.rb filename.tex
text = IO.readlines(ARGV[0]).join
puts text.scan(/\b[A-Z]+\b/).uniq.sort
```
