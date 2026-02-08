---
title: "Textile to HTML"
css:
  - /index.css
---

Textile is a markup language that is meant to make it quick and easy to write basic web pages for wikis, blogs and other uses. Redcloth is a [ruby](Ruby.html) class that converts textile to html, written by \_why. Details are at [http://www.whytheluckystiff.net/ruby/redcloth/](http://www.whytheluckystiff.net/ruby/redcloth/) . Unfortunately, due to my own failings, I find it hard to understand \_why’s code, so I wrote a partial reimplementation bellow. This has the benefit of (for me) being clearer and easier to extend. The drawback is that it doesn’t do all that \_why’s version does and is slower. But it is here in case anyone finds it useful.

```
require 'strscan'

# Note: Does not implement anything beyond that on http://hobix.com/textile/
# i.e. No markdown, link titles, and converting out of range ASCII
# AND IT IS MUCH SLOWER THAN REDCLOTH !!
#
# Bodged together in a few evenings by Tom Counsell (tamc2@cam.ac.uk)
# Feel free to do whatever you like with the code.
#
# Use is the same as for Redcloth (except that none of the options work):
# html = TextileParser.new( "textile string").to_html 
#
class TextileParser

    # These are applied first
    BLOCK_COMMANDS = [
        [ /<pre.*?>/, :pre_tag ], 
        [ /<code.*?>/, :code_tag ],
        [ //, :notextile_tag ],
        [ /h(\d)(.*?)\.\s+/i, :heading_block ],
        [ /bq(.*?)\.\s+/i, :quote_block ],
        [ /(\*+|\#+)\s+/,  :list_block ],
        [ /table(.*?)\.\s+/i, :table_block ],
        [ /\|/i, :unspecified_table_block ],
        [ /\{.+?\}\.\s+\|/i, :unspecified_table_block ], #�A styled table row        
        [ /p(.*?)\.\s+/i, :paragraph_block ],
        [ /fn(\d+)(.*?)\.\s+/i, :footnote_block ],
        [ /\S+/i, :unspecified_block ],
        [ /\s+/i, :skip ],
    ]

    # Then these
    COMMANDS = [
        [ //, :pre_tag ], # Can be inline as well as in a block
        [ //, :code_tag ],  # Can be inline as well as in a block
        [ //, :notextile_tag ],  # Can be inline as well as in a block
        [ /@(\S.*?\S)@/, :quick_escape_code ], 
        [ /"(.+?)":(\S*\w\/?)/, :textile_link ],
        [ /\[(.+?)\]:(\S*\w\/?)/, :textile_link_alias ],
        [ /!(.+?)!(\S*)/, :image_link ],
        [ /([A-Z0-9]+)\((.*?)\)/, :acronym ],
        [ /(\S+?)\[(\d+)\]/, :footnote ]
    ]    

    # Bit of a bodge, but need a different definition of phrase and whitespace in a table
    INLINE_COMMANDS = COMMANDS + [
        [ /\S+/i, :phrase ],
        [ /\s+/i, :space ],
    ]

    TABLE_INLINE_COMMANDS = COMMANDS + [
        [ /[^\s\t\r\n\f\|]+/i, :phrase ],
        [ /\s+/i, :space ],
    ]        

    # Then these are applied to phrases from above
    PHRASE_MODIFIERS = [ 
        [ '__', 'i' ],
        [ '**', 'b' ],
        [ '_', 'em' ],
        [ '*', 'strong' ],
        [ '??', 'cite' ],
        [ '-', 'del' ],
        [ '+', 'ins' ],
        [ '^', 'sup' ],
        [ '~', 'sub' ],
        [ '%', 'span' ], # How to avoid when people use % as in 3.0% growth?
        ].collect! { |regexp,tag| [ /^#{Regexp.escape(regexp)}/, /#{Regexp.escape(regexp)}$/, tag ] }

    # Character substitutions done last to any words
    GLYPHS = [
        [ /^\'/, '�' ], # single opening
        [ /^"/, '�' ], # double opening
        [ /\'$/, '�' ], # single closing
           [ /\"$/, '�' ], # double closing
        [ /\.{3}$/, '\1�' ], # ellipsis
        [ '--', '\1�' ], # em dash
        [ '->', ' ? ' ], # right arrow
        [ '-$', ' � ' ], # en dash

        [ '(TM)', '�' ], # trademark
        [ '(R)', '�' ], # registered
        [ '(C)', '�' ] # copyright
    ]

    # This is just used to give the ouput html a more beautiful layout
    # All tags in here will get a newline after they are output
    # and the indent for following lines increased by the number
    INDENTING_TAGS = {     'ul' => 1,
                        'ol' => 1,
                        'li' => 0,
                        'blockquote' => 1,
                        'table' => 1,
                        'tr' => 1,
                        'td' => 0,
                        'th' => 0,
                        'p' => 0,
                     }

    def initialize( text )
        @text = text
    end

    def to_html( settings = nil )
        reset
        convert_text
        return html.chomp.chomp # the tests don't have any trailing \ns
    end

    private

    ## Methods dealing with blocks of text are called first

    def convert_text
        until @scanner.eos?
            send( BLOCK_COMMANDS.detect { |regexp, method| @scanner.scan( regexp ) }[1] )
            add_to_html "\n" # Prettier html if extra space between blocks 
        end
        insert_any_link_aliases
        html
    end

    # These are all the block commands

    def paragraph_block
        tag( 'p', parse_attributes( @scanner[1] ) ) do 
            standard_paragraph
        end
    end

    def quote_block
        tag( "blockquote", parse_attributes( @scanner[1] ) ) do
            tag 'p' do
                standard_paragraph
            end
        end
    end

    def unspecified_block
        @scanner.unscan
        tag 'p' do
            standard_paragraph
        end
    end

    def heading_block
        tag( "h#{@scanner[1]}", parse_attributes( @scanner[2] ) ) do
            standard_line # Assume titles may only be on one line
        end 
    end

    def list_block
        ordered = list_ordered? # See what sort of list we have
        depth = list_depth
        @scanner.unscan # So that the lines can be scanned individually
        tag( ordered ? 'ol' : 'ul' ) do
            list_line( ordered, depth ) until end_of_list?( depth )
        end
    end

    def table_block
        tag( 'table', parse_attributes( @scanner[1] ) ) do
            table_line until end_of_paragraph?
        end
    end

    def unspecified_table_block
        @scanner.unscan
        tag( 'table' ) do
            table_line until end_of_paragraph?
        end
    end

    def footnote_block
        number = @scanner[1]
        attributes = parse_attributes( @scanner[2] )
        attributes[:id] = "fn#{number}" 
        tag 'p', attributes do
            add_to_html "#{number} " 
            standard_line until end_of_paragraph?
        end
    end

    # Now descend into methods dealing with lines of text

    def pre_tag
        escape_tag 'pre'
    end

    def code_tag
        escape_tag 'code'
    end

    def notextile_tag
        escape_tag 'notextile', false
    end

    # This escapes until a matching close tag
    def escape_tag( tag, include_tag_in_output = true )
        add_to_html( @scanner.matched ) if include_tag_in_output
        level = 1
        while level > 0
            break unless @scanner.scan(/(.*?)(<(\/)?#{tag}.*?>)/m) # Breaks if no closing tag
            add_to_html( htmlesc( @scanner[1] || "" ) )
            level = level + ( @scanner[3] ? -1 : 1 )
            add_to_html( htmlesc( @scanner[2] ) ) unless level  0
        end
        add_to_html "" if include_tag_in_output
    end

    def quick_escape_code
        tag 'code' do 
            add_to_html( htmlesc( @scanner[1] ) )
        end
    end

    def list_line( ordered, depth )
        tag 'li' do
            @scanner.scan(/(#+|\*+)\s+/)
            if ( list_ordered?  ordered ) && ( list_depth == depth )
                standard_line
            else # Recursive for sub lists
                list_block
            end
        end
    end

    def table_line
        # Are their row attributes at that start of the line?
        attributes = @scanner.scan(/(\{.+?\})\.\s+/) ? parse_attributes(@scanner[1]) : {}     
        @scanner.scan(/\|/) # Get rid of any leading cell opening
        tag( 'tr', attributes ) do 
            table_cell until end_of_table_line?
        end
    end    

    def standard_paragraph
        until end_of_paragraph?    
            send( INLINE_COMMANDS.detect { |regexp, method| @scanner.scan( regexp ) }[1] )
        end
    end

    def standard_line
        until end_of_line?
            send( INLINE_COMMANDS.detect { |regexp, method| @scanner.scan( regexp ) }[1] )
        end
    end

    # Now descend into methods dealing with phrases

    def table_cell
        # Style defined at start of cell ?
        attributes = @scanner.scan(/(_)?(\S*?)\.\s*/) ?  parse_attributes(@scanner[2]) : {}
        tag( @scanner[1] ? 'th' : 'td', attributes) do 
            until end_of_table_cell?
                send( TABLE_INLINE_COMMANDS.detect { |regexp, method| @scanner.scan( regexp ) }[1] )
            end    
        end
    end

    def footnote
        add_to_html "#{@scanner[1]}#{@scanner[2]}" 
    end

    def acronym
        add_to_html "#{@scanner[1]}" 
    end

    def phrase
        word = @scanner.matched

        return add_to_html( parse_glyphs( word ) ) unless word =~ /\w+/ # If a word is entirely symbols then we will leave it in peace.

        # Open tags
        PHRASE_MODIFIERS.each do |start_r, end_r, tag|
            if word =~ start_r
                word = $' # The bit after the match
                # Look for matching brackets that indicate there are attributes
                if word =~ /(\(.+?\)|\{.+?\}|\[.+?\])/                 
                    open_tag( tag, parse_attributes( $1 ) )
                    word = $'
                else
                    open_tag tag
                end
                break
            end
        end

        # Close tags
        end_tag = nil
        PHRASE_MODIFIERS.each do |start_r, end_r, tag|
            if word =~ end_r
                end_tag = tag
                word = $` # The bit before the match
                break
            end
        end
        add_to_html parse_glyphs( word )
        close_tag( end_tag ) if end_tag
    end

    def space
        add_to_html @scanner.matched
    end

    def image_link
        @scanner.matched =~ /^!([<>]*)(.*?)(!|\((.*?)\)!)($|(:(.+?)$))/
        alignment, src, title, url = $1, $2, $4, $7
        attributes = {}
        attributes[:style] = 'float:right' if alignment  '>'
        attributes[:style] = 'float:left' if alignment  '<'

        attributes[:src] = src
        attributes[:alt] = attributes[ :title ] = title if title
        if url
            tag 'a', { :href => url } do
                open_tag 'img', attributes, true
            end
        else
            open_tag 'img', attributes, true
        end    
    end

    def skip
        # Do nothing !
    end

    def textile_link
        add_to_html "#{@scanner[1]}" 
    end

    def textile_link_alias
        # These are saved for later resubstitution
        @aliases[ @scanner[1] ] = @scanner[2]
    end

    # These feels clunky, and is done last
    def insert_any_link_aliases
        @aliases.each do |als, href|
            html.gsub!( /href="#{als}"/, "href=\"#{href}\"" )
        end
    end

    # These are helper methods that make sure html is properly closed and indented

    def tag( tag, attributes = {} )
        open_tag( tag, attributes )
        yield
        close_tag tag
    end

    def close_tag( tag = :all_tags )
        # Check the tag has been opened
        return unless open_tags.include?( tag ) || ( tag == :all_tags )

        # Close all tags up to that tag (in case one was not closed)
        until open_tags.empty?
            open_tag = open_tags.pop
            # This is just stuff to make the html look pretty
            if (indent = INDENTING_TAGS[ open_tag ] ) 
                if indent == 0
                    add_to_html "" 
                    add_to_html "\n" 
                else
                    add_to_html "\n" unless html =~ /\n$/
                    @indent -= indent
                    add_to_html( "\t" * @indent )
                    add_to_html "" 
                    add_to_html "\n" 
                end
            else
                add_to_html "" 
            end
            return if open_tag == tag
        end
    end

    def open_tag( tag, attributes = {}, no_close_tag = false )
        add_to_html( "\t" * @indent )

        add_to_html "<#{tag}" 

        attributes.each { |key, value|     add_to_html( " #{key.to_s}=\"#{value.to_s}\"" )    }

        if no_close_tag
            add_to_html " />" 
            return
        end

        add_to_html ">" 

        if (indent = INDENTING_TAGS[ tag ] )            
            add_to_html "\n" unless indent == 0
            @indent += indent
        end
        open_tags << tag
    end

    def open_tags
        @open_tags ||= []
    end

    def parse_attributes( attribute_text )
        return {} unless attribute_text && attribute_text != "" 
        a = { :style => "" }

        # The hand-entered classes, ids, styles and langs
        # These are replaced with "" so their content cannot be matched below
        a[:lang] = $1 if attribute_text =~ /\[(.+?)\]/
        a[:class] = $1 if attribute_text.sub!(/\((.+?)\)/,'')
        a[:class], a[:id] = $1, $2 if a[:class] =~  /^(.*?)#(.*)$/
        a[:style] << "#{$1};" if attribute_text.sub!(/\{(.+?)\}/,'')

        # Various padding and indents
        a[:style] << "padding-left:#{ $1.length }em;" if attribute_text =~ /(\(+)/
        a[:style] << "padding-right:#{ $1.length }em;" if attribute_text =~ /(\)+)/        

        # The various alignments
        a[:style] << "text-align:left;" if attribute_text =~ /<(?!>)/
        a[:style] << "text-align:right;" if attribute_text =~ /(?!<)>/
        a[:style] << "text-align:justify;" if attribute_text =~ /<>/
        a[:style] << "text-align:center;" if attribute_text =~ /=/

        #Various column spans on tables
        a[:colspan] = $1 if attribute_text =~ /\\(\d+)/
        a[:rowspan] = $1 if attribute_text =~ /\/(\d+)/

        #Vertical alignments on tables
        a[:style] << "vertical-align:top;" if attribute_text =~ /\^/
        a[:style] << "vertical-align:bottom;" if attribute_text =~ /\~/

        # Get rid of any empty attributes before returning
        a.delete_if { |k,v| !v || (v  "") }
    end

    def parse_glyphs( word )
        GLYPHS.each do |regexp,replacement|
            word.gsub!( regexp, replacement )
        end
        word
    end

    # Now some helper methods for spotting the ends of sections

    def end_of_paragraph?
        return true if @scanner.eos?
        @scanner.scan(/\n{2,}/)
    end

    def end_of_list?( depth )
        return true if @scanner.eos?
        return true unless @scanner.check(/(#+|\*+)\s+/) # Not a list any more
        return true if list_depth < depth # End of this sub list
        @scanner.scan(/\n{2,}/)
    end

    def end_of_line?
        return true if @scanner.eos?
        return true if @scanner.check(/\n{2,}/)
        @scanner.scan(/\n/)
    end

    def end_of_table_line?
        return true if @scanner.eos?
        return true if @scanner.check(/\n{2,}/)
        @scanner.scan(/\|\s*\n/)
    end

    def end_of_table_cell?
        return true if @scanner.eos?
        return true if @scanner.check(/\n/)
        return true if @scanner.check(/\|\s*\n/)
        @scanner.scan(/\|/)
    end

    # Now some random helper methods for decoding

    def list_ordered?
        @scanner.matched[0,1]  '#'
    end

    def list_depth
        @scanner[1].size
    end

    def htmlesc( str )
        str.gsub!( '&', '&' )
        str.gsub!( '"', '"' )
        str.gsub!( '<', '<')
        str.gsub!( '>', '>')
        str
    end

    # Now the low level matching functions

    def add_to_html( object )
        @html << object.to_s
    end

    def html
        @html
    end

    def reset
        @html, @scanner = "" , StringScanner.new( @text )
        @aliases = {}
        @indent = 0
    end    
end
```
