---
title: "Early experiences with Active Resource"
css:
  - /index.css
---

Last updated 23:04 BST Fri 30 June.

At the recent RailsConf David Heinemeier Hansson announced his ideas for an active resource library in [rails](http://www.rubyonrails.com). His slides are available [here](http://www.loudthinking.com/lt-files/worldofresources.pdf).

Unfortunately the early version he checked into the [rails edge repository](http://dev.rubyonrails.org/browser/trunk/activeresource) doesn’t quite match his slides.

Below are my (in progress) notes on getting it to work.

## Pre-requisites

You need edge rails: `rake rails:freeze:edge`

You need some rest-ful type routes. I’ve used: `script/plugin install simply_restful`

You need a controller that has the same name as your model (e.g. PeopleController) with index, new, create, show, edit, update and delete methods. Each of these needs to respond sensibly to xml requests, e.g.:

```
def show
    @patch = Patch.find(params[:id])
    respond_to do |format|
      format.html
      format.xml { render :xml => @patch.to_xml }
    end
  end
```

## Initialization

The example that DHH gave:
```
Person = ActiveResource::Struct.new do |person|
  person.uri = "http://api.myremote.com/people" 
  person.credentials :name => "me", :password => "password" 
end
```
What works in the code:
```
Person = ActiveResource::Struct.create
Person.site = "http://api.myremote.com/people"
```

## Get

You can then get an object:
```
p = Person.find 1
```

There is an error if you try and `find(:all)` and no objects exists.

## Put / Update

Saving doesn’t work, because ActiveResource doesn’t set the content-type. Adding this at the start of the request method in [ActiveResource::Connection](http://dev.rubyonrails.org/browser/trunk/activeresource/lib/active_resource/connection.rb#L60) seems to help:
```
arguments << { 'content-type' => 'application/xml' }
```

## Post / Create

Creating a record doesn’t work, as `Person.save` currently goes straight to the put method.

I made this changes to get a create function:

[ActiveResource::Base](http://dev.rubyonrails.org/browser/trunk/activeresource/lib/active_resource/base.rb#L65)
```
def save
    id ? update : create
end
```
```
def create
  attributes["id"] = connection.post(self.class.collection_path, to_xml)
end
```
[ActiveResource::Connection](http://dev.rubyonrails.org/browser/trunk/activeresource/lib/active_resource/connection.rb#L54)
```
def post(path, body)
  response = request(:post, path, body)
  return response['Location'][/\/([^\/]*?)$/,1] # The id
end
```
