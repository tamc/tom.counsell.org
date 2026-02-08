---
title: "Excel to Latex table convertor"
css:
  - /index.css
---

This is a quick script I hacked up to help doing tables in latex. Written for OSX 10.4 and your latex must use the longtable package.

To use:

1.  Copy the excel table you want to convert
2.  Run this code (excel2latex.rb), it will place the latex in the clipboard
3.  Paste into your latex document

```
#!/usr/bin/ruby
# (c) 2005 Tom Counsell tom@counsell.org
# Licenced under the GPL
#
# Converts excel tables into latex tables
#
# Requires Mac OSX 10.4, although could be adapted for other platoforms
#
# To use, copy the excel table you want to convert to the clipboard
# Run this code
# The latex code will be in the clipboard ready to paste
#
# Let me know of any bugfixes or suggestions

require 'csv'

def escape_latex( string )
    string.gsub( %r{([&$#%])} ) { '\\' + $1 }
end

text = `pbpaste`
lines = text.split("\r")
lines = lines.map { |line| line.split("\t") }
columns = lines.map { |line| line.size }.max
header = lines.shift

pbcopy = IO.popen('pbcopy','w+')

pbcopy.puts "\\begin{center}" 
pbcopy.puts "\\begin{longtable}{#{'l '*columns}}" 
pbcopy.puts header.map{ |entry| escape_latex entry }.join(' & ')+' \\\\'
pbcopy.puts "\\endfirsthead" 
pbcopy.puts header.map{ |entry| escape_latex entry }.join(' & ')+' \\\\'
pbcopy.puts "\\endhead" 
pbcopy.puts "\\multicolumn{#{columns}}{r}{{Continued\\ldots}} \\" 
pbcopy.puts "\\endfoot" 
pbcopy.puts "\\hline" 
pbcopy.puts "\\endlastfoot" 
pbcopy.puts
lines.each do |row| 
    pbcopy.puts row.map{ |entry| escape_latex entry }.join(' & ')+' \\\\' 
end
pbcopy.puts
pbcopy.puts "\\end{longtable}" 
pbcopy.puts "\\end{center}" 
pbcopy.close_write
puts pbcopy.gets || "Ok. In clipboard"
```
