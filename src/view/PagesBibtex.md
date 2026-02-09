---
title: "Pages bibliography"
css:
  - /index.css
---

This is a quick fix for bibliographies in the Apple Pages wordprocessor. It works with BibTex bibliography files and creates numbered or author-year citations. It does not depend on TeX or BibTex, but makes use of them if installed. It works, but not reliably – see the BUGS section below.

## Download

The project page is at [http://rubyforge.org/projects/pages-bibtex/](http://rubyforge.org/projects/pages-bibtex/)

Download from [http://rubyforge.org/frs/?group\_id=680](http://rubyforge.org/frs/?group_id=680)

## Versions

-   2005 Feb 2 – Version 0.0.1 – First public release. Proof of concept only.
-   2005 April 27 – Version 0.0.2 – Second version. Incorporating Jon Halls work on using external BibTex, and a few numbered styles.

## Author

Pages-bibtex is© 2005 Thomas Counsell [tamc2@cam.ac.uk](mailto:tamc2@cam.ac.uk). Please report bugs (there are many at the moment), suggestions and feedback to him. Please also let him know if you wish to be notified of future versions.

Jon Hall ([jgh23@open.ac.uk](mailto:jgh23@open.ac.uk)) has made significant contributions to this code

It is GPL so feel free to edit and share.

## Example

Open a terminal window. Change into this directory.

1.  open test.pages
2.  ruby pages-bibtex.rb test.pages
3.  open test-with-bibliography.pages

## Usage

To create and manage BibTex bibliographies I recomend [BibDesk](http://bibdesk.sourceforge.net/).

To cite a document, type \\cite{key} in the text where key is the cite key defined in the BibTex file. To cite the author use \\citeauthor{key} to cite the year use \\citeyear{key} to cite the author.

At the end of the document write \\bibliography{bibfilename} where bibfilename is the filename of the bibtex file that has your citations. This should NOT have the trailing .bib extension.

Then write \\bibliographystyle{stylename} where stylename may be Harvard, NumberCiteOrder, NumberAlphabeticalOrder (capitalization matters) or, if you have BibTex installed, any bibtex style file. Note that this is only used to work out what cites look like in the text, and what order they should appear in the references. The look of the reference should be governed by:

After that there should be a series of paragraphs like this:

```
BIBLIOGRAPHY-DEFAULT author. title (year).

BIBLIOGRAPHY-ARTICLE author. �title� journal volume.number (year):pages.

BIBLIOGRAPHY-BOOK author. title. address: publisher, year.

BIBLIOGRAPHY-PATENT author. Assigned to assignee. title. nationality patent number, year.
```

These define the style of the bibliography. Any formatting applied to the words in this will be applied to citations in the final output. Make sure you press return after defining the last of these. If each one is not in a separate paragraph it will have trouble. The word citeref can be used to have the system insert the reference number if you are using a numbered citation style.

To create the bibliography, run:
```
ruby pages-bibtex.rb filename.pages
```

This will create a copy of your pages document, with a bibliography, in filename-with-bibliography.pages. This can then be opened in pages.

## WARNINGS / BUGS:

1.  This is a second kludge. It will improve it over time.
2.  Opening the document-with-bibliography.pages WILL OFTEN CRASH PAGES. But if you restart pages it will normally then open.
3.  Most of the bibliography may be missing until you trigger pages to re-format and re-display (e.g. by creating a new line or inserting some text).
