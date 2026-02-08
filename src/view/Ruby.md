---
title: "Ruby"
css:
  - /index.css
---

See [www.ruby-lang.org](http://www.ruby-lang.org)

From [http://ruby-talk.org/cgi-bin/scat.rb/ruby/ruby-talk/179642](http://ruby-talk.org/cgi-bin/scat.rb/ruby/ruby-talk/179642) (Matz is the languates creator).

```
Subject: Re: Ruby's lisp features.
From: Yukihiro Matsumoto <matz ruby-lang.org>
Date: Mon, 13 Feb 2006 13:43:02 +0900

Hi,

In message "Re: Ruby's lisp features." on Mon, 13 Feb 2006 02:38:18 +0900, Edward Kenworthy <edward kenworthy.info> writes:

|I've been programming for more years than I care to remember and am  
|enjoying programming in Ruby (especially on Rails). So far I've found  
|nothing "new" (to me) in Ruby, with the exception of the lisp-like  
|features and that's something I'd really like to explore.  

|Anyone able to point me to a resource please?

Ruby is a language designed in the following steps:

  * take a simple lisp language (like one prior to CL).
  * remove macros, s-expression.
  * add simple object system (much simpler than CLOS).
  * add blocks, inspired by higher order functions.
  * add methods found in Smalltalk.
  * add functionality found in Perl (in OO way).

So, Ruby was a Lisp originally, in theory.
Let's call it MatzLisp from now on. ;-)
```
